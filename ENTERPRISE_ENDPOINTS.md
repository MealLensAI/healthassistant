# Enterprise Endpoints - Correct Usage

## ✅ Correct Endpoint Paths

### Backend Routes (Flask)
- `GET /api/enterprise/<enterprise_id>/user/<user_id>/meal-plans`
- `GET /api/enterprise/<enterprise_id>/user/<user_id>/health-history`

### Frontend API Calls
- `api.getUserMealPlans(enterpriseId, userId)` → `/api/enterprise/${enterpriseId}/user/${userId}/meal-plans`
- `api.getUserHealthHistory(enterpriseId, userId)` → `/api/enterprise/${enterpriseId}/user/${userId}/health-history`

## ✅ Correct URL Format

**❌ WRONG:**
```
https://api.meallensai.com/5001/api/enterprise/...
```

**✅ CORRECT:**
```
https://api.meallensai.com/api/enterprise/...
```

## Testing with curl

### 1. Test OPTIONS (CORS Preflight)
```bash
curl -X OPTIONS "https://api.meallensai.com/api/enterprise/9e5d2375-f1f2-4c1b-a27b-dee97d1541f0/user/12de37c1-b0f5-4212-baa2-e8979f13ec36/meal-plans" \
  -H "Origin: https://healthassistant.meallensai.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v
```

### 2. Test GET Meal Plans (with auth token)
```bash
curl -X GET "https://api.meallensai.com/api/enterprise/9e5d2375-f1f2-4c1b-a27b-dee97d1541f0/user/12de37c1-b0f5-4212-baa2-e8979f13ec36/meal-plans" \
  -H "Origin: https://healthassistant.meallensai.com" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

### 3. Test GET Health History (with auth token)
```bash
curl -X GET "https://api.meallensai.com/api/enterprise/9e5d2375-f1f2-4c1b-a27b-dee97d1541f0/user/12de37c1-b0f5-4212-baa2-e8979f13ec36/health-history" \
  -H "Origin: https://healthassistant.meallensai.com" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

## Fixes Applied

1. ✅ **API URL Construction** - Fixed in `frontend/src/lib/api.ts`
   - Now removes port numbers from path (e.g., `/5001`)
   - Correctly constructs: `https://api.meallensai.com/api/...`

2. ✅ **CORS Preflight** - Fixed in `backend/app.py`
   - Added explicit OPTIONS request handler
   - Returns proper CORS headers for preflight requests

## Environment Variable Check

Make sure `VITE_API_URL` is set correctly:
```bash
# ✅ CORRECT
VITE_API_URL=https://api.meallensai.com

# ❌ WRONG (port in path)
VITE_API_URL=https://api.meallensai.com/5001
```

## Next Steps

1. Verify `VITE_API_URL` environment variable is set correctly
2. Restart frontend to pick up the API URL fix
3. Test the endpoints - they should now work without CORS errors

