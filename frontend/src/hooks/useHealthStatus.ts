import { useState, useEffect } from 'react';
import { useSicknessSettings } from './useSicknessSettings';
import { useAuth } from '@/lib/utils';

/**
 * Hook to provide centralized health status awareness across the entire app
 * This makes the app "aware" if user is sick and adapts features accordingly
 */
export const useHealthStatus = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, isHealthProfileComplete } = useSicknessSettings();
  
  const [healthStatus, setHealthStatus] = useState({
    isHealthAware: false,
    hasSickness: false,
    sicknessType: '',
    profileComplete: false,
    needsHealthProfile: false
  });

  useEffect(() => {
    if (authLoading || settingsLoading || !isAuthenticated) {
      return;
    }

    const hasSickness = settings.hasSickness || false;
    const profileComplete = isHealthProfileComplete();

    setHealthStatus({
      isHealthAware: hasSickness,
      hasSickness: hasSickness,
      sicknessType: settings.sicknessType || '',
      profileComplete: profileComplete,
      // Personalization needs a full profile regardless of hasSickness flag
      needsHealthProfile: !profileComplete
    });
  }, [settings, isAuthenticated, authLoading, settingsLoading, isHealthProfileComplete]);

  return {
    ...healthStatus,
    loading: settingsLoading,
    settings
  };
};

