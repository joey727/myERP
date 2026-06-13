import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";

import { colors, fontSize, radius, shadow } from "./theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  secureTextEntry,
  editable
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  placeholder?: string;
  secureTextEntry?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        secureTextEntry={secureTextEntry}
        style={[styles.input, editable === false && { color: colors.muted }]}
        value={value}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.primaryButtonPressed
      ]}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.disabledSecondaryButton,
        pressed && !disabled && styles.secondaryButtonPressed
      ]}
    >
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function Stat({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <View style={[styles.stat, shadow.sm]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "warning" && styles.warning, tone === "success" && styles.success]}>
        {value}
      </Text>
    </View>
  );
}

// --- New shared components ---

export function Chip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  items,
  selected,
  onSelect,
  labelFn
}: {
  items: readonly T[];
  selected: T;
  onSelect: (item: T) => void;
  labelFn?: (item: T) => string;
}) {
  return (
    <View style={styles.chipGroup}>
      {items.map((item) => (
        <Chip
          key={item}
          label={labelFn ? labelFn(item) : item}
          onPress={() => onSelect(item)}
          selected={selected === item}
        />
      ))}
    </View>
  );
}

export function ScreenLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <Screen>
      <View style={styles.loaderContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loaderText}>{message}</Text>
      </View>
    </Screen>
  );
}

export function Skeleton({ width, height = 20 }: { width: number | string; height?: number }) {
  const opacity = new Animated.Value(0.3);

  Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
    ])
  ).start();

  return (
    <Animated.View
      style={{
        backgroundColor: colors.border,
        borderRadius: radius.sm,
        height,
        opacity,
        width: width as number
      }}
    />
  );
}

export function EmptyState({
  icon,
  title,
  subtitle
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons color={colors.muted} name={icon} size={32} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      </View>
    </Card>
  );
}

export function ActionButton({
  title,
  onPress,
  variant = "primary"
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "destructive";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "destructive" && styles.actionButtonDestructive,
        pressed && styles.actionButtonPressed
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "destructive" && styles.actionButtonTextDestructive
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = "success"
}: {
  label: string;
  tone?: "success" | "warning" | "muted";
}) {
  const bgColor = tone === "success" ? colors.successBg : tone === "warning" ? colors.warningBg : colors.disabledAlt;
  const textColor = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.muted;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    gap: 16
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    ...shadow.sm
  },
  field: {
    gap: 6
  },
  label: {
    color: colors.ink,
    fontSize: fontSize.base,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: fontSize.lg,
    minHeight: 48,
    paddingHorizontal: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark
  },
  disabledButton: {
    backgroundColor: colors.disabledBg
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: fontSize.lg,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonPressed: {
    backgroundColor: colors.primaryLight
  },
  disabledSecondaryButton: {
    backgroundColor: colors.disabledAlt,
    borderColor: colors.border
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800"
  },
  stat: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    padding: 12,
    justifyContent: "space-between"
  },
  statLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: "700"
  },
  statValue: {
    color: colors.ink,
    fontSize: fontSize["2xl"],
    fontWeight: "900"
  },
  warning: {
    color: colors.warning
  },
  success: {
    color: colors.success
  },
  chip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipPressed: {
    backgroundColor: colors.panelAlt
  },
  chipText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: fontSize.base
  },
  chipTextSelected: {
    color: "#ffffff"
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  loaderText: {
    color: colors.muted,
    fontWeight: "700"
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16
  },
  emptyIconContainer: {
    backgroundColor: colors.panelAlt,
    borderRadius: 24,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: "800",
    textAlign: "center"
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 21,
    textAlign: "center"
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  actionButtonDestructive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.warning
  },
  actionButtonPressed: {
    opacity: 0.8
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: fontSize.base,
    fontWeight: "700"
  },
  actionButtonTextDestructive: {
    color: colors.warning
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start"
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: "800",
    textTransform: "uppercase"
  }
});
