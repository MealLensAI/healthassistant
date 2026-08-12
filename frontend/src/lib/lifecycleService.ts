import { APP_CONFIG } from '@/lib/config';
import { safeGetItem } from '@/lib/utils';

export interface UserLifecycleInfo {
    user_state: 'new' | 'trial_used' | 'paid' | 'expired';
    has_active_trial: boolean;
    has_active_subscription: boolean;
    can_access_app: boolean;
    trial_info: {
        id: string;
        start_date: string;
        end_date: string;
        is_used: boolean;
        remaining_time: number;
    } | null;
    subscription_info: {
        id: string;
        plan_id: string;
        start_date: string;
        end_date: string;
        remaining_time: number;
    } | null;
    message: string;
}

export interface UserStateDisplay {
    user_state: 'new' | 'trial_used' | 'paid' | 'expired';
    display_message: string;
    show_trial_timer: boolean;
    show_subscription_timer: boolean;
    show_payment_prompt: boolean;
    can_access_app: boolean;
}

export class LifecycleService {
    private static API_BASE_URL = `${APP_CONFIG.api.base_url}/api/lifecycle`;

    private static async resolveUserIdFromBackend(): Promise<string | null> {
        try {
            const res = await fetch(`${APP_CONFIG.api.base_url}/api/profile`, {
                method: 'GET',
                credentials: 'include'
            })
            if (!res.ok) {
                console.log('❌ Could not resolve user id from backend /profile. Status:', res.status)
                return null
            }
            const data = await res.json()
            const id = data?.profile?.id || null
            console.log('✅ Resolved user_id from backend profile:', id)
            return id
        } catch (e) {
            console.error('Error resolving user id from backend:', e)
            return null
        }
    }

