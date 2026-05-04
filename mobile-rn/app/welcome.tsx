import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { colors, radius, spacing } from '@/lib/theme';

const CONDITIONS = [
  'Diabetes',
  'High Blood Pressure',
  'Obesity',
  'High Cholesterol',
  'Heart Disease',
  'Kidney Care',
  'PCOS',
  'Thyroid',
  'IBS',
];

const FEATURES: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = [
  {
    icon: 'sparkles-outline',
    title: 'Personalized AI nutrition',
    description: 'Meal plans tailored to your condition, goals, biometrics and budget.',
  },
  {
    icon: 'camera-outline',
    title: 'Snap to detect',
    description: 'Identify ingredients or dishes in a photo and get AI-powered guidance.',
  },
  {
    icon: 'pulse-outline',
    title: 'Health-aware planning',
    description: 'Plans adapt for diabetes, hypertension, PCOS, kidney care, and more.',
  },
  {
    icon: 'calendar-outline',
    title: '7-day smart planner',
    description: 'Weekly meals with ingredients, macros, and cooking instructions.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo size="md" />
          <Link href="/login" asChild>
            <Text style={styles.headerLink}>Log in</Text>
          </Link>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Use your everyday food to manage and improve your chronic conditions
            <Text style={{ color: colors.primary }}> — with AI.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Tell our AI your condition, and it recommends food that maintains your health and can restore
            or improve your condition based on your data.
          </Text>

          <View style={styles.conditions}>
            {CONDITIONS.map((c) => (
              <View key={c} style={styles.conditionChip}>
                <Text style={styles.conditionText}>{c}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <Button title="Get Started" size="lg" onPress={() => router.push('/signup')} fullWidth />
            <Button
              title="I already have an account"
              variant="outline"
              size="lg"
              onPress={() => router.push('/login')}
              fullWidth
            />
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feat) => (
            <View key={feat.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feat.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureDesc}>{feat.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Trusted by people with chronic conditions, nutritionists, dietitians, and insurance companies.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLink: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  hero: { gap: spacing.lg },
  heroTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  heroSub: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  conditions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  conditionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgChip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  ctaRow: { gap: spacing.sm, marginTop: spacing.md },
  features: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  featureDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
  footer: { alignItems: 'center', paddingTop: spacing.md },
  footerText: { fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
});
