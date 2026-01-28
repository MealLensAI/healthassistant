"""
Thin wrapper around the core application factory.

This keeps a stable `app:app` entrypoint for gunicorn while delegating all
configuration, extensions, services, and blueprints to `core.app_factory`.
"""

import os
from core.app_factory import create_app

# Create the WSGI application object expected by gunicorn: `app:app`
app = create_app(config_name=os.environ.get("FLASK_ENV", "production"))


if __name__ == "__main__":
    # Local development entrypoint (not used in production)
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", os.environ.get("PORT", 5001)))
    debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"

    app.run(host=host, port=port, debug=debug)
