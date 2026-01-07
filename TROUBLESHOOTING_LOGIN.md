# Troubleshooting Login 401 Error

## Quick Diagnosis

The `401 UNAUTHORIZED` error means the backend is responding, but rejecting the login. Here's how to diagnose:

### Step 1: Check Backend is Running

```bash
# In backend directory
cd backend
python app.py
# Should see: "Running on http://127.0.0.1:5001"
```

### Step 2: Check the Actual Error Message

1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Click on the `/api/login` request
5. Go to **Response** tab
6. Look for the actual error message from backend

The backend should return something like:
- `"You don't have an account. Please sign up to create one."`
- `"Incorrect email or password"`
- `"Authentication service is not properly configured"`

### Step 3: Test Backend Directly

```bash
# Test if backend is accessible
curl http://localhost:5001/api/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### Step 4: Check Backend Logs

Look at the backend console for:
- `"Supabase login error for {email}: {error}"`
- `"Authentication service is not properly configured"`
- Any Supabase initialization errors

## Common Issues & Fixes

### Issue 1: Backend Not Running
**Symptom:** Network tab shows connection refused or timeout

**Fix:**
```bash
cd backend
# Make sure .env file exists with:
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
python app.py
```

### Issue 2: Wrong Credentials
**Symptom:** Backend returns "Incorrect email or password"

**Fix:** 
- Verify email and password are correct
- Check if user exists in Supabase
- Try resetting password

### Issue 3: User Doesn't Exist
**Symptom:** Backend returns "You don't have an account"

**Fix:**
- Sign up first, then login
- Or check Supabase Auth dashboard for the user

### Issue 4: Supabase Not Configured
**Symptom:** Backend returns "Authentication service is not properly configured"

**Fix:**
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart backend after adding env vars
- Verify Supabase credentials are correct

### Issue 5: Vite Proxy Not Working
**Symptom:** Request goes to `localhost:5174` instead of being proxied

**Fix:**
- Check `vite.config.ts` has proxy configured
- Restart Vite dev server
- Verify backend is running on port 5001

## Debug Checklist

- [ ] Backend is running on port 5001
- [ ] `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Vite dev server is running
- [ ] Check Network tab for actual error message
- [ ] Check backend console for errors
- [ ] Verify credentials are correct
- [ ] Test backend directly with curl

## Next Steps

1. **Check Network Tab Response** - This will show the actual error message
2. **Check Backend Logs** - This will show what's happening on the server
3. **Test with curl** - This bypasses the frontend and tests backend directly

The actual error message in the Network tab Response will tell you exactly what's wrong!

