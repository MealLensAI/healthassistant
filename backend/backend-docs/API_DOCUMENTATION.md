# Recipe AI Harmony - REST API Documentation

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Document Status:** Production

---

## API Overview

### Base Endpoints

| Environment | Base URL | Protocol |
|------------|----------|----------|
| **Production** | `https://api.meallensai.com` | HTTPS |
| **Staging** | `https://staging-api.meallensai.com` | HTTPS |
| **Development** | `http://localhost:5000` | HTTP |

### URL Structure

All API endpoints follow the pattern: `{BASE_URL}/api/{resource}`

Example: `https://api.meallensai.com/api/register`

---

## Integration Guidelines

### Content-Type Standards

The API supports two content types depending on the endpoint:

#### Application/JSON (Primary)
Most endpoints accept and return `application/json`:
- Authentication endpoints (`/api/login`, `/api/register`)
- Meal planning endpoints (`/api/meal_plan`)
- Subscription endpoints (`/api/subscription/*`)
- Payment endpoints (`/api/payment/*`)
- Enterprise endpoints (`/api/enterprise/*`)

#### Multipart/Form-Data (File Uploads)
The following endpoints require `multipart/form-data` for file handling:
- `/api/food_detection/process` - Image upload with metadata
- `/api/feedback` - Feedback submission

#### Flexible Format Endpoints
Some endpoints accept both formats for backwards compatibility:
- `/api/food_detection/detection_history` - Accepts JSON or form-data

### Field Naming Conventions

**Standardization Note**: The API accepts both camelCase and snake_case for historical compatibility.

| Endpoint Category | Recommended Format | Alternative Format |
|------------------|-------------------|-------------------|
| Meal Planning | `startDate`, `endDate`, `mealPlan` | `start_date`, `end_date`, `meal_plan` |
| User Settings | `settings_type`, `settings_data` | N/A |
| Subscriptions | `user_id`, `plan_name` | N/A |

**Best Practice**: Use camelCase for new integrations to align with modern API standards.

---

## Table of Contents

