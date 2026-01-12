"""
Enterprise Management Routes
Handles organization/enterprise registration, user invitations, and management
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from typing import Optional
import uuid
import secrets
import os
from datetime import datetime, timedelta, timezone
from services.email_service import email_service
from supabase import Client

def get_frontend_url():
    """Get the frontend URL from FRONTEND_URL environment variable only"""
    # Ensure .env is loaded (in case function is called before app initialization)
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        load_dotenv(env_path)
    except:
        pass  # If dotenv fails, assume env vars are already loaded
    
    # Only use FRONTEND_URL from environment variable
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        frontend_url = frontend_url.strip()
        if frontend_url:
            print(f"🔍 Using FRONTEND_URL from env: {frontend_url}")
            return frontend_url.rstrip('/')
    
    # If FRONTEND_URL is not set, log warning and return empty string
    print(f"⚠️ WARNING: FRONTEND_URL not set in environment.")
    print(f"⚠️ Please set FRONTEND_URL in backend/.env file")
    return ''

enterprise_bp = Blueprint('enterprise', __name__)

def get_supabase_client(use_admin: bool = False) -> Client:
    """Helper function to get the Supabase client from the app context."""
    if use_admin:
        # Use admin client that bypasses RLS
        from supabase import create_client
        import os
        return create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
    
    if hasattr(current_app, 'supabase_service'):
        return current_app.supabase_service.supabase
    raise Exception("Supabase service not available")

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        try:
            supabase = get_supabase_client()
            user = supabase.auth.get_user(token)
            if not user:
                return jsonify({'error': 'Invalid token'}), 401
            request.user_id = user.user.id
            request.user_email = user.user.email
            request.user_metadata = getattr(user.user, 'user_metadata', {}) or {}
        except Exception as e:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def check_user_is_org_admin(user_id: str, enterprise_id: str, supabase: Client) -> tuple[bool, str]:
    """
    Check if a user is an admin or owner of an organization.
    
    CRITICAL: Owner is identified by enterprises.created_by and is NOT in organization_users table.
    
    Returns:
        tuple: (is_admin, reason)
    """
    try:
        current_app.logger.info(f"[PERMISSION] Checking permissions for user {user_id} on enterprise {enterprise_id}")
        current_app.logger.info(f"[PERMISSION] Using admin client: {supabase is not None}")
        
        # FIRST: Check if enterprise exists
        enterprise_result = supabase.table('enterprises').select('id, created_by').eq('id', enterprise_id).execute()
        
        current_app.logger.info(f"[PERMISSION] Enterprise query result: {enterprise_result.data}")
        
        if not enterprise_result.data:
            current_app.logger.error(f"[PERMISSION] Enterprise {enterprise_id} not found in database")
            # Try to list all enterprises to debug
            try:
                all_enterprises = supabase.table('enterprises').select('id, name, created_by').limit(5).execute()
                current_app.logger.info(f"[PERMISSION] Sample enterprises in DB: {all_enterprises.data}")
            except Exception as debug_error:
                current_app.logger.error(f"[PERMISSION] Could not list enterprises: {debug_error}")
            return False, "Organization not found"
        
        enterprise = enterprise_result.data[0]
        
        # SECOND: Check if user is the owner (created_by)
        # Owner has FULL access and is NOT in organization_users table
        if enterprise['created_by'] == user_id:
            current_app.logger.info(f"[PERMISSION] ✅ User {user_id} is the owner of enterprise {enterprise_id}")
            return True, "owner"
        
        # THIRD: Fallback - Check if user is an admin member in organization_users table
        current_app.logger.info(f"[PERMISSION] User is not owner, checking organization_users table")
        membership_result = supabase.table('organization_users').select('role').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        
        if not membership_result.data:
            current_app.logger.warning(f"[PERMISSION] ❌ User {user_id} is not a member of enterprise {enterprise_id}")
            return False, "User is not a member of this organization"
        
        role = membership_result.data[0]['role']
        current_app.logger.info(f"[PERMISSION] User has role: {role}")
        
        # Only allow admin role from organization_users (not regular members)
        if role == 'admin':
            current_app.logger.info(f"[PERMISSION] ✅ User has admin role")
            return True, f"admin"
        
        current_app.logger.warning(f"[PERMISSION] ❌ User role '{role}' does not have permission")
        return False, f"User role '{role}' does not have permission to manage users"
        
    except Exception as e:
        current_app.logger.error(f"[PERMISSION] ❌ Exception: {str(e)}", exc_info=True)
        return False, f"Error checking user permissions: {str(e)}"


def check_user_exists_by_email(supabase: Client, email: str) -> tuple[bool, Optional[str]]:
    """
    Check if a user with the given email already exists in Supabase.
    
    Uses multiple methods to check:
    1. Check profiles table (fastest)
    2. Try admin.get_user_by_email (if available)
    3. Fallback to paginated list_users
    
    Returns:
        tuple: (user_exists, user_id_if_found)
    """
    normalized_email = email.lower().strip()
    current_app.logger.info(f"[USER_CHECK] Checking if user exists with email: {normalized_email}")
    
    # Method 1: Check profiles table (fastest and most reliable)
    admin_client = None
    try:
        admin_client = get_supabase_client(use_admin=True)
        if admin_client:
            profile_check = admin_client.table('profiles').select('id, email').ilike('email', normalized_email).limit(1).execute()
            if profile_check.data and len(profile_check.data) > 0:
                user_id = profile_check.data[0].get('id')
                current_app.logger.info(f"[USER_CHECK] ✅ User found in profiles table: {user_id}")
                return True, user_id
    except Exception as profiles_err:
        current_app.logger.warning(f"[USER_CHECK] Profiles check failed: {str(profiles_err)}")
    
    # Method 2: Try admin.get_user_by_email (if available)
    try:
        if not admin_client:
            admin_client = get_supabase_client(use_admin=True)
        if admin_client and hasattr(admin_client, 'auth') and hasattr(admin_client.auth, 'admin'):
            try:
                user_res = getattr(admin_client.auth.admin, 'get_user_by_email', None)
                if callable(user_res):
                    res = admin_client.auth.admin.get_user_by_email(normalized_email)
                    # Handle different response formats
                    maybe_user = getattr(res, 'user', None)
                    if maybe_user is None and isinstance(res, dict):
                        maybe_user = res.get('user') or res.get('data')
                    
                    if maybe_user is not None:
                        user_id = getattr(maybe_user, 'id', None) or (maybe_user.get('id') if isinstance(maybe_user, dict) else None)
                        if user_id:
                            current_app.logger.info(f"[USER_CHECK] ✅ User found via get_user_by_email: {user_id}")
                            return True, user_id
            except Exception as get_email_err:
                current_app.logger.info(f"[USER_CHECK] get_user_by_email unavailable/failed, falling back to list: {str(get_email_err)}")
                
                # Method 3: Paginated list fallback
                try:
                    per_page = 200
                    for page in range(1, 6):  # Check first 5 pages (1000 users max)
                        try:
                            try:
                                admin_res = admin_client.auth.admin.list_users(page=page, per_page=per_page)
                            except TypeError:
                                admin_res = admin_client.auth.admin.list_users(page, per_page)
                        except Exception as list_err:
                            current_app.logger.warning(f"[USER_CHECK] list_users failed on page {page}: {str(list_err)}")
                            break
                        
                        users_list = []
                        try:
                            data_obj = getattr(admin_res, 'data', None)
                            if isinstance(data_obj, dict) and isinstance(data_obj.get('users'), list):
                                users_list = data_obj.get('users')
                            else:
                                users_list = getattr(admin_res, 'users', None) or (data_obj if isinstance(data_obj, list) else [])
                        except Exception:
                            pass
                        
                        if not users_list:
                            break
                        
                        # Search for matching email
                        for user in users_list:
                            user_email = getattr(user, 'email', None) or (user.get('email') if isinstance(user, dict) else None)
                            if user_email and user_email.lower() == normalized_email:
                                user_id = getattr(user, 'id', None) or (user.get('id') if isinstance(user, dict) else None)
                                if user_id:
                                    current_app.logger.info(f"[USER_CHECK] ✅ User found via list_users: {user_id}")
                                    return True, user_id
                        
                        # If we got fewer users than per_page, we've reached the end
                        if len(users_list) < per_page:
                            break
                except Exception as list_fallback_err:
                    current_app.logger.warning(f"[USER_CHECK] List fallback failed: {str(list_fallback_err)}")
    except Exception as e:
        current_app.logger.warning(f"[USER_CHECK] Error checking user existence: {str(e)}")
    
    current_app.logger.info(f"[USER_CHECK] ❌ User not found with email: {normalized_email}")
    return False, None


def check_user_can_create_organizations(user_id: str, supabase: Client, user_metadata: dict | None = None) -> tuple[bool, str]:
    """
    Check if a user can create organizations.
    Users can create organizations if:
    1. They are NOT invited members of other organizations, AND
    2. They either own organizations OR they signed up as an organization user
    
    Returns:
        tuple: (can_create, reason)
    """
    try:
        current_app.logger.info(f"[PERMISSION CHECK] Checking permissions for user {user_id}")
        
        # Check if user is a member (not owner) of any organization
        result = supabase.table('organization_users').select('id, role').eq('user_id', user_id).execute()
        current_app.logger.info(f"[PERMISSION CHECK] Organization memberships: {len(result.data) if result.data else 0}")
        
        if result.data:
            # User is a member of at least one organization
            current_app.logger.info(f"[PERMISSION CHECK] User is already a member of an organization")
            return False, "Invited users cannot create organizations. Only organization owners can create new organizations."
        
        # Check if user already owns any organizations
        owned_orgs = supabase.table('enterprises').select('id').eq('created_by', user_id).execute()
        current_app.logger.info(f"[PERMISSION CHECK] Owned organizations: {len(owned_orgs.data) if owned_orgs.data else 0}")
        
        # If user owns organizations, they can create more
        if owned_orgs.data:
            current_app.logger.info(f"[PERMISSION CHECK] ✅ User already owns organizations, can create more")
            return True, "User can create organizations"
        
        # If user doesn't own any organizations, check if they signed up as an organization user
        # Check user metadata from auth to see signup_type
        try:
            current_app.logger.info(f"[PERMISSION CHECK] Checking signup_type from user metadata")
            
            metadata_source = user_metadata or {}
            signup_type = metadata_source.get('signup_type')
            
            if signup_type is None:
                current_app.logger.info("[PERMISSION CHECK] No signup_type in request metadata, querying admin API")
                admin_client = get_supabase_client(use_admin=True)
                user_data = admin_client.auth.admin.get_user_by_id(user_id)
                if user_data and getattr(user_data, 'user', None):
                    metadata_source = user_data.user.user_metadata or {}
                    signup_type = metadata_source.get('signup_type', 'individual')
            
            if signup_type:
                current_app.logger.info(f"[PERMISSION CHECK] User signup_type: {signup_type}")
                if signup_type == 'organization':
                    current_app.logger.info(f"[PERMISSION CHECK] ✅ User signed up as organization, can create")
                    return True, "User can create organizations (registered as organization)"
                current_app.logger.info(f"[PERMISSION CHECK] ❌ User signed up as individual, cannot create")
                return False, "Individual users cannot create organizations. Only users who registered as organizations can create them."
            
            current_app.logger.warning(f"[PERMISSION CHECK] No user metadata found after fallback")
            return False, "Cannot verify user type. Please contact support."
                
        except Exception as metadata_error:
            current_app.logger.error(f"[PERMISSION CHECK] Error checking user metadata: {str(metadata_error)}", exc_info=True)
            return False, "Cannot verify user permissions. Please contact support."
        
    except Exception as e:
        current_app.logger.error(f"[PERMISSION CHECK]  Error checking user permissions: {str(e)}", exc_info=True)
        return False, f"Error checking user permissions: {str(e)}"


@enterprise_bp.route('/api/enterprise/register', methods=['POST'])
@require_auth
def register_enterprise():
    """Register a new enterprise/organization"""
    try:
        data = request.get_json()
        current_app.logger.info(f"[ORG REGISTER] Starting organization registration for user {request.user_id}")
        current_app.logger.info(f"[ORG REGISTER] Request data: {data}")
        
        # Validate required fields
        required_fields = ['name', 'email', 'organization_type']
        for field in required_fields:
            if field not in data:
                current_app.logger.error(f"[ORG REGISTER] Missing required field: {field}")
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get Supabase client with better error handling
        try:
            supabase = get_supabase_client()
            if not supabase:
                current_app.logger.error(f"[ORG REGISTER] Supabase client is None")
                return jsonify({'error': 'Database connection unavailable. Please try again later.'}), 503
        except Exception as supabase_error:
            error_msg = str(supabase_error).lower()
            current_app.logger.error(f"[ORG REGISTER] Failed to get Supabase client: {str(supabase_error)}", exc_info=True)
            if 'disconnected' in error_msg or 'connection' in error_msg or 'unavailable' in error_msg:
                return jsonify({'error': 'Database connection unavailable. Please try again later.'}), 503
            return jsonify({'error': 'Failed to connect to database. Please try again later.'}), 503
        
        # Check if user can create organizations
        try:
            current_app.logger.info(f"[ORG REGISTER] Checking if user {request.user_id} can create organizations")
            can_create, reason = check_user_can_create_organizations(request.user_id, supabase, getattr(request, 'user_metadata', None))
            current_app.logger.info(f"[ORG REGISTER] Permission check result: can_create={can_create}, reason={reason}")
        except Exception as perm_error:
            current_app.logger.error(f"[ORG REGISTER] Error checking permissions: {str(perm_error)}", exc_info=True)
            return jsonify({'error': 'Failed to verify permissions. Please try again later.'}), 500
        
        if not can_create:
            current_app.logger.error(f"[ORG REGISTER] User {request.user_id} cannot create organizations: {reason}")
            return jsonify({'error': reason}), 403
        
        # Check if enterprise with this email already exists
        try:
            existing = supabase.table('enterprises').select('id').eq('email', data['email']).execute()
            if existing.data:
                current_app.logger.error(f"[ORG REGISTER] Organization with email {data['email']} already exists")
                return jsonify({'error': 'An organization with this email already exists'}), 400
        except Exception as check_error:
            current_app.logger.error(f"[ORG REGISTER] Error checking existing enterprise: {str(check_error)}", exc_info=True)
            return jsonify({'error': 'Failed to verify organization email. Please try again later.'}), 500
        
        # Create enterprise
        enterprise_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'address': data.get('address'),
            'organization_type': data['organization_type'],
            'created_by': request.user_id
        }
        
        try:
            current_app.logger.info(f"[ORG REGISTER] Creating enterprise with data: {enterprise_data}")
            result = supabase.table('enterprises').insert(enterprise_data).execute()
        except Exception as insert_error:
            error_msg = str(insert_error).lower()
            current_app.logger.error(f"[ORG REGISTER] Error inserting enterprise: {str(insert_error)}", exc_info=True)
            if 'unique' in error_msg or 'duplicate' in error_msg:
                return jsonify({'error': 'An organization with this email already exists'}), 400
            if 'disconnected' in error_msg or 'connection' in error_msg:
                return jsonify({'error': 'Database connection lost. Please try again.'}), 503
            return jsonify({'error': 'Failed to create organization. Please try again later.'}), 500
        
        if not result.data:
            current_app.logger.error(f"[ORG REGISTER] Failed to create enterprise - no data returned from Supabase")
            return jsonify({'error': 'Failed to create enterprise. Please try again later.'}), 500
        
        current_app.logger.info(f"[ORG REGISTER] ✅ Successfully created enterprise: {result.data[0]}")
        return jsonify({
            'success': True,
            'message': 'Enterprise registered successfully',
            'enterprise': result.data[0]
        }), 201
        
    except Exception as e:
        error_msg = str(e).lower()
        current_app.logger.error(f"[ORG REGISTER] Unexpected exception during organization registration: {str(e)}", exc_info=True)
        # Provide user-friendly error messages
        if 'disconnected' in error_msg or 'connection' in error_msg:
            return jsonify({'error': 'Database connection unavailable. Please try again later.'}), 503
        if 'timeout' in error_msg:
            return jsonify({'error': 'Request timed out. Please try again.'}), 504
        # Generic error message to avoid exposing internal details
        return jsonify({'error': 'Failed to register organization. Please try again later.'}), 500


@enterprise_bp.route('/api/enterprise/can-create', methods=['GET'])
@require_auth
def can_create_organization():
    """Check if the current user can create organizations"""
    try:
        supabase = get_supabase_client()
        can_create, reason = check_user_can_create_organizations(request.user_id, supabase, getattr(request, 'user_metadata', None))
        
        return jsonify({
            'success': True,
            'can_create': can_create,
            'reason': reason
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to check permissions: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/my-enterprises', methods=['GET'])
@require_auth
def get_my_enterprises():
    """Get all enterprises owned by the current user"""
    user_id = getattr(request, 'user_id', None)
    user_email = getattr(request, 'user_email', 'Unknown')
    
    current_app.logger.info(f"[MY_ENTERPRISES] Getting enterprises for user: {user_id} ({user_email})")
    print(f"[MY_ENTERPRISES] Getting enterprises for user: {user_id} ({user_email})")
    
    if not user_id:
        current_app.logger.error("[MY_ENTERPRISES] No user_id found in request")
        return jsonify({'error': 'User ID not found in request', 'success': False}), 401
    
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Get enterprises owned by user with retry logic for connection issues
        max_retries = 3
        retry_count = 0
        last_error = None
        
        while retry_count < max_retries:
            try:
                current_app.logger.info(f"[MY_ENTERPRISES] Querying enterprises table for created_by={user_id}")
                print(f"[MY_ENTERPRISES] Querying enterprises table for created_by={user_id}")
                
                result = supabase.table('enterprises').select('*').eq('created_by', user_id).execute()
                
                current_app.logger.info(f"[MY_ENTERPRISES] Query result: {len(result.data) if result.data else 0} enterprises found")
                print(f"[MY_ENTERPRISES] Query result: {result.data}")
                
                # Return enterprises without stats for now
                enterprises = result.data or []
                current_app.logger.info(f"[MY_ENTERPRISES] Returning {len(enterprises)} enterprises")
                print(f"[MY_ENTERPRISES] Returning {len(enterprises)} enterprises")
                
                return jsonify({
                    'success': True,
                    'enterprises': enterprises
                }), 200
            except Exception as e:
                retry_count += 1
                last_error = e
                error_msg = str(e)
                current_app.logger.warning(f"[MY_ENTERPRISES] Attempt {retry_count}/{max_retries} failed: {error_msg}")
                print(f"[MY_ENTERPRISES] Attempt {retry_count}/{max_retries} failed: {error_msg}")
                if retry_count < max_retries:
                    import time
                    time.sleep(0.5)  # Wait 500ms before retry
                    continue
                raise e
        
    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f'[MY_ENTERPRISES] Failed to fetch enterprises after {max_retries} retries: {error_msg}')
        print(f'[MY_ENTERPRISES] Failed to fetch enterprises: {error_msg}')
        return jsonify({
            'error': f'Failed to fetch enterprises: {error_msg}',
            'success': False
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>', methods=['GET'])
@require_auth
def get_enterprise(enterprise_id):
    """Get enterprise details"""
    try:
        supabase = get_supabase_client()
        
        # Get enterprise
        result = supabase.table('enterprises').select('*').eq('id', enterprise_id).eq('created_by', request.user_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Enterprise not found or access denied'}), 404
        
        enterprise = result.data[0]
        
        # Get statistics
        stats = supabase.rpc('get_enterprise_stats', {'enterprise_uuid': enterprise_id}).execute()
        enterprise['stats'] = stats.data if stats.data else {}
        
        return jsonify({
            'success': True,
            'enterprise': enterprise
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch enterprise: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>', methods=['PUT'])
@require_auth
def update_enterprise(enterprise_id):
    """Update enterprise details"""
    try:
        data = request.get_json()
        supabase = get_supabase_client()
        
        # Verify ownership
        enterprise = supabase.table('enterprises').select('id').eq('id', enterprise_id).eq('created_by', request.user_id).execute()
        if not enterprise.data:
            return jsonify({'error': 'Enterprise not found or access denied'}), 404
        
        # Update enterprise
        update_data = {}
        allowed_fields = ['name', 'email', 'phone', 'address', 'organization_type', 'max_users', 'settings', 'is_active']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = supabase.table('enterprises').update(update_data).eq('id', enterprise_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Enterprise updated successfully',
            'enterprise': result.data[0] if result.data else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update enterprise: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/users', methods=['GET'])
@require_auth
def get_enterprise_users(enterprise_id):
    """
    Get all users in an enterprise (organization_users table only).
    
    Note: The enterprise owner is NOT included in this list.
    Only invited/added users are stored in organization_users table.
    
    Returns:
        - List of users with their details
        - Each user has: id, user_id, email, role, status, joined_at
    """
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get organization users (excludes owner - they're not in this table)
        result = supabase.table('organization_users').select('*').eq('enterprise_id', enterprise_id).execute()
        
        # Get all accepted invitations for this enterprise to link with users
        invitations_result = supabase.table('invitations').select('*').eq('enterprise_id', enterprise_id).eq('status', 'accepted').execute()
        accepted_invitations_by_email = {}
        accepted_invitations_by_user_id = {}
        for inv in invitations_result.data:
            accepted_invitations_by_email[inv['email']] = inv
            if inv.get('accepted_by'):
                accepted_invitations_by_user_id[inv['accepted_by']] = inv
        
        # Format response with user details from auth
        users = []
        for org_user in result.data:
            # Get user details from auth
            try:
                user_details = supabase.auth.admin.get_user_by_id(org_user['user_id'])
                if user_details and user_details.user:
                    user_metadata = user_details.user.user_metadata or {}
                    first_name = user_metadata.get('first_name', '')
                    last_name = user_metadata.get('last_name', '')
                    email = user_details.user.email
                else:
                    first_name = last_name = email = 'Unknown'
            except:
                first_name = last_name = email = 'Unknown'
            
            # Find the invitation this user accepted (check by user_id first, then email)
            accepted_invitation = None
            if org_user['user_id'] in accepted_invitations_by_user_id:
                accepted_invitation = accepted_invitations_by_user_id[org_user['user_id']]
            elif email in accepted_invitations_by_email:
                accepted_invitation = accepted_invitations_by_email[email]
            
            user_data = {
                'id': org_user['id'],
                'user_id': org_user['user_id'],
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'role': org_user['role'],
                'status': org_user.get('status', 'active'),
                'joined_at': org_user['joined_at'],
                'notes': org_user.get('notes'),
                'metadata': org_user.get('metadata', {}),
                # Add invitation information
                'accepted_invitation': {
                    'id': accepted_invitation['id'] if accepted_invitation else None,
                    'accepted_at': accepted_invitation['accepted_at'] if accepted_invitation else None,
                    'invited_by': accepted_invitation.get('invited_by') if accepted_invitation else None,
                } if accepted_invitation else None,
                'has_accepted_invitation': accepted_invitation is not None
            }
            users.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users,
            'total_count': len(users)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch enterprise users: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to fetch users: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/invite', methods=['POST'])
@require_auth
def invite_user(enterprise_id):
    """Invite a user to the enterprise"""
    print(f"[INVITE] ========== ROUTE HANDLER CALLED ==========")
    print(f"[INVITE] Enterprise ID: {enterprise_id}")
    print(f"[INVITE] User ID: {request.user_id}")
    try:
        current_app.logger.info(f"[INVITE] ========== Starting invitation process ==========")
        current_app.logger.info(f"[INVITE] Enterprise ID: {enterprise_id}")
        current_app.logger.info(f"[INVITE] User ID: {request.user_id}")
        
        data = request.get_json()
        current_app.logger.info(f"[INVITE] Request data: {data}")
        current_app.logger.info(f"[INVITE] Request headers: {dict(request.headers)}")
        
        # Validate enterprise_id is not None or 'undefined'
        if not enterprise_id or enterprise_id == 'undefined' or enterprise_id == 'null':
            current_app.logger.error(f"[INVITE] ❌ Invalid enterprise_id: '{enterprise_id}'")
            return jsonify({
                'success': False,
                'error': 'No organization selected. Please select an organization first.',
                'error_code': 'INVALID_ENTERPRISE_ID'
            }), 400
        
        # Validate required fields
        if not data:
            current_app.logger.error(f"[INVITE] ❌ No data provided in request body")
            return jsonify({
                'success': False,
                'error': 'Request body is empty',
                'error_code': 'EMPTY_REQUEST'
            }), 400
            
        if 'email' not in data or not data.get('email', '').strip():
            current_app.logger.error(f"[INVITE] ❌ Email is missing or empty")
            return jsonify({
                'success': False,
                'error': 'Email address is required',
                'error_code': 'MISSING_EMAIL'
            }), 400
        
        email = data['email'].lower().strip()
        current_app.logger.info(f"[INVITE] Inviting email: {email}")
        
        # Validate role
        ALLOWED_ROLES = ['client', 'patient', 'doctor', 'nutritionist']
        role = data.get('role', 'patient').lower().strip()
        
        # Normalize "doctors" to "doctor"
        if role == 'doctors':
            role = 'doctor'
            current_app.logger.info(f"[INVITE] Normalized 'doctors' to 'doctor'")
        
        if role not in ALLOWED_ROLES:
            current_app.logger.error(f"[INVITE] Invalid role: {role}")
            return jsonify({'success': False, 'error': f'Invalid role. Must be one of: {", ".join(ALLOWED_ROLES)}'}), 400
        
        current_app.logger.info(f"[INVITE] Role validated: {role}")
        
        # Use admin client to bypass RLS for permission checks
        # This is necessary because the owner is NOT in organization_users table
        supabase = get_supabase_client(use_admin=True)
        
        # FIRST: Verify enterprise exists
        current_app.logger.info(f"[INVITE] Checking if enterprise {enterprise_id} exists")
        enterprise_check = supabase.table('enterprises').select('*').eq('id', enterprise_id).execute()
        if not enterprise_check.data:
            current_app.logger.error(f"[INVITE] Enterprise {enterprise_id} not found")
            return jsonify({'success': False, 'error': 'Organization not found'}), 404
        
        current_app.logger.info(f"[INVITE] Enterprise exists: {enterprise_check.data[0]['name']}")
        
        # SECOND: Verify user has permission to invite users (must be owner or admin)
        # Check if user is the owner (enterprises.created_by)
        current_app.logger.info(f"[INVITE] Checking permissions for user {request.user_id}")
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        current_app.logger.info(f"[INVITE] Permission check result: is_admin={is_admin}, reason={reason}")
        
        if not is_admin:
            current_app.logger.error(f"[INVITE] Access denied: {reason}")
            return jsonify({'success': False, 'error': f'Access denied: {reason}'}), 403
        
        # Get enterprise details (already fetched above, use that data)
        enterprise_data = enterprise_check.data[0]
        current_app.logger.info(f"[INVITE] Enterprise max_users: {enterprise_data.get('max_users', 100)}")
        
        # Check user limit
        current_app.logger.info(f"[INVITE] Checking user limit")
        current_users = supabase.table('organization_users').select('id', count='exact').eq('enterprise_id', enterprise_id).execute()
        current_count = current_users.count if current_users.count is not None else 0
        max_users = enterprise_data.get('max_users', 100)
        
        current_app.logger.info(f"[INVITE] Current users: {current_count}, Max users: {max_users}")
        
        if current_count >= max_users:
            current_app.logger.error(f"[INVITE] User limit reached")
            return jsonify({'success': False, 'error': f"Maximum user limit ({max_users}) reached"}), 400
        
        # Check if user already has an account with meallensai
        # This prevents inviting users who already have accounts
        current_app.logger.info(f"[INVITE] Checking if user with email {email} already has an account")
        user_exists = False
        existing_user_id = None
        try:
            user_exists, existing_user_id = check_user_exists_by_email(supabase, email)
            if user_exists:
                current_app.logger.warning(f"[INVITE] ❌ User with email {email} already has an account (user_id: {existing_user_id})")
                
                # Also check if they're already a member of this organization
                if existing_user_id:
                    try:
                        existing_member = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', existing_user_id).execute()
                        if existing_member.data:
                            current_app.logger.warning(f"[INVITE] User is already a member")
                            return jsonify({'success': False, 'error': 'User is already a member of this organization'}), 400
                    except Exception as member_check_error:
                        current_app.logger.warning(f"[INVITE] Could not check existing membership: {str(member_check_error)}")
                
                return jsonify({
                    'success': False,
                    'error': 'This user already has an account with MealLens AI. They cannot be invited.',
                    'error_code': 'USER_ALREADY_EXISTS'
                }), 400
        except Exception as user_check_error:
            # If we can't check (e.g., rate limit), log but continue
            # We'll catch duplicates later if needed
            current_app.logger.warning(f"[INVITE] Could not check if user exists: {str(user_check_error)}")
        
        # Check if user is already invited
        current_app.logger.info(f"[INVITE] Checking for existing invitation")
        existing_invitation = supabase.table('invitations').select('id').eq('enterprise_id', enterprise_id).eq('email', email).eq('status', 'pending').execute()
        if existing_invitation.data:
            current_app.logger.warning(f"[INVITE] User already has pending invitation")
            return jsonify({'success': False, 'error': 'User already has a pending invitation'}), 400
        
        # Generate unique invitation token
        invitation_token = secrets.token_urlsafe(32)
        current_app.logger.info(f"[INVITE] Generated invitation token")
        
        # Create invitation
        invitation_data = {
            'enterprise_id': enterprise_id,
            'email': email,
            'invited_by': request.user_id,
            'invitation_token': invitation_token,
            'role': role,  # Use validated role
            'message': data.get('message'),
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        
        current_app.logger.info(f"[INVITE] Creating invitation with data: {invitation_data}")
        
        # Wrap in try/except for unique constraint violations
        try:
            result = supabase.table('invitations').insert(invitation_data).execute()
            current_app.logger.info(f"[INVITE] Invitation insert result: {result}")
            
            if not result.data:
                current_app.logger.error(f"[INVITE] Failed to create invitation - no data returned")
                return jsonify({'success': False, 'error': 'Failed to create invitation'}), 500
            
            invitation = result.data[0]
            current_app.logger.info(f"[INVITE] ✅ Invitation created successfully: {invitation['id']}")
            
        except Exception as insert_error:
            current_app.logger.error(f"[INVITE] ❌ Invitation insert failed: {str(insert_error)}", exc_info=True)
            
            # Check for unique constraint violation
            error_msg = str(insert_error).lower()
            if 'unique' in error_msg or 'duplicate' in error_msg:
                return jsonify({'success': False, 'error': 'An invitation for this email already exists'}), 400
            
            return jsonify({'success': False, 'error': f'Failed to create invitation: {str(insert_error)}'}), 500
        
        # Create invitation link using dynamic URL detection
        frontend_url = get_frontend_url()
        invitation_link = f"{frontend_url}/accept-invitation?token={invitation_token}"
        current_app.logger.info(f"[INVITE] Invitation link: {invitation_link}")
        
        # Get inviter name from user (with error handling for rate limits)
        inviter_name = 'A team member'
        try:
            inviter_user = supabase.auth.admin.get_user_by_id(request.user_id)
            if inviter_user and hasattr(inviter_user, 'user'):
                inviter_name = inviter_user.user.email
            current_app.logger.info(f"[INVITE] Inviter name: {inviter_name}")
        except Exception as e:
            current_app.logger.warning(f"[INVITE] Could not fetch inviter details: {str(e)}")
        
        # Send invitation email with timeout protection
        # IMPORTANT: Invitation is already created above, so we continue even if email fails
        email_sent = False
        email_error_message = None
        try:
            current_app.logger.info(f"[INVITE] Attempting to send invitation email to {email}")
            
            # Check if email service is configured
            if not email_service.is_configured:
                current_app.logger.warning(f"[INVITE] Email service not configured")
                current_app.logger.warning(f"[INVITE] SMTP_USER: {'SET' if email_service.smtp_user else 'NOT SET'}")
                current_app.logger.warning(f"[INVITE] SMTP_PASSWORD: {'SET' if email_service.smtp_password else 'NOT SET'}")
                email_error_message = "Email service not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables."
            else:
                # Use a thread to send email asynchronously with timeout
                import threading
                
                email_result = {'sent': False, 'error': None}
                
                def send_email_async():
                    try:
                        result = email_service.send_invitation_email(
                            to_email=email,
                            enterprise_name=enterprise_data['name'],
                            inviter_name=inviter_name,
                            invitation_link=invitation_link,
                            custom_message=data.get('message')
                        )
                        email_result['sent'] = result
                        if not result and hasattr(email_service, 'last_error_message'):
                            email_result['error'] = email_service.last_error_message
                    except Exception as e:
                        current_app.logger.error(f"[INVITE] Email thread error: {e}")
                        email_result['sent'] = False
                        email_result['error'] = str(e)
                
                email_thread = threading.Thread(target=send_email_async)
                email_thread.daemon = True
                email_thread.start()
                
                # Wait up to 10 seconds for email to send (increased from 5)
                email_thread.join(timeout=10.0)
                
                if email_thread.is_alive():
                    current_app.logger.warning(f"[INVITE] Email sending timed out after 10 seconds, but invitation was created successfully")
                    email_sent = False
                    email_error_message = "Email sending timed out. The invitation was created - you can share the link manually."
                else:
                    email_sent = email_result['sent']
                    current_app.logger.info(f"[INVITE] Email sent status: {email_sent}")
                    if not email_sent:
                        email_error_message = email_result.get('error') or "Failed to send email. The invitation was created - you can share the link manually."
                
        except Exception as email_error:
            current_app.logger.error(f"[INVITE] Email service error: {email_error}", exc_info=True)
            email_sent = False
            email_error_message = f"Email error: {str(email_error)}. The invitation was created - you can share the link manually."
        
        current_app.logger.info(f"[INVITE] ✅ Invitation process completed successfully")
        
        return jsonify({
            'success': True,
            'message': 'Invitation created successfully',
            'invitation': invitation,
            'invitation_link': invitation_link,
            'email_sent': email_sent,
            'email_error': email_error_message
        }), 201
        
    except Exception as e:
        print(f"[INVITE] ❌ CRITICAL ERROR: {str(e)}")
        import traceback
        print(f"[INVITE] Traceback: {traceback.format_exc()}")
        current_app.logger.error(f"[INVITE] ❌ CRITICAL ERROR: {str(e)}", exc_info=True)
        current_app.logger.error(f"[INVITE] Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/invitations', methods=['GET'])
@require_auth
def get_invitations(enterprise_id):
    """Get all invitations for an enterprise"""
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Get invitations
        result = supabase.table('invitations').select('*').eq('enterprise_id', enterprise_id).order('sent_at', desc=True).execute()
        
        return jsonify({
            'success': True,
            'invitations': result.data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch invitations: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/invitation/<invitation_id>/cancel', methods=['POST'])
@require_auth
def cancel_invitation(invitation_id):
    """Cancel a pending invitation"""
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Get invitation and related enterprise info using admin client (bypasses RLS)
        invitation_result = supabase.table('invitations').select('''
            id,
            enterprise_id,
            status,
            enterprises!inner (
                id,
                name,
                created_by
            )
        ''').eq('id', invitation_id).execute()
        
        if not invitation_result.data:
            return jsonify({
                'success': False,
                'error': 'Invitation not found'
            }), 404
        
        invitation = invitation_result.data[0]
        enterprise_id = invitation['enterprise_id']
        
        # Verify user has permission (owner or admin) to manage invitations
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Only pending invitations can be cancelled
        if invitation.get('status') != 'pending':
            return jsonify({
                'success': False,
                'error': f"Cannot cancel invitation with status '{invitation.get('status')}'"
            }), 400
        
        # Cancel invitation
        supabase.table('invitations').update({'status': 'cancelled'}).eq('id', invitation_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Invitation cancelled successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"[INVITE] Failed to cancel invitation {invitation_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Failed to cancel invitation: {str(e)}'
        }), 500


@enterprise_bp.route('/api/test-email', methods=['POST'])
@require_auth
def test_email():
    """Test endpoint to send a test email"""
    try:
        data = request.get_json()
        test_email_address = data.get('email', 'computervisionafrica@gmail.com')
        
        current_app.logger.info(f"[TEST_EMAIL] Testing email send to {test_email_address}")
        
        # Check email service configuration
        email_config_status = {
            'is_configured': email_service.is_configured,
            'smtp_host': email_service.smtp_host,
            'smtp_port': email_service.smtp_port,
            'smtp_user': email_service.smtp_user if email_service.smtp_user else 'NOT SET',
            'from_email': email_service.from_email,
            'from_name': email_service.from_name,
            'port_candidates': email_service.smtp_port_candidates,
            'timeout': email_service.smtp_timeout
        }
        
        current_app.logger.info(f"[TEST_EMAIL] Email config: {email_config_status}")
        
        if not email_service.is_configured:
            return jsonify({
                'success': False,
                'error': 'Email service is not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.',
                'config': email_config_status
            }), 400
        
        # Create a simple test email
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Test Email from MeallensAI'
        msg['From'] = f'{email_service.from_name} <{email_service.from_email}>'
        msg['To'] = test_email_address
        
        html_body = """
        <html>
        <body>
            <h2>Test Email from MeallensAI</h2>
            <p>This is a test email to verify that the email service is working correctly.</p>
            <p>If you received this email, the SMTP configuration is correct!</p>
            <p>Time sent: {}</p>
        </body>
        </html>
        """.format(datetime.now(timezone.utc).isoformat())
        
        text_body = f"""
        Test Email from MeallensAI
        
        This is a test email to verify that the email service is working correctly.
        
        If you received this email, the SMTP configuration is correct!
        
        Time sent: {datetime.now(timezone.utc).isoformat()}
        """
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Try to send the email
        result = email_service._send_email_message(msg, test_email_address)
        
        if result:
            return jsonify({
                'success': True,
                'message': f'Test email sent successfully to {test_email_address}',
                'config': email_config_status
            }), 200
        else:
            error_msg = email_service.last_error_message or 'Unknown error'
            return jsonify({
                'success': False,
                'error': f'Failed to send test email: {error_msg}',
                'config': email_config_status,
                'last_error': error_msg,
                'last_error_port': email_service.last_error_port
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"[TEST_EMAIL] Error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Error testing email: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/invitation/verify/<token>', methods=['GET'])
@enterprise_bp.route('/api/enterprise/invitation/verify', methods=['GET'])
def verify_invitation(token=None):
    """Verify an invitation token (public endpoint)
    Supports both path parameter and query parameter for token
    """
    try:
        from urllib.parse import unquote
        
        # Get token from path parameter or query parameter
        if not token:
            token = request.args.get('token', '').strip()
        
        # URL decode the token (Flask should do this automatically, but be explicit)
        # Try both decoded and as-is in case it's already decoded
        token_decoded = unquote(token).strip() if token else ''
        token_original = token.strip() if token else ''
        
        # Use the decoded version, but we'll try both if needed
        token = token_decoded or token_original
        
        current_app.logger.info(f"[VERIFY_INVITE] Verifying invitation token (length: {len(token)}, first 20 chars: {token[:20] if len(token) >= 20 else token}...)")
        
        if not token:
            current_app.logger.warning("[VERIFY_INVITE] Empty token received")
            return jsonify({'error': 'Invalid invitation token'}), 404
        
        supabase = get_supabase_client()
        if not supabase:
            current_app.logger.error("[VERIFY_INVITE] Supabase client not available")
            return jsonify({'error': 'Service unavailable'}), 500
        
        # Get invitation details - try with the decoded token first
        result = supabase.table('invitations').select('''
            *,
            enterprise:enterprise_id (
                id,
                name,
                organization_type
            )
        ''').eq('invitation_token', token).execute()
        
        # If not found with decoded token, try with original token (in case it wasn't encoded)
        if not result.data and token_decoded != token_original and token_original:
            current_app.logger.info(f"[VERIFY_INVITE] Retrying with original token format")
            result = supabase.table('invitations').select('''
                *,
                enterprise:enterprise_id (
                    id,
                    name,
                    organization_type
                )
            ''').eq('invitation_token', token_original).execute()
            # If found with original, use that token
            if result.data:
                token = token_original
        
        current_app.logger.info(f"[VERIFY_INVITE] Query result: {len(result.data) if result.data else 0} invitations found")
        
        if not result.data:
            # Try to find any invitations with similar tokens for debugging
            current_app.logger.warning(f"[VERIFY_INVITE] No invitation found for token: {token[:20] if len(token) >= 20 else token}...")
            # Log the full token length for debugging (but not the full token for security)
            current_app.logger.warning(f"[VERIFY_INVITE] Token length: {len(token)}, Token ends with: ...{token[-10:] if len(token) > 10 else token}")
            return jsonify({'error': 'Invalid invitation token'}), 404
        
        invitation = result.data[0]
        
        # Check if expired
        if invitation['status'] != 'pending':
            return jsonify({'error': f"Invitation is {invitation['status']}"}), 400
        
        expires_at = datetime.fromisoformat(invitation['expires_at'].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        if now > expires_at:
            return jsonify({'error': 'Invitation has expired'}), 400
        
        # Ensure enterprise data is present, fetch if missing
        enterprise_data = invitation.get('enterprise')
        if not enterprise_data:
            # Fallback: fetch enterprise directly
            try:
                enterprise_result = supabase.table('enterprises').select('id, name, organization_type').eq('id', invitation['enterprise_id']).execute()
                if enterprise_result.data:
                    enterprise_data = enterprise_result.data[0]
            except:
                enterprise_data = {
                    'id': invitation.get('enterprise_id', ''),
                    'name': 'Unknown Organization',
                    'organization_type': 'organization'
                }
        
        return jsonify({
            'success': True,
            'invitation': {
                'id': invitation['id'],
                'email': invitation['email'],
                'role': invitation['role'],
                'message': invitation.get('message'),
                'enterprise': enterprise_data,
                'enterprise_name': enterprise_data.get('name') if enterprise_data else 'Unknown Organization',
                'organization_type': enterprise_data.get('organization_type') if enterprise_data else 'organization'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to verify invitation: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/invitation/accept', methods=['POST'])
def accept_invitation():
    """Accept an invitation - handles both registered and unregistered users"""
    try:
        data = request.get_json()
        
        if 'token' not in data:
            return jsonify({'error': 'Invitation token is required'}), 400
        
        supabase = get_supabase_client()
        
        # Find the invitation by token
        invitation_result = supabase.table('invitations').select('*, enterprises(*)').eq('invitation_token', data['token']).execute()
        
        if not invitation_result.data:
            return jsonify({'error': 'Invalid or expired invitation'}), 400
        
        invitation = invitation_result.data[0]
        
        # Check if invitation is still pending
        if invitation['status'] != 'pending':
            return jsonify({'error': 'Invitation has already been used or expired'}), 400
        
        # Check if invitation has expired
        if invitation['expires_at']:
            expires_at = datetime.fromisoformat(invitation['expires_at'].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            if now > expires_at:
                return jsonify({'error': 'Invitation has expired'}), 400
        
        # Check if user is authenticated
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            # User is logged in, get their user ID
            try:
                token = auth_header.split(' ')[1]
                # Verify token and get user ID
                user_response = supabase.auth.get_user(token)
                if user_response.user:
                    user_id = user_response.user.id
            except:
                pass  # Invalid token, treat as unauthenticated
        
        if user_id:
            # User is authenticated - check if already a member
            current_app.logger.info(f"[ACCEPT] Checking existing membership for user {user_id} in enterprise {invitation['enterprise_id']}")
            existing_membership = supabase.table('organization_users').select('id').eq('enterprise_id', invitation['enterprise_id']).eq('user_id', user_id).execute()
            
            if existing_membership.data:
                current_app.logger.warning(f"[ACCEPT] User {user_id} is already a member")
                return jsonify({'error': 'You are already a member of this organization'}), 400
            
            # Add authenticated user to organization using admin client to bypass RLS
            membership_id = str(uuid.uuid4())
            membership_data = {
                'id': membership_id,
                'enterprise_id': invitation['enterprise_id'],
                'user_id': user_id,
                'role': invitation.get('role', 'patient'),  # Use role from invitation
                'status': 'active',
                'joined_at': datetime.now(timezone.utc).isoformat()
            }
            
            current_app.logger.info(f"[ACCEPT] Inserting membership: {membership_data}")
            
            # Use admin client to bypass RLS for this operation
            admin_supabase = get_supabase_client(use_admin=True)
            try:
                membership_result = admin_supabase.table('organization_users').insert(membership_data).execute()
                current_app.logger.info(f"[ACCEPT] Membership insert result: {membership_result.data}")
            except Exception as insert_error:
                current_app.logger.error(f"[ACCEPT] Failed to insert membership: {str(insert_error)}", exc_info=True)
                return jsonify({'error': f'Failed to add user to organization: {str(insert_error)}'}), 500
            
            if not membership_result.data:
                current_app.logger.error(f"[ACCEPT] Membership insert returned no data")
                # Verify if it was actually inserted
                verify_result = admin_supabase.table('organization_users').select('*').eq('id', membership_id).execute()
                if not verify_result.data:
                    return jsonify({'error': 'Failed to add user to organization'}), 500
                else:
                    current_app.logger.info(f"[ACCEPT] Membership verified: {verify_result.data[0]}")
            
            current_app.logger.info(f"[ACCEPT] ✅ Successfully added user {user_id} to organization {invitation['enterprise_id']}")
            
            # Update invitation status with acceptance details
            current_app.logger.info(f"[ACCEPT] Updating invitation {invitation['id']} status to 'accepted'")
            update_result = admin_supabase.table('invitations').update({
                'status': 'accepted',
                'accepted_at': datetime.now(timezone.utc).isoformat(),
                'accepted_by': user_id
            }).eq('id', invitation['id']).execute()
            
            # Verify the update was successful
            if update_result.data:
                current_app.logger.info(f"[ACCEPT] ✅ Successfully updated invitation {invitation['id']} status to 'accepted'")
                current_app.logger.info(f"[ACCEPT] Updated invitation data: {update_result.data[0]}")
            else:
                current_app.logger.error(f"[ACCEPT] ❌ Failed to update invitation status for {invitation['id']}")
                # Try to verify current status
                check_result = admin_supabase.table('invitations').select('status').eq('id', invitation['id']).execute()
                if check_result.data:
                    current_app.logger.warning(f"[ACCEPT] Current invitation status: {check_result.data[0].get('status')}")
            
            # Get enterprise details
            enterprise_result = admin_supabase.table('enterprises').select('id, name, created_by, email').eq('id', invitation['enterprise_id']).execute()
            enterprise = enterprise_result.data[0] if enterprise_result.data else None
            enterprise_name = enterprise.get('name', 'Unknown Organization') if enterprise else 'Unknown Organization'
            enterprise_owner_id = enterprise.get('created_by') if enterprise else None
            
            # Get accepted user details
            accepted_user_email = invitation.get('email', 'Unknown')
            accepted_user_name = 'User'
            try:
                accepted_user_details = admin_supabase.auth.admin.get_user_by_id(user_id)
                if accepted_user_details and accepted_user_details.user:
                    user_metadata = accepted_user_details.user.user_metadata or {}
                    first_name = user_metadata.get('first_name', '')
                    last_name = user_metadata.get('last_name', '')
                    accepted_user_name = f"{first_name} {last_name}".strip() or accepted_user_email
                    accepted_user_email = accepted_user_details.user.email or accepted_user_email
            except Exception as e:
                current_app.logger.warning(f"[ACCEPT] Could not fetch accepted user details: {e}")
            
            # Send email notification to admin/owner
            if enterprise_owner_id:
                try:
                    owner_details = admin_supabase.auth.admin.get_user_by_id(enterprise_owner_id)
                    if owner_details and owner_details.user:
                        owner_email = owner_details.user.email
                        owner_metadata = owner_details.user.user_metadata or {}
                        owner_name = f"{owner_metadata.get('first_name', '')} {owner_metadata.get('last_name', '')}".strip() or owner_email
                        
                        # Get frontend URL for dashboard link
                        frontend_url = get_frontend_url()
                        dashboard_url = f"{frontend_url}/enterprise"
                        
                        # Send notification email
                        import threading
                        def send_notification():
                            try:
                                email_sent = email_service.send_invitation_accepted_notification(
                                    admin_email=owner_email,
                                    admin_name=owner_name,
                                    accepted_user_email=accepted_user_email,
                                    accepted_user_name=accepted_user_name,
                                    enterprise_name=enterprise_name,
                                    role=invitation.get('role', 'member'),
                                    dashboard_url=dashboard_url
                                )
                                if email_sent:
                                    current_app.logger.info(f"[ACCEPT] ✅ Notification email sent to admin {owner_email}")
                                else:
                                    current_app.logger.warning(f"[ACCEPT] ⚠️ Failed to send notification email to {owner_email}")
                            except Exception as e:
                                current_app.logger.error(f"[ACCEPT] Error sending notification email: {e}")
                        
                        notification_thread = threading.Thread(target=send_notification)
                        notification_thread.daemon = True
                        notification_thread.start()
                except Exception as e:
                    current_app.logger.warning(f"[ACCEPT] Could not send notification email: {e}")
            
            return jsonify({
                'success': True,
                'message': 'Invitation accepted successfully',
                'enterprise_id': invitation['enterprise_id'],
                'enterprise_name': enterprise_name,
                'requires_registration': False
            }), 200
        else:
            # User is not authenticated - return invitation details for registration
            # Get enterprise name safely
            enterprise_name = 'Unknown Organization'
            if invitation.get('enterprises') and isinstance(invitation['enterprises'], dict):
                enterprise_name = invitation['enterprises'].get('name', 'Unknown Organization')
            
            return jsonify({
                'success': True,
                'message': 'Please create an account to accept this invitation',
                'invitation': {
                    'id': invitation['id'],
                    'email': invitation['email'],
                    'enterprise_id': invitation['enterprise_id'],
                    'enterprise_name': enterprise_name,
                    'role': data.get('role', 'member')
                },
                'requires_registration': True
            }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to accept invitation: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/invitation/complete', methods=['POST'])
@require_auth
def complete_invitation():
    """Complete invitation acceptance after user registration"""
    try:
        data = request.get_json()
        
        if 'invitation_id' not in data:
            return jsonify({'error': 'Invitation ID is required'}), 400
        
        supabase = get_supabase_client()
        
        # Get invitation details
        invitation_result = supabase.table('invitations').select('*, enterprises(*)').eq('id', data['invitation_id']).execute()
        
        if not invitation_result.data or len(invitation_result.data) == 0:
            return jsonify({'error': 'Invalid invitation ID'}), 400
        
        invitation = invitation_result.data[0]
        
        # Check if invitation data is valid
        if not invitation:
            return jsonify({'error': 'Invitation data is invalid'}), 400
        
        # Check if invitation is still pending or accepted but not completed
        if invitation['status'] not in ['pending', 'accepted']:
            return jsonify({'error': 'Invitation has already been used or expired'}), 400
        
        # Check if user is already part of this organization
        existing_membership = supabase.table('organization_users').select('id').eq('enterprise_id', invitation['enterprise_id']).eq('user_id', request.user_id).execute()
        
        if existing_membership.data:
            return jsonify({'error': 'You are already a member of this organization'}), 400
        
        # Add user to organization using admin client to bypass RLS
        membership_id = str(uuid.uuid4())
        membership_data = {
            'id': membership_id,
            'enterprise_id': invitation['enterprise_id'],
            'user_id': request.user_id,
            'role': invitation.get('role', 'patient'),  # Use role from invitation
            'status': 'active',
            'joined_at': datetime.now(timezone.utc).isoformat()
        }
        
        current_app.logger.info(f"[COMPLETE] Inserting membership: {membership_data}")
        
        # Use admin client to bypass RLS for this operation
        admin_supabase = get_supabase_client(use_admin=True)
        try:
            membership_result = admin_supabase.table('organization_users').insert(membership_data).execute()
            current_app.logger.info(f"[COMPLETE] Membership insert result: {membership_result.data}")
        except Exception as insert_error:
            current_app.logger.error(f"[COMPLETE] Failed to insert membership: {str(insert_error)}", exc_info=True)
            return jsonify({'error': f'Failed to add user to organization: {str(insert_error)}'}), 500
        
        if not membership_result.data:
            current_app.logger.error(f"[COMPLETE] Membership insert returned no data")
            # Verify if it was actually inserted
            verify_result = admin_supabase.table('organization_users').select('*').eq('id', membership_id).execute()
            if not verify_result.data:
                return jsonify({'error': 'Failed to add user to organization'}), 500
            else:
                current_app.logger.info(f"[COMPLETE] Membership verified: {verify_result.data[0]}")
        
        current_app.logger.info(f"[COMPLETE] ✅ Successfully added user {request.user_id} to organization {invitation['enterprise_id']}")
        
        # Update invitation status with completion details
        current_app.logger.info(f"[COMPLETE] Updating invitation {invitation['id']} status to 'accepted'")
        update_result = admin_supabase.table('invitations').update({
            'status': 'accepted',
            'accepted_at': datetime.now(timezone.utc).isoformat(),
            'accepted_by': request.user_id
        }).eq('id', invitation['id']).execute()
        
        # Verify the update was successful
        if update_result.data:
            current_app.logger.info(f"[COMPLETE] ✅ Successfully updated invitation {invitation['id']} status to 'accepted'")
            current_app.logger.info(f"[COMPLETE] Updated invitation data: {update_result.data[0]}")
        else:
            current_app.logger.error(f"[COMPLETE] ❌ Failed to update invitation status for {invitation['id']}")
            # Try to verify current status
            check_result = admin_supabase.table('invitations').select('status').eq('id', invitation['id']).execute()
            if check_result.data:
                current_app.logger.warning(f"[COMPLETE] Current invitation status: {check_result.data[0].get('status')}")
        
        # Get enterprise details
        enterprise_result = admin_supabase.table('enterprises').select('id, name, created_by, email').eq('id', invitation['enterprise_id']).execute()
        enterprise = enterprise_result.data[0] if enterprise_result.data else None
        enterprise_name = enterprise.get('name', 'Unknown Organization') if enterprise else 'Unknown Organization'
        enterprise_owner_id = enterprise.get('created_by') if enterprise else None
        
        # Get accepted user details
        accepted_user_email = invitation.get('email', 'Unknown')
        accepted_user_name = 'User'
        try:
            accepted_user_details = admin_supabase.auth.admin.get_user_by_id(request.user_id)
            if accepted_user_details and accepted_user_details.user:
                user_metadata = accepted_user_details.user.user_metadata or {}
                first_name = user_metadata.get('first_name', '')
                last_name = user_metadata.get('last_name', '')
                accepted_user_name = f"{first_name} {last_name}".strip() or accepted_user_email
                accepted_user_email = accepted_user_details.user.email or accepted_user_email
        except Exception as e:
            current_app.logger.warning(f"[COMPLETE] Could not fetch accepted user details: {e}")
        
        # Send email notification to admin/owner
        if enterprise_owner_id:
            try:
                owner_details = admin_supabase.auth.admin.get_user_by_id(enterprise_owner_id)
                if owner_details and owner_details.user:
                    owner_email = owner_details.user.email
                    owner_metadata = owner_details.user.user_metadata or {}
                    owner_name = f"{owner_metadata.get('first_name', '')} {owner_metadata.get('last_name', '')}".strip() or owner_email
                    
                    # Get frontend URL for dashboard link
                    frontend_url = get_frontend_url()
                    dashboard_url = f"{frontend_url}/enterprise"
                    
                    # Send notification email
                    import threading
                    def send_notification():
                        try:
                            email_sent = email_service.send_invitation_accepted_notification(
                                admin_email=owner_email,
                                admin_name=owner_name,
                                accepted_user_email=accepted_user_email,
                                accepted_user_name=accepted_user_name,
                                enterprise_name=enterprise_name,
                                role=invitation.get('role', 'member'),
                                dashboard_url=dashboard_url
                            )
                            if email_sent:
                                current_app.logger.info(f"[COMPLETE] ✅ Notification email sent to admin {owner_email}")
                            else:
                                current_app.logger.warning(f"[COMPLETE] ⚠️ Failed to send notification email to {owner_email}")
                        except Exception as e:
                            current_app.logger.error(f"[COMPLETE] Error sending notification email: {e}")
                    
                    notification_thread = threading.Thread(target=send_notification)
                    notification_thread.daemon = True
                    notification_thread.start()
            except Exception as e:
                current_app.logger.warning(f"[COMPLETE] Could not send notification email: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Invitation accepted successfully',
            'enterprise_id': invitation['enterprise_id'],
            'enterprise_name': enterprise_name
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to complete invitation: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/create-user', methods=['POST'])
@require_auth
def create_user():
    """Create a new user and add them to the organization"""
    try:
        data = request.get_json()
        
        required_fields = ['enterprise_id', 'first_name', 'last_name', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        supabase = get_supabase_client()
        
        # Verify user has permission to create users (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, data['enterprise_id'], supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Get enterprise details
        enterprise_result = supabase.table('enterprises').select('id, name').eq('id', data['enterprise_id']).execute()
        
        if not enterprise_result.data:
            return jsonify({'error': 'Organization not found'}), 404
        
        enterprise = enterprise_result.data[0]
        
        # Check if user already exists by listing users and checking email
        try:
            users_list = supabase.auth.admin.list_users()
            for user in users_list:
                if user.email == data['email']:
                    return jsonify({'error': 'User with this email already exists'}), 400
        except:
            # If we can't check, continue with creation
            pass
        
        # Create user in Supabase Auth
        user_response = supabase.auth.admin.create_user({
            'email': data['email'],
            'password': data['password'],
            'email_confirm': True,  # Auto-confirm the user
            'user_metadata': {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'full_name': f"{data['first_name']} {data['last_name']}"
            }
        })
        
        if not user_response or not user_response.user:
            return jsonify({'error': 'Failed to create user account'}), 500
        
        user_id = user_response.user.id
        
        # Add user to organization
        membership_id = str(uuid.uuid4())
        membership_data = {
            'id': membership_id,
            'enterprise_id': data['enterprise_id'],
            'user_id': user_id,
            'role': data['role'],
            'status': 'active',
            'joined_at': datetime.now(timezone.utc).isoformat()
        }

        current_app.logger.info(f"[CREATE_USER] Inserting membership: {membership_data}")

        # Use admin client to bypass RLS for this operation
        admin_supabase = get_supabase_client(use_admin=True)
        try:
            membership_result = admin_supabase.table('organization_users').insert(membership_data).execute()
            current_app.logger.info(f"[CREATE_USER] Membership insert result: {membership_result.data}")
        except Exception as insert_error:
            current_app.logger.error(f"[CREATE_USER] Failed to insert membership: {str(insert_error)}", exc_info=True)
            return jsonify({'error': f'Failed to add user to organization: {str(insert_error)}'}), 500

        if not membership_result.data:
            current_app.logger.error(f"[CREATE_USER] Membership insert returned no data")
            # Verify if it was actually inserted
            verify_result = admin_supabase.table('organization_users').select('*').eq('id', membership_id).execute()
            if not verify_result.data:
                return jsonify({'error': 'Failed to add user to organization'}), 500
            else:
                current_app.logger.info(f"[CREATE_USER] Membership verified: {verify_result.data[0]}")

        # Create a trial for the new user (30 days for enterprise users)
        try:
            trial_result = admin_supabase.rpc('create_user_trial', {
                'p_user_id': user_id,
                'p_duration_days': 30  # 30 days trial for enterprise users
            }).execute()
            
            if trial_result.data and trial_result.data.get('success'):
                print(f"✅ Created 30-day trial for user {user_id}")
            else:
                print(f"⚠️ Failed to create trial for user {user_id}: {trial_result.data}")
        except Exception as trial_error:
            print(f"⚠️ Error creating trial for user {user_id}: {trial_error}")
            # Don't fail the user creation if trial creation fails

        # Send welcome email to the new user
        try:
            from services.email_service import EmailService
            email_service = EmailService()
            
            # Get the current user's name for the email
            current_user_result = supabase.auth.admin.get_user_by_id(request.user_id)
            inviter_name = "Organization Admin"
            if current_user_result and current_user_result.user:
                user_metadata = current_user_result.user.user_metadata or {}
                first_name = user_metadata.get('first_name', '')
                last_name = user_metadata.get('last_name', '')
                if first_name or last_name:
                    inviter_name = f"{first_name} {last_name}".strip()
            
            # Create login URL using dynamic URL detection
            frontend_url = get_frontend_url()
            login_url = f"{frontend_url}/accept-invitation"
            
            email_sent = email_service.send_user_creation_email(
                to_email=data['email'],
                enterprise_name=enterprise['name'],
                inviter_name=inviter_name,
                login_url=login_url
            )
            
            if email_sent:
                print(f"✅ User creation email sent to {data['email']}")
            else:
                print(f"⚠️ Failed to send user creation email to {data['email']}")
        except Exception as email_error:
            print(f"⚠️ Error sending user creation email to {data['email']}: {email_error}")
            # Don't fail the user creation if email sending fails
        
        return jsonify({
            'success': True,
            'message': 'User created and added to organization successfully',
            'user': {
                'id': user_id,
                'email': data['email'],
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': data['role'],
                'enterprise_id': data['enterprise_id'],
                'enterprise_name': enterprise['name']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create user: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/user/<user_relation_id>', methods=['DELETE'])
@require_auth
def delete_organization_user(user_relation_id):
    """
    Delete a user from the organization and completely remove all their data from Supabase.
    This deletes the user from all tables and their authentication account.
    """
    try:
        supabase = get_supabase_client()
        admin_supabase = get_supabase_client(use_admin=True)
        
        # First, get the organization user record to verify ownership
        org_user_result = admin_supabase.table('organization_users').select('*').eq('id', user_relation_id).execute()
        
        if not org_user_result.data:
            return jsonify({'error': 'User not found in organization'}), 404
        
        org_user = org_user_result.data[0]
        enterprise_id = org_user['enterprise_id']
        
        # Get enterprise details to verify ownership
        enterprise_result = admin_supabase.table('enterprises').select('id, created_by').eq('id', enterprise_id).execute()
        
        if not enterprise_result.data:
            return jsonify({'error': 'Enterprise not found'}), 404
        
        enterprise = enterprise_result.data[0]
        
        # Verify the current user owns this enterprise
        if enterprise['created_by'] != request.user_id:
            return jsonify({'error': 'Access denied. You can only delete users from your own organization.'}), 403
        
        # Get user details before deletion for response
        user_id = org_user['user_id']
        try:
            user_details = admin_supabase.auth.admin.get_user_by_id(user_id)
            if user_details and user_details.user:
                user_email = user_details.user.email
                user_metadata = user_details.user.user_metadata or {}
                user_name = f"{user_metadata.get('first_name', '')} {user_metadata.get('last_name', '')}".strip()
            else:
                user_email = 'Unknown'
                user_name = 'Unknown'
        except:
            user_email = 'Unknown'
            user_name = 'Unknown'
        
        deletion_log = []
        
        # Delete all user-related data from Supabase tables (in dependency order)
        # Step 1: Delete from tables that reference user_id
        
        # Delete user settings history first (references user_settings)
        try:
            result = admin_supabase.table('user_settings_history').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} user_settings_history records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting user_settings_history: {str(e)}")
            deletion_log.append(f"Error deleting user_settings_history: {str(e)}")
        
        # Delete user settings
        try:
            result = admin_supabase.table('user_settings').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} user_settings records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting user_settings: {str(e)}")
            deletion_log.append(f"Error deleting user_settings: {str(e)}")
        
        # Delete detection history
        try:
            result = admin_supabase.table('detection_history').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} detection_history records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting detection_history: {str(e)}")
            deletion_log.append(f"Error deleting detection_history: {str(e)}")
        
        # Delete meal plans
        try:
            result = admin_supabase.table('meal_plan_management').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} meal_plan_management records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting meal_plan_management: {str(e)}")
            deletion_log.append(f"Error deleting meal_plan_management: {str(e)}")
        
        # Delete payment transactions
        try:
            result = admin_supabase.table('payment_transactions').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} payment_transactions records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting payment_transactions: {str(e)}")
            deletion_log.append(f"Error deleting payment_transactions: {str(e)}")
        
        # Delete user subscriptions
        try:
            result = admin_supabase.table('user_subscriptions').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} user_subscriptions records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting user_subscriptions: {str(e)}")
            deletion_log.append(f"Error deleting user_subscriptions: {str(e)}")
        
        # Delete user trials
        try:
            result = admin_supabase.table('user_trials').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} user_trials records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting user_trials: {str(e)}")
            deletion_log.append(f"Error deleting user_trials: {str(e)}")
        
        # Delete feature usage (if table exists)
        try:
            result = admin_supabase.table('feature_usage').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} feature_usage records")
        except Exception as e:
            # Table might not exist, skip
            pass
        
        # Delete ALL organization_users records for this user (user might be in multiple orgs)
        try:
            result = admin_supabase.table('organization_users').delete().eq('user_id', user_id).execute()
            deletion_log.append(f"Deleted {len(result.data) if result.data else 0} organization_users records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting organization_users: {str(e)}")
            deletion_log.append(f"Error deleting organization_users: {str(e)}")
        
        # Delete ALL invitations for this user's email (pending, cancelled, accepted - all statuses)
        try:
            if user_email and user_email != 'Unknown':
                result = admin_supabase.table('invitations').delete().eq('email', user_email).execute()
                deletion_log.append(f"Deleted {len(result.data) if result.data else 0} invitations records")
        except Exception as e:
            current_app.logger.warning(f"Error deleting invitations: {str(e)}")
            deletion_log.append(f"Error deleting invitations: {str(e)}")
        
        # Delete profile
        try:
            result = admin_supabase.table('profiles').delete().eq('id', user_id).execute()
            deletion_log.append(f"Deleted profile record")
        except Exception as e:
            current_app.logger.warning(f"Error deleting profile: {str(e)}")
            deletion_log.append(f"Error deleting profile: {str(e)}")
        
        # Finally, delete from auth.users
        auth_deleted = False
        try:
            # Method 1: Standard admin delete
            delete_result = admin_supabase.auth.admin.delete_user(user_id)
            deletion_log.append(f"Deleted user from authentication system")
            auth_deleted = True
        except Exception as e:
            current_app.logger.warning(f"Standard auth delete failed: {str(e)}")
            deletion_log.append(f"Standard auth delete failed: {str(e)}")
            
            # Method 2: Try with soft delete disabled
            try:
                delete_result = admin_supabase.auth.admin.delete_user(user_id, should_soft_delete=False)
                deletion_log.append(f"Deleted user from authentication system (hard delete)")
                auth_deleted = True
            except Exception as e2:
                current_app.logger.warning(f"Hard auth delete failed: {str(e2)}")
                deletion_log.append(f"Hard auth delete failed: {str(e2)}")
                
                # Method 3: Try updating user to disabled state if deletion fails
                try:
                    update_result = admin_supabase.auth.admin.update_user_by_id(user_id, {
                        "email": f"deleted_{user_id}@deleted.local",
                        "banned_until": "2099-12-31T23:59:59Z"
                    })
                    deletion_log.append(f"Could not delete auth user, but disabled account instead")
                    auth_deleted = True  # Consider this successful for our purposes
                except Exception as e3:
                    current_app.logger.error(f"All auth deletion methods failed: {str(e3)}")
                    deletion_log.append(f"All auth deletion methods failed: {str(e3)}")
        
        if not auth_deleted:
            # If we can't delete from auth, return partial success
            current_app.logger.warning(f"User data deleted but authentication account could not be removed for user {user_id}")
            return jsonify({
                'success': False,
                'error': 'User data deleted but authentication account could not be removed',
                'deletion_log': deletion_log,
                'details': 'User data has been removed from all application tables, but the authentication account may still exist. This could be due to Supabase RLS policies.'
            }), 500
        
        current_app.logger.info(f"✅ Completely deleted user {user_id} ({user_email}) from organization. Deletion log: {deletion_log}")
        
        return jsonify({
            'success': True,
            'message': f'User {user_name} ({user_email}) has been completely deleted from the system. They can now be re-invited or register again.',
            'deleted_user': {
                'id': user_relation_id,
                'user_id': user_id,
                'name': user_name,
                'email': user_email
            },
            'deletion_log': deletion_log
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting user: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/logout-and-login', methods=['GET'])
def logout_and_login():
    """Logout any existing user and redirect to login page"""
    from flask import redirect, url_for
    
    # This endpoint will be called from the email link
    # It will redirect to the frontend logout-and-login page
    # Get the frontend URL using dynamic URL detection
    frontend_url = get_frontend_url()
    return redirect(f'{frontend_url}/logout-and-login')


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_relation_id>', methods=['PUT'])
@require_auth
def update_user_relation(enterprise_id, user_relation_id):
    """Update a user's relationship with the enterprise (notes, status, etc.)"""
    try:
        data = request.get_json()
        supabase = get_supabase_client()
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Update user relation
        update_data = {}
        allowed_fields = ['status', 'role', 'notes', 'metadata']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = supabase.table('organization_users').update(update_data).eq('id', user_relation_id).eq('enterprise_id', enterprise_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update user: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_relation_id>', methods=['DELETE'])
@require_auth
def remove_user(enterprise_id, user_relation_id):
    """Remove a user from the enterprise"""
    try:
        supabase = get_supabase_client()
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Delete user relation
        supabase.table('organization_users').delete().eq('id', user_relation_id).eq('enterprise_id', enterprise_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'User removed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to remove user: {str(e)}'}), 500


