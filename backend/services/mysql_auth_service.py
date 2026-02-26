"""
MySQL-backed authentication. Replaces Supabase Auth.
Handles: register, login, JWT issue/verify, get_user_by_id, get_user_by_email,
list_users, create_user (admin), delete_user, update_user_by_id.
"""
import os
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple, Any

import jwt
import bcrypt
from flask import current_app

from services.mysql_client import get_connection


# Default JWT expiry (7 days)
JWT_EXPIRY_DAYS = 7
JWT_ALGORITHM = "HS256"


def _get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise ValueError("JWT_SECRET environment variable is required for auth")
    return secret


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def _row_to_dict(row: dict) -> dict:
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


def _parse_json(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return val
    return val


def create_access_token(user_id: str, email: str, metadata: Optional[dict] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.utcnow(),
    }
    if metadata:
        payload["user_metadata"] = metadata
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> Optional[str]:
    """Decode JWT and return user_id (sub) or None if invalid."""
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None


def register_user(
    email: str,
    password: str,
    first_name: str = "",
    last_name: str = "",
    signup_type: str = "individual",
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create auth_users + profiles row. Returns (user_id, None) or (None, error_message).
    """
    email = str(email or "").strip().lower()
    if not email or "@" not in email:
        return None, "Invalid email"
    if not password or len(password) < 6:
        return None, "Password must be at least 6 characters"
    user_id = str(uuid.uuid4())
    full_name = f"{first_name} {last_name}".strip() or None
    user_metadata = {
        "first_name": first_name,
        "last_name": last_name,
        "signup_type": signup_type,
        "full_name": full_name,
    }
    password_hash = _hash_password(password)
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM auth_users WHERE email = %s",
                (email,),
            )
            if cur.fetchone():
                return None, "An account with this email already exists"
            cur.execute(
                """INSERT INTO auth_users (id, email, password_hash, full_name, user_metadata, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, email, password_hash, full_name, __import__("json").dumps(user_metadata), now, now),
            )
            cur.execute(
                """INSERT INTO profiles (id, email, full_name, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_id, email, full_name, now, now),
            )
    return user_id, None


def login_user(email: str, password: str) -> Tuple[Optional[str], Optional[str], Optional[dict]]:
    """
    Verify password and return (user_id, access_token, user_dict) or (None, None, error_dict).
    """
    email = str(email or "").strip().lower()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, full_name, user_metadata FROM auth_users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
    if not row:
        return None, None, {"message": "No account with this email"}
    user_id = row["id"]
    if not _verify_password(password, row["password_hash"]):
        return None, None, {"message": "Incorrect password"}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE auth_users SET last_sign_in_at = %s, updated_at = %s WHERE id = %s",
                (datetime.utcnow(), datetime.utcnow(), user_id),
            )
    metadata = _parse_json(row.get("user_metadata"))
    access_token = create_access_token(user_id, row["email"], metadata)
    user_dict = {
        "id": user_id,
        "email": row["email"],
        "user_metadata": metadata or {},
        "full_name": row.get("full_name"),
    }
    return user_id, access_token, user_dict


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Return auth user dict (id, email, user_metadata, ...) or None."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, full_name, user_metadata, created_at, updated_at, last_sign_in_at FROM auth_users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    d = _row_to_dict(dict(row))
    if d.get("user_metadata") and isinstance(d["user_metadata"], str):
        try:
            d["user_metadata"] = __import__("json").loads(d["user_metadata"])
        except Exception:
            pass
    return d


def get_user_by_email(email: str) -> Optional[dict]:
    email = str(email or "").strip().lower()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, full_name, user_metadata, created_at FROM auth_users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
    if not row:
        return None
    d = _row_to_dict(dict(row))
    if d.get("user_metadata") and isinstance(d["user_metadata"], str):
        try:
            d["user_metadata"] = __import__("json").loads(d["user_metadata"])
        except Exception:
            pass
    return d


def list_users(page: int = 1, per_page: int = 50) -> Tuple[list, int]:
    """Return (list of user dicts, total count)."""
    offset = (page - 1) * per_page
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS c FROM auth_users")
            total = cur.fetchone()["c"]
            cur.execute(
                """SELECT id, email, full_name, user_metadata, created_at, last_sign_in_at
                   FROM auth_users ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                (per_page, offset),
            )
            rows = cur.fetchall()
    users = []
    for row in rows:
        d = _row_to_dict(dict(row))
        if d.get("user_metadata") and isinstance(d["user_metadata"], str):
            try:
                d["user_metadata"] = __import__("json").loads(d["user_metadata"])
            except Exception:
                pass
        users.append(d)
    return users, total


def create_user_admin(
    email: str,
    password: str,
    email_confirm: bool = True,
    user_metadata: Optional[dict] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Admin: create user. Returns (user_id, None) or (None, error_message)."""
    email = str(email or "").strip().lower()
    if not email or "@" not in email:
        return None, "Invalid email"
    if not password or len(password) < 6:
        return None, "Password must be at least 6 characters"
    user_id = str(uuid.uuid4())
    meta = user_metadata or {}
    full_name = meta.get("full_name") or (f"{meta.get('first_name', '')} {meta.get('last_name', '')}".strip() or None)
    password_hash = _hash_password(password)
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM auth_users WHERE email = %s", (email,))
            if cur.fetchone():
                return None, "User already exists"
            cur.execute(
                """INSERT INTO auth_users (id, email, password_hash, full_name, user_metadata, email_confirmed_at, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, email, password_hash, full_name, __import__("json").dumps(meta), now if email_confirm else None, now, now),
            )
            cur.execute(
                "INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES (%s, %s, %s, %s, %s)",
                (user_id, email, full_name, now, now),
            )
    return user_id, None


def update_user_by_id(user_id: str, updates: dict) -> Tuple[bool, Optional[str]]:
    """Update auth_users. Supports password, user_metadata, full_name, email. Returns (ok, error)."""
    allowed = {"password", "user_metadata", "full_name", "email"}
    set_parts = []
    vals = []
    if "password" in updates and updates["password"]:
        set_parts.append("password_hash = %s")
        vals.append(_hash_password(updates["password"]))
    if "user_metadata" in updates:
        set_parts.append("user_metadata = %s")
        vals.append(__import__("json").dumps(updates["user_metadata"]) if isinstance(updates["user_metadata"], dict) else updates["user_metadata"])
    if "full_name" in updates:
        set_parts.append("full_name = %s")
        vals.append(updates["full_name"])
    if "email" in updates:
        set_parts.append("email = %s")
        vals.append(str(updates["email"]).strip().lower())
    if not set_parts:
        return True, None
    set_parts.append("updated_at = %s")
    vals.append(datetime.utcnow())
    vals.append(user_id)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE auth_users SET {', '.join(set_parts)} WHERE id = %s",
                vals,
            )
            if cur.rowcount == 0:
                return False, "User not found"
    if "email" in updates or "full_name" in updates:
        profile_updates = {}
        if "email" in updates:
            profile_updates["email"] = str(updates["email"]).strip().lower()
        if "full_name" in updates:
            profile_updates["full_name"] = updates["full_name"]
        if profile_updates:
            profile_updates["updated_at"] = datetime.utcnow()
            from services.database_service import DatabaseService
            db = getattr(current_app, "database_service", None)
            if db:
                db.table_update("profiles", profile_updates, {"id": user_id})
    return True, None


