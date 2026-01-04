from flask import Blueprint, request, jsonify, current_app
import json
from utils.auth_utils import get_user_id_from_token, log_error

meal_plan_bp = Blueprint('meal_plan', __name__)

@meal_plan_bp.route('/meal_plan', methods=['POST'])
def save_meal_plan():
    """
    Saves a user's meal plan to the public.meal_plan_management table. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        plan_data = request.get_json()
        
        if not plan_data:
            return jsonify({'status': 'error', 'message': 'Meal plan data is required.'}), 400

        # Save to meal_plan_management table
        result = supabase_service.save_meal_plan(user_id, plan_data)
        if isinstance(result, dict):
            # Success - return the inserted data
            return jsonify({
                'status': 'success', 
                'message': 'Meal plan saved.',
                'data': result
            }), 201
        else:
            # Error case
            error_data = result[1] if result and len(result) > 1 else 'Unknown error'
            
            # Check if it's a duplicate plan error (constraint violation)
            if isinstance(error_data, dict) and error_data.get('code') == 'DUPLICATE_PLAN':
                return jsonify({
                    'status': 'error', 
                    'message': error_data.get('message', 'A meal plan already exists for this week.'),
                    'code': 'DUPLICATE_PLAN'
                }), 409  # 409 Conflict is more appropriate than 500
            
            error_str = str(error_data)
            log_error(f"Failed to save meal plan for user {user_id}", Exception(error_str))
            return jsonify({'status': 'error', 'message': f'Failed to save meal plan: {error_str}'}), 500
    except Exception as e:
        log_error("Unexpected error in save_meal_plan", e)
        # Try to extract the real error message
        error_message = str(e)
        return jsonify({'status': 'error', 'message': error_message}), 500

@meal_plan_bp.route('/meal_plan', methods=['GET'])
def get_meal_plan():
    """
    Retrieves a user's meal plans from the public.meal_plan_management table. Requires authentication.
    Extracts name, start_date, and end_date from meal_plan JSON if missing at the top level.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        meal_plans, error = supabase_service.get_meal_plans(user_id)
        print(f"[DEBUG] Data fetched from meal_plan_management for user {user_id}: {meal_plans}")  # Debug print

        # Handle errors (including transient connection errors)
        if error:
            error_lower = error.lower()
            if 'resource temporarily unavailable' in error_lower or '35' in error:
                current_app.logger.warning(f"Transient connection error fetching meal plans for user {user_id}: {error}")
                # Return empty list instead of error for transient issues - user can retry
                return jsonify({'status': 'success', 'meal_plans': []}), 200
            else:
                log_error(f"Failed to retrieve meal plans for user {user_id}", Exception(error))
                return jsonify({'status': 'error', 'message': f'Failed to retrieve meal plans: {error}'}), 500

        # Parse meal_plan and extract fields if missing
        if meal_plans is not None:
            if isinstance(meal_plans, dict):
                meal_plans = [meal_plans]
            for plan in meal_plans:
                meal_plan_obj = plan.get('meal_plan')
                # Parse if string
                if isinstance(meal_plan_obj, str):
                    try:
                        meal_plan_obj = json.loads(meal_plan_obj)
                    except Exception as e:
                        print(f"[DEBUG] Failed to parse meal_plan for plan {plan.get('id')}: {e}")
                        meal_plan_obj = {}
                # If plan_data key, use it
                if isinstance(meal_plan_obj, dict) and meal_plan_obj and 'plan_data' in meal_plan_obj:
                    meal_plan_obj = meal_plan_obj['plan_data']
                # Extract fields robustly with null checks
                if meal_plan_obj and isinstance(meal_plan_obj, dict):
                    plan['name'] = plan.get('name') or meal_plan_obj.get('name')
                    plan['start_date'] = plan.get('start_date') or meal_plan_obj.get('startDate')
                    plan['end_date'] = plan.get('end_date') or meal_plan_obj.get('endDate')
                    plan['meal_plan'] = meal_plan_obj
                else:
                    # If meal_plan_obj is None or not a dict, keep existing values
                    plan['meal_plan'] = meal_plan_obj or []
                # Log the extracted fields for debugging
                current_app.logger.info(f"[EXTRACTED] Plan ID: {plan.get('id')}, Name: {plan.get('name')}, Start: {plan.get('start_date')}, End: {plan.get('end_date')}")
            print('[DEBUG] Final meal_plans to return:', meal_plans)
        
        if meal_plans is not None:
            return jsonify({'status': 'success', 'meal_plans': meal_plans}), 200
        else:
            log_error(f"Failed to retrieve meal plans for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': f'Failed to retrieve meal plans: {error}'}), 500
    except Exception as e:
        log_error("Unexpected error in get_meal_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plans', methods=['POST'])
def create_meal_plan():
    """
    Receives meal plan data from the frontend and inserts it into meal_plan_management via Supabase.
    Normalizes the data before saving. Only accepts JSON.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service

        if not request.is_json:
            return jsonify({'status': 'error', 'message': 'Request must be JSON.'}), 400
        plan_data = request.get_json()
        if not plan_data:
            return jsonify({'status': 'error', 'message': 'Meal plan data is required.'}), 400

        # Normalize the plan data before saving
        normalized_plan = supabase_service.normalize_meal_plan_entry(plan_data, user_id)

        # Save to meal_plan_management table via RPC
        success, error = supabase_service.save_meal_plan(user_id, normalized_plan)
        if not success:
            error_str = str(error) if error is not None else 'Unknown error'
            log_error(f"Failed to save meal plan for user {user_id}", Exception(error_str))
            return jsonify({'status': 'error', 'message': f'Failed to save meal plan: {error_str}'}), 500

        return jsonify({'status': 'success', 'message': 'Meal plan saved.'}), 201
    except Exception as e:
        log_error("Unexpected error in create_meal_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plans/<id>', methods=['PUT'])
def update_meal_plan(id):
    """
    Updates an existing meal plan. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        data = request.get_json()
        
        if not data:
            return jsonify({'status': 'error', 'message': 'Meal plan data is required.'}), 400

        # Update the meal plan
        success, error = supabase_service.update_meal_plan(user_id, id, data)
        if success:
            return jsonify({'status': 'success', 'message': 'Meal plan updated.'}), 200
        else:
            log_error(f"Failed to update meal plan {id} for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': f'Failed to update meal plan: {error}'}), 500
    except Exception as e:
        log_error("Unexpected error in update_meal_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plans/<id>', methods=['DELETE'])
def delete_meal_plan(id):
    """
    Deletes a meal plan. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        success, error = supabase_service.delete_meal_plan(user_id, id)
        
        if success:
            return jsonify({'status': 'success', 'message': 'Meal plan deleted.'}), 200
        else:
            log_error(f"Failed to delete meal plan {id} for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': f'Failed to delete meal plan: {error}'}), 500
    except Exception as e:
        log_error("Unexpected error in delete_meal_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plans/clear', methods=['DELETE'])
def clear_meal_plans():
    """
    Clears all meal plans for a user. Requires authentication.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        success, error = supabase_service.clear_meal_plans(user_id)
        
        if success:
            return jsonify({'status': 'success', 'message': 'All meal plans cleared.'}), 200
        else:
            log_error(f"Failed to clear meal plans for user {user_id}", Exception(error))
            return jsonify({'status': 'error', 'message': f'Failed to clear meal plans: {error}'}), 500
    except Exception as e:
        log_error("Unexpected error in clear_meal_plans", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plan/<plan_id>', methods=['GET'])
def get_single_meal_plan(plan_id):
    """
    Retrieves a single meal plan by ID for the authenticated user.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        meal_plans, error = supabase_service.get_meal_plans(user_id)
        if error or not meal_plans:
            return jsonify({'status': 'error', 'message': 'No meal plans found.'}), 404

        if isinstance(meal_plans, dict):
            meal_plans = [meal_plans]
        plan = next((p for p in meal_plans if str(p.get('id')) == str(plan_id)), None)
        if not plan:
            return jsonify({'status': 'error', 'message': 'Meal plan not found.'}), 404

        # Extraction logic (reuse from GET /meal_plan)
        meal_plan_obj = plan.get('meal_plan')
        if isinstance(meal_plan_obj, str):
            try:
                meal_plan_obj = json.loads(meal_plan_obj)
            except Exception:
                meal_plan_obj = {}
        if isinstance(meal_plan_obj, dict) and meal_plan_obj and 'plan_data' in meal_plan_obj:
            meal_plan_obj = meal_plan_obj['plan_data']
        # Extract fields robustly with null checks
        if meal_plan_obj and isinstance(meal_plan_obj, dict):
            plan['name'] = plan.get('name') or meal_plan_obj.get('name')
            plan['start_date'] = plan.get('start_date') or meal_plan_obj.get('startDate')
            plan['end_date'] = plan.get('end_date') or meal_plan_obj.get('endDate')
            plan['meal_plan'] = meal_plan_obj
        else:
            # If meal_plan_obj is None or not a dict, keep existing values
            plan['meal_plan'] = meal_plan_obj or []

        return jsonify({'status': 'success', 'meal_plan': plan}), 200
    except Exception as e:
        log_error("Unexpected error in get_single_meal_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plan/<plan_id>/<day>', methods=['GET'])
def get_single_day_plan(plan_id, day):
    """
    Retrieves a single day's plan from a meal plan by ID and day name.
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        meal_plans, error = supabase_service.get_meal_plans(user_id)
        if error or not meal_plans:
            return jsonify({'status': 'error', 'message': 'No meal plans found.'}), 404

        if isinstance(meal_plans, dict):
            meal_plans = [meal_plans]
        plan = next((p for p in meal_plans if str(p.get('id')) == str(plan_id)), None)
        if not plan:
            return jsonify({'status': 'error', 'message': 'Meal plan not found.'}), 404

        meal_plan_obj = plan.get('meal_plan')
        if isinstance(meal_plan_obj, str):
            try:
                meal_plan_obj = json.loads(meal_plan_obj)
            except Exception:
                meal_plan_obj = {}
        if isinstance(meal_plan_obj, dict) and 'plan_data' in meal_plan_obj:
            meal_plan_obj = meal_plan_obj['plan_data']
        day_plan = None
        if isinstance(meal_plan_obj, dict) and 'mealPlan' in meal_plan_obj:
            day_plan = next((d for d in meal_plan_obj['mealPlan'] if d.get('day') == day), None)
        elif isinstance(meal_plan_obj, list):
            day_plan = next((d for d in meal_plan_obj if d.get('day') == day), None)
        if not day_plan:
            return jsonify({'status': 'error', 'message': 'Day not found in meal plan.'}), 404
        return jsonify({'status': 'success', 'day_plan': day_plan}), 200
    except Exception as e:
        log_error("Unexpected error in get_single_day_plan", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

@meal_plan_bp.route('/meal_plan/<plan_id>/<day>/<meal_type>', methods=['GET'])
def get_single_meal(plan_id, day, meal_type):
    """
    Retrieves a single meal from a day's plan by meal type (breakfast, lunch, dinner, snack).
    """
    try:
        user_id, error = get_user_id_from_token()
        if error:
            return jsonify({'status': 'error', 'message': f'Authentication failed: {error}'}), 401

        supabase_service = current_app.supabase_service
        meal_plans, error = supabase_service.get_meal_plans(user_id)
        if error or not meal_plans:
            return jsonify({'status': 'error', 'message': 'No meal plans found.'}), 404

        if isinstance(meal_plans, dict):
            meal_plans = [meal_plans]
        plan = next((p for p in meal_plans if str(p.get('id')) == str(plan_id)), None)
        if not plan:
            return jsonify({'status': 'error', 'message': 'Meal plan not found.'}), 404

        meal_plan_obj = plan.get('meal_plan')
        if isinstance(meal_plan_obj, str):
            try:
                meal_plan_obj = json.loads(meal_plan_obj)
            except Exception:
                meal_plan_obj = {}
        if isinstance(meal_plan_obj, dict) and 'plan_data' in meal_plan_obj:
            meal_plan_obj = meal_plan_obj['plan_data']
        day_plan = None
        if isinstance(meal_plan_obj, dict) and 'mealPlan' in meal_plan_obj:
            day_plan = next((d for d in meal_plan_obj['mealPlan'] if d.get('day') == day), None)
        elif isinstance(meal_plan_obj, list):
            day_plan = next((d for d in meal_plan_obj if d.get('day') == day), None)
        if not day_plan:
            return jsonify({'status': 'error', 'message': 'Day not found in meal plan.'}), 404
        meal_value = day_plan.get(meal_type)
        meal_ingredients = day_plan.get(f'{meal_type}_ingredients')
        if meal_value is None:
            return jsonify({'status': 'error', 'message': f'{meal_type} not found for {day}.'}), 404
        return jsonify({'status': 'success', 'meal': meal_value, 'ingredients': meal_ingredients}), 200
    except Exception as e:
        log_error("Unexpected error in get_single_meal", e)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500
