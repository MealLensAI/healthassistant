"""Media rules for care APIs — never put file bytes in JSON responses."""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote, urlparse

Json = dict[str, Any]

_DATA_PREFIXES = ("data:",)
_REMOTE_PREFIXES = ("http://", "https://", "blob:")


def is_embedded_bytes(value: Any) -> bool:
    return isinstance(value, str) and value.startswith(_DATA_PREFIXES)


def is_object_key(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    if value.startswith(_DATA_PREFIXES) or value.startswith(_REMOTE_PREFIXES):
        return False
    return True


def sanitize_asset_ref(value: Any) -> str:
    """Keep R2 keys and public CDN URLs; drop base64 data URLs."""
    if not isinstance(value, str) or not value:
        return ""
    if is_embedded_bytes(value):
        return ""
    return value


def storage_key_for_asset(value: Any) -> str:
    """Normalize media refs for DB columns — object keys, never expiring signed URLs.

    Presigned S3/R2 URLs are peeled back to the object key so later responses can
    re-sign. Public CDN URLs (Unsplash, etc.) are kept as-is.
    """
    if not isinstance(value, str) or not value:
        return ""
    if is_embedded_bytes(value):
        return ""
    if is_object_key(value):
        return value
    if not value.startswith(("http://", "https://")):
        return ""
    parsed = urlparse(value)
    query = parsed.query or ""
    if "X-Amz-" in query or "x-amz-" in query.lower():
        path = unquote(parsed.path or "").lstrip("/")
        if "/" in path:
            _bucket, _, key = path.partition("/")
            if key:
                return key
        return ""
    # Non-presigned remote URL (CDN / Unsplash) — persist as-is.
    return value


def account_avatar(user: Json | None, dietitians: list[Json], applications: list[Json] | None = None) -> str:
    """Resolve only this account's photo, including older listing-only registrations.

    Accept normalized state and database rows so call creation, hydration, and
    filtered pulse reads use the same precedence without persisting signed URLs.
    """
    if not user:
        return ""
    avatar = sanitize_asset_ref(user.get("avatar") or user.get("avatar_key"))
    if avatar or user.get("role") != "dietitian":
        return avatar
    user_id = user.get("id")
    for listing in dietitians:
        if (listing.get("userId") or listing.get("user_id")) == user_id:
            avatar = sanitize_asset_ref(listing.get("avatar") or listing.get("avatar_key"))
            if avatar:
                return avatar
    for application in applications or []:
        if (application.get("userId") or application.get("user_id")) != user_id:
            continue
        for document in application.get("documents") or []:
            if document.get("kind") == "photo":
                avatar = sanitize_asset_ref(document.get("objectKey") or document.get("url"))
                if avatar:
                    return avatar
    return ""


def sanitize_document(doc: Json | None) -> Json:
    """Metadata + object storage refs only — never inline file bytes."""
    if not isinstance(doc, dict):
        return {}
    object_key = doc.get("objectKey") or doc.get("object_key")
    bucket = doc.get("bucket")
    url = doc.get("url")
    out: Json = {
        "kind": doc.get("kind") or "",
        "name": doc.get("name") or "",
        "fileName": doc.get("fileName") or doc.get("original_name") or doc.get("name") or "",
        "uploaded": bool(doc.get("uploaded") or object_key or (isinstance(url, str) and bool(url))),
    }
    if object_key and is_object_key(object_key):
        out["objectKey"] = object_key
        if bucket:
            out["bucket"] = bucket
    # Preserve already-public remote URLs (Unsplash etc.). Never emit data: URLs.
    if isinstance(url, str) and url.startswith(_REMOTE_PREFIXES) and not is_embedded_bytes(url):
        out["url"] = url
    return out


def sanitize_attachment(item: Json | None) -> Json:
    if not isinstance(item, dict):
        return {}
    out: Json = {
        "name": item.get("name") or "",
        "size": item.get("size") or "",
        "type": item.get("type") or item.get("mimeType") or "",
    }
    if item.get("sizeBytes") is not None:
        out["sizeBytes"] = item.get("sizeBytes")
    object_key = item.get("objectKey") or item.get("object_key")
    bucket = item.get("bucket")
    if object_key and is_object_key(object_key):
        out["objectKey"] = object_key
        if bucket:
            out["bucket"] = bucket
    url = item.get("url")
    if isinstance(url, str) and url.startswith(_REMOTE_PREFIXES) and not is_embedded_bytes(url):
        out["url"] = url
    return out


def sanitize_user(user: Json) -> Json:
    result = dict(user)
    result["avatar"] = sanitize_asset_ref(user.get("avatar"))
    return result


def sanitize_dietitian(item: Json, *, include_documents: bool = True) -> Json:
    result = dict(item)
    result["avatar"] = sanitize_asset_ref(item.get("avatar"))
    result["coverImage"] = sanitize_asset_ref(item.get("coverImage"))
    if include_documents:
        result["documents"] = [sanitize_document(doc) for doc in (item.get("documents") or [])]
    else:
        result["documents"] = []
    return result


def sanitize_application(item: Json) -> Json:
    result = dict(item)
    result["documents"] = [sanitize_document(doc) for doc in (item.get("documents") or [])]
    return result


def sanitize_message(item: Json) -> Json:
    result = dict(item)
    result["attachments"] = [sanitize_attachment(att) for att in (item.get("attachments") or [])]
    return result


def sanitize_file(item: Json) -> Json:
    result = dict(item)
    result["url"] = None
    if is_embedded_bytes(result.get("objectKey")):
        result["objectKey"] = None
    return result


def sanitize_state(state: Json, *, include_documents: bool = True) -> Json:
    """Strip every embedded byte payload from a marketplace state dict."""
    return {
        **state,
        "users": [sanitize_user(item) for item in state.get("users") or []],
        "dietitians": [
            sanitize_dietitian(item, include_documents=include_documents)
            for item in state.get("dietitians") or []
        ],
        "applications": [sanitize_application(item) for item in state.get("applications") or []],
        "messages": [sanitize_message(item) for item in state.get("messages") or []],
        "files": [sanitize_file(item) for item in state.get("files") or []],
        "liveCalls": [
            {
                **item,
                "callerAvatar": sanitize_asset_ref(item.get("callerAvatar")),
                "calleeAvatar": sanitize_asset_ref(item.get("calleeAvatar")),
            }
            for item in state.get("liveCalls") or []
        ],
    }
