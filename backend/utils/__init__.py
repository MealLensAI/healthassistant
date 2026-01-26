"""
Backend Utilities Package
Production-grade utilities for the MealLens AI backend.
"""

from .enterprise_utils import (
    get_supabase_client,
    get_admin_client,
    check_user_is_org_admin,
    check_user_exists_by_email,
    check_user_can_create_organizations,
    get_cached_user_details,
    get_cached_enterprise,
    batch_get_user_details,
    get_frontend_url,
    format_meal_plan_response,
    require_auth,
    require_enterprise_admin,
    init_request_cache,
    cleanup_request_cache
)

from .error_handlers import (
    APIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
    DuplicateError,
    DatabaseError,
    ErrorCodes,
    safe_endpoint,
    validate_required_fields,
    validate_uuid,
    format_success_response,
    format_error_response,
    handle_database_error
)

__all__ = [
    # Enterprise utilities
    'get_supabase_client',
    'get_admin_client',
    'check_user_is_org_admin',
    'check_user_exists_by_email',
    'check_user_can_create_organizations',
    'get_cached_user_details',
    'get_cached_enterprise',
    'batch_get_user_details',
    'get_frontend_url',
    'format_meal_plan_response',
    'require_auth',
    'require_enterprise_admin',
    'init_request_cache',
    'cleanup_request_cache',
    
    # Error handling
    'APIError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
    'ValidationError',
    'DuplicateError',
    'DatabaseError',
    'ErrorCodes',
    'safe_endpoint',
    'validate_required_fields',
    'validate_uuid',
    'format_success_response',
    'format_error_response',
    'handle_database_error'
]
