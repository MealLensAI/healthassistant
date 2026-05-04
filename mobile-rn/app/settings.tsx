import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useSicknessSettings, SicknessSettings } from '@/hooks/useSicknessSettings';
import { useToast } from '@/lib/toast';
import { colors, spacing } from '@/lib/theme';

const GENDERS = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Other', value: 'other' },
];

const ACTIVITY = [
  { label: 'Sedentary (little to no exercise)', value: 'sedentary' },
  { label: 'Light (1-3 days/week)', value: 'light' },
  { label: 'Moderate (3-5 days/week)', value: 'moderate' },
  { label: 'Active (6-7 days/week)', value: 'active' },
  { label: 'Very active (hard daily exercise)', value: 'very_active' },
];

const GOALS = [
  { label: 'Heal / improve health condition', value: 'heal' },
  { label: 'Maintain current health', value: 'maintain' },
  { label: 'Lose weight', value: 'lose_weight' },
  { label: 'Gain weight', value: 'gain_weight' },
  { label: 'Improve fitness', value: 'improve_fitness' },
];

const CONDITIONS = [
  'Diabetes',
  'High Blood Pressure',
  'High Cholesterol',
  'Heart Disease',
  'Kidney Disease',
  'Obesity',
  'PCOS',
  'Thyroid Disorder',
  'Liver Disease',
  'None / General',
].map((c) => ({ label: c, value: c }));

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, saveSettings, loading, reloadSettings } = useSicknessSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SicknessSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    reloadSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    updateSettings(form);
    const result = await saveSettings(form);
    setSaving(false);
    if (result.success) {
      toast({ title: 'Saved', description: 'Your health profile was updated.', variant: 'success' });
      router.back();
    } else {
      toast({
        title: 'Save failed',
        description: result.error || 'Could not save settings.',
        variant: 'destructive',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Health profile" subtitle="Used for personalized plans" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Loading profile…</Text>
            </View>
          ) : null}

          <Card>
            <Text style={styles.section}>Basic info</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Age"
                  keyboardType="numeric"
                  value={form.age?.toString() || ''}
                  onChangeText={(v) => setForm((s) => ({ ...s, age: v ? Number(v) : undefined }))}
                  placeholder="32"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="Gender"
                  placeholder="Select"
                  value={form.gender}
                  options={GENDERS}
                  onChange={(v) => setForm((s) => ({ ...s, gender: v as SicknessSettings['gender'] }))}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Weight (kg)"
                  keyboardType="numeric"
                  value={form.weight?.toString() || ''}
                  onChangeText={(v) => setForm((s) => ({ ...s, weight: v ? Number(v) : undefined }))}
                  placeholder="70"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Height (cm)"
                  keyboardType="numeric"
                  value={form.height?.toString() || ''}
                  onChangeText={(v) => setForm((s) => ({ ...s, height: v ? Number(v) : undefined }))}
                  placeholder="170"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Waist (cm)"
                  keyboardType="numeric"
                  value={form.waist?.toString() || ''}
                  onChangeText={(v) => setForm((s) => ({ ...s, waist: v ? Number(v) : undefined }))}
                  placeholder="80"
                />
              </View>
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Lifestyle</Text>
            <Select
              label="Activity level"
              placeholder="Select your activity level"
              value={form.activityLevel}
              options={ACTIVITY}
              onChange={(v) => setForm((s) => ({ ...s, activityLevel: v as SicknessSettings['activityLevel'] }))}
            />
            <Select
              label="Goal"
              placeholder="What's your goal?"
              value={form.goal}
              options={GOALS}
              onChange={(v) => setForm((s) => ({ ...s, goal: v }))}
            />
            <Input
              label="Location"
              placeholder="e.g. Lagos, Nigeria"
              value={form.location || ''}
              onChangeText={(v) => setForm((s) => ({ ...s, location: v }))}
            />
          </Card>

          <Card>
            <Text style={styles.section}>Health condition</Text>
            <Select
              label="Condition"
              placeholder="Select condition"
              value={form.sicknessType}
              options={CONDITIONS}
              onChange={(v) => setForm((s) => ({ ...s, sicknessType: v }))}
            />
          </Card>

          <Button title="Save profile" loading={saving} onPress={save} size="lg" fullWidth />
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  centerPad: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
});
