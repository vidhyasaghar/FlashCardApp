import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme, Radius, Typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    backgroundColor:
      variant === 'primary' ? theme.accent
      : variant === 'secondary' ? theme.accentLight
      : variant === 'danger' ? theme.dangerLight
      : 'transparent',
    opacity: disabled || loading ? 0.5 : 1,
  };

  const textColor =
    variant === 'primary' ? '#FFFFFF'
    : variant === 'secondary' ? theme.accentText
    : variant === 'danger' ? theme.danger
    : theme.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  label: {
    ...Typography.h3,
  },
});
