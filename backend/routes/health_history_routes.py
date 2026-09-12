from flask import Blueprint, request, jsonify, current_app
import json
from marshmallow import Schema, fields, ValidationError
from utils.auth_utils import get_user_id_from_token, log_error
from flasgger import swag_from
from core.swagger import swagger_path

health_history_bp = Blueprint('health_history', __name__)

class HealthHistorySchema(Schema):
    recipe_type = fields.Str(required=True)
    suggestion = fields.Str(required=False, allow_none=True, load_default="")
    instructions = fields.Str(required=False, allow_none=True, load_default="")
    ingredients = fields.Str(required=False, allow_none=True, load_default="")
    detected_foods = fields.Str(required=False, allow_none=True, load_default="")
    analysis_id = fields.Str(required=False, allow_none=True, load_default="")
    youtube_link = fields.Str(required=False, allow_none=True, load_default="")
    google_link = fields.Str(required=False, allow_none=True, load_default="")
    resources_link = fields.Str(required=False, allow_none=True, load_default="")

@health_history_bp.route('/health_history', methods=['GET'])
@swag_from(swagger_path('health_history/list.yml'))
def get_health_history():
    """
    Retrieves a user's health meal history from the database. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        
        if error:
            current_app.logger.warning(f"Authentication failed: {error}")
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        current_app.logger.info(f"Fetching health history for user: {user_id}")
        
        supabase_service = current_app.supabase_service
        # Use the same detection_history table but filter for health-related entries
        detection_history, error = supabase_service.get_detection_history(user_id)
        
        if detection_history is not None:
            record_count = len(detection_history) if detection_history else 0
            current_app.logger.info(f"Successfully retrieved {record_count} records for user {user_id}")
            
            response_data = {
                'status': 'success', 
                'detection_history': detection_history
            }
            
            return jsonify(response_data), 200
        else:
            current_app.logger.error(f"Database error for user {user_id}: {error}")
            return jsonify({'status': 'error', 'message': f'Failed to retrieve health history: {error}'}), 500
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_health_history: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@health_history_bp.route('/health_history', methods=['POST'])
@swag_from(swagger_path('health_history/create.yml'))
def create_health_history():
    """
    Saves health meal history. Allows saving health meal generation results.
    """
    supabase_service = current_app.supabase_service
    user_id, error = get_user_id_from_token()

    if error:
        return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    print(f"[HEALTH_HISTORY] Received payload from user {user_id}:", data)

    schema = HealthHistorySchema()
    try:
        validated = schema.load(data)
    except ValidationError as err:
        print(f"[HEALTH_HISTORY] Validation error: {err.messages}")
        return jsonify({'status': 'error', 'message': err.messages}), 400

    # Stringify detected_foods and ingredients to match Supabase text columns
    if isinstance(validated.get('detected_foods'), list):
        validated['detected_foods'] = json.dumps(validated['detected_foods'])
    if isinstance(validated.get('ingredients'), list):
        validated['ingredients'] = json.dumps(validated['ingredients'])

    youtube_url = validated.get('youtube_link') or ''
    google_url = validated.get('google_link') or ''
    resources_json = validated.get('resources_link') or ''

    print(f"[HEALTH_HISTORY] Attempting to save for user {user_id}...")
    success, error = supabase_service.save_detection_history(
        user_id=user_id,
        recipe_type=validated.get('recipe_type'),
        suggestion=validated.get('suggestion'),
        instructions=validated.get('instructions'),
        ingredients=validated.get('ingredients'),
        detected_foods=validated.get('detected_foods'),
        analysis_id=validated.get('analysis_id'),
        youtube_url=youtube_url,
        google_url=google_url,
        resources_json=resources_json
    )
    if not success:
        error_msg = str(error) if error else "Unknown error"
        print(f"[ERROR] Failed to save health history for user {user_id}: {error_msg}")
        return jsonify({'status': 'error', 'message': f'Failed to save health history: {error_msg}'}), 500

    print(f"[HEALTH_HISTORY] ✅ Successfully saved health history for user {user_id}")
    return jsonify({'status': 'success', 'message': 'Health history saved.'}), 201

@health_history_bp.route('/health_history/<record_id>', methods=['GET'])
@swag_from(swagger_path('health_history/get.yml'))
def get_health_history_by_id(record_id):
    """
    Retrieves a specific health history record by ID. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        
        if error:
            current_app.logger.warning(f"Authentication failed: {error}")
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        current_app.logger.info(f"Fetching health history record {record_id} for user: {user_id}")
        
        supabase_service = current_app.supabase_service
        # Direct query to get a specific record
        try:
            table_result = supabase_service.supabase.table('detection_history')\
                .select('*')\
                .eq('id', record_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if table_result.data and len(table_result.data) > 0:
                record = table_result.data[0]
                current_app.logger.info(f"Successfully retrieved record {record_id}")
                return jsonify({
                    'status': 'success',
                    'data': record
                }), 200
            else:
                current_app.logger.warning(f"Record {record_id} not found for user {user_id}")
                return jsonify({'status': 'error', 'message': 'Record not found'}), 404
        except Exception as e:
            current_app.logger.error(f"Database error fetching record {record_id}: {str(e)}")
            return jsonify({'status': 'error', 'message': f'Database error: {str(e)}'}), 500
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_health_history_by_id: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@health_history_bp.route('/health_history/<record_id>', methods=['DELETE'])
@swag_from(swagger_path('health_history/delete.yml'))
def delete_health_history(record_id):
    """
    Deletes a specific health history record. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        
        if error:
            current_app.logger.warning(f"Authentication failed: {error}")
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        current_app.logger.info(f"Deleting health history record {record_id} for user: {user_id}")
        
        supabase_service = current_app.supabase_service
        success, error = supabase_service.delete_detection_history(user_id, record_id)
        
        if success:
            return jsonify({'status': 'success', 'message': 'Health history record deleted successfully.'}), 200
        else:
            return jsonify({'status': 'error', 'message': error or 'Failed to delete record'}), 404
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error in delete_health_history: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

