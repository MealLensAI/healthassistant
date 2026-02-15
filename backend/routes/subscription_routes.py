from flask import Blueprint, request, jsonify
import json
from datetime import datetime
from services.subscription_service import SubscriptionService
from services.auth_service import AuthService

subscription_bp = Blueprint('subscription', __name__)
subscription_service = SubscriptionService()
# auth_service will be initialized when needed

@subscription_bp.route('/status', methods=['GET'])
def get_subscription_status():
    """
    Get user's current subscription status
    """
    try:
        # Get user from request headers or query params
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Get subscription status
        result = subscription_service.get_user_subscription_status(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/feature-access', methods=['POST'])
def check_feature_access():
    """
    Check if user can use a specific feature
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        feature_name = data.get('feature_name')
        
        if not feature_name:
            return jsonify({
                'success': False,
                'error': 'Feature name required'
            }), 400
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Check feature access
        result = subscription_service.can_user_use_feature(user_id, feature_name)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/record-usage', methods=['POST'])
def record_feature_usage():
    """
    Record feature usage for a user
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        feature_name = data.get('feature_name')
        count = data.get('count', 1)
        
        if not feature_name:
            return jsonify({
                'success': False,
                'error': 'Feature name required'
            }), 400
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Record feature usage
        result = subscription_service.record_feature_usage(user_id, feature_name, count)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/create-trial', methods=['POST'])
def create_user_trial():
    """
    Create a trial for a new user
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        duration_days = data.get('duration_days', 7)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Create trial
        result = subscription_service.create_user_trial(user_id, duration_days)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/activate', methods=['POST'])
def activate_subscription():
    """
    Activate a subscription for a user after successful payment
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plan_name = data.get('plan_name')
        paystack_data = data.get('paystack_data', {})
        
        if not plan_name:
            return jsonify({
                'success': False,
                'error': 'Plan name required'
            }), 400
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Activate subscription
        result = subscription_service.activate_subscription(user_id, plan_name, paystack_data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/activate-days', methods=['POST'])
def activate_subscription_for_days():
    """
    Activate a subscription for a specific number of days
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        duration_days = data.get('duration_days')
        paystack_data = data.get('paystack_data', {})
        
        if not duration_days:
            return jsonify({
                'success': False,
                'error': 'Duration days required'
            }), 400
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Activate subscription for days
        result = subscription_service.activate_subscription_for_days(user_id, duration_days, paystack_data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """
    Get all available subscription plans
    """
    try:
        result = subscription_service.get_subscription_plans()
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/verify-payment', methods=['POST'])
def verify_payment():
    """
    Verify a Paystack payment
    """
    try:
        data = request.get_json()
        reference = data.get('reference')
        
        if not reference:
            return jsonify({
                'success': False,
                'error': 'Payment reference required'
            }), 400
        
        # Verify payment
        result = subscription_service.verify_paystack_payment(reference)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/webhook', methods=['POST'])
def process_webhook():
    """
    Process Paystack webhook events
    """
    try:
        # Get webhook data
        webhook_data = request.get_json()
        
        if not webhook_data:
            return jsonify({
                'success': False,
                'error': 'Webhook data required'
            }), 400
        
        # Process webhook
        result = subscription_service.process_paystack_webhook(webhook_data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/usage-stats', methods=['GET'])
def get_usage_stats():
    """
    Get user's feature usage statistics
    """
    try:
        # Get user from request headers or query params
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID required'
            }), 400
        
        # Get usage stats
        result = subscription_service.get_user_usage_stats(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@subscription_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for subscription service
    """
    try:
        # Test database connection
        plans_result = subscription_service.get_subscription_plans()
        
        return jsonify({
            'success': True,
            'service': 'subscription',
            'status': 'healthy',
            'database': 'connected' if plans_result['success'] else 'disconnected',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'service': 'subscription',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


