import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Button from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { colors, radius, shadows, spacing } from '@/lib/theme';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  href?: '/settings' | '/payment' | '/feedback';
  onPress?: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { settings, isHealthProfileComplete } = useSicknessSettings();

  const confirmSignOut = () => {
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const menuGroups: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: 'Account',
      items: [
        {
          icon: 'pulse-outline',
          label: 'Health Profile',
          subtitle: 'Condition, goals, biometrics, and diet',
          href: '/settings',
        },
        {
          icon: 'card-outline',
          label: 'Subscription',
          subtitle: 'Manage your MealLensAI plan',
          href: '/payment',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'chatbubble-ellipses-outline',
          label: 'Send feedback',
          subtitle: "We'd love to hear from you",
          href: '/feedback',
        },
      ],
    },
  ];

  const initials = (user?.displayName || user?.email || 'U').substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Manage your account and preferences</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'MealLens User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>

          {settings.hasSickness ? (
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: isHealthProfileComplete() ? colors.success : colors.warning }]} />
              <Text style={styles.statusText}>
                {isHealthProfileComplete() ? 'Health profile complete' : 'Health profile incomplete'}
              </Text>
            </View>
          ) : null}
        </View>

        {menuGroups.map((group) => (
          <View key={group.title} style={{ gap: spacing.sm }}>
            <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
            <View style={styles.group}>
              {group.items.map((item, index) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    if (item.onPress) item.onPress();
                    else if (item.href) router.push(item.href);
                  }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed && { backgroundColor: colors.bgSubtle },
                    index !== group.items.length - 1 && styles.menuRowDivider,
                  ]}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.subtitle ? (
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Button
          title="Log out"
          variant="outline"
          onPress={confirmSignOut}
          leftIcon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
          textStyle={{ color: colors.danger }}
          style={{ borderColor: colors.danger + '55', marginTop: spacing.md }}
        />

        <Text style={styles.footer}>MealLensAI • v1.0.0</Text>
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
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '33',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    marginTop: spacing.sm,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, color: colors.textBody, fontWeight: '500' },
  group: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  groupTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginLeft: 4 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  menuSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: spacing.xl },
});
