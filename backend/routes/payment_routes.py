from flask import Blueprint, request, jsonify, current_app
from services.payment_service import PaymentService
from services.auth_service import AuthService
from services.subscription_service import SubscriptionService
from utils.auth_utils import get_user_id_from_token
import uuid
from datetime import datetime
from typing import Optional

payment_bp = Blueprint('payment', __name__)

def get_payment_service() -> Optional[PaymentService]:
    """Get payment service instance."""
    if not hasattr(current_app, 'payment_service'):
        return None
    return current_app.payment_service

def get_auth_service() -> Optional[AuthService]:
    """Get auth service instance."""
    if not hasattr(current_app, 'auth_service'):
        return None
    return current_app.auth_service

def authenticate_user() -> Optional[str]:
    """Authenticate user and return user ID using common helper (supports header or cookie)."""
    try:
        user_id, error = get_user_id_from_token()
        return user_id
    except Exception:
        return None

@payment_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """Get all available subscription plans."""
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    result = payment_service.get_subscription_plans()
    if result['success']:
        return jsonify({
            'status': 'success',
            'plans': result['data']
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': result['error']
        }), 500

@payment_bp.route('/subscription', methods=['GET'])
def get_user_subscription():
    """Get current user's subscription."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    subscription = payment_service.get_user_subscription(user_id)
    return jsonify({
        'status': 'success',
        'subscription': subscription
    }), 200

@payment_bp.route('/usage', methods=['GET'])
def get_user_usage():
    """Get current user's usage summary."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    result = payment_service.get_user_usage_summary(user_id)
    if result['success']:
        return jsonify({
            'status': 'success',
            'usage': result['data']
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': result['error']
        }), 500

@payment_bp.route('/check-usage/<feature_name>', methods=['GET'])
def check_feature_usage(feature_name):
    """Check if user can use a specific feature."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    usage_check = payment_service.can_use_feature(user_id, feature_name)
    return jsonify({
        'status': 'success',
        'can_use': usage_check.get('can_use', False),
        'current_usage': usage_check.get('current_usage', 0),
        'limit': usage_check.get('limit', 0),
        'remaining': usage_check.get('remaining', 0),
        'message': usage_check.get('message', '')
    }), 200

@payment_bp.route('/record-usage/<feature_name>', methods=['POST'])
def record_feature_usage(feature_name):
    """Record usage of a feature."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    # Check if user can use the feature
    usage_check = payment_service.can_use_feature(user_id, feature_name)
    if not usage_check.get('can_use', False):
        return jsonify({
            'status': 'error',
            'message': usage_check.get('message', 'Usage limit exceeded'),
            'current_usage': usage_check.get('current_usage', 0),
            'limit': usage_check.get('limit', 0)
        }), 403
    
    # Record the usage
    data = request.get_json() or {}
    count = data.get('count', 1)
    
    success = payment_service.record_usage(user_id, feature_name, count)
    if success:
        return jsonify({
            'status': 'success',
            'message': 'Usage recorded successfully'
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': 'Failed to record usage'
        }), 500

@payment_bp.route('/initialize-payment', methods=['POST'])
def initialize_payment():
    """Initialize a Paystack payment."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    data = request.get_json()
    if not data:
        return jsonify({
            'status': 'error',
            'message': 'Request data required'
        }), 400
    
    email = data.get('email')
    amount = data.get('amount')  # Amount in KES
    plan_id = data.get('plan_id')
    callback_url = data.get('callback_url')
    
    if not all([email, amount, plan_id]):
        return jsonify({
            'status': 'error',
            'message': 'Email, amount, and plan_id are required'
        }), 400
    
    # Generate unique reference
    reference = f"ML_{user_id}_{uuid.uuid4().hex[:8]}"
    
    # Convert amount to kobo (Paystack uses smallest currency unit)
    amount_kobo = int(amount * 100)
    
    # Initialize transaction
    result = payment_service.initialize_transaction(
        email=email,
        amount=amount_kobo,
        reference=reference,
        callback_url=callback_url,
        metadata={
            'user_id': user_id,
            'plan_id': plan_id,
            'amount_kes': amount
        }
    )
    
    if result.get('status'):
        # Save transaction record
        transaction_data = {
            'id': result['data']['id'],
            'reference': reference,
            'amount': amount_kobo,
            'currency': 'KES',
            'status': 'pending',
            'description': f'Subscription payment for plan {plan_id}'
        }
        
        payment_service.save_payment_transaction(user_id, transaction_data)
        
        return jsonify({
            'status': 'success',
            'data': {
                'authorization_url': result['data']['authorization_url'],
                'reference': reference,
                'access_code': result['data']['access_code']
            }
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': result.get('message', 'Failed to initialize payment')
        }), 500

@payment_bp.route('/verify-payment/<reference>', methods=['GET'])
def verify_payment(reference):
    """Verify a payment transaction."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    # Verify with Paystack
    result = payment_service.verify_transaction(reference)
    
    if result.get('status') and result['data']['status'] == 'success':
        # Update transaction status
        payment_service.save_payment_transaction(user_id, result['data'])
        
        # Get metadata to determine plan
        metadata = result['data'].get('metadata', {})
        plan_id = metadata.get('plan_id')
        
        if plan_id:
            # Create or update user subscription
            subscription_result = payment_service.create_user_subscription(
                user_id=user_id,
                plan_id=plan_id,
                paystack_data={
                    'transaction_id': result['data']['id'],
                    'reference': reference
                }
            )
            
            if subscription_result['success']:
                return jsonify({
                    'status': 'success',
                    'message': 'Payment verified and subscription activated',
                    'subscription': subscription_result['data']
                }), 200
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Payment verified but failed to activate subscription'
                }), 500
        
        return jsonify({
            'status': 'success',
            'message': 'Payment verified successfully'
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': 'Payment verification failed'
        }), 400

