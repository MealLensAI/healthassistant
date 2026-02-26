"""
MySQL-backed database service for all table/data operations.
"""
import os
import json
import uuid
from datetime import datetime
from werkzeug.datastructures import FileStorage
from typing import Any, Optional

from services.mysql_client import get_connection


def _serialize_json(val: Any) -> Any:
    """Ensure value is JSON-serializable for MySQL JSON columns."""
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val) if not isinstance(val, str) else val
    return val


def _parse_json(val: Any) -> Any:
    """Parse JSON from DB (MySQL may return str or dict)."""
    if val is None:
        return None
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val
    return val


def _row_to_dict(row: dict) -> dict:
    """Convert row with datetime/JSON to JSON-friendly dict."""
    if not row:
        return row
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat() + "Z" if v else None
        elif isinstance(v, (bytes, bytearray)):
            out[k] = v.decode("utf-8", errors="replace")
        else:
            out[k] = v
    return out


class DatabaseService:
    """
    MySQL-backed service for all table/data operations.
    Use for all table operations.
    """

    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = upload_dir or os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self._base_url = os.environ.get("UPLOAD_BASE_URL", "").rstrip("/")

    # ---- Table helpers for enterprise and generic use ----
    def table_select(
        self,
        table: str,
        columns: str = "*",
        where: Optional[dict] = None,
        order_by: Optional[str] = None,
        desc: bool = True,
        limit: Optional[int] = None,
    ) -> list:
        """Select rows. where is dict of column -> value (AND). Returns list of dicts."""
        with get_connection() as conn:
            with conn.cursor() as cur:
                cols = columns if columns != "*" else "*"
                sql = f"SELECT {cols} FROM `{table}`"
                params = []
                if where:
                    parts = [f"`{k}` = %s" for k in where]
                    sql += " WHERE " + " AND ".join(parts)
                    params.extend(where.values())
                if order_by:
                    sql += f" ORDER BY `{order_by}` {'DESC' if desc else 'ASC'}"
                if limit is not None:
                    sql += " LIMIT %s"
                    params.append(limit)
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [_row_to_dict(r) for r in rows]

    def table_select_one(
        self,
        table: str,
        columns: str = "*",
        where: Optional[dict] = None,
    ) -> Optional[dict]:
        rows = self.table_select(table, columns=columns, where=where, limit=1)
        return rows[0] if rows else None

    def table_select_in(
        self,
        table: str,
        column: str,
        values: list,
        columns: str = "*",
        where: Optional[dict] = None,
        order_by: Optional[str] = None,
        desc: bool = True,
        limit: Optional[int] = None,
    ) -> list:
        """Select where column IN (values)."""
        if not values:
            return []
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"SELECT {columns} FROM `{table}` WHERE `{column}` IN (%s)" % (",".join(["%s"] * len(values)))
                params = list(values)
                if where:
                    for k, v in where.items():
                        sql += f" AND `{k}` = %s"
                        params.append(v)
                if order_by:
                    sql += f" ORDER BY `{order_by}` {'DESC' if desc else 'ASC'}"
                if limit is not None:
                    sql += " LIMIT %s"
                    params.append(limit)
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [_row_to_dict(r) for r in rows]

    def table_insert(self, table: str, data: dict) -> list:
        """Insert one row. data can include JSON dicts. Returns list with inserted row (with id if generated)."""
        with get_connection() as conn:
            with conn.cursor() as cur:
                cols = list(data.keys())
                placeholders = ", ".join(["%s"] * len(cols))
                col_list = ", ".join(f"`{c}`" for c in cols)
                sql = f"INSERT INTO `{table}` ({col_list}) VALUES ({placeholders})"
                vals = []
                for c in cols:
                    v = data[c]
                    if isinstance(v, (dict, list)):
                        v = json.dumps(v)
                    vals.append(v)
                cur.execute(sql, vals)
                if "id" not in data and table not in ("feedback", "ai_sessions", "detection_history", "meal_plan_management", "user_sessions", "user_settings", "user_settings_history", "enterprises", "organization_users", "invitations", "user_trials", "payment_transactions", "user_subscriptions", "feature_usage", "shared_recipes"):
                    pass  # no auto id
                conn.commit()
                # Try to return inserted row by primary key if we have one
                pk = data.get("id") or data.get("session_id")
                if pk:
                    cur.execute(f"SELECT * FROM `{table}` WHERE `id` = %s" if "id" in data else f"SELECT * FROM `{table}` WHERE `session_id` = %s", (pk,))
                    row = cur.fetchone()
                    return [_row_to_dict(row)] if row else []
                return []

    def table_update(self, table: str, data: dict, where: dict) -> int:
        """Update rows. Returns affected row count."""
        with get_connection() as conn:
            with conn.cursor() as cur:
                set_parts = [f"`{k}` = %s" for k in data]
                where_parts = [f"`{k}` = %s" for k in where]
                sql = f"UPDATE `{table}` SET {', '.join(set_parts)} WHERE {' AND '.join(where_parts)}"
                vals = []
                for c in data:
                    v = data[c]
                    if isinstance(v, (dict, list)):
                        v = json.dumps(v)
                    vals.append(v)
                vals.extend(where.values())
                cur.execute(sql, vals)
                return cur.rowcount

    def table_delete(self, table: str, where: dict) -> int:
        """Delete rows. Returns affected row count."""
        with get_connection() as conn:
            with conn.cursor() as cur:
                where_parts = [f"`{k}` = %s" for k in where]
                sql = f"DELETE FROM `{table}` WHERE {' AND '.join(where_parts)}"
                cur.execute(sql, list(where.values()))
                return cur.rowcount

    # ---- File upload (local storage) ----
    def upload_file(self, file: FileStorage, bucket_name: str, file_path: str) -> tuple[Optional[str], Optional[str]]:
        """Save file to local uploads dir. Returns (public_url, None) or (None, error_message)."""
        try:
            safe_path = os.path.normpath(file_path).lstrip("/")
            full_path = os.path.join(self.upload_dir, bucket_name, safe_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            file.save(full_path)
            if self._base_url:
                url = f"{self._base_url}/{bucket_name}/{safe_path}"
            else:
                url = f"/uploads/{bucket_name}/{safe_path}"
            return url, None
        except Exception as e:
            return None, str(e)

    # ---- Feedback ----
    def save_feedback(self, user_id: Optional[str], feedback_text: str) -> tuple[bool, Optional[str]]:
        try:
            self.table_insert("feedback", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "feedback_text": feedback_text,
                "created_at": datetime.utcnow(),
            })
            return True, None
        except Exception as e:
            return False, str(e)

    # ---- AI sessions ----
    def insert_ai_session(self, user_id: str, session_data: dict) -> dict:
        try:
            row = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "prompt": session_data.get("prompt"),
                "response": session_data.get("response"),
                "timestamp": session_data.get("timestamp"),
                "metadata": session_data.get("metadata"),
                "created_at": datetime.utcnow(),
            }
            self.table_insert("ai_sessions", row)
            return {**row, "created_at": row["created_at"].isoformat() + "Z" if hasattr(row["created_at"], "isoformat") else row["created_at"]}
        except Exception as e:
            raise Exception(f"Error storing AI session data: {str(e)}")

    # ---- Detection history ----
    def save_detection_history(
        self,
        user_id: str,
        recipe_type: str,
        suggestion: Optional[str] = None,
        instructions: Optional[str] = None,
        ingredients: Optional[str] = None,
        detected_foods: Optional[str] = None,
        analysis_id: Optional[str] = None,
        youtube_url: Optional[str] = None,
        google_url: Optional[str] = None,
        resources_json: Optional[str] = None,
        **kwargs,
    ) -> tuple[bool, Optional[str]]:
        youtube_url = youtube_url or kwargs.get("youtube")
        google_url = google_url or kwargs.get("google")
        resources_json = resources_json or kwargs.get("resources")
        try:
            data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "recipe_type": recipe_type,
                "suggestion": suggestion,
                "instructions": instructions,
                "ingredients": ingredients,
                "detected_foods": detected_foods,
                "analysis_id": analysis_id,
                "youtube": youtube_url,
                "google": google_url,
                "resources": resources_json,
                "created_at": datetime.utcnow(),
            }
            data = {k: v for k, v in data.items() if v is not None}
            self.table_insert("detection_history", data)
            return True, None
        except Exception as e:
            return False, str(e)

    def update_detection_history(self, analysis_id: str, user_id: str, updates: dict) -> tuple[bool, Optional[str]]:
        column_mapping = {"youtube_link": "youtube", "google_link": "google", "resources_link": "resources"}
        mapped = {}
        for k, v in updates.items():
            col = column_mapping.get(k, k)
            if v and (not isinstance(v, str) or (v.strip() and v != "{}")):
                mapped[col] = v
        if not mapped:
            return False, "No valid updates provided"
        try:
            n = self.table_update("detection_history", mapped, {"analysis_id": analysis_id, "user_id": user_id})
            return (True, None) if n else (False, "No record found or update had no effect")
        except Exception as e:
            return False, str(e)

    def get_detection_history(self, user_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            rows = self.table_select("detection_history", where={"user_id": user_id}, order_by="created_at", desc=True)
            return rows, None
        except Exception as e:
            return None, str(e)

    def delete_detection_history(self, user_id: str, record_id: str) -> tuple[bool, Optional[str]]:
        try:
            n = self.table_delete("detection_history", {"id": record_id, "user_id": user_id})
            return n > 0, None if n > 0 else "Record not found or not authorized"
        except Exception as e:
            return False, str(e)

    # ---- Meal plans ----
    def normalize_meal_plan_entry(self, raw_plan: dict, user_id: Optional[str] = None) -> dict:
        meal_plan_obj = raw_plan.get("meal_plan") or raw_plan
        if isinstance(meal_plan_obj, str):
            try:
                meal_plan_obj = json.loads(meal_plan_obj)
            except Exception:
                meal_plan_obj = {}
        if isinstance(meal_plan_obj, dict) and "plan_data" in meal_plan_obj:
            meal_plan_obj = meal_plan_obj["plan_data"]
        name = raw_plan.get("name") or (meal_plan_obj.get("name") if isinstance(meal_plan_obj, dict) else None)
        start_date = raw_plan.get("start_date") or raw_plan.get("startDate") or (meal_plan_obj.get("startDate") if isinstance(meal_plan_obj, dict) else None)
        end_date = raw_plan.get("end_date") or raw_plan.get("endDate") or (meal_plan_obj.get("endDate") if isinstance(meal_plan_obj, dict) else None)
        meal_plan = raw_plan.get("mealPlan") or (meal_plan_obj.get("mealPlan") if isinstance(meal_plan_obj, dict) else meal_plan_obj)
        uid = user_id or raw_plan.get("user_id")
        plan_id = raw_plan.get("id") or str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        return {
            "id": plan_id,
            "user_id": uid,
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "meal_plan": meal_plan,
            "created_at": raw_plan.get("created_at", now),
            "updated_at": raw_plan.get("updated_at", now),
        }

    def save_meal_plan(self, user_id: str, plan_data: dict) -> Any:
        try:
            name = plan_data.get("name")
            start_date = plan_data.get("startDate") or plan_data.get("start_date")
            end_date = plan_data.get("endDate") or plan_data.get("end_date")
            meal_plan = plan_data.get("mealPlan") or plan_data.get("meal_plan")
            has_sickness = plan_data.get("has_sickness", False)
            sickness_type = plan_data.get("sickness_type", "") or ""
            health_assessment = plan_data.get("health_assessment") or plan_data.get("healthAssessment")
            creator_email = None
            profile = self.table_select_one("profiles", columns="email", where={"id": user_id})
            if profile:
                creator_email = profile.get("email")
            user_info = plan_data.get("user_info") or {}
            if isinstance(user_info, dict) and creator_email:
                user_info = {**user_info, "creator_email": creator_email, "is_created_by_user": True}
            elif creator_email:
                user_info = {"creator_email": creator_email, "is_created_by_user": True}
            now = datetime.utcnow()
            row = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": name,
                "start_date": start_date,
                "end_date": end_date,
                "meal_plan": meal_plan,
                "has_sickness": bool(has_sickness),
                "sickness_type": sickness_type,
                "is_approved": 1,
                "user_info": user_info,
                "created_at": now,
                "updated_at": now,
            }
            if health_assessment is not None:
                row["health_assessment"] = health_assessment
            self.table_insert("meal_plan_management", row)
            out = {
                "id": row["id"],
                "name": row["name"],
                "startDate": row["start_date"],
                "endDate": row["end_date"],
                "mealPlan": row["meal_plan"],
                "createdAt": row["created_at"].isoformat() + "Z",
                "updatedAt": row["updated_at"].isoformat() + "Z",
                "hasSickness": row["has_sickness"],
                "sicknessType": row["sickness_type"],
            }
            if health_assessment is not None:
                out["healthAssessment"] = health_assessment
            return out
        except Exception as e:
            return None, str(e)

    def get_meal_plans(self, user_id: str) -> tuple[Optional[list], Optional[str]]:
        """Return meal plans for user where is_approved=1 or is_approved IS NULL (treat NULL as approved)."""
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    sql = (
                        "SELECT * FROM `meal_plan_management` "
                        "WHERE `user_id` = %s AND (`is_approved` = 1 OR `is_approved` IS NULL) "
                        "ORDER BY `updated_at` DESC"
                    )
                    cur.execute(sql, (user_id,))
                    rows = cur.fetchall()
            return [_row_to_dict(r) for r in rows], None
        except Exception as e:
            return None, str(e)

    def save_session(self, user_id: str, session_id: str, session_data: dict, created_at: str) -> tuple[bool, Optional[str]]:
        try:
            payload = {
                "id": session_id,
                "user_id": user_id,
                "login_at": created_at,
                "device_info": json.dumps(session_data) if session_data else None,
                "created_at": datetime.utcnow(),
            }
            self.table_insert("user_sessions", payload)
            return True, None
        except Exception as e:
            return False, str(e)

    def get_session(self, user_id: str, session_id: str) -> tuple[Optional[dict], Optional[str]]:
        try:
            row = self.table_select_one("user_sessions", where={"id": session_id, "user_id": user_id})
            if not row:
                return None, "Session not found"
            data = row.get("device_info")
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    pass
            return data, None
        except Exception as e:
            return None, str(e)

    def update_session(self, user_id: str, session_id: str, session_data: dict) -> tuple[bool, Optional[str]]:
        try:
            n = self.table_update(
                "user_sessions",
                {"device_info": json.dumps(session_data), "updated_at": datetime.utcnow()},
                {"id": session_id, "user_id": user_id},
            )
            return n > 0, None if n > 0 else "Failed to update session"
        except Exception as e:
            return False, str(e)

    def list_user_sessions(self, user_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            rows = self.table_select("user_sessions", where={"user_id": user_id}, order_by="login_at", desc=True)
            out = []
            for r in rows:
                d = r.get("device_info")
                if isinstance(d, str):
                    try:
                        d = json.loads(d)
                    except Exception:
                        pass
                out.append({"id": r.get("id"), "user_id": r.get("user_id"), "login_at": r.get("login_at"), "data": d})
            return out, None
        except Exception as e:
            return None, str(e)

    def save_shared_recipe(
        self,
        user_id: Optional[str],
        recipe_type: str,
        suggestion: Optional[str],
        instructions: Optional[str],
        ingredients: Optional[str],
        detected_foods: Optional[str],
        analysis_id: Optional[str],
        youtube: Optional[str],
        google: Optional[str],
        resources: Optional[str],
    ) -> tuple[bool, Optional[str]]:
        try:
            self.table_insert("shared_recipes", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "recipe_type": recipe_type,
                "suggestion": suggestion,
                "instructions": instructions,
                "ingredients": ingredients,
                "detected_foods": detected_foods,
                "analysis_id": analysis_id,
                "youtube": youtube,
                "google": google,
                "resources": resources,
                "created_at": datetime.utcnow(),
            })
            return True, None
        except Exception as e:
            return False, str(e)

    def update_meal_plan(self, user_id: str, plan_id: str, plan_data: dict) -> tuple[bool, Optional[str]]:
        try:
            updates = {"updated_at": datetime.utcnow()}
            if "name" in plan_data:
                updates["name"] = plan_data["name"]
            if "start_date" in plan_data or "startDate" in plan_data:
                updates["start_date"] = plan_data.get("start_date") or plan_data.get("startDate")
            if "end_date" in plan_data or "endDate" in plan_data:
                updates["end_date"] = plan_data.get("end_date") or plan_data.get("endDate")
            if "mealPlan" in plan_data or "meal_plan" in plan_data:
                updates["meal_plan"] = plan_data.get("mealPlan") or plan_data.get("meal_plan")
            n = self.table_update("meal_plan_management", updates, {"id": plan_id, "user_id": user_id})
            return n > 0, None if n > 0 else "Failed to update meal plan"
        except Exception as e:
            return False, str(e)

    def delete_meal_plan(self, user_id: str, plan_id: str) -> tuple[bool, Optional[str]]:
        try:
            n = self.table_delete("meal_plan_management", {"id": plan_id, "user_id": user_id})
            return n > 0, None if n > 0 else "Meal plan not found or not authorized"
        except Exception as e:
            return False, str(e)

    def clear_meal_plans(self, user_id: str) -> tuple[bool, Optional[str]]:
        try:
            self.table_delete("meal_plan_management", {"user_id": user_id})
            return True, None
        except Exception as e:
            return False, str(e)

    # ---- User settings ----
    def save_user_settings(self, user_id: str, settings_type: str, settings_data: dict) -> tuple[bool, Optional[str]]:
        try:
            existing = self.table_select_one("user_settings", where={"user_id": user_id, "settings_type": settings_type})
            existing_settings = {}
            if existing and existing.get("settings_data"):
                raw = existing["settings_data"]
                existing_settings = _parse_json(raw) if isinstance(raw, str) else (raw or {})
            normalized = json.loads(json.dumps(settings_data)) if isinstance(settings_data, dict) else settings_data
            expected_fields = ["hasSickness", "sicknessType", "age", "gender", "height", "weight", "waist", "activityLevel", "goal", "location"]
            changed_fields = []
            if isinstance(existing_settings, dict) and isinstance(normalized, dict):
                all_keys = set(list(existing_settings.keys()) + list(normalized.keys()))
                for key in all_keys:
                    if isinstance(key, str) and (key in expected_fields or not key.isdigit()):
                        ov = existing_settings.get(key)
                        nv = normalized.get(key)
                        if json.dumps(ov, sort_keys=True) != json.dumps(nv, sort_keys=True):
                            changed_fields.append(key)
            if not changed_fields and isinstance(normalized, dict):
                changed_fields = [k for k, v in normalized.items() if isinstance(k, str) and k in expected_fields and v is not None and v != ""]
            timestamp = datetime.utcnow()
            if existing:
                self.table_update(
                    "user_settings",
                    {"settings_data": normalized, "updated_at": timestamp},
                    {"user_id": user_id, "settings_type": settings_type},
                )
            else:
                self.table_insert("user_settings", {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "settings_type": settings_type,
                    "settings_data": normalized,
                    "created_at": timestamp,
                    "updated_at": timestamp,
                })
            # History
            self.table_insert("user_settings_history", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "settings_type": settings_type,
                "settings_data": normalized,
                "previous_settings_data": existing_settings,
                "changed_fields": json.dumps(changed_fields) if changed_fields else None,
                "created_at": timestamp,
                "created_by": user_id,
            })
            return True, None
        except Exception as e:
            return False, str(e)

    def get_user_settings(self, user_id: str, settings_type: str = "health_profile") -> tuple[Optional[dict], Optional[str]]:
        try:
            row = self.table_select_one("user_settings", where={"user_id": user_id, "settings_type": settings_type})
            if not row:
                return None, None
            return row, None
        except Exception as e:
            return None, str(e)

    def delete_user_settings(self, user_id: str, settings_type: str) -> tuple[bool, Optional[str]]:
        try:
            n = self.table_delete("user_settings", {"user_id": user_id, "settings_type": settings_type})
            return n > 0, None if n > 0 else "Failed to delete settings"
        except Exception as e:
            return False, str(e)

    def delete_settings_history(self, user_id: str, record_id: str) -> tuple[bool, Optional[str]]:
        try:
            n = self.table_delete("user_settings_history", {"id": record_id, "user_id": user_id})
            return n > 0, None if n > 0 else "Record not found or not authorized"
        except Exception as e:
            return False, str(e)

    # ---- Meal Tracking ----
    def mark_meal_cooked(self, user_id: str, meal_plan_id: str, day: str, meal_type: str) -> tuple[Optional[dict], Optional[str]]:
        """Mark a meal as cooked. Creates or updates the tracking record."""
        try:
            now = datetime.utcnow()
            existing = self.table_select_one(
                "meal_tracking",
                where={"user_id": user_id, "meal_plan_id": meal_plan_id, "day": day, "meal_type": meal_type}
            )
            
            if existing:
                self.table_update(
                    "meal_tracking",
                    {"cooked_at": now, "updated_at": now},
                    {"id": existing["id"]}
                )
                result = {**existing, "cooked_at": now.isoformat() + "Z", "updated_at": now.isoformat() + "Z"}
            else:
                record_id = str(uuid.uuid4())
                self.table_insert("meal_tracking", {
                    "id": record_id,
                    "user_id": user_id,
                    "meal_plan_id": meal_plan_id,
                    "day": day,
                    "meal_type": meal_type,
                    "cooked_at": now,
                    "created_at": now,
                    "updated_at": now,
                })
                result = {
                    "id": record_id,
                    "user_id": user_id,
                    "meal_plan_id": meal_plan_id,
                    "day": day,
                    "meal_type": meal_type,
                    "cooked_at": now.isoformat() + "Z",
                    "created_at": now.isoformat() + "Z",
                    "updated_at": now.isoformat() + "Z",
                }
            return result, None
        except Exception as e:
            return None, str(e)

    def unmark_meal_cooked(self, user_id: str, meal_plan_id: str, day: str, meal_type: str) -> tuple[Optional[dict], Optional[str]]:
        """Remove the cooked status from a meal."""
        try:
            existing = self.table_select_one(
                "meal_tracking",
                where={"user_id": user_id, "meal_plan_id": meal_plan_id, "day": day, "meal_type": meal_type}
            )
            
            if existing:
                now = datetime.utcnow()
                self.table_update(
                    "meal_tracking",
                    {"cooked_at": None, "updated_at": now},
                    {"id": existing["id"]}
                )
                result = {**existing, "cooked_at": None, "updated_at": now.isoformat() + "Z"}
                return result, None
            return {"message": "No tracking record found"}, None
        except Exception as e:
            return None, str(e)

    def get_meal_tracking(self, user_id: str, meal_plan_id: str) -> tuple[Optional[dict], Optional[str]]:
        """Get all tracking records for a meal plan, organized by day and meal_type."""
        try:
            rows = self.table_select(
                "meal_tracking",
                where={"user_id": user_id, "meal_plan_id": meal_plan_id}
            )
            
            tracking = {}
            for row in rows:
                day = row.get("day")
                meal_type = row.get("meal_type")
                if day not in tracking:
                    tracking[day] = {}
                tracking[day][meal_type] = {
                    "id": row.get("id"),
                    "cooked_at": row.get("cooked_at"),
                    "eaten_at": row.get("eaten_at"),
                    "reminder_sent_at": row.get("reminder_sent_at"),
                }
            return tracking, None
        except Exception as e:
            return None, str(e)

    def get_week_progress(self, user_id: str, meal_plan_id: str) -> tuple[Optional[dict], Optional[str]]:
        """Calculate weekly progress for a meal plan."""
        try:
            meal_plans, error = self.get_meal_plans(user_id)
            if error:
                return None, error
            
            plan = next((p for p in (meal_plans or []) if str(p.get("id")) == str(meal_plan_id)), None)
            if not plan:
                return None, "Meal plan not found"
            
            meal_plan_data = plan.get("meal_plan")
            if isinstance(meal_plan_data, str):
                try:
                    meal_plan_data = json.loads(meal_plan_data)
                except Exception:
                    meal_plan_data = []
            
            if isinstance(meal_plan_data, dict) and "mealPlan" in meal_plan_data:
                meal_plan_data = meal_plan_data["mealPlan"]
            
            total_meals = 0
            if isinstance(meal_plan_data, list):
                for day_plan in meal_plan_data:
                    for meal_type in ["breakfast", "lunch", "dinner", "snack"]:
                        if day_plan.get(meal_type):
                            total_meals += 1
            
            tracking_rows = self.table_select(
                "meal_tracking",
                where={"user_id": user_id, "meal_plan_id": meal_plan_id}
            )
            cooked_meals = sum(1 for row in tracking_rows if row.get("cooked_at"))
            
            progress_percentage = (cooked_meals / total_meals * 100) if total_meals > 0 else 0
            is_complete = cooked_meals >= total_meals and total_meals > 0
            
            return {
                "total_meals": total_meals,
                "cooked_meals": cooked_meals,
                "progress_percentage": round(progress_percentage, 1),
                "is_complete": is_complete,
            }, None
        except Exception as e:
            return None, str(e)

    def get_meal_reminder_settings(self, user_id: str) -> tuple[Optional[dict], Optional[str]]:
        """Get meal reminder settings for a user."""
        try:
            row = self.table_select_one("meal_reminder_settings", where={"user_id": user_id})
            if not row:
                return {
                    "reminders_enabled": True,
                    "breakfast_reminder_time": "08:00:00",
                    "lunch_reminder_time": "12:00:00",
                    "dinner_reminder_time": "18:00:00",
                    "followup_delay_hours": 2,
                    "timezone": "UTC",
                }, None
            return row, None
        except Exception as e:
            return None, str(e)

    def update_meal_reminder_settings(self, user_id: str, settings: dict) -> tuple[Optional[dict], Optional[str]]:
        """Update meal reminder settings for a user."""
        try:
            existing = self.table_select_one("meal_reminder_settings", where={"user_id": user_id})
            now = datetime.utcnow()
            
            update_data = {}
            if "reminders_enabled" in settings:
                update_data["reminders_enabled"] = bool(settings["reminders_enabled"])
            if "breakfast_reminder_time" in settings:
                update_data["breakfast_reminder_time"] = settings["breakfast_reminder_time"]
            if "lunch_reminder_time" in settings:
                update_data["lunch_reminder_time"] = settings["lunch_reminder_time"]
            if "dinner_reminder_time" in settings:
                update_data["dinner_reminder_time"] = settings["dinner_reminder_time"]
            if "followup_delay_hours" in settings:
                update_data["followup_delay_hours"] = int(settings["followup_delay_hours"])
            if "timezone" in settings:
                update_data["timezone"] = settings["timezone"]
            
            if existing:
                update_data["updated_at"] = now
                self.table_update("meal_reminder_settings", update_data, {"user_id": user_id})
                result = {**existing, **update_data}
            else:
                record_id = str(uuid.uuid4())
                insert_data = {
                    "id": record_id,
                    "user_id": user_id,
                    "reminders_enabled": update_data.get("reminders_enabled", True),
                    "breakfast_reminder_time": update_data.get("breakfast_reminder_time", "08:00:00"),
                    "lunch_reminder_time": update_data.get("lunch_reminder_time", "12:00:00"),
                    "dinner_reminder_time": update_data.get("dinner_reminder_time", "18:00:00"),
                    "followup_delay_hours": update_data.get("followup_delay_hours", 2),
                    "timezone": update_data.get("timezone", "UTC"),
                    "created_at": now,
                    "updated_at": now,
                }
                self.table_insert("meal_reminder_settings", insert_data)
                result = insert_data
            
            return result, None
        except Exception as e:
            return None, str(e)

    def get_users_with_active_meal_plans(self) -> tuple[Optional[list], Optional[str]]:
        """Get all users who have active meal plans (within date range)."""
        try:
            today = datetime.utcnow().date().isoformat()
            with get_connection() as conn:
                with conn.cursor() as cur:
                    sql = """
                        SELECT DISTINCT mp.user_id, au.email, au.full_name, mp.id as meal_plan_id, 
                               mp.name as plan_name, mp.meal_plan, mp.start_date, mp.end_date
                        FROM meal_plan_management mp
                        JOIN auth_users au ON mp.user_id = au.id
                        LEFT JOIN meal_reminder_settings mrs ON mp.user_id = mrs.user_id
                        WHERE (mp.start_date <= %s AND mp.end_date >= %s)
                          AND (mp.is_approved = 1 OR mp.is_approved IS NULL)
                          AND (mrs.reminders_enabled = 1 OR mrs.reminders_enabled IS NULL)
                        ORDER BY mp.user_id, mp.start_date
                    """
                    cur.execute(sql, (today, today))
                    rows = cur.fetchall()
            return [_row_to_dict(r) for r in rows], None
        except Exception as e:
            return None, str(e)

    def get_uncooked_meals_for_today(self, user_id: str, meal_plan_id: str, day_name: str) -> tuple[Optional[list], Optional[str]]:
        """Get meals that haven't been marked as cooked for a specific day."""
        try:
            meal_plans, error = self.get_meal_plans(user_id)
            if error:
                return None, error
            
            plan = next((p for p in (meal_plans or []) if str(p.get("id")) == str(meal_plan_id)), None)
            if not plan:
                return None, "Meal plan not found"
            
            meal_plan_data = plan.get("meal_plan")
            if isinstance(meal_plan_data, str):
                try:
                    meal_plan_data = json.loads(meal_plan_data)
                except Exception:
                    meal_plan_data = []
            
            if isinstance(meal_plan_data, dict) and "mealPlan" in meal_plan_data:
                meal_plan_data = meal_plan_data["mealPlan"]
            
            day_plan = next((d for d in (meal_plan_data or []) if d.get("day") == day_name), None)
            if not day_plan:
                return [], None
            
            tracking, _ = self.get_meal_tracking(user_id, meal_plan_id)
            day_tracking = tracking.get(day_name, {}) if tracking else {}
            
            uncooked = []
            for meal_type in ["breakfast", "lunch", "dinner", "snack"]:
                meal_name = day_plan.get(meal_type) or day_plan.get(f"{meal_type}_name")
                if meal_name:
                    meal_tracking = day_tracking.get(meal_type, {})
                    if not meal_tracking.get("cooked_at"):
                        uncooked.append({
                            "meal_type": meal_type,
                            "meal_name": meal_name,
                            "calories": day_plan.get(f"{meal_type}_calories"),
                        })
            
            return uncooked, None
        except Exception as e:
            return None, str(e)

    def get_meal_details(self, user_id: str, meal_plan_id: str, day: str, meal_type: str) -> Optional[dict]:
        """Get details for a specific meal."""
        try:
            meal_plans, error = self.get_meal_plans(user_id)
            if error:
                return None
            
            plan = next((p for p in (meal_plans or []) if str(p.get("id")) == str(meal_plan_id)), None)
            if not plan:
                return None
            
            meal_plan_data = plan.get("meal_plan")
            if isinstance(meal_plan_data, str):
                try:
                    meal_plan_data = json.loads(meal_plan_data)
                except Exception:
                    meal_plan_data = []
            
            if isinstance(meal_plan_data, dict) and "mealPlan" in meal_plan_data:
                meal_plan_data = meal_plan_data["mealPlan"]
            
            # Case insensitive day matching
            day_plan = next((d for d in (meal_plan_data or []) if d.get("day", "").lower() == day.lower()), None)
            if not day_plan:
                return None
            
            meal_name = day_plan.get(meal_type) or day_plan.get(f"{meal_type}_name")
            if not meal_name:
                return None
                
            return {
                "meal_name": meal_name,
                "calories": day_plan.get(f"{meal_type}_calories"),
                # Add other fields if needed
            }
        except Exception as e:
            print(f"Error getting meal details: {e}")
            return None

    def mark_reminder_sent(self, user_id: str, meal_plan_id: str, day: str, meal_type: str) -> tuple[bool, Optional[str]]:
        """Mark that a reminder was sent for a specific meal."""
        try:
            now = datetime.utcnow()
            existing = self.table_select_one(
                "meal_tracking",
                where={"user_id": user_id, "meal_plan_id": meal_plan_id, "day": day, "meal_type": meal_type}
            )
            
            if existing:
                self.table_update(
                    "meal_tracking",
                    {"reminder_sent_at": now, "updated_at": now},
                    {"id": existing["id"]}
                )
            else:
                self.table_insert("meal_tracking", {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "meal_plan_id": meal_plan_id,
                    "day": day,
                    "meal_type": meal_type,
                    "reminder_sent_at": now,
                    "created_at": now,
                    "updated_at": now,
                })
            return True, None
        except Exception as e:
            return False, str(e)
