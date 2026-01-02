import os
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from supabase import create_client, Client

class SubscriptionService:
    def __init__(self, supabase_client: Client = None):
        """
        Initialize SubscriptionService with a Supabase client.
        If no client is provided, creates one from environment variables (for backward compatibility).
        """
        if supabase_client:
            # Use provided client (from app.supabase_service)
            self.supabase: Client = supabase_client
        else:
            # Fallback: create client from env vars (for backward compatibility)
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            if not supabase_url or not supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            self.supabase: Client = create_client(supabase_url, supabase_key)
        self.paystack_secret_key = os.getenv('PAYSTACK_SECRET_KEY')
        self.paystack_public_key = os.getenv('PAYSTACK_PUBLIC_KEY')
        # Time unit override for testing: set SUB_TIME_UNIT=minutes to make 1 day == 1 minute
        # Supported values: 'days' (default), 'minutes', 'seconds'
        self.subscription_time_unit = (os.getenv('SUB_TIME_UNIT') or 'days').strip().lower()

    def _compute_end_date(self, start_date: datetime, duration_days: int) -> datetime:
        """
        Compute subscription end date respecting test-time overrides.

        If SUB_TIME_UNIT=minutes, we interpret "duration_days" as minutes for fast testing.
        If SUB_TIME_UNIT=seconds, interpret as seconds.
        Default is real days.
        """
        unit = self.subscription_time_unit
        if unit == 'minutes':
            return start_date + timedelta(minutes=duration_days)
        if unit == 'seconds':
            return start_date + timedelta(seconds=duration_days)
        # default: days
        return start_date + timedelta(days=duration_days)
        
    def get_user_subscription_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive subscription status for a user
        """
        try:
            supabase_user_id = None
            
            # Use provided user_id directly (we're using Supabase auth, not Firebase)
            if user_id and user_id != 'anon':
                supabase_user_id = user_id
            # Supabase-only implementation; no Firebase UID fallback
            
            if not supabase_user_id:
                return {
                    'success': True,
                    'data': {
                        'has_active_subscription': False,
                        'subscription': None,
                        'trial': None,
                        'can_access_app': False
                    }
                }
            
            # Get ALL subscriptions for user (not just active ones) to check for expiry
            subscription_result = self.supabase.table('user_subscriptions').select(
                'id, plan_id, status, current_period_start, current_period_end, created_at, updated_at'
            ).eq('user_id', supabase_user_id).execute()
            
            subscription = None
            has_active_subscription = False
            # Check if user has ever made any payments (completed transactions)
            payment_result = self.supabase.table('payment_transactions').select('id').eq('user_id', supabase_user_id).eq('status', 'completed').execute()
            has_ever_paid = len(payment_result.data) > 0
            
            # Also check if user has ever had a subscription (fallback for users who paid before payment transactions were working)
            has_ever_had_subscription = has_ever_paid or len(subscription_result.data) > 0
            
            if subscription_result.data:
                # Check all subscriptions for expiry, regardless of current status
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                for sub in subscription_result.data:
                    end_date_str = sub.get('current_period_end')
                    if end_date_str:
                        end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                        
                        # If subscription is marked as active but expired, auto-expire it
                        if sub['status'] == 'active' and end_date <= now:
                            try:
                                self.supabase.table('user_subscriptions').update({
                                    'status': 'expired',
                                    'updated_at': now.isoformat()
                                }).eq('id', sub['id']).execute()
                            except Exception as e:
                                pass  # Silent fail, not critical
                            # Don't consider this subscription as active
                            continue
                        
                        # Only consider subscription active if it's marked as active AND not expired
                        if sub['status'] == 'active' and end_date > now:
                            subscription = {
                                'id': sub['id'],
                                'plan_id': sub['plan_id'],
                                'plan_name': 'Unknown',  # We'll get this separately if needed
                                'status': sub['status'],
                                'start_date': sub['current_period_start'],
                                'end_date': sub['current_period_end'],
                                'created_at': sub['created_at'],
                                'updated_at': sub['updated_at']
                            }
                            has_active_subscription = True
                            break
            
            # Get trial info
            trial_result = self.supabase.table('user_trials').select('*').eq('user_id', supabase_user_id).order('created_at', desc=True).limit(1).execute()
            
            trial = None
            trial_active = False
            if trial_result.data:
                trial_data = trial_result.data[0]
                trial = {
                    'id': trial_data['id'],
                    'start_date': trial_data.get('start_date'),
                    'end_date': trial_data.get('end_date'),
                    'is_used': trial_data.get('is_used'),
                    'created_at': trial_data.get('created_at')
                }
                # Determine trial active: active if end_date in future (regardless of is_used)
                # is_used should only be set when trial actually expires, not when user pays
                try:
                    from datetime import datetime, timezone
                    if trial_data.get('end_date'):
                        trial_end = datetime.fromisoformat(str(trial_data['end_date']).replace('Z', '+00:00'))
                        now_dt = datetime.now(timezone.utc)
                        # Trial is active if end_date is in the future
                        # is_used is only set when trial actually expires, not when user pays
                        trial_active = (trial_end > now_dt)
                except Exception:
                    trial_active = False
            
            # Determine if user can access app (subscription OR active trial)
            can_access_app = has_active_subscription or trial_active
            
            # Check organization time restrictions if user is in an organization
            time_restriction_info = None
            if can_access_app:
                time_restriction_info = self._check_time_restrictions(supabase_user_id)
                if time_restriction_info and not time_restriction_info.get('can_access_now', True):
                    # User has access but is outside allowed time window
                    can_access_app = False
            
            return {
                'success': True,
                'data': {
                    'has_active_subscription': has_active_subscription,
                    'has_ever_had_subscription': has_ever_had_subscription,
                    'subscription': subscription,
                    'trial': trial,
                    'can_access_app': can_access_app,
                    'time_restriction': time_restriction_info
                }
            }
            
        except Exception as e:
            print(f"Error getting subscription status: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': {
                    'has_active_subscription': False,
                    'subscription': None,
                    'trial': None,
                    'can_access_app': False
                }
            }
    
    def can_user_use_feature(self, user_id: str, feature_name: str) -> Dict[str, Any]:
        """
        Check if user can use a specific feature
        """
        try:
            # Try to get user from Supabase auth first
            if user_id and user_id != 'anon':
                result = self.supabase.rpc(
                    'can_user_use_feature',
                    {'p_user_id': user_id, 'p_feature_name': feature_name}
                ).execute()
                
                if result.data:
                    return {
                        'success': True,
                        'data': result.data
                    }
            
            # No Firebase fallback
            
            # Return default response if no user found
            return {
                'success': True,
                'data': {
                    'can_use': False,
                    'feature_name': feature_name,
                    'plan_name': 'none',
                    'current_usage': 0,
                    'feature_available': False,
                    'message': 'No active subscription'
                }
            }
            
        except Exception as e:
            print(f"Error checking feature access: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': {
                    'can_use': False,
                    'feature_name': feature_name,
                    'plan_name': 'none',
                    'current_usage': 0,
                    'feature_available': False,
                    'message': 'Error checking access'
                }
            }
    
    def record_feature_usage(self, user_id: str, feature_name: str, count: int = 1) -> Dict[str, Any]:
        """
        Record feature usage for a user
        """
        try:
            # Try to get user from Supabase auth first
            if user_id and user_id != 'anon':
                result = self.supabase.rpc(
                    'record_feature_usage',
                    {'p_feature_name': feature_name, 'p_firebase_uid': None, 'p_user_id': user_id}
                ).execute()
                
                if result.data:
                    return {
                        'success': True,
                        'message': 'Feature usage recorded successfully'
                    }
            
            # No Firebase fallback
            
            return {
                'success': False,
                'error': 'User not found'
            }
            
        except Exception as e:
            print(f"Error recording feature usage: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_user_trial(self, user_id: str, duration_days: int = 30) -> Dict[str, Any]:
        """
        Create a trial for a new user
        """
        try:
            # Try to get user from Supabase auth first
            if user_id and user_id != 'anon':
                result = self.supabase.rpc(
                    'create_user_trial',
                    {'p_user_id': user_id, 'p_duration_days': duration_days}
                ).execute()
                
                if result.data:
                    return {
                        'success': True,
                        'message': 'Trial created successfully',
                        'duration_days': duration_days
                    }
            
            # No Firebase fallback
            
            return {
                'success': False,
                'error': 'User not found'
            }
            
        except Exception as e:
            print(f"Error creating trial: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def activate_subscription(self, user_id: str, plan_name: str, paystack_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Activate a subscription for a user and mark trial as used
        """
        try:
            # Get the plan details
            plan_result = self.supabase.table('subscription_plans').select('*').eq('name', plan_name).execute()
            if not plan_result.data:
                return {
                    'success': False,
                    'error': f'Plan {plan_name} not found'
                }
            
            plan = plan_result.data[0]
            duration_days = plan.get('duration_days', 30)
            
            # Calculate subscription end date (supports SUB_TIME_UNIT override)
            from datetime import timezone
            start_date = datetime.now(timezone.utc)
            end_date = self._compute_end_date(start_date, duration_days)
            
            # Try to get user from Supabase auth first
            supabase_user_id = user_id if user_id and user_id != 'anon' else None
            
            if not supabase_user_id:
                return {
                    'success': False,
                    'error': 'User not found'
                }
            
            # Create subscription record
            subscription_data = {
                'user_id': supabase_user_id,
                'plan_id': plan['id'],
                'status': 'active',
                'current_period_start': start_date.isoformat(),
                'current_period_end': end_date.isoformat(),
            }
            
            subscription_result = self.supabase.table('user_subscriptions').insert(subscription_data).execute()
            
            if not subscription_result.data:
                return {
                    'success': False,
                    'error': 'Failed to create subscription record'
                }
            
            # Mark trial as used (if exists)
            trial_result = self.supabase.table('user_trials').update({
                'is_used': True,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', supabase_user_id).execute()
            
            # Create payment transaction record
            payment_data = {
                'user_id': supabase_user_id,
                'subscription_id': subscription_result.data[0]['id'],
                'plan_id': plan['id'],
                'amount': plan.get('price_usd', 0),
                'currency': 'USD',
                'payment_method': 'paystack',
                'status': 'completed',
                'paystack_reference': paystack_data.get('reference', ''),
                'paystack_transaction_id': paystack_data.get('transaction_id', ''),
                'metadata': paystack_data
            }
            
            payment_result = self.supabase.table('payment_transactions').insert(payment_data).execute()
            
            return {
                'success': True,
                'data': {
                    'subscription_id': subscription_result.data[0]['id'],
                    'plan_name': plan_name,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'duration_days': duration_days,
                    'trial_marked_used': len(trial_result.data) > 0 if trial_result.data else False
                }
            }
            
        except Exception as e:
            print(f"Error activating subscription: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def activate_subscription_for_days(self, user_id: str, duration_days: int, paystack_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Activate a subscription for a specific number of days and mark trial as used
        """
        try:
            # Calculate subscription end date (supports SUB_TIME_UNIT override)
            start_date = datetime.now()
            end_date = self._compute_end_date(start_date, duration_days)
            
            # Use provided user_id (Supabase auth)
            supabase_user_id = user_id if user_id and user_id != 'anon' and user_id != 'anonymous' else None
            
            if not supabase_user_id:
                return {
                    'success': False,
                    'error': 'User not found - invalid user ID'
                }
            
            # Cleanup: remove prior non-active rows to avoid UNIQUE(user_id,status) conflicts
            try:
                # Delete old 'expired' and 'cancelled' rows first (test-mode friendly)
                self.supabase.table('user_subscriptions').delete().eq('user_id', supabase_user_id).eq('status', 'expired').execute()
                self.supabase.table('user_subscriptions').delete().eq('user_id', supabase_user_id).eq('status', 'cancelled').execute()
                # Expire any stale "active" subscriptions whose end date has passed
                from datetime import timezone
                now_iso = datetime.now(timezone.utc).isoformat()
                self.supabase.table('user_subscriptions').update({
                    'status': 'expired',
                    'updated_at': now_iso
                }).eq('user_id', supabase_user_id).eq('status', 'active').lte('current_period_end', now_iso).execute()
            except Exception as _:
                # Non-fatal; continue
                pass
            
            # In test mode (SUB_TIME_UNIT != 'days'), proactively end any existing active subscription to avoid unique constraint conflicts
            try:
                if self.subscription_time_unit in ('minutes', 'seconds'):
                    # In test mode, clear out any non-active rows to avoid UNIQUE collisions,
                    # then force-end any active row immediately
                    self.supabase.table('user_subscriptions').delete().eq('user_id', supabase_user_id).eq('status', 'expired').execute()
                    self.supabase.table('user_subscriptions').delete().eq('user_id', supabase_user_id).eq('status', 'cancelled').execute()
                    from datetime import timezone
                    now_iso_force = datetime.now(timezone.utc).isoformat()
                    active_subs = self.supabase.table('user_subscriptions').select('id').eq('user_id', supabase_user_id).eq('status', 'active').execute()
                    if active_subs.data:
                        self.supabase.table('user_subscriptions').update({
                            'status': 'expired',
                            'current_period_end': now_iso_force,
                            'updated_at': now_iso_force
                        }).eq('user_id', supabase_user_id).eq('status', 'active').execute()
            except Exception:
                pass

            # Check if user has a profile, if not create one
            profile_result = self.supabase.table('profiles').select('*').eq('id', supabase_user_id).execute()
            if not profile_result.data:
                # Create a basic profile for the user
                from datetime import timezone
                profile_data = {
                    'id': supabase_user_id,
                    'email': paystack_data.get('email', 'unknown@example.com'),
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                try:
                    self.supabase.table('profiles').insert(profile_data).execute()
                except Exception:
                    pass  # Profile creation is not critical
            
            # Get or create a default plan for custom duration
            plan_result = self.supabase.table('subscription_plans').select('*').eq('duration_days', duration_days).execute()
            if not plan_result.data:
                # Create a temporary plan for this duration
                plan_data = {
                    'name': f'custom_{duration_days}_days',
                    'display_name': f'{duration_days} Days',
                    'price_usd': 0,  # Will be updated with actual payment amount
                    'duration_days': duration_days,
                    'features': ['Full app access'],
                    'is_active': True
                }
                plan_result = self.supabase.table('subscription_plans').insert(plan_data).execute()
            
            plan = plan_result.data[0]
            
            # Create subscription record
            subscription_data = {
                'user_id': supabase_user_id,
                'plan_id': plan['id'],
                'status': 'active',
                'current_period_start': start_date.isoformat(),
                'current_period_end': end_date.isoformat(),
            }
            
            subscription_result = self.supabase.table('user_subscriptions').insert(subscription_data).execute()
            
            if not subscription_result.data:
                return {
                    'success': False,
                    'error': 'Failed to create subscription record'
                }
            
            # Mark trial as used (if exists)
            trial_result = self.supabase.table('user_trials').update({
                'is_used': True,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', supabase_user_id).execute()
            
            # Create payment transaction record
            payment_data = {
                'user_id': supabase_user_id,
                'subscription_id': subscription_result.data[0]['id'],
                'plan_id': plan['id'],
                'amount': paystack_data.get('amount', 0),
                'currency': 'USD',
                'payment_method': 'paystack',
                'status': 'completed',
                'paystack_reference': paystack_data.get('reference', ''),
                'paystack_transaction_id': paystack_data.get('transaction_id', paystack_data.get('reference', 'unknown')),
                'metadata': paystack_data
            }
            
            payment_result = self.supabase.table('payment_transactions').insert(payment_data).execute()
            
            return {
                'success': True,
                'data': {
                    'subscription_id': subscription_result.data[0]['id'],
                    'plan_name': plan['name'],
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'duration_days': duration_days,
                    'trial_marked_used': len(trial_result.data) > 0 if trial_result.data else False
                }
            }
            
        except Exception as e:
            print(f"Error activating subscription for days: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def activate_subscription_for_minutes(self, user_id: str, duration_minutes: int, paystack_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Activate a subscription for a specific number of minutes and mark trial as used
        """
        try:
            # For minutes-based subscriptions, we store the minutes directly in duration_days
            # and calculate end date using minutes directly
            duration_days = duration_minutes  # Store minutes in the duration_days field
            
            # Calculate subscription end date directly using minutes (UTC time)
            from datetime import timezone
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(minutes=duration_minutes)
            
            print(f"🕐 Subscription time calculation:")
            print(f"   Duration minutes: {duration_minutes}")
            print(f"   Start date (UTC): {start_date}")
            print(f"   End date (UTC): {end_date}")
            print(f"   Time difference: {end_date - start_date}")
            
            # Use provided user_id (Supabase auth)
            supabase_user_id = user_id if user_id and user_id != 'anon' and user_id != 'anonymous' else None
            
            if not supabase_user_id:
                return {
                    'success': False,
                    'error': 'User not found - invalid user ID'
                }
            
            # Cleanup: remove prior non-active rows to avoid UNIQUE(user_id,status) conflicts
            try:
                self.supabase.table('user_subscriptions').delete().eq('user_id', supabase_user_id).neq('status', 'active').execute()
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup warning (non-critical): {cleanup_error}")
            
            # Create or get subscription plan
            plan_name = paystack_data.get('plan', 'Custom Plan')
            plan_result = self.supabase.table('subscription_plans').select('*').eq('name', plan_name).execute()
            
            if not plan_result.data:
                # Create plan if it doesn't exist
                plan_data = {
                    'name': plan_name,
                    'display_name': plan_name,
                    'price_usd': paystack_data.get('amount', 0),
                    'duration_days': duration_days,
                    'features': ['Full app access'],
                    'is_active': True
                }
                plan_result = self.supabase.table('subscription_plans').insert(plan_data).execute()
            
            plan = plan_result.data[0]
            
            # Create subscription record
            subscription_data = {
                'user_id': supabase_user_id,
                'plan_id': plan['id'],
                'current_period_start': start_date.isoformat(),
                'current_period_end': end_date.isoformat(),
                'status': 'active',
                'metadata': {
                    'paystack_reference': paystack_data.get('reference', ''),
                    'paystack_transaction_id': paystack_data.get('transaction_id', ''),
                    'amount_paid': paystack_data.get('amount', 0),
                    'plan_name': plan_name
                }
            }
            
            subscription_result = self.supabase.table('user_subscriptions').insert(subscription_data).execute()
            
            if subscription_result.data:
                # Mark trial as used
                self.supabase.table('user_trials').update({'is_used': True}).eq('user_id', supabase_user_id).execute()
                
                # Save payment transaction
                self.save_payment_transaction(supabase_user_id, paystack_data, plan['id'])
                
                return {
                    'success': True,
                    'message': 'Subscription activated successfully',
                    'data': {
                        'subscription_id': subscription_result.data[0]['id'],
                        'plan_name': plan_name,
                        'duration_minutes': duration_minutes,
                        'start_date': start_date.isoformat(),
                        'end_date': end_date.isoformat(),
                        'status': 'active'
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to create subscription record'
                }
                
        except Exception as e:
            print(f"❌ Error activating subscription for minutes: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def save_payment_transaction(self, user_id: str, paystack_data: Dict[str, Any], plan_id: str = None) -> Dict[str, Any]:
        """
        Save payment transaction details
        """
        try:
            # Get plan_id if not provided
            if not plan_id:
                plan_name = paystack_data.get('plan', 'Custom Plan')
                plan_result = self.supabase.table('subscription_plans').select('id').eq('name', plan_name).execute()
                if plan_result.data:
                    plan_id = plan_result.data[0]['id']
                else:
                    print(f"⚠️ Warning: Could not find plan_id for plan: {plan_name}")
                    plan_id = 'unknown-plan-id'  # Fallback
            
            # Prepare transaction data (using actual table schema)
            transaction_data = {
                'user_id': user_id,
                'plan_id': plan_id,  # Required field
                'paystack_transaction_id': paystack_data.get('transaction_id', paystack_data.get('id')),
                'paystack_reference': paystack_data.get('reference'),  # Use paystack_reference (not payment_reference)
                'amount': float(paystack_data.get('amount', 0)),  # Already in USD, no conversion needed
                'currency': paystack_data.get('currency', 'USD'),
                'status': 'completed' if paystack_data.get('status') == 'success' else 'pending',
                'payment_method': paystack_data.get('channel', 'paystack'),
                'metadata': paystack_data
            }
            
            # Insert transaction record
            result = self.supabase.table('payment_transactions').insert(transaction_data).execute()
            
            if result.data:
                return {
                    'success': True,
                    'transaction_id': result.data[0]['id'],
                    'message': 'Payment transaction saved successfully'
                }
            
            return {
                'success': False,
                'error': 'Failed to save transaction'
            }
            
        except Exception as e:
            print(f"Error saving payment transaction: {str(e)}")
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
    
    def process_paystack_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Paystack webhook events
        """
        try:
            # Save webhook data
            webhook_record = {
                'event_type': webhook_data.get('event'),
                'paystack_event_id': webhook_data.get('id'),
                'paystack_reference': webhook_data.get('data', {}).get('reference'),
                'event_data': webhook_data,
                'processed': False
            }
            
            result = self.supabase.table('paystack_webhooks').insert(webhook_record).execute()
            
            if not result.data:
                return {
                    'success': False,
                    'error': 'Failed to save webhook data'
                }
            
            webhook_id = result.data[0]['id']
            
            # Process different event types
            event_type = webhook_data.get('event')
            
            if event_type == 'charge.success':
                return self._process_successful_payment(webhook_data, webhook_id)
            elif event_type == 'subscription.create':
                return self._process_subscription_created(webhook_data, webhook_id)
            elif event_type == 'subscription.disable':
                return self._process_subscription_disabled(webhook_data, webhook_id)
            else:
                # Mark as processed for other event types
                self.supabase.table('paystack_webhooks').update({'processed': True}).eq('id', webhook_id).execute()
                return {
                    'success': True,
                    'message': f'Webhook processed: {event_type}'
                }
                
        except Exception as e:
            print(f"Error processing webhook: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_successful_payment(self, webhook_data: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """
        Process successful payment webhook
        """
        try:
            data = webhook_data.get('data', {})
            reference = data.get('reference')
            customer_email = data.get('customer', {}).get('email')
            
            # Find user by email
            if customer_email:
                profile_result = self.supabase.table('profiles').select('id').eq('email', customer_email).execute()
                
                if profile_result.data:
                    user_id = profile_result.data[0]['id']
                    
                    # Save payment transaction
                    transaction_result = self.save_payment_transaction(user_id, data)
                    
                    # Mark webhook as processed
                    self.supabase.table('paystack_webhooks').update({'processed': True}).eq('id', webhook_id).execute()
                    
                    return {
                        'success': True,
                        'message': 'Payment processed successfully',
                        'transaction': transaction_result
                    }
            
            return {
                'success': False,
                'error': 'User not found for email'
            }
            
        except Exception as e:
            print(f"Error processing successful payment: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_subscription_created(self, webhook_data: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """
        Process subscription created webhook
        """
        try:
            data = webhook_data.get('data', {})
            customer_email = data.get('customer', {}).get('email')
            plan_code = data.get('plan', {}).get('plan_code')
            
            # Map plan code to plan name
            plan_mapping = {
                'PLAN_WEEKLY': 'weekly',
                'PLAN_BIWEEKLY': 'biweekly',
                'PLAN_MONTHLY': 'monthly',
                'PLAN_YEARLY': 'yearly'
            }
            
            plan_name = plan_mapping.get(plan_code, 'monthly')
            
            if customer_email:
                profile_result = self.supabase.table('profiles').select('id').eq('email', customer_email).execute()
                
                if profile_result.data:
                    user_id = profile_result.data[0]['id']
                    
                    # Activate subscription
                    subscription_result = self.activate_subscription(user_id, plan_name, data)
                    
                    # Mark webhook as processed
                    self.supabase.table('paystack_webhooks').update({'processed': True}).eq('id', webhook_id).execute()
                    
                    return {
                        'success': True,
                        'message': 'Subscription activated successfully',
                        'subscription': subscription_result
                    }
            
            return {
                'success': False,
                'error': 'User not found for email'
            }
            
        except Exception as e:
            print(f"Error processing subscription created: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_subscription_disabled(self, webhook_data: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """
        Process subscription disabled webhook
        """
        try:
            data = webhook_data.get('data', {})
            customer_email = data.get('customer', {}).get('email')
            
            if customer_email:
                profile_result = self.supabase.table('profiles').select('id').eq('email', customer_email).execute()
                
                if profile_result.data:
                    user_id = profile_result.data[0]['id']
                    
                    # Disable subscription
                    self.supabase.table('user_subscriptions').update({
                        'status': 'cancelled',
                        'updated_at': datetime.now().isoformat()
                    }).eq('user_id', user_id).eq('status', 'active').execute()
                    
                    # Mark webhook as processed
                    self.supabase.table('paystack_webhooks').update({'processed': True}).eq('id', webhook_id).execute()
                    
                    return {
                        'success': True,
                        'message': 'Subscription disabled successfully'
                    }
            
            return {
                'success': False,
                'error': 'User not found for email'
            }
            
        except Exception as e:
            print(f"Error processing subscription disabled: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get usage statistics for a user
        """
        try:
            # Try to get user from Supabase auth first
            if user_id and user_id != 'anon':
                result = self.supabase.table('feature_usage').select('*').eq('user_id', user_id).execute()
                
                if result.data:
                    return {
                        'success': True,
                        'usage_stats': result.data
                    }
            
            # No Supabase user found - return empty stats
            
            return {
                'success': True,
                'usage_stats': []
            }
            
        except Exception as e:
            print(f"Error getting usage stats: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'usage_stats': []
            }
    
    def _check_time_restrictions(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user is within allowed time window based on organization settings.
        
        Returns:
            Dict with 'can_access_now', 'restrictions_enabled', 'allowed_start_time', 
            'allowed_end_time', 'current_time', 'timezone', 'message'
        """
        try:
            from datetime import datetime, time
            import pytz
            
            # Check if user is in an organization
            org_result = self.supabase.table('organization_users').select(
                'enterprise_id, allowed_start_time, allowed_end_time, timezone, restrictions_enabled'
            ).eq('user_id', user_id).execute()
            
            if not org_result.data or len(org_result.data) == 0:
                # User not in organization, no restrictions
                return {
                    'can_access_now': True,
                    'restrictions_enabled': False,
                    'message': 'No organization restrictions'
                }
            
            org_user = org_result.data[0]
            restrictions_enabled = org_user.get('restrictions_enabled', False)
            
            # If restrictions not enabled for this user, check org defaults
            if not restrictions_enabled:
                enterprise_id = org_user.get('enterprise_id')
                if enterprise_id:
                    org_result = self.supabase.table('enterprises').select(
                        'time_restrictions_enabled, default_start_time, default_end_time, default_timezone'
                    ).eq('id', enterprise_id).execute()
                    
                    if org_result.data and len(org_result.data) > 0:
                        org = org_result.data[0]
                        restrictions_enabled = org.get('time_restrictions_enabled', False)
                        if restrictions_enabled:
                            allowed_start_time = org.get('default_start_time')
                            allowed_end_time = org.get('default_end_time')
                            timezone_str = org.get('default_timezone', 'UTC')
                        else:
                            return {
                                'can_access_now': True,
                                'restrictions_enabled': False,
                                'message': 'No organization restrictions'
                            }
                    else:
                        return {
                            'can_access_now': True,
                            'restrictions_enabled': False,
                            'message': 'No organization restrictions'
                        }
                else:
                    return {
                        'can_access_now': True,
                        'restrictions_enabled': False,
                        'message': 'No organization restrictions'
                    }
            else:
                # Use user-specific restrictions
                allowed_start_time = org_user.get('allowed_start_time')
                allowed_end_time = org_user.get('allowed_end_time')
                timezone_str = org_user.get('timezone', 'UTC')
            
            if not restrictions_enabled:
                return {
                    'can_access_now': True,
                    'restrictions_enabled': False,
                    'message': 'No restrictions enabled'
                }
            
            # Parse times and check current time
            try:
                # Get timezone
                tz = pytz.timezone(timezone_str) if timezone_str else pytz.UTC
                now = datetime.now(tz)
                current_time = now.time()
                
                # Parse allowed times
                if isinstance(allowed_start_time, str):
                    start_time = datetime.strptime(allowed_start_time, '%H:%M:%S').time()
                else:
                    start_time = allowed_start_time
                
                if isinstance(allowed_end_time, str):
                    end_time = datetime.strptime(allowed_end_time, '%H:%M:%S').time()
                else:
                    end_time = allowed_end_time
                
                # Check if current time is within allowed window
                # Handle case where end time is next day (e.g., 22:00 - 06:00)
                if start_time <= end_time:
                    # Normal case: same day window (e.g., 09:00 - 17:00)
                    can_access = start_time <= current_time <= end_time
                else:
                    # Overnight case: spans midnight (e.g., 22:00 - 06:00)
                    can_access = current_time >= start_time or current_time <= end_time
                
                return {
                    'can_access_now': can_access,
                    'restrictions_enabled': True,
                    'allowed_start_time': str(start_time),
                    'allowed_end_time': str(end_time),
                    'current_time': str(current_time),
                    'timezone': timezone_str,
                    'message': f"Access allowed between {start_time} and {end_time} ({timezone_str})" if can_access 
                              else f"Access restricted. Allowed: {start_time} - {end_time} ({timezone_str})"
                }
                
            except Exception as time_error:
                print(f"Error parsing time restrictions: {time_error}")
                # On error, allow access (fail open)
                return {
                    'can_access_now': True,
                    'restrictions_enabled': True,
                    'error': str(time_error),
                    'message': 'Error checking time restrictions, access allowed'
                }
                
        except Exception as e:
            print(f"Error checking time restrictions: {e}")
            # On error, allow access (fail open)
            return {
                'can_access_now': True,
                'restrictions_enabled': False,
                'error': str(e),
                'message': 'Error checking restrictions, access allowed'
            }


