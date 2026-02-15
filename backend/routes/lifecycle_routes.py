from flask import Blueprint, request, jsonify
from services.lifecycle_subscription_service import LifecycleSubscriptionService
from utils.auth_utils import get_user_id_from_token
import uuid

# Create blueprint
lifecycle_bp = Blueprint('lifecycle', __name__)

def get_lifecycle_service():
    """Get lifecycle subscription service instance"""
    try:
        return LifecycleSubscriptionService()
    except Exception as e:
        print(f"Error initializing lifecycle service: {str(e)}")
        return None

@lifecycle_bp.route('/status', methods=['GET'])
def get_user_lifecycle_status():
    """Get user's lifecycle status"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.get_user_lifecycle_status(user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in get_user_lifecycle_status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/initialize-trial', methods=['POST'])
def initialize_trial():
    """Initialize trial for a new user"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        data = request.get_json() or {}
        duration_hours = data.get('duration_hours', 168)  # Default 168 hours (7 days)
        
        # Check if test mode is enabled
        test_mode = data.get('test_mode', False)
        if test_mode:
            duration_hours = 1/60  # 1 minute for testing
        
        result = lifecycle_service.initialize_user_trial(user_id, duration_hours)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in initialize_trial: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/mark-trial-used', methods=['POST'])
def mark_trial_used():
    """Mark trial as used and update user state"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.mark_trial_used(user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in mark_trial_used: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/activate-subscription', methods=['POST'])
def activate_subscription():
    """Activate subscription and update user state to paid"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request data required'
            }), 400
        
        duration_days = data.get('duration_days', 30)
        paystack_data = data.get('paystack_data', {})
        
        # Check if test mode is enabled
        test_mode = data.get('test_mode', False)
        if test_mode:
            duration_days = 1/60/24  # 1 minute for testing
        
        result = lifecycle_service.activate_subscription_for_days(
            user_id, duration_days, paystack_data
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in activate_subscription: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/mark-subscription-expired', methods=['POST'])
def mark_subscription_expired():
    """Mark subscription as expired and update user state"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.mark_subscription_expired(user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in mark_subscription_expired: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/set-test-mode', methods=['POST'])
def set_test_mode():
    """Enable/disable test mode with 1-minute durations"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        data = request.get_json() or {}
        test_mode = data.get('test_mode', True)
        
        result = lifecycle_service.set_test_mode(user_id, test_mode)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in set_test_mode: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/user-state-display', methods=['GET'])
def get_user_state_display():
    """Get user state display information for UI"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.get_user_state_display(user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in get_user_state_display: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/check-expired-trials', methods=['POST'])
def check_expired_trials():
    """Check for expired trials and mark them as used (admin function)"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.check_and_update_expired_trials()
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in check_expired_trials: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/check-expired-subscriptions', methods=['POST'])
def check_expired_subscriptions():
    """Check for expired subscriptions and mark them as expired (admin function)"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.check_and_update_expired_subscriptions()
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in check_expired_subscriptions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        result = lifecycle_service.get_subscription_plans()
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in get_subscription_plans: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lifecycle_bp.route('/verify-payment', methods=['POST'])
def verify_payment():
    """Verify Paystack payment"""
    try:
        user_id, error = get_user_id_from_token()
        if not user_id:
            return jsonify({
                'success': False,
                'error': error or 'Authentication required'
            }), 401
        
        lifecycle_service = get_lifecycle_service()
        if not lifecycle_service:
            return jsonify({
                'success': False,
                'error': 'Service not available'
            }), 500
        
        data = request.get_json()
        if not data or not data.get('reference'):
            return jsonify({
                'success': False,
                'error': 'Payment reference required'
            }), 400
        
        reference = data.get('reference')
        result = lifecycle_service.verify_paystack_payment(reference)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Error in verify_payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