def delete_user(user_id: str, soft: bool = False) -> Tuple[bool, Optional[str]]:
    """Delete user from auth_users and profiles."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id = %s", (user_id,))
            cur.execute("DELETE FROM auth_users WHERE id = %s", (user_id,))
            n = cur.rowcount
    return n > 0, None if n > 0 else "User not found"


def change_password(user_id: str, current_password: str, new_password: str) -> Tuple[bool, Optional[str]]:
    """Verify current password and set new one. Returns (ok, error_message)."""
    if len(new_password) < 6:
        return False, "Password must be at least 6 characters"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT password_hash FROM auth_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        return False, "User not found"
    if not _verify_password(current_password, row["password_hash"]):
        return False, "Current password is incorrect"
    ok, err = update_user_by_id(user_id, {"password": new_password})
    return ok, err


def create_password_reset_token(email: str) -> Optional[str]:
    """Create a short-lived JWT for password reset. Returns token or None if user not found."""
    user = get_user_by_email(email)
    if not user:
        return None
    payload = {
        "sub": user["id"],
        "type": "password_reset",
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def reset_password_with_token(token: str, new_password: str) -> Tuple[bool, Optional[str]]:
    """Verify reset token and set new password. Returns (ok, error_message)."""
    if len(new_password) < 6:
        return False, "Password must be at least 6 characters"
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            return False, "Invalid token"
        user_id = payload.get("sub")
        if not user_id:
            return False, "Invalid token"
    except Exception:
        return False, "Invalid or expired token"
    ok, err = update_user_by_id(user_id, {"password": new_password})
    return ok, err
