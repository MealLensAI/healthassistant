import os
import requests
import json
from typing import Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from supabase import Client
import hashlib
import hmac

class PaymentService:
    """
    Service for handling Paystack payments, subscriptions, and usage tracking.
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.paystack_secret_key = os.environ.get('PAYSTACK_SECRET_KEY')
        self.paystack_public_key = os.environ.get('PAYSTACK_PUBLIC_KEY')
        self.paystack_base_url = 'https://api.paystack.co'
        
        if not self.paystack_secret_key:
            raise ValueError("PAYSTACK_SECRET_KEY environment variable is required")
    
    def _make_paystack_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Dict:
        """Make a request to Paystack API."""
        url = f"{self.paystack_base_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.paystack_secret_key}',
            'Content-Type': 'application/json'
        }
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Paystack API request failed: {str(e)}")
            return {'status': False, 'message': str(e)}
    
    def create_customer(self, email: str, first_name: str = None, last_name: str = None) -> Dict:
        """Create a Paystack customer."""
        data = {
            'email': email,
            'first_name': first_name or '',
            'last_name': last_name or ''
        }
        
        return self._make_paystack_request('/customer', 'POST', data)
    
    def initialize_transaction(self, email: str, amount: int, reference: str, 
                             callback_url: str = None, metadata: Dict = None,
                             currency: str = 'USD') -> Dict:
        """Initialize a Paystack transaction."""
        data = {
            'email': email,
            'amount': amount,  # Amount in smallest currency unit
            'reference': reference,
            'currency': currency,
            'metadata': metadata or {}
        }
        if callback_url:
            data['callback_url'] = callback_url
        
        return self._make_paystack_request('/transaction/initialize', 'POST', data)
    
    def verify_transaction(self, reference: str) -> Dict:
        """Verify a Paystack transaction."""
        return self._make_paystack_request(f'/transaction/verify/{reference}')
    
    def create_subscription(self, customer_email: str, plan_code: str, 
                          start_date: str = None) -> Dict:
        """Create a Paystack subscription."""
        data = {
            'customer': customer_email,
            'plan': plan_code,
            'start_date': start_date or datetime.now().strftime('%Y-%m-%d')
        }
        
        return self._make_paystack_request('/subscription', 'POST', data)
    
    def get_user_subscription(self, user_id: str) -> Dict:
        """Get user's current subscription."""
        try:
            result = self.supabase.rpc('get_user_subscription', {'p_user_id': user_id}).execute()
            return result.data if result.data else {}
        except Exception as e:
            print(f"Error getting user subscription: {str(e)}")
            return {}
    
    def can_use_feature(self, user_id: str, feature_name: str) -> Dict:
        """Check if user can use a specific feature."""
        try:
            result = self.supabase.rpc('can_use_feature', {
                'p_user_id': user_id,
                'p_feature_name': feature_name
            }).execute()
            return result.data if result.data else {'can_use': False}
        except Exception as e:
            print(f"Error checking feature usage: {str(e)}")
            return {'can_use': False, 'error': str(e)}
    
    def record_usage(self, user_id: str, feature_name: str, count: int = 1) -> bool:
        """Record usage of a feature."""
        try:
            result = self.supabase.rpc('record_usage', {
                'p_user_id': user_id,
                'p_feature_name': feature_name,
                'p_count': count
            }).execute()
            return True
        except Exception as e:
            print(f"Error recording usage: {str(e)}")
            return False
    
    def create_subscription_plan(self, plan_data: Dict) -> Dict:
        """Create a subscription plan in the database."""
        try:
            result = self.supabase.table('subscription_plans').insert(plan_data).execute()
            return {'success': True, 'data': result.data[0] if result.data else None}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_subscription_plans(self) -> Dict:
        """Get all available subscription plans."""
        try:
            result = self.supabase.table('subscription_plans').select('*').eq('is_active', True).execute()
            return {'success': True, 'data': result.data}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_user_subscription(self, user_id: str, plan_id: str, 
                               paystack_data: Dict = None) -> Dict:
        """Create a user subscription."""
        try:
            # Get plan details
            plan_result = self.supabase.table('subscription_plans').select('*').eq('id', plan_id).single().execute()
            if not plan_result.data:
                return {'success': False, 'error': 'Plan not found'}
            
            plan = plan_result.data
            
            # Calculate subscription period
            from datetime import timezone
            now = datetime.now(timezone.utc)
            period_start = now
            period_end = now + timedelta(days=30)  # Default to monthly
            
            subscription_data = {
                'user_id': user_id,
                'plan_id': plan_id,
                'status': 'active',
                'current_period_start': period_start.isoformat(),
                'current_period_end': period_end.isoformat(),
                'cancel_at_period_end': False,
                'metadata': paystack_data or {}
            }
            
            # Add Paystack references if available
            if paystack_data:
                subscription_data['paystack_subscription_id'] = paystack_data.get('subscription_id')
                subscription_data['paystack_customer_id'] = paystack_data.get('customer_id')
            
            result = self.supabase.table('user_subscriptions').insert(subscription_data).execute()
            return {'success': True, 'data': result.data[0] if result.data else None}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def save_payment_transaction(self, user_id: str, transaction_data: Dict) -> Dict:
        """Save a payment transaction."""
        try:
            payment_data = {
                'user_id': user_id,
                'paystack_transaction_id': transaction_data.get('id'),
                'paystack_reference': transaction_data.get('reference'),
                'amount': float(transaction_data.get('amount', 0)) / 100,  # Convert from kobo to KES
                'currency': transaction_data.get('currency', 'KES'),
                'status': transaction_data.get('status', 'pending'),
                'payment_method': transaction_data.get('channel'),
                'description': transaction_data.get('description', ''),
                'metadata': transaction_data
            }
            
            result = self.supabase.table('payment_transactions').insert(payment_data).execute()
            return {'success': True, 'data': result.data[0] if result.data else None}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Paystack webhook signature."""
        try:
            expected_signature = hmac.new(
                self.paystack_secret_key.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            print(f"Error verifying webhook signature: {str(e)}")
            print(f"Error verrifying webhook signature: {str(e)}")
            
            return False

    def process_webhook(self, event_data: Dict) -> Dict:
        """Process Paystack webhook events."""
        try:
            # Save webhook event
            webhook_data = {
                'event_type': event_data.get('event'),
                'paystack_event_id': event_data.get('id'),
                'paystack_reference': event_data.get('data', {}).get('reference'),
                'event_data': event_data
            }
            
            self.supabase.table('paystack_webhooks').insert(webhook_data).execute()
            
            # Process based on event type
            event_type = event_data.get('event')
            data = event_data.get('data', {})
            
            if event_type == 'charge.success':
                return self._handle_successful_charge(data)
            elif event_type == 'subscription.create':
                return self._handle_subscription_created(data)
            elif event_type == 'subscription.disable':
                return self._handle_subscription_disabled(data)
            else:
                return {'success': True, 'message': f'Event {event_type} processed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_successful_charge(self, data: Dict) -> Dict:
        """Handle successful charge event."""
        try:
            # Update transaction status
            reference = data.get('reference')
            if reference:
                self.supabase.table('payment_transactions').update({
                    'status': 'success',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('paystack_reference', reference).execute()
            
            return {'success': True, 'message': 'Charge processed successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_subscription_created(self, data: Dict) -> Dict:
        """Handle subscription created event."""
        try:
            # Update subscription status
            subscription_id = data.get('id')
            if subscription_id:
                self.supabase.table('user_subscriptions').update({
                    'status': 'active',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('paystack_subscription_id', subscription_id).execute()
            
            return {'success': True, 'message': 'Subscription activated'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_subscription_disabled(self, data: Dict) -> Dict:
        """Handle subscription disabled event."""
        try:
            # Update subscription status
            subscription_id = data.get('id')
            if subscription_id:
                self.supabase.table('user_subscriptions').update({
                    'status': 'cancelled',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('paystack_subscription_id', subscription_id).execute()
            
            return {'success': True, 'message': 'Subscription cancelled'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_user_usage_summary(self, user_id: str) -> Dict:
        """Get user's usage summary for current month."""
        try:
            # Get current month usage
            current_month = datetime.now().strftime('%Y-%m')
            
            result = self.supabase.table('usage_tracking').select(
                'feature_name, usage_count'
            ).eq('user_id', user_id).gte('usage_date', f'{current_month}-01').execute()
            
            usage_summary = {}
            for record in result.data:
                feature = record['feature_name']
                if feature not in usage_summary:
                    usage_summary[feature] = 0
                usage_summary[feature] += record['usage_count']
            
            return {'success': True, 'data': usage_summary}
        except Exception as e:
            return {'success': False, 'error': str(e)} 