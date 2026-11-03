import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, Check, Copy, FolderSearch, HardDrive, Trash2, X } from "lucide-react";
import {
  bumpSharedDownloadCount,
  fetchIclearerFeedback,
  getSharedDownloadCount,
  submitIclearerFeedback,
  type IclearerFeedback,
} from "@/lib/clearaerDownloads";

const SITE_URL = "https://healthassistant.meallensai.com";
const BRAND = "iClearer";
const LOGO_SRC = "/assets/clearaer-logo.png";
const LEAD_KEY = "iclearer-download-lead";

const COMPANIES = [
  "Computer Vision Africa",
  "MealLensAI",
  "DalensAI",
  "Python Cabo Verde",
];

const INSTALL_FROM_DOWNLOADS = `hdiutil attach ~/Downloads/Clearaer.dmg -nobrowse
rm -rf /Applications/Clearaer.app
cp -R "/Volumes/Install Clearaer/Clearaer.app" /Applications/
xattr -dr com.apple.quarantine /Applications/Clearaer.app
hdiutil detach "/Volumes/Install Clearaer"
open /Applications/Clearaer.app`;

const OPEN_IF_ALREADY_COPIED =
  "xattr -dr com.apple.quarantine /Applications/Clearaer.app && open /Applications/Clearaer.app";

const FEATURES = [
  {
    title: "For everyone",
    items: [
      {
        icon: FolderSearch,
        name: "Scan hidden files",
        text: "Finds caches, logs, and leftover folders that fill a Mac.",
      },
      {
        icon: HardDrive,
        name: "See the space first",
        text: "Tick folders and watch how much you will free before deleting.",
      },
    ],
  },
  {
    title: "For developers",
    items: [
      {
        icon: Trash2,
        name: "npm, pip, Homebrew",
        text: "Cleans tool caches on Intel and Apple Silicon Macs.",
      },
      {
        icon: HardDrive,
        name: "Cursor and Xcode",
        text: "Removes editor and build leftovers. Logins stay blocked.",
      },
    ],
  },
  {
    title: "Safe by default",
    items: [
      {
        icon: Check,
        name: "Moves to Trash",
        text: "Nothing is permanently deleted. You can undo a mistake.",
      },
      {
        icon: Check,
        name: "Keychain stays",
        text: "Accounts, Keychain, and editor user data cannot be deleted.",
      },
    ],
  },
];

const SEED_FEEDBACK: IclearerFeedback[] = [
  {
    name: "Israel Afolabi",
    text: "Thank you so much for this product, I have downloaded and used it. Well done.",
  },
  {
    name: "Benjamin Mpano",
    text: "Thank you so much, this saved me almost 30GBs of cache.",
  },
  {
    name: "Digital Dreams",
    text: "I mean… the fuck. This worked. Thank you so much.",
  },
  {
    name: "Chris Eminence",
    text: "You will get one canopy to yourself alone on my wedding day. God bless you.",
  },
  {
    name: "Emmanuel Eves",
    text: "Works perfectly. I recovered around 98GB total mostly Xcode cache, browser cache and old system logs. Cleaned my Mac in seconds, no problems. Best cleaner I've tried.",
  },
];

type Lead = { name: string; email: string };

