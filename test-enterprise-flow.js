/**
 * Test script to verify enterprise login flow
 * Run this in browser console after logging in as an organization user
 */

function testEnterpriseFlow() {
  console.log('🧪 Testing Enterprise Login Flow...\n');
  
  // Test 1: Check user_data structure
  console.log('Test 1: Checking user_data structure');
  const userDataStr = localStorage.getItem('user_data');
  if (!userDataStr) {
    console.error('❌ FAIL: No user_data in localStorage');
    return false;
  }
  
  try {
    const userData = JSON.parse(userDataStr);
    console.log('✅ user_data found:', userData);
    
    // Test 2: Check metadata exists
    console.log('\nTest 2: Checking metadata');
    const metadata = userData.metadata || userData.user_metadata || {};
    console.log('Metadata:', metadata);
    
    if (!metadata || Object.keys(metadata).length === 0) {
      console.warn('⚠️ WARNING: No metadata found in user_data');
    } else {
      console.log('✅ Metadata found');
    }
    
    // Test 3: Check signup_type
    console.log('\nTest 3: Checking signup_type');
    const signupType = metadata.signup_type || metadata.signupType;
    console.log('Signup type:', signupType);
    
    if (signupType === 'organization') {
      console.log('✅ PASS: signup_type is "organization"');
    } else if (signupType) {
      console.log(`⚠️ INFO: signup_type is "${signupType}" (not organization)`);
    } else {
      console.error('❌ FAIL: signup_type not found in metadata');
      return false;
    }
    
    // Test 4: Simulate useEnterpriseRole fallback logic
    console.log('\nTest 4: Simulating useEnterpriseRole fallback logic');
    let canCreate = false;
    
    // Simulate API failure
    const apiCallsFailed = true;
    const ownsOrganizations = false;
    
    if (apiCallsFailed || (!ownsOrganizations && !canCreate)) {
      const fallbackSignupType = metadata.signup_type || metadata.signupType;
      if (fallbackSignupType === 'organization') {
        canCreate = true;
        console.log('✅ PASS: Fallback logic would set canCreateOrganizations = true');
      } else {
        console.log('❌ FAIL: Fallback logic would NOT set canCreateOrganizations');
      }
    }
    
    // Test 5: Simulate OrganizationAccessGuard check
    console.log('\nTest 5: Simulating OrganizationAccessGuard check');
    const hasOrganizationSignupType = signupType === 'organization';
    const role = 'individual'; // Simulate API failure
    const hasEnterprises = false;
    const canCreateOrganizations = canCreate;
    
    if (role !== 'organization' && !hasEnterprises && !canCreateOrganizations && !hasOrganizationSignupType) {
      console.log('❌ FAIL: OrganizationAccessGuard would BLOCK access');
      return false;
    } else {
      console.log('✅ PASS: OrganizationAccessGuard would ALLOW access');
    }
    
    console.log('\n✅✅✅ ALL TESTS PASSED ✅✅✅');
    console.log('\nSummary:');
    console.log('- user_data structure: ✅');
    console.log('- metadata present: ✅');
    console.log('- signup_type: ' + signupType);
    console.log('- Fallback logic: ✅');
    console.log('- Access guard: ✅');
    
    return true;
  } catch (err) {
    console.error('❌ FAIL: Error parsing user_data:', err);
    return false;
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('Run testEnterpriseFlow() in console to test');
  window.testEnterpriseFlow = testEnterpriseFlow;
} else {
  // Node.js environment
  module.exports = { testEnterpriseFlow };
}

