import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { APP_CONFIG } from '@/lib/config';
import { useToast } from '@/lib/toast';
import { colors, radius, spacing } from '@/lib/theme';

export default function PaymentScreen() {
  const { toast } = useToast();
  const [openingPlan, setOpeningPlan] = useState<string | null>(null);

  const subscribe = async (planId: string) => {
    setOpeningPlan(planId);
    try {
      const url = `${APP_CONFIG.api.base_url}/subscribe?plan=${planId}`;
      await WebBrowser.openBrowserAsync(url);
    } catch {
      toast({
        title: 'Could not open checkout',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setOpeningPlan(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Subscription" subtitle="Upgrade to unlock everything" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Ionicons name="sparkles" size={28} color={colors.primary} />
          <Text style={styles.heroTitle}>Get the most out of MealLensAI</Text>
          <Text style={styles.heroSub}>
            Subscribe to unlock unlimited plans, detections, and premium health insights.
          </Text>
        </Card>

        {APP_CONFIG.subscriptionPlans
          .filter((p) => p.id !== 'free')
          .map((plan) => {
            const price =
              plan.billing_cycle === 'weekly'
                ? plan.price_weekly
                : plan.billing_cycle === 'two_weeks'
                ? plan.price_two_weeks
                : plan.billing_cycle === 'yearly'
                ? plan.price_yearly || 50
                : plan.price_monthly;
            return (
              <Card key={plan.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.planName}>{plan.display_name}</Text>
                  <Text style={styles.priceText}>
                    <Text style={styles.priceDollar}>$</Text>
                    {price.toFixed(2)}
                    <Text style={styles.priceCycle}> / {plan.billing_cycle.replace('_', ' ')}</Text>
                  </Text>
                </View>
                <View style={styles.featureList}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Button
                  title={openingPlan === plan.id ? 'Opening checkout…' : 'Subscribe'}
                  loading={openingPlan === plan.id}
                  onPress={() => subscribe(plan.id)}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            );
          })}

        <Card>
          <Text style={styles.footerText}>
            You'll complete checkout securely in your browser via Paystack. Your subscription status
            will automatically sync once payment is confirmed.
          </Text>
        </Card>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryTint, borderColor: colors.primary + '40' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  planName: { fontSize: 16, fontWeight: '800', color: colors.text },
  priceText: { fontSize: 16, color: colors.text, fontWeight: '800' },
  priceDollar: { fontSize: 14 },
  priceCycle: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  featureList: { marginTop: spacing.md, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: colors.text },
  footerText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
