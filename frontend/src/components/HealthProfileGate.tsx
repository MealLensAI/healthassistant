import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

type HealthProfileGateProps = {
  userId?: string;
  /** True only after backend/cache health-profile check has finished. */
  ready: boolean;
  profileComplete: boolean;
};

/**
 * Prompts once when health profile is confirmed incomplete.
 * Parent (MainLayout) must wait for the backend check before mounting this ready.
 */
const HealthProfileGate: React.FC<HealthProfileGateProps> = ({
  userId,
  ready,
  profileComplete,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const onSettingsPage = location.pathname === '/settings';

  useEffect(() => {
    if (!ready || !userId) {
      return;
    }

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
  }, [ready, userId, onSettingsPage, profileComplete]);

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
