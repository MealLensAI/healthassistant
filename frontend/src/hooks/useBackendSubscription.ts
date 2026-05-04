import { useState, useEffect, useCallback } from 'react';
import { subscriptionService, SubscriptionStatus } from '@/lib/subscriptionService';

export interface BackendSubscriptionInfo {
    hasActiveSubscription: boolean;
    canAccessApp: boolean;
    subscription: SubscriptionStatus['subscription'];
    trial: SubscriptionStatus['trial'];
    isLoading: boolean;
    error: string | null;
}

export const useBackendSubscription = () => {
    // Start with optimistic defaults - assume access until proven otherwise
    const [subscriptionInfo, setSubscriptionInfo] = useState<BackendSubscriptionInfo>({
        hasActiveSubscription: false,
        canAccessApp: true, // Optimistic default - assume access
        subscription: null,
        trial: null,
        isLoading: false, // Start as false - don't block rendering
        error: null
    });

    const fetchSubscriptionStatus = useCallback(async () => {
        try {
            setSubscriptionInfo(prev => ({ ...prev, isLoading: true, error: null }));

            const status = await subscriptionService.getSubscriptionStatus();

            if (status) {
                setSubscriptionInfo({
                    hasActiveSubscription: status.has_active_subscription,
                    canAccessApp: status.can_access_app,
                    subscription: status.subscription,
                    trial: status.trial,
                    isLoading: false,
                    error: null
                });
            } else {
                setSubscriptionInfo({
                    hasActiveSubscription: false,
                    canAccessApp: false,
                    subscription: null,
                    trial: null,
                    isLoading: false,
                    error: 'Failed to fetch subscription status'
                });
            }
        } catch (error) {
            console.error('Error fetching subscription status:', error);
            setSubscriptionInfo({
                hasActiveSubscription: false,
                canAccessApp: false,
                subscription: null,
                trial: null,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, []);

    const checkFeatureAccess = useCallback(async (featureName: string): Promise<boolean> => {
        try {
            const access = await subscriptionService.canUseFeature(featureName);
            return access?.can_use || false;
        } catch (error) {
            console.error('Error checking feature access:', error);
            return false; // Block access on error
        }
    }, []);

    const recordFeatureUsage = useCallback(async (featureName: string, count: number = 1): Promise<boolean> => {
        try {
            return await subscriptionService.recordFeatureUsage(featureName, count);
        } catch (error) {
            console.error('Error recording feature usage:', error);
            return false;
        }
    }, []);

    const createTrial = useCallback(async (durationDays: number = 7): Promise<boolean> => {
        try {
            const success = await subscriptionService.createTrial(durationDays);
            if (success) {
                // Refresh subscription status after creating trial
                await fetchSubscriptionStatus();
            }
            return success;
        } catch (error) {
            console.error('Error creating trial:', error);
            return false;
        }
    }, [fetchSubscriptionStatus]);

    const activateSubscription = useCallback(async (planName: string, paystackData: any): Promise<boolean> => {
        try {
            const success = await subscriptionService.activateSubscription(planName, paystackData);
            if (success) {
                // Refresh subscription status after activating subscription
                await fetchSubscriptionStatus();
            }
            return success;
        } catch (error) {
            console.error('Error activating subscription:', error);
            return false;
        }
    }, [fetchSubscriptionStatus]);

    const getFormattedRemainingTime = useCallback(() => {
        if (subscriptionInfo.subscription) {
            return subscriptionService.getFormattedRemainingTime(subscriptionInfo as any);
        } else if (subscriptionInfo.trial) {
            return subscriptionService.getFormattedRemainingTime(subscriptionInfo as any);
        }
        return 'No active subscription';
    }, [subscriptionInfo]);

    const getPlanDisplayName = useCallback(() => {
        if (subscriptionInfo.subscription) {
            return subscriptionInfo.subscription.plan_display_name;
        } else if (subscriptionInfo.trial) {
            return 'Free Plan';
        }
        return 'No Plan';
    }, [subscriptionInfo]);

    const isSubscriptionExpired = useCallback(() => {
        if (subscriptionInfo.subscription) {
            return subscriptionService.isSubscriptionExpired(subscriptionInfo as any);
        }
        return true;
    }, [subscriptionInfo]);

    const isTrialExpired = useCallback(() => {
        if (subscriptionInfo.trial) {
            return subscriptionService.isTrialExpired(subscriptionInfo as any);
        }
        return true;
    }, [subscriptionInfo]);

    useEffect(() => {
        // Load subscription status in background - don't block rendering
        fetchSubscriptionStatus().catch(console.error);

        // Set up periodic refresh every 5 minutes
        const interval = setInterval(() => {
            fetchSubscriptionStatus().catch(console.error);
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchSubscriptionStatus]);

    return {
        ...subscriptionInfo,
        fetchSubscriptionStatus,
        checkFeatureAccess,
        recordFeatureUsage,
        createTrial,
        activateSubscription,
        getFormattedRemainingTime,
        getPlanDisplayName,
        isSubscriptionExpired,
        isTrialExpired,
        // Convenience getters
        hasActiveSubscription: subscriptionInfo.hasActiveSubscription,
        canAccessApp: subscriptionInfo.canAccessApp,
        isLoading: subscriptionInfo.isLoading,
        error: subscriptionInfo.error
    };
};