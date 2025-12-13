# Testing Guide - MealLens AI

## 🧪 Testing Configurations

### Local Development (Default)
Test with local backend:

```bash
# Terminal 1: Start local backend
cd backend
python app.py

# Terminal 2: Start frontend (no .env.local needed)
cd frontend
npm run dev
```

**Result:** Frontend → Vite Proxy → `localhost:5000`

---

### Testing Against Production Backend

Test your local frontend against the production Render backend:

**Step 1:** Create `.env.local` file:

```bash
cd frontend
cp .env.local.example .env.local
```

**Step 2:** Edit `frontend/.env.local`:

```env
# Test against production backend
VITE_API_URL=https://meallensai.onrender.com
```

**Step 3:** Restart frontend:

```bash
npm run dev
```

**Result:** Frontend → `https://meallensai.onrender.com/api`

---

## 🌍 Production Deployment Testing

### Frontend (Vercel)
- **URL:** healthassistant.meallensai.com
- **Backend:** https://meallensai.onrender.com

**Required:** Set environment variables in Vercel Dashboard:
```
VITE_API_URL=https://meallensai.onrender.com
VITE_AI_API_URL=http://35.238.225.150:7017
```

---

## 🧪 Test Scenarios

### 1. Authentication Flow
- [ ] User registration
- [ ] Email login
- [ ] Google OAuth login
- [ ] Logout
- [ ] Session persistence

### 2. Recipe Features
- [ ] Food detection (image upload)
- [ ] Recipe generation
- [ ] Save recipes
- [ ] View recipe history

### 3. Meal Planning
- [ ] Create meal plan
- [ ] View meal plans
- [ ] Filter by health condition
- [ ] Save meal plans

### 4. Enterprise Features (If applicable)
- [ ] Organization registration
- [ ] Invite users
- [ ] View enterprise dashboard
- [ ] Manage members

### 5. Subscription/Trial
- [ ] Trial activation on signup
- [ ] Trial status display
- [ ] Payment flow
- [ ] Subscription status

---

## 🐛 Debugging Tips

### Check Frontend Logs
Open browser console (F12) and check:
- Network tab for API calls
- Console tab for errors
- Application tab for localStorage/cookies

### Check Backend Logs

**Local Backend:**
```bash
# Terminal output shows all requests
```

**Production Backend (Render):**
1. Go to: https://dashboard.render.com
2. Select your service
3. Click "Logs" tab

### Common Issues

**Issue: "Request timeout"**
- **Cause:** Backend not running or wrong URL
- **Fix:** 
  - Local: Start `python app.py`
  - Production: Set `VITE_API_URL` in Vercel

**Issue: "CORS error"**
- **Cause:** Backend doesn't allow frontend domain
- **Fix:** Check CORS configuration in `backend/app.py`

**Issue: "401 Unauthorized"**
- **Cause:** Token expired or invalid
- **Fix:** Logout and login again

**Issue: "500 Internal Server Error"**
- **Cause:** Backend error (check backend logs)
- **Fix:** Check Render logs or local terminal

---

## 🔍 Test API Endpoints Manually

### Health Check
```bash
curl https://meallensai.onrender.com/api/health
```

### Check Auth Status
```bash
curl https://meallensai.onrender.com/api/auth/status
```

### Test Login (with credentials)
```bash
curl -X POST https://meallensai.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 📊 Environment Variables Summary

| Environment | File/Location | Purpose |
|-------------|---------------|---------|
| **Local Dev** | No file needed | Use Vite proxy |
| **Local Testing** | `frontend/.env.local` | Test against prod backend |
| **Production** | Vercel Dashboard | Production deployment |

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Tested against production backend locally
- [ ] Environment variables set in Vercel
- [ ] Environment variables set in Render
- [ ] Backend using Gunicorn (not Flask dev server)
- [ ] CORS configured correctly
- [ ] Database migrations run (if any)
- [ ] API keys valid and not expired

---

## 🆘 Getting Help

If you encounter issues:

1. Check browser console for frontend errors
2. Check backend logs for server errors
3. Verify environment variables are set correctly
4. Clear browser cache and localStorage
5. Try in incognito mode
6. Check this guide's debugging section

---

## 📝 Notes

- **Never commit `.env.local` files** - they contain secrets!
- **Always test locally first** before deploying
- **Use production backend** for final testing before release
- **Check Render logs** for production issues

---

**Happy Testing! 🧪**

