import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function IndexRoute() {
  const { isAuthenticated, loading, hydrated } = useAuth();
  if (!hydrated || loading) return null;
  if (isAuthenticated) return <Redirect href="/(tabs)/planner" />;
  return <Redirect href="/welcome" />;
}
