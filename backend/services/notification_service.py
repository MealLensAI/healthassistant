"""
Notification service for in-app user notifications.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any


class NotificationService:
    SETTINGS_TYPE = "in_app_notifications"
    MAX_ITEMS = 60

    @staticmethod
    def _normalize_payload(settings_record: dict | None) -> dict[str, Any]:
        raw_settings = settings_record.get("settings_data", {}) if settings_record else {}
        if isinstance(raw_settings, str):
            try:
                raw_settings = json.loads(raw_settings)
            except (json.JSONDecodeError, ValueError, TypeError):
                raw_settings = {}

        if isinstance(raw_settings, list):
            items = raw_settings
        else:
            items = raw_settings.get("items", []) if isinstance(raw_settings, dict) else []

        normalized_items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            normalized_items.append(
                {
                    "id": item.get("id"),
                    "type": item.get("type", "system"),
                    "title": item.get("title", "Notification"),
                    "message": item.get("message", ""),
                    "created_at": item.get("created_at"),
                    "read": bool(item.get("read", False)),
                }
            )

        unread_count = sum(1 for item in normalized_items if not item.get("read"))
        return {"items": normalized_items, "unread_count": unread_count}

    def get_notifications(self, supabase_service, user_id: str) -> tuple[dict | None, str | None]:
        settings_data, error = supabase_service.get_user_settings(user_id, self.SETTINGS_TYPE)
        if error:
            return None, error
        return self._normalize_payload(settings_data), None

    def append_notification(
        self,
        supabase_service,
        user_id: str,
        *,
        title: str,
        message: str,
        notification_type: str = "system",
    ) -> tuple[bool, str | None]:
        current, error = self.get_notifications(supabase_service, user_id)
        if error:
            return False, error

        current_items = current.get("items", []) if current else []
        new_item = {
            "id": str(uuid.uuid4()),
            "type": notification_type,
            "title": title,
            "message": message,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "read": False,
        }
        next_items = [new_item, *current_items][: self.MAX_ITEMS]
        payload = {
            "items": next_items,
            "unread_count": sum(1 for item in next_items if not item.get("read", False)),
        }
        return supabase_service.save_user_settings(user_id, self.SETTINGS_TYPE, payload)

    def mark_all_read(self, supabase_service, user_id: str) -> tuple[bool, str | None]:
        current, error = self.get_notifications(supabase_service, user_id)
        if error:
            return False, error

        marked_items = []
        for item in (current or {}).get("items", []):
            updated = dict(item)
            updated["read"] = True
            marked_items.append(updated)

        payload = {"items": marked_items, "unread_count": 0}
        return supabase_service.save_user_settings(user_id, self.SETTINGS_TYPE, payload)


notification_service = NotificationService()
