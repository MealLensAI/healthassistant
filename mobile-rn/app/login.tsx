import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';
import { colors, radius, spacing } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');

  const submit = async () => {
    if (!email || !password) {
      toast({ title: 'Missing info', description: 'Email and password are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.success) {
      toast({ title: 'Welcome back!', description: 'Signed in successfully.', variant: 'success' });
      router.replace('/(tabs)/planner');
    } else {
      toast({ title: 'Login failed', description: result.error || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.logoRow}>
            <Logo size="lg" />
          </View>

          <Text style={styles.title}>Welcome back</Text>

          {/* Account Type Toggle */}
          <View style={styles.accountToggle}>
            <Pressable
              onPress={() => setAccountType('individual')}
              style={[styles.toggleBtn, accountType === 'individual' && styles.toggleBtnActive]}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={accountType === 'individual' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  accountType === 'individual' && styles.toggleTextActive,
                ]}
              >
                Individual
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAccountType('organization')}
              style={[styles.toggleBtn, accountType === 'organization' && styles.toggleBtnActive]}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={accountType === 'organization' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  accountType === 'organization' && styles.toggleTextActive,
                ]}
              >
                Organization
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Input
              label="Email"
              placeholder="Enter Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <View style={styles.forgotRow}>
              <Link href="/forgot-password" asChild>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Link>
            </View>

            <Button
              title="Login"
              size="lg"
              loading={loading}
              onPress={submit}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchMuted}>Don't have an account? </Text>
              <Link href="/signup" asChild>
                <Text style={styles.switchLink}>Sign Up</Text>
              </Link>
            </View>
          </View>

          <View style={styles.heroBanner}>
            <Text style={styles.heroBannerText}>
              The right <Text style={styles.heroHighlight}>FOOD</Text> can be part of your healing.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  logoRow: { alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  accountToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.lg,
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toggleText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  toggleTextActive: { color: colors.primary },
  forgotRow: { alignItems: 'flex-end', marginBottom: spacing.sm, marginTop: -4 },
  forgot: { color: colors.primary, fontWeight: '500', fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  switchMuted: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  heroBanner: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroBannerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  heroHighlight: { color: colors.primary },
});
