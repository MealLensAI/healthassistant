import { useAuth, safeGetItem, safeRemoveItem, safeSetItem } from './utils'
import { APP_CONFIG } from '@/lib/config'

// API base URL
// In development: uses Vite proxy (empty string = relative URL = uses proxy)
// In production: uses VITE_API_URL env variable
// If VITE_API_URL is not set, defaults to empty string which uses Vite proxy to localhost:5001
const API_BASE_URL = APP_CONFIG.api.base_url 
  ? `${APP_CONFIG.api.base_url}/api` 
  : '/api'  // Use relative URL to leverage Vite proxy

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Response wrapper type
export interface APIResponse<T = any> {
  status: 'success' | 'error'
  message?: string
  data?: T
}

// Refresh token response type
export interface RefreshTokenResponse extends APIResponse {
  access_token?: string
  refresh_token?: string
  user_id?: string
  user_data?: any
}

// Auth response shapes from backend
export interface LoginResponse {
  status: 'success' | 'error'
  message?: string
  user_id?: string
  auth_type?: string
  session_id?: string
  session_created_at?: string
  access_token?: string
  refresh_token?: string
  user_data?: { id: string; email: string; metadata?: any }
}

export interface RegisterResponse {
  status: 'success' | 'error'
  message?: string
  user_id?: string
  email?: string
}

export interface SaveSettingsResponse extends APIResponse {
  settings?: Record<string, any>
  settings_type?: string
  updated_at?: string
}

// Request options type
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  skipAuth?: boolean
  timeout?: number
  suppressAuthRedirect?: boolean
}

// Centralized API service
class APIService {
  private getAuthToken(): string | null {
    return safeGetItem('access_token')
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      skipAuth = false,
      timeout = 10000,
      suppressAuthRedirect = false
    } = options

