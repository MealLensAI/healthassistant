from __future__ import annotations

import os
from pathlib import Path


def _parse_admin_emails(raw: str) -> set[str]:
    return {
        part.strip().lower()
        for part in raw.split(",")
        if part.strip() and "@" in part
    }


def _parse_admin_credentials() -> dict[str, str]:
    """
    Allowed admin email → password map from env.

    Preferred:
      CARE_ADMIN_CREDENTIALS=admin@healthyyou.com:secret,ops@meallensai.com:other

    Fallback (same password for every CARE_ADMIN_EMAILS entry):
      CARE_ADMIN_EMAILS=a@x.com,b@y.com
      CARE_ADMIN_PASSWORD=secret
    """
    creds: dict[str, str] = {}
    raw = (os.getenv("CARE_ADMIN_CREDENTIALS") or "").strip()
    if raw:
        for part in raw.split(","):
            chunk = part.strip()
            if not chunk or ":" not in chunk:
                continue
            email, password = chunk.split(":", 1)
            email = email.strip().lower()
            password = password.strip()
            if email and "@" in email and password:
                creds[email] = password
        return creds

    emails = _parse_admin_emails(
        os.getenv(
            "CARE_ADMIN_EMAILS",
            "admin@healthyyou.com,admin@meallensai.com",
        )
    )
    shared = (os.getenv("CARE_ADMIN_PASSWORD") or "").strip()
    if shared:
        return {email: shared for email in emails}
    return {}


class Settings:
    def __init__(self) -> None:
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip()
        self.supabase_service_role_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""
        ).strip()
        self.memory_store = os.getenv("CARE_MEMORY_STORE", "").lower() in ("1", "true", "yes")
        self.database_path = os.getenv("CARE_DATABASE_PATH", "").strip()

    @property
    def admin_emails(self) -> set[str]:
        creds = _parse_admin_credentials()
        if creds:
            return set(creds.keys())
        return _parse_admin_emails(
            os.getenv(
                "CARE_ADMIN_EMAILS",
                "admin@healthyyou.com,admin@meallensai.com",
            )
        )

    @property
    def admin_credentials(self) -> dict[str, str]:
        return _parse_admin_credentials()

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key) and not self.memory_store

    @property
    def json_database_path(self) -> Path:
        if self.database_path:
            return Path(self.database_path).expanduser().resolve()
        return Path(__file__).resolve().parent / "data" / "database.json"

    def is_admin_email(self, email: str) -> bool:
        return str(email or "").strip().lower() in self.admin_emails

    def verify_admin_password(self, email: str, password: str) -> bool:
        email_key = str(email or "").strip().lower()
        expected = self.admin_credentials.get(email_key)
        if not expected:
            return False
        return str(password or "") == expected


settings = Settings()
