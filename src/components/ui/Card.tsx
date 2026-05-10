import { TouchableOpacity, View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { useTheme, Radius, Spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: scheme === 'dark' ? 1 : 0.5,
    shadowColor: theme.cardShadow,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, base, padded && styles.padded, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, base, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  padded: {
    padding: Spacing.md,
  },
});