    // Add auth header if token is present; otherwise rely on cookie-based auth
    if (!skipAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // Add default headers
    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    // Prepare request config with cross-browser timeout support
    // AbortSignal.timeout is not supported in some browsers (older Safari/Firefox),
    // so we use AbortController and manually abort after the timeout duration.
    const controller = new AbortController()
    let timeoutId: number | null = null

    if (timeout && typeof window !== 'undefined') {
      try {
        timeoutId = window.setTimeout(() => controller.abort(), timeout)
      } catch {
        // no-op if setTimeout is unavailable (very rare)
      }
    }

    const config: RequestInit = {
      method,
      headers,
      signal: controller.signal
    }
      // Always include credentials to support cookie-based auth
      ; (config as any).credentials = 'include'

    // Add body if present
    if (body) {
      config.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`

      const response = await fetch(fullUrl, config)

      // Clear pending timeout on successful response arrival
      if (timeoutId) {
        try { clearTimeout(timeoutId) } catch { /* ignore */ }
      }

      // Handle different response types
      const contentType = response.headers.get('content-type')
      let data: any

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

        // Handle HTTP errors
      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          // Don't automatically redirect for login/register requests - let them handle their own errors
          if (endpoint === '/login' || endpoint === '/register' || suppressAuthRedirect || endpoint === '/refresh-token') {
            // For login/register/refresh-token, just throw the error with the backend message
            const errorMessage = data?.message || 'Authentication failed'
            throw new APIError(errorMessage, 401, data)
          }

          // Try to refresh token before clearing session
          const refreshToken = safeGetItem('supabase_refresh_token')
          if (refreshToken && refreshToken.length > 10) {
            try {
              console.log('🔄 Attempting token refresh after 401...')
              const refreshResult = await this.refreshToken() as RefreshTokenResponse
              
              if (refreshResult.status === 'success' && refreshResult.access_token) {
                console.log('✅ Token refreshed successfully')
                // Update stored token
                safeSetItem('access_token', refreshResult.access_token)
                if (refreshResult.refresh_token) {
                  safeSetItem('supabase_refresh_token', refreshResult.refresh_token)
                }
                
                // Retry the original request with new token
                const retryHeaders = { ...headers }
                retryHeaders['Authorization'] = `Bearer ${refreshResult.access_token}`
                
                const retryConfig: RequestInit = {
                  method,
                  headers: retryHeaders,
                  signal: controller.signal
                }
                ;(retryConfig as any).credentials = 'include'
                
                if (body) {
                  retryConfig.body = typeof body === 'string' ? body : JSON.stringify(body)
                }
                
                const retryResponse = await fetch(fullUrl, retryConfig)
                const retryContentType = retryResponse.headers.get('content-type')
                const retryData = retryContentType?.includes('application/json') 
                  ? await retryResponse.json() 
                  : await retryResponse.text()
                
                if (retryResponse.ok) {
                  return retryData
                }
                // If retry also fails, fall through to error handling
              }
            } catch (refreshError) {
              console.warn('⚠️ Token refresh failed:', refreshError)
              // Fall through to logout logic
            }
          }

          // Use the already-read data variable - don't try to read response body again
          const errorMessage = typeof data === 'string' ? data : (data?.message || '')
          const errorMessageLower = errorMessage.toLowerCase()
          
          // Only logout on explicit auth failures, not on temporary network issues
          // Be more conservative - only logout if error message explicitly indicates auth failure
          if (errorMessageLower.includes('expired') || 
              errorMessageLower.includes('invalid token') ||
              errorMessageLower.includes('authentication failed') ||
              errorMessageLower.includes('unauthorized')) {
            // Real auth failure - clear session only after refresh attempt failed
            console.warn('⚠️ Authentication failed, clearing session')
            safeRemoveItem('access_token')
            safeRemoveItem('user_data')
            safeRemoveItem('supabase_refresh_token')
            safeRemoveItem('supabase_session_id')
            safeRemoveItem('supabase_user_id')
            setTimeout(() => window.location.replace('/landing'), 200)
          }
          // Throw error but don't logout for other 401s (might be temporary network issues)
          throw new APIError(errorMessage || 'Authentication required. Please try again.', 401, data)
        }

        // Handle 403 Forbidden
        if (response.status === 403) {
          throw new APIError('Access denied. You do not have permission to perform this action.', 403)
        }

        // Handle 500 Server Errors - DON'T logout for server errors!
        if (response.status === 500) {
          const errorMessage = data?.error || data?.message || 'Server error. Please try again later.'
          console.error('❌ Server error (500):', errorMessage)
          throw new APIError(errorMessage, 500, data)
        }

        // Handle 404 Not Found
        if (response.status === 404) {
          // Provide user-friendly messages based on endpoint
          let fallbackMessage = 'The requested information could not be found.'
          if (endpoint.includes('enterprise')) {
            fallbackMessage = 'Organization not found. Please select a valid organization.'
          } else if (endpoint.includes('settings-history')) {
            fallbackMessage = 'No settings history available yet.'
          } else if (endpoint.includes('time-restrictions')) {
            fallbackMessage = 'Time restrictions settings not found.'
          }
          throw new APIError(fallbackMessage, 404, data)
        }

        // Handle 500+ server errors with better fallback messages
        if (response.status >= 500) {
          console.error(`Server error ${response.status}:`, data)

          // Provide user-friendly fallback messages based on endpoint
          let fallbackMessage = 'Server error. Please try again later.'
          if (endpoint.includes('detection_history')) {
            fallbackMessage = 'Unable to load detection history. Please try again later.'
          } else if (endpoint.includes('meal_plan')) {
            fallbackMessage = 'Unable to save/load meal plans. Please try again later.'
          } else if (endpoint.includes('feedback')) {
            fallbackMessage = 'Unable to save feedback. Please try again later.'
          }

          throw new APIError(fallbackMessage, response.status, data)
        }

        // Handle other client errors
        const errorMessage = data?.message || data || `HTTP ${response.status}: ${response.statusText}`
        throw new APIError(errorMessage, response.status, data)
      }

      return data
    } catch (error) {
      // Clear pending timeout in error path as well
      // (AbortController may trigger an exception before response object exists)
      try {
        // @ts-ignore - timeoutId may be null
        if (timeoutId) clearTimeout(timeoutId)
      } catch { /* ignore */ }
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error. Please check your connection and try again.', 0)
      }

      // Handle timeout errors
      // Different browsers surface abort/timeout differently. Treat AbortError as timeout.
      if (
        (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) ||
        // Some environments surface aborts as generic Errors
        (error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted')))
      ) {
        throw new APIError('Request timeout. Please try again.', 0)
      }

      // Re-throw API errors
      if (error instanceof APIError) {
        throw error
      }

      // Handle other errors
      throw new APIError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0)
    }
  }

  // Generic request methods
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  // Auth-specific methods
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    return this.post('/login', credentials, { skipAuth: true })
  }

  async register(userData: { email: string; password: string; first_name?: string; last_name?: string; name?: string; signup_type?: string }): Promise<RegisterResponse> {
    return this.post('/register', userData, { skipAuth: true, timeout: 30000 })
  }

  async requestPasswordReset(email: string): Promise<APIResponse> {
    return this.post('/forgot-password', { email }, { skipAuth: true })
  }

  async resetPassword(payload: { access_token: string; new_password: string }): Promise<APIResponse> {
    return this.post('/reset-password', payload, { skipAuth: true })
  }

  // Meal plan methods
  async getMealPlans(): Promise<APIResponse> {
    return this.get('/meal_plan', { timeout: 30000 })
  }

  async saveMealPlan(planData: any): Promise<APIResponse> {
    return this.post('/meal_plans', { plan_data: planData, created_at: new Date().toISOString() })
  }

  async updateMealPlan(id: string, planData: any): Promise<APIResponse> {
    return this.put(`/meal_plans/${id}`, planData)
  }

  async deleteMealPlan(id: string): Promise<APIResponse> {
    return this.delete(`/meal_plans/${id}`)
  }

  async clearMealPlans(): Promise<APIResponse> {
    return this.delete('/meal_plans/clear')
  }

  // Health history methods (for health meals and meal plans)
  async getDetectionHistory(): Promise<APIResponse> {
    return this.get('/health_history', { timeout: 30000 })
  }

  async getDetectionHistoryById(id: string): Promise<APIResponse> {
    return this.get(`/health_history/${id}`, { timeout: 30000 })
  }

  async saveDetectionHistory(detectionData: any): Promise<APIResponse> {
    // For health meals, we can still save to the same endpoint via meal plan routes if needed
    // This is kept for backward compatibility with health meal generation
    return this.post('/health_history', detectionData)
  }

  async deleteDetectionHistory(id: string): Promise<APIResponse> {
    return this.delete(`/health_history/${id}`)
  }

  // Feedback methods
  async saveFeedback(feedbackText: string): Promise<APIResponse> {
    return this.post('/feedback', { feedback_text: feedbackText })
  }

  // Token refresh method
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = safeGetItem('supabase_refresh_token')
    if (!refreshToken) {
      throw new APIError('No refresh token available', 401)
    }
    return this.post<RefreshTokenResponse>('/refresh-token', { refresh_token: refreshToken }, { skipAuth: true })
  }

  // Profile methods
  async getUserProfile(): Promise<APIResponse> {
    return this.get('/profile')
  }

  // User Settings methods
  async saveUserSettings(settingsType: string, settingsData: any): Promise<SaveSettingsResponse> {
    return this.post('/settings', {
      settings_type: settingsType,
      settings_data: settingsData
    })
  }

  async getUserSettings(settingsType: string = 'health_profile'): Promise<APIResponse> {
    return this.get(`/settings?settings_type=${settingsType}`, { timeout: 30000 })
  }

  async deleteUserSettings(settingsType: string): Promise<APIResponse> {
    return this.delete(`/settings?settings_type=${settingsType}`)
  }

  async getUserSettingsHistory(settingsType: string = 'health_profile', limit: number = 50): Promise<APIResponse> {
    return this.get(`/settings/history?settings_type=${settingsType}&limit=${limit}`)
  }

  async deleteSettingsHistory(recordId: string): Promise<APIResponse> {
    return this.delete(`/settings/history/${recordId}`)
  }

  // Enterprise/Organization methods
  async canCreateOrganization(): Promise<APIResponse> {
    return this.get('/enterprise/can-create')
  }

  async getMyEnterprises(): Promise<APIResponse> {
    return this.get('/enterprise/my-enterprises')
  }

  async registerEnterprise(data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    organization_type: string;
  }): Promise<APIResponse> {
    return this.post('/enterprise/register', data)
  }

  async getEnterpriseDetails(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}`)
  }

