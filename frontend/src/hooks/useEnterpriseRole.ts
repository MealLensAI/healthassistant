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

      let enterprises: any[] = [];
      let ownsOrganizations = false;
      let apiCallsFailed = false;

      try {
        const enterprisesResult = await api.getMyEnterprises();
        
        if (enterprisesResult && typeof enterprisesResult === 'object') {
          const success = (enterprisesResult as any).success;
          const enterprisesData = (enterprisesResult as any).enterprises;
          
          if (success && Array.isArray(enterprisesData)) {
            enterprises = enterprisesData;
            ownsOrganizations = enterprises.length > 0;
          } else {
            enterprises = [];
            ownsOrganizations = false;
          }
        } else {
          enterprises = [];
          ownsOrganizations = false;
        }
      } catch (err: any) {
        console.error('[useEnterpriseRole] Failed to fetch enterprises:', err);
        enterprises = [];
        ownsOrganizations = false;
        apiCallsFailed = true;
      }

      let canCreate = false;
      try {
        const canCreateResult = await api.canCreateOrganization();
        
        if (canCreateResult && typeof canCreateResult === 'object') {
          const success = (canCreateResult as any).success;
          const canCreateFlag = (canCreateResult as any).can_create;
          canCreate = success && canCreateFlag === true;
        }
      } catch (err: any) {
        console.error('[useEnterpriseRole] Failed to check canCreate:', err);
        canCreate = false;
        apiCallsFailed = true;
      }

      // Priority 1: Check signup_type from user metadata (most reliable)
      let signupType: string | null = null;
      try {
        const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          const userMetadata = userData?.metadata || userData?.user_metadata || {};
          signupType = userMetadata.signup_type || userMetadata.signupType || null;
          
          // If signup_type is explicitly set, use it as the primary indicator
          if (signupType === 'organization') {
            ownsOrganizations = true; // Treat as organization user
            canCreate = true; // Allow access
          } else if (signupType === 'individual') {
            // Don't override API results if user actually has organizations
            // But if API failed and signup_type is individual, trust it
            if (apiCallsFailed) {
              ownsOrganizations = false;
              canCreate = false;
            }
          }
        }
      } catch (metadataErr) {
        // Silently handle metadata errors
      }
      
      // Fallback: If signup_type is not set and API calls failed, default to individual
      if (!signupType && apiCallsFailed && !ownsOrganizations && !canCreate) {
        ownsOrganizations = false;
        canCreate = false;
      }

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

