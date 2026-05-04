import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/theme';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; withText?: boolean }> = ({
  size = 'md',
  withText = true,
}) => {
  const boxSize = size === 'sm' ? 28 : size === 'lg' ? 42 : size === 'xl' ? 56 : 34;
  const letterSize = size === 'sm' ? 14 : size === 'lg' ? 22 : size === 'xl' ? 28 : 18;
  const textSize = size === 'sm' ? 14 : size === 'lg' ? 20 : size === 'xl' ? 26 : 16;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.box,
          {
            width: boxSize,
            height: boxSize,
            borderRadius: radius.xs,
          },
        ]}
      >
        <Text style={[styles.letter, { fontSize: letterSize }]}>M</Text>
      </View>
      {withText ? (
        <Text style={[styles.text, { fontSize: textSize }]}>
          Meal<Text style={{ color: colors.primary }}>Lens</Text>AI
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#fff',
    fontWeight: '700',
  },
  text: {
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.2,
  },
});

export default Logo;
