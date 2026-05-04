import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { APP_CONFIG } from '@/lib/config';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { colors, radius, spacing } from '@/lib/theme';

const FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop';

export default function MealDetailsScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    benefit?: string;
    image?: string;
    ingredients?: string;
  }>();
  const { settings } = useSicknessSettings();
  const title = String(params.title || 'Health Meal');
  const calories = params.calories ? Number(params.calories) : undefined;
  const protein = params.protein ? Number(params.protein) : undefined;
  const carbs = params.carbs ? Number(params.carbs) : undefined;
  const fat = params.fat ? Number(params.fat) : undefined;
  const benefit = (params.benefit as string) || '';
  const incomingImage = (params.image as string) || '';

  const ingredients: string[] = useMemo(() => {
    if (!params.ingredients) return [];
    try {
      const parsed = JSON.parse(params.ingredients as string);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return [];
  }, [params.ingredients]);

  const [img, setImg] = useState<string>(incomingImage || FALLBACK);
  const [instructions, setInstructions] = useState<string>('');
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [hasInstructions, setHasInstructions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!incomingImage) {
      api
        .aiGetFoodImage(title)
        .then((url) => {
          if (cancelled) return;
          setImg(url || FALLBACK);
        })
        .catch(() => !cancelled && setImg(FALLBACK));
    }
    return () => {
      cancelled = true;
    };
  }, [title, incomingImage]);

  const loadInstructions = async () => {
    if (hasInstructions) return;
    setInstructionsLoading(true);
    try {
      const useSick = !!settings.sicknessType;
      const path = useSick ? '/sick_meal_plan_instructions' : '/meal_plan_instructions';
      const payload: any = {
        food_name: title,
        ingredients,
      };
      if (useSick) payload.sickness = settings.sicknessType;
      const res = await fetch(`${APP_CONFIG.api.ai_api_url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      setInstructions(String(data?.instructions || '').trim() || 'No instructions available.');
      setHasInstructions(true);
    } catch (err: any) {
      setInstructions(`Failed to load cooking instructions. ${err?.message || ''}`.trim());
      setHasInstructions(true);
    } finally {
      setInstructionsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Meal details" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          {typeof calories === 'number' && !Number.isNaN(calories) ? (
            <View style={styles.calBadge}>
              <Ionicons name="flame" size={12} color="#fff" />
              <Text style={styles.calText}>{calories} kcal</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{title}</Text>
        {benefit ? <Text style={styles.benefit}>{benefit}</Text> : null}

        <View style={styles.macroGrid}>
          <MacroCard label="Calories" value={calories ? `${Math.round(calories)}` : '—'} suffix="kcal" color={colors.success} />
          <MacroCard label="Protein" value={protein ? `${Math.round(protein)}` : '—'} suffix="g" color={colors.info} />
          <MacroCard label="Carbs" value={carbs ? `${Math.round(carbs)}` : '—'} suffix="g" color={colors.warning} />
          <MacroCard label="Fat" value={fat ? `${Math.round(fat)}` : '—'} suffix="g" color={colors.danger} />
        </View>

        {ingredients.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.ingredientList}>
              {ingredients.map((i) => (
                <View key={i} style={styles.ingredientRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={styles.ingredientText}>{i}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Cooking instructions</Text>
          {!hasInstructions && !instructionsLoading ? (
            <Button
              title="Get AI cooking tutorial"
              onPress={loadInstructions}
              variant="outline"
              leftIcon={<Ionicons name="book-outline" size={18} color={colors.primary} />}
            />
          ) : instructionsLoading ? (
            <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Fetching instructions…</Text>
            </View>
          ) : (
            <Text style={styles.instructionsText}>{instructions}</Text>
          )}
        </Card>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MacroCard: React.FC<{ label: string; value: string; suffix: string; color: string }> = ({
  label,
  value,
  suffix,
  color,
}) => (
  <View style={[styles.macro, { borderColor: color + '33', backgroundColor: color + '10' }]}>
    <Text style={[styles.macroLabel, { color }]}>{label}</Text>
    <Text style={styles.macroValue}>
      {value}
      <Text style={styles.macroSuffix}> {suffix}</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  hero: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgSubtle,
  },
  calBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  benefit: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macro: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  macroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  macroValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  macroSuffix: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  ingredientList: { gap: 6 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingredientText: { fontSize: 14, color: colors.text },
  instructionsText: { color: colors.text, lineHeight: 22, fontSize: 14 },
});
