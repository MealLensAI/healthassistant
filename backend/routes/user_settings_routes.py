from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import get_user_id_from_token, log_error
import json

user_settings_bp = Blueprint('user_settings', __name__)


def _normalize_notifications(settings_record):
    raw_settings = settings_record.get('settings_data', {}) if settings_record else {}
    if isinstance(raw_settings, str):
        try:
            raw_settings = json.loads(raw_settings)
        except (json.JSONDecodeError, ValueError, TypeError):
            raw_settings = {}

    if isinstance(raw_settings, list):
        items = raw_settings
    else:
        items = raw_settings.get('items', []) if isinstance(raw_settings, dict) else []

    normalized_items = []
    for item in items:
        if not isinstance(item, dict):
            continue
        normalized_items.append({
            'id': item.get('id'),
            'type': item.get('type', 'email'),
            'title': item.get('title', 'Notification'),
            'message': item.get('message', ''),
            'created_at': item.get('created_at'),
            'read': bool(item.get('read', False))
        })

    unread_count = sum(1 for item in normalized_items if not item.get('read'))
    return {
        'items': normalized_items,
        'unread_count': unread_count
    }

@user_settings_bp.route('/settings', methods=['POST'])
def save_user_settings():
    """
    Saves user settings to the database. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Settings data is required'}), 400

        settings_type = data.get('settings_type', 'health_profile')
        settings_data = data.get('settings_data', {})

        if not settings_data:
            return jsonify({'status': 'error', 'message': 'Settings data cannot be empty'}), 400

        supabase_service = current_app.supabase_service
        success, error = supabase_service.save_user_settings(user_id, settings_type, settings_data)
        
        if success:
            saved_record, fetch_error = supabase_service.get_user_settings(user_id, settings_type)
            if fetch_error:
                log_error(f"Settings saved but failed to reload for user {user_id}", Exception(fetch_error))
            response_payload = {
                'status': 'success',
                'message': 'Settings saved successfully'
            }
            if saved_record:
                # Ensure settings_data is a dict, not a string
                settings_data_response = saved_record.get('settings_data', {})
                if isinstance(settings_data_response, str):
                    try:
                        settings_data_response = json.loads(settings_data_response)
                    except (json.JSONDecodeError, ValueError, TypeError):
                        settings_data_response = {}
                response_payload.update({
                    'settings': settings_data_response,
                    'settings_type': saved_record.get('settings_type'),
                    'updated_at': saved_record.get('updated_at')
                })
            else:
                response_payload['settings'] = settings_data
                response_payload['settings_type'] = settings_type
            return jsonify(response_payload), 200
        else:
            log_error(f"Failed to save settings for user {user_id}", Exception(error or 'Unknown error'))
            return jsonify({'status': 'error', 'message': f'Failed to save settings: {error}'}), 500

    except Exception as e:
        log_error("Unexpected error in save_user_settings", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@user_settings_bp.route('/settings', methods=['GET'])
def get_user_settings():
    """
    Retrieves user settings from the database. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        settings_type = request.args.get('settings_type', 'health_profile')
        
        supabase_service = current_app.supabase_service
        settings_data, error = supabase_service.get_user_settings(user_id, settings_type)
        
        if error:
            log_error(f"Failed to get settings for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': f'Failed to get settings: {error}'}), 500

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
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@user_settings_bp.route('/settings', methods=['DELETE'])
def delete_user_settings():
    """
    Deletes user settings from the database. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        settings_type = request.args.get('settings_type', 'health_profile')
        
        supabase_service = current_app.supabase_service
        success, error = supabase_service.delete_user_settings(user_id, settings_type)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Settings deleted successfully'
            }), 200
        else:
            log_error(f"Failed to delete settings for user {user_id}", Exception(error or 'Unknown error'))
            return jsonify({'status': 'error', 'message': f'Failed to delete settings: {error}'}), 500

    except Exception as e:
        log_error("Unexpected error in delete_user_settings", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@user_settings_bp.route('/settings/history', methods=['GET'])
def get_user_settings_history():
    """
    Retrieves user settings history from the database. Requires authentication.
    Shows all changes made to user settings over time.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        settings_type = request.args.get('settings_type', 'health_profile')
        limit = request.args.get('limit', 50, type=int)  # Default to last 50 changes
        
        current_app.logger.info(f"[SETTINGS_HISTORY] Fetching history for user {user_id}, type: {settings_type}")
        
        # Use admin client to bypass RLS for history fetch
        from supabase import create_client
        import os
        admin_client = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        
        # Query settings history
        result = admin_client.table('user_settings_history')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('settings_type', settings_type)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        if result.data:
            current_app.logger.info(f"[SETTINGS_HISTORY] Found {len(result.data)} history records")
            return jsonify({
                'status': 'success',
                'history': result.data,
                'count': len(result.data)
            }), 200
        else:
            current_app.logger.info(f"[SETTINGS_HISTORY] No history found")
            return jsonify({
                'status': 'success',
                'history': [],
                'count': 0,
                'message': 'No settings history found'
            }), 200

    except Exception as e:
        log_error("Unexpected error in get_user_settings_history", e)
        current_app.logger.error(f"[SETTINGS_HISTORY] Error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@user_settings_bp.route('/settings/history/<record_id>', methods=['DELETE'])
def delete_user_settings_history(record_id):
    """
    Deletes a specific settings history record. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        
        if error:
            current_app.logger.warning(f"Authentication failed: {error}")
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        current_app.logger.info(f"Deleting settings history record {record_id} for user: {user_id}")
        
        supabase_service = current_app.supabase_service
        success, error = supabase_service.delete_settings_history(user_id, record_id)
        
        if success:
            return jsonify({'status': 'success', 'message': 'Settings history record deleted successfully.'}), 200
        else:
            return jsonify({'status': 'error', 'message': error or 'Failed to delete record'}), 404
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error in delete_user_settings_history: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@user_settings_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Retrieve in-app notifications for the authenticated user."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        settings_data, fetch_error = supabase_service.get_user_settings(user_id, 'in_app_notifications')
        if fetch_error:
            log_error(f"Failed to get notifications for user {user_id}", Exception(fetch_error))
            return jsonify({'status': 'error', 'message': f'Failed to load notifications: {fetch_error}'}), 500

        normalized = _normalize_notifications(settings_data)
        return jsonify({
            'status': 'success',
            'notifications': normalized.get('items', []),
            'unread_count': normalized.get('unread_count', 0)
        }), 200
    except Exception as e:
        log_error("Unexpected error in get_notifications", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@user_settings_bp.route('/notifications/read-all', methods=['POST'])
def mark_notifications_read():
    """Mark all notifications as read for the authenticated user."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        settings_data, fetch_error = supabase_service.get_user_settings(user_id, 'in_app_notifications')
        if fetch_error:
            log_error(f"Failed to load notifications for user {user_id}", Exception(fetch_error))
            return jsonify({'status': 'error', 'message': f'Failed to load notifications: {fetch_error}'}), 500

        normalized = _normalize_notifications(settings_data)
        marked_items = []
        for item in normalized.get('items', []):
            updated = dict(item)
            updated['read'] = True
            marked_items.append(updated)

        payload = {
            'items': marked_items,
            'unread_count': 0
        }
        success, save_error = supabase_service.save_user_settings(user_id, 'in_app_notifications', payload)
        if not success:
            log_error(f"Failed to mark notifications read for user {user_id}", Exception(save_error or 'Unknown error'))
            return jsonify({'status': 'error', 'message': f'Failed to update notifications: {save_error}'}), 500

        return jsonify({'status': 'success', 'message': 'All notifications marked as read'}), 200
    except Exception as e:
        log_error("Unexpected error in mark_notifications_read", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@user_settings_bp.route('/notifications/read', methods=['POST'])
def mark_notification_read():
    """Mark a single notification as read for the authenticated user."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json(silent=True) or {}
        notification_id = data.get('notification_id')
        if not notification_id:
            return jsonify({'status': 'error', 'message': 'notification_id is required'}), 400

        supabase_service = current_app.supabase_service
        settings_data, fetch_error = supabase_service.get_user_settings(user_id, 'in_app_notifications')
        if fetch_error:
            log_error(f"Failed to load notifications for user {user_id}", Exception(fetch_error))
            return jsonify({'status': 'error', 'message': f'Failed to load notifications: {fetch_error}'}), 500

        normalized = _normalize_notifications(settings_data)
        updated_items = []
        found = False
        for item in normalized.get('items', []):
            updated = dict(item)
            if str(updated.get('id')) == str(notification_id):
                updated['read'] = True
                found = True
            updated_items.append(updated)

        if not found:
            return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

        unread_count = sum(1 for item in updated_items if not item.get('read'))
        payload = {
            'items': updated_items,
            'unread_count': unread_count
        }
        success, save_error = supabase_service.save_user_settings(user_id, 'in_app_notifications', payload)
        if not success:
            log_error(f"Failed to mark notification read for user {user_id}", Exception(save_error or 'Unknown error'))
            return jsonify({'status': 'error', 'message': f'Failed to update notifications: {save_error}'}), 500

        return jsonify({
            'status': 'success',
            'message': 'Notification marked as read',
            'unread_count': unread_count
        }), 200
    except Exception as e:
        log_error("Unexpected error in mark_notification_read", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500
