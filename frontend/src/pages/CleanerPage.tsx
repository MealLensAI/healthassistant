import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, Check, Copy, FolderSearch, HardDrive, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { safeGetItem, safeSetItem } from "@/lib/utils";

const SITE_URL = "https://healthassistant.meallensai.com";
const COUNT_KEY = "clearaer_download_count";
const COUNT_URL = "/downloads/clearaer-count.json";

const readCachedCount = () => {
  const raw = safeGetItem(COUNT_KEY);
  const value = raw == null ? 0 : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const saveCachedCount = (total: number) => {
  const next = Math.max(total, readCachedCount());
  safeSetItem(COUNT_KEY, String(next));
  return next;
};

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

const CleanerPage = () => {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<number | null>(() => {
    const cached = readCachedCount();
    return cached > 0 ? cached : null;
  });
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = readCachedCount();
      let fileTotal = 0;
      let apiTotal = 0;
      try {
        const response = await fetch(COUNT_URL, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          fileTotal = Number(data?.total) || 0;
        }
      } catch {
        // Keep the cached count if the file is missing.
      }
      try {
        const stats = await api.getClearaerDownloadStats();
        apiTotal = Number(stats.total) || 0;
      } catch {
        // Backend can be down. Do not reset the counter.
      }
      if (cancelled) return;
      setDownloads(saveCachedCount(Math.max(cached, fileTotal, apiTotal)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const next = saveCachedCount((downloads ?? 0) + 1);
    setDownloads(next);
    try {
      const response = await fetch(COUNT_URL, { method: "POST", cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.total === "number") {
          setDownloads(saveCachedCount(data.total));
        }
      }
    } catch {
      // Count is already stored locally.
    }
    try {
      const result = await api.recordClearaerDownload();
      if (typeof result.total === "number") {
        setDownloads(saveCachedCount(result.total));
      }
    } catch {
      // Still start the file download even if tracking fails.
    }
    const link = document.createElement("a");
    link.href = "/downloads/Clearaer.dmg";
    link.download = "Clearaer.dmg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-white text-left text-[#0b1210]">
      <header className="border-b border-[#d9e5e0] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <button type="button" className="flex items-center gap-2 text-[16px] font-bold text-[#0b1210]" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/assets/clearaer-logo.png" alt="" className="h-8 w-8 rounded-full" />
            Clearaer
          </button>
          <nav className="flex items-center gap-3 text-sm font-semibold text-[#0b1210] sm:gap-5">
            <button type="button" className="hover:text-[#1a8f6c]" onClick={handleDownload}>
              Download
            </button>
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
          <img src="/assets/clearaer-logo.png" alt="Clearaer" className="mx-auto h-20 w-20 rounded-full" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0b1210] md:text-5xl">
            Clearaer
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[18px] font-medium leading-7 text-[#0b1210]">
            A free, open-source Mac app that finds hidden cache files and lets
            you choose what to move to Trash. No subscription. No trial.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-7 inline-flex items-center rounded bg-[#2eb88c] px-6 py-2.5 text-[16px] font-extrabold text-[#0b1210] hover:bg-[#48d0a3] disabled:opacity-70"
          >
            {downloading ? "Starting download…" : "Download Clearaer"}
          </button>
          <p className="mt-3 text-[14px] font-medium leading-6 text-[#1c2a26]">
            Version 1.0 · macOS 13+ (Intel and Apple Silicon) · 468 KB
          </p>
          <p className="mt-5 text-4xl font-extrabold tabular-nums text-[#0b1210]">
            {downloads === null ? "—" : downloads.toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1c2a26]">
            {downloads === 1 ? "person has downloaded Clearaer" : "people have downloaded Clearaer"}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 font-semibold text-[#0b1210]">
            <Apple className="h-5 w-5" />
            <span className="text-sm">macOS</span>
          </div>
          <img
            src="/assets/clearaer-app.png"
            alt="Clearaer Mac app"
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

        <section id="install" className="mx-auto max-w-5xl px-4 py-14 text-left">
          <h2 className="text-2xl font-extrabold text-[#0b1210]">Install Clearaer</h2>
          <ol className="mt-6 max-w-2xl list-decimal space-y-3 pl-5 text-[16px] font-medium leading-7 text-[#0b1210]">
            <li>Download the DMG and drag Clearaer into Applications.</li>
            <li>
              The first time, right-click Clearaer and choose <strong>Open</strong>.
              Do not click Move to Trash.
            </li>
            <li>
              Or click Done, then System Settings → Privacy &amp; Security →{" "}
              <strong>Open Anyway</strong>.
            </li>
          </ol>

          <p className="mt-8 text-sm font-bold text-[#0b1210]">
            Open Terminal and paste one of these commands to install Clearaer
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
      </main>

      <footer className="border-t border-[#d9e5e0] bg-[#f3faf7]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm font-medium text-[#0b1210] sm:flex-row sm:items-center sm:justify-between">
          <p>Clearaer is a free project from MealLensAI.</p>
          <p>{COMPANIES.join(" · ")}</p>
        </div>
        <div className="mx-auto max-w-5xl border-t border-[#d9e5e0] px-4 py-5 text-sm font-medium text-[#0b1210]">
          <p className="font-bold">Feedback</p>
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
