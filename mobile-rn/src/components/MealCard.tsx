import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { colors, radius, shadows, spacing } from '@/lib/theme';

const FALLBACKS: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&h=400&fit=crop',
  lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
  dinner: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop',
  snack: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
};

const BADGE_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Dessert',
};

const BADGE_COLOR: Record<string, string> = {
  breakfast: colors.mealBreakfast,
  lunch: colors.mealLunch,
  dinner: colors.mealDinner,
  snack: colors.mealSnack,
};

interface MealCardProps {
  title: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  benefit?: string;
  image?: string;
  imageQuery?: string;
  onPress?: () => void;
  isCooked?: boolean;
  onMarkCooked?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  title,
  mealType,
  calories,
  protein,
  carbs,
  fat,
  benefit,
  image,
  imageQuery,
  onPress,
  isCooked,
  onMarkCooked,
}) => {
  const fallback = FALLBACKS[mealType || 'dinner'] || FALLBACKS.dinner;
  const [src, setSrc] = useState<string | null>(image || null);
  const [loading, setLoading] = useState(!image);

  useEffect(() => {
    let cancelled = false;
    if (image) {
      setSrc(image);
      setLoading(false);
      return;
    }
    const q = imageQuery || title;
    if (!q) {
      setSrc(fallback);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .aiGetFoodImage(q)
      .then((url) => {
        if (cancelled) return;
        setSrc(url || fallback);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [image, imageQuery, title]);

  const badgeLabel = mealType ? BADGE_LABEL[mealType] || mealType : null;
  const badgeColor = mealType ? BADGE_COLOR[mealType] || colors.primary : colors.primary;
  const hasMacros = protein !== undefined || carbs !== undefined || fat !== undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        isCooked && styles.cardCooked,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.imageWrap}>
        {loading ? (
          <View style={[StyleSheet.absoluteFill, styles.loading]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        {src ? (
          <Image
            source={{ uri: src }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        {badgeLabel ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        {typeof calories === 'number' ? (
          <View style={styles.calBadge}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.calText}>{calories} kcal</Text>
          </View>
        ) : null}
        {onMarkCooked ? (
          <Pressable
            onPress={(e) => {
              (e as any).stopPropagation?.();
              if (!isCooked) onMarkCooked();
            }}
            style={[
              styles.cookBtn,
              isCooked && { backgroundColor: colors.success, borderColor: colors.success },
            ]}
          >
            <Ionicons
              name={isCooked ? 'checkmark-circle' : 'restaurant'}
              size={14}
              color={isCooked ? '#fff' : colors.text}
            />
            <Text style={[styles.cookBtnText, isCooked && { color: '#fff' }]}>
              {isCooked ? 'Cooked' : 'Mark cooked'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title || 'Health Meal'}
        </Text>

        {hasMacros ? (
          <View style={styles.macros}>
            {protein !== undefined ? <Macro emoji="🍖" value={protein} label="Protein" /> : null}
            {carbs !== undefined ? <Macro emoji="🌾" value={carbs} label="Carbs" /> : null}
            {fat !== undefined ? <Macro emoji="💧" value={fat} label="Fats" /> : null}
          </View>
        ) : null}

        {benefit ? (
          <View style={styles.benefitRow}>
            <Text style={styles.benefitEmoji}>🚀</Text>
            <Text style={styles.benefit} numberOfLines={2}>
              {benefit}
            </Text>
          </View>
        ) : null}

        <Text style={styles.detailsLink}>View Recipe Details</Text>
      </View>
    </Pressable>
  );
};

const Macro: React.FC<{ emoji: string; value: number; label: string }> = ({ emoji, value, label }) => (
  <View style={styles.macroPill}>
    <Text style={{ fontSize: 14 }}>{emoji}</Text>
    <Text style={styles.macroValue}>{Math.round(value)}g</Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardCooked: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  imageWrap: {
    height: 160,
    backgroundColor: colors.bgSubtle,
  },
  loading: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  calBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cookBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cookBtnText: { fontSize: 11, fontWeight: '700', color: colors.text },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
  macros: { flexDirection: 'row', gap: 8 },
  macroPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.macroBg,
    borderColor: colors.macroBorder,
    gap: 2,
  },
  macroValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  macroLabel: { fontSize: 10, color: colors.textMuted },
  benefitRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  benefitEmoji: { fontSize: 13 },
  benefit: { flex: 1, fontSize: 12, color: colors.accent, lineHeight: 17 },
  detailsLink: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginTop: 2,
  },
});

export default MealCard;
