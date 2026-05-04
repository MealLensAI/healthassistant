import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import MealCard from '@/components/MealCard';
import EmptyState from '@/components/ui/EmptyState';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useAuth } from '@/lib/auth';
import { useMealPlans, MealPlan } from '@/hooks/useMealPlans';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { colors, radius, shadows, spacing } from '@/lib/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: Array<{ key: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const extractMeal = (dayPlan: MealPlan | undefined, meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
  if (!dayPlan) return null;
  const nameKey = `${meal}_name` as const;
  const benefitKey = `${meal}_benefit` as const;
  const calKey = `${meal}_calories` as const;
  const proteinKey = `${meal}_protein` as const;
  const carbsKey = `${meal}_carbs` as const;
  const fatKey = `${meal}_fat` as const;
  const imageKey = `${meal}_image` as const;
  const baseTitle = (dayPlan as any)[nameKey] || (dayPlan as any)[meal];
  if (!baseTitle) return null;
  const cleanTitle = String(baseTitle).replace(/\s*\(buy:[^)]*\)/, '').trim();
  return {
    title: cleanTitle,
    calories: (dayPlan as any)[calKey],
    protein: (dayPlan as any)[proteinKey],
    carbs: (dayPlan as any)[carbsKey],
    fat: (dayPlan as any)[fatKey],
    benefit: (dayPlan as any)[benefitKey],
    image: (dayPlan as any)[imageKey],
  };
};

const formatDateRange = (startDate?: string | Date) => {
  if (!startDate) return '';
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => {
    const day = d.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? 'st'
        : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
        ? 'rd'
        : 'th';
    return `${d.toLocaleDateString('en-US', { month: 'short' })} ${day}${suffix}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
};

export default function PlannerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentPlan, plans, loading, initialized, error, refreshMealPlans, selectMealPlan } =
    useMealPlans();
  const { isHealthProfileComplete, settings } = useSicknessSettings();
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [tab, setTab] = useState<'active' | 'saved'>('active');

  const dayPlan = useMemo(
    () => currentPlan?.mealPlan?.find((p) => p.day === selectedDay),
    [currentPlan, selectedDay]
  );

  const onRefresh = useCallback(() => {
    refreshMealPlans();
  }, [refreshMealPlans]);

  const initials = (user?.displayName || user?.email || 'U').substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diet Planner</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={18} color={colors.textBody} />
          </Pressable>
          <Pressable style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Health profile alert */}
        {settings.hasSickness && !isHealthProfileComplete() ? (
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Complete your health profile</Text>
              <Text style={styles.alertText}>
                We need your health info to generate personalized meal plans for {settings.sicknessType || 'your condition'}.
              </Text>
              <Pressable onPress={() => router.push('/settings')} style={styles.alertAction}>
                <Text style={styles.alertActionText}>Open Settings</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Tabs + Create */}
        <View style={styles.topBar}>
          <View style={styles.tabOutlineRow}>
            <Pressable
              onPress={() => setTab('active')}
              style={[styles.tabOutline, tab === 'active' && styles.tabOutlineActive]}
            >
              <Text style={[styles.tabOutlineText, tab === 'active' && styles.tabOutlineTextActive]}>
                Active Plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('saved')}
              style={[styles.tabOutline, tab === 'saved' && styles.tabOutlineActive]}
            >
              <Text style={[styles.tabOutlineText, tab === 'saved' && styles.tabOutlineTextActive]}>
                Saved Plans
              </Text>
            </Pressable>
          </View>
          <Button
            title="Create New Plan"
            size="md"
            onPress={() => router.push('/generate-plan')}
            rightIcon={<Ionicons name="add" size={16} color="#fff" />}
          />
        </View>

        {/* Active plan view */}
        {tab === 'active' ? (
          !initialized && loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.mutedHelper}>Loading your plans…</Text>
            </View>
          ) : !currentPlan ? (
            <EmptyState
              icon="restaurant-outline"
              tone="primary"
              title="No Meal Plan Selected"
              description="Create a new meal plan to get started with your health journey!"
            >
              <Button
                title="Create New Plan"
                onPress={() => router.push('/generate-plan')}
                size="lg"
                leftIcon={<Ionicons name="add" size={18} color="#fff" />}
              />
            </EmptyState>
          ) : (
            <>
              {/* Date + Days */}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{formatDateRange(currentPlan.startDate)}</Text>
              </View>
              <SegmentedControl
                variant="days"
                value={selectedDay}
                onChange={setSelectedDay}
                options={DAYS.map((d) => ({ label: d.slice(0, 3), value: d }))}
              />

              {/* Meal grid */}
              <View style={styles.mealsGrid}>
                {MEAL_TYPES.map((meal) => {
                  const info = extractMeal(dayPlan, meal.key);
                  if (!info) return null;
                  return (
                    <MealCard
                      key={meal.key}
                      mealType={meal.key}
                      title={info.title}
                      calories={info.calories}
                      protein={info.protein}
                      carbs={info.carbs}
                      fat={info.fat}
                      benefit={info.benefit}
                      image={info.image}
                      imageQuery={info.title}
                      onPress={() =>
                        router.push({
                          pathname: '/meal-details',
                          params: {
                            title: info.title,
                            mealType: meal.key,
                            calories: info.calories?.toString(),
                            protein: info.protein?.toString(),
                            carbs: info.carbs?.toString(),
                            fat: info.fat?.toString(),
                            benefit: info.benefit || '',
                            image: info.image || '',
                          },
                        })
                      }
                    />
                  );
                })}
                {!dayPlan ? (
                  <View style={styles.noMeals}>
                    <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                      No meals for {selectedDay} in this plan.
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          )
        ) : (
          // Saved plans view
          <View style={styles.savedList}>
            {plans.length === 0 ? (
              <EmptyState
                icon="file-tray-outline"
                title="No saved plans"
                description="Your saved meal plans will appear here."
              />
            ) : (
              plans.map((p) => {
                const active = currentPlan?.id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      selectMealPlan(p.id);
                      setTab('active');
                    }}
                    style={[styles.savedCard, active && styles.savedCardActive]}
                  >
                    <View style={styles.savedBadge}>
                      <Ionicons name="calendar" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedTitle}>{p.name}</Text>
                      <Text style={styles.savedDate}>{formatDateRange(p.startDate)}</Text>
                    </View>
                    {active ? (
                      <View style={styles.activeDot}>
                        <Text style={styles.activeDotText}>Active</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '500', color: colors.text, letterSpacing: 0.4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileBtn: {
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  content: { padding: spacing.xl, gap: spacing.lg },
  alertCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  alertText: { fontSize: 13, color: colors.textBody, marginTop: 2, lineHeight: 18 },
  alertAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  alertActionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },
  topBar: { gap: spacing.md },
  tabOutlineRow: { flexDirection: 'row', gap: spacing.sm },
  tabOutline: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabOutlineActive: { borderColor: colors.primary },
  tabOutlineText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabOutlineTextActive: { color: colors.primary },
  centerPad: { alignItems: 'center', padding: spacing.xxxl, gap: spacing.sm },
  mutedHelper: { color: colors.textMuted, fontSize: 13 },
  dateRow: { paddingVertical: 4 },
  dateLabel: { fontSize: 15, fontWeight: '500', color: colors.text, letterSpacing: 0.2 },
  mealsGrid: { gap: spacing.md },
  noMeals: {
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  savedList: { gap: spacing.sm },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  savedCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  savedBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  savedDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activeDot: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  activeDotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
