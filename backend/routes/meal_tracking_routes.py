"""
Meal Tracking Routes - API endpoints for tracking meal cooking/eating status
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, date
import uuid
from utils.auth_utils import get_user_id_from_token, log_error
from services.email_service import email_service
from services.meal_reminder_service import get_meal_reminder_service
from services.notification_service import notification_service

meal_tracking_bp = Blueprint('meal_tracking', __name__)


@meal_tracking_bp.route('/meal_tracking/mark_cooked', methods=['POST'])
def mark_meal_cooked():
    """
    Mark a meal as cooked. Creates or updates the tracking record.
    
    Request body:
    {
        "meal_plan_id": "uuid",
        "day": "Monday",
        "meal_type": "breakfast|lunch|dinner|snack"
    }
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body is required'}), 400

        meal_plan_id = data.get('meal_plan_id')
        day = data.get('day')
        meal_type = data.get('meal_type')

        if not all([meal_plan_id, day, meal_type]):
            return jsonify({'status': 'error', 'message': 'meal_plan_id, day, and meal_type are required'}), 400

        if meal_type not in ['breakfast', 'lunch', 'dinner', 'snack']:
            return jsonify({'status': 'error', 'message': 'Invalid meal_type'}), 400

        db_service = current_app.supabase_service
        result, error = db_service.mark_meal_cooked(user_id, meal_plan_id, day, meal_type)
        
        if error:
            log_error(f"Failed to mark meal as cooked for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        # Send confirmation email
        try:
            print(f"Attempting to send confirmation email to user {user_id} for {meal_type} on {day}")

            # Get user email via Supabase auth admin API
            user_email = None
            user_name = None
            try:
                supabase_client = db_service.supabase
                user_response = supabase_client.auth.admin.get_user_by_id(user_id)
                if user_response and hasattr(user_response, 'user') and user_response.user:
                    user_email = user_response.user.email
                    metadata = getattr(user_response.user, 'user_metadata', {}) or {}
                    user_name = metadata.get('full_name') or metadata.get('first_name') or (user_email.split('@')[0] if user_email else None)
            except Exception as auth_err:
                print(f"Could not fetch user info for email: {auth_err}")

            if user_email:
                # Extract meal name from meal plan data
                meal_name = meal_type.capitalize()
                try:
                    meal_plans, _ = db_service.get_meal_plans(user_id)
                    if meal_plans:
                        plan = next((p for p in meal_plans if str(p.get('id')) == str(meal_plan_id)), None)
                        if plan:
                            plan_data = plan.get('meal_plan', [])
                            if isinstance(plan_data, str):
                                import json
                                plan_data = json.loads(plan_data)
                            day_plan = next((d for d in (plan_data or []) if d.get('day', '').lower() == day.lower()), None)
                            if day_plan:
                                meal_name = day_plan.get(meal_type) or day_plan.get(f'{meal_type}_name') or meal_name
                except Exception as plan_err:
                    print(f"Could not extract meal name: {plan_err}")

                print(f"Sending email to {user_email}")
                success = email_service.send_meal_cooked_confirmation_email(
                    to_email=user_email,
                    user_name=user_name or user_email.split('@')[0],
                    meal_type=meal_type,
                    meal_name=meal_name
                )
                if success:
                    print("Email sent successfully")
                    try:
                        notification_service.append_notification(
                            db_service,
                            user_id,
                            title='Meal cooked confirmation sent',
                            message=f'We sent a confirmation email for {meal_name}.',
                            notification_type='email_confirmation'
                        )
                    except Exception as notify_error:
                        print(f"Failed to append in-app notification: {notify_error}")
                else:
                    print("Failed to send email (service returned False)")
            else:
                print("User email not found, skipping confirmation email")
        except Exception as e:
            # Don't fail the request if email fails
            print(f"Exception sending confirmation email: {e}")
            log_error(f"Failed to send confirmation email for user {user_id}", e)

        return jsonify({
            'status': 'success',
            'message': 'Meal marked as cooked',
            'data': result
        }), 200

    except Exception as e:
        log_error("Unexpected error in mark_meal_cooked", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/send_cooked_email', methods=['POST'])
def send_cooked_email():
    """
    Send a congratulations email when a user cooks a meal.
    Works independently of the meal_tracking table.

    Request body:
    {
        "meal_plan_id": "uuid",
        "day": "Monday",
        "meal_type": "breakfast|lunch|dinner|snack",
        "meal_name": "Optional meal name"
    }
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body is required'}), 400

        meal_plan_id = data.get('meal_plan_id')
        day = data.get('day')
        meal_type = data.get('meal_type')
        meal_name = data.get('meal_name')

        if not meal_type:
            return jsonify({'status': 'error', 'message': 'meal_type is required'}), 400

        db_service = current_app.supabase_service

        # Get user email via Supabase auth
        user_email = None
        user_name = None
        try:
            supabase_client = db_service.supabase
            user_response = supabase_client.auth.admin.get_user_by_id(user_id)
            if user_response and hasattr(user_response, 'user') and user_response.user:
                user_email = user_response.user.email
                metadata = getattr(user_response.user, 'user_metadata', {}) or {}
                user_name = metadata.get('full_name') or metadata.get('first_name') or (user_email.split('@')[0] if user_email else None)
        except Exception as auth_err:
            print(f"[COOKED_EMAIL] Could not fetch user info: {auth_err}")

        if not user_email:
            return jsonify({'status': 'error', 'message': 'Could not find user email'}), 404

        # If meal_name not provided, try to extract from meal plan
        if not meal_name and meal_plan_id and day:
            try:
                meal_plans, _ = db_service.get_meal_plans(user_id)
                if meal_plans:
                    plan = next((p for p in meal_plans if str(p.get('id')) == str(meal_plan_id)), None)
                    if plan:
                        plan_data = plan.get('meal_plan', [])
                        if isinstance(plan_data, str):
                            import json
                            plan_data = json.loads(plan_data)
                        day_plan = next((d for d in (plan_data or []) if d.get('day', '').lower() == day.lower()), None)
                        if day_plan:
                            meal_name = day_plan.get(meal_type) or day_plan.get(f'{meal_type}_name')
            except Exception as plan_err:
                print(f"[COOKED_EMAIL] Could not extract meal name: {plan_err}")

        if not meal_name:
            meal_name = meal_type.capitalize()

        print(f"[COOKED_EMAIL] Sending congrats email to {user_email} for {meal_name}")
        success = email_service.send_meal_cooked_confirmation_email(
            to_email=user_email,
            user_name=user_name or user_email.split('@')[0],
            meal_type=meal_type,
            meal_name=meal_name
        )

        if success:
            print(f"[COOKED_EMAIL] Email sent successfully to {user_email}")
            try:
                notification_service.append_notification(
                    db_service,
                    user_id,
                    title='Meal cooked confirmation sent',
                    message=f'We sent a confirmation email for {meal_name}.',
                    notification_type='email_confirmation'
                )
            except Exception as notify_error:
                print(f"[COOKED_EMAIL] Failed to append in-app notification: {notify_error}")
            return jsonify({'status': 'success', 'message': 'Congratulations email sent'}), 200
        else:
            print(f"[COOKED_EMAIL] Failed to send email to {user_email}")
            return jsonify({'status': 'error', 'message': 'Failed to send email'}), 500

    except Exception as e:
        log_error("Unexpected error in send_cooked_email", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/unmark_cooked', methods=['POST'])
def unmark_meal_cooked():
    """
    Unmark a meal as cooked (remove the cooked_at timestamp).
    
    Request body:
    {
        "meal_plan_id": "uuid",
        "day": "Monday",
        "meal_type": "breakfast|lunch|dinner|snack"
    }
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body is required'}), 400

        meal_plan_id = data.get('meal_plan_id')
        day = data.get('day')
        meal_type = data.get('meal_type')

        if not all([meal_plan_id, day, meal_type]):
            return jsonify({'status': 'error', 'message': 'meal_plan_id, day, and meal_type are required'}), 400

        db_service = current_app.supabase_service
        result, error = db_service.unmark_meal_cooked(user_id, meal_plan_id, day, meal_type)
        
        if error:
            log_error(f"Failed to unmark meal as cooked for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        return jsonify({
            'status': 'success',
            'message': 'Meal unmarked as cooked',
            'data': result
        }), 200

    except Exception as e:
        log_error("Unexpected error in unmark_meal_cooked", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/<meal_plan_id>', methods=['GET'])
def get_meal_tracking_status(meal_plan_id):
    """
    Get tracking status for all meals in a meal plan.
    
    Returns a dictionary with day -> meal_type -> tracking info
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        db_service = current_app.supabase_service
        tracking_data, error = db_service.get_meal_tracking(user_id, meal_plan_id)
        
        if error:
            log_error(f"Failed to get meal tracking for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        return jsonify({
            'status': 'success',
            'tracking': tracking_data
        }), 200

    except Exception as e:
        log_error("Unexpected error in get_meal_tracking_status", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/week_progress/<meal_plan_id>', methods=['GET'])
def get_week_progress(meal_plan_id):
    """
    Get the weekly progress for a meal plan.
    
    Returns:
    - total_meals: Total number of meals in the plan
    - cooked_meals: Number of meals marked as cooked
    - progress_percentage: Percentage of meals cooked
    - is_complete: True if all meals are cooked
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        db_service = current_app.supabase_service
        progress, error = db_service.get_week_progress(user_id, meal_plan_id)
        
        if error:
            log_error(f"Failed to get week progress for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        return jsonify({
            'status': 'success',
            'progress': progress
        }), 200

    except Exception as e:
        log_error("Unexpected error in get_week_progress", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/reminder_settings', methods=['GET'])
def get_reminder_settings():
    """
    Get the user's meal reminder settings.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        db_service = current_app.supabase_service
        settings, error = db_service.get_meal_reminder_settings(user_id)
        
        if error:
            log_error(f"Failed to get reminder settings for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        return jsonify({
            'status': 'success',
            'settings': settings
        }), 200

    except Exception as e:
        log_error("Unexpected error in get_reminder_settings", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/reminder_settings', methods=['PUT'])
def update_reminder_settings():
    """
    Update the user's meal reminder settings.
    
    Request body:
    {
        "reminders_enabled": true,
        "breakfast_reminder_time": "08:00",
        "lunch_reminder_time": "12:00",
        "dinner_reminder_time": "18:00",
        "followup_delay_hours": 2,
        "timezone": "America/New_York"
    }
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body is required'}), 400

        db_service = current_app.supabase_service
        result, error = db_service.update_meal_reminder_settings(user_id, data)
        
        if error:
            log_error(f"Failed to update reminder settings for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': str(error)}), 500

        return jsonify({
            'status': 'success',
            'message': 'Reminder settings updated',
            'settings': result
        }), 200

    except Exception as e:
        log_error("Unexpected error in update_reminder_settings", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@meal_tracking_bp.route('/meal_tracking/trigger_reminders', methods=['POST'])
def trigger_reminders():
    """
    Manually trigger the reminder check right now.
    Useful for testing or running via a cron if APScheduler isn't available.

    Optional body:
    {
        "meal_type": "breakfast"   // omit to check all meal types
    }
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        svc = get_meal_reminder_service()
        if not svc:
            return jsonify({'status': 'error', 'message': 'Reminder service not running'}), 503

        data = request.get_json(silent=True) or {}
        meal_type = data.get('meal_type')

        results = svc.trigger_check_now(meal_type=meal_type)
        return jsonify({'status': 'success', 'results': results}), 200

    except Exception as e:
        log_error("Error triggering reminders", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500
