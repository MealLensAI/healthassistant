from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import get_user_id_from_token, log_error
import json
import time
import httpx
import httpcore

user_settings_bp = Blueprint('user_settings', __name__)

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
            error_lower = str(error).lower()
            # Handle transient connection errors gracefully
            if 'resource temporarily unavailable' in error_lower or '35' in str(error):
                current_app.logger.warning(f"Transient connection error fetching settings for user {user_id}: {error}")
                # Return empty settings instead of error for transient issues
                return jsonify({
                    'status': 'success',
                    'settings': {},
                    'message': 'No settings found'
                }), 200
            else:
                log_error(f"Failed to get settings for user {user_id}", Exception(error))
                return jsonify({'status': 'error', 'message': f'Failed to get settings: {error}'}), 500

        if settings_data:
            # Parse settings_data if it's a string (JSONB can be returned as string)
            settings_data_response = settings_data.get('settings_data', {})
            
            if isinstance(settings_data_response, str):
                try:
                    settings_data_response = json.loads(settings_data_response)
                except (json.JSONDecodeError, ValueError, TypeError) as parse_error:
                    current_app.logger.error(f"Failed to parse settings_data as JSON for user {user_id}: {parse_error}")
                    settings_data_response = {}
            
            # Ensure it's a dict
            if not isinstance(settings_data_response, dict):
                settings_data_response = {}
            
            response_payload = {
                'status': 'success',
                'settings': settings_data_response,
                'settings_type': settings_data.get('settings_type'),
                'updated_at': settings_data.get('updated_at')
            }
            
            return jsonify(response_payload), 200
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
        
        # Use centralized Supabase service (already has service role key for admin operations)
        if hasattr(current_app, 'supabase_service') and current_app.supabase_service:
            admin_client = current_app.supabase_service.supabase
        else:
            # Fallback: create client only if app service not available
            from supabase import create_client
            import os
            admin_client = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            )
        
        # Query settings history with retry logic for connection errors
        
        result = None
        max_retries = 3
        retry_delay = 0.5  # seconds
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                result = admin_client.table('user_settings_history')\
                    .select('*')\
                    .eq('user_id', user_id)\
                    .eq('settings_type', settings_type)\
                    .order('created_at', desc=True)\
                    .limit(limit)\
                    .execute()
                break  # Success, exit retry loop
            except (httpx.ReadError, httpx.RemoteProtocolError, httpcore.ReadError, httpcore.RemoteProtocolError) as query_error:
                # These are connection errors that should be retried
                last_error = query_error
                error_type = type(query_error).__name__
                
                if attempt < max_retries - 1:
                    current_app.logger.debug(f"Connection error (attempt {attempt + 1}/{max_retries}), retrying...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    break
            except Exception as query_error:
                error_str = str(query_error).lower()
                error_type = type(query_error).__name__
                
                is_connection_error = (
                    'resource temporarily unavailable' in error_str or
                    'connectionterminated' in error_str or
                    'readerror' in error_str or
                    'remoteprotocolerror' in error_str or
                    '[errno 35]' in error_str or
                    'ConnectionTerminated' in str(query_error)
                )
                
                if is_connection_error and attempt < max_retries - 1:
                    last_error = query_error
                    current_app.logger.debug(f"Connection error (attempt {attempt + 1}/{max_retries}), retrying...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    if attempt == max_retries - 1:
                        current_app.logger.error(f"Query failed after {max_retries} attempts: {error_type}")
                    raise
        
        if result is None:
            if last_error:
                current_app.logger.warning(f"Returning empty history due to connection issues after {max_retries} attempts")
            return jsonify({
                'status': 'success',
                'message': 'No settings history found (connection issues)',
                'history': [],
                'count': 0
            }), 200
        
        if result.data and len(result.data) > 0:
            return jsonify({
                'status': 'success',
                'history': result.data,
                'count': len(result.data)
            }), 200
        else:
            return jsonify({
                'status': 'success',
                'history': [],
                'count': 0,
                'message': 'No settings history found'
            }), 200

    except Exception as e:
        error_str = str(e).lower()
        error_type = type(e).__name__
        
        # Check if it's a connection error that we should handle gracefully
        is_connection_error = (
            isinstance(e, (httpx.ReadError, httpx.RemoteProtocolError, httpcore.ReadError, httpcore.RemoteProtocolError)) or
            'resource temporarily unavailable' in error_str or
            'connectionterminated' in error_str or
            'readerror' in error_str or
            'remoteprotocolerror' in error_str or
            '[errno 35]' in error_str or
            error_type == 'RemoteProtocolError' or
            error_type == 'ReadError'
        )
        
        if is_connection_error:
            current_app.logger.warning(f"Connection error in settings history: {error_type}")
            return jsonify({
                'status': 'success',
                'history': [],
                'count': 0,
                'message': 'Temporary connection issue. Please try again.'
            }), 200
        
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
