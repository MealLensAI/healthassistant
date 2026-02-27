import { useEffect, useMemo, useState } from "react";
import { Bell, MessageCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/utils";
import {
  AppNotification,
  getLocalNotifications,
  notificationsEventName,
} from "@/lib/notificationCenter";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const QUOTES = [
  "Every meal you complete is a win for your health.",
  "Small food choices today create better health tomorrow.",
  "Consistency beats perfection in nutrition.",
  "Your meal plan works best when you trust the process.",
  "Healthy routines are built one cooked meal at a time.",
];

type ServerNotification = Omit<AppNotification, "source">;

interface RawServerNotification {
  id?: string;
  title?: string;
  message?: string;
  created_at?: string;
  createdAt?: string;
  level?: AppNotification["level"];
  type?: string;
}

const levelStyles: Record<string, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function GlobalEngagementBar() {
  const mapServerNotification = (item: RawServerNotification): ServerNotification => {
    const fallbackLevel: AppNotification["level"] =
      item.type === "meal_reminder" ? "warning" : "info";
    return {
      id: item.id || `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title || "Notification",
      message: item.message || "",
      level: item.level || fallbackLevel,
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    };
  };

  const { token, isAuthenticated } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);

  const whatsappNumber = "254748703778";
  const whatsappMessage = encodeURIComponent(
    "Hello Daniel, I am reaching out from MealLensAI for consultation, doctor follow-up, or feedback."
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const dailyQuote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  useEffect(() => {
    const refreshLocal = () => setLocalNotifications(getLocalNotifications());
    refreshLocal();

    window.addEventListener(notificationsEventName, refreshLocal);
    return () => window.removeEventListener(notificationsEventName, refreshLocal);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let mounted = true;
    const fetchServerNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/meal_tracking/notifications`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!mounted) return;
        if (data.status === "success" && Array.isArray(data.notifications)) {
          setServerNotifications(data.notifications.map(mapServerNotification));
        }
      } catch {
        // Silent fail, bar still works with local notifications.
      }
    };

    fetchServerNotifications();
    const interval = setInterval(fetchServerNotifications, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, token]);

  const mergedNotifications = useMemo(() => {
    const map = new Map<string, AppNotification>();
    for (const item of serverNotifications) {
      map.set(item.id, { ...item, source: "server" });
    }
    for (const item of localNotifications) {
      map.set(item.id, item);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localNotifications, serverNotifications]);

  return (
    <div className="px-4 sm:px-6 md:px-8 pt-4 space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-[#3B6FD4] via-[#4B7FE2] to-[#5E93ED] px-5 py-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase opacity-90">Daily Motivation</p>
            <p className="text-sm sm:text-[15px] italic opacity-95">&ldquo;{dailyQuote}&rdquo;</p>
          </div>
        </div>
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 via-white to-green-50 p-4 shadow-sm hover:shadow-md animate-notice-zoom"
        aria-label="Reach out on WhatsApp"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 rounded-full bg-green-500 animate-ping" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-green-700">WhatsApp Support</p>
            <p className="text-sm font-semibold text-gray-900">
              Need consultation, personal follow-up, or feedback?
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Message us on WhatsApp: +254 748 703 778</p>
          </div>
        </div>
      </a>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <button
          onClick={() => setShowNotifications((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Bell className="h-4 w-4" />
            Notifications
          </div>
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-xs rounded-full bg-blue-100 text-blue-700 font-bold">
            {mergedNotifications.length}
          </span>
        </button>

        {showNotifications && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {mergedNotifications.length === 0 ? (
              <div className="text-sm text-slate-500 px-1 py-2">No notifications yet.</div>
            ) : (
              mergedNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${levelStyles[item.level] || levelStyles.info}`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs mt-1">{item.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
