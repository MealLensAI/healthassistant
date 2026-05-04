// Removed Firebase import - using Supabase auth instead
import { APP_CONFIG } from '@/lib/config';

export interface SubscriptionStatus {
    has_active_subscription: boolean;
    subscription: {
        id: string;
        plan_name: string;
        plan_display_name: string;
        price_usd: number;
        duration_days: number;
        features: string[];
        start_date: string;
        end_date: string;
        remaining_days: number;
        remaining_hours: number;
        remaining_minutes: number;
        progress_percentage: number;
    } | null;
    trial: {
        start_date: string | null;
        end_date: string | null;
        is_active: boolean;
        is_used?: boolean;
        meal_plans_used?: number;
        meal_plans_limit?: number;
        free_meal_plan_used?: boolean;
        // Legacy fields kept for backward compatibility — they may be 0/absent.
        remaining_days?: number;
        remaining_hours?: number;
        remaining_minutes?: number;
        progress_percentage?: number;
    } | null;
    can_access_app: boolean;
    meal_plans_used?: number;
    meal_plans_limit?: number;
    free_meal_plan_used?: boolean;
    can_generate_meal_plan?: boolean;
}

export interface FeatureAccess {
    can_use: boolean;
    feature_name: string;
    plan_name: string;
    current_usage: number;
    feature_available: boolean;
    message: string;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    display_name: string;
    price_usd: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
}

class SubscriptionService {
    private baseUrl: string;

    constructor() {
        // Always target the configured backend base URL
        this.baseUrl = `${APP_CONFIG.api.base_url}/api`;
    }

    private async getAuthHeaders(): Promise<HeadersInit> {
        // Use the backend access token set during login
        const accessToken = localStorage.getItem('access_token');
        const supabaseUserId = localStorage.getItem('supabase_user_id');

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        if (supabaseUserId) {
            headers['X-User-ID'] = supabaseUserId;
        }

        return headers;
    }

    private async getCurrentUser(): Promise<{ uid: string; email: string | null } | null> {
        try {
            // Prefer backend source of truth
            const token = localStorage.getItem('access_token');
            if (!token) return null;
            const profileUrl = `${this.baseUrl}/profile`;
            console.log('[SUB][PROFILE] Fetching profile from:', profileUrl);
            const res = await fetch(profileUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log('[SUB][PROFILE] Response status:', res.status);
            if (!res.ok) return null;
            const payload = await res.json();
            console.log('[SUB][PROFILE] Payload keys:', Object.keys(payload || {}));
            const profile = payload.profile ?? payload.data ?? null;
            if (!profile) return null;
            return { uid: profile.id, email: profile.email };
        } catch {
            return null;
        }
    }

    /**
     * Get user's current subscription status
     */
    async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
        try {
            // Always call backend; do not rely on localStorage fallbacks
            const user = await this.getCurrentUser();
            if (!user) return null;

            const headers = await this.getAuthHeaders();
            const url = `${this.baseUrl}/subscription/status?user_id=${user.uid}`;
            console.log('[SUB][STATUS] GET:', url);
            const response = await fetch(url, { headers });
            console.log('[SUB][STATUS] HTTP', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('[SUB][STATUS] Result keys:', Object.keys(result || {}));
            if (result.success) return result.data;
            console.error('Failed to get subscription status:', result.error);
            return null;
        } catch (error) {
            console.error('Error getting subscription status:', error);
            return null;
        }
    }
    // Removed localStorage fallback; backend is the source of truth


    /**
     * Check if user can use a specific feature
     */
    async canUseFeature(featureName: string): Promise<FeatureAccess | null> {
        try {
            const user = await this.getCurrentUser();
            if (!user) return null;

            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/feature-access`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: user.uid,
                    feature_name: featureName
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                console.error('Failed to check feature access:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Error checking feature access:', error);
            return null;
        }
    }

    /**
     * Record feature usage
     */
    async recordFeatureUsage(featureName: string, count: number = 1): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            if (!user) return false;

            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/record-usage`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: user.uid,
                    feature_name: featureName,
                    count
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error recording feature usage:', error);
            return false;
        }
    }

    /**
     * Create a trial for a new user
     */
    async createTrial(durationDays: number = 7): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            if (!user) return false;

            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/create-trial`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: user.uid,
                    duration_days: durationDays
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error creating trial:', error);
            return false;
        }
    }

    /**
     * Activate subscription after successful payment
     */
    async activateSubscription(planName: string, paystackData: any): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            if (!user) return false;

            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/activate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: user.uid,
                    plan_name: planName,
                    paystack_data: paystackData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error activating subscription:', error);
            return false;
        }
    }

    /**
     * Get all available subscription plans
     */
    async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/plans`, {
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.plans;
            } else {
                console.error('Failed to get subscription plans:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error getting subscription plans:', error);
            return [];
        }
    }

