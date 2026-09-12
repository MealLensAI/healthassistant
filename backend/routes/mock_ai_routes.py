"""
Mock AI routes for local development
These routes simulate the AI meal planning endpoints when the actual AI server is not available
"""
from flask import Blueprint, request, jsonify
import random
from flasgger import swag_from
from core.swagger import swagger_path

mock_ai_bp = Blueprint('mock_ai', __name__)

# Sample meal data
SAMPLE_MEALS = {
    'breakfast': [
        'Oatmeal with Berries', 'Scrambled Eggs with Toast', 'Greek Yogurt Parfait',
        'Avocado Toast', 'Smoothie Bowl', 'Pancakes with Maple Syrup',
        'French Toast', 'Breakfast Burrito', 'Chia Pudding'
    ],
    'lunch': [
        'Grilled Chicken Salad', 'Vegetable Stir Fry', 'Quinoa Bowl',
        'Turkey Sandwich', 'Pasta Primavera', 'Chicken Wrap',
        'Buddha Bowl', 'Taco Salad', 'Mediterranean Plate'
    ],
    'dinner': [
        'Baked Salmon with Vegetables', 'Chicken Curry with Rice', 'Beef Stir Fry',
        'Vegetable Lasagna', 'Grilled Steak', 'Shrimp Pasta',
        'Roasted Chicken', 'Fish Tacos', 'Vegetable Curry'
    ],
    'snack': [
        'Mixed Nuts', 'Fresh Fruit', 'Hummus with Veggies',
        'Protein Bar', 'Cheese and Crackers', 'Trail Mix',
        'Apple Slices with Peanut Butter', 'Yogurt', 'Dark Chocolate'
    ]
}

SAMPLE_INGREDIENTS = {
    'breakfast': ['oats', 'milk', 'berries', 'eggs', 'bread', 'butter'],
    'lunch': ['chicken', 'lettuce', 'tomatoes', 'rice', 'vegetables'],
    'dinner': ['salmon', 'broccoli', 'potatoes', 'olive oil', 'garlic'],
    'snack': ['almonds', 'walnuts', 'apple', 'carrots']
}

def generate_mock_meal_plan():
    """Generate a mock 7-day meal plan"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    meal_plan = []
    
    for day in days:
        meal_plan.append({
            'day': day,
            'breakfast': random.choice(SAMPLE_MEALS['breakfast']),
            'lunch': random.choice(SAMPLE_MEALS['lunch']),
            'dinner': random.choice(SAMPLE_MEALS['dinner']),
            'snack': random.choice(SAMPLE_MEALS['snack']),
            'breakfast_ingredients': SAMPLE_INGREDIENTS['breakfast'],
            'lunch_ingredients': SAMPLE_INGREDIENTS['lunch'],
            'dinner_ingredients': SAMPLE_INGREDIENTS['dinner'],
            'snack_ingredients': SAMPLE_INGREDIENTS['snack']
        })
    
    return meal_plan

def generate_mock_therapeutic_meal_plan():
    """Generate a mock therapeutic meal plan with nutritional data"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    meal_plan = []
    
    for day in days:
        meal_plan.append({
            'day': day,
            'breakfast_name': random.choice(SAMPLE_MEALS['breakfast']),
            'breakfast_calories': random.randint(300, 500),
            'breakfast_protein': random.randint(15, 25),
            'breakfast_carbs': random.randint(40, 60),
            'breakfast_fat': random.randint(10, 20),
            'breakfast_benefit': 'Provides sustained energy and essential nutrients',
            'breakfast_ingredients': SAMPLE_INGREDIENTS['breakfast'],
            
            'lunch_name': random.choice(SAMPLE_MEALS['lunch']),
            'lunch_calories': random.randint(400, 600),
            'lunch_protein': random.randint(25, 35),
            'lunch_carbs': random.randint(45, 65),
            'lunch_fat': random.randint(15, 25),
            'lunch_benefit': 'Balanced meal for midday energy',
            'lunch_ingredients': SAMPLE_INGREDIENTS['lunch'],
            
            'dinner_name': random.choice(SAMPLE_MEALS['dinner']),
            'dinner_calories': random.randint(450, 650),
            'dinner_protein': random.randint(30, 40),
            'dinner_carbs': random.randint(40, 60),
            'dinner_fat': random.randint(15, 25),
            'dinner_benefit': 'Nutrient-rich evening meal',
            'dinner_ingredients': SAMPLE_INGREDIENTS['dinner'],
            
            'snack_name': random.choice(SAMPLE_MEALS['snack']),
            'snack_calories': random.randint(150, 250),
            'snack_protein': random.randint(5, 10),
            'snack_carbs': random.randint(20, 30),
            'snack_fat': random.randint(5, 15),
            'snack_benefit': 'Healthy snack option',
            'snack_ingredients': SAMPLE_INGREDIENTS['snack']
        })
    
    return meal_plan

