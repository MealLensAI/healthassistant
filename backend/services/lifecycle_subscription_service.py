import os
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from supabase import create_client, Client

class LifecycleSubscriptionService:
    """
    Enhanced subscription service with user lifecycle management.
    Handles user states: new -> trial_used -> paid -> expired -> paid (renewal)
    """
    
    def __init__(self):
        # Initialize Supabase client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.paystack_secret_key = os.getenv('PAYSTACK_SECRET_KEY')
        self.paystack_public_key = os.getenv('PAYSTACK_PUBLIC_KEY')
        
    def get_user_lifecycle_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive user lifecycle status using the new database functions
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': True,
                    'data': {
                        'user_state': 'new',
                        'has_active_trial': False,
                        'has_active_subscription': False,
                        'can_access_app': False,
                        'trial_info': None,
                        'subscription_info': None,
                        'message': 'No user ID provided'
                    }
                }
            
            print(f"🔍 Getting lifecycle status for user: {user_id}")
            
            # Call the new database function
            result = self.supabase.rpc('get_user_lifecycle_status', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                print(f"✅ Lifecycle status retrieved: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ No lifecycle status data returned")
                return {
                    'success': False,
                    'error': 'No data returned from lifecycle status function'
                }
                
        except Exception as e:
            print(f"❌ Error getting lifecycle status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def initialize_user_trial(self, user_id: str, duration_hours: int = 168) -> Dict[str, Any]:
        """
        Initialize trial for a new user
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': False,
                    'error': 'Invalid user ID'
                }
            
            print(f"🔍 Initializing trial for user: {user_id}, duration: {duration_hours} hours")
            
            # Call the database function
            result = self.supabase.rpc('initialize_user_trial', {
                'p_user_id': user_id,
                'p_duration_hours': duration_hours
            }).execute()
            
            if result.data:
                print(f"✅ Trial initialized: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ Failed to initialize trial")
                return {
                    'success': False,
                    'error': 'Failed to initialize trial'
                }
                
        except Exception as e:
            print(f"❌ Error initializing trial: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def mark_trial_used(self, user_id: str) -> Dict[str, Any]:
        """
        Mark trial as used and update user state to trial_used
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': False,
                    'error': 'Invalid user ID'
                }
            
            print(f"🔍 Marking trial as used for user: {user_id}")
            
            # Call the database function
            result = self.supabase.rpc('mark_trial_used', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                print(f"✅ Trial marked as used: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ Failed to mark trial as used")
                return {
                    'success': False,
                    'error': 'Failed to mark trial as used'
                }
                
        except Exception as e:
            print(f"❌ Error marking trial as used: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def activate_subscription_for_days(self, user_id: str, duration_days: int, paystack_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Activate subscription for a specific number of days and update user state to paid
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': False,
                    'error': 'Invalid user ID'
                }
            
            print(f"🔍 Activating subscription for user: {user_id}, duration: {duration_days} days")
            
            # Get or create a default plan for custom duration
            plan_result = self.supabase.table('subscription_plans').select('*').eq('duration_days', duration_days).execute()
            if not plan_result.data:
                # Create a temporary plan for this duration
                plan_data = {
                    'name': f'custom_{duration_days}_days',
                    'display_name': f'{duration_days} Days',
                    'price_usd': paystack_data.get('amount', 0),
                    'duration_days': duration_days,
                    'features': ['Full app access'],
                    'is_active': True
                }
                plan_result = self.supabase.table('subscription_plans').insert(plan_data).execute()
            
            plan = plan_result.data[0]
            
            # Call the database function
            result = self.supabase.rpc('activate_user_subscription_lifecycle', {
                'p_user_id': user_id,
                'p_plan_id': plan['id'],
                'p_duration_days': duration_days,
                'p_paystack_data': paystack_data
            }).execute()
            
            if result.data:
                print(f"✅ Subscription activated: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ Failed to activate subscription")
                return {
                    'success': False,
                    'error': 'Failed to activate subscription'
                }
                
        except Exception as e:
            print(f"❌ Error activating subscription: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def mark_subscription_expired(self, user_id: str) -> Dict[str, Any]:
        """
        Mark subscription as expired and update user state to expired
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': False,
                    'error': 'Invalid user ID'
                }
            
            print(f"🔍 Marking subscription as expired for user: {user_id}")
            
            # Call the database function
            result = self.supabase.rpc('mark_subscription_expired', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                print(f"✅ Subscription marked as expired: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ Failed to mark subscription as expired")
                return {
                    'success': False,
                    'error': 'Failed to mark subscription as expired'
                }
                
        except Exception as e:
            print(f"❌ Error marking subscription as expired: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def set_test_mode(self, user_id: str, test_mode: bool = True) -> Dict[str, Any]:
        """
        Enable/disable test mode with 1-minute durations
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': False,
                    'error': 'Invalid user ID'
                }
            
            print(f"🔍 Setting test mode for user: {user_id}, enabled: {test_mode}")
            
            # Call the database function
            result = self.supabase.rpc('set_test_mode', {
                'p_user_id': user_id,
                'p_test_mode': test_mode
            }).execute()
            
            if result.data:
                print(f"✅ Test mode set: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ Failed to set test mode")
                return {
                    'success': False,
                    'error': 'Failed to set test mode'
                }
                
        except Exception as e:
            print(f"❌ Error setting test mode: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_state_display(self, user_id: str) -> Dict[str, Any]:
        """
        Get user state display information for UI
        """
        try:
            if not user_id or user_id == 'anon':
                return {
                    'success': True,
                    'data': {
                        'user_state': 'new',
                        'display_message': 'Welcome! You have a free trial.',
                        'show_trial_timer': True,
                        'show_subscription_timer': False,
                        'show_payment_prompt': False,
                        'can_access_app': True
                    }
                }
            
            print(f"🔍 Getting user state display for user: {user_id}")
            
            # Call the database function
            result = self.supabase.rpc('get_user_state_display', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                print(f"✅ User state display retrieved: {result.data}")
                return {
                    'success': True,
                    'data': result.data
                }
            else:
                print(f"❌ No user state display data returned")
                return {
                    'success': False,
                    'error': 'No data returned from user state display function'
                }
                
        except Exception as e:
            print(f"❌ Error getting user state display: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_and_update_expired_trials(self) -> Dict[str, Any]:
        """
        Check for expired trials and mark them as used
        """
        try:
            print("🔍 Checking for expired trials...")
            
            # Get all active trials that have expired
            expired_trials = self.supabase.table('user_trials').select(
                'user_id, id, end_date'
            ).eq('is_used', False).lt('end_date', datetime.now().isoformat()).execute()
            
            if not expired_trials.data:
                print("✅ No expired trials found")
                return {
                    'success': True,
                    'data': {
                        'expired_count': 0,
                        'message': 'No expired trials found'
                    }
                }
            
            # Mark each expired trial as used
            expired_count = 0
            for trial in expired_trials.data:
                result = self.mark_trial_used(trial['user_id'])
                if result['success']:
                    expired_count += 1
                    print(f"✅ Marked trial as used for user: {trial['user_id']}")
                else:
                    print(f"❌ Failed to mark trial as used for user: {trial['user_id']}")
            
            print(f"✅ Processed {expired_count} expired trials")
            return {
                'success': True,
                'data': {
                    'expired_count': expired_count,
                    'message': f'Processed {expired_count} expired trials'
                }
            }
            
        except Exception as e:
            print(f"❌ Error checking expired trials: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_and_update_expired_subscriptions(self) -> Dict[str, Any]:
        """
        Check for expired subscriptions and mark them as expired
        """
        try:
            print("🔍 Checking for expired subscriptions...")
            
            # Get all active subscriptions that have expired
            expired_subscriptions = self.supabase.table('user_subscriptions').select(
                'user_id, id, end_date'
            ).eq('status', 'active').lt('end_date', datetime.now().isoformat()).execute()
            
            if not expired_subscriptions.data:
                print("✅ No expired subscriptions found")
                return {
                    'success': True,
                    'data': {
                        'expired_count': 0,
                        'message': 'No expired subscriptions found'
                    }
                }
            
            # Mark each expired subscription as expired
            expired_count = 0
            for subscription in expired_subscriptions.data:
                result = self.mark_subscription_expired(subscription['user_id'])
                if result['success']:
                    expired_count += 1
                    print(f"✅ Marked subscription as expired for user: {subscription['user_id']}")
                else:
                    print(f"❌ Failed to mark subscription as expired for user: {subscription['user_id']}")
            
            print(f"✅ Processed {expired_count} expired subscriptions")
            return {
                'success': True,
                'data': {
                    'expired_count': expired_count,
                    'message': f'Processed {expired_count} expired subscriptions'
                }
            }
            
        except Exception as e:
            print(f"❌ Error checking expired subscriptions: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_subscription_plans(self) -> Dict[str, Any]:
        """
        Get all available subscription plans
        """
        try:
            result = self.supabase.table('subscription_plans').select('*').eq('is_active', True).execute()
            
            if result.data:
                return {
                    'success': True,
                    'plans': result.data
                }
            
            return {
                'success': False,
                'error': 'No plans found'
            }
            
        except Exception as e:
            print(f"Error getting subscription plans: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_paystack_payment(self, reference: str) -> Dict[str, Any]:
        """
        Verify payment with Paystack
        """
        try:
            if not self.paystack_secret_key:
                return {
                    'success': False,
                    'error': 'Paystack secret key not configured'
                }
            
            # Verify payment with Paystack
            headers = {
                'Authorization': f'Bearer {self.paystack_secret_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') and data['data'].get('status') == 'success':
                    return {
                        'success': True,
                        'data': data['data'],
                        'message': 'Payment verified successfully'
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Payment verification failed',
                        'data': data
                    }
            else:
                return {
                    'success': False,
                    'error': f'Paystack API error: {response.status_code}',
                    'data': response.text
                }
                
        except Exception as e:
            print(f"Error verifying Paystack payment: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
