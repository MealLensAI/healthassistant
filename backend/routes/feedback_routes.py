from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import get_user_id_from_token
from flasgger import swag_from
from core.swagger import swagger_path

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/feedback', methods=['POST'])
@swag_from(swagger_path('feedback/create.yml'))
def feedback():
    """
    Handles user feedback submission and stores it in the database.
    """
    supabase_service = current_app.supabase_service
    user_id, error = get_user_id_from_token()
    
    if error:
        return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401
    
    feedback_text = request.form.get('feedback_text') # Assuming feedback is sent as form data

    if not feedback_text:
        return jsonify({'status': 'error', 'message': 'Feedback text is required.'}), 400

    success, error = supabase_service.save_feedback(user_id, feedback_text)
    if success:
        return jsonify({'status': 'success', 'message': 'Feedback received.'}), 201
    else:
        print(f"Error saving feedback to Supabase: {error}")
        return jsonify({'status': 'error', 'message': 'Failed to save feedback.'}), 500
