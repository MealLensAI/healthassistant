import { safeGetItem, safeSetItem } from "@/lib/utils";

export type AppNotificationLevel = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  level: AppNotificationLevel;
  createdAt: string;
  source: "local" | "server";
}

const STORAGE_KEY = "meallensai_app_notifications";
const EVENT_NAME = "meallensai-notifications-updated";
const MAX_NOTIFICATIONS = 60;

const readFromStorage = (): AppNotification[] => {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeToStorage = (notifications: AppNotification[]) => {
  safeSetItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
};

const emitNotificationsUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getLocalNotifications = (): AppNotification[] => {
  return readFromStorage();
};

export const addLocalNotification = (
  notification: Omit<AppNotification, "id" | "createdAt" | "source"> & { id?: string }
) => {
  const current = readFromStorage();
  const next: AppNotification = {
    id: notification.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: notification.title,
    message: notification.message,
    level: notification.level,
    createdAt: new Date().toISOString(),
    source: "local",
  };

  // Keep IDs unique to avoid duplicate cards.
  const deduped = current.filter((item) => item.id !== next.id);
  writeToStorage([next, ...deduped]);
  emitNotificationsUpdated();
};

export const notificationsEventName = EVENT_NAME;
