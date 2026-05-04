import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  variant?: 'filled' | 'outline' | 'days';
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export const SegmentedControl: React.FC<Props> = ({
  options,
  value,
  onChange,
  variant = 'filled',
  style,
  scrollable,
}) => {
  const content = (
    <View style={[styles.container, variant === 'days' && styles.daysContainer, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.item,
              variant === 'days' && styles.dayItem,
              variant === 'outline' && styles.outlineItem,
              active && variant === 'filled' && styles.itemActiveFilled,
              active && variant === 'days' && styles.dayItemActive,
              active && variant === 'outline' && styles.outlineItemActive,
            ]}
          >
            {opt.icon}
            <Text
              style={[
                styles.label,
                active && variant === 'filled' && styles.labelActive,
                active && variant === 'days' && styles.labelDayActive,
                active && variant === 'outline' && styles.labelOutlineActive,
                !active && styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        {content}
      </ScrollView>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgChip,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  daysContainer: {
    backgroundColor: colors.bgChip,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dayItem: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    minWidth: 42,
  },
  outlineItem: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    flex: undefined,
    paddingHorizontal: 14,
  },
  itemActiveFilled: { backgroundColor: '#fff' },
  dayItemActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineItemActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  label: { fontSize: 13, fontWeight: '500' },
  labelActive: { color: colors.text },
  labelDayActive: { color: colors.text, fontWeight: '600' },
  labelOutlineActive: { color: colors.primary, fontWeight: '600' },
  labelInactive: { color: colors.textMuted },
});

export default SegmentedControl;
