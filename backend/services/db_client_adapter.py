"""
MySQL-backed client adapter: .table() and .rpc() use database_service, .auth uses MySQL.
"""
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional


class Result:
    def __init__(self, data: list, count: Optional[int] = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else None)


class TableAdapter:
    def __init__(self, db, table_name: str):
        self._db = db
        self._table = table_name
        self._columns = "*"
        self._where = {}
        self._order_by = None
        self._desc = True
        self._limit = None
        self._single = False
        self._count = None
        self._where_in = None
        self._insert_data = None
        self._update_data = None
        self._do_delete = False

    def select(self, *columns, count: Optional[str] = None) -> "TableAdapter":
        if count == "exact":
            self._count = "exact"
        if columns:
            raw = ",".join(c.strip() for c in columns if isinstance(c, str)) or "*"
            self._columns = "*" if "(" in raw else raw
        else:
            self._columns = "*"
        return self

    def eq(self, col: str, val: Any) -> "TableAdapter":
        self._where[col] = val
        return self

    def ilike(self, col: str, val: str) -> "TableAdapter":
        self._where[col] = val.strip().lower()
        return self

    def order(self, col: str, desc: bool = True) -> "TableAdapter":
        self._order_by = col
        self._desc = desc
        return self

    def limit(self, n: int) -> "TableAdapter":
        self._limit = n
        return self

    def single(self) -> "TableAdapter":
        self._single = True
        self._limit = 1
        return self

    def in_(self, col: str, values: list) -> "TableAdapter":
        self._where_in = (col, values)
        return self

    def insert(self, data: dict) -> "TableAdapter":
        self._insert_data = data
        return self

    def update(self, data: dict) -> "TableAdapter":
        self._update_data = data
        return self

    def delete(self) -> "TableAdapter":
        self._do_delete = True
        return self

    def execute(self) -> Result:
        if self._do_delete:
            n = self._db.table_delete(self._table, self._where)
            return Result([{"affected": n}] if n else [])
        if self._update_data is not None:
            n = self._db.table_update(self._table, self._update_data, self._where)
            return Result([{"affected": n}])
        if self._insert_data is not None:
            inserted = self._db.table_insert(self._table, self._insert_data)
            return Result(inserted if isinstance(inserted, list) else [inserted])
        if self._count == "exact":
            rows = self._db.table_select(self._table, columns=self._columns, where=self._where, limit=9999)
            return Result(rows, count=len(rows))
        if self._where_in:
            col, vals = self._where_in
            rows = self._db.table_select_in(self._table, col, vals, columns=self._columns, where=self._where, order_by=self._order_by, desc=self._desc, limit=self._limit)
        else:
            rows = self._db.table_select(self._table, columns=self._columns, where=self._where, order_by=self._order_by, desc=self._desc, limit=self._limit)
        if self._single:
            return Result(rows[0] if rows else None)
        return Result(rows)


class RpcResult:
    def __init__(self, data: Any):
        self.data = data

    def execute(self):
        return self


class DatabaseClient:
    """Provides .auth from MySQL (mysql_auth_adapter) and .table() / .rpc() via database_service."""
    def __init__(self, auth_client, database_service):
        self._auth = auth_client
        self._db = database_service

    @property
    def auth(self):
        if self._auth is not None and hasattr(self._auth, 'auth'):
            return self._auth.auth
        from services.mysql_auth_adapter import get_mysql_auth
        return get_mysql_auth().auth

    def table(self, name: str) -> TableAdapter:
        return TableAdapter(self._db, name)

    def rpc(self, name: str, params: dict) -> RpcResult:
        """RPCs implemented against MySQL."""
        if name == "get_enterprise_stats":
            eid = params.get("enterprise_uuid")
            org_users = self._db.table_select("organization_users", where={"enterprise_id": eid})
            invs = self._db.table_select("invitations", where={"enterprise_id": eid})
            return RpcResult({"members": len(org_users), "invitations": len(invs)})
        if name == "create_user_trial":
            user_id = params.get("p_user_id")
            duration_days = params.get("p_duration_days", 7)
            now = datetime.utcnow()
            end = now + timedelta(days=duration_days)
            self._db.table_insert("user_trials", {
                "id": str(uuid.uuid4()), "user_id": user_id,
                "start_date": now, "end_date": end, "created_at": now, "updated_at": now,
            })
            return RpcResult([{"status": "success"}])
        if name == "user_enterprise_access":
            user_id = params.get("user_uuid")
            owned = self._db.table_select("enterprises", where={"created_by": user_id})
            member = self._db.table_select("organization_users", where={"user_id": user_id})
            enterprise_ids = [r["enterprise_id"] for r in member]
            member_orgs = self._db.table_select_in("enterprises", "id", enterprise_ids) if enterprise_ids else []
            return RpcResult(owned + member_orgs)
        return RpcResult(None)
