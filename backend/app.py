"""
MealLens AI Backend Application
Production-ready Flask application with optimized configuration.
"""
import os
import logging
from functools import lru_cache
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables early
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO if os.environ.get('FLASK_ENV') == 'production' else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_allowed_origins() -> tuple:
    """Cache and return allowed origins from environment variable."""
    env_allowed = os.environ.get("ALLOWED_ORIGINS", "").strip()
    origins = []
    if env_allowed:
        for item in env_allowed.split(","):
            origin = item.strip().rstrip('/')
            if origin:
                origins.append(origin)
    return tuple(origins)


def create_app(config_name: str = None) -> Flask:
    """
    Factory function to create and configure the Flask application.
    
    Args:
        config_name: Optional configuration name (development, production, testing)
    
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Set configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['JSON_SORT_KEYS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
    
    # Configure CORS with cached origins
    allowed_origins = list(get_allowed_origins())
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
                "expose_headers": ["Content-Type", "Authorization"],
                "max_age": 600
            }
        },
        supports_credentials=True
    )
    
    # Initialize services
    _init_services(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Register request hooks (only in development)
    if os.environ.get('FLASK_ENV') != 'production':
        _register_request_logging(app)
    
    # Add CORS fallback handler
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin and origin.rstrip('/') in get_allowed_origins():
            if 'Access-Control-Allow-Origin' not in response.headers:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'services': {
                'supabase': app.supabase_service is not None,
                'auth': app.auth_service is not None,
                'payment': app.payment_service is not None
            }
        }), 200
    
    logger.info("Flask application initialized successfully")
    return app


def _init_services(app: Flask) -> None:
    """Initialize application services."""
    from supabase import create_client
    from services.supabase_service import SupabaseService
    from services.auth_service import AuthService
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise ValueError("Missing required Supabase credentials")
    
    # Initialize Supabase service
    app.supabase_service = SupabaseService(supabase_url, supabase_service_role_key)
    logger.info("Supabase service initialized")
    
    # Initialize Auth service
    try:
        app.auth_service = AuthService(app.supabase_service.supabase)
        logger.info("Auth service initialized")
    except Exception as e:
        logger.warning(f"Auth service initialization failed: {e}")
        app.auth_service = None
    
    # Initialize Payment service (optional)
    app.payment_service = None
    paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
    if paystack_secret:
        try:
            from services.payment_service import PaymentService
            app.payment_service = PaymentService(app.supabase_service.supabase)
            logger.info("Payment service initialized")
        except Exception as e:
            logger.warning(f"Payment service initialization failed: {e}")


def _register_blueprints(app: Flask) -> None:
    """Register all blueprints with the application."""
    # Core blueprints (always loaded)
    from routes.feedback_routes import feedback_bp
    from routes.meal_plan_routes import meal_plan_bp
    from routes.auth_routes import auth_bp
    from routes.ai_session_routes import ai_session_bp
    from routes.user_settings_routes import user_settings_bp
    from routes.health_history_routes import health_history_bp
    
    app.register_blueprint(feedback_bp, url_prefix='/api')
    app.register_blueprint(meal_plan_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(ai_session_bp, url_prefix='/api')
    app.register_blueprint(user_settings_bp, url_prefix='/api')
    app.register_blueprint(health_history_bp, url_prefix='/api')
    
    # Optional blueprints (loaded with error handling)
    _safe_register_blueprint(app, 'routes.subscription_routes', 'subscription_bp', '/api/subscription')
    _safe_register_blueprint(app, 'routes.payment_routes', 'payment_bp', '/api/payment')
    _safe_register_blueprint(app, 'routes.lifecycle_routes', 'lifecycle_bp', '/api/lifecycle')
    
    # Enterprise routes - use original for now (optimized version available)
    _safe_register_blueprint(app, 'routes.enterprise_routes', 'enterprise_bp', None)
    
    # Mock AI routes (development only)
    if os.environ.get('FLASK_ENV') != 'production':
        _safe_register_blueprint(app, 'routes.mock_ai_routes', 'mock_ai_bp', None)
    
    # Register request cache cleanup for enterprise utils
    _register_request_cache_cleanup(app)


def _safe_register_blueprint(app: Flask, module_name: str, bp_name: str, url_prefix: str = None) -> bool:
    """Safely register a blueprint, logging any errors."""
    try:
        module = __import__(module_name, fromlist=[bp_name])
        blueprint = getattr(module, bp_name)
        if url_prefix:
            app.register_blueprint(blueprint, url_prefix=url_prefix)
        else:
            app.register_blueprint(blueprint)
        logger.info(f"Registered blueprint: {bp_name}")
        return True
    except ImportError as e:
        logger.debug(f"Blueprint {bp_name} not available: {e}")
        return False
    except Exception as e:
        logger.warning(f"Failed to register blueprint {bp_name}: {e}")
        return False


def _register_error_handlers(app: Flask) -> None:
    """Register global error handlers."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'status': 'error',
            'message': 'Bad request',
            'error_type': 'bad_request'
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'status': 'error',
            'message': 'Authentication required',
            'error_type': 'unauthorized'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'status': 'error',
            'message': 'Access denied',
            'error_type': 'forbidden'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'status': 'error',
            'message': 'Resource not found',
            'error_type': 'not_found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error',
            'error_type': 'server_error'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        logger.error(f"Unhandled exception: {error}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred',
            'error_type': 'unexpected_error'
        }), 500


def _register_request_logging(app: Flask) -> None:
    """Register request logging hooks for development."""
    
    @app.before_request
    def log_request():
        logger.debug(f"[REQUEST] {request.method} {request.path}")


def _register_request_cache_cleanup(app: Flask) -> None:
    """Register request cache cleanup for enterprise utilities."""
    try:
        from utils.enterprise_utils import init_request_cache, cleanup_request_cache
        
        @app.before_request
        def init_cache():
            init_request_cache()
        
        @app.teardown_request
        def cleanup_cache(exception=None):
            cleanup_request_cache(None)
        
        logger.info("Request cache cleanup registered")
    except ImportError:
        logger.debug("Enterprise utils not available, skipping cache cleanup registration")


# Create application instance for WSGI servers (gunicorn, etc.)
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
