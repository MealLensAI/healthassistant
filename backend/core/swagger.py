"""
Swagger / OpenAPI setup via flasgger.
"""
import os
from flask import Flask
from flasgger import Swagger

# backend/docs/openapi
OPENAPI_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'openapi')


def swagger_path(*parts: str) -> str:
    """Absolute path to an OpenAPI YAML file under docs/openapi/."""
    return os.path.join(OPENAPI_DIR, *parts)


def init_swagger(app: Flask) -> Swagger:
    """Initialize Swagger UI at /apidocs with Bearer JWT security."""
    swagger_config = {
        'headers': [],
        'specs': [
            {
                'endpoint': 'apispec',
                'route': '/apispec.json',
                'rule_filter': lambda rule: True,
                'model_filter': lambda tag: True,
            }
        ],
        'static_url_path': '/flasgger_static',
        'swagger_ui': True,
        'specs_route': '/apidocs',
    }

    template = {
        'swagger': '2.0',
        'info': {
            'title': 'MealLens API',
            'description': (
                'Health assistant backend API. '
                'Authenticate via POST /api/login, then use Authorize with '
                '`Bearer <access_token>` (or rely on the access_token cookie).'
            ),
            'version': '1.0.0',
        },
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': 'JWT access token. Format: `Bearer <access_token>`',
            }
        },
        'tags': [
            {'name': 'Auth', 'description': 'Authentication and profile'},
            {'name': 'Meal Plans', 'description': 'Meal plan CRUD and lookups'},
            {'name': 'Settings', 'description': 'User settings and notifications'},
            {'name': 'Health History', 'description': 'Detection / health history'},
            {'name': 'Food For You', 'description': 'Saved foods preferences'},
            {'name': 'Meal Tracking', 'description': 'Cooked meals and reminders'},
            {'name': 'Subscription', 'description': 'Subscription and feature usage'},
            {'name': 'Payment', 'description': 'Paystack payments and billing'},
            {'name': 'Lifecycle', 'description': 'Trial and subscription lifecycle'},
            {'name': 'Enterprise', 'description': 'Enterprise accounts and users'},
            {'name': 'Feedback', 'description': 'User feedback'},
            {'name': 'AI Session', 'description': 'AI session storage'},
            {'name': 'Mock AI', 'description': 'Local mock AI meal planning'},
        ],
    }

    return Swagger(app, config=swagger_config, template=template)
