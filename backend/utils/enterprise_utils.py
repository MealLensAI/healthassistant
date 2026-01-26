"""
Enterprise Utility Functions
Production-grade utilities for enterprise operations with caching and optimization.
"""

import os
import json
from functools import lru_cache, wraps
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime, timezone, timedelta
from flask import current_app, request, g
from supabase import Client, create_client
import threading

# Thread-local storage for request-scoped caching
_request_cache = threading.local()


def get_request_cache() -> Dict[str, Any]:
    """Get or create request-scoped cache."""
    if not hasattr(_request_cache, 'cache'):
        _request_cache.cache = {}
    return _request_cache.cache


def clear_request_cache():
    """Clear request-scoped cache."""
    if hasattr(_request_cache, 'cache'):
        _request_cache.cache = {}


# Singleton admin client with connection reuse
_admin_client: Optional[Client] = None
_admin_client_lock = threading.Lock()


def get_admin_client() -> Client:
    """
    Get a singleton admin Supabase client for bypassing RLS.
    Uses connection pooling for better performance.
    """
    global _admin_client
    
    if _admin_client is None:
        with _admin_client_lock:
            if _admin_client is None:
                supabase_url = os.getenv('SUPABASE_URL')
                service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
                
                if not supabase_url or not service_role_key:
                    raise ValueError("Missing Supabase credentials")
                
                _admin_client = create_client(supabase_url, service_role_key)
    
    return _admin_client


def get_supabase_client(use_admin: bool = False) -> Client:
    """
    Get Supabase client with optional admin privileges.
    Uses request-scoped caching for repeated calls.
    """
    cache_key = f'supabase_client_{use_admin}'
    cache = get_request_cache()
    
    if cache_key in cache:
        return cache[cache_key]
    
    if use_admin:
        client = get_admin_client()
    else:
        if hasattr(current_app, 'supabase_service'):
            client = current_app.supabase_service.supabase
        else:
            raise Exception("Supabase service not available")
    
    cache[cache_key] = client
    return client


def cached_permission_check(f):
    """Decorator to cache permission check results within a request."""
    @wraps(f)
    def wrapper(user_id: str, enterprise_id: str, supabase: Client = None) -> Tuple[bool, str]:
        cache_key = f'perm_{user_id}_{enterprise_id}'
        cache = get_request_cache()
        
        if cache_key in cache:
            return cache[cache_key]
        
        result = f(user_id, enterprise_id, supabase)
        cache[cache_key] = result
        return result
    
    return wrapper


@cached_permission_check
def check_user_is_org_admin(user_id: str, enterprise_id: str, supabase: Client = None) -> Tuple[bool, str]:
    """
    Check if a user is an admin or owner of an organization.
    Results are cached within the request scope.
    
    Returns:
        tuple: (is_admin, reason)
    """
    if supabase is None:
        supabase = get_admin_client()
    
    try:
        # Single query to get enterprise with created_by
        enterprise_result = supabase.table('enterprises').select('id, created_by').eq('id', enterprise_id).execute()
        
        if not enterprise_result.data:
            return False, "Organization not found"
        
        enterprise = enterprise_result.data[0]
        
        # Check if user is the owner
        if enterprise['created_by'] == user_id:
            return True, "owner"
        
        # Check if user is an admin member
        membership_result = supabase.table('organization_users').select('role').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        
        if not membership_result.data:
            return False, "User is not a member of this organization"
        
        role = membership_result.data[0]['role']
        
        if role == 'admin':
            return True, "admin"
        
        return False, f"User role '{role}' does not have permission to manage users"
        
    except Exception as e:
        return False, f"Error checking user permissions: {str(e)}"


def get_cached_user_details(user_id: str, supabase: Client = None) -> Dict[str, Any]:
    """
    Get user details with request-scoped caching.
    """
    cache_key = f'user_{user_id}'
    cache = get_request_cache()
    
    if cache_key in cache:
        return cache[cache_key]
    
    if supabase is None:
        supabase = get_admin_client()
    
    try:
        user_details = supabase.auth.admin.get_user_by_id(user_id)
        if user_details and user_details.user:
            user_metadata = user_details.user.user_metadata or {}
            result = {
                'id': user_id,
                'email': user_details.user.email,
                'first_name': user_metadata.get('first_name', ''),
                'last_name': user_metadata.get('last_name', ''),
                'name': f"{user_metadata.get('first_name', '')} {user_metadata.get('last_name', '')}".strip() or 'Unknown'
            }
        else:
            result = {
                'id': user_id,
                'email': 'Unknown',
                'first_name': '',
                'last_name': '',
                'name': 'Unknown'
            }
    except Exception:
        result = {
            'id': user_id,
            'email': 'Unknown',
            'first_name': '',
            'last_name': '',
            'name': 'Unknown'
        }
    
    cache[cache_key] = result
    return result


