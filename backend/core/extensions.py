"""
Flask extensions and initialization.
Centralizes all Flask extension setup for better organization.
"""
from flask import Flask
from flask_cors import CORS
from typing import List


def init_cors(app: Flask, allowed_origins: List[str]) -> None:
    """
    Initialize CORS for the Flask application.
    
    Args:
        app: Flask application instance
        allowed_origins: List of allowed origins
    """
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
    
    @app.after_request
    def after_request(response):
        """Add CORS headers to all responses"""
        from flask import request
        
        if 'Access-Control-Allow-Origin' not in response.headers:
            origin = request.headers.get('Origin')
            try:
                if origin and origin in allowed_origins:
                    response.headers.add('Access-Control-Allow-Origin', origin)
                else:
                    # Prefer production domain as default fallback
                    default_origin = 'https://healthassistant.meallensai.com' if 'https://healthassistant.meallensai.com' in allowed_origins else allowed_origins[0]
                    response.headers.add('Access-Control-Allow-Origin', default_origin)
            except Exception:
                response.headers.add('Access-Control-Allow-Origin', 'https://healthassistant.meallensai.com')
            
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response


def init_extensions(app: Flask) -> None:
    """
    Initialize all Flask extensions.
    
    Args:
        app: Flask application instance
    """
    # Initialize CORS
    init_cors(app, app.config['ALLOWED_ORIGINS'])
    
    # Add more extensions here as needed
    # Example: init_database(app), init_cache(app), etc.
