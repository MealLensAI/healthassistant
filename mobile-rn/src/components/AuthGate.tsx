import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

const PUBLIC_ROUTES = new Set([
  '(auth)',
  'welcome',
  'login',
  'signup',
  'forgot-password',
  'reset-password',
]);

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hydrated, loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || loading) return;
    const root = segments[0] || '';
    const inPublic = PUBLIC_ROUTES.has(root) || root === '' || root === 'index';
    if (!isAuthenticated && !inPublic) {
      router.replace('/welcome');
    } else if (isAuthenticated && (root === 'welcome' || root === '(auth)' || root === '')) {
      router.replace('/(tabs)/planner');
    }
  }, [hydrated, loading, isAuthenticated, segments, router]);

  if (!hydrated || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default AuthGate;
