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
import { colors, spacing } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: 'Validation', description: 'Please enter your first and last name.', variant: 'destructive' });
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Validation', description: 'Please enter a valid email.', variant: 'destructive' });
      return false;
    }
    if (password.length < 6) {
      toast({ title: 'Validation', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return false;
    }
    if (password !== confirm) {
      toast({ title: 'Validation', description: 'Passwords do not match.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await signUp({
      email: email.trim(),
      password,
      first_name: firstName,
      last_name: lastName,
      signup_type: 'individual',
    });
    setLoading(false);
    if (result.success) {
      toast({
        title: 'Account created',
        description: "Welcome to MealLensAI. Let's set up your profile.",
        variant: 'success',
      });
      router.replace('/onboarding');
    } else {
      toast({
        title: 'Signup failed',
        description: result.error || 'Please try again.',
        variant: 'destructive',
      });
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

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start planning meals for your health today.</Text>

          <View style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input label="First name" placeholder="Jane" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Last name" placeholder="Doe" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
            />
            <Input
              label="Confirm password"
              placeholder="Repeat password"
              value={confirm}
              onChangeText={setConfirm}
              isPassword
            />

            <Button
              title="Create account"
              size="lg"
              loading={loading}
              onPress={submit}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchMuted}>Already have an account? </Text>
              <Link href="/login" asChild>
                <Text style={styles.switchLink}>Log in</Text>
              </Link>
            </View>
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
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  switchMuted: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
