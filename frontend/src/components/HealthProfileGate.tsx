import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/utils';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';

const GATE_KEY_PREFIX = 'meallensai_health_gate_seen_';

const gateKey = (userId: string) => `${GATE_KEY_PREFIX}${userId}`;

const wasGateSeen = (userId: string): boolean => {
  try {
    return sessionStorage.getItem(gateKey(userId)) === '1';
  } catch {
    return false;
  }
};

const markGateSeen = (userId: string) => {
  try {
    sessionStorage.setItem(gateKey(userId), '1');
  } catch {
    /* ignore */
  }
};

/** Clear per-session health-gate flags (call on logout so next sign-in can prompt again). */
export const clearHealthProfileGateFlags = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(GATE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
};

/**
 * After sign-in, loads health profile from backend and prompts once if incomplete.
 * Mounted in MainLayout so users see it immediately — not only when they try a feature.
 */
const HealthProfileGate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { loading: settingsLoading, settings, isHealthProfileComplete } = useSicknessSettings();
  const [open, setOpen] = useState(false);

  const userId = user?.uid;
  const onSettingsPage = location.pathname === '/settings';
  const profileComplete = isHealthProfileComplete();

  useEffect(() => {
    if (authLoading || settingsLoading || !isAuthenticated || !userId) {
      return;
    }

    // Already on Health info — no need to interrupt
    if (onSettingsPage) {
      setOpen(false);
      return;
    }

    if (profileComplete) {
      setOpen(false);
      return;
    }

    // Once per browser session per user (cleared on logout)
    if (wasGateSeen(userId)) {
      return;
    }

    markGateSeen(userId);
    setOpen(true);
  }, [
    authLoading,
    settingsLoading,
    isAuthenticated,
    userId,
    onSettingsPage,
    profileComplete,
    settings.age,
    settings.sicknessType,
    settings.location,
  ]);

  const dismiss = () => setOpen(false);

  const goToHealthInfo = () => {
    dismiss();
    navigate('/settings');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0E3E77]">
            Complete your health profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-gray-600 text-sm leading-relaxed">
              MealLensAI uses your health information to personalize Food for you,
              meal plans, and location recommendations. Save your profile so we can
              match meals to your condition.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={goToHealthInfo}
              className="w-full bg-[#0E3E77] hover:bg-[#0a2f5c] text-white font-semibold py-3"
            >
              Update health profile
            </Button>

            <Button variant="outline" onClick={dismiss} className="w-full">
              Maybe later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can always open Health info from the sidebar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HealthProfileGate;
