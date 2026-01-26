"""
Optimized Enterprise Management Routes
Production-ready, scalable enterprise operations with caching and performance optimizations.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Optional
import uuid
import secrets
from datetime import datetime, timedelta, timezone
import logging

from utils.enterprise_utils import (
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

logger = logging.getLogger(__name__)

enterprise_optimized_bp = Blueprint('enterprise_optimized', __name__)


# Register request lifecycle hooks
@enterprise_optimized_bp.before_request
def before_request():
    init_request_cache()


@enterprise_optimized_bp.after_request
def after_request(response):
    return cleanup_request_cache(response)


# ============================================================================
# ENTERPRISE REGISTRATION & MANAGEMENT
# ============================================================================

@enterprise_optimized_bp.route('/api/enterprise/register', methods=['POST'])
@require_auth
def register_enterprise():
    """Register a new enterprise/organization - Optimized"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'organization_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        supabase = get_admin_client()
        
        # Check permissions
        can_create, reason = check_user_can_create_organizations(
            request.user_id, supabase, getattr(request, 'user_metadata', None)
        )
        
        if not can_create:
            return jsonify({'error': reason}), 403
        
        # Check for existing enterprise with same email
        existing = supabase.table('enterprises').select('id').eq('email', data['email']).execute()
        if existing.data:
            return jsonify({'error': 'An organization with this email already exists'}), 400
        
        # Create enterprise
        enterprise_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'address': data.get('address'),
            'organization_type': data['organization_type'],
            'created_by': request.user_id
        }
        
        result = supabase.table('enterprises').insert(enterprise_data).execute()
        
        if not result.data:
            return jsonify({'error': 'Failed to create enterprise'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Enterprise registered successfully',
            'enterprise': result.data[0]
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering enterprise: {e}")
        return jsonify({'error': 'Failed to register organization. Please try again later.'}), 500


@enterprise_optimized_bp.route('/api/enterprise/my-enterprises', methods=['GET'])
@require_auth
def get_my_enterprises():
    """Get all enterprises owned by the current user - Optimized"""
    try:
        supabase = get_admin_client()
        
        result = supabase.table('enterprises').select('*').eq('created_by', request.user_id).execute()
        
        return jsonify({
            'success': True,
            'enterprises': result.data or []
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching enterprises: {e}")
        return jsonify({'error': f'Failed to fetch enterprises: {str(e)}', 'success': False}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/users', methods=['GET'])
@require_enterprise_admin
def get_enterprise_users(enterprise_id):
    """Get all users in an enterprise - Optimized with batch fetching"""
    try:
        supabase = get_admin_client()
        
        # Get organization users
        result = supabase.table('organization_users').select('*').eq('enterprise_id', enterprise_id).execute()
        
        if not result.data:
            return jsonify({
                'success': True,
                'users': [],
                'total_count': 0
            }), 200
        
        # Batch fetch user details
        user_ids = [org_user['user_id'] for org_user in result.data]
        user_details_map = batch_get_user_details(user_ids, supabase)
        
        # Get accepted invitations in one query
        invitations_result = supabase.table('invitations').select('*').eq('enterprise_id', enterprise_id).eq('status', 'accepted').execute()
        
        invitations_by_user_id = {}
        invitations_by_email = {}
        for inv in invitations_result.data or []:
            if inv.get('accepted_by'):
                invitations_by_user_id[inv['accepted_by']] = inv
            invitations_by_email[inv['email']] = inv
        
        # Format response
        users = []
        for org_user in result.data:
            user_id = org_user['user_id']
            user_info = user_details_map.get(user_id, {})
            
            # Find accepted invitation
            accepted_invitation = invitations_by_user_id.get(user_id) or invitations_by_email.get(user_info.get('email', ''))
            
            users.append({
                'id': org_user['id'],
                'user_id': user_id,
                'first_name': user_info.get('first_name', ''),
                'last_name': user_info.get('last_name', ''),
                'email': user_info.get('email', 'Unknown'),
                'role': org_user['role'],
                'status': org_user.get('status', 'active'),
                'joined_at': org_user['joined_at'],
                'notes': org_user.get('notes'),
                'metadata': org_user.get('metadata', {}),
                'accepted_invitation': {
                    'id': accepted_invitation['id'],
                    'accepted_at': accepted_invitation['accepted_at'],
                    'invited_by': accepted_invitation.get('invited_by'),
                } if accepted_invitation else None,
                'has_accepted_invitation': accepted_invitation is not None
            })
        
        return jsonify({
            'success': True,
            'users': users,
            'total_count': len(users)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching enterprise users: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch users: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/statistics', methods=['GET'])
@require_enterprise_admin
def get_enterprise_statistics(enterprise_id):
    """Get comprehensive statistics for an enterprise - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Get enterprise details (cached)
        enterprise = get_cached_enterprise(enterprise_id, supabase)
        if not enterprise:
            return jsonify({'success': False, 'error': 'Enterprise not found'}), 404
        
        owner_id = enterprise['created_by']
        
        # Get owner info (cached)
        owner_info = get_cached_user_details(owner_id, supabase)
        
        # Batch fetch statistics with optimized queries
        # Use count queries instead of fetching all data
        users_result = supabase.table('organization_users').select('status', count='exact').eq('enterprise_id', enterprise_id).execute()
        
        total_users = users_result.count or 0
        active_users = sum(1 for user in (users_result.data or []) if user.get('status', 'active') == 'active')
        
        # Get invitation statistics
        invitations_result = supabase.table('invitations').select('status', count='exact').eq('enterprise_id', enterprise_id).execute()
        
        total_invitations = invitations_result.count or 0
        pending_invitations = sum(1 for inv in (invitations_result.data or []) if inv.get('status') == 'pending')
        accepted_invitations = sum(1 for inv in (invitations_result.data or []) if inv.get('status') == 'accepted')
        
        max_users = enterprise.get('max_users', 100)
        
        statistics = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'pending_invitations': pending_invitations,
            'accepted_invitations': accepted_invitations,
            'total_invitations': total_invitations,
            'max_users': max_users,
            'capacity_percentage': round((total_users / max_users) * 100, 1) if max_users > 0 else 0,
            'owner_info': owner_info,
            'enterprise_name': enterprise.get('name', 'Unknown'),
            'organization_type': enterprise.get('organization_type', 'Unknown')
        }
        
        return jsonify({
            'success': True,
            'statistics': statistics
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching enterprise statistics: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch statistics: {str(e)}'}), 500


# ============================================================================
# MEAL PLAN MANAGEMENT - OPTIMIZED
# ============================================================================

@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/meal-plans', methods=['GET'])
@require_enterprise_admin
def get_user_meal_plans(enterprise_id, user_id):
    """Get all meal plans for a specific user - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({'success': False, 'error': 'User is not a member of this organization'}), 404
        
        # Get ALL meal plans for this user (admin sees both approved and pending)
        result = supabase.table('meal_plan_management').select('*').eq('user_id', user_id).order('updated_at', desc=True).execute()
        
        meal_plans = [format_meal_plan_response(plan) for plan in (result.data or [])]
        
        return jsonify({
            'success': True,
            'meal_plans': meal_plans,
            'total_count': len(meal_plans)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching user meal plans: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch meal plans: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/meal-plans', methods=['POST'])
@require_enterprise_admin
def create_user_meal_plan(enterprise_id, user_id):
    """Create a meal plan for a specific user - Optimized"""
    try:
        data = request.get_json()
        supabase = get_admin_client()
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({'success': False, 'error': 'User is not a member of this organization'}), 404
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Get admin's email (cached)
        admin_info = get_cached_user_details(request.user_id, supabase)
        admin_email = admin_info.get('email')
        
        # Prepare user_info with creator email
        user_info = data.get('user_info') or {}
        if isinstance(user_info, dict):
            user_info['creator_email'] = admin_email
            user_info['is_created_by_user'] = False
        else:
            user_info = {'creator_email': admin_email, 'is_created_by_user': False}
        
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
            'is_approved': True,  # Auto-approve for faster user experience
            'created_at': now,
            'updated_at': now
        }
        
        result = supabase.table('meal_plan_management').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            return jsonify({
                'success': True,
                'message': 'Meal plan created successfully.',
                'meal_plan': format_meal_plan_response(result.data[0])
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create meal plan'}), 500
            
    except Exception as e:
        logger.error(f"Error creating user meal plan: {e}")
        return jsonify({'success': False, 'error': f'Failed to create meal plan: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>/approve', methods=['POST'])
@require_enterprise_admin
def approve_meal_plan(enterprise_id, plan_id):
    """Approve a meal plan for a user - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Get and verify the meal plan in one query
        plan_result = supabase.table('meal_plan_management').select('*, user_id').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({'success': False, 'error': 'Meal plan not found'}), 404
        
        plan = plan_result.data[0]
        target_user_id = plan['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({'success': False, 'error': 'User is not a member of this organization'}), 403
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Set is_approved to TRUE
        update_result = supabase.table('meal_plan_management').update({
            'is_approved': True,
            'updated_at': now
        }).eq('id', plan_id).execute()
        
        if update_result.data:
            return jsonify({
                'success': True,
                'message': 'Meal plan approved! User can now see this plan.',
                'meal_plan': format_meal_plan_response(update_result.data[0])
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to approve meal plan'}), 500
            
    except Exception as e:
        logger.error(f"Error approving meal plan: {e}")
        return jsonify({'success': False, 'error': f'Failed to approve meal plan: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/meal-plan/<plan_id>', methods=['DELETE'])
@require_enterprise_admin
def delete_user_meal_plan(enterprise_id, plan_id):
    """Delete a meal plan - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Get the meal plan to verify ownership
        plan_result = supabase.table('meal_plan_management').select('user_id').eq('id', plan_id).execute()
        if not plan_result.data:
            return jsonify({'success': False, 'error': 'Meal plan not found'}), 404
        
        target_user_id = plan_result.data[0]['user_id']
        
        # Verify the user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', target_user_id).execute()
        if not membership.data:
            return jsonify({'success': False, 'error': 'User is not a member of this organization'}), 403
        
        # Delete the meal plan
        delete_result = supabase.table('meal_plan_management').delete().eq('id', plan_id).execute()
        
        if delete_result.data:
            return jsonify({
                'success': True,
                'message': 'Meal plan deleted successfully.'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to delete meal plan'}), 500
            
    except Exception as e:
        logger.error(f"Error deleting meal plan: {e}")
        return jsonify({'success': False, 'error': f'Failed to delete meal plan: {str(e)}'}), 500


# ============================================================================
# USER HEALTH HISTORY - OPTIMIZED
# ============================================================================

@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/health-history', methods=['GET'])
@require_enterprise_admin
def get_user_health_history(enterprise_id, user_id):
    """Get user health history - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Verify target user belongs to this enterprise
        membership = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not membership.data:
            return jsonify({'success': False, 'error': 'User is not a member of this organization'}), 404
        
        # Get health history from user_settings_history
        history_result = supabase.table('user_settings_history').select('*').eq('user_id', user_id).eq('settings_type', 'health_profile').order('created_at', desc=True).limit(50).execute()
        
        return jsonify({
            'success': True,
            'health_history': history_result.data or []
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching user health history: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch health history: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/user/<user_id>/settings', methods=['GET'])
@require_enterprise_admin
def get_user_settings_for_enterprise(enterprise_id, user_id):
    """Get user settings - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Verify user is part of the enterprise
        org_user = supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
        if not org_user.data:
            return jsonify({'error': 'User is not part of this enterprise'}), 404
        
        # Get user settings
        settings_result = supabase.table('user_settings').select('*').eq('user_id', user_id).eq('settings_type', 'health_profile').execute()
        
        # Get user details (cached)
        user_info = get_cached_user_details(user_id, supabase)
        
        settings_data = settings_result.data[0] if settings_result.data else None
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'user_name': user_info.get('name', 'Unknown'),
            'user_email': user_info.get('email', 'Unknown'),
            'settings': settings_data.get('settings_data', {}) if settings_data else {},
            'updated_at': settings_data.get('updated_at') if settings_data else None
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching user settings: {e}")
        return jsonify({'error': f'Failed to fetch user settings: {str(e)}'}), 500


@enterprise_optimized_bp.route('/api/enterprise/<enterprise_id>/settings-history', methods=['GET'])
@require_enterprise_admin
def get_enterprise_settings_history(enterprise_id):
    """Get settings change history for an enterprise - Optimized"""
    try:
        supabase = get_admin_client()
        
        # Get all user IDs in this enterprise
        org_users = supabase.table('organization_users').select('user_id').eq('enterprise_id', enterprise_id).execute()
        
        if not org_users.data:
            return jsonify({'success': True, 'history': []}), 200
        
        user_ids = [user['user_id'] for user in org_users.data]
        
        # Get settings history for these users
        history_result = supabase.table('user_settings_history').select('*').in_('user_id', user_ids).eq('settings_type', 'health_profile').order('created_at', desc=True).limit(100).execute()
        
        # Batch fetch user details
        unique_user_ids = list(set(record['user_id'] for record in (history_result.data or [])))
        user_details_map = batch_get_user_details(unique_user_ids, supabase)
        
        # Format history with user details
        import re
        history = []
        for record in history_result.data or []:
            user_info = user_details_map.get(record['user_id'], {})
            
            # Filter out numbered removed items
            changed_fields = record.get('changed_fields', [])
            meaningful_fields = [f for f in changed_fields if not re.match(r'^\d+\s*\(removed\)$', f)]
            
            history.append({
                'id': record['id'],
                'user_id': record['user_id'],
                'user_name': user_info.get('name', 'Unknown'),
                'user_email': user_info.get('email', 'Unknown'),
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
        logger.error(f"Error fetching settings history: {e}")
        return jsonify({'error': f'Failed to fetch settings history: {str(e)}'}), 500
