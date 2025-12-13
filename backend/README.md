# MealLens AI - Backend

Flask-based REST API backend for MealLens AI application.

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or 3.12 (NOT 3.13)
- pip package manager
- Virtual environment (recommended)

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Server

```bash
# Make sure virtual environment is activated
python app.py
```

The server will start on: **http://127.0.0.1:5000**

## 📁 Project Structure

```
backend/
├── routes/                  # API route handlers
│   ├── auth_routes.py      # Authentication endpoints
│   ├── user_settings_routes.py  # User settings
│   ├── food_detection_routes.py # Food detection
│   ├── meal_plan_routes.py      # Meal planning
│   ├── feedback_routes.py       # User feedback
│   ├── payment_routes.py        # Payment processing
│   ├── subscription_routes.py   # Subscriptions
│   ├── lifecycle_routes.py      # User lifecycle
│   └── enterprise_routes.py     # Enterprise features
├── services/               # Business logic
│   ├── auth_service.py    # Authentication service
│   ├── supabase_service.py # Supabase client
│   └── payment_service.py  # Payment processing
├── utils/                  # Helper functions
├── venv/                   # Virtual environment (created)
├── .env                    # Environment variables
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🛠️ Tech Stack

- **Framework**: Flask 3.1.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Payment**: Paystack
- **CORS**: Flask-CORS
- **Validation**: Marshmallow
- **HTTP Client**: Requests

## 🔧 Configuration

### Environment Variables

The `.env` file contains all configuration (already set up):

```env
# Supabase Configuration
SUPABASE_URL=https://pklqumlzpklzroafmtrs.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_secret_key
PAYSTACK_PUBLIC_KEY=your_public_key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,https://healthassistant.meallensai.com

# SMTP Configuration (for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME=MeallensAI

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### CORS Setup

The backend allows requests from:
- `http://localhost:5173` (development)
- `http://localhost:5174` (alternative dev port)
- `https://healthassistant.meallensai.com/` (production)
- `https://healthassistant.meallensai.com/` (production)

## 📡 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/forgot-password` - Password reset request
- `POST /api/reset-password` - Reset password
- `POST /api/change-password` - Change password
- `GET /api/profile` - Get user profile

### User Settings
- `POST /api/settings` - Save user settings
- `GET /api/settings?settings_type=health_profile` - Get settings
- `DELETE /api/settings?settings_type=health_profile` - Delete settings

### Food Detection
- `POST /api/food_detection/detection_history` - Save detection
- `GET /api/food_detection/detection_history` - Get history
- `DELETE /api/food_detection/detection_history/:id` - Delete item

### Meal Plans
- `GET /api/meal_plan` - Get meal plans
- `POST /api/meal_plans` - Save meal plan
- `PUT /api/meal_plans/:id` - Update meal plan
- `DELETE /api/meal_plans/:id` - Delete meal plan
- `DELETE /api/meal_plans/clear` - Clear all plans

### Feedback
- `POST /api/feedback` - Submit feedback

### Subscriptions
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/create` - Create subscription
- `POST /api/subscription/cancel` - Cancel subscription

### Payments
- `POST /api/payment/initialize` - Initialize payment
- `POST /api/payment/verify` - Verify payment
- `GET /api/payment/history` - Payment history

### Enterprise
- `GET /api/enterprise/can-create` - Check if can create org
- `POST /api/enterprise/register` - Register organization
- `GET /api/enterprise/my-enterprises` - Get user's organizations
- `GET /api/enterprise/:id` - Get organization details
- `POST /api/enterprise/:id/invite` - Invite user
- `POST /api/enterprise/create-user` - Create enterprise user

## 🔐 Authentication

### JWT Tokens
- Access tokens stored in `Authorization: Bearer <token>` header
- Refresh tokens for session management
- Cookie-based auth also supported

### Protected Routes
Most endpoints require authentication. Include the access token in the header:

```
Authorization: Bearer <access_token>
```

## 💾 Database Schema

### Main Tables (Supabase)
- `users` - User accounts
- `user_settings` - User preferences and health profiles
- `shared_recipes` - Detection history
- `meal_plans` - Saved meal plans
- `feedback` - User feedback
- `subscriptions` - Subscription records
- `payments` - Payment transactions
- `enterprises` - Organizations
- `enterprise_users` - Organization members

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://127.0.0.1:5000/api/profile

# Should return authentication error (expected)
```

