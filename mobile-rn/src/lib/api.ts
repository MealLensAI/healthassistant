import { APP_CONFIG } from './config';
import { getSync, safeGetItem, safeRemoveItem, safeSetItem, setSync, STORAGE_KEYS } from './storage';

const API_BASE_URL = `${APP_CONFIG.api.base_url}/api`;

export class APIError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export interface APIResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  [k: string]: any;
}

export interface LoginResponse extends APIResponse {
  user_id?: string;
  auth_type?: string;
  session_id?: string;
  session_created_at?: string;
  access_token?: string;
  refresh_token?: string;
  user_data?: { id: string; email: string; metadata?: any };
}

export interface RegisterResponse extends APIResponse {
  user_id?: string;
  email?: string;
}

export interface RefreshTokenResponse extends APIResponse {
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  user_data?: any;
}

export interface SaveSettingsResponse extends APIResponse {
  settings?: Record<string, any>;
  settings_type?: string;
  updated_at?: string;
}

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  timeout?: number;
  suppressAuthRedirect?: boolean;
}

type AuthErrorHandler = () => void;
let authErrorHandler: AuthErrorHandler | null = null;
export function setAuthErrorHandler(handler: AuthErrorHandler | null) {
  authErrorHandler = handler;
}

class APIService {
  private getAuthToken(): string | null {
    return getSync(STORAGE_KEYS.TOKEN);
  }

