import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';
import { colors, spacing } from '@/lib/theme';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string }>();
  const { toast } = useToast();
  const [token, setToken] = useState(typeof params.access_token === 'string' ? params.access_token : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) {
      toast({ title: 'Missing token', description: 'Paste the token from your email.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Weak password', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetPassword({ access_token: token, new_password: password });
      if (res.status === 'success') {
        toast({ title: 'Password updated', description: 'You can now log in.', variant: 'success' });
        router.replace('/login');
      } else {
        toast({ title: 'Reset failed', description: res.message || 'Please try again.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description: err?.message || 'Please try again later.',
        variant: 'destructive',
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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Paste the reset token from your email and choose a new password.</Text>
          <View style={{ marginTop: spacing.xl }}>
            <Input label="Reset token" value={token} onChangeText={setToken} placeholder="Paste token" />
            <Input label="New password" isPassword value={password} onChangeText={setPassword} />
            <Input label="Confirm password" isPassword value={confirm} onChangeText={setConfirm} />
            <Button title="Update password" size="lg" loading={loading} fullWidth onPress={submit} />
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
});
