from flask import Blueprint, request, jsonify
from services.supabase_service import SupabaseService
from services.auth_service import AuthService
from flasgger import swag_from
from core.swagger import swagger_path

ai_session_bp = Blueprint('ai_session', __name__)

@ai_session_bp.route('/api/store-session', methods=['POST'])
@swag_from(swagger_path('ai_session/store.yml'))
def store_session():
    """
    Store AI session data in Supabase.
    
    Required headers:
    - Authorization: Bearer <token> (Supabase session token)
    
    Required JSON body:
    {
        "session_data": {
            "prompt": "User prompt",
            "response": "AI response",
            "timestamp": "ISO timestamp",
            "metadata": {}  # Optional additional metadata
        }
    }
    """
    try:
        # Get auth token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401

        # Get user ID from auth token
        from flask import current_app
        auth_service = current_app.auth_service
        if not auth_service:
            return jsonify({'error': 'Authentication service not available'}), 500
        
        user_id, auth_type = auth_service.get_supabase_user_id_from_token(auth_header)
        if not user_id:
            return jsonify({'error': 'Invalid authentication token'}), 401

        # Get request data
        data = request.json
        if not data or 'session_data' not in data:
            return jsonify({'error': 'Missing session_data in request body'}), 400

        session_data = data['session_data']
        
        # Store in Supabase
        supabase_service = current_app.supabase_service
        if not supabase_service:
            return jsonify({'error': 'Supabase service not available'}), 500
        
        result = supabase_service.insert_ai_session(user_id, session_data)
        
        return jsonify({'status': 'success', 'session_id': result['id']}), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
