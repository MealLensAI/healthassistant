#!/usr/bin/env python3
"""Quick test to verify enterprise routes are working"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Set environment
os.environ['FLASK_ENV'] = 'development'

try:
    print("=" * 60)
    print("Testing Enterprise Routes Import and Registration")
    print("=" * 60)
    
    # Test 1: Import
    print("\n1. Testing import...")
    from routes.enterprise_routes import enterprise_bp
    print("   ✅ Import successful")
    print(f"   Blueprint name: {enterprise_bp.name}")
    
    # Test 2: Create app
    print("\n2. Testing app creation...")
    from app import create_app
    app = create_app()
    print("   ✅ App created successfully")
    
    # Test 3: Check routes
    print("\n3. Checking registered routes...")
    all_routes = list(app.url_map.iter_rules())
    enterprise_routes = [str(rule) for rule in all_routes if 'enterprise' in str(rule)]
    
    print(f"   Total routes: {len(all_routes)}")
    print(f"   Enterprise routes: {len(enterprise_routes)}")
    
    if enterprise_routes:
        print("\n   ✅ Enterprise routes found:")
        for route in enterprise_routes[:10]:
            print(f"      {route}")
        if len(enterprise_routes) > 10:
            print(f"      ... and {len(enterprise_routes) - 10} more")
    else:
        print("\n   ❌ NO ENTERPRISE ROUTES FOUND!")
        print("\n   Sample routes:")
        for route in [str(r) for r in all_routes[:10]]:
            print(f"      {route}")
    
    # Test 4: Check specific route
    print("\n4. Testing specific route...")
    my_enterprises_routes = [r for r in enterprise_routes if 'my-enterprises' in r]
    if my_enterprises_routes:
        print(f"   ✅ Found my-enterprises route: {my_enterprises_routes[0]}")
    else:
        print("   ❌ my-enterprises route NOT found!")
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