  async getEnterpriseUsers(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/users`)
  }

  async getEnterpriseInvitations(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/invitations`)
  }

  async getEnterpriseStatistics(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/statistics`)
  }

  async getEnterpriseUserSettings(enterpriseId: string, userId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/user/${userId}/settings`)
  }

  async updateEnterpriseUserSettings(enterpriseId: string, userId: string, settingsData: any): Promise<APIResponse> {
    return this.put(`/enterprise/${enterpriseId}/user/${userId}/settings`, { settings_data: settingsData, settings_type: 'health_profile' })
  }

  async deleteEnterpriseUserSettings(enterpriseId: string, userId: string): Promise<APIResponse> {
    return this.delete(`/enterprise/${enterpriseId}/user/${userId}/settings?settings_type=health_profile`)
  }

  async testEmail(email: string): Promise<APIResponse> {
    return this.post('/test-email', { email })
  }

  async inviteUserToEnterprise(enterpriseId: string, data: {
    email: string;
    role: string;
    message?: string;
  }): Promise<APIResponse> {
    return this.post(`/enterprise/${enterpriseId}/invite`, data, { timeout: 30000 })
  }

  async createEnterpriseUser(data: {
    enterprise_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<APIResponse> {
    return this.post('/enterprise/create-user', data)
  }

  async deleteEnterpriseUser(userRelationId: string): Promise<APIResponse> {
    return this.delete(`/enterprise/user/${userRelationId}`)
  }

  async cancelInvitation(invitationId: string): Promise<APIResponse> {
    return this.post(`/enterprise/invitation/${invitationId}/cancel`, {})
  }

  async verifyInvitation(token: string): Promise<APIResponse> {
    return this.get(`/enterprise/invitation/verify/${token}`, { skipAuth: true })
  }

  async acceptInvitation(token: string): Promise<APIResponse> {
    return this.post('/enterprise/invitation/accept', { token }, { suppressAuthRedirect: true })
  }

  async completeInvitation(invitationId: string): Promise<APIResponse> {
    return this.post('/enterprise/invitation/complete', { invitation_id: invitationId })
  }

  async getEnterpriseSettingsHistory(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/settings-history`)
  }

  async getEnterpriseTimeRestrictions(enterpriseId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/time-restrictions`)
  }

  async updateEnterpriseTimeRestrictions(enterpriseId: string, data: any): Promise<APIResponse> {
    return this.put(`/enterprise/${enterpriseId}/time-restrictions`, data)
  }

  // Enterprise Admin Meal Plan Management
  async getUserMealPlans(enterpriseId: string, userId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/user/${userId}/meal-plans`)
  }

  async createUserMealPlan(enterpriseId: string, userId: string, planData: any): Promise<APIResponse> {
    return this.post(`/enterprise/${enterpriseId}/user/${userId}/meal-plans`, planData)
  }

  async updateUserMealPlan(enterpriseId: string, planId: string, planData: any): Promise<APIResponse> {
    return this.put(`/enterprise/${enterpriseId}/meal-plan/${planId}`, planData)
  }

  async deleteUserMealPlan(enterpriseId: string, planId: string): Promise<APIResponse> {
    return this.delete(`/enterprise/${enterpriseId}/meal-plan/${planId}`)
  }

  async approveMealPlan(enterpriseId: string, planId: string): Promise<APIResponse> {
    return this.post(`/enterprise/${enterpriseId}/meal-plan/${planId}/approve`, {})
  }

  async rejectMealPlan(enterpriseId: string, planId: string, reason?: string): Promise<APIResponse> {
    return this.post(`/enterprise/${enterpriseId}/meal-plan/${planId}/reject`, { reason })
  }

  // Enterprise Admin Detection History
  async getUserDetectionHistory(enterpriseId: string, userId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/user/${userId}/detection-history`)
  }

  async getUserHealthHistory(enterpriseId: string, userId: string): Promise<APIResponse> {
    return this.get(`/enterprise/${enterpriseId}/user/${userId}/health-history`)
  }
}

// Create singleton instance
export const api = new APIService()

// Hook for using API with auth context
export const useAPI = () => {
  const { token, isAuthenticated } = useAuth()

  return {
    api,
    isAuthenticated,
    hasToken: !!token
  }
} 