@mock_ai_bp.route('/smart_plan', methods=['POST'])
@swag_from(swagger_path('mock_ai/smart_plan.yml'))
def smart_plan():
    """Mock endpoint for regular meal plan generation"""
    try:
        print('[MOCK AI] Generating regular meal plan')
        meal_plan = generate_mock_meal_plan()
        
        return jsonify({
            'success': True,
            'meal_plan': meal_plan,
            'message': 'Mock meal plan generated successfully'
        }), 200
    except Exception as e:
        print(f'[MOCK AI ERROR] {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mock_ai_bp.route('/sick_smart_plan', methods=['POST'])
@swag_from(swagger_path('mock_ai/sick_smart_plan.yml'))
def sick_smart_plan():
    """Mock endpoint for therapeutic meal plan generation"""
    try:
        print('[MOCK AI] Generating therapeutic meal plan')
        meal_plan = generate_mock_therapeutic_meal_plan()
        
        return jsonify({
            'success': True,
            'meal_plan': meal_plan,
            'health_assessment': {
                'bmi': 24.5,
                'bmi_category': 'Normal',
                'whtr': 0.48,
                'whtr_category': 'Healthy',
                'tdee': 2200,
                'recommendations': [
                    'Maintain balanced diet',
                    'Stay hydrated',
                    'Regular exercise recommended'
                ]
            },
            'user_info': {
                'age': 30,
                'weight': 70,
                'height': 170,
                'gender': 'male',
                'activity_level': 'moderate'
            },
            'message': 'Mock therapeutic meal plan generated successfully'
        }), 200
    except Exception as e:
        print(f'[MOCK AI ERROR] {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mock_ai_bp.route('/ai_nutrition_plan', methods=['POST'])
@swag_from(swagger_path('mock_ai/ai_nutrition_plan.yml'))
def ai_nutrition_plan():
    """Mock endpoint for medical AI nutrition plan"""
    try:
        print('[MOCK AI] Generating medical nutrition plan')
        meal_plan = generate_mock_therapeutic_meal_plan()
        
        return jsonify({
            'success': True,
            'meal_plan': meal_plan,
            'health_assessment': {
                'bmi': 24.5,
                'bmi_category': 'Normal',
                'whtr': 0.48,
                'whtr_category': 'Healthy',
                'tdee': 2200,
                'recommendations': [
                    'Follow prescribed meal plan',
                    'Monitor blood sugar levels',
                    'Stay hydrated'
                ]
            },
            'user_info': {
                'age': 30,
                'weight': 70,
                'height': 170,
                'gender': 'male',
                'activity_level': 'moderate'
            },
            'message': 'Mock medical nutrition plan generated successfully'
        }), 200
    except Exception as e:
        print(f'[MOCK AI ERROR] {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mock_ai_bp.route('/auto_generate_plan', methods=['POST'])
@swag_from(swagger_path('mock_ai/auto_generate_plan.yml'))
def auto_generate_plan():
    """Mock endpoint for auto-generated meal plan"""
    try:
        print('[MOCK AI] Auto-generating meal plan')
        meal_plan = generate_mock_meal_plan()
        
        return jsonify({
            'success': True,
            'meal_plan': meal_plan,
            'message': 'Mock auto-generated meal plan created successfully'
        }), 200
    except Exception as e:
        print(f'[MOCK AI ERROR] {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
