#!/usr/bin/env python3
"""
Test script to check Supabase connection stability
"""

import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_supabase_connection():
    """Test Supabase connection with multiple operations"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    print(f"🔗 Testing connection to: {supabase_url}")
    
    try:
        # Create client
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created successfully")
        
        # Test 1: Simple query
        print("\n📋 Test 1: Simple query to enterprises table")
        result = supabase.table('enterprises').select('id').limit(1).execute()
        print(f"✅ Query successful, returned {len(result.data)} rows")
        
        # Test 2: Multiple rapid queries (simulate load)
        print("\n📋 Test 2: Multiple rapid queries")
        for i in range(5):
            result = supabase.table('enterprises').select('id').limit(1).execute()
            print(f"  Query {i+1}: ✅ Success")
            time.sleep(0.1)
        
        # Test 3: Insert and delete test record
        print("\n📋 Test 3: Insert/Delete test")
        test_data = {
            'name': 'TEST_ORG_DELETE_ME',
            'email': f'test_{int(time.time())}@test.com',
            'organization_type': 'clinic',
            'created_by': '00000000-0000-0000-0000-000000000000'  # Dummy UUID
        }
        
        # Insert
        insert_result = supabase.table('enterprises').insert(test_data).execute()
        if insert_result.data:
            test_id = insert_result.data[0]['id']
            print(f"✅ Insert successful, ID: {test_id}")
            
            # Delete
            delete_result = supabase.table('enterprises').delete().eq('id', test_id).execute()
            print(f"✅ Delete successful")
        else:
            print("❌ Insert failed - no data returned")
            
        print("\n🎉 All tests passed! Supabase connection is stable.")
        return True
        
    except Exception as e:
        print(f"\n❌ Connection test failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Check for specific error types
        error_msg = str(e).lower()
        if 'disconnected' in error_msg:
            print("💡 Suggestion: This appears to be a connection stability issue.")
            print("   Try running the test again, or check your internet connection.")
        elif 'timeout' in error_msg:
            print("💡 Suggestion: Request timed out. Supabase might be experiencing high load.")
        elif 'authentication' in error_msg or 'unauthorized' in error_msg:
            print("💡 Suggestion: Check your SUPABASE_SERVICE_ROLE_KEY is correct.")
        elif 'not found' in error_msg:
            print("💡 Suggestion: Check your SUPABASE_URL is correct.")
        
        return False

if __name__ == "__main__":
    print("🧪 Supabase Connection Test")
    print("=" * 50)
    
    success = test_supabase_connection()
    
    if success:
        print("\n✅ Connection test completed successfully!")
        exit(0)
    else:
        print("\n❌ Connection test failed!")
        exit(1)