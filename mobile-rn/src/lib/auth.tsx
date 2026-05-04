import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, setAuthErrorHandler } from './api';
import {
  getSync,
  hydrateSyncCache,
  primeSyncCache,
  removeSync,
  safeGetItem,
  safeRemoveItem,
  setSync,
  STORAGE_KEYS,
} from './storage';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  metadata?: Record<string, any>;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hydrated: boolean;
  refreshAuth: (skipVerification?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  signUp: (payload: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    signup_type?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HYDRATE_KEYS = [
  STORAGE_KEYS.TOKEN,
  STORAGE_KEYS.USER,
  STORAGE_KEYS.REFRESH_TOKEN,
  STORAGE_KEYS.SESSION_ID,
  STORAGE_KEYS.USER_ID,
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const isRefreshing = useRef(false);
  const initialized = useRef(false);

  const clearSession = useCallback(async () => {
    await removeSync(STORAGE_KEYS.TOKEN);
    await removeSync(STORAGE_KEYS.USER);
    await removeSync(STORAGE_KEYS.REFRESH_TOKEN);
    await removeSync(STORAGE_KEYS.SESSION_ID);
    await removeSync(STORAGE_KEYS.USER_ID);
    await safeRemoveItem(STORAGE_KEYS.ACCESS_STATUS);
    await safeRemoveItem(STORAGE_KEYS.TRIAL_START);
    await safeRemoveItem(STORAGE_KEYS.SUBSCRIPTION_STATUS);
    await safeRemoveItem(STORAGE_KEYS.SUBSCRIPTION_EXPIRES_AT);
    setUser(null);
    setToken(null);
  }, []);

  const refreshAuth = useCallback(
    async (skipVerification = false) => {
      if (isRefreshing.current) return;
      isRefreshing.current = true;
      try {
        const storedToken = getSync(STORAGE_KEYS.TOKEN) || (await safeGetItem(STORAGE_KEYS.TOKEN));
        const storedUser = getSync(STORAGE_KEYS.USER) || (await safeGetItem(STORAGE_KEYS.USER));

        if (!storedToken || !storedUser) {
          setUser(null);
          setToken(null);
          return;
        }
        try {
          const parsed = JSON.parse(storedUser) as AuthUser;
          if (!parsed?.uid || !parsed?.email) {
            await clearSession();
            return;
          }
          setUser(parsed);
          setToken(storedToken);
          if (!skipVerification) {
            try {
              const profile = await api.getUserProfile();
              if (profile?.status !== 'success') {
                // keep session — non-fatal
              }
            } catch (err: any) {
              const is401 = err?.status === 401;
              const msg = String(err?.message || '').toLowerCase();
              const isAuthFail =
                is401 &&
                (msg.includes('expired') ||
                  msg.includes('invalid token') ||
                  msg.includes('authentication failed'));
              if (isAuthFail) {
                await clearSession();
              }
            }
          }
        } catch {
          await clearSession();
        }
      } finally {
        isRefreshing.current = false;
        setLoading(false);
      }
    },
    [clearSession]
  );

  useEffect(() => {
    setAuthErrorHandler(() => {
      void clearSession();
    });
    return () => setAuthErrorHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        await hydrateSyncCache(HYDRATE_KEYS);
      } catch {
        // ignore
      }
      setHydrated(true);
      await refreshAuth(true);
    })();
  }, [refreshAuth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await api.login({ email, password });
        if (result.status === 'success' && result.access_token) {
          const displayName = (result.user_data?.email || email).split('@')[0];
          const nextUser: AuthUser = {
            uid: result.user_id || result.user_data?.id || '',
            email: result.user_data?.email || email,
            displayName,
            photoURL: null,
            metadata: result.user_data?.metadata,
          };
          primeSyncCache({
            [STORAGE_KEYS.TOKEN]: result.access_token,
            [STORAGE_KEYS.REFRESH_TOKEN]: result.refresh_token || '',
            [STORAGE_KEYS.SESSION_ID]: result.session_id || '',
            [STORAGE_KEYS.USER_ID]: result.user_id || '',
            [STORAGE_KEYS.USER]: JSON.stringify(nextUser),
          });
          await setSync(STORAGE_KEYS.TOKEN, result.access_token);
          await setSync(STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token || '');
          await setSync(STORAGE_KEYS.SESSION_ID, result.session_id || '');
          await setSync(STORAGE_KEYS.USER_ID, result.user_id || '');
          await setSync(STORAGE_KEYS.USER, JSON.stringify(nextUser));
          setUser(nextUser);
          setToken(result.access_token);
          return { success: true, user: nextUser };
        }
        return { success: false, error: result.message || 'Invalid email or password.' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Sign in failed.' };
      }
    },
    []
  );

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
      signup_type?: string;
    }) => {
      try {
        const reg = await api.register(payload);
        if (reg.status !== 'success') {
          return { success: false, error: reg.message || 'Signup failed.' };
        }
        // Auto-login after signup
        const loginRes = await signIn(payload.email, payload.password);
        if (!loginRes.success) return { success: false, error: loginRes.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Signup failed.' };
      }
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    await clearSession();
  }, [clearSession]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    hydrated,
    refreshAuth,
    signIn,
    signUp,
    signOut,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
