import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';
import { colors, spacing } from '@/lib/theme';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast({ title: 'Missing email', description: 'Enter your email address.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSent(true);
      toast({
        title: 'Check your email',
        description: 'If an account exists, we sent you a reset link.',
        variant: 'success',
      });
    } catch {
      // Always show success to avoid email enumeration
      setSent(true);
      toast({
        title: 'Check your email',
        description: 'If an account exists, we sent you a reset link.',
        variant: 'success',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.logoRow}>
            <Logo size="lg" />
          </View>
          <Text style={styles.title}>Forgot password</Text>
          <Text style={styles.subtitle}>
            Enter the email associated with your account and we'll send you a reset link.
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
            />
            <Button
              title={sent ? 'Resend link' : 'Send reset link'}
              size="lg"
              loading={loading}
              fullWidth
              onPress={submit}
            />
            <View style={styles.switchRow}>
              <Link href="/login" asChild>
                <Text style={styles.switchLink}>Back to login</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  logoRow: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
  switchLink: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
