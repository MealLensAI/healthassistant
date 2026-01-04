#!/usr/bin/env python3
"""
Test script to check if enterprise routes are registered
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("=" * 60)
    print("Testing Enterprise Route Registration")
    print("=" * 60)
    
    # Test 1: Can we import the blueprint?
    print("\n1. Testing blueprint import...")
    try:
        from routes.enterprise_routes import enterprise_bp
        print("   ✅ Blueprint imported successfully")
        print(f"   Blueprint name: {enterprise_bp.name}")
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    # Test 2: Check if blueprint has routes
    print("\n2. Checking blueprint routes...")
    routes = list(enterprise_bp.deferred_functions)
    print(f"   Found {len(routes)} route functions")
    for rule in enterprise_bp.url_map.iter_rules() if hasattr(enterprise_bp, 'url_map') else []:
        print(f"   - {rule}")
    
    # Test 3: Try to create app and register
    print("\n3. Testing app creation and registration...")
    try:
        from app import create_app
        app = create_app()
        print("   ✅ App created successfully")
        
        # Check registered routes
        print("\n4. Checking registered routes in app...")
        all_routes = list(app.url_map.iter_rules())
        enterprise_routes = [r for r in all_routes if 'enterprise' in str(r)]
        
        print(f"   Total routes: {len(all_routes)}")
        print(f"   Enterprise routes: {len(enterprise_routes)}")
        
        if len(enterprise_routes) == 0:
            print("   ❌ NO ENTERPRISE ROUTES FOUND!")
            print("\n   Possible causes:")
            print("   - ENTERPRISE_ROUTES_ENABLED = False")
            print("   - Error during registration (check server logs)")
            print("   - Blueprint not registered")
        else:
            print("   ✅ Enterprise routes ARE registered:")
            for route in enterprise_routes[:10]:
                print(f"      {route}")
            if len(enterprise_routes) > 10:
                print(f"      ... and {len(enterprise_routes) - 10} more")
        
        # Test specific routes
        print("\n5. Testing specific routes...")
        test_routes = [
            '/api/enterprise/test',
            '/api/enterprise/my-enterprises',
            '/api/enterprise/can-create'
        ]
        
        for route_path in test_routes:
            found = any(str(rule.rule) == route_path for rule in enterprise_routes)
            status = "✅" if found else "❌"
            print(f"   {status} {route_path}")
        
    except Exception as e:
        print(f"   ❌ Error creating app: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Critical error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

