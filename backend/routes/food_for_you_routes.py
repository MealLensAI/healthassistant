from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import get_user_id_from_token, log_error

food_for_you_bp = Blueprint('food_for_you', __name__)


@food_for_you_bp.route('/food-for-you', methods=['GET'])
def get_food_for_you():
    """Return the signed-in user's Food for you recommendations (1:1)."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        record, fetch_error = supabase_service.get_food_for_you(user_id)
        if fetch_error:
            log_error(f"Failed to get food_for_you for user {user_id}", Exception(fetch_error))
            return jsonify({'status': 'error', 'message': fetch_error}), 500

        if not record:
            return jsonify({'status': 'success', 'data': None, 'foods': []}), 200

        return jsonify({
            'status': 'success',
            'data': record,
            'foods': record.get('foods') or [],
        }), 200
    except Exception as e:
        log_error("Unexpected error in get_food_for_you", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500


@food_for_you_bp.route('/food-for-you', methods=['PUT'])
def upsert_food_for_you():
    """Upsert Food for you recommendations for the signed-in user."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        payload = request.get_json() or {}
        foods = payload.get('foods')
        if not isinstance(foods, list) or len(foods) == 0:
            return jsonify({'status': 'error', 'message': 'foods must be a non-empty array'}), 400

        source_plan = payload.get('source_plan')
        supabase_service = current_app.supabase_service
        record, upsert_error = supabase_service.upsert_food_for_you(
            user_id,
            foods=foods,
            source_plan=source_plan,
        )
        if upsert_error:
            log_error(f"Failed to upsert food_for_you for user {user_id}", Exception(upsert_error))
            return jsonify({'status': 'error', 'message': upsert_error}), 500

        return jsonify({
            'status': 'success',
            'message': 'Food for you saved',
            'data': record,
            'foods': (record or {}).get('foods') or foods,
        }), 200
    except Exception as e:
        log_error("Unexpected error in upsert_food_for_you", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500


@food_for_you_bp.route('/food-for-you', methods=['DELETE'])
def delete_food_for_you():
    """Clear Food for you recommendations for the signed-in user."""
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        success, delete_error = supabase_service.delete_food_for_you(user_id)
        if not success:
            log_error(f"Failed to delete food_for_you for user {user_id}", Exception(delete_error or 'unknown'))
            return jsonify({'status': 'error', 'message': delete_error or 'Failed to delete'}), 500

        return jsonify({'status': 'success', 'message': 'Food for you cleared'}), 200
    except Exception as e:
        log_error("Unexpected error in delete_food_for_you", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500
