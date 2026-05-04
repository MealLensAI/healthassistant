import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { useMealPlans, MealPlan } from '@/hooks/useMealPlans';
import { useToast } from '@/lib/toast';
import { APP_CONFIG } from '@/lib/config';
import { colors, radius, spacing } from '@/lib/theme';

const mapGoal = (goal?: string): string => {
  if (!goal) return 'heal';
  const g = goal.toLowerCase();
  if (g.includes('maintain')) return 'maintain';
  if (g.includes('lose')) return 'lose_weight';
  if (g.includes('gain')) return 'gain_weight';
  if (g.includes('fitness')) return 'improve_fitness';
  return 'heal';
};

export default function GeneratePlanScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, isHealthProfileComplete } = useSicknessSettings();
  const { saveMealPlan } = useMealPlans();
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState(settings.location || '');

  const hasProfile = isHealthProfileComplete();

  const generate = async () => {
    if (!hasProfile) {
      toast({
        title: 'Health profile required',
        description: 'Please complete your health profile first.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        age: settings.age,
        weight: settings.weight,
        height: settings.height,
        waist: settings.waist,
        gender: settings.gender,
        activity_level: settings.activityLevel,
        condition: settings.sicknessType,
        goal: mapGoal(settings.goal),
        location: location || settings.location || '',
        budget: budget ? Number(budget) : 0,
        budget_state: !!budget,
      };

      const res = await fetch(`${APP_CONFIG.api.ai_api_url}/sick_smart_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`AI error ${res.status}`);
      const data: any = await res.json();

      const rawPlan: MealPlan[] = data?.mealPlan || data?.meal_plan || data?.plan || [];
      if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
        throw new Error('The AI did not return a valid meal plan. Try again.');
      }

      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + 7);

      const saved = await saveMealPlan({
        name: `Plan — ${now.toLocaleDateString()}`,
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        mealPlan: rawPlan,
        healthAssessment: data?.healthAssessment,
        userInfo: payload,
        hasSickness: true,
        sicknessType: settings.sicknessType,
      });

      if (saved) {
        toast({ title: 'Plan saved', description: 'Your weekly plan is ready.', variant: 'success' });
        router.replace('/(tabs)/planner');
      } else {
        toast({
          title: 'Could not save plan',
          description: 'Plan was generated but saving to your account failed.',
          variant: 'warning',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Generation failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Generate meal plan" subtitle="AI weekly plan tuned to your health" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!hasProfile ? (
            <Card style={styles.warningCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <Ionicons name="alert-circle" size={22} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Health profile incomplete</Text>
                  <Text style={styles.warningText}>
                    Please fill in your health profile for a personalized plan.
                  </Text>
                </View>
              </View>
              <Button
                title="Complete profile"
                variant="outline"
                onPress={() => router.push('/settings')}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : null}

          <Card>
            <Text style={styles.sectionTitle}>Personalization</Text>
            <Input
              label="Location"
              placeholder="e.g. Nairobi, Kenya"
              value={location}
              onChangeText={setLocation}
            />
            <Input
              label="Weekly budget (optional)"
              placeholder="e.g. 50 (USD)"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
              leftIcon={<Ionicons name="cash-outline" size={18} color={colors.textMuted} />}
            />
            <View style={styles.helperBox}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={styles.helperText}>
                Based on your condition ({settings.sicknessType || 'N/A'}) and goal, MealLensAI will
                design a 7-day plan with breakfast, lunch, dinner, and snacks.
              </Text>
            </View>
          </Card>

          <Button
            title={loading ? 'Generating with AI…' : 'Generate 7-day plan'}
            onPress={generate}
            size="lg"
            fullWidth
            loading={loading}
            leftIcon={<Ionicons name="sparkles" size={18} color="#fff" />}
          />

          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>This can take up to a minute…</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  helperBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  helperText: { fontSize: 12, color: colors.primary, flex: 1, lineHeight: 18 },
  warningCard: { borderColor: colors.warning + '88', backgroundColor: colors.warning + '10' },
  warningTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  warningText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  centerPad: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
});