const readSavedLead = (): Lead | null => {
  try {
    const raw = localStorage.getItem(LEAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Lead;
    if (!parsed?.name?.trim() || !parsed?.email?.trim()) return null;
    return { name: parsed.name.trim(), email: parsed.email.trim() };
  } catch {
    return null;
  }
};

const mergeFeedback = (remote: IclearerFeedback[]): IclearerFeedback[] => {
  const seen = new Set<string>();
  const merged: IclearerFeedback[] = [];
  for (const item of [...remote, ...SEED_FEEDBACK]) {
    const key = `${item.name.trim().toLowerCase()}|${item.text.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
};

const CleanerPage = () => {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<IclearerFeedback[]>(SEED_FEEDBACK);
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbText, setFbText] = useState("");
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbStatus, setFbStatus] = useState<string | null>(null);
  const [fbSubmitting, setFbSubmitting] = useState(false);

  const installFromWeb = `curl -fsSL ${SITE_URL}/downloads/install-clearaer.sh | bash`;

  const copyCommand = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
    } catch {
      setCopied(null);
    }
  };

  const refreshFeedback = async () => {
    const remote = await fetchIclearerFeedback();
    setFeedbackItems(mergeFeedback(remote));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [total] = await Promise.all([getSharedDownloadCount(), refreshFeedback()]);
      if (!cancelled && total != null) setDownloads(total);
    })();
    const saved = readSavedLead();
    if (saved) {
      setLeadName(saved.name);
      setLeadEmail(saved.email);
      setFbName(saved.name);
      setFbEmail(saved.email);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const startDownload = async (lead: Lead) => {
    if (downloading) return;
    setDownloading(true);
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify(lead));
    } catch {
      /* ignore */
    }
    const link = document.createElement("a");
    link.href = "/downloads/Clearaer.dmg";
    link.download = "Clearaer.dmg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    const total = await bumpSharedDownloadCount(lead);
    if (total != null) setDownloads(total);
    setDownloading(false);
    setShowLeadModal(false);
  };

  const openDownloadModal = () => {
    if (downloading) return;
    setLeadError(null);
    setShowLeadModal(true);
  };

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    const name = leadName.trim();
    const email = leadEmail.trim();
    if (!name) {
      setLeadError("Please enter your name.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLeadError("Please enter a valid email.");
      return;
    }
    setLeadError(null);
    await startDownload({ name, email });
  };

  const submitFeedbackForm = async (event: FormEvent) => {
    event.preventDefault();
    const name = fbName.trim();
    const email = fbEmail.trim();
    const feedback = fbText.trim();
    if (!name) {
      setFbError("Please enter your name.");
      setFbStatus(null);
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFbError("Please enter a valid email.");
      setFbStatus(null);
      return;
    }
    if (!feedback) {
      setFbError("Please write your feedback.");
      setFbStatus(null);
      return;
    }
    setFbError(null);
    setFbSubmitting(true);
    const ok = await submitIclearerFeedback({ name, email, feedback });
    setFbSubmitting(false);
    if (!ok) {
      setFbError("Could not send feedback. Please try again.");
      setFbStatus(null);
      return;
    }
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify({ name, email }));
    } catch {
      /* ignore */
    }
    setFbText("");
    setFbStatus("Thanks — your feedback is up.");
    const total = await getSharedDownloadCount();
    if (total != null) setDownloads(total);
    await refreshFeedback();
  };

  return (
    <div className="min-h-screen bg-white text-left text-[#0b1210]">
      <header className="border-b border-[#d9e5e0] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <button
            type="button"
            className="flex items-center gap-2 text-[16px] font-bold text-[#0b1210]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img src={LOGO_SRC} alt="" className="h-8 w-8" />
            {BRAND}
          </button>
          <nav className="flex items-center gap-3 text-sm font-semibold text-[#0b1210] sm:gap-5">
            <button type="button" className="hover:text-[#1a8f6c]" onClick={openDownloadModal}>
              Download
            </button>
            <a href="#feedback" className="hover:text-[#1a8f6c]">
              Feedback
            </a>
            <a href="#install" className="hover:text-[#1a8f6c]">
              Install
            </a>
            <button type="button" className="hover:text-[#1a8f6c]" onClick={() => navigate("/landing")}>
              MealLensAI
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-14 text-center md:py-16">
          <img src={LOGO_SRC} alt={BRAND} className="mx-auto h-20 w-20" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0b1210] md:text-5xl">
            {BRAND}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[22px] font-extrabold leading-8 text-[#0b1210]">
            Clean your Mac and get your storage back.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[16px] font-medium leading-7 text-[#1c2a26]">
            Finds hidden caches and leftover files, then lets you choose what to
            move to Trash.{" "}
            <span className="font-extrabold text-[#1a8f6c]">Free. Open source. No subscription.</span>
          </p>
          <button
            type="button"
            onClick={openDownloadModal}
            disabled={downloading}
            className="mt-7 inline-flex items-center rounded bg-[#2eb88c] px-6 py-2.5 text-[16px] font-extrabold text-[#0b1210] hover:bg-[#48d0a3] disabled:opacity-70"
          >
            {downloading ? "Starting download…" : `Download ${BRAND}`}
          </button>
          <p className="mt-3 text-[14px] font-medium leading-6 text-[#1c2a26]">
            Version 1.0 · macOS 13+ (Intel and Apple Silicon) · 468 KB
          </p>
          <p className="mt-5 text-4xl font-extrabold tabular-nums text-[#0b1210]">
            {downloads === null ? "—" : downloads.toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1c2a26]">
            {downloads === 1 ? `person has downloaded ${BRAND}` : `people have downloaded ${BRAND}`}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 font-semibold text-[#0b1210]">
            <Apple className="h-5 w-5" />
            <span className="text-sm">macOS</span>
          </div>
          <img
            src="/assets/clearaer-app.png"
            alt={`${BRAND} Mac app`}
            className="mx-auto mt-10 w-full rounded border border-[#d9e5e0] shadow-sm"
          />
        </section>

        <section className="border-t border-[#d9e5e0] bg-[#f3faf7]">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 text-left md:grid-cols-3">
            {FEATURES.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1a8f6c]">
                  {group.title}
                </h2>
                <div className="space-y-6">
                  {group.items.map((item) => (
                    <div key={item.name} className="flex gap-3">
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#2eb88c]" />
                      <div>
                        <p className="font-bold text-[#0b1210]">{item.name}</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-[#1c2a26]">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="feedback" className="border-t border-[#d9e5e0] bg-[#f7f8f8]">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center">
            <p className="inline-flex rounded-full border border-[#1a8f6c] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1a8f6c]">
              Feedback
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b1210] md:text-4xl">
              From people who used it
            </h2>
            <div className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
              {feedbackItems.map((item) => (
                <article
                  key={`${item.name}-${item.text.slice(0, 24)}`}
                  className="flex min-h-[220px] flex-col rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                >
                  <span className="select-none text-5xl font-serif leading-none text-[#d7ddd9]" aria-hidden>
                    &ldquo;
                  </span>
                  <p className="mt-2 flex-1 text-[15px] font-medium leading-7 text-[#3a4742]">
                    {item.text}
                  </p>
                  <p className="mt-6 text-left text-sm font-extrabold text-[#0b1210]">{item.name}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="install" className="mx-auto max-w-5xl px-4 py-14 text-left">
          <h2 className="text-2xl font-extrabold text-[#0b1210]">Install {BRAND}</h2>
          <ol className="mt-6 max-w-2xl list-decimal space-y-3 pl-5 text-[16px] font-medium leading-7 text-[#0b1210]">
            <li>Download the DMG and drag {BRAND} into Applications.</li>
            <li>
              The first time, right-click {BRAND} and choose <strong>Open</strong>.
              Do not click Move to Trash.
            </li>
            <li>
              Or click Done, then System Settings → Privacy &amp; Security →{" "}
              <strong>Open Anyway</strong>.
            </li>
          </ol>

          <p className="mt-8 text-sm font-bold text-[#0b1210]">
            Open Terminal and paste one of these commands to install {BRAND}
          </p>
          <CommandBlock
            label="If the DMG is in Downloads"
            command={INSTALL_FROM_DOWNLOADS}
            copied={copied === "downloads"}
            onCopy={() => copyCommand("downloads", INSTALL_FROM_DOWNLOADS)}
          />
          <CommandBlock
            label="If the app is already in Applications"
            command={OPEN_IF_ALREADY_COPIED}
            copied={copied === "open"}
            onCopy={() => copyCommand("open", OPEN_IF_ALREADY_COPIED)}
          />
          <CommandBlock
            label="One-line install"
            command={installFromWeb}
            copied={copied === "web"}
            onCopy={() => copyCommand("web", installFromWeb)}
          />
        </section>

        <section id="leave-feedback" className="border-t border-[#d9e5e0] bg-[#f3faf7]">
          <div className="mx-auto max-w-5xl px-4 py-14 text-left">
            <h2 className="text-2xl font-extrabold text-[#0b1210]">Leave feedback</h2>
            <p className="mt-2 max-w-2xl text-[16px] font-medium leading-7 text-[#1c2a26]">
              Share your name, email, and what you thought after using {BRAND}.
            </p>
            <form className="mt-8 max-w-xl space-y-4" onSubmit={submitFeedbackForm}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#0b1210]">Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={fbName}
                  onChange={(event) => setFbName(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d6cf] bg-white px-3 py-2.5 text-sm font-medium text-[#0b1210] outline-none focus:border-[#1a8f6c]"
                  placeholder="Your name"
                  disabled={fbSubmitting}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#0b1210]">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={fbEmail}
                  onChange={(event) => setFbEmail(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d6cf] bg-white px-3 py-2.5 text-sm font-medium text-[#0b1210] outline-none focus:border-[#1a8f6c]"
                  placeholder="you@email.com"
                  disabled={fbSubmitting}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#0b1210]">Feedback</span>
                <textarea
                  value={fbText}
                  onChange={(event) => setFbText(event.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-[#c5d6cf] bg-white px-3 py-2.5 text-sm font-medium text-[#0b1210] outline-none focus:border-[#1a8f6c]"
                  placeholder="How did it go?"
                  disabled={fbSubmitting}
                />
              </label>
              {fbError ? <p className="text-sm font-semibold text-red-600">{fbError}</p> : null}
              {fbStatus ? <p className="text-sm font-semibold text-[#1a8f6c]">{fbStatus}</p> : null}
              <button
                type="submit"
                disabled={fbSubmitting}
                className="inline-flex items-center rounded-lg bg-[#2eb88c] px-5 py-2.5 text-[15px] font-extrabold text-[#0b1210] hover:bg-[#48d0a3] disabled:opacity-70"
              >
                {fbSubmitting ? "Sending…" : "Send feedback"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d9e5e0] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm font-medium text-[#0b1210] sm:flex-row sm:items-center sm:justify-between">
          <p>{BRAND} is a free project from MealLensAI.</p>
          <p>{COMPANIES.join(" · ")}</p>
        </div>
        <div className="mx-auto max-w-5xl border-t border-[#d9e5e0] px-4 py-5 text-sm font-medium text-[#0b1210]">
          <p className="font-bold">Contact</p>
          <p className="mt-1">
            <a className="text-[#1a8f6c] underline" href="mailto:danielsamueletukudo@gmail.com">
              danielsamueletukudo@gmail.com
            </a>
            {" "}or{" "}
            <a className="text-[#1a8f6c] underline" href="tel:+254748703778">
              +254748703778
            </a>
          </p>
        </div>
      </footer>

      {showLeadModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="presentation"
          onClick={() => !downloading && setShowLeadModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-lead-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="download-lead-title" className="text-xl font-extrabold text-[#0b1210]">
                  One last step left to download
                </h2>
                <p className="mt-1 text-sm font-medium text-[#5a6f68]">
                  Enter your name and email to continue.
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-[#5a6f68] hover:bg-[#f3faf7] hover:text-[#0b1210]"
                aria-label="Close"
                disabled={downloading}
                onClick={() => setShowLeadModal(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitLead}>
              <label className="block text-left">
                <span className="mb-1.5 block text-sm font-bold text-[#0b1210]">Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={leadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d6cf] px-3 py-2.5 text-sm font-medium text-[#0b1210] outline-none focus:border-[#1a8f6c]"
                  placeholder="Your name"
                  disabled={downloading}
                />
              </label>
              <label className="block text-left">
                <span className="mb-1.5 block text-sm font-bold text-[#0b1210]">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={leadEmail}
                  onChange={(event) => setLeadEmail(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d6cf] px-3 py-2.5 text-sm font-medium text-[#0b1210] outline-none focus:border-[#1a8f6c]"
                  placeholder="you@email.com"
                  disabled={downloading}
                />
              </label>
              {leadError ? (
                <p className="text-sm font-semibold text-red-600">{leadError}</p>
              ) : null}
              <button
                type="submit"
                disabled={downloading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#2eb88c] px-4 py-2.5 text-[15px] font-extrabold text-[#0b1210] hover:bg-[#48d0a3] disabled:opacity-70"
              >
                {downloading ? "Starting download…" : "Download"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const CommandBlock = ({
  label,
  command,
  copied,
  onCopy,
}: {
  label: string;
  command: string;
  copied: boolean;
  onCopy: () => void;
}) => (
  <div className="mt-3 overflow-hidden rounded border border-[#c5d6cf] bg-[#f3faf7] text-left">
    <div className="flex items-center justify-between border-b border-[#c5d6cf] px-3 py-2">
      <p className="text-xs font-semibold text-[#0b1210]">{label}</p>
      <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 text-xs font-bold text-[#1a8f6c] hover:underline">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
    <pre className="overflow-x-auto p-3 text-left font-mono text-[13px] leading-6 text-[#0b1210]">{command}</pre>
  </div>
);

export default CleanerPage;
