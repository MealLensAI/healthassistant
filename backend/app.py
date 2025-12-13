from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv
import os
# Load .env file from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)  # This loads the environment variables from .env file
print(f"[APP] Loading .env from: {env_path}")
print(f"[APP] SMTP_USER: {'SET' if os.getenv('SMTP_USER') else 'NOT SET'}")
print(f"[APP] SMTP_PASSWORD: {'SET' if os.getenv('SMTP_PASSWORD') else 'NOT SET'}")
print(f"[APP] FRONTEND_URL: {os.getenv('FRONTEND_URL', 'NOT SET')}")
from supabase import create_client, Client

from flask_cors import CORS, cross_origin # Import CORS

# Import services
from services.auth_service import AuthService
from services.supabase_service import SupabaseService
# Payment service import
try:
    from services.payment_service import PaymentService
    PAYMENT_ENABLED = True
except ImportError:
    PAYMENT_ENABLED = False
    print("Payment service not available - payment features will be disabled")

# Import blueprints for routes
from routes.feedback_routes import feedback_bp
from routes.meal_plan_routes import meal_plan_bp
from routes.auth_routes import auth_bp
from routes.ai_session_routes import ai_session_bp
from routes.user_settings_routes import user_settings_bp
from routes.health_history_routes import health_history_bp
# Subscription routes import
try:
    from routes.subscription_routes import subscription_bp
    SUBSCRIPTION_ROUTES_ENABLED = True
    print("Subscription routes loaded successfully.")
except ImportError as e:
    SUBSCRIPTION_ROUTES_ENABLED = False
    print(f"Subscription routes not available: {e}")
except Exception as e:
    SUBSCRIPTION_ROUTES_ENABLED = False
    print(f"Subscription routes error: {e}")
    print("Subscription endpoints will be disabled.")
# Payment routes import
try:
    from routes.payment_routes import payment_bp
    PAYMENT_ROUTES_ENABLED = True
    print("Payment routes loaded successfully.")
except ImportError as e:
    PAYMENT_ROUTES_ENABLED = False
    print(f"Payment routes not available: {e}")
except SyntaxError as e:
    PAYMENT_ROUTES_ENABLED = False
    print(f"Payment routes have syntax errors: {e}")
    print("Payment endpoints will be disabled.")
except Exception as e:
    PAYMENT_ROUTES_ENABLED = False
    print(f"Payment routes error: {e}")
    print("Payment endpoints will be disabled.")

# Lifecycle routes import
try:
    from routes.lifecycle_routes import lifecycle_bp
    LIFECYCLE_ROUTES_ENABLED = True
    print("Lifecycle routes loaded successfully.")
except ImportError as e:
    LIFECYCLE_ROUTES_ENABLED = False
    print(f"Lifecycle routes not available: {e}")
except Exception as e:
    LIFECYCLE_ROUTES_ENABLED = False
    print(f"Lifecycle routes error: {e}")
    print("Lifecycle endpoints will be disabled.")

# Enterprise routes import
try:
    from routes.enterprise_routes import enterprise_bp
    ENTERPRISE_ROUTES_ENABLED = True
    print("Enterprise routes loaded successfully.")
except ImportError as e:
    ENTERPRISE_ROUTES_ENABLED = False
    print(f"Enterprise routes not available: {e}")
except Exception as e:
    ENTERPRISE_ROUTES_ENABLED = False
    print(f"Enterprise routes error: {e}")
    print("Enterprise endpoints will be disabled.")

# Mock AI routes import (for local development)
try:
    from routes.mock_ai_routes import mock_ai_bp
    MOCK_AI_ROUTES_ENABLED = True
    print("Mock AI routes loaded successfully.")
except ImportError as e:
    MOCK_AI_ROUTES_ENABLED = False
    print(f"Mock AI routes not available: {e}")
except Exception as e:
    MOCK_AI_ROUTES_ENABLED = False
    print(f"Mock AI routes error: {e}")
    print("Mock AI endpoints will be disabled.")