    /**
     * Verify Paystack payment
     */
    async verifyPayment(reference: string): Promise<any> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseUrl}/subscription/verify-payment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reference })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error verifying payment:', error);
            return { success: false, error: 'Verification failed' };
        }
    }

    /**
     * Get user's usage statistics
     */
    async getUsageStats(): Promise<any[]> {
        try {
            const user = await this.getCurrentUser();
            if (!user) return [];

            const headers = await this.getAuthHeaders();
            const response = await fetch(
                `${this.baseUrl}/subscription/usage-stats?user_id=${user.uid}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.usage_stats;
            } else {
                console.error('Failed to get usage stats:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return [];
        }
    }

    /**
     * Check if user has access to the app
     */
    async hasAppAccess(): Promise<boolean> {
        try {
            const status = await this.getSubscriptionStatus();
            return status?.can_access_app || false;
        } catch (error) {
            console.error('Error checking app access:', error);
            return false;
        }
    }

    /**
     * Get formatted remaining time for subscription or trial
     */
    getFormattedRemainingTime(status: SubscriptionStatus): string {
        if (status.subscription) {
            const remaining_days = status.subscription.remaining_days ?? 0;
            const remaining_hours = status.subscription.remaining_hours ?? 0;
            const remaining_minutes = status.subscription.remaining_minutes ?? 0;

            if (remaining_days > 0) {
                return `${remaining_days}d ${remaining_hours}h remaining`;
            } else if (remaining_hours > 0) {
                return `${remaining_hours}h ${remaining_minutes}m remaining`;
            } else if (remaining_minutes > 0) {
                return `${remaining_minutes}m remaining`;
            } else {
                return 'Expired';
            }
        } else if (status.trial) {
            const freeUsed = status.trial.free_meal_plan_used ?? !status.trial.is_active;
            return freeUsed ? 'Free meal plan used' : '1 free meal plan available';
        }

        return 'No active subscription';
    }

    /**
     * Get plan display name
     */
    getPlanDisplayName(status: SubscriptionStatus): string {
        if (status.subscription) {
            return status.subscription.plan_display_name;
        } else if (status.trial) {
            return 'Free Plan';
        }
        return 'No Plan';
    }

    /**
     * Check if subscription is expired
     */
    isSubscriptionExpired(status: SubscriptionStatus): boolean {
        if (status.subscription) {
            const remaining_days = status.subscription.remaining_days ?? 0;
            const remaining_hours = status.subscription.remaining_hours ?? 0;
            const remaining_minutes = status.subscription.remaining_minutes ?? 0;
            return remaining_days <= 0 && remaining_hours <= 0 && remaining_minutes <= 0;
        }
        return true;
    }

    /**
     * Check if the free meal plan has been used (replaces the old time-based
     * trial-expired check).
     */
    isTrialExpired(status: SubscriptionStatus): boolean {
        if (status.trial) {
            return Boolean(
                status.trial.free_meal_plan_used ?? !status.trial.is_active
            );
        }
        return true;
    }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;



