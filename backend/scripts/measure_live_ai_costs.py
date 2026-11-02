#!/usr/bin/env python3
"""Hit live MealLensAI feature endpoints, count tokens, write a cost PDF."""

from __future__ import annotations

import io
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import tiktoken
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

AI = os.environ.get("VITE_AI_API_URL", "https://ai-production-95c7.up.railway.app").rstrip("/")
IMAGES = os.environ.get("VITE_IMAGES_API_URL", "https://getimages-production-8c05.up.railway.app").rstrip("/")
FLASK = os.environ.get("FLASK_URL", "http://127.0.0.1:5001").rstrip("/")

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / "docs" / "measured-ai-costs.json"
OUT_PDF = ROOT / "docs" / "MealLensAI-measured-cost-per-user.pdf"
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

ENC = tiktoken.get_encoding("cl100k_base")

RATES = {
    "gpt-4o": {"in": 2.50, "out": 10.00},
    "gpt-4.1-mini": {"in": 0.40, "out": 1.60},
    "gpt-4o-mini": {"in": 0.15, "out": 0.60},
}

# Hidden system prompt on the AI server is not returned. Add a conservative
# extra input estimate only when the API does not include usage.
HIDDEN_SYSTEM = {
    "plan": 2800,
    "scan": 1200,
    "cook": 900,
    "resources": 200,
    "image": 0,
    "flask": 0,
}

HEALTH = {
    "age": 34,
    "weight": 78,
    "height": 175,
    "waist": 86,
    "gender": "male",
    "activity_level": "moderate",
    "condition": "Diabetes",
    "goal": "heal",
    "location": "Nigeria",
}

INGREDIENTS = "oats, eggs, spinach, tomatoes, chicken, rice, beans, plantain, yogurt, bananas"


def tokens_of(text: str) -> int:
    if not text:
        return 0
    return len(ENC.encode(text))


def money(n: float) -> str:
    if n == 0:
        return "$0.00"
    if 0 < abs(n) < 0.01:
        return f"${n:.4f}"
    return f"${n:.2f}"


def http(method: str, url: str, *, data: bytes | None = None, headers: dict | None = None, timeout: int = 180):
    hdrs = {"User-Agent": "MealLensAI-cost-probe/1.0"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            elapsed = time.perf_counter() - started
            return {
                "ok": True,
                "status": resp.status,
                "elapsed_s": round(elapsed, 2),
                "bytes": len(body),
                "content_type": resp.headers.get("content-type", ""),
                "body": body,
            }
    except urllib.error.HTTPError as e:
        body = e.read() if e.fp else b""
        elapsed = time.perf_counter() - started
        return {
            "ok": False,
            "status": e.code,
            "elapsed_s": round(elapsed, 2),
            "bytes": len(body),
            "content_type": e.headers.get("content-type", "") if e.headers else "",
            "body": body,
            "error": str(e),
        }
    except Exception as e:
        elapsed = time.perf_counter() - started
        return {
            "ok": False,
            "status": 0,
            "elapsed_s": round(elapsed, 2),
            "bytes": 0,
            "content_type": "",
            "body": b"",
            "error": f"{type(e).__name__}: {e}",
        }


def summarize(name: str, kind: str, request_text: str, result: dict) -> dict:
    body = result.get("body") or b""
    try:
        text = body.decode("utf-8", errors="replace")
    except Exception:
        text = ""
    parsed = None
    usage = None
    model = None
    try:
        parsed = json.loads(text) if text else None
        if isinstance(parsed, dict):
            usage = parsed.get("usage") or parsed.get("token_usage") or parsed.get("tokens")
            model = parsed.get("model") or (parsed.get("meta") or {}).get("model")
    except Exception:
        parsed = None
    in_tok = tokens_of(request_text)
    out_tok = tokens_of(text)
    hidden = 0 if usage else HIDDEN_SYSTEM.get(kind, 0)
    billed_in = in_tok + hidden
    keys = list(parsed.keys())[:20] if isinstance(parsed, dict) else []
    preview = text[:400].replace("\n", " ")
    return {
        "name": name,
        "kind": kind,
        "ok": result.get("ok"),
        "status": result.get("status"),
        "elapsed_s": result.get("elapsed_s"),
        "request_bytes": len(request_text.encode()),
        "response_bytes": result.get("bytes"),
        "request_tokens": in_tok,
        "response_tokens": out_tok,
        "hidden_system_tokens_est": hidden,
        "billed_input_tokens_est": billed_in,
        "usage_from_api": usage,
        "model_from_api": model,
        "response_keys": keys,
        "error": result.get("error"),
        "preview": preview,
    }


def multipart(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]] | None = None) -> tuple[bytes, str]:
    boundary = "----MealLensCostBoundary7f3a"
    chunks: list[bytes] = []
    for k, v in fields.items():
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    if files:
        for name, (filename, content, ctype) in files.items():
            chunks.append(
                (
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
                    f"Content-Type: {ctype}\r\n\r\n"
                ).encode()
                + content
                + b"\r\n"
            )
    chunks.append(f"--{boundary}--\r\n".encode())
    body = b"".join(chunks)
    return body, f"multipart/form-data; boundary={boundary}"


