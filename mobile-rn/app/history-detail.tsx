import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';

const safeParse = <T,>(raw?: string | null, fallback?: T): T | undefined => {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function HistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid history item.');
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getDetectionHistoryById(id)
      .then((res: any) => {
        const data = res?.data || res?.detection_history || res;
        setItem(data);
      })
      .catch((err) => setError(err?.message || 'Failed to load details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const confirmDelete = () => {
    Alert.alert('Delete history item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDetectionHistory(id);
            router.back();
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const ingredients = safeParse<string[]>(item?.ingredients, []);
  const detected = safeParse<string[]>(item?.detected_foods, []);
  const resources = safeParse<{
    YoutubeSearch?: any[];
    GoogleSearch?: any[];
  }>(item?.resources_link, undefined);
  const youtubeLink = item?.youtube_link;
  const googleLink = item?.google_link;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Detail" showBack />
      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerPad}>
          <Text style={{ color: colors.danger }}>{error}</Text>
          <Button title="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.badge}>{item?.recipe_type || 'Detection'}</Text>
            <Text style={styles.title}>{item?.suggestion || 'Unknown meal'}</Text>
            {item?.created_at ? (
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </Card>

          {detected && detected.length > 0 ? (
            <Card>
              <Text style={styles.section}>Detected ingredients</Text>
              <View style={styles.tagRow}>
                {detected.map((i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{i}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {ingredients && ingredients.length > 0 ? (
            <Card>
              <Text style={styles.section}>Ingredients used</Text>
              {ingredients.map((i) => (
                <View key={i} style={styles.row}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={styles.rowText}>{i}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {item?.instructions ? (
            <Card>
              <Text style={styles.section}>Instructions</Text>
              <Text style={styles.instructions}>{item.instructions}</Text>
            </Card>
          ) : null}

          {youtubeLink || googleLink || (resources && (resources.YoutubeSearch?.length || resources.GoogleSearch?.length)) ? (
            <Card>
              <Text style={styles.section}>Resources</Text>
              {youtubeLink ? (
                <Button
                  title="Watch tutorial"
                  variant="outline"
                  onPress={() => WebBrowser.openBrowserAsync(String(youtubeLink))}
                  leftIcon={<Ionicons name="logo-youtube" size={18} color={colors.danger} />}
                  style={{ marginBottom: spacing.sm }}
                />
              ) : null}
              {googleLink ? (
                <Button
                  title="Read more"
                  variant="outline"
                  onPress={() => WebBrowser.openBrowserAsync(String(googleLink))}
                  leftIcon={<Ionicons name="globe-outline" size={18} color={colors.primary} />}
                />
              ) : null}
            </Card>
          ) : null}

          <Button
            title="Delete"
            variant="outline"
            onPress={confirmDelete}
            leftIcon={<Ionicons name="trash-outline" size={18} color={colors.danger} />}
            textStyle={{ color: colors.danger }}
            style={{ borderColor: colors.danger + '66' }}
          />
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.xl, gap: spacing.md },
  centerPad: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryTint,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  date: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.primaryTint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  tagText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  rowText: { color: colors.text, fontSize: 14 },
  instructions: { color: colors.text, lineHeight: 22, fontSize: 14 },
});