    private static getCurrentUserId(): string {
        try {
            const raw = safeGetItem('user_data');
            if (!raw) {
                console.log('🔍 No user_data in localStorage');
                // Fallback: try to decode JWT from stored access token
                try {
                    const token = safeGetItem('access_token');
                    if (token) {
                        const parts = token.split('.')
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]))
                            const sub = payload?.sub
                            if (typeof sub === 'string' && sub.length > 0) {
                                console.log('✅ Derived user_id from access_token.sub:', sub)
                                return sub
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to derive user_id from access_token:', e)
                }
                return 'anon';
            }
            const user = JSON.parse(raw);

            // Prioritize UUID format IDs (backend expects UUIDs)
            const userId = user?.uid || user?.id || user?.email || 'anon';

            // Check if it's a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValidUuid = uuidRegex.test(userId);

            console.log('🔍 getCurrentUserId result:', {
                raw,
                user,
                userId,
                isValidUuid,
                uid: user?.uid,
                id: user?.id,
                email: user?.email
            });

            if (!isValidUuid && userId !== 'anon') {
                console.warn('⚠️ User ID is not in UUID format, this may cause backend errors:', userId);
            }

            return userId;
        } catch (error) {
            console.error('🔍 Error parsing user_data:', error);
            return 'anon';
        }
    }

    private static getAuthHeaders(includeJsonContentType = true): Record<string, string> {
        const token = safeGetItem('supabase_token') || safeGetItem('access_token');
        return {
            ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    /**
     * Get user's lifecycle status from backend
     */
    static async getUserLifecycleStatus(): Promise<{ success: boolean; data?: UserLifecycleInfo; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot fetch lifecycle status from backend');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Fetching lifecycle status from backend...');
            console.log('🔍 Request URL:', `${this.API_BASE_URL}/status`);
            const response = await fetch(`${this.API_BASE_URL}/status`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                credentials: 'include'
            });

            console.log('🔍 Backend response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend lifecycle response:', result);

                if (result.success && result.data) {
                    console.log('✅ Lifecycle status retrieved successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend lifecycle fetch failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error fetching lifecycle status from backend:', error);
        }

        return { success: false, error: 'Failed to fetch lifecycle status' };
    }

    /**
     * Get user state display information for UI
     */
    static async getUserStateDisplay(): Promise<{ success: boolean; data?: UserStateDisplay; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot fetch user state display from backend');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Fetching user state display from backend...');
            const response = await fetch(`${this.API_BASE_URL}/user-state-display`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend user state display response:', result);

                if (result.success && result.data) {
                    console.log('✅ User state display retrieved successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend user state display fetch failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error fetching user state display from backend:', error);
        }

        return { success: false, error: 'Failed to fetch user state display' };
    }

    /**
     * Initialize trial for new user
     */
    static async initializeTrial(durationHours: number = 48, testMode: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot initialize trial');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Initializing trial from backend...');
            const response = await fetch(`${this.API_BASE_URL}/initialize-trial`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    duration_hours: durationHours,
                    test_mode: testMode
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend trial initialization response:', result);

                if (result.success) {
                    console.log('✅ Trial initialized successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend trial initialization failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error initializing trial from backend:', error);
        }

        return { success: false, error: 'Failed to initialize trial' };
    }

    /**
     * Mark trial as used
     */
    static async markTrialUsed(): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot mark trial as used');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Marking trial as used from backend...');
            // Always send a JSON body — Content-Type: application/json with an
            // empty body can make Flask/Werkzeug return HTML 400 Bad Request.
            const response = await fetch(`${this.API_BASE_URL}/mark-trial-used`, {
                method: 'POST',
                headers: this.getAuthHeaders(true),
                credentials: 'include',
                body: JSON.stringify({}),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend mark trial used response:', result);

                if (result.success) {
                    console.log('✅ Trial marked as used successfully');
                    return { success: true, data: result.data };
                }
            } else {
                const errText = await response.text().catch(() => '');
                console.log('❌ Backend mark trial used failed:', response.status, errText);
            }
        } catch (error) {
            console.error('❌ Error marking trial as used from backend:', error);
        }

        return { success: false, error: 'Failed to mark trial as used' };
    }

    /**
     * Activate subscription
     */
    static async activateSubscription(durationDays: number, paystackData: any = {}, testMode: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot activate subscription');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Activating subscription from backend...');
            const response = await fetch(`${this.API_BASE_URL}/activate-subscription`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    duration_days: durationDays,
                    paystack_data: paystackData,
                    test_mode: testMode
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend subscription activation response:', result);

                if (result.success) {
                    console.log('✅ Subscription activated successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend subscription activation failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error activating subscription from backend:', error);
        }

        return { success: false, error: 'Failed to activate subscription' };
    }

    /**
     * Mark subscription as expired
     */
    static async markSubscriptionExpired(): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot mark subscription as expired');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Marking subscription as expired from backend...');
            const response = await fetch(`${this.API_BASE_URL}/mark-subscription-expired`, {
                method: 'POST',
                headers: this.getAuthHeaders(true),
                credentials: 'include',
                body: JSON.stringify({}),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend mark subscription expired response:', result);

                if (result.success) {
                    console.log('✅ Subscription marked as expired successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend mark subscription expired failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error marking subscription as expired from backend:', error);
        }

        return { success: false, error: 'Failed to mark subscription as expired' };
    }

    /**
     * Set test mode (1-minute durations)
     */
    static async setTestMode(testMode: boolean = true): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            let userId = this.getCurrentUserId();
            if (userId === 'anon') {
                console.log('🔍 No user ID found, attempting to resolve from backend /profile...');
                const resolved = await this.resolveUserIdFromBackend();
                if (resolved) {
                    userId = resolved;
                } else {
                    console.log('🔍 No user ID found, cannot set test mode');
                    return { success: false, error: 'No user ID found' };
                }
            }

            console.log('🔄 Setting test mode from backend...');
            const response = await fetch(`${this.API_BASE_URL}/set-test-mode`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    test_mode: testMode
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend set test mode response:', result);

                if (result.success) {
                    console.log('✅ Test mode set successfully');
                    return { success: true, data: result.data };
                }
            } else {
                console.log('❌ Backend set test mode failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error setting test mode from backend:', error);
        }

        return { success: false, error: 'Failed to set test mode' };
    }

    /**
     * Check if user can access the app
     */
    static async canAccessApp(): Promise<boolean> {
        const lifecycleStatus = await this.getUserLifecycleStatus();
        if (lifecycleStatus.success && lifecycleStatus.data) {
            return lifecycleStatus.data.can_access_app;
        }
        return false;
    }

    /**
     * Get formatted remaining time
     */
    static formatRemainingTime(ms: number): string {
        if (ms <= 0) return 'Expired';
        const minutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h remaining`;
        if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
        return `${Math.max(1, minutes)}m remaining`;
    }

    /**
     * Get progress percentage
     */
    static getProgressPercentage(lifecycleInfo: UserLifecycleInfo): number {
        if (lifecycleInfo.trial_info && lifecycleInfo.user_state === 'new') {
            const totalTime = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
            const remainingTime = lifecycleInfo.trial_info.remaining_time;
            const elapsedTime = totalTime - remainingTime;
            return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
        }

        if (lifecycleInfo.subscription_info && lifecycleInfo.user_state === 'paid') {
            // For subscription, we'd need to know the total duration
            // For now, return a basic calculation
            const remainingTime = lifecycleInfo.subscription_info.remaining_time;
            const totalTime = 7 * 24 * 60 * 60 * 1000; // Assume 7 days for now
            const elapsedTime = totalTime - remainingTime;
            return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
        }

        return 100; // Expired
    }
}
