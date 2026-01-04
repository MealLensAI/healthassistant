#!/usr/bin/env python3
"""
Quick script to check if enterprise routes are registered
Run this while the Flask server is running to verify routes
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app import create_app
    app = create_app()
    
    print("=" * 60)
    print("ENTERPRISE ROUTES CHECK")
    print("=" * 60)
    
    # Get all routes
    all_routes = list(app.url_map.iter_rules())
    enterprise_routes = [rule for rule in all_routes if 'enterprise' in str(rule)]
    
    print(f"\nTotal routes: {len(all_routes)}")
    print(f"Enterprise routes found: {len(enterprise_routes)}\n")
    
    if len(enterprise_routes) == 0:
        print("❌ NO ENTERPRISE ROUTES FOUND!")
        print("\nThis means the enterprise blueprint is NOT registered.")
        print("\nPossible causes:")
        print("  1. ENTERPRISE_ROUTES_ENABLED = False")
        print("  2. Error during blueprint import/registration")
        print("  3. Server not restarted after code changes")
        print("\nCheck server startup logs for:")
        print("  - 'Enterprise routes loaded successfully'")
        print("  - '✅ Enterprise routes registered successfully'")
        print("  - Any error messages about enterprise routes")
    else:
        print("✅ Enterprise routes ARE registered:")
        print()
        for rule in enterprise_routes[:20]:
            methods = ','.join(rule.methods - {'HEAD', 'OPTIONS'})
            print(f"  {methods:8} {rule.rule}")
        if len(enterprise_routes) > 20:
            print(f"  ... and {len(enterprise_routes) - 20} more")
        
        # Check specific routes
        print("\n" + "=" * 60)
        print("CHECKING SPECIFIC ROUTES:")
        print("=" * 60)
        
        test_routes = [
            '/api/enterprise/my-enterprises',
            '/api/enterprise/can-create',
            '/api/enterprise/test'
        ]
        
        for route_path in test_routes:
            found = any(str(rule.rule) == route_path for rule in enterprise_routes)
            status = "✅ FOUND" if found else "❌ NOT FOUND"
            print(f"  {status:12} {route_path}")
    
    print("\n" + "=" * 60)
    
except Exception as e:
    print(f"❌ Error checking routes: {e}")
    import traceback
    traceback.print_exc()