def get_cached_enterprise(enterprise_id: str, supabase: Client = None) -> Optional[Dict[str, Any]]:
    """
    Get enterprise details with request-scoped caching.
    """
    cache_key = f'enterprise_{enterprise_id}'
    cache = get_request_cache()
    
    if cache_key in cache:
        return cache[cache_key]
    
    if supabase is None:
        supabase = get_admin_client()
    
    try:
        result = supabase.table('enterprises').select('*').eq('id', enterprise_id).execute()
        enterprise = result.data[0] if result.data else None
        cache[cache_key] = enterprise
        return enterprise
    except Exception:
        return None


def batch_get_user_details(user_ids: List[str], supabase: Client = None) -> Dict[str, Dict[str, Any]]:
    """
    Batch fetch user details for multiple users.
    More efficient than individual fetches.
    """
    if supabase is None:
        supabase = get_admin_client()
    
    cache = get_request_cache()
    results = {}
    uncached_ids = []
    
    # Check cache first
    for user_id in user_ids:
        cache_key = f'user_{user_id}'
        if cache_key in cache:
            results[user_id] = cache[cache_key]
        else:
            uncached_ids.append(user_id)
    
    # Batch fetch uncached users from profiles table (faster than auth API)
    if uncached_ids:
        try:
            profiles_result = supabase.table('profiles').select('id, email, first_name, last_name').in_('id', uncached_ids).execute()
            
            for profile in profiles_result.data or []:
                user_id = profile['id']
                user_data = {
                    'id': user_id,
                    'email': profile.get('email', 'Unknown'),
                    'first_name': profile.get('first_name', ''),
                    'last_name': profile.get('last_name', ''),
                    'name': f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or 'Unknown'
                }
                results[user_id] = user_data
                cache[f'user_{user_id}'] = user_data
        except Exception:
            pass
        
        # Fill in any still-missing users with defaults
        for user_id in uncached_ids:
            if user_id not in results:
                default_data = {
                    'id': user_id,
                    'email': 'Unknown',
                    'first_name': '',
                    'last_name': '',
                    'name': 'Unknown'
                }
                results[user_id] = default_data
                cache[f'user_{user_id}'] = default_data
    
    return results


def check_user_exists_by_email(email: str, supabase: Client = None) -> Tuple[bool, Optional[str]]:
    """
    Check if a user with the given email already exists.
    Optimized to use profiles table first (faster than auth API).
    
    Returns:
        tuple: (user_exists, user_id_if_found)
    """
    normalized_email = email.lower().strip()
    
    if supabase is None:
        supabase = get_admin_client()
    
    # Method 1: Check profiles table (fastest)
    try:
        profile_check = supabase.table('profiles').select('id').ilike('email', normalized_email).limit(1).execute()
        if profile_check.data and len(profile_check.data) > 0:
            return True, profile_check.data[0].get('id')
    except Exception:
        pass
    
    # Method 2: Try admin.get_user_by_email if available
    try:
        if hasattr(supabase.auth.admin, 'get_user_by_email'):
            res = supabase.auth.admin.get_user_by_email(normalized_email)
            maybe_user = getattr(res, 'user', None)
            if maybe_user is None and isinstance(res, dict):
                maybe_user = res.get('user') or res.get('data')
            
            if maybe_user is not None:
                user_id = getattr(maybe_user, 'id', None) or (maybe_user.get('id') if isinstance(maybe_user, dict) else None)
                if user_id:
                    return True, user_id
    except Exception:
        pass
    
    return False, None