1. [Authentication](#authentication) - 7 endpoints
2. [Food Detection](#food-detection) - 9 endpoints
3. [Meal Planning](#meal-planning) - 9 endpoints
4. [User Settings](#user-settings) - 3 endpoints
5. [Subscriptions](#subscriptions) - 11 endpoints
6. [Payments](#payments) - 11 endpoints
7. [Lifecycle Management](#lifecycle-management) - 11 endpoints
8. [Enterprise Management](#enterprise-management) - 18 endpoints
9. [Feedback](#feedback) - 1 endpoint
10. [AI Sessions](#ai-sessions) - 1 endpoint

**Total: 81 Endpoints**

---

## Authentication

### 1. Register User

**Endpoint:** `POST /api/register`

**Description:** Create a new user account with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "signup_type": "individual"  // or "organization"
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "User registered successfully",
  "user_id": "uuid-string",
  "email": "user@example.com"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid data
- `409 Conflict` - Email already registered
- `500 Internal Server Error` - Server error

---

### 2. Login

**Endpoint:** `POST /api/login`

**Description:** Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Login successful",
  "user_id": "uuid-string",
  "auth_type": "supabase",
  "session_id": "uuid-string",
  "session_created_at": "2025-01-01T00:00:00Z",
  "access_token": "jwt-token-string",
  "refresh_token": "jwt-refresh-token",
  "user_data": {
    "id": "uuid-string",
    "email": "user@example.com",
    "metadata": {
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Notes:**
- Access token is also set as an httpOnly cookie
- Tokens expire after 7 days by default

**Error Responses:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

---

### 3. Logout

**Endpoint:** `POST /api/logout`

**Description:** Clear authentication cookies.

**Headers:** No authentication required

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Logged out"
}
```

---

### 4. Get User Profile

**Endpoint:** `GET /api/profile`

**Description:** Retrieve current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "profile": {
    "id": "uuid-string",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "display_name": "John Doe",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Profile not found

---

### 5. Change Password

**Endpoint:** `POST /api/change-password`

**Description:** Change user's password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newSecurePassword456"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Password updated. Please sign in again."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid parameters (password too short)
- `401 Unauthorized` - Current password incorrect
- `500 Internal Server Error` - Failed to update password

---

### 6. Forgot Password

**Endpoint:** `POST /api/forgot-password`

**Description:** Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "redirect_url": "https://app.meallensai.com/reset-password"  // Optional
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "If an account exists, a reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Reset link expires in 1 hour

---

### 7. Reset Password

**Endpoint:** `POST /api/reset-password`

**Description:** Complete password reset using token from email.

**Request Body:**
```json
{
  "access_token": "recovery-token-from-email",
  "new_password": "newSecurePassword789"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Password reset successful. Please sign in."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or expired token
- `500 Internal Server Error` - Failed to update password

---

## Food Detection

### 1. Process Food Input

**Endpoint:** `POST /api/food_detection/process`

**Description:** Upload image or ingredient list for analysis.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
image_or_ingredient_list: "image" or "ingredient_list"
image: [file] (required if type is "image")
ingredient_list: "chicken, rice, broccoli" (required if type is "ingredient_list")
```

**Important:** This endpoint uses **multipart/form-data**, NOT JSON!

**Response:** `200 OK`
```json
{
  "status": "success",
  "analysis_id": "uuid-string",
  "message": "Input received. Frontend will process with AI and save to history."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input type, missing data, or invalid file type (only png, jpg, jpeg, gif allowed)
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Upload failed

**Allowed File Types:** png, jpg, jpeg, gif

---

### 2. Save Detection History

**Endpoint:** `POST /api/food_detection/detection_history`

**Description:** Save food detection results to history.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipe_type": "ingredient_detection",
  "suggestion": "Grilled Chicken with Rice",
  "instructions": "1. Cook rice...\n2. Grill chicken...",
  "ingredients": "[\"chicken breast\", \"rice\", \"olive oil\"]",
  "detected_foods": "[\"chicken\", \"rice\"]",
  "analysis_id": "uuid-string",
  "youtube": "https://youtube.com/watch?v=...",
  "google": "https://google.com/search?q=...",
  "resources": "<a href='...'>Recipe Link</a>"
}
```

**Field Details:**
- `recipe_type` (required): "ingredient_detection" or "food_detection"
- All other fields are optional
- `ingredients` and `detected_foods`: Can be JSON strings OR arrays (will be converted to strings)
- Accepts both JSON and form-data

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Detection history saved."
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Save failed

---

### 3. Get Detection History

**Endpoint:** `GET /api/food_detection/detection_history`

**Description:** Retrieve user's food detection history.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "detection_history": [
    {
      "id": "uuid-string",
      "user_id": "uuid-string",
      "detection_type": "ingredient_detection",
      "recipe_suggestion": "Grilled Chicken with Rice",
      "recipe_instructions": "1. Cook rice...",
      "recipe_ingredients": "[\"chicken\", \"rice\"]",
      "detected_foods": "[\"chicken\", \"rice\"]",
      "analysis_id": "uuid-string",
      "youtube_link": "https://youtube.com/...",
      "google_link": "https://google.com/...",
      "resources_link": "<a href='...'>Recipe</a>",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Retrieval failed

---

### 4. Delete Detection History

**Endpoint:** `DELETE /api/food_detection/detection_history/<record_id>`

**Description:** Delete a specific detection history record.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Detection history record deleted successfully."
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Record not found
- `500 Internal Server Error` - Deletion failed

---

### 5. Update Recipe Instructions

**Endpoint:** `POST /api/food_detection/instructions`

**Description:** Update cooking instructions for a chosen recipe suggestion.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "food_analysis_id": "uuid-string",
  "food_choice_index": "Grilled Chicken with Rice",
  "instructions_text": "1. Cook rice\n2. Grill chicken...",
  "recipe_ingredients": "[\"chicken\", \"rice\", \"oil\"]"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Instructions updated successfully."
}
```

**Error Responses:**
- `400 Bad Request` - Missing required data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Update failed

---

### 6. Update Resources

**Endpoint:** `POST /api/food_detection/resources`

**Description:** Update YouTube, Google, and resource links for detection entry.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "food_analysis_id": "uuid-string",
  "youtube_link": "https://youtube.com/watch?v=...",
  "google_link": "https://google.com/search?q=...",
  "resources_link": "<a href='...'>Full Recipe</a>"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Resources updated successfully."
}
```

---

### 7. Food Detect (Alternative)

**Endpoint:** `POST /api/food_detection/food_detect`

**Description:** Upload image with AI-detected foods and instructions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
image: [file]
detected_foods: "[\"chicken\", \"rice\"]"  (JSON string)
instructions_text: "Cooking instructions here"
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "analysis_id": "uuid-string",
  "message": "Food detection data received and saved."
}
```

---

### 8. Update Food Detection Resources

**Endpoint:** `POST /api/food_detection/food_detect_resources`

**Description:** Update resources for food detection entry.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "food_analysis_id": "uuid-string",
  "youtube_link": "https://youtube.com/...",
  "google_link": "https://google.com/...",
  "resources_link": "<a href='...'>Recipe</a>"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Food detection resources updated successfully."
}
```

---

### 9. Share Recipe

**Endpoint:** `POST /api/food_detection/share_recipe`

**Description:** Share a recipe with the community.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipe_type": "ingredient_detection",
  "suggestion": "Grilled Chicken with Rice",
  "instructions": "1. Cook rice...",
  "ingredients": "[\"chicken\", \"rice\"]",
  "detected_foods": "[\"chicken\"]",
  "analysis_id": "uuid-string",
  "youtube": "https://youtube.com/...",
  "google": "https://google.com/...",
  "resources": "<a href='...'>Recipe</a>"
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Recipe shared successfully."
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Share failed

---

## Meal Planning

### 1. Create Meal Plan

**Endpoint:** `POST /api/meal_plan`

**Description:** Create a new meal plan.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Week 1 Meal Plan",
  "startDate": "2025-01-01",
  "endDate": "2025-01-07",
  "has_sickness": false,
  "sickness_type": "",
  "mealPlan": [
    {
      "day": "Monday",
      "breakfast": "Oatmeal with fruits",
      "breakfast_ingredients": ["oats", "banana", "berries"],
      "lunch": "Grilled chicken salad",
      "lunch_ingredients": ["chicken", "lettuce", "tomato"],
      "dinner": "Salmon with vegetables",
      "dinner_ingredients": ["salmon", "broccoli", "carrots"],
      "snack": "Greek yogurt",
      "snack_ingredients": ["yogurt", "honey"]
    }
    // ... more days
  ]
}
```

**Notes:**
- Accepts both camelCase (`startDate`, `endDate`, `mealPlan`) and snake_case (`start_date`, `end_date`, `meal_plan`)
- `mealPlan` should be an array of day objects or a JSON object

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Meal plan saved.",
  "data": {
    "id": "uuid-string",
    "name": "Week 1 Meal Plan",
    "startDate": "2025-01-01",
    "endDate": "2025-01-07",
    "mealPlan": [...],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "hasSickness": false,
    "sicknessType": ""
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Save failed

---

### 2. Get Meal Plans

**Endpoint:** `GET /api/meal_plan`

**Description:** Retrieve all meal plans for the user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "meal_plans": [
    {
      "id": "uuid-string",
      "name": "Week 1 Meal Plan",
      "start_date": "2025-01-01",
      "end_date": "2025-01-07",
      "meal_plan": [...],
      "has_sickness": false,
      "sickness_type": "",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Retrieval failed

---

### 3. Get Single Meal Plan

**Endpoint:** `GET /api/meal_plan/<plan_id>`

**Description:** Retrieve a specific meal plan by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "meal_plan": {
    "id": "uuid-string",
    "name": "Week 1 Meal Plan",
    "start_date": "2025-01-01",
    "end_date": "2025-01-07",
    "meal_plan": [...]
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Meal plan not found

---

### 4. Update Meal Plan

**Endpoint:** `PUT /api/meal_plans/<plan_id>`

**Description:** Update an existing meal plan.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Meal Plan",
  "meal_plan": [...]
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Meal plan updated."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Update failed

---

### 5. Delete Meal Plan

**Endpoint:** `DELETE /api/meal_plans/<id>`

**Description:** Delete a meal plan.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Meal plan deleted."
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Meal plan not found
- `500 Internal Server Error` - Deletion failed

---

### 6. Clear All Meal Plans

**Endpoint:** `DELETE /api/meal_plans/clear`

**Description:** Delete all meal plans for the user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "All meal plans cleared."
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Clear failed

---

### 7. Get Single Day Plan

**Endpoint:** `GET /api/meal_plan/<plan_id>/<day>`

**Description:** Get meals for a specific day (e.g., "Monday").

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "day_plan": {
    "day": "Monday",
    "breakfast": "Oatmeal with fruits",
    "breakfast_ingredients": ["oats", "banana"],
    "lunch": "Grilled chicken salad",
    "lunch_ingredients": ["chicken", "lettuce"],
    "dinner": "Salmon with vegetables",
    "dinner_ingredients": ["salmon", "broccoli"],
    "snack": "Greek yogurt",
    "snack_ingredients": ["yogurt"]
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Day not found in meal plan

---

### 8. Get Single Meal

**Endpoint:** `GET /api/meal_plan/<plan_id>/<day>/<meal_type>`

**Description:** Get a specific meal (breakfast, lunch, dinner, snack).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "meal": "Oatmeal with fruits",
  "ingredients": ["oats", "banana", "berries"]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Meal not found

---

## User Settings

### 1. Save User Settings

**Endpoint:** `POST /api/settings`

**Description:** Save or update user settings/preferences.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "settings_type": "health_profile",
  "settings_data": {
    "age": 30,
    "weight": 70,
    "height": 175,
    "dietary_restrictions": ["gluten-free", "dairy-free"],
    "allergies": ["peanuts"],
    "health_goals": ["weight_loss", "muscle_gain"],
    "activity_level": "moderate",
    "medical_conditions": ["diabetes"]
  }
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Settings saved successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Save failed

---

### 2. Get User Settings

**Endpoint:** `GET /api/settings?settings_type=health_profile`

**Description:** Retrieve user settings.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `settings_type` (optional): Type of settings (default: "health_profile")

**Response:** `200 OK`
```json
{
  "status": "success",
  "settings": {
    "age": 30,
    "weight": 70,
    "height": 175,
    "dietary_restrictions": ["gluten-free"],
    "allergies": ["peanuts"],
    "health_goals": ["weight_loss"],
    "activity_level": "moderate"
  },
  "settings_type": "health_profile",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Retrieval failed

---

### 3. Delete User Settings

**Endpoint:** `DELETE /api/settings?settings_type=health_profile`

**Description:** Delete user settings.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `settings_type` (optional): Type of settings (default: "health_profile")

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Settings deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Deletion failed

---

## Subscriptions

### 1. Get Subscription Status

**Endpoint:** `GET /api/subscription/status?user_id=<user_id>`

**Description:** Get user's current subscription status.

**Headers:** None required (public endpoint but needs user_id in query)

**Query Parameters:**
- `user_id` (required): User's ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "has_active_subscription": true,
    "has_ever_had_subscription": true,
    "subscription": {
      "id": "uuid-string",
      "plan_id": "uuid-string",
      "plan_name": "Premium",
      "status": "active",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-02-01T00:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    "trial": {
      "id": "uuid-string",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-01-08T00:00:00Z",
      "is_used": false,
      "created_at": "2025-01-01T00:00:00Z"
    },
    "can_access_app": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - User ID required
- `500 Internal Server Error` - Failed to retrieve status

---

### 2. Check Feature Access

**Endpoint:** `POST /api/subscription/feature-access`

**Description:** Check if user can access a specific feature.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "feature_name": "meal_plan_generation"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "can_use": true,
    "feature_name": "meal_plan_generation",
    "plan_name": "Premium",
    "current_usage": 5,
    "limit": 100,
    "remaining": 95,
    "feature_available": true,
    "message": "Feature available"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing parameters
- `500 Internal Server Error` - Check failed

---

### 3. Record Feature Usage

**Endpoint:** `POST /api/subscription/record-usage`

**Description:** Record usage of a feature.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "feature_name": "meal_plan_generation",
  "count": 1
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Feature usage recorded successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Missing parameters
- `500 Internal Server Error` - Recording failed

---

### 4. Create User Trial

**Endpoint:** `POST /api/subscription/create-trial`

**Description:** Create a trial period for a new user.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "duration_days": 7
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Trial created successfully",
  "duration_days": 7
}
```

**Error Responses:**
- `400 Bad Request` - User ID required
- `500 Internal Server Error` - Trial creation failed

---

### 5. Activate Subscription

**Endpoint:** `POST /api/subscription/activate`

**Description:** Activate a subscription after successful payment.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "plan_name": "premium",
  "paystack_data": {
    "reference": "payment-reference",
    "transaction_id": "transaction-id",
    "amount": 9.99,
    "currency": "USD"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid-string",
    "plan_name": "premium",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-02-01T00:00:00Z",
    "duration_days": 30,
    "trial_marked_used": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing parameters
- `500 Internal Server Error` - Activation failed

---

### 6. Get Subscription Plans

**Endpoint:** `GET /api/subscription/plans`

**Description:** Get all available subscription plans.

**Response:** `200 OK`
```json
{
  "success": true,
  "plans": [
    {
      "id": "uuid-string",
      "name": "free",
      "display_name": "Free Plan",
      "price_usd": 0,
      "duration_days": 0,
      "features": ["Basic meal planning"],
      "is_active": true
    },
    {
      "id": "uuid-string",
      "name": "premium",
      "display_name": "Premium Plan",
      "price_usd": 9.99,
      "duration_days": 30,
      "features": [
        "Unlimited meal plans",
        "AI food detection",
        "Personalized recommendations"
      ],
      "is_active": true
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error` - Failed to retrieve plans

---

### 7. Activate Subscription for Days

**Endpoint:** `POST /api/subscription/activate-days`

**Description:** Activate subscription for custom number of days.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "duration_days": 30,
  "paystack_data": {
    "reference": "payment-ref",
    "transaction_id": "trans-id",
    "amount": 9.99
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid-string",
    "plan_name": "custom_30_days",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-31T00:00:00Z",
    "duration_days": 30
  }
}
```

---

### 8. Get Usage Stats

**Endpoint:** `GET /api/subscription/usage-stats?user_id=<user_id>`

**Description:** Get user's feature usage statistics.

**Query Parameters:**
- `user_id` (required): User's ID

**Response:** `200 OK`
```json
{
  "success": true,
  "usage_stats": [
    {
      "feature_name": "meal_plan_generation",
      "usage_count": 15,
      "last_used": "2025-01-01T00:00:00Z"
    },
    {
      "feature_name": "food_detection",
      "usage_count": 25,
      "last_used": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - User ID required
- `500 Internal Server Error` - Failed to retrieve stats

---

### 9. Verify Payment

**Endpoint:** `POST /api/subscription/verify-payment`

**Description:** Verify Paystack payment and activate subscription.

**Request Body:**
```json
{
  "reference": "payment-reference"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 999,
    "currency": "KES"
  },
  "message": "Payment verified successfully"
}
```

---

### 10. Webhook Handler

**Endpoint:** `POST /api/subscription/webhook`

**Description:** Handle Paystack webhook events for subscriptions.

**Request Body:** Paystack webhook payload

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Webhook processed: charge.success"
}
```

---

### 11. Health Check

**Endpoint:** `GET /api/subscription/health`

**Description:** Health check endpoint for subscription service.

**Response:** `200 OK`
```json
{
  "success": true,
  "service": "subscription",
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Payments

### 1. Get Subscription Plans

**Endpoint:** `GET /api/payment/plans`

**Description:** Get all available subscription plans.

**Response:** `200 OK`
```json
{
  "status": "success",
  "plans": [...]  // Same as subscription plans
}
```

---

### 2. Initialize Payment

**Endpoint:** `POST /api/payment/initialize-payment`

**Description:** Initialize a Paystack payment transaction.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "amount": 9.99,
  "plan_id": "uuid-string",
  "callback_url": "https://app.meallensai.com/payment/callback"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "ML_userid_ref123",
    "access_code": "access-code-string"
  }
}
```

**Notes:**
- Amount is in base currency (KES for Paystack Kenya)
- Redirect user to `authorization_url` to complete payment

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Payment initialization failed

---

### 3. Verify Payment

**Endpoint:** `GET /api/payment/verify-payment/<reference>`

**Description:** Verify a payment transaction after user completes payment.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `reference`: Payment reference returned from initialize

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Payment verified and subscription activated",
  "subscription": {
    "id": "uuid-string",
    "plan_id": "uuid-string",
    "status": "active",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-02-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Payment verification failed
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Failed to activate subscription

---

### 4. Get User Subscription

**Endpoint:** `GET /api/payment/subscription`

**Description:** Get current user's active subscription.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "subscription": {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "plan_id": "uuid-string",
    "status": "active",
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

---

### 5. Get User Usage

**Endpoint:** `GET /api/payment/usage`

**Description:** Get user's current usage summary.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "usage": {
    "meal_plan_generation": 15,
    "food_detection": 25,
    "ai_chat": 50
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Failed to retrieve usage

---

### 6. Check Feature Usage

**Endpoint:** `GET /api/payment/check-usage/<feature_name>`

**Description:** Check if user can use a specific feature.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `feature_name`: Name of the feature to check

**Response:** `200 OK`
```json
{
  "status": "success",
  "can_use": true,
  "current_usage": 15,
  "limit": 100,
  "remaining": 85,
  "message": "Feature available"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

---

### 7. Record Feature Usage

**Endpoint:** `POST /api/payment/record-usage/<feature_name>`

**Description:** Record usage of a feature.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**URL Parameters:**
- `feature_name`: Name of the feature

**Request Body:**
```json
{
  "count": 1
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Usage recorded successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Usage limit exceeded
- `500 Internal Server Error` - Recording failed

---

### 8. Cancel Subscription

**Endpoint:** `POST /api/payment/cancel-subscription`

**Description:** Cancel user's active subscription.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Subscription will be cancelled at the end of the current period"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - No active subscription found
- `500 Internal Server Error` - Cancellation failed

---

### 9. Payment Success Handler

**Endpoint:** `POST /api/payment/success`

**Description:** Handle successful payment (webhook handler).

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "email": "user@example.com",
  "plan_name": "Premium",
  "plan_duration_minutes": 30,
  "paystack_data": {
    "reference": "payment-reference",
    "amount": 999,
    "currency": "KES",
    "status": "success"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "data": {
    "subscription_id": "uuid-string",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-01T00:30:00Z",
    "duration_days": 0.0208
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Activation failed

---

### 10. Paystack Webhook

**Endpoint:** `POST /api/payment/webhook`

**Description:** Handle Paystack webhook events.

**Headers:**
```
X-Paystack-Signature: <webhook-signature>
Content-Type: application/json
```

**Request Body:** (Varies by event type)

**Response:** `200 OK`
```json
{
  "status": "success"
}
```

**Supported Events:**
- `charge.success` - Payment successful
- `subscription.create` - Subscription created
- `subscription.disable` - Subscription cancelled

**Error Responses:**
- `400 Bad Request` - Missing signature or invalid data
- `500 Internal Server Error` - Webhook processing failed

---

## Lifecycle Management

### 1. Get User Lifecycle Status

**Endpoint:** `GET /api/lifecycle/status`

**Description:** Get comprehensive user lifecycle status.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_state": "paid",  // new|trial_active|trial_used|paid|expired
    "has_active_trial": false,
    "has_active_subscription": true,
    "can_access_app": true,
    "trial_info": {
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-01-08T00:00:00Z",
      "is_used": true
    },
    "subscription_info": {
      "start_date": "2025-01-08T00:00:00Z",
      "end_date": "2025-02-08T00:00:00Z",
      "status": "active"
    },
    "message": "Active subscription"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Failed to retrieve status

---

### 2. Initialize Trial

**Endpoint:** `POST /api/lifecycle/initialize-trial`

**Description:** Initialize trial for a new user.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration_hours": 48,
  "test_mode": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "trial_id": "uuid-string",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-03T00:00:00Z",
    "duration_hours": 48,
    "status": "active"
  }
}
```

**Notes:**
- If `test_mode: true`, duration is set to 1 minute for testing

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Trial initialization failed

---

### 3. Mark Trial Used

**Endpoint:** `POST /api/lifecycle/mark-trial-used`

**Description:** Mark trial as used (expired).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_state": "trial_used",
    "message": "Trial marked as used"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Failed to mark trial

---

### 4. Activate Subscription

**Endpoint:** `POST /api/lifecycle/activate-subscription`

**Description:** Activate subscription and update user state to paid.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration_days": 30,
  "paystack_data": {
    "reference": "payment-reference",
    "amount": 9.99,
    "currency": "USD"
  },
  "test_mode": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid-string",
    "user_state": "paid",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-02-01T00:00:00Z",
    "duration_days": 30
  }
}
```

**Notes:**
- If `test_mode: true`, duration is set to 1 minute for testing

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Activation failed

---

### 5. Get Subscription Plans

**Endpoint:** `GET /api/lifecycle/plans`

**Description:** Get all available subscription plans.

**Response:** `200 OK`
```json
{
  "success": true,
  "plans": [...]  // Same structure as subscription plans
}
```

**Error Responses:**
- `500 Internal Server Error` - Failed to retrieve plans

---

### 6. Verify Payment

**Endpoint:** `POST /api/lifecycle/verify-payment`

**Description:** Verify Paystack payment.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reference": "payment-reference"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 999,
    "currency": "KES",
    "reference": "payment-reference",
    "paid_at": "2025-01-01T00:00:00Z"
  },
  "message": "Payment verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Payment reference required
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Verification failed

---

### 7. Mark Subscription Expired

**Endpoint:** `POST /api/lifecycle/mark-subscription-expired`

**Description:** Manually mark subscription as expired and update user state.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_state": "expired",
    "message": "Subscription marked as expired"
  }
}
```

---

### 8. Set Test Mode

**Endpoint:** `POST /api/lifecycle/set-test-mode`

**Description:** Enable/disable test mode with 1-minute durations for testing.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "test_mode": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "test_mode": true,
    "message": "Test mode enabled"
  }
}
```

---

### 9. Get User State Display

**Endpoint:** `GET /api/lifecycle/user-state-display`

**Description:** Get user state display information for UI.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_state": "paid",
    "display_message": "Your subscription is active",
    "show_trial_timer": false,
    "show_subscription_timer": true,
    "show_payment_prompt": false,
    "can_access_app": true,
    "days_remaining": 25,
    "hours_remaining": 12
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Failed to retrieve state

---

### 10. Check Expired Trials (Admin)

**Endpoint:** `POST /api/lifecycle/check-expired-trials`

**Description:** Check for expired trials and mark them as used (admin function).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expired_count": 5,
    "message": "Processed 5 expired trials"
  }
}
```

---

### 11. Check Expired Subscriptions (Admin)

**Endpoint:** `POST /api/lifecycle/check-expired-subscriptions`

**Description:** Check for expired subscriptions and mark them as expired (admin function).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expired_count": 3,
    "message": "Processed 3 expired subscriptions"
  }
}
```

---

## Enterprise Management

### 1. Register Enterprise

**Endpoint:** `POST /api/enterprise/register`

**Description:** Register a new organization/enterprise.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "HealthCare Clinic",
  "email": "admin@clinic.com",
  "phone": "+1234567890",
  "address": "123 Health St, City, Country",
  "organization_type": "hospital"  // hospital|clinic|wellness_center
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Enterprise registered successfully",
  "enterprise": {
    "id": "uuid-string",
    "name": "HealthCare Clinic",
    "email": "admin@clinic.com",
    "phone": "+1234567890",
    "address": "123 Health St, City, Country",
    "organization_type": "hospital",
    "created_by": "uuid-string",
    "max_users": 100,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or organization already exists
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - User cannot create organizations (invited users)
- `500 Internal Server Error` - Registration failed

---

### 2. Check Can Create Organization

**Endpoint:** `GET /api/enterprise/can-create`

**Description:** Check if current user can create organizations.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "can_create": true,
  "reason": "User can create organizations"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Check failed

---

### 3. Get My Enterprises

**Endpoint:** `GET /api/enterprise/my-enterprises`

**Description:** Get all enterprises owned by current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "enterprises": [
    {
      "id": "uuid-string",
      "name": "HealthCare Clinic",
      "email": "admin@clinic.com",
      "phone": "+1234567890",
      "address": "123 Health St",
      "organization_type": "hospital",
      "created_by": "uuid-string",
      "max_users": 100,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Retrieval failed

---

### 4. Get Enterprise Details

**Endpoint:** `GET /api/enterprise/<enterprise_id>`

**Description:** Get details for a specific enterprise.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "enterprise": {
    "id": "uuid-string",
    "name": "HealthCare Clinic",
    "email": "admin@clinic.com",
    "phone": "+1234567890",
    "address": "123 Health St",
    "organization_type": "hospital",
    "created_by": "uuid-string",
    "max_users": 100,
    "is_active": true,
    "stats": {
      "total_users": 45,
      "active_users": 42,
      "pending_invitations": 3
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Enterprise not found or access denied
- `500 Internal Server Error` - Retrieval failed

---

### 5. Update Enterprise

**Endpoint:** `PUT /api/enterprise/<enterprise_id>`

**Description:** Update enterprise details.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Clinic Name",
  "email": "newemail@clinic.com",
  "phone": "+0987654321",
  "address": "456 New St",
  "max_users": 150,
  "is_active": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Enterprise updated successfully",
  "enterprise": {
    // Updated enterprise object
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Enterprise not found or access denied
- `500 Internal Server Error` - Update failed

---

### 6. Get Enterprise Users

**Endpoint:** `GET /api/enterprise/<enterprise_id>/users`

**Description:** Get all users in an enterprise.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "users": [
    {
      "id": "relation-uuid",
      "user_id": "uuid-string",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "patient",  // patient|nutritionist|admin|owner
      "status": "active",
      "joined_at": "2025-01-01T00:00:00Z",
      "notes": "Regular patient",
      "metadata": {}
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (not admin/owner)
- `500 Internal Server Error` - Retrieval failed

---

### 7. Invite User

**Endpoint:** `POST /api/enterprise/<enterprise_id>/invite`

**Description:** Invite a user to join the enterprise.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "patient",
  "message": "Welcome to our clinic! We look forward to helping you."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Invitation created successfully",
  "invitation": {
    "id": "uuid-string",
    "enterprise_id": "uuid-string",
    "email": "newuser@example.com",
    "invited_by": "uuid-string",
    "invitation_token": "secure-token",
    "role": "patient",
    "status": "pending",
    "expires_at": "2025-01-08T00:00:00Z"
  },
  "invitation_link": "https://app.meallensai.com/accept-invitation?token=...",
  "email_sent": true
}
```

**Notes:**
- Invitation expires in 7 days
- Email is sent automatically if SMTP is configured

**Error Responses:**
- `400 Bad Request` - Email required, user already invited, or user limit reached
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (not admin/owner)
- `404 Not Found` - Enterprise not found
- `500 Internal Server Error` - Invitation failed

---

### 8. Get Invitations

**Endpoint:** `GET /api/enterprise/<enterprise_id>/invitations`

**Description:** Get all invitations for an enterprise.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "invitations": [
    {
      "id": "uuid-string",
      "enterprise_id": "uuid-string",
      "email": "invited@example.com",
      "invited_by": "uuid-string",
      "invitation_token": "token",
      "role": "patient",
      "status": "pending",  // pending|accepted|cancelled|expired
      "message": "Welcome!",
      "sent_at": "2025-01-01T00:00:00Z",
      "expires_at": "2025-01-08T00:00:00Z",
      "accepted_at": null,
      "accepted_by": null
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (not admin/owner)
- `500 Internal Server Error` - Retrieval failed

---

### 9. Verify Invitation (Public)

**Endpoint:** `GET /api/enterprise/invitation/verify/<token>`

**Description:** Verify an invitation token (public endpoint, no auth required).

**URL Parameters:**
- `token`: Invitation token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "invitation": {
    "id": "uuid-string",
    "email": "invited@example.com",
    "role": "patient",
    "message": "Welcome to our clinic",
    "enterprise": {
      "id": "uuid-string",
      "name": "HealthCare Clinic",
      "organization_type": "hospital"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invitation expired or already used
- `404 Not Found` - Invalid invitation token

---

### 10. Accept Invitation (Public)

**Endpoint:** `POST /api/enterprise/invitation/accept`

**Description:** Accept an invitation (works for both registered and unregistered users).

**Headers:** (Optional)
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "token": "invitation-token-from-email"
}
```

**Response for Authenticated Users:** `200 OK`
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "enterprise_id": "uuid-string",
  "enterprise_name": "HealthCare Clinic",
  "requires_registration": false
}
```

**Response for Unauthenticated Users:** `200 OK`
```json
{
  "success": true,
  "message": "Please create an account to accept this invitation",
  "invitation": {
    "id": "uuid-string",
    "email": "invited@example.com",
    "enterprise_id": "uuid-string",
    "enterprise_name": "HealthCare Clinic",
    "role": "patient"
  },
  "requires_registration": true
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token or invitation expired
- `500 Internal Server Error` - Acceptance failed

---

### 11. Complete Invitation

**Endpoint:** `POST /api/enterprise/invitation/complete`

**Description:** Complete invitation acceptance after user registration.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "invitation_id": "uuid-string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "enterprise_id": "uuid-string",
  "enterprise_name": "HealthCare Clinic"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid invitation ID or already accepted
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Completion failed

---

### 12. Create User

**Endpoint:** `POST /api/enterprise/create-user`

**Description:** Create a new user and add them to the organization directly (no invitation needed).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "enterprise_id": "uuid-string",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "password": "securePassword123",
  "role": "patient"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User created and added to organization successfully",
  "user": {
    "id": "uuid-string",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "patient",
    "enterprise_id": "uuid-string",
    "enterprise_name": "HealthCare Clinic"
  }
}
```

**Notes:**
- User account is created immediately
- Email is auto-confirmed
- 7-day trial is automatically created
- Welcome email is sent if SMTP is configured

**Error Responses:**
- `400 Bad Request` - Missing fields or user already exists
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (not admin/owner)
- `404 Not Found` - Enterprise not found
- `500 Internal Server Error` - User creation failed

---

### 13. Delete Organization User

**Endpoint:** `DELETE /api/enterprise/user/<user_relation_id>`

**Description:** Remove a user from the organization and delete their account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `user_relation_id`: The organization_users table relation ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User Jane Smith (jane@example.com) has been completely deleted. They can now be re-invited or register again.",
  "deleted_user": {
    "id": "relation-uuid",
    "user_id": "user-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
```

**Notes:**
- Removes user from organization
- Deletes user's Supabase authentication account
- User can be invited or created again

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (not organization owner)
- `404 Not Found` - User not found
- `500 Internal Server Error` - Deletion failed

---

### 14. Cancel Invitation

**Endpoint:** `POST /api/enterprise/invitation/<invitation_id>/cancel`

**Description:** Cancel a pending invitation.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
- `invitation_id`: The invitation ID to cancel

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Invitation cancelled successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Not the invitation sender
- `404 Not Found` - Invitation not found

---

### 15. Update User Relation

**Endpoint:** `PUT /api/enterprise/<enterprise_id>/user/<user_relation_id>`

**Description:** Update user's relationship with enterprise (role, status, notes).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "nutritionist",
  "status": "active",
  "notes": "Promoted to nutritionist role",
  "metadata": {
    "specialty": "sports nutrition"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

**Allowed Fields:**
- `status`: User status
- `role`: User role (patient, nutritionist, admin, owner)
- `notes`: Admin notes
- `metadata`: Additional metadata

---

### 16. Remove User from Enterprise

**Endpoint:** `DELETE /api/enterprise/<enterprise_id>/user/<user_relation_id>`

**Description:** Remove user from organization (keeps their account).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User removed successfully"
}
```

**Note:** This removes from organization but doesn't delete the user account.

---

### 17. Logout and Login Redirect

**Endpoint:** `GET /api/enterprise/logout-and-login`

**Description:** Logout current user and redirect to login page (used in email links).

**Response:** `302 Redirect`
Redirects to: `{FRONTEND_URL}/logout-and-login`

---

### 18. Get User's Enterprises

**Endpoint:** `GET /api/my-enterprises`

**Description:** Get all enterprises the user is part of (as owner or member).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "enterprises": [
    {
      "enterprise_id": "uuid-string",
      "name": "HealthCare Clinic",
      "role": "owner",
      "is_owner": true,
      "organization_type": "hospital"
    },
    {
      "enterprise_id": "uuid-string",
      "name": "Wellness Center",
      "role": "patient",
      "is_owner": false,
      "organization_type": "wellness_center"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Retrieval failed

---

## Feedback

### Submit Feedback

**Endpoint:** `POST /api/feedback`

**Description:** Submit user feedback.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
feedback_text: "Great app! Would love to see more recipes."
```

**Important:** This endpoint uses **multipart/form-data**, NOT JSON!

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Feedback received."
}
```

**Error Responses:**
- `400 Bad Request` - Feedback text required
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Save failed

---

## AI Sessions

### Store AI Session

**Endpoint:** `POST /api/api/store-session`

**Description:** Store AI chat session data.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "session_data": {
    "prompt": "What's a healthy breakfast?",
    "response": "Here are some healthy breakfast options...",
    "timestamp": "2025-01-01T00:00:00Z",
    "metadata": {
      "model": "gpt-4",
      "tokens_used": 150
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "session_id": "uuid-string"
}
```

**Error Responses:**
- `400 Bad Request` - Missing session_data
- `401 Unauthorized` - Invalid authentication token
- `500 Internal Server Error` - Storage failed

---

## HTTP Status Codes

### Success Codes

| Code | Status | Usage |
|------|--------|-------|
| 200 | OK | Successful GET, PUT, DELETE requests |
| 201 | Created | Successful POST request creating a new resource |

### Client Error Codes

| Code | Status | Description | Resolution |
|------|--------|-------------|------------|
| 400 | Bad Request | Invalid request syntax or missing required parameters | Verify request payload matches documentation |
| 401 | Unauthorized | Missing, invalid, or expired authentication credentials | Obtain new access token via login endpoint |
| 403 | Forbidden | Valid authentication but insufficient permissions | Verify user role and subscription status |
| 404 | Not Found | Requested resource does not exist | Verify resource ID and user ownership |
| 409 | Conflict | Request conflicts with existing resource state | Check for duplicate resources (e.g., email already registered) |

### Server Error Codes

| Code | Status | Description | Resolution |
|------|--------|-------------|------------|
| 500 | Internal Server Error | Unexpected server-side error | Contact technical support; check system logs |

---

## Rate Limiting & Throttling

### Current Implementation
Rate limiting is not currently enforced. This will be implemented in production release.

### Planned Production Limits

| Endpoint Category | Rate Limit | Window |
|------------------|-----------|--------|
| Authentication | 5 requests | Per minute per IP |
| Registration | 3 requests | Per hour per IP |
| API Endpoints | 100 requests | Per minute per user |
| File Uploads | 10 uploads | Per minute per user |
| Webhook Endpoints | 1000 requests | Per minute (Paystack) |

### Rate Limit Headers (Planned)
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Webhooks

### Paystack Webhook Events

**Endpoint:** `POST /api/payment/webhook`

**Headers Required:**
```
X-Paystack-Signature: <hmac-sha512-signature>
```

**Supported Events:**

1. **charge.success** - Payment completed
```json
{
  "event": "charge.success",
  "data": {
    "reference": "payment-reference",
    "amount": 999000,
    "currency": "NGN",
    "customer": {
      "email": "user@example.com"
    },
    "status": "success"
  }
}
```

2. **subscription.create** - Subscription activated
```json
{
  "event": "subscription.create",
  "data": {
    "subscription_code": "SUB_...",
    "customer": {
      "email": "user@example.com"
    },
    "plan": {
      "plan_code": "PLN_..."
    }
  }
}
```

3. **subscription.disable** - Subscription cancelled
```json
{
  "event": "subscription.disable",
  "data": {
    "subscription_code": "SUB_...",
    "customer": {
      "email": "user@example.com"
    }
  }
}
```

---

## Testing & Quality Assurance

### Test Environment Configuration

#### Subscription Time Override
For accelerated testing of time-dependent features, configure the subscription time unit:

```bash
# Environment variable for testing
SUB_TIME_UNIT=minutes  # Converts subscription days to minutes
SUB_TIME_UNIT=seconds  # Converts subscription days to seconds
SUB_TIME_UNIT=days     # Production default
```

**Use Case**: Enables rapid testing of trial expirations and subscription renewals without waiting for actual time periods.

### Test Data Scenarios

#### User Lifecycle States
Test coverage should include users in various lifecycle states:

| State | Description | Test Scenario |
|-------|-------------|---------------|
| New User | Newly registered, no trial | Registration flow validation |
| Trial Active | Within trial period | Feature access verification |
| Trial Expired | Trial period ended | Access restriction validation |
| Active Subscription | Paid subscription active | Full feature access |
| Expired Subscription | Subscription ended | Renewal flow testing |

### Payment Gateway Testing

#### Paystack Test Credentials

**Test Mode Configuration**:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
```

**Test Card Numbers**:
| Card Type | Number | CVV | Expiry | PIN | OTP |
|-----------|--------|-----|--------|-----|-----|
| Success | 4084 0840 8408 4081 | 408 | Any future | 0000 | 123456 |
| Insufficient Funds | 5060 6666 6666 6666 4444 | 123 | Any future | 0000 | 123456 |
| Invalid Card | 5060 0000 0000 0000 0000 | 123 | Any future | 0000 | 123456 |

**Important**: Test transactions will not result in actual charges.

---

## API Changelog

### Version 1.0.0 (January 2025)
**Initial Production Release**

#### Features Delivered
- Complete authentication and authorization system
- Food detection and nutritional analysis capabilities
- Meal planning and management system
- Multi-tier subscription management
- Paystack payment gateway integration
- Enterprise multi-tenancy support
- Email notification system
- User settings and preferences management

#### API Endpoints
- 68 total endpoints across 11 functional categories
- RESTful design patterns
- Comprehensive error handling
- JWT-based security model

---

## Technical Support

### Support Channels

| Type | Contact | Response Time |
|------|---------|---------------|
| **Critical Issues** | support@meallensai.com | 4 hours |
| **General Support** | support@meallensai.com | 24 hours |
| **Documentation** | https://docs.meallensai.com | Self-service |
| **Sales Inquiries** | sales@meallensai.com | 24 hours |

### Support Requirements
When reporting issues, please provide:
- Request ID or timestamp
- Endpoint URL and HTTP method
- Request payload (sanitized)
- Response status and body
- User ID or email (if applicable)
- Environment (production/staging/development)

---

## Legal & Compliance

### Terms of Service
API usage is governed by the MeallensAI Terms of Service available at https://healthassistant.meallensai.com/terms

### Privacy Policy
Data handling practices are detailed in our Privacy Policy at https://healthassistant.meallensai.com/privacy

### Data Processing Agreement
Enterprise customers require a signed Data Processing Agreement. Contact legal@meallensai.com

---

## Document Information

**Document Version**: 1.0.0  
**Last Updated**: January 7, 2025  
**Next Review**: April 2025  
**Document Owner**: Engineering Team  
**Classification**: Internal Use / Partner Access

---

**© 2025 MeallensAI. All rights reserved. This documentation is confidential and proprietary.**

