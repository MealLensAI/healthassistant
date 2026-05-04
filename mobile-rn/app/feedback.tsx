import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { colors, radius, spacing } from '@/lib/theme';

export default function FeedbackScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (text.trim().length < 4) {
      toast({
        title: 'Feedback too short',
        description: 'Please write a bit more so we can help.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await api.saveFeedback(text.trim());
      toast({ title: 'Thank you!', description: 'Feedback received.', variant: 'success' });
      router.back();
    } catch (err: any) {
      toast({
        title: 'Could not send',
        description: err?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Send feedback" subtitle="We read every message" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.label}>Your feedback</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Share what's working, what's not, or ideas for improvement…"
              placeholderTextColor={colors.textFaint}
              style={styles.area}
            />
          </Card>
          <Button title="Submit" onPress={submit} loading={loading} size="lg" fullWidth />
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  area: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