  private async makeRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      skipAuth = false,
      timeout = 15000,
      suppressAuthRedirect = false,
    } = options;

    if (!skipAuth) {
      const token = this.getAuthToken() || (await safeGetItem(STORAGE_KEYS.TOKEN));
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    if (body && !headers['Content-Type'] && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body) {
      config.body = body instanceof FormData ? body : typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(fullUrl, config);
      if (timer) clearTimeout(timer);

      const contentType = response.headers.get('content-type');
      const data: any = contentType?.includes('application/json') ? await response.json() : await response.text();

      if (!response.ok) {
        if (response.status === 401) {
          if (
            endpoint === '/login' ||
            endpoint === '/register' ||
            endpoint === '/refresh-token' ||
            suppressAuthRedirect
          ) {
            throw new APIError(data?.message || 'Authentication failed', 401, data);
          }

          const refreshToken =
            getSync(STORAGE_KEYS.REFRESH_TOKEN) || (await safeGetItem(STORAGE_KEYS.REFRESH_TOKEN));
          if (refreshToken && refreshToken.length > 10) {
            try {
              const refreshResult = await this.refreshToken();
              if (refreshResult.status === 'success' && refreshResult.access_token) {
                await setSync(STORAGE_KEYS.TOKEN, refreshResult.access_token);
                if (refreshResult.refresh_token) {
                  await setSync(STORAGE_KEYS.REFRESH_TOKEN, refreshResult.refresh_token);
                }
                const retryHeaders: Record<string, string> = { ...headers };
                retryHeaders['Authorization'] = `Bearer ${refreshResult.access_token}`;
                const retryConfig: RequestInit = {
                  method,
                  headers: retryHeaders,
                  signal: controller.signal,
                };
                if (body)
                  retryConfig.body =
                    body instanceof FormData ? body : typeof body === 'string' ? body : JSON.stringify(body);
                const retryResponse = await fetch(fullUrl, retryConfig);
                const retryContentType = retryResponse.headers.get('content-type');
                const retryData = retryContentType?.includes('application/json')
                  ? await retryResponse.json()
                  : await retryResponse.text();
                if (retryResponse.ok) return retryData as T;
              }
            } catch {
              // fall through
            }
          }

          const errorMessage = typeof data === 'string' ? data : data?.message || '';
          const lower = errorMessage.toLowerCase();
          if (
            lower.includes('expired') ||
            lower.includes('invalid token') ||
            lower.includes('authentication failed') ||
            lower.includes('unauthorized')
          ) {
            await safeRemoveItem(STORAGE_KEYS.TOKEN);
            await safeRemoveItem(STORAGE_KEYS.USER);
            await safeRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
            await safeRemoveItem(STORAGE_KEYS.SESSION_ID);
            await safeRemoveItem(STORAGE_KEYS.USER_ID);
            authErrorHandler?.();
          }
          throw new APIError(errorMessage || 'Authentication required. Please try again.', 401, data);
        }

        if (response.status === 403)
          throw new APIError('Access denied. You do not have permission to perform this action.', 403);
        if (response.status === 404) {
          let fallbackMessage = 'The requested information could not be found.';
          if (endpoint.includes('settings-history')) fallbackMessage = 'No settings history available yet.';
          throw new APIError(fallbackMessage, 404, data);
        }
        if (response.status >= 500) {
          let fallbackMessage = 'Server error. Please try again later.';
          if (endpoint.includes('detection_history'))
            fallbackMessage = 'Unable to load detection history. Please try again later.';
          else if (endpoint.includes('meal_plan'))
            fallbackMessage = 'Unable to save/load meal plans. Please try again later.';
          throw new APIError(
            data?.error || data?.message || fallbackMessage,
            response.status,
            data
          );
        }

        const errorMessage =
          data?.error ||
          data?.message ||
          (typeof data === 'string' ? data : `HTTP ${response.status}: ${response.statusText}`);
        throw new APIError(errorMessage, response.status, data);
      }

      return data as T;
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error instanceof APIError) throw error;
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted')) {
          throw new APIError('Request timeout. Please try again.', 0);
        }
        if (error.message.toLowerCase().includes('network')) {
          throw new APIError('Network error. Please check your connection and try again.', 0);
        }
      }
      throw new APIError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Auth
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    return this.post('/login', credentials, { skipAuth: true });
  }
  async register(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    signup_type?: string;
  }): Promise<RegisterResponse> {
    return this.post('/register', userData, { skipAuth: true, timeout: 30000 });
  }
  async requestPasswordReset(email: string): Promise<APIResponse> {
    return this.post('/forgot-password', { email }, { skipAuth: true });
  }
  async resetPassword(payload: { access_token: string; new_password: string }): Promise<APIResponse> {
    return this.post('/reset-password', payload, { skipAuth: true });
  }
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken =
      getSync(STORAGE_KEYS.REFRESH_TOKEN) || (await safeGetItem(STORAGE_KEYS.REFRESH_TOKEN));
    if (!refreshToken) throw new APIError('No refresh token available', 401);
    return this.post<RefreshTokenResponse>(
      '/refresh-token',
      { refresh_token: refreshToken },
      { skipAuth: true }
    );
  }
  async logout(): Promise<APIResponse> {
    try {
      return await this.post('/logout', {}, { suppressAuthRedirect: true });
    } catch {
      return { status: 'success' };
    }
  }

  // Profile
  async getUserProfile(): Promise<APIResponse> {
    return this.get('/profile');
  }

  // Settings
  async saveUserSettings(settingsType: string, settingsData: any): Promise<SaveSettingsResponse> {
    return this.post('/settings', { settings_type: settingsType, settings_data: settingsData });
  }
  async getUserSettings(settingsType: string = 'health_profile'): Promise<APIResponse> {
    return this.get(`/settings?settings_type=${settingsType}`, { timeout: 30000 });
  }
  async getUserSettingsHistory(settingsType: string = 'health_profile', limit: number = 50): Promise<APIResponse> {
    return this.get(`/settings/history?settings_type=${settingsType}&limit=${limit}`, { timeout: 30000 });
  }
  async deleteUserSettings(settingsType: string): Promise<APIResponse> {
    return this.delete(`/settings?settings_type=${settingsType}`);
  }

  // Meal plans
  async getMealPlans(): Promise<APIResponse> {
    return this.get('/meal_plan', { timeout: 30000 });
  }
  async saveMealPlan(planData: any): Promise<APIResponse> {
    return this.post('/meal_plans', { plan_data: planData, created_at: new Date().toISOString() });
  }
  async updateMealPlan(id: string, planData: any): Promise<APIResponse> {
    return this.put(`/meal_plans/${id}`, planData);
  }
  async deleteMealPlan(id: string): Promise<APIResponse> {
    return this.delete(`/meal_plans/${id}`);
  }
  async clearMealPlans(): Promise<APIResponse> {
    return this.delete('/meal_plans/clear');
  }

  // History
  async getDetectionHistory(): Promise<APIResponse> {
    return this.get('/health_history', { timeout: 30000 });
  }
  async getDetectionHistoryById(id: string): Promise<APIResponse> {
    return this.get(`/health_history/${id}`, { timeout: 30000 });
  }
  async saveDetectionHistory(detectionData: any): Promise<APIResponse> {
    return this.post('/health_history', detectionData);
  }
  async deleteDetectionHistory(id: string): Promise<APIResponse> {
    return this.delete(`/health_history/${id}`);
  }

  // Feedback
  async saveFeedback(feedbackText: string): Promise<APIResponse> {
    return this.post('/feedback', { feedback_text: feedbackText });
  }

  // Notifications
  async getNotifications(): Promise<
    APIResponse<{ notifications: InAppNotification[]; unread_count: number }>
  > {
    return this.get('/notifications');
  }
  async markAllNotificationsRead(): Promise<APIResponse> {
    return this.post('/notifications/read-all', {});
  }

  // AI services (use the AI backend)
  async aiRequest<T = any>(path: string, payload: any, timeout = 60000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${APP_CONFIG.api.ai_api_url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ct = res.headers.get('content-type');
      const data = ct?.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        throw new APIError(
          (data as any)?.error || (data as any)?.message || `AI error ${res.status}`,
          res.status,
          data
        );
      }
      return data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof APIError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new APIError('AI request timed out.', 0);
      }
      throw err;
    }
  }

  async aiGetFoodImage(query: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${APP_CONFIG.api.image_search_url}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data?.image_url && !data?.error) return data.image_url as string;
      return null;
    } catch {
      return null;
    }
  }
}

export const api = new APIService();
