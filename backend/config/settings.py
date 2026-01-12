"""
Centralized configuration management for the application.
All environment variables and configuration settings are managed here.
"""
import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    
    # Server Configuration
    HOST = os.environ.get('FLASK_HOST', '127.0.0.1')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    
    # CORS Configuration - Only from environment variable
    ALLOWED_ORIGINS = []
    env_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if env_origins:
        for origin in env_origins.split(","):
            origin = origin.strip()
            # Normalize origins: remove trailing slashes for consistency
            if origin:
                origin = origin.rstrip('/')
                ALLOWED_ORIGINS.append(origin)
                # Also add version with trailing slash for compatibility
                if origin and not origin.endswith('/'):
                    ALLOWED_ORIGINS.append(origin + '/')
    
    # Supabase Configuration
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    # Payment Configuration
    PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
    PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY")
    
    # Email Configuration
    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
    SMTP_USER = os.environ.get("SMTP_USER")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    FROM_EMAIL = os.environ.get("FROM_EMAIL")
    FROM_NAME = os.environ.get("FROM_NAME", "MeallensAI")
    
    # Frontend Configuration - Must be set in environment
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
    
    # Feature Flags
    PAYMENT_ENABLED = bool(PAYSTACK_SECRET_KEY)
    EMAIL_ENABLED = bool(SMTP_USER and SMTP_PASSWORD)
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        required_vars = [
            ('SUPABASE_URL', cls.SUPABASE_URL),
            ('SUPABASE_SERVICE_ROLE_KEY', cls.SUPABASE_SERVICE_ROLE_KEY),
        ]
        
        missing = [var_name for var_name, var_value in required_vars if not var_value]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return True


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True


# Configuration dictionary
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> Config:
    """
    Get configuration object based on environment.
    
    Args:
        config_name: Configuration name (development, production, testing)
        
    Returns:
        Configuration object
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    config_class = config_by_name.get(config_name, DevelopmentConfig)
    config_class.validate()
    
    return config_class
