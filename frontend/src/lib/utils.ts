import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  refreshAuth: (skipVerification?: boolean) => Promise<void>
  signOut: () => Promise<void>
  clearSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token storage keys
const TOKEN_KEY = "access_token"
const USER_KEY = "user_data"

// Safe storage helpers (handle private mode / blocked storage)
const memoryStore = new Map<string, string>()

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const val = window.localStorage.getItem(key)
      if (val !== null) return val
      // If localStorage is accessible but empty for this key, fall back to memory
      return memoryStore.has(key) ? memoryStore.get(key)! : null
    }
  } catch {
    // localStorage not available or blocked
  }
  return memoryStore.has(key) ? memoryStore.get(key)! : null
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.setItem(key, value)
      // Verify it was actually stored
      if (window.localStorage.getItem(key) === value) {
        return
      }
    }
  } catch {
    // fall through to memory
  }
  memoryStore.set(key, value)
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key)
}

// Pure TypeScript AuthProvider (no JSX)
export function useProvideAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const lifecycleRef = useRef({
    initialized: false,
    isRefreshing: false
  })

  // Smooth page transition overlay to avoid route flash
  const showFadeTransition = useCallback(() => {
    try {
      const existing = document.getElementById('page-transition-overlay')
      if (existing) return
      const overlay = document.createElement('div')
      overlay.id = 'page-transition-overlay'
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.background = '#ffffff'
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 150ms ease'
      overlay.style.zIndex = '9999'
      overlay.style.display = 'flex'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'center'

      // Center content container
      const container = document.createElement('div')
      container.style.display = 'flex'
      container.style.flexDirection = 'column'
      container.style.alignItems = 'center'
      container.style.gap = '12px'

      // Spinner element
      const spinner = document.createElement('div')
      spinner.style.width = '44px'
      spinner.style.height = '44px'
      spinner.style.border = '4px solid rgba(0,0,0,0.08)'
      spinner.style.borderTop = '4px solid #3b82f6' // blue-500
      spinner.style.borderRadius = '50%'
      // Use Web Animations API for rotation
      try {
        spinner.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 800, iterations: Infinity })
      } catch { }

      // Label
      const label = document.createElement('div')
      label.textContent = 'Loading...'
      label.style.fontSize = '14px'
      label.style.color = '#4b5563' // gray-600
      label.style.fontWeight = '600'

      container.appendChild(spinner)
      container.appendChild(label)
      overlay.appendChild(container)
      document.body.appendChild(overlay)

      // Ensure transition applies
      requestAnimationFrame(() => {
        overlay.style.opacity = '1'
      })
    } catch (err) {
      // no-op if DOM not available
    }
  }, [])

  // Clear session data
  const clearSession = useCallback(() => {
    safeRemoveItem(TOKEN_KEY)
    safeRemoveItem(USER_KEY)
    safeRemoveItem('supabase_refresh_token')
    safeRemoveItem('supabase_session_id')
    safeRemoveItem('supabase_user_id')
    // Also clear subscription/trial caches to avoid stale gating after logout
    safeRemoveItem('meallensai_user_access_status')
    safeRemoveItem('meallensai_trial_start')
    safeRemoveItem('meallensai_subscription_status')
    safeRemoveItem('meallensai_subscription_expires_at')
    setUser(null)
    setToken(null)
  }, [])

  // Sign out function - Supabase doesn't need explicit sign out call
  const signOut = useCallback(async () => {
    try {
      // Show fade overlay first to prevent flashes while redirecting
      showFadeTransition()
      // Ask backend to clear httpOnly cookie if present
      try {
        const { APP_CONFIG } = await import('./config')
        await fetch(`${APP_CONFIG.api.base_url}/api/logout`, { method: 'POST', credentials: 'include' })
      } catch { }
      // Clear all session data
      clearSession()
      // Use window.location.replace to avoid flash
      setTimeout(() => window.location.replace('/landing'), 200)
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, clear session and redirect
      try { showFadeTransition() } catch { }
      clearSession()
      setTimeout(() => window.location.replace('/landing'), 200)
    }
  }, [clearSession, showFadeTransition])

  // Refresh authentication state
  const refreshAuth = useCallback(async (skipVerification = false) => {
    if (lifecycleRef.current.isRefreshing) {
      console.log('⏸️ refreshAuth already in progress, skipping')
      return
    }

    lifecycleRef.current.isRefreshing = true
    setLoading(true)

    try {
      const storedToken = safeGetItem(TOKEN_KEY)
      const storedUserData = safeGetItem(USER_KEY)

      if (storedToken && storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData)

          if (!storedToken || storedToken.length < 10) {
            console.warn('⚠️ Invalid token format, clearing session')
            clearSession()
            return
          }

          if (!parsedUser || !parsedUser.uid || !parsedUser.email) {
            console.warn('⚠️ Invalid user data, clearing session')
            clearSession()
            return
          }

          setToken(() => storedToken)
          setUser(() => parsedUser as User)

          // Only verify token if not skipping verification and we have valid stored data
          // Use storedToken and parsedUser instead of stale closure values (token, user)
          if (!skipVerification && storedToken && parsedUser) {
            try {
              const { api } = await import('./api')
              const profileResult = await api.getUserProfile()

              if (profileResult.status !== 'success') {
                console.warn('⚠️ Token verification returned non-success, but keeping session')
              }
            } catch (verifyError: any) {
              // Check if user account was deleted (reuse existing error handling pattern)
              const errorMessage = (verifyError?.message || '').toLowerCase()
              const errorType = verifyError?.data?.error_type || verifyError?.error_type || ''
              const isDeleted = errorType === 'account_deleted' ||
                               errorMessage.includes('deleted') || 
                               errorMessage.includes('account has been deleted') ||
                               (verifyError?.status === 404 && (errorMessage.includes('user') || errorMessage.includes('account')))
              
              if (isDeleted) {
                // User account was deleted - show deletion message and clear session (reuse existing signOut pattern)
                console.warn('⚠️ User account has been deleted')
                clearSession()
                // Show deletion message modal (reuse existing fade transition pattern)
                showFadeTransition()
                try {
                  const deletionMessage = document.createElement('div')
                  deletionMessage.id = 'account-deletion-message'
                  deletionMessage.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;'
                  deletionMessage.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                      <h2 style="margin: 0 0 1rem 0; color: #dc2626; font-size: 1.5rem; font-weight: 600;">Account Deleted</h2>
                      <p style="margin: 0 0 1.5rem 0; color: #4b5563; line-height: 1.6;">Your account has been deleted by your organization administrator. Please contact your provider for assistance.</p>
                      <button onclick="window.location.href='/landing'" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%;">Return to Home</button>
                    </div>
                  `
                  document.body.appendChild(deletionMessage)
                  return
                } catch {
                  // If DOM manipulation fails, just redirect (reuse existing pattern)
                  setTimeout(() => window.location.replace('/landing'), 200)
                  return
                }
              }
              
              // Only clear session if it's a real 401 auth failure, not network errors
              const is401 = verifyError?.status === 401 || verifyError?.response?.status === 401
              const isAuthFailure = is401 && (
                errorMessage.includes('expired') ||
                errorMessage.includes('invalid token') ||
                errorMessage.includes('authentication failed')
              )
              
              if (isAuthFailure) {
                // Try to refresh token before clearing session
                const refreshToken = safeGetItem('supabase_refresh_token')
                if (refreshToken && refreshToken.length > 10) {
                  try {
                    const { api } = await import('./api')
                    const refreshResult: any = await api.refreshToken()
                    
                    if (refreshResult.status === 'success' && refreshResult.access_token) {
                      safeSetItem('access_token', refreshResult.access_token)
                      if (refreshResult.refresh_token) {
                        safeSetItem('supabase_refresh_token', refreshResult.refresh_token)
                      }
                      // Update state with new token
                      setToken(() => refreshResult.access_token)
                      return
                    }
                  } catch (refreshError) {
                    console.warn('⚠️ Token refresh failed in refreshAuth:', refreshError)
                  }
                }
                
                // Only clear if refresh also failed
                console.warn('⚠️ Token expired/invalid and refresh failed, clearing session')
                clearSession()
                return
              } else {
                // Network errors or other issues - keep session
                console.warn('⚠️ Token verification failed (non-auth error), keeping session:', verifyError?.message)
              }
            }
          }

          try {
            await import('./trialService')
            safeRemoveItem('meallensai_user_access_status')
          } catch (error) {
            // non-critical
          }

          return
        } catch (error) {
          console.error('❌ Error parsing stored user data:', error)
          clearSession()
          return
        }
      }

      clearSession()
    } catch (error) {
      console.error('❌ Error in refreshAuth:', error)
    } finally {
      lifecycleRef.current.isRefreshing = false
      setLoading(false)
    }
  }, [clearSession])

  // Initialize auth state
  useEffect(() => {
    if (lifecycleRef.current.initialized) return
    lifecycleRef.current.initialized = true
    refreshAuth()
  }, [refreshAuth])

  // Listen for storage changes (e.g., login in another tab)
  useEffect(() => {
    // Disable storage listener to prevent infinite loops
    // const handleStorage = () => {
    //   const storedToken = localStorage.getItem(TOKEN_KEY)
    //   const storedUserData = localStorage.getItem(USER_KEY)
    //   if (storedToken && storedUserData) {
    //     try {
    //       const parsedUser = JSON.parse(storedUserData)
    //       setToken(storedToken)
    //       setUser(parsedUser as User)
    //     } catch (error) {
    //       console.error('Error parsing user data from storage:', error)
    //       clearSession()
    //     }
    //   } else {
    //     clearSession()
    //   }
    // }
    // window.addEventListener("storage", handleStorage)
    // return () => {
    //   window.removeEventListener("storage", handleStorage)
    // }
  }, [clearSession])

  const isAuthenticated = !!token && !!user

  return {
    user,
    token,
    loading,
    isAuthenticated,
    refreshAuth,
    signOut,
    clearSession
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // During hot-reload, context might be temporarily unavailable
    // Return a safe default instead of throwing to prevent crashes
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('useAuth called outside AuthProvider (likely hot-reload issue)')
      return {
        user: null,
        token: null,
        loading: true,
        isAuthenticated: false,
        refreshAuth: async () => {},
        signOut: async () => {},
        clearSession: () => {}
      } as AuthContextType
    }
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Export AuthContext for use in a .tsx provider wrapper
export { AuthContext }
