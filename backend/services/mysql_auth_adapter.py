"""
Adapter that provides .auth and .auth.admin for enterprise_routes.
All operations use mysql_auth_service (MySQL).
"""

from typing import Any, Optional
from services import mysql_auth_service


class _UserObj:
    """User object: .id, .email, .user_metadata."""
    def __init__(self, user_id: str, email: str, user_metadata: dict):
        self.id = user_id
        self.email = email
        self.user_metadata = user_metadata or {}


class _GetUserResponse:
    """Mimics response of get_user(token): .user."""
    def __init__(self, user_obj: _UserObj):
        self.user = user_obj


class _AuthAdmin:
    def get_user_by_id(self, user_id: str) -> Optional[Any]:
        u = mysql_auth_service.get_user_by_id(user_id)
        if not u:
            return None
        return _GetUserResponse(_UserObj(u["id"], u.get("email") or "", u.get("user_metadata") or {}))

    def get_user_by_email(self, email: str) -> Optional[Any]:
        u = mysql_auth_service.get_user_by_email(email)
        if not u:
            return None
        return _GetUserResponse(_UserObj(u["id"], u.get("email") or "", u.get("user_metadata") or {}))

    def list_users(self, page: int = 1, per_page: int = 50) -> Any:
        users, total = mysql_auth_service.list_users(page=page, per_page=per_page)
        return [_UserObj(u["id"], u.get("email") or "", u.get("user_metadata") or {}) for u in users]

    def create_user(self, data: dict) -> Any:
        email = data.get("email")
        password = data.get("password", "")
        user_metadata = data.get("user_metadata") or {}
        email_confirm = data.get("email_confirm", True)
        user_id, err = mysql_auth_service.create_user_admin(email, password, email_confirm=email_confirm, user_metadata=user_metadata)
        if err:
            raise Exception(err)
        u = mysql_auth_service.get_user_by_id(user_id)
        return _GetUserResponse(_UserObj(user_id, u.get("email") or "", u.get("user_metadata") or {}))

    def delete_user(self, user_id: str, should_soft_delete: bool = True) -> None:
        ok, err = mysql_auth_service.delete_user(user_id, soft=should_soft_delete)
        if not ok and err:
            raise Exception(err)

    def update_user_by_id(self, user_id: str, updates: dict) -> None:
        ok, err = mysql_auth_service.update_user_by_id(user_id, updates)
        if not ok and err:
            raise Exception(err)


class _Auth:
    """Provides get_user(token) and .admin."""
    def __init__(self):
        self.admin = _AuthAdmin()

    def get_user(self, token: str) -> Optional[_GetUserResponse]:
        if not token:
            return None
        if token.startswith("Bearer "):
            token = token[7:]
        user_id = mysql_auth_service.verify_access_token(token)
        if not user_id:
            return None
        u = mysql_auth_service.get_user_by_id(user_id)
        if not u:
            return None
        return _GetUserResponse(_UserObj(user_id, u.get("email") or "", u.get("user_metadata") or {}))


def get_mysql_auth():
    """Return an object with .auth.get_user(token) and .auth.admin.* for enterprise use."""
    return type("AuthWrapper", (), {"auth": _Auth()})()
