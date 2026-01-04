"""
Blueprint registration module.
Centralizes all route blueprint registration for better organization.
"""
import logging
from flask import Flask

logger = logging.getLogger(__name__)


def register_blueprints(app: Flask) -> None:
    """
    Register all application blueprints.
    
    Args:
        app: Flask application instance
    """
    # Core routes (always enabled)
    from routes.auth_routes import auth_bp
    from routes.user_settings_routes import user_settings_bp
    from routes.feedback_routes import feedback_bp
    from routes.meal_plan_routes import meal_plan_bp
    from routes.ai_session_routes import ai_session_bp
    from routes.health_history_routes import health_history_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api')
    logger.info("Auth routes registered")
    
    app.register_blueprint(user_settings_bp, url_prefix='/api')
    logger.info("User settings routes registered")
    
    app.register_blueprint(feedback_bp, url_prefix='/api')
    logger.info("Feedback routes registered")
    
    app.register_blueprint(meal_plan_bp, url_prefix='/api')
    logger.info("Health meal plan routes registered")
    
    app.register_blueprint(health_history_bp, url_prefix='/api')
    logger.info("Health history routes registered")
    
    app.register_blueprint(ai_session_bp, url_prefix='/api')
    logger.info("AI session routes registered")
    
    # Optional routes (with error handling)
    try:
        from routes.subscription_routes import subscription_bp
        app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
        logger.info("Subscription routes registered")
    except ImportError as e:
        logger.warning(f"Subscription routes not available: {e}")
    except Exception as e:
        logger.error(f"Failed to register subscription routes: {e}")
    
    try:
        from routes.payment_routes import payment_bp
        app.register_blueprint(payment_bp, url_prefix='/api/payment')
        logger.info("Payment routes registered")
    except ImportError as e:
        logger.warning(f"Payment routes not available: {e}")
    except Exception as e:
        logger.error(f"Failed to register payment routes: {e}")
    
    try:
        from routes.lifecycle_routes import lifecycle_bp
        app.register_blueprint(lifecycle_bp, url_prefix='/api/lifecycle')
        logger.info("Lifecycle routes registered")
    except ImportError as e:
        logger.warning(f"Lifecycle routes not available: {e}")
    except Exception as e:
        logger.error(f"Failed to register lifecycle routes: {e}")
    
    try:
        from routes.enterprise_routes import enterprise_bp
        # Enterprise routes already include /api/enterprise in their definitions
        # So we register without url_prefix to avoid double /api
        app.register_blueprint(enterprise_bp)
        logger.info("Enterprise routes registered successfully")
        # Debug: log registered routes
        enterprise_routes = [str(rule) for rule in app.url_map.iter_rules() if 'enterprise' in str(rule)]
        logger.info(f"Registered {len(enterprise_routes)} enterprise routes")
    except ImportError as e:
        logger.error(f"Enterprise routes not available (ImportError): {e}", exc_info=True)
    except Exception as e:
        logger.error(f"Failed to register enterprise routes: {e}", exc_info=True)
        # Don't re-raise - let app continue without enterprise routes