@enterprise_bp.route('/api/my-enterprises', methods=['GET'])
@require_auth
def get_user_enterprises():
    """Get all enterprises the user is part of (as owner or member)"""
    try:
        supabase = get_supabase_client()
        
        # Use the database function to get user's enterprise access
        result = supabase.rpc('user_enterprise_access', {'user_uuid': request.user_id}).execute()
        
        return jsonify({
            'success': True,
            'enterprises': result.data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch enterprises: {str(e)}'}), 500



@enterprise_bp.route('/api/enterprise/<enterprise_id>/settings-history', methods=['GET'])
@require_auth
def get_enterprise_settings_history(enterprise_id):
    """Get settings change history for an enterprise"""
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Get settings history from user_settings table for all users in this enterprise
        # First get all user IDs in this enterprise
        org_users = supabase.table('organization_users').select('user_id').eq('enterprise_id', enterprise_id).execute()
        
        if not org_users.data:
            return jsonify({
                'success': True,
                'history': []
            }), 200
        
        user_ids = [user['user_id'] for user in org_users.data]
        
        # Get settings history for these users from user_settings_history table
        history_result = supabase.table('user_settings_history').select('*').in_('user_id', user_ids).eq('settings_type', 'health_profile').order('created_at', desc=True).limit(100).execute()
        
        # Enrich with user details
        history = []
        for record in history_result.data:
            try:
                user_details = supabase.auth.admin.get_user_by_id(record['user_id'])
                if user_details and user_details.user:
                    user_metadata = user_details.user.user_metadata or {}
                    user_name = f"{user_metadata.get('first_name', '')} {user_metadata.get('last_name', '')}".strip()
                    user_email = user_details.user.email
                else:
                    user_name = 'Unknown'
                    user_email = 'Unknown'
            except:
                user_name = 'Unknown'
                user_email = 'Unknown'
            
            # Use the changed_fields from history record (already calculated)
            changed_fields = record.get('changed_fields', [])
            # Filter out numbered removed items (like "0 (removed)", "1 (removed)", etc.)
            import re
            meaningful_fields = [f for f in changed_fields if not re.match(r'^\d+\s*\(removed\)$', f)]
            
            history.append({
                'id': record['id'],
                'user_id': record['user_id'],
                'user_name': user_name,
                'user_email': user_email,
                'settings_type': record.get('settings_type', 'health_profile'),
                'settings_data': record.get('settings_data', {}),
                'previous_settings_data': record.get('previous_settings_data', {}),
                'changed_fields': meaningful_fields,
                'created_at': record['created_at']
            })
        
        return jsonify({
            'success': True,
            'history': history
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch settings history: {str(e)}')
        return jsonify({'error': f'Failed to fetch settings history: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/settings', methods=['GET'])
@require_auth
def get_user_settings_for_enterprise(enterprise_id, user_id):
    """Get user settings for a specific user in the enterprise"""
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Verify user is part of the enterprise
        org_user = supabase.table('organization_users').select('*').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not org_user.data:
            return jsonify({'error': 'User is not part of this enterprise'}), 404
        
        # Get user settings
        settings_result = supabase.table('user_settings').select('*').eq('user_id', user_id).eq('settings_type', 'health_profile').execute()
        
        # Get user details
        try:
            user_details = supabase.auth.admin.get_user_by_id(user_id)
            if user_details and user_details.user:
                user_metadata = user_details.user.user_metadata or {}
                user_name = f"{user_metadata.get('first_name', '')} {user_metadata.get('last_name', '')}".strip()
                user_email = user_details.user.email
            else:
                user_name = 'Unknown'
                user_email = 'Unknown'
        except:
            user_name = 'Unknown'
            user_email = 'Unknown'
        
        settings_data = settings_result.data[0] if settings_result.data else None
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'user_name': user_name,
            'user_email': user_email,
            'settings': settings_data.get('settings_data', {}) if settings_data else {},
            'updated_at': settings_data.get('updated_at') if settings_data else None
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch user settings: {str(e)}')
        return jsonify({'error': f'Failed to fetch user settings: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/settings', methods=['PUT'])
@require_auth
def update_user_settings_for_enterprise(enterprise_id, user_id):
    """Update user settings for a specific user in the enterprise"""
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Verify user is part of the enterprise
        org_user = supabase.table('organization_users').select('*').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not org_user.data:
            return jsonify({'error': 'User is not part of this enterprise'}), 404
        
        data = request.get_json()
        if not data or 'settings_data' not in data:
            return jsonify({'error': 'settings_data is required'}), 400
        
        settings_data = data['settings_data']
        settings_type = data.get('settings_type', 'health_profile')
        
        # Use the supabase service to save settings (this will create history)
        from services.supabase_service import SupabaseService
        supabase_service = current_app.supabase_service
        success, error = supabase_service.save_user_settings(user_id, settings_type, settings_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'User settings updated successfully'
            }), 200
        else:
            return jsonify({'error': error or 'Failed to update settings'}), 500
        
    except Exception as e:
        current_app.logger.error(f'Failed to update user settings: {str(e)}')
        return jsonify({'error': f'Failed to update user settings: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/settings', methods=['DELETE'])
@require_auth
def delete_user_settings_for_enterprise(enterprise_id, user_id):
    """Delete user settings for a specific user in the enterprise"""
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Verify user is part of the enterprise
        org_user = supabase.table('organization_users').select('*').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not org_user.data:
            return jsonify({'error': 'User is not part of this enterprise'}), 404
        
        settings_type = request.args.get('settings_type', 'health_profile')
        
        # Delete settings
        from services.supabase_service import SupabaseService
        supabase_service = current_app.supabase_service
        success, error = supabase_service.delete_user_settings(user_id, settings_type)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'User settings deleted successfully'
            }), 200
        else:
            return jsonify({'error': error or 'Failed to delete settings'}), 500
        
    except Exception as e:
        current_app.logger.error(f'Failed to delete user settings: {str(e)}')
        return jsonify({'error': f'Failed to delete user settings: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/time-restrictions', methods=['GET'])
@require_auth
def get_enterprise_time_restrictions(enterprise_id):
    """Get time restrictions for an enterprise"""
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Get enterprise settings
        result = supabase.table('enterprises').select('settings').eq('id', enterprise_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Enterprise not found'}), 404
        
        settings = result.data[0].get('settings', {})
        time_restrictions = settings.get('time_restrictions', {
            'enabled': False,
            'timezone': 'UTC',
            'windows': []
        })
        
        return jsonify({
            'success': True,
            'time_restrictions': time_restrictions
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch time restrictions: {str(e)}')
        return jsonify({'error': f'Failed to fetch time restrictions: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/time-restrictions', methods=['PUT'])
@require_auth
def update_enterprise_time_restrictions(enterprise_id):
    """Update time restrictions for an enterprise"""
    try:
        data = request.get_json()
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({'error': f'Access denied: {reason}'}), 403
        
        # Get current settings
        result = supabase.table('enterprises').select('settings').eq('id', enterprise_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Enterprise not found'}), 404
        
        current_settings = result.data[0].get('settings', {})
        
        # Update time restrictions
        current_settings['time_restrictions'] = {
            'enabled': data.get('enabled', False),
            'timezone': data.get('timezone', 'UTC'),
            'windows': data.get('windows', [])
        }
        
        # Save updated settings
        update_result = supabase.table('enterprises').update({
            'settings': current_settings
        }).eq('id', enterprise_id).execute()
        
        if not update_result.data:
            return jsonify({'error': 'Failed to update time restrictions'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Time restrictions updated successfully',
            'time_restrictions': current_settings['time_restrictions']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to update time restrictions: {str(e)}')
        return jsonify({'error': f'Failed to update time restrictions: {str(e)}'}), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/statistics', methods=['GET'])
@require_auth
def get_enterprise_statistics(enterprise_id):
    """
    Get comprehensive statistics for an enterprise.
    
    Returns:
        - total_users: Total number of users in organization_users table (excludes owner)
        - active_users: Number of users with status='active'
        - pending_invitations: Number of pending invitations
        - total_invitations: Total number of invitations (all statuses)
        - owner_info: Information about the enterprise owner
    """
    try:
        # Use admin client to bypass RLS
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get enterprise details including owner
        enterprise_result = supabase.table('enterprises').select('*').eq('id', enterprise_id).execute()
        if not enterprise_result.data:
            return jsonify({
                'success': False,
                'error': 'Enterprise not found'
            }), 404
        
        enterprise = enterprise_result.data[0]
        owner_id = enterprise['created_by']
        
        # Get owner information
        owner_info = {'id': owner_id, 'email': 'Unknown', 'name': 'Unknown'}
        try:
            owner_details = supabase.auth.admin.get_user_by_id(owner_id)
            if owner_details and owner_details.user:
                owner_metadata = owner_details.user.user_metadata or {}
                owner_info = {
                    'id': owner_id,
                    'email': owner_details.user.email,
                    'name': f"{owner_metadata.get('first_name', '')} {owner_metadata.get('last_name', '')}".strip() or 'Owner'
                }
        except Exception as e:
            current_app.logger.warning(f'Could not fetch owner details: {str(e)}')
        
        # Get all users (excludes owner)
        users_result = supabase.table('organization_users').select('status').eq('enterprise_id', enterprise_id).execute()
        total_users = len(users_result.data)
        active_users = sum(1 for user in users_result.data if user.get('status', 'active') == 'active')
        
        # Get invitation statistics
        invitations_result = supabase.table('invitations').select('status').eq('enterprise_id', enterprise_id).execute()
        total_invitations = len(invitations_result.data)
        pending_invitations = sum(1 for inv in invitations_result.data if inv.get('status') == 'pending')
        accepted_invitations = sum(1 for inv in invitations_result.data if inv.get('status') == 'accepted')
        
        statistics = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'pending_invitations': pending_invitations,
            'accepted_invitations': accepted_invitations,
            'total_invitations': total_invitations,
            'max_users': enterprise.get('max_users', 100),
            'capacity_percentage': round((total_users / enterprise.get('max_users', 100)) * 100, 1) if enterprise.get('max_users', 100) > 0 else 0,
            'owner_info': owner_info,
            'enterprise_name': enterprise.get('name', 'Unknown'),
            'organization_type': enterprise.get('organization_type', 'Unknown')
        }
        
        return jsonify({
            'success': True,
            'statistics': statistics
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch enterprise statistics: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to fetch statistics: {str(e)}'
        }), 500


# ============================================================================
# ADMIN MEAL PLAN MANAGEMENT ROUTES
# ============================================================================

@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/meal-plans', methods=['GET'])
@require_auth
def get_user_meal_plans(enterprise_id, user_id):
    """
    Get all meal plans for a specific user in the enterprise.
    Admin can view all meal plans for users in their organization.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 404
        
        # Get ALL meal plans for this user (admin sees both approved and pending)
        result = supabase.table('meal_plan_management').select('*').eq('user_id', user_id).order('updated_at', desc=True).execute()
        
        current_app.logger.info(f'Fetched {len(result.data or [])} meal plans for user {user_id}')
        for p in result.data or []:
            current_app.logger.info(f'Plan {p.get("id")}: is_approved={p.get("is_approved")}')
        
        meal_plans = []
        for plan in result.data or []:
            meal_plans.append({
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
                'user_info': plan.get('user_info'),
                'is_approved': plan.get('is_approved', True)  # Default to true for backwards compatibility
            })
            
            # Extract creator info from user_info if available
            user_info = plan.get('user_info')
            if isinstance(user_info, dict):
                meal_plans[-1]['creator_email'] = user_info.get('creator_email')
                meal_plans[-1]['is_created_by_user'] = user_info.get('is_created_by_user', True)
        
        return jsonify({
            'success': True,
            'meal_plans': meal_plans,
            'total_count': len(meal_plans)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch user meal plans: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to fetch meal plans: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/meal-plans', methods=['POST'])
@require_auth
def create_user_meal_plan(enterprise_id, user_id):
    """
    Create a meal plan for a specific user in the enterprise.
    Admin-created plans have is_approved=FALSE until admin approves them.
    """
    try:
        data = request.get_json()
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 404
        
        # Admin-created meal plans start as NOT approved
        # User won't see them until admin clicks Approve
        # Store admin's email in user_info to track who created it
        now = datetime.now(timezone.utc).isoformat()
        
        # Get admin's email
        admin_email = request.user_email if hasattr(request, 'user_email') else None
        if not admin_email:
            try:
                admin_user = supabase.auth.admin.get_user_by_id(request.user_id)
                if admin_user and hasattr(admin_user, 'user'):
                    admin_email = admin_user.user.email
            except:
                pass
        
        # Prepare user_info with creator email
        user_info = data.get('user_info') or {}
        if isinstance(user_info, dict):
            user_info['creator_email'] = admin_email
            user_info['is_created_by_user'] = False  # Admin created it
        else:
            user_info = {
                'creator_email': admin_email,
                'is_created_by_user': False
            }
        
        insert_data = {
            'user_id': user_id,
            'name': data.get('name'),
            'start_date': data.get('start_date') or data.get('startDate'),
            'end_date': data.get('end_date') or data.get('endDate'),
            'meal_plan': data.get('meal_plan') or data.get('mealPlan'),
            'has_sickness': data.get('has_sickness', False),
            'sickness_type': data.get('sickness_type', ''),
            'health_assessment': data.get('health_assessment'),
            'user_info': user_info,
            'is_approved': False,  # Admin must approve before user sees it
            'created_at': now,
            'updated_at': now
        }
        
        current_app.logger.info(f'Creating meal plan with is_approved=False for user {user_id}')
        current_app.logger.info(f'Insert data: {insert_data}')
        
        result = supabase.table('meal_plan_management').insert(insert_data).execute()
        
        current_app.logger.info(f'Insert result: {result.data}')
        
        if result.data and len(result.data) > 0:
            plan = result.data[0]
            plan_user_info = plan.get('user_info') or {}
            return jsonify({
                'success': True,
                'message': 'Meal plan created. Click Approve to send it to the user.',
                'meal_plan': {
                    'id': plan['id'],
                    'name': plan.get('name'),
                    'start_date': plan.get('start_date'),
                    'end_date': plan.get('end_date'),
                    'meal_plan': plan.get('meal_plan'),
                    'has_sickness': plan.get('has_sickness', False),
                    'sickness_type': plan.get('sickness_type', ''),
                    'health_assessment': plan.get('health_assessment'),
                    'user_info': plan.get('user_info'),
                    'is_approved': plan.get('is_approved', False),
                    'creator_email': plan_user_info.get('creator_email') if isinstance(plan_user_info, dict) else None,
                    'is_created_by_user': plan_user_info.get('is_created_by_user', False) if isinstance(plan_user_info, dict) else False,
                    'created_at': plan.get('created_at'),
                    'updated_at': plan.get('updated_at')
                }
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create meal plan'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f'Failed to create user meal plan: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to create meal plan: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>/approve', methods=['POST'])
@require_auth
def approve_meal_plan(enterprise_id, plan_id):
    """
    Approve a meal plan for a user.
    Sets is_approved=TRUE so user can see the plan.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get the meal plan
        plan_result = supabase.table('meal_plan_management').select('*').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({
                'success': False,
                'error': 'Meal plan not found'
            }), 404
        
        plan = plan_result.data[0]
        target_user_id = plan['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 403
        
        now = datetime.now(timezone.utc).isoformat()
        
        current_app.logger.info(f'Approving meal plan {plan_id}, setting is_approved=True')
        
        # Set is_approved to TRUE
        update_result = supabase.table('meal_plan_management').update({
            'is_approved': True,
            'updated_at': now
        }).eq('id', plan_id).execute()
        
        current_app.logger.info(f'Update result: {update_result.data}')
        
        if update_result.data:
            approved_plan = update_result.data[0]
            current_app.logger.info(f'Approved plan is_approved value: {approved_plan.get("is_approved")}')
            return jsonify({
                'success': True,
                'message': 'Meal plan approved! User can now see this plan.',
                'meal_plan': {
                    **approved_plan,
                    'is_approved': True
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to approve meal plan'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f'Failed to approve meal plan: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to approve meal plan: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>/reject', methods=['POST'])
@require_auth
def reject_meal_plan(enterprise_id, plan_id):
    """
    Reject a meal plan for a user.
    Deletes the plan - user never sees it.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get the meal plan to verify it belongs to a user in this enterprise
        plan_result = supabase.table('meal_plan_management').select('user_id').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({
                'success': False,
                'error': 'Meal plan not found'
            }), 404
        
        target_user_id = plan_result.data[0]['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 403
        
        # Delete the meal plan
        delete_result = supabase.table('meal_plan_management').delete().eq('id', plan_id).execute()
        
        if delete_result.data:
            return jsonify({
                'success': True,
                'message': 'Meal plan rejected and deleted. User will not see this plan.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to reject meal plan'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f'Failed to reject meal plan: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to reject meal plan: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>', methods=['PUT'])
@require_auth
def update_user_meal_plan(enterprise_id, plan_id):
    """
    Update a meal plan for a user in the enterprise.
    """
    try:
        data = request.get_json()
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get the meal plan
        plan_result = supabase.table('meal_plan_management').select('*, user_id').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({
                'success': False,
                'error': 'Meal plan not found'
            }), 404
        
        plan = plan_result.data[0]
        target_user_id = plan['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 403
        
        # Update meal plan
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            'updated_at': now
        }
        
        # Only update provided fields
        if 'name' in data:
            update_data['name'] = data['name']
        if 'start_date' in data or 'startDate' in data:
            update_data['start_date'] = data.get('start_date') or data.get('startDate')
        if 'end_date' in data or 'endDate' in data:
            update_data['end_date'] = data.get('end_date') or data.get('endDate')
        if 'meal_plan' in data or 'mealPlan' in data:
            update_data['meal_plan'] = data.get('meal_plan') or data.get('mealPlan')
        if 'has_sickness' in data:
            update_data['has_sickness'] = data['has_sickness']
        if 'sickness_type' in data:
            update_data['sickness_type'] = data['sickness_type']
        if 'status' in data:
            update_data['status'] = data['status']
        
        update_result = supabase.table('meal_plan_management').update(update_data).eq('id', plan_id).execute()
        
        if update_result.data:
            return jsonify({
                'success': True,
                'message': 'Meal plan updated successfully',
                'meal_plan': update_result.data[0]
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update meal plan'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f'Failed to update user meal plan: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to update meal plan: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>', methods=['DELETE'])
@require_auth
def delete_user_meal_plan(enterprise_id, plan_id):
    """
    Delete a meal plan for a user in the enterprise.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Get the meal plan to verify ownership
        plan_result = supabase.table('meal_plan_management').select('user_id').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({
                'success': False,
                'error': 'Meal plan not found'
            }), 404
        
        target_user_id = plan_result.data[0]['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 403
        
        # Delete the meal plan
        delete_result = supabase.table('meal_plan_management').delete().eq('id', plan_id).execute()
        
        if delete_result.data:
            return jsonify({
                'success': True,
                'message': 'Meal plan deleted successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete meal plan'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f'Failed to delete user meal plan: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to delete meal plan: {str(e)}'
        }), 500


# ============================================================================
# ADMIN FOOD DETECTION HISTORY ROUTES
# ============================================================================

@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/detection-history', methods=['GET'])
@require_auth
def get_user_detection_history(enterprise_id, user_id):
    """
    Get all food detection history for a specific user in the enterprise.
    Admin can view all detection history for users in their organization.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 404
        
        # Get detection history for the user
        result = supabase.table('detection_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        detection_history = result.data or []
        
        return jsonify({
            'success': True,
            'detection_history': detection_history,
            'total_count': len(detection_history)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch user detection history: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to fetch detection history: {str(e)}'
        }), 500


@enterprise_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/health-history', methods=['GET'])
@require_auth
def get_user_health_history(enterprise_id, user_id):
    """
    Get health settings history for a specific user in the enterprise.
    Admin can view all health history for users in their organization.
    """
    try:
        supabase = get_supabase_client(use_admin=True)
        
        # Verify user has permission (must be admin or owner)
        is_admin, reason = check_user_is_org_admin(request.user_id, enterprise_id, supabase)
        if not is_admin:
            return jsonify({
                'success': False,
                'error': f'Access denied: {reason}'
            }), 403
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this organization'
            }), 404
        
        # Get settings history for the user
        result = supabase.table('user_settings_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        health_history = result.data or []
        
        return jsonify({
            'success': True,
            'health_history': health_history,
            'total_count': len(health_history)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to fetch user health history: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to fetch health history: {str(e)}'
        }), 500
