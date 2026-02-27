import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";

const API_BASE_URL = APP_CONFIG.api.base_url ? `${APP_CONFIG.api.base_url}/api` : "/api";
const LOCAL_READ_IDS_KEY = "meallensai_read_notification_ids";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at?: string;
  createdAt?: string;
  read?: boolean;
}

export default function NotificationBell() {
  const { token, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [locallyReadIds, setLocallyReadIds] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_READ_IDS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setLocallyReadIds(parsed.filter((id) => typeof id === "string"));
      }
    } catch {
      // ignore bad local cache
    }
  }, []);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aTs = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTs = new Date(b.createdAt || b.created_at || 0).getTime();
      return bTs - aTs;
    });
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!mounted) return;
        if (data.status === "success") {
          let nextNotifications = Array.isArray(data.notifications) ? data.notifications : [];
          if (locallyReadIds.length > 0) {
            nextNotifications = nextNotifications.map((item) =>
              locallyReadIds.includes(item.id) ? { ...item, read: true } : item
            );
          }
          setNotifications(nextNotifications);
          setUnreadCount(nextNotifications.filter((item) => !item.read).length);
        }
      } catch {
        // Keep UI stable on fetch failures.
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, token, locallyReadIds]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return;
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      // Best effort only.
    }
  };

  const markOneRead = async (notificationId: string) => {
    if (!token) return;

    setLocallyReadIds((prev) => {
      if (prev.includes(notificationId)) return prev;
      const next = [notificationId, ...prev].slice(0, 200);
      try {
        localStorage.setItem(LOCAL_READ_IDS_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage write errors
      }
      return next;
    });

    // Optimistic UI update so badge drops immediately.
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.unread_count === "number") {
        setUnreadCount(data.unread_count);
      }
    } catch {
      // Keep optimistic state even if request fails.
    }
  };

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="px-3 py-2 border-b border-gray-100 text-sm font-semibold text-gray-800">
            Notifications
          </div>
          <div className="max-h-72 overflow-y-auto p-2 space-y-2">
            {sortedNotifications.length === 0 ? (
              <p className="text-sm text-gray-500 px-2 py-4">No notifications yet.</p>
            ) : (
              sortedNotifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-100 p-2">
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      if (!item.read) {
                        void markOneRead(item.id);
                      }
                      setSelectedNotification(item);
                    }}
                  >
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {!item.read ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
                      {item.title}
                    </p>
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedNotification && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {selectedNotification.title}
            </h3>
            <p className="text-sm text-gray-700 mb-3">{selectedNotification.message}</p>
            <p className="text-xs text-gray-500">
              {new Date(
                selectedNotification.createdAt || selectedNotification.created_at || Date.now()
              ).toLocaleString()}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