def check_user_can_create_organizations(user_id: str, supabase: Client = None, user_metadata: Dict = None) -> Tuple[bool, str]:
    """
    Check if a user can create organizations.
    
    Returns:
        tuple: (can_create, reason)
    """
    if supabase is None:
        supabase = get_admin_client()
    
    try:
        # Check if user is a member of any organization
        result = supabase.table('organization_users').select('id').eq('user_id', user_id).execute()
        
        if result.data:
            return False, "Invited users cannot create organizations. Only organization owners can create new organizations."
        
        # Check if user already owns any organizations
        owned_orgs = supabase.table('enterprises').select('id').eq('created_by', user_id).execute()
        
        if owned_orgs.data:
            return True, "User can create organizations"
        
        # Check signup_type from metadata
        signup_type = None
        if user_metadata:
            signup_type = user_metadata.get('signup_type')
        
        if signup_type is None:
            try:
                user_data = supabase.auth.admin.get_user_by_id(user_id)
                if user_data and getattr(user_data, 'user', None):
                    signup_type = (user_data.user.user_metadata or {}).get('signup_type', 'individual')
            except Exception:
                pass
        
        if signup_type == 'organization':
            return True, "User can create organizations (registered as organization)"
        
        return False, "Individual users cannot create organizations. Only users who registered as organizations can create them."
        
    except Exception as e:
        return False, f"Error checking user permissions: {str(e)}"


@lru_cache(maxsize=1)
def get_frontend_url() -> str:
    """
    Get the frontend URL from environment variable.
    Cached for performance.
    """
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        load_dotenv(env_path)
    except Exception:
        pass
    
    frontend_url = os.environ.get('FRONTEND_URL', '').strip()
    return frontend_url.rstrip('/') if frontend_url else ''


def format_meal_plan_response(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a meal plan for API response.
    Standardizes the response format.
    """
    user_info = plan.get('user_info') or {}
    
    return {
        'id': plan['id'],
        'name': plan.get('name'),
        'start_date': plan.get('start_date'),
        'end_date': plan.get('end_date'),
        'meal_plan': plan.get('meal_plan'),
        'created_at': plan.get('created_at'),
        'updated_at': plan.get('updated_at'),
        'has_sickness': plan.get('has_sickness', False),
        'sickness_type': plan.get('sickness_type', ''),
        'health_assessment': plan.get('health_assessment'),
        'user_info': user_info,
        'is_approved': plan.get('is_approved', True),
        'creator_email': user_info.get('creator_email') if isinstance(user_info, dict) else None,
        'is_created_by_user': user_info.get('is_created_by_user', True) if isinstance(user_info, dict) else True
    }


def require_auth(f):
    """
    Decorator to require authentication.
    Optimized version with better error handling.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'Missing or invalid authorization header'}, 401
        
        token = auth_header.split(' ')[1]
        try:
            supabase = get_supabase_client()
            user = supabase.auth.get_user(token)
            if not user:
                return {'error': 'Invalid token'}, 401
            request.user_id = user.user.id
            request.user_email = user.user.email
            request.user_metadata = getattr(user.user, 'user_metadata', {}) or {}
        except Exception as e:
            return {'error': f'Authentication failed: {str(e)}'}, 401
        
        return f(*args, **kwargs)
    return decorated_function


def require_enterprise_admin(f):
    """
    Decorator to require enterprise admin permissions.
    Combines auth check and permission check.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check auth
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'Missing or invalid authorization header'}, 401
        
        token = auth_header.split(' ')[1]
        try:
            supabase = get_supabase_client()
            user = supabase.auth.get_user(token)
            if not user:
                return {'error': 'Invalid token'}, 401
            request.user_id = user.user.id
            request.user_email = user.user.email
            request.user_metadata = getattr(user.user, 'user_metadata', {}) or {}
        except Exception as e:
            return {'error': f'Authentication failed: {str(e)}'}, 401
        
        # Then check enterprise permission
        enterprise_id = kwargs.get('enterprise_id')
        if enterprise_id:
            is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id)
            if not is_admin:
                return {'success': False, 'error': f'Access denied: {reason}'}, 403
        
        return f(*args, **kwargs)
    return decorated_function


# Request lifecycle hooks
def init_request_cache():
    """Initialize request cache at the start of each request."""
    clear_request_cache()


def cleanup_request_cache(response):
    """Cleanup request cache at the end of each request."""
    clear_request_cache()
    return response
