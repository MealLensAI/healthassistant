import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  style,
  textStyle,
  children,
  ...rest
}) => {
  const height = size === 'sm' ? 38 : size === 'lg' ? 52 : 44;
  const base: ViewStyle = {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 22 : 18,
    height,
  };
  const variantStyle: Record<Variant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primaryDark,
      ...shadows.primaryButton,
    },
    secondary: { backgroundColor: colors.text },
    outline: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.danger },
    soft: {
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: colors.primary,
    },
  };
  const variantText: Record<Variant, TextStyle> = {
    primary: { color: '#fff', fontWeight: '600' },
    secondary: { color: '#fff', fontWeight: '600' },
    outline: { color: colors.text, fontWeight: '600' },
    ghost: { color: colors.primary, fontWeight: '600' },
    danger: { color: '#fff', fontWeight: '600' },
    soft: { color: colors.primary, fontWeight: '600' },
  };

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        base,
        variantStyle[variant],
        fullWidth && { width: '100%' },
        pressed && !isDisabled && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        isDisabled && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' || variant === 'soft' ? colors.primary : '#fff'}
        />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          {children ? (
            <View>{children}</View>
          ) : title ? (
            <Text style={[{ fontSize }, variantText[variant], textStyle]}>{title}</Text>
          ) : null}
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
};

export default Button;

export const buttonStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
});
