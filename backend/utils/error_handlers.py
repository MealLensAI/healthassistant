"""
Production-grade Error Handling Utilities
Centralized error handling with proper logging and user-friendly messages.
"""

import logging
import traceback
from functools import wraps
from flask import jsonify, request
from typing import Callable, Any, Dict, Optional
import os

# Configure logger
logger = logging.getLogger(__name__)

# Error codes for consistent error responses
class ErrorCodes:
    AUTHENTICATION_REQUIRED = 'AUTH_REQUIRED'
    AUTHENTICATION_FAILED = 'AUTH_FAILED'
    AUTHORIZATION_DENIED = 'AUTH_DENIED'
    RESOURCE_NOT_FOUND = 'NOT_FOUND'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    DUPLICATE_RESOURCE = 'DUPLICATE'
    RATE_LIMITED = 'RATE_LIMITED'
    SERVER_ERROR = 'SERVER_ERROR'
    DATABASE_ERROR = 'DATABASE_ERROR'
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'


class APIError(Exception):
    """Custom API Error with status code and error code."""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = ErrorCodes.SERVER_ERROR,
        details: Optional[Dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': False,
            'error': self.message,
            'error_code': self.error_code,
            **({'details': self.details} if self.details else {})
        }


class AuthenticationError(APIError):
    """Authentication error."""
    def __init__(self, message: str = 'Authentication required', details: Optional[Dict] = None):
        super().__init__(message, 401, ErrorCodes.AUTHENTICATION_REQUIRED, details)


class AuthorizationError(APIError):
    """Authorization error."""
    def __init__(self, message: str = 'Access denied', details: Optional[Dict] = None):
        super().__init__(message, 403, ErrorCodes.AUTHORIZATION_DENIED, details)


class NotFoundError(APIError):
    """Resource not found error."""
    def __init__(self, message: str = 'Resource not found', details: Optional[Dict] = None):
        super().__init__(message, 404, ErrorCodes.RESOURCE_NOT_FOUND, details)


class ValidationError(APIError):
    """Validation error."""
    def __init__(self, message: str = 'Validation failed', details: Optional[Dict] = None):
        super().__init__(message, 400, ErrorCodes.VALIDATION_ERROR, details)


class DuplicateError(APIError):
    """Duplicate resource error."""
    def __init__(self, message: str = 'Resource already exists', details: Optional[Dict] = None):
        super().__init__(message, 409, ErrorCodes.DUPLICATE_RESOURCE, details)


class DatabaseError(APIError):
    """Database error."""
    def __init__(self, message: str = 'Database operation failed', details: Optional[Dict] = None):
        super().__init__(message, 500, ErrorCodes.DATABASE_ERROR, details)


def handle_api_error(error: APIError):
    """Convert APIError to JSON response."""
    logger.warning(f"API Error: {error.error_code} - {error.message}")
    return jsonify(error.to_dict()), error.status_code


def handle_exception(error: Exception):
    """Handle unexpected exceptions."""
    # Log the full traceback
    logger.error(f"Unexpected error: {str(error)}")
    logger.error(traceback.format_exc())
    
    # In production, don't expose internal error details
    is_production = os.environ.get('FLASK_ENV') == 'production'
    
    if is_production:
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred. Please try again later.',
            'error_code': ErrorCodes.SERVER_ERROR
        }), 500
    else:
        return jsonify({
            'success': False,
            'error': str(error),
            'error_code': ErrorCodes.SERVER_ERROR,
            'traceback': traceback.format_exc()
        }), 500


def safe_endpoint(f: Callable) -> Callable:
    """
    Decorator to wrap endpoints with error handling.
    Catches all exceptions and returns appropriate JSON responses.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError as e:
            return handle_api_error(e)
        except Exception as e:
            return handle_exception(e)
    return decorated_function


def validate_required_fields(data: Dict, required_fields: list) -> None:
    """
    Validate that all required fields are present in the data.
    Raises ValidationError if any field is missing.
    """
    missing = [field for field in required_fields if field not in data or data[field] is None]
    if missing:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing)}",
            details={'missing_fields': missing}
        )


def validate_uuid(value: str, field_name: str = 'id') -> None:
    """Validate that a value is a valid UUID."""
    import uuid
    try:
        uuid.UUID(value)
    except (ValueError, TypeError):
        raise ValidationError(f"Invalid {field_name}: must be a valid UUID")


def log_request_info():
    """Log request information for debugging."""
    logger.info(f"[REQUEST] {request.method} {request.path}")
    logger.debug(f"[REQUEST] Headers: {dict(request.headers)}")
    if request.is_json:
        logger.debug(f"[REQUEST] Body: {request.get_json()}")


def log_response_info(response_data: Dict, status_code: int):
    """Log response information for debugging."""
    logger.info(f"[RESPONSE] Status: {status_code}")
    logger.debug(f"[RESPONSE] Data: {response_data}")


def format_success_response(data: Any = None, message: str = None) -> Dict:
    """Format a successful API response."""
    response = {'success': True}
    if message:
        response['message'] = message
    if data is not None:
        if isinstance(data, dict):
            response.update(data)
        else:
            response['data'] = data
    return response


def format_error_response(
    message: str,
    error_code: str = ErrorCodes.SERVER_ERROR,
    details: Optional[Dict] = None
) -> Dict:
    """Format an error API response."""
    response = {
        'success': False,
        'error': message,
        'error_code': error_code
    }
    if details:
        response['details'] = details
    return response


# Database error handler
def handle_database_error(error: Exception, operation: str = 'database operation') -> None:
    """
    Handle database errors with proper logging and user-friendly messages.
    """
    error_str = str(error).lower()
    
    # Check for specific error types
    if 'duplicate key' in error_str or 'unique constraint' in error_str:
        raise DuplicateError(f"A record with this information already exists")
    elif 'foreign key' in error_str:
        raise ValidationError(f"Referenced record does not exist")
    elif 'not found' in error_str:
        raise NotFoundError(f"The requested record was not found")
    elif 'permission denied' in error_str or 'rls' in error_str:
        raise AuthorizationError(f"You don't have permission to perform this action")
    else:
        logger.error(f"Database error during {operation}: {error}")
        raise DatabaseError(f"Failed to complete {operation}. Please try again.")
