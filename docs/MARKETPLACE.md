# Dietitian care (merged into MealLensAI)

One frontend, one Flask backend.

| Piece | Location |
| --- | --- |
| UI | `frontend/src/care/` — routes `/care/*` |
| API | `backend/routes/care_routes.py` — **`/api/care/*`** |
| Domain | `backend/care/` (store, service, seed) |
| SQL | `backend/sql/care_marketplace.sql` |

## Run

```bash
# One backend
cd backend && python app.py   # port 5001

# One frontend
cd frontend && npm run dev
```

Vite proxies `/api` → Flask. Care calls go to `/api/care/...` (same process as meals, auth, enterprise).

## Product rules

- Patients sign up once at `/signup`; `/care` syncs via `POST /api/care/auth/sync`.
- Dietitians need admin approval before messaging, calls, or appointments.
- Org meal plans / invites stay as they were — only care marketplace was added.
