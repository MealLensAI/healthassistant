import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/utils';

interface EnterpriseInfo {
  hasEnterprises: boolean;
  enterpriseCount: number;
  isOrganizationOwner: boolean;
  canCreateOrganizations: boolean;
  enterprises: any[];
}

const defaultEnterpriseInfo: EnterpriseInfo = {
  hasEnterprises: false,
  enterpriseCount: 0,
  isOrganizationOwner: false,
  canCreateOrganizations: false,
  enterprises: []
};

export const useEnterpriseRole = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [enterpriseInfo, setEnterpriseInfo] = useState<EnterpriseInfo>(defaultEnterpriseInfo);
  const [role, setRole] = useState<'organization' | 'individual' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const computeRole = (ownsOrganizations: boolean, canCreate: boolean) => {
    if (ownsOrganizations || canCreate) {
      return 'organization';
    }
    return 'individual';
  };

  const fetchEnterpriseAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useEnterpriseRole] Starting enterprise access check...');

      let enterprises: any[] = [];
      let ownsOrganizations = false;
      let apiCallsFailed = false;

      try {
        console.log('[useEnterpriseRole] Calling api.getMyEnterprises()...');
        const enterprisesResult = await api.getMyEnterprises();
        console.log('[useEnterpriseRole] getMyEnterprises response:', JSON.stringify(enterprisesResult, null, 2));
        
        if (enterprisesResult && typeof enterprisesResult === 'object') {
          const success = (enterprisesResult as any).success;
          const enterprisesData = (enterprisesResult as any).enterprises;
          
          console.log('[useEnterpriseRole] Response success:', success);
          console.log('[useEnterpriseRole] Enterprises data:', enterprisesData);
          console.log('[useEnterpriseRole] Enterprises is array?', Array.isArray(enterprisesData));
          
          if (success && Array.isArray(enterprisesData)) {
            enterprises = enterprisesData;
            ownsOrganizations = enterprises.length > 0;
            console.log('[useEnterpriseRole] ✅ User owns', enterprises.length, 'enterprises');
          } else {
            console.warn('[useEnterpriseRole] ⚠️ Unexpected response format or no success flag');
            enterprises = [];
            ownsOrganizations = false;
          }
        } else {
          console.warn('[useEnterpriseRole] ⚠️ Response is not an object:', typeof enterprisesResult);
          enterprises = [];
          ownsOrganizations = false;
        }
      } catch (err: any) {
        console.error('❌ [useEnterpriseRole] Failed to fetch enterprises:', err);
        console.error('[useEnterpriseRole] Error details:', {
          message: err?.message,
          stack: err?.stack,
          response: err?.response,
          status: err?.status
        });
        enterprises = [];
        ownsOrganizations = false;
        apiCallsFailed = true;
      }

      let canCreate = false;
      try {
        console.log('[useEnterpriseRole] Calling api.canCreateOrganization()...');
        const canCreateResult = await api.canCreateOrganization();
        console.log('[useEnterpriseRole] canCreateOrganization response:', JSON.stringify(canCreateResult, null, 2));
        
        if (canCreateResult && typeof canCreateResult === 'object') {
          const success = (canCreateResult as any).success;
          const canCreateFlag = (canCreateResult as any).can_create;
          canCreate = success && canCreateFlag === true;
          console.log('[useEnterpriseRole] Can create organizations:', canCreate);
        }
      } catch (err: any) {
        console.error('❌ [useEnterpriseRole] Failed to check canCreate:', err);
        console.error('[useEnterpriseRole] Error details:', {
          message: err?.message,
          stack: err?.stack
        });
        canCreate = false;
        apiCallsFailed = true;
      }

      // Priority 1: Check signup_type from user metadata (most reliable)
      // This should be checked FIRST, before API calls, to ensure consistent behavior
      let signupType: string | null = null;
      try {
        const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          const userMetadata = userData?.metadata || userData?.user_metadata || {};
          signupType = userMetadata.signup_type || userMetadata.signupType || null;
          
          console.log('[useEnterpriseRole] Checking signup_type:', {
            signupType,
            userMetadata
          });
          
          // If signup_type is explicitly set, use it as the primary indicator
          if (signupType === 'organization') {
            console.log('[useEnterpriseRole] ✅ User has signup_type=organization, setting as organization user');
            ownsOrganizations = true; // Treat as organization owner
            canCreate = true; // Allow access
          } else if (signupType === 'individual') {
            console.log('[useEnterpriseRole] ✅ User has signup_type=individual, setting as individual user');
            // Don't override API results if user actually owns organizations
            // But if API failed and signup_type is individual, trust it
            if (apiCallsFailed) {
              ownsOrganizations = false;
              canCreate = false;
            }
          }
        } else {
          console.log('[useEnterpriseRole] No user_data found in localStorage');
        }
      } catch (metadataErr) {
        console.warn('[useEnterpriseRole] Could not check user metadata:', metadataErr);
      }
      
      // Fallback: If signup_type is not set and API calls failed, default to individual
      if (!signupType && apiCallsFailed && !ownsOrganizations && !canCreate) {
        console.log('[useEnterpriseRole] ⚠️ No signup_type and API failed, defaulting to individual');
        ownsOrganizations = false;
        canCreate = false;
      }

      console.log('[useEnterpriseRole] Final state:', {
        ownsOrganizations,
        canCreate,
        enterpriseCount: enterprises.length,
        role: computeRole(ownsOrganizations, canCreate)
      });

      setEnterpriseInfo({
        hasEnterprises: ownsOrganizations,
        enterpriseCount: enterprises.length,
        isOrganizationOwner: ownsOrganizations,
        canCreateOrganizations: canCreate,
        enterprises
      });
      setRole(computeRole(ownsOrganizations, canCreate));
    } catch (err: any) {
      console.error('❌ [useEnterpriseRole] Critical error checking enterprise access:', err);
      setEnterpriseInfo(defaultEnterpriseInfo);
      setRole('individual');
      setError(err.message || 'Failed to check enterprise access');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setEnterpriseInfo(defaultEnterpriseInfo);
      setRole(null);
      setIsLoading(false);
      return;
    }

    fetchEnterpriseAccess();
  }, [authLoading, isAuthenticated, fetchEnterpriseAccess, refreshKey]);

  const refreshEnterpriseInfo = useCallback(async () => {
    setRefreshKey(Date.now());
  }, []);

  return {
    ...enterpriseInfo,
    role,
    isLoading,
    error,
    refreshEnterpriseInfo
  };
};

