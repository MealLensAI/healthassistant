#!/bin/bash

# Test User Registration - Individual and Organization Users
# This script creates two test users to verify login routing (Goal 2)

API_URL="http://localhost:5001"

echo "=========================================="
echo "Testing User Registration"
echo "=========================================="
echo ""

# 1. Register Individual User
echo "1. Registering Individual User..."
INDIVIDUAL_RESPONSE=$(curl -s -X POST "${API_URL}/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.individual@example.com",
    "password": "Test123456",
    "first_name": "John",
    "last_name": "Doe",
    "signup_type": "individual"
  }')

echo "Response:"
echo "$INDIVIDUAL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INDIVIDUAL_RESPONSE"
echo ""
echo "Individual User Credentials:"
echo "  Email: test.individual@example.com"
echo "  Password: Test123456"
echo "  Signup Type: individual"
echo ""
echo "---"
echo ""

# 2. Register Organization User
echo "2. Registering Organization User..."
ORG_RESPONSE=$(curl -s -X POST "${API_URL}/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.organization@example.com",
    "password": "Test123456",
    "first_name": "Jane",
    "last_name": "Smith",
    "signup_type": "organization"
  }')

echo "Response:"
echo "$ORG_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ORG_RESPONSE"
echo ""
echo "Organization User Credentials:"
echo "  Email: test.organization@example.com"
echo "  Password: Test123456"
echo "  Signup Type: organization"
echo ""
echo "---"
echo ""

# 3. Test Login for Individual User
echo "3. Testing Individual User Login..."
INDIVIDUAL_LOGIN=$(curl -s -X POST "${API_URL}/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.individual@example.com",
    "password": "Test123456"
  }')

echo "Login Response:"
echo "$INDIVIDUAL_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$INDIVIDUAL_LOGIN"
echo ""
echo "---"
echo ""

# 4. Test Login for Organization User
echo "4. Testing Organization User Login..."
ORG_LOGIN=$(curl -s -X POST "${API_URL}/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.organization@example.com",
    "password": "Test123456"
  }')

echo "Login Response:"
echo "$ORG_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$ORG_LOGIN"
echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Test individual user login in browser - should redirect to /planner"
echo "2. Test organization user login in browser - should redirect to /enterprise"
echo "3. Check browser console for routing logs"