def create_app():
  """
  Factory function to create and configure the Flask application.
  """
  app = Flask(__name__)
  
  # Configure CORS to allow requests from the frontend
  # Build allowed origins list: localhost + production domains
  env_allowed = os.environ.get("ALLOWED_ORIGINS", "").strip()
  allowed_origins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://healthassistant.meallensai.com",
      "https://www.healthassistant.meallensai.com",
      # Hosted frontend(s)
      "https://meallens.vercel.app",
  ]
  if env_allowed:
      # Support comma-separated list in env
      for item in env_allowed.split(","):
          origin = item.strip()
          if origin:
              allowed_origins.append(origin)

  # Remove duplicates while preserving order
  seen = set()
  allowed_origins = [o for o in allowed_origins if not (o in seen or seen.add(o))]

  CORS(
      app,
      resources={
          r"/api/*": {
              "origins": allowed_origins,
              "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
              "allow_headers": ["Content-Type", "Authorization"],
              "supports_credentials": True,
              "expose_headers": ["Content-Type", "Authorization"],
              "max_age": 600  # Cache preflight request for 10 minutes
          }
      },
      supports_credentials=True
  )
  
  # Log all incoming requests for debugging
  @app.before_request
  def log_request():
      print(f"[REQUEST] {request.method} {request.path}")
      if request.method == 'POST' and request.is_json:
          print(f"[REQUEST BODY] {request.get_json()}")
  
  # Add CORS headers to all responses for preflight requests
  @app.after_request
  def after_request(response):
      # Only add CORS headers if they're not already set by Flask-CORS
      if 'Access-Control-Allow-Origin' not in response.headers:
          # Echo back allowed origin or fall back to first allowed
          origin = request.headers.get('Origin')
          try:
              if origin and origin in allowed_origins:
                  response.headers.add('Access-Control-Allow-Origin', origin)
              else:
                  # Prefer production domain as default fallback instead of localhost
                  default_origin = 'https://healthassistant.meallensai.com' if 'https://healthassistant.meallensai.com' in allowed_origins else allowed_origins[0]
                  response.headers.add('Access-Control-Allow-Origin', default_origin)
          except Exception:
              # As a very last resort, use production domain to avoid leaking localhost in prod
              response.headers.add('Access-Control-Allow-Origin', 'https://healthassistant.meallensai.com')
          response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          response.headers.add('Access-Control-Allow-Credentials', 'true')
      return response

  # Initialize Supabase clients
  supabase_url = os.environ.get("SUPABASE_URL")
  supabase_service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
  
  if not supabase_url or not supabase_service_role_key:
      raise ValueError("Missing required Supabase credentials in .env file")
  
  # Create Supabase client with service role key for admin operations
  app.supabase_service = SupabaseService(supabase_url, supabase_service_role_key)
  
  # Initialize PaymentService
  app.payment_service = None
  if PAYMENT_ENABLED:
      try:
          # Only initialize if Paystack keys are provided
          paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
          if paystack_secret:
              app.payment_service = PaymentService(app.supabase_service.supabase)
              print("Payment service initialized successfully.")
          else:
              print("Payment service disabled - PAYSTACK_SECRET_KEY not provided")
      except Exception as e:
          print(f"Warning: Failed to initialize PaymentService: {str(e)}")
          print("Payment features will be disabled.")
          app.payment_service = None
  else:
      print("Payment service disabled - payment features will be unavailable")
  
  # Initialize AuthService with Supabase admin client (Supabase-only auth)
  try:
      app.auth_service = AuthService(app.supabase_service.supabase)
      print("Supabase AuthService initialized successfully.")
  except Exception as e:
      print(f"Warning: Failed to initialize AuthService: {str(e)}")
      print("Authentication features will be disabled.")
      app.auth_service = None

  # Register blueprints with API prefix
  app.register_blueprint(feedback_bp, url_prefix='/api')
  app.register_blueprint(meal_plan_bp, url_prefix='/api')
  app.register_blueprint(auth_bp, url_prefix='/api')
  app.register_blueprint(ai_session_bp, url_prefix='/api')
  app.register_blueprint(user_settings_bp, url_prefix='/api')
  app.register_blueprint(health_history_bp, url_prefix='/api')
  
  # Register subscription routes
  if SUBSCRIPTION_ROUTES_ENABLED:
      app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
      print("Subscription routes registered.")
  else:
      print("Subscription routes disabled.")

  # Register payment routes
  if PAYMENT_ROUTES_ENABLED:
      app.register_blueprint(payment_bp, url_prefix='/api/payment')
      print("Payment routes registered.")
  else:
      print("Payment routes disabled.")

  # Register lifecycle routes
  if LIFECYCLE_ROUTES_ENABLED:
      app.register_blueprint(lifecycle_bp, url_prefix='/api/lifecycle')
      print("Lifecycle routes registered.")
  else:
      print("Lifecycle routes disabled.")

  # Register enterprise routes
  if ENTERPRISE_ROUTES_ENABLED:
      app.register_blueprint(enterprise_bp)
      print("Enterprise routes registered.")
      # Debug: Print registered routes
      enterprise_routes = [str(rule) for rule in app.url_map.iter_rules() if 'enterprise' in str(rule)]
      print(f"Registered enterprise routes: {enterprise_routes[:10]}")  # Print first 10
  else:
      print("Enterprise routes disabled.")

  # Register mock AI routes (for local development)
  if MOCK_AI_ROUTES_ENABLED:
      app.register_blueprint(mock_ai_bp)
      print("Mock AI routes registered.")
  else:
      print("Mock AI routes disabled.")

  return app

if __name__ == '__main__':
  import os
  app = create_app()
  # Use environment variables for production
  port = int(os.environ.get('PORT', 5001))
  debug = os.environ.get('FLASK_ENV', 'production') != 'production'
  app.run(debug=debug, host='0.0.0.0', port=port)
