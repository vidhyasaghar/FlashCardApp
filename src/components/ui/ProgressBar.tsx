import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, Radius } from '../../theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color,
  height = 6,
  animated = true,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clamped,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped, animated]);

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.border, height, borderRadius: Radius.full },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color ?? theme.accent,
            height,
            borderRadius: Radius.full,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: {},
});
