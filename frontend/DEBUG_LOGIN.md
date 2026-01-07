# Debugging Login 401 Error

## Issue
Getting `401 UNAUTHORIZED` on `/api/login` requests.

## Possible Causes

1. **Backend not running** - Check if backend is running on port 5001
2. **Vite proxy not working** - Requests should be proxied to backend
3. **Wrong credentials** - Email/password might be incorrect
4. **Backend authentication issue** - Supabase client might not be initialized

## Quick Checks

### 1. Check if Backend is Running

```bash
# In backend directory
cd backend
python app.py
# or
flask run --port 5001
```

### 2. Test Backend Directly

```bash
# Test login endpoint directly
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 3. Check Vite Proxy

The Vite config should proxy `/api` to `http://127.0.0.1:5001`. Check:
- Is the backend running on port 5001?
- Are there any proxy errors in the console?

### 4. Check Browser Network Tab

1. Open DevTools → Network tab
2. Try to login
3. Check the `/api/login` request:
   - What's the actual URL? (should be `http://localhost:5174/api/login`)
   - What's the response? (should show error message from backend)
   - Check Response tab for the actual error message

### 5. Check Backend Logs

Look at backend console for:
- "Supabase login error for {email}: {error}"
- Any initialization errors
- Any Supabase connection errors

## Common Solutions

### Solution 1: Backend Not Running
```bash
cd backend
# Make sure .env file has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
python app.py
```

### Solution 2: Wrong Port
If backend is running on a different port, update `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:YOUR_PORT', // Change this
    ...
  }
}
```

### Solution 3: Check Environment Variables
Make sure backend has:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Solution 4: Check Actual Error Message
The 401 response should include an error message. Check the Network tab Response to see what the backend is saying.

## Expected Behavior

1. Frontend sends request to `/api/login`
2. Vite proxy forwards to `http://127.0.0.1:5001/api/login`
3. Backend processes login
4. Returns 200 with tokens OR 401 with error message

## Next Steps

1. Check backend is running
2. Check backend logs for actual error
3. Check Network tab for response message
4. Verify credentials are correct

