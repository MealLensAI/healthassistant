"""
User Settings Routes - Refactored with Dependency Injection
"""
from flask import Blueprint, request, jsonify
from utils.auth_utils import get_user_id_from_token, log_error
from core.dependencies import get_supabase_service

user_settings_bp = Blueprint('user_settings', __name__)


@user_settings_bp.route('/settings', methods=['POST'])
def save_user_settings():
    """
    Saves user settings to the database. Requires authentication.
    """
    try:
        # Authenticate user
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({
                'status': 'error',
                'message': f'Authentication failed: {error}'
            }), 401

        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Settings data is required'
            }), 400

        settings_type = data.get('settings_type', 'health_profile')
        settings_data = data.get('settings_data', {})

        if not settings_data:
            return jsonify({
                'status': 'error',
                'message': 'Settings data cannot be empty'
            }), 400

        # Get service from DI container
        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({
                'status': 'error',
                'message': 'Service unavailable'
            }), 503

        # Save settings
        success, error = supabase_service.save_user_settings(
            user_id, settings_type, settings_data
        )
        
        if success:
            if settings_type == 'health_profile':
                try:
                    supabase_service.delete_food_for_you(user_id)
                except Exception as clear_error:
                    log_error(
                        f"Settings saved but failed to clear food_for_you for user {user_id}",
                        clear_error,
                    )
            saved_record, fetch_error = supabase_service.get_user_settings(user_id, settings_type)
            if fetch_error:
                log_error(
                    f"Settings saved but failed to reload for user {user_id}",
                    Exception(fetch_error)
                )
            response_payload = {
                'status': 'success',
                'message': 'Settings saved successfully'
            }
            if saved_record:
                response_payload.update({
                    'settings': saved_record.get('settings_data', {}),
                    'settings_type': saved_record.get('settings_type'),
                    'updated_at': saved_record.get('updated_at')
                })
            else:
                response_payload['settings'] = settings_data
                response_payload['settings_type'] = settings_type
            return jsonify(response_payload), 200
        else:
            log_error(
                f"Failed to save settings for user {user_id}",
                Exception(error or 'Unknown error')
            )
            return jsonify({
                'status': 'error',
                'message': f'Failed to save settings: {error}'
            }), 500

    except Exception as e:
        log_error("Unexpected error in save_user_settings", e)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@user_settings_bp.route('/settings', methods=['GET'])
def get_user_settings():
    """
    Retrieves user settings from the database. Requires authentication.
    """
    try:
        # Authenticate user
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({
                'status': 'error',
                'message': f'Authentication failed: {error}'
            }), 401

        settings_type = request.args.get('settings_type', 'health_profile')
        
        # Get service from DI container
        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({
                'status': 'error',
                'message': 'Service unavailable'
            }), 503

        # Get settings
        settings_data, error = supabase_service.get_user_settings(
            user_id, settings_type
        )
        
        if error:
            log_error(
                f"Failed to get settings for user {user_id}",
                Exception(error)
            )
            return jsonify({
                'status': 'error',
                'message': f'Failed to get settings: {error}'
            }), 500

        if settings_data:
            return jsonify({
                'status': 'success',
                'settings': settings_data.get('settings_data', {}),
                'settings_type': settings_data.get('settings_type'),
                'updated_at': settings_data.get('updated_at')
            }), 200
        else:
            return jsonify({
                'status': 'success',
                'settings': {},
                'message': 'No settings found'
            }), 200

    except Exception as e:
        log_error("Unexpected error in get_user_settings", e)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@user_settings_bp.route('/settings', methods=['DELETE'])
def delete_user_settings():
    """
    Deletes user settings from the database. Requires authentication.
    """
    try:
        # Authenticate user
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({
                'status': 'error',
                'message': f'Authentication failed: {error}'
            }), 401

        settings_type = request.args.get('settings_type', 'health_profile')
        
        # Get service from DI container
        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({
                'status': 'error',
                'message': 'Service unavailable'
            }), 503

        # Delete settings
        success, error = supabase_service.delete_user_settings(
            user_id, settings_type
        )
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Settings deleted successfully'
            }), 200
        else:
            log_error(
                f"Failed to delete settings for user {user_id}",
                Exception(error or 'Unknown error')
            )
            return jsonify({
                'status': 'error',
                'message': f'Failed to delete settings: {error}'
            }), 500

    except Exception as e:
        log_error("Unexpected error in delete_user_settings", e)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500
