# MealLens AI - Health Nutrition Platform

AI-powered health nutrition assistant for personalized meal planning and health condition management.

## 📁 Project Structure

```
recipe-ai-harmony/
├── frontend/              # React + TypeScript frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── README.md         # Frontend documentation
│
├── backend/              # Flask Python backend
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── venv/            # Python virtual environment
│   ├── requirements.txt # Backend dependencies
│   └── README.md        # Backend documentation
│
├── docs/                # Documentation files
│   ├── QUICK_START.md
│   ├── SUCCESS_SUMMARY.md
│   └── ...
│
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

**Frontend:**
- Node.js 16+ 
- npm or yarn

**Backend:**
- Python 3.11 or 3.12 (NOT 3.13)
- pip

### Installation & Running

#### 1. Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python app.py
```

✅ Backend running at: **http://127.0.0.1:5000**

#### 2. Frontend Setup (Terminal 2)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

### Access the Application

Open your browser and navigate to: **http://localhost:5173**

## 🎯 Features

### Core Features
-  **Health Meal Planning**: Personalized 7-day meal plans for chronic conditions (diabetes, hypertension, PCOS, renal care, etc.)
-  **Health Meal Generation**: Generate health-focused meals from ingredients tailored to your condition
-  **BMI & BMR Calculations**: Automatic calculations based on your body metrics
-  **Health Profiles**: Manage your health conditions, dietary restrictions, and nutritional needs
-  **Nutrition Tracking**: Track your health progress over time
-  **Subscription Management**: Flexible payment plans

### Enterprise Features
-  **Organization Management**: Create and manage organizations
-  **User Invitations**: Invite team members
-  **Role-Based Access**: Admin and member roles
-  **Usage Analytics**: Track organization usage

##  Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Routing**: React Router v6
- **Icons**: Lucide React

### Backend
- **Framework**: Flask 3.1.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Payment**: Paystack
- **CORS**: Flask-CORS



##  Documentation

- **Frontend**: See [frontend/README.md](frontend/README.md)
- **Backend**: See [backend/README.md](backend/README.md)
- **Quick Start**: See [QUICK_START.md](QUICK_START.md)
- **API Documentation**: See [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)

## 🔧 Configuration

### Frontend Environment Variables

Create `frontend/.env` (optional):

```env
VITE_API_URL=
VITE_AI_API_URL=http://35.238.225.150:7017
VITE_PAYSTACK_PUBLIC_KEY=your_key
```

### Backend Environment Variables

The `backend/.env` file is already configured with:
- Supabase credentials
- Paystack keys
- SMTP settings
- CORS origins

## 🌐 Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Frontend  │────────▶│   Backend   │
│             │         │  (Vite Dev) │         │   (Flask)   │
│ localhost:  │◀────────│             │◀────────│             │
│    5173     │         │ localhost:  │         │ 127.0.0.1:  │
└─────────────┘         │    5173     │         │    5000     │
                        └─────────────┘         └──────┬──────┘
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │  Supabase   │
                                                │  Database   │
                                                └─────────────┘
```

### Request Flow

1. User interacts with React frontend
2. Frontend makes API call to `/api/*`
3. Vite proxy forwards to backend (development)
4. Backend processes request
5. Backend queries Supabase database
6. Response sent back to frontend
7. UI updates with data

## 🔐 Authentication

- JWT-based authentication
- Tokens stored in localStorage
- Protected routes on frontend
- Backend validates tokens
- Session management via Supabase

## 📦 Key Dependencies

### Frontend
```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "tailwindcss": "^3.4.14",
  "@supabase/supabase-js": "^2.51.0",
  "lucide-react": "^0.454.0"
}
```

### Backend
```txt
flask==3.1.2
flask-cors==6.0.1
supabase==2.24.0
marshmallow==4.1.0
requests==2.32.5
```

## 🐛 Troubleshooting

### Backend Won't Start

**Issue**: `ImportError: DLL load failed while importing _pydantic_core`

**Solution**: You're using Python 3.13 (alpha). Install Python 3.11 or 3.12:

```bash
# Check version
python --version

# Should show 3.11.x or 3.12.x
```

### Frontend Can't Connect to Backend

1. Verify backend is running on port 5000
2. Check browser console for errors
3. Verify Vite proxy configuration
4. Check CORS settings in backend

### Port Already in Use

```bash
# Frontend (5173)
npx kill-port 5173

# Backend (5000)
# Windows:
netstat -ano | findstr :5000
taskkill /PID <pid> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

## 🧪 Development

### Frontend Development

```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run linter
```

### Backend Development

```bash
cd backend
.\venv\Scripts\activate  # Activate venv
python app.py            # Start server (auto-reloads)
```

### Making Changes

1. **Frontend**: Edit files in `frontend/src/`, changes reflect immediately
2. **Backend**: Edit files in `backend/`, Flask auto-reloads in debug mode

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy 'dist' folder
```

### Backend (Render/Railway/Heroku)

```bash
cd backend
# Use Gunicorn for production
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 📊 Project Status

- ✅ Frontend: Fully functional
- ✅ Backend: Fully functional
- ✅ Authentication: Working
- ✅ Database: Connected (Supabase)
- ✅ Payments: Integrated (Paystack)
- ✅ Settings: Saving correctly
- ✅ History: Loading correctly

## 🤝 Contributing

### For New Developers

1. **Read the documentation**:
   - [frontend/README.md](frontend/README.md) - Frontend setup
   - [backend/README.md](backend/README.md) - Backend setup
   - [QUICK_START.md](QUICK_START.md) - Quick reference

2. **Set up your environment**:
   - Install Node.js 16+
   - Install Python 3.11 or 3.12
   - Clone the repository
   - Follow installation steps above

3. **Understand the structure**:
   - `frontend/` - All React/TypeScript code
   - `backend/` - All Flask/Python code
   - Each has its own dependencies and README

4. **Start developing**:
   - Make changes in appropriate directory
   - Test locally
   - Submit pull request

## 📝 License

[Add your license here]

## 👥 Team

[Add team members here]

## 📞 Support

For issues or questions:
1. Check the documentation in respective folders
2. Review troubleshooting sections
3. Check browser console and terminal for errors
4. Verify all services are running

## 🔗 Links

- **Production**: https://healthassistant.meallensai.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Paystack Dashboard**: https://dashboard.paystack.com

---

**Last Updated**: November 10, 2025
**Status**: ✅ Fully Operational
**Frontend**: React + Vite + TypeScript
**Backend**: Flask + Python 3.11 + Supabase
