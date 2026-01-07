# Comprehensive Supabase Issues Guide

## Common Supabase Problems & Solutions

### 1. RLS Policy Violations (Most Common)

**Problem:** Service role key should bypass RLS, but it's not working.

**Tables Affected:**
- `meal_plan_management` ✅ (Already fixed)
- `user_settings` ⚠️ (May have issues)
- `user_settings_history` ⚠️ (May have issues)
- `detection_history` ⚠️ (May have issues)
- `organization_users` ⚠️ (May have issues)
- `enterprises` ⚠️ (May have issues)
- `invitations` ⚠️ (May have issues)
- `ai_sessions` ⚠️ (May have issues)
- `user_sessions` ⚠️ (May have issues)
- `feedback` ⚠️ (May have issues)

**Solution:**
1. Run `AUDIT_ALL_RLS_ISSUES.sql` to identify all problems
2. The script will create service_role policies for all tables
3. If issues persist, use RPC functions with `SECURITY DEFINER`

### 2. Connection Errors

**Symptoms:**
- "Resource temporarily unavailable"
- "Connection terminated"
- Timeout errors
- HTTP/2 errors

**Solution:**
- Already handled in code with retry logic
- `HTTPX_DISABLE_HTTP2=1` is set
- Exponential backoff implemented

### 3. Service Role Key Not Recognized

**Problem:** Backend uses service role key but Supabase doesn't recognize it.

**Causes:**
1. Wrong key (using anon key instead of service_role key)
2. Key not set in environment variables
3. Key format is incorrect

**Solution:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. Check key format (should be JWT with 3 parts)
3. Use RPC functions as fallback (they bypass RLS completely)

### 4. Duplicate Key Violations

**Problem:** Trying to insert records that violate unique constraints.

**Solution:**
- Already handled in code with proper error messages
- Check for error code `23505` (PostgreSQL unique constraint)

### 5. Missing RLS Policies

**Problem:** Tables have RLS enabled but no policies for service_role.

**Solution:**
- Run `AUDIT_ALL_RLS_ISSUES.sql` to create all missing policies

## Quick Fix Script

Run this in Supabase SQL Editor:

```sql
-- This creates service_role policies for ALL backend-managed tables
-- Copy from: backend/database/AUDIT_ALL_RLS_ISSUES.sql
```

## Tables That Need Service Role Access

These tables are written to by the backend using service_role key:

1. ✅ `meal_plan_management` - Fixed
2. ⚠️ `user_settings` - Needs verification
3. ⚠️ `user_settings_history` - Needs verification
4. ⚠️ `detection_history` - Needs verification
5. ⚠️ `organization_users` - Needs verification
6. ⚠️ `enterprises` - Needs verification
7. ⚠️ `invitations` - Needs verification
8. ⚠️ `ai_sessions` - Needs verification
9. ⚠️ `user_sessions` - Needs verification
10. ⚠️ `feedback` - Needs verification
11. ⚠️ `profiles` - Needs verification

## How to Fix All Issues at Once

1. **Run the Audit Script:**
   ```bash
   # In Supabase SQL Editor, run:
   backend/database/AUDIT_ALL_RLS_ISSUES.sql
   ```

2. **Verify Fixes:**
   - The script will show a summary report
   - Check that all tables have service_role policies

3. **Test Operations:**
   - Try creating a meal plan
   - Try saving user settings
   - Try creating an invitation
   - Try adding a user to organization

## If Issues Persist

1. **Check Service Role Key:**
   ```bash
   # Verify the key is set
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Use RPC Functions:**
   - Create RPC functions with `SECURITY DEFINER`
   - These bypass RLS completely
   - Example: `insert_meal_plan_management` function

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for RLS policy violations
   - Check error codes (42501 = RLS violation)

## Prevention

1. **Always create service_role policies** when enabling RLS
2. **Use RPC functions** for critical operations
3. **Test with service_role key** before deploying
4. **Monitor Supabase logs** for RLS violations

## Next Steps

1. ✅ Run `AUDIT_ALL_RLS_ISSUES.sql` in Supabase
2. ✅ Verify all tables have service_role policies
3. ✅ Test all backend operations
4. ✅ Monitor for any remaining issues

