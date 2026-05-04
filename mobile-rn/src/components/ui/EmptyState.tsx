import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';

interface Props {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  children?: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'warning';
}

export const EmptyState: React.FC<Props> = ({
  icon = 'sparkles-outline',
  title,
  description,
  children,
  tone = 'neutral',
}) => {
  const bgMap = {
    neutral: colors.bgSubtle,
    primary: colors.primaryTint,
    warning: '#FFF7ED',
  } as const;
  const iconColorMap = {
    neutral: colors.textMuted,
    primary: colors.primary,
    warning: '#F59E0B',
  } as const;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: bgMap[tone] }]}>
        <Ionicons name={icon} size={32} color={iconColorMap[tone]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {children ? <View style={{ marginTop: spacing.lg, width: '100%', alignItems: 'center' }}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 320 },
});

export default EmptyState;