@payment_bp.route('/webhook', methods=['POST'])
def paystack_webhook():
    """Handle Paystack webhook events."""
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    # Get webhook signature
    signature = request.headers.get('X-Paystack-Signature')
    if not signature:
        return jsonify({
            'status': 'error',
            'message': 'Missing webhook signature'
        }), 400
    
    # Verify signature
    payload = request.get_data(as_text=True)
    if not payment_service.verify_webhook_signature(payload, signature):
        return jsonify({
            'status': 'error',
            'message': 'Invalid webhook signature'
        }), 400
    
    # Process webhook
    try:
        event_data = request.get_json()
        result = payment_service.process_webhook(event_data)
        
        if result['success']:
            return jsonify({'status': 'success'}), 200
        else:
            return jsonify({
                'status': 'error',
                'message': result['error']
            }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@payment_bp.route('/cancel-subscription', methods=['POST'])
def cancel_subscription():
    """Cancel user's subscription."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    payment_service = get_payment_service()
    if not payment_service:
        return jsonify({
            'status': 'error',
            'message': 'Payment service not configured'
        }), 500
    
    try:
        # Update subscription to cancel at period end
        from datetime import timezone
        result = current_app.supabase_service.supabase.table('user_subscriptions').update({
            'cancel_at_period_end': True,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('user_id', user_id).eq('status', 'active').execute()
        
        if result.data:
            return jsonify({
                'status': 'success',
                'message': 'Subscription will be cancelled at the end of the current period'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'No active subscription found'
            }), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@payment_bp.route('/upgrade-subscription', methods=['POST'])
def upgrade_subscription():
    """Upgrade user's subscription."""
    user_id = authenticate_user()
    if not user_id:
        return jsonify({
            'status': 'error',
            'message': 'Authentication required'
        }), 401
    
    data = request.get_json()
    if not data or 'plan_id' not in data:
        return jsonify({
            'status': 'error',
            'message': 'Plan ID is required'
        }), 400
    
    plan_id = data['plan_id']
    
    try:
        # Get plan details
        plan_result = current_app.supabase_service.supabase.table('subscription_plans').select('*').eq('id', plan_id).single().execute()
        if not plan_result.data:
            return jsonify({
                'status': 'error',
                'message': 'Plan not found'
            }), 404
        
        plan = plan_result.data
        
        # Create new subscription
        payment_service = get_payment_service()
        if payment_service:
            subscription_result = payment_service.create_user_subscription(
                user_id=user_id,
                plan_id=plan_id
            )
            
            if subscription_result['success']:
                return jsonify({
                    'status': 'success',
                    'message': 'Subscription upgraded successfully',
                    'plan': plan
                }), 200
            else:
                return jsonify({
                    'status': 'error',
                    'message': subscription_result['error']
                }), 500
        
        return jsonify({
            'status': 'error',
            'message': 'Payment service not available'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@payment_bp.route('/status', methods=['GET'])
def payment_status():
    """Payment system status endpoint."""
    return jsonify({
        'status': 'enabled',
        'message': 'Payment system is now enabled with real Paystack integration',
        'available_features': [
            'Subscription plans (Free, Basic, Premium, Enterprise)',
            'Usage tracking and limits',
            'Paystack payment processing (KES)',
            'Webhook handling',
            'Automatic limit enforcement'
        ],
        'currency': 'KES',
        'payment_provider': 'Paystack'
    }), 200

@payment_bp.route('/success', methods=['POST'])
def handle_payment_success():
    """
    Handle successful payment and activate subscription
    """
    try:
        print("🎉 PAYMENT SUCCESS WEBHOOK RECEIVED!")
        print("=" * 60)
        print(f"🌐 Request from: {request.remote_addr}")
        print(f"📅 Timestamp: {datetime.now()}")
        print(f"🔗 Request URL: {request.url}")
        print(f"📋 Request Headers: {dict(request.headers)}")
        print("-" * 60)
        
        # Get payment data from request
        data = request.get_json()
        if not data:
            print("❌ No payment data received")
            print(f"🔍 Raw request data: {request.get_data()}")
            return jsonify({'success': False, 'error': 'No payment data'}), 400
        
        # Extract payment information
        user_id = data.get('user_id')
        email = data.get('email')
        plan_name = data.get('plan_name')
        plan_duration_minutes = data.get('plan_duration_minutes', 30)
        paystack_data = data.get('paystack_data', {})
        
        print(f"👤 User ID: {user_id}")
        print(f"📧 User Email: {email}")
        print(f"📋 Plan Name: {plan_name}")
        print(f"⏰ Plan Duration: {plan_duration_minutes} minutes")
        print(f"💳 Paystack Data: {paystack_data}")
        print(f"📊 Full request data: {data}")
        print("-" * 60)
        
        if not user_id or not email or not plan_name:
            print("❌ Missing required fields")
            return jsonify({
                'success': False, 
                'error': 'Missing required fields: user_id, email, plan_name'
            }), 400
        
        # Initialize subscription service using centralized Supabase client
        from flask import current_app
        if hasattr(current_app, 'supabase_service') and current_app.supabase_service:
            subscription_service = SubscriptionService(current_app.supabase_service.supabase)
        else:
            subscription_service = SubscriptionService()
        
        # Use the provided user_id directly (we're using Supabase auth)
        print(f"✅ Using provided user ID: {user_id}")
        
        # Now activate subscription for the user
        print(f"🔄 Activating subscription for user ID: {user_id}...")
        result = subscription_service.activate_subscription_for_minutes(
            user_id=user_id,  # Use the actual user ID from profiles table
            duration_minutes=plan_duration_minutes,
            paystack_data=paystack_data
        )
        
        if result['success']:
            print("✅ SUBSCRIPTION ACTIVATED SUCCESSFULLY!")
            print(f"🎉 PAYMENT COMPLETED FOR: {email}")
            
            # Extract user name from Paystack custom fields
            user_name = 'Unknown'
            if paystack_data.get('custom_fields'):
                for field in paystack_data['custom_fields']:
                    if field.get('variable_name') == 'name':
                        user_name = field.get('value', 'Unknown')
                        break
            
            print(f"👤 USER NAME: {user_name}")
            print(f"💳 SUBSCRIPTION PAID FOR: {plan_name}")
            print(f"💰 AMOUNT PAID: ${paystack_data.get('amount', 'Unknown')}")
            print(f"🔗 PAYSTACK REFERENCE: {paystack_data.get('reference', 'Unknown')}")
            print(f"📊 Subscription ID: {result['data']['subscription_id']}")
            print(f"📅 Start Date: {result['data']['start_date']}")
            print(f"📅 End Date: {result['data']['end_date']}")
            print(f"⏰ Duration: {result['data']['duration_days']} days")
            print("=" * 60)
            
            return jsonify({
                'success': True,
                'message': 'Subscription activated successfully',
                'data': result['data']
            }), 200
        else:
            # Check if it's a duplicate subscription error
            if 'duplicate key' in str(result['error']).lower() and 'active' in str(result['error']).lower():
                print("⚠️ User already has an active subscription")
                print("✅ Payment processed successfully - subscription already active")
                print("=" * 60)
                
                return jsonify({
                    'success': True,
                    'message': 'Payment processed successfully - subscription already active',
                    'data': {
                        'subscription_id': 'existing',
                        'plan_name': plan_name,
                        'duration_minutes': plan_duration_minutes,
                        'status': 'already_active'
                    }
                }), 200
            else:
                print(f"❌ FAILED TO ACTIVATE SUBSCRIPTION: {result['error']}")
                print(f"👤 User ID that failed: {user_id}")
                print(f"📧 Email that failed: {email}")
                print(f"📋 Plan that failed: {plan_name}")
                print(f"⏰ Duration that failed: {plan_duration_minutes}")
                print("=" * 60)
                
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500
            
    except Exception as e:
        print(f"💥 ERROR IN PAYMENT SUCCESS HANDLER: {str(e)}")
        print("=" * 60)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 