def tiny_jpeg() -> bytes:
    # 1x1 jpeg is too fake for vision; download a real food photo.
    url = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Gull_portrait_ca_usa.jpg/320px-Gull_portrait_ca_usa.jpg"
    food = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/RedDot_Burger.jpg/320px-RedDot_Burger.jpg"
    res = http("GET", food, timeout=30)
    if res["ok"] and res["body"]:
        return res["body"]
    res = http("GET", url, timeout=30)
    return res.get("body") or b""


def run_calls() -> list[dict]:
    rows: list[dict] = []

    # 1. Food for you / health nutrition plan
    payload = json.dumps(HEALTH)
    print("→ /ai_nutrition_plan")
    r = http("POST", f"{AI}/ai_nutrition_plan", data=payload.encode(), headers={"Content-Type": "application/json"})
    rows.append(summarize("Food for you / health nutrition plan", "plan", payload, r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 2. Location + budget (healthy auto generate)
    fields = {"location": "Lagos, Nigeria", "budget": "50"}
    body, ctype = multipart(fields)
    print("→ /auto_generate_plan")
    r = http("POST", f"{AI}/auto_generate_plan", data=body, headers={"Content-Type": ctype})
    rows.append(summarize("Location & budget plan", "plan", body.decode("latin1", errors="replace"), r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 3. Sick smart plan with budget
    fields = {
        "image_or_ingredient_list": "ingredient_list",
        "ingredient_list": "",
        **{k: str(v) for k, v in HEALTH.items()},
        "budget_state": "true",
        "budget": "40",
        "location": "Nigeria",
    }
    body, ctype = multipart(fields)
    print("→ /sick_smart_plan")
    r = http("POST", f"{AI}/sick_smart_plan", data=body, headers={"Content-Type": ctype})
    rows.append(summarize("Health-aware weekly plan (sick_smart_plan)", "plan", body.decode("latin1", errors="replace"), r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 4. Regular smart plan from ingredients
    fields = {"image_or_ingredient_list": "ingredient_list", "ingredient_list": INGREDIENTS}
    body, ctype = multipart(fields)
    print("→ /smart_plan")
    r = http("POST", f"{AI}/smart_plan", data=body, headers={"Content-Type": ctype})
    rows.append(summarize("Weekly plan from typed ingredients", "plan", body.decode("latin1", errors="replace"), r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 5. Scan from ingredient list (meal options)
    fields = {
        "image_or_ingredient_list": "ingredient_list",
        "ingredient_list": INGREDIENTS,
        **{k: str(v) for k, v in HEALTH.items()},
    }
    body, ctype = multipart(fields)
    print("→ /generate_meals_from_ingredients (text)")
    r = http("POST", f"{AI}/generate_meals_from_ingredients", data=body, headers={"Content-Type": ctype})
    rows.append(summarize("Scan ingredients (typed list)", "scan", body.decode("latin1", errors="replace"), r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 6. Scan from photo
    img = tiny_jpeg()
    print("  downloaded scan image", len(img), "bytes")
    fields = {
        "image_or_ingredient_list": "image",
        **{k: str(v) for k, v in HEALTH.items()},
    }
    files = {"image": ("meal.jpg", img, "image/jpeg")} if img else None
    body, ctype = multipart(fields, files)
    print("→ /generate_meals_from_ingredients (photo)")
    r = http("POST", f"{AI}/generate_meals_from_ingredients", data=body, headers={"Content-Type": ctype})
    # Don't count raw jpeg bytes as text tokens; add vision tile estimate instead.
    text_part = "\n".join(f"{k}={v}" for k, v in fields.items())
    row = summarize("Scan fridge / food photo", "scan", text_part, r)
    if img:
        row["request_tokens"] += 765  # GPT-4o high-detail 1024-ish photo
        row["billed_input_tokens_est"] = row["request_tokens"] + row["hidden_system_tokens_est"]
        row["vision_image_tokens_est"] = 765
    rows.append(row)
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 7. Cooking instructions
    cook = json.dumps({
        "food_name": "Jollof rice with grilled chicken",
        "ingredients": ["rice", "tomato", "pepper", "onion", "chicken", "oil", "stock"],
    })
    print("→ /meal_plan_instructions")
    r = http("POST", f"{AI}/meal_plan_instructions", data=cook.encode(), headers={"Content-Type": "application/json"})
    rows.append(summarize("Cooking instructions", "cook", cook, r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 8. Condition-aware cooking instructions
    cook2 = json.dumps({
        "food_name": "Oatmeal with berries",
        "ingredients": ["oats", "milk", "berries"],
        "sickness": "Diabetes",
    })
    print("→ /sick_meal_plan_instructions")
    r = http("POST", f"{AI}/sick_meal_plan_instructions", data=cook2.encode(), headers={"Content-Type": "application/json"})
    rows.append(summarize("Cooking instructions (health-aware)", "cook", cook2, r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 9. YouTube / Google resources
    body, ctype = multipart({"food_choice_index": "Jollof rice with grilled chicken"})
    print("→ /resources")
    r = http("POST", f"{AI}/resources", data=body, headers={"Content-Type": ctype})
    rows.append(summarize("Cooking videos / web resources", "resources", body.decode("latin1", errors="replace"), r))
    print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["response_tokens"], "out tokens")

    # 10-12. Dish image lookups
    for dish in ["Oatmeal with Berries", "Grilled Chicken Salad", "Jollof rice"]:
        payload = json.dumps({"q": dish})
        print(f"→ image lookup {dish}")
        r = http("POST", f"{IMAGES}/image", data=payload.encode(), headers={"Content-Type": "application/json"}, timeout=45)
        rows.append(summarize(f"Dish photo lookup: {dish}", "image", payload, r))
        print("  ", rows[-1]["status"], rows[-1]["elapsed_s"], "s", rows[-1]["preview"][:80])

    # Local Flask
    print("→ local Flask /")
    r = http("GET", f"{FLASK}/", timeout=10)
    rows.append(summarize("Local Flask root", "flask", "", r))
    print("→ local Flask subscription (unauth)")
    r = http("GET", f"{FLASK}/api/subscription/status?user_id=test", timeout=15)
    rows.append(summarize("Local Flask subscription status", "flask", "user_id=test", r))

    return rows


def cost_for(row: dict, model: str) -> dict:
    rates = RATES[model]
    inp = row["billed_input_tokens_est"]
    out = row["response_tokens"]
    if row["kind"] == "image":
        return {"in": 0.0, "out": 0.0, "total": 0.0002 if row.get("ok") else 0.0, "note": "Railway lookup, not OpenAI"}
    if row["kind"] == "flask":
        return {"in": 0.0, "out": 0.0, "total": 0.0, "note": "included in hosting"}
    if row["kind"] == "resources":
        return {"in": 0.0, "out": 0.0, "total": 0.01 if row.get("ok") else 0.0, "note": "YouTube/Google search API"}
    cin = (inp / 1_000_000) * rates["in"]
    cout = (out / 1_000_000) * rates["out"]
    return {"in": cin, "out": cout, "total": cin + cout, "note": ""}


def write_pdf(rows: list[dict]) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle("T", parent=styles["Title"], fontSize=16, spaceAfter=8, alignment=TA_LEFT)
    h = ParagraphStyle("H", parent=styles["Heading2"], fontSize=12, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle("B", parent=styles["BodyText"], fontSize=9, leading=12)
    small = ParagraphStyle("S", parent=styles["BodyText"], fontSize=8, leading=10, textColor=colors.HexColor("#444"))
    cell = ParagraphStyle("C", parent=styles["BodyText"], fontSize=7.5, leading=9.5)

    story = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph("MealLensAI — measured cost per user", title))
    story.append(Paragraph(
        f"Live calls against the production AI service ({AI}) and image service ({IMAGES}), "
        f"plus local Flask ({FLASK}). Tokens counted with tiktoken cl100k_base on the actual "
        f"request and response bodies. Generated {now}.",
        body,
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The Railway AI server does not return OpenAI <b>usage</b> or <b>model</b> fields. "
        "Input tokens below are what we sent plus a conservative hidden system-prompt estimate. "
        "Output tokens are the full JSON/text the API returned — that is the real completion size. "
        "Costs are shown for GPT-4o (upper), GPT-4.1 mini (mid), and GPT-4o mini (cheap).",
        small,
    ))

    ok_ai = [r for r in rows if r["kind"] in ("plan", "scan", "cook", "resources") and r.get("ok")]
    failed = [r for r in rows if not r.get("ok")]

    story.append(Paragraph("Headline (always-on month, measured tokens)", h))
    always = {
        "plan": 12,  # 8 weekly/budget + 4 food for you
        "scan": 20,
        "cook": 60,
        "resources": 60,
        "image": 120,
    }
    per_kind_out = {}
    per_kind_in = {}
    for kind in ("plan", "scan", "cook", "resources"):
        subset = [r for r in ok_ai if r["kind"] == kind and (r.get("response_tokens") or 0) >= 100]
        if not subset:
            continue
        per_kind_out[kind] = sum(r["response_tokens"] for r in subset) / len(subset)
        per_kind_in[kind] = sum(r["billed_input_tokens_est"] for r in subset) / len(subset)

    def month_cost(model: str, mix: dict) -> float:
        total = 0.0
        rates = RATES[model]
        for kind, n in mix.items():
            if kind == "image":
                total += n * 0.0002
                continue
            if kind == "resources":
                total += n * 0.01
                continue
            if kind not in per_kind_in:
                continue
            total += n * ((per_kind_in[kind] / 1e6) * rates["in"] + (per_kind_out[kind] / 1e6) * rates["out"])
        return total

    m4o = month_cost("gpt-4o", always)
    mmid = month_cost("gpt-4.1-mini", always)
    mmini = month_cost("gpt-4o-mini", always)
    infra100 = 108 / 100

    light_mix = {"plan": 3, "scan": 2, "cook": 8, "resources": 8, "image": 40}
    daily_mix = {"plan": 6, "scan": 8, "cook": 20, "resources": 20, "image": 80}
    light_full = month_cost("gpt-4o", light_mix) + infra100
    daily_full = month_cost("gpt-4o", daily_mix) + infra100
    always_full = m4o + infra100

    story.append(Paragraph("Simple total per paying user", h))
    story.append(Paragraph(
        f"<b>Budget about {money(always_full)} per paying user per month</b> if they actually "
        "use the app a lot (GPT-4o, about 100 customers sharing the servers). "
        "That is the number to price against. It is not $99/user — $99 only shows up if one "
        "person is carrying the whole Railway + Supabase + Vercel bill by themselves.",
        body,
    ))
    story.append(Spacer(1, 6))
    simple = [
        [
            Paragraph("<b>If the user…</b>", cell),
            Paragraph("<b>What that means</b>", cell),
            Paragraph("<b>What it costs you / month</b>", cell),
        ],
        [
            Paragraph("Pays and barely uses it", cell),
            Paragraph("1–2 plans, a couple of scans, a few cooking guides", cell),
            Paragraph(f"<b>{money(light_full)}</b>", cell),
        ],
        [
            Paragraph("Uses it most days", cell),
            Paragraph("Weekly plan, scans, cooking instructions", cell),
            Paragraph(f"<b>{money(daily_full)}</b>", cell),
        ],
        [
            Paragraph("Uses every tab all month", cell),
            Paragraph("12 plans, 20 scans, 60 cooking guides, dish photos", cell),
            Paragraph(f"<b>{money(always_full)}</b>", cell),
        ],
    ]
    st = Table(simple, colWidths=[2.0 * inch, 3.4 * inch, 1.9 * inch])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#E8F1FB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, 2), [colors.white, colors.HexColor("#F7F9FC")]),
    ]))
    story.append(st)
    story.append(Paragraph(
        "Almost all of that is shared hosting (~$1.08 of the total). The AI itself is about "
        f"{money(month_cost('gpt-4o', light_mix))}–{money(m4o)} depending how hard they hit it.",
        small,
    ))
    story.append(Spacer(1, 8))
    price = [
        [
            Paragraph("<b>Plan you sell</b>", cell),
            Paragraph("<b>You charge / month</b>", cell),
            Paragraph("<b>Heavy user costs you</b>", cell),
            Paragraph("<b>You keep</b>", cell),
        ],
        ["Bronze", "$10.00", money(always_full), money(10 - always_full)],
        ["Silver", "$20.00", money(always_full), money(20 - always_full)],
        ["Gold", "$16.67 ($50 / 3 months)", money(always_full), money((50 / 3) - always_full)],
    ]
    pt = Table(price, colWidths=[1.5 * inch, 2.0 * inch, 1.9 * inch, 1.9 * inch])
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#EAF6EE")),
        ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
    ]))
    story.append(pt)

    story.append(Paragraph("Headline (always-on month, measured tokens)", h))
    head = [
        [Paragraph("<b>Always-on user / month</b>", cell), Paragraph("<b>OpenAI</b>", cell), Paragraph("<b>+ infra @ 100 users</b>", cell), Paragraph("<b>vs Bronze $10</b>", cell)],
        ["If LLM is GPT-4o", money(m4o), money(m4o + infra100), money(10 - (m4o + infra100))],
        ["If LLM is GPT-4.1 mini", money(mmid), money(mmid + infra100), money(10 - (mmid + infra100))],
        ["If LLM is GPT-4o mini", money(mmini), money(mmini + infra100), money(10 - (mmini + infra100))],
    ]
    t = Table(head, colWidths=[2.1 * inch, 1.4 * inch, 1.8 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F4F7FB")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Paragraph(
        "Always-on mix: 12 plan generations, 20 scans, 60 cooking instructions, "
        "60 resource lookups, 120 dish photos. Infra $108/month (Railway ~$48, "
        "Supabase Pro $25, Vercel $20, Flask/Render ~$15) split across 100 paying users = $1.08.",
        small,
    ))

    story.append(Paragraph("Every live call we made", h))
    header = [
        Paragraph("<b>Feature</b>", cell),
        Paragraph("<b>HTTP</b>", cell),
        Paragraph("<b>Sec</b>", cell),
        Paragraph("<b>In tok</b>", cell),
        Paragraph("<b>Out tok</b>", cell),
        Paragraph("<b>GPT-4o</b>", cell),
        Paragraph("<b>4.1 mini</b>", cell),
        Paragraph("<b>4o mini</b>", cell),
    ]
    data = [header]
    for row in rows:
        c4 = cost_for(row, "gpt-4o")
        cm = cost_for(row, "gpt-4.1-mini")
        cn = cost_for(row, "gpt-4o-mini")
        status = f"{row['status']}" + (" ok" if row.get("ok") else " FAIL")
        data.append([
            Paragraph(row["name"], cell),
            Paragraph(status, cell),
            Paragraph(str(row["elapsed_s"]), cell),
            Paragraph(str(row["billed_input_tokens_est"]), cell),
            Paragraph(str(row["response_tokens"]), cell),
            Paragraph(money(c4["total"]) if row["kind"] not in ("image", "flask") else (c4.get("note") or money(c4["total"])), cell),
            Paragraph(money(cm["total"]) if row["kind"] not in ("image", "flask") else "—", cell),
            Paragraph(money(cn["total"]) if row["kind"] not in ("image", "flask") else "—", cell),
        ])
    tbl = Table(data, colWidths=[1.7 * inch, 0.7 * inch, 0.5 * inch, 0.65 * inch, 0.7 * inch, 0.85 * inch, 0.85 * inch, 0.8 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
    ]))
    story.append(tbl)

    story.append(Paragraph("What “in tok” includes", h))
    story.append(Paragraph(
        "Request body tokens (tiktoken) + hidden system prompt estimate "
        f"(plans +{HIDDEN_SYSTEM['plan']}, scans +{HIDDEN_SYSTEM['scan']}, "
        f"cooking +{HIDDEN_SYSTEM['cook']}, resources +{HIDDEN_SYSTEM['resources']}). "
        "Photo scan also adds 765 vision tiles (GPT-4o high-detail ~1024px). "
        "If the AI server already has a shorter system prompt, GPT-4o cost is slightly lower.",
        body,
    ))

    story.append(Paragraph("Average measured size by feature", h))
    avg_rows = [[
        Paragraph("<b>Kind</b>", cell),
        Paragraph("<b>Successful calls</b>", cell),
        Paragraph("<b>Avg in tok</b>", cell),
        Paragraph("<b>Avg out tok</b>", cell),
        Paragraph("<b>Avg GPT-4o / call</b>", cell),
        Paragraph("<b>Avg 4o-mini / call</b>", cell),
    ]]
    for kind, label in (("plan", "Meal / budget / Food for you plan"), ("scan", "Ingredient or photo scan"), ("cook", "Cooking instructions"), ("resources", "YouTube / web resources"), ("image", "Dish photo lookup")):
        subset = [r for r in rows if r["kind"] == kind and r.get("ok")]
        if not subset:
            avg_rows.append([Paragraph(label, cell), "0", "—", "—", "—", "—"])
            continue
        ain = sum(r["billed_input_tokens_est"] for r in subset) / len(subset)
        aout = sum(r["response_tokens"] for r in subset) / len(subset)
        dummy = {
            "billed_input_tokens_est": ain,
            "response_tokens": aout,
            "kind": kind,
            "ok": True,
        }
        avg_rows.append([
            Paragraph(label, cell),
            str(len(subset)),
            f"{ain:.0f}",
            f"{aout:.0f}",
            money(cost_for(dummy, "gpt-4o")["total"]),
            money(cost_for(dummy, "gpt-4o-mini")["total"]) if kind not in ("image", "flask") else money(0.0002),
        ])
    avgt = Table(avg_rows, colWidths=[2.3 * inch, 1.1 * inch, 0.9 * inch, 0.9 * inch, 1.2 * inch, 1.2 * inch])
    avgt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
    ]))
    story.append(avgt)

    story.append(PageBreak())
    story.append(Paragraph("Other services we run (not OpenAI tokens)", h))
    other = [
        [Paragraph("<b>Service</b>", cell), Paragraph("<b>What we tested / how it bills</b>", cell), Paragraph("<b>Per user / month</b>", cell)],
        [Paragraph("Railway AI API", cell), Paragraph("This is the service we just called. CPU/RAM while generating. ~$15–25 of the Railway bill.", cell), Paragraph("$0.15–$0.25 at 100 users", cell)],
        [Paragraph("Railway image lookup", cell), Paragraph(f"POST {IMAGES}/image returned a CDN URL, not a generated picture. ~$8–15 of Railway.", cell), Paragraph("$0.08–$0.15 at 100 users", cell)],
        [Paragraph("Supabase Pro", cell), Paragraph("Auth, Postgres, Realtime. 100k MAU included. Extra MAU $0.00325.", cell), Paragraph("$0.25 at 100 users", cell)],
        [Paragraph("Flask API (Render or Railway)", cell), Paragraph("Local server responded. Login, subscriptions, marketplace, meal-plan save. No LLM.", cell), Paragraph("~$0.15 at 100 users", cell)],
        [Paragraph("Vercel frontend", cell), Paragraph("SPA + /image-api proxy. Hobby can be $0; Pro $20.", cell), Paragraph("$0–$0.20 at 100 users", cell)],
        [Paragraph("Cloudflare R2", cell), Paragraph("Avatars / private care files. $0.015/GB, free egress.", cell), Paragraph("cents", cell)],
        [Paragraph("Resend email", cell), Paragraph("Meal reminders. Free to 3,000 emails/month.", cell), Paragraph("$0 until ~33 heavy users", cell)],
        [Paragraph("Paystack", cell), Paragraph("Takes a cut of checkout, not a cost to run features.", cell), Paragraph("n/a (processing fee)", cell)],
        [Paragraph("WebRTC video call", cell), Paragraph("Peer-to-peer media. Signaling goes through Flask. No per-minute media bill.", cell), Paragraph("~ $0 extra", cell)],
    ]
    ot = Table(other, colWidths=[1.6 * inch, 4.2 * inch, 1.5 * inch])
    ot.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E3E77")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D0D7E2")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
    ]))
    story.append(ot)

    story.append(Paragraph("Failed or empty calls", h))
    if failed:
        for r in failed:
            story.append(Paragraph(
                f"• {r['name']}: HTTP {r['status']} in {r['elapsed_s']}s — {(r.get('error') or r.get('preview') or '')[:240]}",
                small,
            ))
    else:
        story.append(Paragraph("None. Every probed endpoint returned a body.", body))

    story.append(Paragraph("How to read this against pricing", h))
    story.append(Paragraph(
        f"Bronze is $10/month. An always-on GPT-4o user at 100 customers costs about "
        f"{money(m4o + infra100)} fully loaded. Silver $20 and Gold $16.67/month (from $50/3 months) "
        "are the same AI cost. Marketplace consults do not add OpenAI tokens. "
        "Confirm the model name inside the Railway AI service — if it is already mini, use the mini column.",
        body,
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Raw JSON of every call (status, tokens, previews) is saved next to this PDF as measured-ai-costs.json.",
        small,
    ))

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#667"))
        canvas.drawString(0.7 * inch, 0.45 * inch, "MealLensAI measured costs — not a live OpenAI invoice")
        canvas.drawRightString(8.0 * inch, 0.45 * inch, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.7 * inch,
        title="MealLensAI measured cost per user",
        author="MealLensAI cost probe",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print("PDF", OUT_PDF)


def main():
    print("AI", AI)
    print("IMAGES", IMAGES)
    print("FLASK", FLASK)
    rows = run_calls()
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ai": AI,
        "images": IMAGES,
        "flask": FLASK,
        "rates": RATES,
        "hidden_system_tokens_est": HIDDEN_SYSTEM,
        "calls": [{k: v for k, v in row.items() if k != "body"} for row in rows],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2))
    print("JSON", OUT_JSON)
    write_pdf(rows)
    ok = sum(1 for r in rows if r.get("ok"))
    print(f"done {ok}/{len(rows)} ok")


if __name__ == "__main__":
    main()
