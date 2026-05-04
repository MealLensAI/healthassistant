import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from './theme';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastCtx {
  toast: (t: ToastInput) => void;
}

const Ctx = createContext<ToastCtx | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<ToastInput | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const toast = useCallback(
    (t: ToastInput) => {
      clearTimer();
      setCurrent(t);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setCurrent(null);
        });
      }, t.duration ?? 3200);
    },
    [opacity]
  );

  useEffect(() => () => clearTimer(), []);

  const bg =
    current?.variant === 'destructive'
      ? colors.danger
      : current?.variant === 'success'
      ? colors.success
      : current?.variant === 'warning'
      ? colors.warning
      : colors.text;

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {current && (
        <Animated.View
          pointerEvents="none"
          style={[styles.container, shadows.md, { backgroundColor: bg, opacity }]}
        >
          {current.title ? <Text style={styles.title}>{current.title}</Text> : null}
          {current.description ? <Text style={styles.desc}>{current.description}</Text> : null}
        </Animated.View>
      )}
    </Ctx.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    zIndex: 9999,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  desc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
});

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
