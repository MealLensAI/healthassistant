import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  isPassword,
  secureTextEntry,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const effectiveSecure = isPassword ? !pwVisible : secureTextEntry;
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, focused && styles.focused, !!error && styles.error]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          secureTextEntry={effectiveSecure}
          placeholderTextColor={colors.textFaint}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 6 } : null,
            rightIcon || isPassword ? { paddingRight: 6 } : null,
            style,
          ]}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setPwVisible((v) => !v)} style={styles.iconRight}>
            <Ionicons
              name={pwVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

export default Input;

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textBody,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    minHeight: 46,
  },
  focused: { borderColor: colors.primary },
  error: { borderColor: colors.danger },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconLeft: { paddingLeft: 12 },
  iconRight: { paddingHorizontal: 12 },
  errorText: { marginTop: 4, color: colors.danger, fontSize: 12 },
  hint: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
});
