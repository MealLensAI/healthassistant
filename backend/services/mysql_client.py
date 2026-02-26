"""
MySQL connection helper for the healthassistant backend.
Uses pymysql with connection args from environment (MYSQL_*).
"""
import os
from contextlib import contextmanager
from typing import Generator, Any

# Lazy import so app can start even if pymysql not installed until first DB use
_pymysql = None

def _get_pymysql():
    global _pymysql
    if _pymysql is None:
        import pymysql
        _pymysql = pymysql
    return _pymysql


def get_mysql_config() -> dict[str, Any]:
    """Read MySQL config from environment."""
    return {
        "host": os.environ.get("MYSQL_HOST", "localhost"),
        "port": int(os.environ.get("MYSQL_PORT", "3306")),
        "user": os.environ.get("MYSQL_USER"),
        "password": os.environ.get("MYSQL_PASSWORD") or "",
        "database": os.environ.get("MYSQL_DATABASE"),
        "charset": "utf8mb4",
        "cursorclass": None,  # set in get_connection to DictCursor
    }


@contextmanager
def get_connection() -> Generator[Any, None, None]:
    """
    Context manager that yields a MySQL connection with DictCursor.
    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ...")
                rows = cur.fetchall()
    """
    cfg = get_mysql_config()
    if not cfg.get("user") or not cfg.get("database"):
        raise ValueError("MYSQL_USER and MYSQL_DATABASE must be set in environment")
    pymysql = _get_pymysql()
    cursorclass = getattr(pymysql.cursors, "DictCursor", None)
    conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        charset=cfg["charset"],
        cursorclass=cursorclass,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
