from __future__ import annotations

import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip()
        self.supabase_service_role_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""
        ).strip()
        self.memory_store = os.getenv("CARE_MEMORY_STORE", "").lower() in ("1", "true", "yes")
        self.database_path = os.getenv("CARE_DATABASE_PATH", "").strip()

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key) and not self.memory_store

    @property
    def json_database_path(self) -> Path:
        if self.database_path:
            return Path(self.database_path).expanduser().resolve()
        return Path(__file__).resolve().parent / "data" / "database.json"


settings = Settings()