### With Authentication

```bash
# Login first to get token
curl -X POST http://127.0.0.1:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token in subsequent requests
curl http://127.0.0.1:5000/api/profile \
  -H "Authorization: Bearer <token>"
```

## 📦 Dependencies

### Core
- flask==3.1.2
- flask-cors==6.0.1
- supabase==2.24.0
- requests==2.32.5

### Utilities
- marshmallow==4.1.0 (validation)
- dotenv==0.9.9 (environment variables)
- python-dotenv==1.2.1

### Supabase Stack
- postgrest==2.24.0
- realtime==2.24.0
- storage3==2.24.0
- supabase-auth==2.24.0
- supabase-functions==2.24.0

## 🐛 Troubleshooting

### Python Version Issues

**Problem**: `ImportError: DLL load failed while importing _pydantic_core`

**Solution**: You're using Python 3.13 (alpha). Install Python 3.11 or 3.12:

```bash
# Check Python version
python --version

# Should show 3.11.x or 3.12.x, NOT 3.13.x
```

### Port Already in Use

```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

### Module Not Found

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Supabase Connection Issues

1. Check `.env` file has correct credentials
2. Verify Supabase project is active
3. Check network connectivity
4. Review Supabase dashboard for errors

### CORS Errors

1. Verify frontend URL is in `ALLOWED_ORIGINS`
2. Check CORS headers in response
3. Ensure credentials are included in requests

## 🔄 Development Workflow

### Making Changes

1. Edit code in `routes/` or `services/`
2. Flask auto-reloads in debug mode
3. Test changes immediately

### Adding New Endpoints

1. Create route handler in appropriate `routes/` file
2. Register blueprint in `app.py`
3. Add authentication if needed
4. Update API documentation

### Database Changes

1. Make changes in Supabase dashboard
2. Update service layer code
3. Test with new schema

## 📊 Logging

The backend logs important events:

```python
# Service initialization
print("Payment service initialized successfully.")
print("Supabase AuthService initialized successfully.")

# Route registration
print("Subscription routes registered.")
print("Payment routes registered.")

# Errors
print(f"Error: {error_message}")
```

Check terminal output for debugging information.

## 🚀 Deployment

### Production Checklist

- [ ] Set `debug=False` in `app.py`
- [ ] Use production WSGI server (Gunicorn, uWSGI)
- [ ] Set production environment variables
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure database backups

### Example with Gunicorn

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔒 Security

### Best Practices
- Never commit `.env` file
- Use environment variables for secrets
- Validate all user input
- Use HTTPS in production
- Implement rate limiting
- Keep dependencies updated

### Authentication
- JWT tokens expire after set time
- Refresh tokens for session management
- Password hashing with Supabase Auth
- CORS protection enabled

## 📚 Additional Resources

- Flask Documentation: https://flask.palletsprojects.com/
- Supabase Documentation: https://supabase.com/docs
- Paystack API: https://paystack.com/docs/api/

## 🆘 Support

### Common Issues

1. **Backend won't start**: Check Python version (must be 3.11 or 3.12)
2. **Database errors**: Verify Supabase credentials in `.env`
3. **CORS errors**: Add frontend URL to `ALLOWED_ORIGINS`
4. **Import errors**: Reinstall dependencies in virtual environment

### Getting Help

1. Check terminal output for error messages
2. Review `.env` configuration
3. Verify Supabase project status
4. Check network connectivity

## 🔗 Related

- **Frontend**: See `../frontend/README.md`
- **API Documentation**: See `API_DOCUMENTATION.md`
- **Project Root**: See `../README.md`

---

**Python Version**: 3.11.9 (in virtual environment)
**Flask Version**: 3.1.2
**Port**: 5000
