import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Lock, CreditCard, Star } from 'lucide-react';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubscriptionExpired?: boolean;
}

const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ isOpen, onClose, isSubscriptionExpired = false }) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    // Use React Router navigation to preserve authentication state
    navigate('/payment');
    onClose();
  };

  // Debug logging
  console.log('🔍 TrialExpiredModal render:', {
    isOpen,
    isSubscriptionExpired,
    shouldShow: isOpen
  });

  // Don't render the modal if it's not supposed to be open
  if (!isOpen) {
    return null;
  }

  // NEVER show trial modal if user has active subscription
  if (isSubscriptionExpired === false) {
    console.log('🔍 TrialExpiredModal: User has active subscription, not showing modal');
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600">
            <Lock className="h-6 w-6" />
            {isSubscriptionExpired ? 'Subscription Expired' : 'Free Meal Plan Used'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isSubscriptionExpired ? 'Your Subscription Has Ended' : "You've Used Your Free 7-Day Meal Plan"}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {isSubscriptionExpired
                  ? 'Your subscription period has ended. To continue using all the amazing features, please renew your subscription.'
                  : 'You\'ve already generated your one free 7-day meal plan. Subscribe to generate unlimited new meal plans whenever you need them.'
                }
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-orange-500" />
              What You'll Get:
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Unlimited meal planning</li>
              <li>• AI-powered food detection</li>
              <li>• Personalized cooking instructions</li>
              <li>• Recipe sharing with friends</li>
              <li>• Advanced meal analytics</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isSubscriptionExpired ? 'Renew Subscription' : 'Subscribe to Generate More'}
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can still access your account settings and payment options
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiredModal;
