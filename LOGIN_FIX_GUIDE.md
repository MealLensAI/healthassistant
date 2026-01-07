# Login 401 Error - Fix Guide

## Problem
Login is failing with `401 UNAUTHORIZED` and "Invalid login credentials" error.

## Root Causes

### 1. Missing SUPABASE_ANON_KEY (Most Likely)
The backend needs `SUPABASE_ANON_KEY` for user authentication. The service role key is for admin operations, not user login.

**Solution:**
1. Get your anon key from Supabase Dashboard:
   - Go to: Settings → API → anon/public key
2. Add it to your backend `.env` file:
   ```bash
   SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Restart your backend server

### 2. Password Mismatch
You registered with one password but are trying to login with a different one.

**From your logs:**
- Registration: `Test123#`
- Login attempts: `Test123!`

**Solution:**
- Use the same password you used during registration
- Or reset your password in Supabase Dashboard

### 3. User Doesn't Exist
The user might not be created in Supabase Auth.

**Solution:**
- Check Supabase Dashboard → Authentication → Users
- If user doesn't exist, register again

## How to Verify

### Check Backend Logs
After restarting, look for these log messages:

**Good (using anon key):**
```
[LOGIN] Using anon key client for user authentication (anon key length: XXX)
```

**Bad (missing anon key):**
```
[LOGIN] SUPABASE_ANON_KEY not set in environment - user authentication may fail
[LOGIN] Using service role client (anon key not available)
```

### Check Environment Variables
```bash
# In your backend directory
cat .env | grep SUPABASE
```

You should see:
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...` ← **This is required for login**
- `SUPABASE_SERVICE_ROLE_KEY=...`

## Quick Fix Steps

1. **Add SUPABASE_ANON_KEY to backend/.env:**
   ```bash
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Your actual anon key
   ```

2. **Restart backend server:**
   ```bash
   # Stop current server (Ctrl+C)
   # Start again
   python app.py
   # or
   flask run
   ```

3. **Try login again** and check logs for:
   - `[LOGIN] Using anon key client` ← Should see this
   - No more "Invalid login credentials" errors

## Why This Matters

- **Anon Key**: Used for user authentication (`sign_in_with_password`, `sign_up`)
- **Service Role Key**: Used for admin operations (bypassing RLS, creating users via admin API)

User authentication **requires** the anon key. The service role key won't work for regular user login.

## Still Having Issues?

1. Check backend logs for `[LOGIN]` messages
2. Verify the anon key is correct (copy from Supabase Dashboard)
3. Make sure you're using the correct password
4. Check if the user exists in Supabase Auth dashboard

