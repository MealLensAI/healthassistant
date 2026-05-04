import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import EmptyState from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, shadows, spacing } from '@/lib/theme';

interface HistoryItem {
  id: string;
  recipe_type?: string;
  suggestion?: string;
  detected_foods?: string;
  ingredients?: string;
  created_at?: string;
  [k: string]: any;
}

type TabKey = 'ingredient_detection' | 'health_history';

const getTypeLabel = (type?: string) => {
  switch (type) {
    case 'ingredient_detection':
      return 'Ingredient Detect';
    case 'food_detection':
      return 'Food Detect';
    case 'health_meal':
      return 'Health Meal';
    case 'meal_plan':
      return 'Meal Plan';
    default:
      return 'Detection';
  }
};

const getItemName = (item: HistoryItem): string => {
  if (item.suggestion) return item.suggestion;
  try {
    if (item.detected_foods) {
      const foods = JSON.parse(item.detected_foods);
      if (Array.isArray(foods) && foods.length > 0) {
        return foods[0] + (foods.length > 1 ? ` (+${foods.length - 1})` : '');
      }
    }
  } catch {}
  return 'Unknown';
};

const formatDate = (d?: string) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatDateTime = (d?: string) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

export default function HistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [settingsHistory, setSettingsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [tab, setTab] = useState<TabKey>('ingredient_detection');
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result: any = await api.getDetectionHistory();
      const data =
        result.detection_history || result.data?.detection_history || result.history || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSettings(true);
    try {
      const result: any = await api.getUserSettingsHistory('health_profile', 50);
      const data = result.history || result.data?.history || result.data || [];
      setSettingsHistory(Array.isArray(data) ? data : []);
    } catch {
      setSettingsHistory([]);
    } finally {
      setLoadingSettings(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (tab === 'health_history') fetchSettings();
  }, [tab, fetchSettings]);

  const ingredientHistory = items.filter((i) => i.recipe_type === 'ingredient_detection' || !i.recipe_type);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSub}>Your detections and health updates</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={tab === 'ingredient_detection' ? loading : loadingSettings}
            onRefresh={tab === 'ingredient_detection' ? fetchHistory : fetchSettings}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs - match web outline style */}
        <View style={styles.tabWrap}>
          <Pressable
            style={[styles.tabBtn, tab === 'ingredient_detection' && styles.tabBtnActive]}
            onPress={() => setTab('ingredient_detection')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'ingredient_detection' && styles.tabTextActive,
              ]}
            >
              Ingredient Detections
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'health_history' && styles.tabBtnActive]}
            onPress={() => setTab('health_history')}
          >
            <Text
              style={[styles.tabText, tab === 'health_history' && styles.tabTextActive]}
            >
              Health History
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {tab === 'ingredient_detection' ? (
          loading && items.length === 0 ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Loading history…</Text>
            </View>
          ) : ingredientHistory.length === 0 ? (
            <EmptyState
              icon="file-tray-outline"
              title="No history found"
              description="Start detecting ingredients to see your history here."
            />
          ) : (
            <View style={styles.listCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                <Text style={[styles.th, { flex: 1 }]}>Source</Text>
                <Text style={[styles.th, { width: 56, textAlign: 'right' }]}>Action</Text>
              </View>
              {ingredientHistory.map((item, idx) => (
                <Pressable
                  key={item.id || idx}
                  onPress={() => router.push({ pathname: '/history-detail', params: { id: item.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    idx !== ingredientHistory.length - 1 && styles.rowBorder,
                    pressed && { backgroundColor: colors.bgSubtle },
                  ]}
                >
                  <View style={[{ flex: 2 }, styles.cellName]}>
                    <View style={styles.nameBadge}>
                      <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nameText} numberOfLines={1}>{getItemName(item)}</Text>
                      <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.sourceTag}>
                      <Text style={styles.sourceText}>{getTypeLabel(item.recipe_type)}</Text>
                    </View>
                  </View>
                  <View style={{ width: 56, alignItems: 'flex-end' }}>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : loadingSettings && settingsHistory.length === 0 ? (
          <View style={styles.centerPad}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Loading health history…</Text>
          </View>
        ) : settingsHistory.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            title="No health history"
            description="Update your health info in Settings to build history here."
          />
        ) : (
          <View style={styles.listCard}>
            {settingsHistory.map((entry, idx) => (
              <View
                key={entry.id || idx}
                style={[styles.settingRow, idx !== settingsHistory.length - 1 && styles.rowBorder]}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="pulse" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Health profile updated</Text>
                  <Text style={styles.settingDate}>{formatDateTime(entry.created_at)}</Text>
                  {entry.summary ? (
                    <Text style={styles.settingSummary} numberOfLines={2}>
                      {entry.summary}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
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
    backgroundColor: colors.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '500', color: colors.text, letterSpacing: 0.4 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  content: { padding: spacing.xl, gap: spacing.lg },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
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
  centerPad: { alignItems: 'center', padding: spacing.xxxl, gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.bgChip,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { fontSize: 12, fontWeight: '500', color: colors.textBody, letterSpacing: 0.2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cellName: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dateText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sourceTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryTint,
  },
  sourceText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  settingRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  settingDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  settingSummary: { fontSize: 12, color: colors.textBody, marginTop: 6, lineHeight: 17 },
});
