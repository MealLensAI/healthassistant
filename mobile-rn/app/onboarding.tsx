import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { colors, radius, spacing } from '@/lib/theme';

const PERKS = [
  'AI-powered food and ingredient detection',
  'Personalized meal plans tailored to your health',
  'Smart recipe suggestions based on your location',
  'Track your history and progress over time',
];

export default function OnboardingScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <Logo size="xl" />
        </View>
        <Text style={styles.title}>Welcome to MealLensAI</Text>
        <Text style={styles.subtitle}>Your AI-powered kitchen companion</Text>
        <View style={styles.perksBox}>
          <Text style={styles.perksTitle}>What you'll get</Text>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.helper}>Set up your health profile in Settings for best results.</Text>
        <Button
          title="Get started"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(tabs)/planner')}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  logoRow: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  perksBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  perksTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perkText: { color: colors.text, fontSize: 14, flex: 1 },
  helper: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
