import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type DimensionValue,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import Animated, {
  cancelAnimation,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCurrency } from "@/business";
import { formatMoney } from "@/lib/money";
import { createStyles, useResponsive, useTheme } from "./design";
import { subscribeToasts, type ToastItem, type ToastTone } from "./dialog";
import { tabBarHeight, type TypeVariant } from "./tokens";

type Tone =
  | "default"
  | "secondary"
  | "muted"
  | "primary"
  | "success"
  | "danger"
  | "attention"
  | "onPrimary";

function toneColor(theme: ReturnType<typeof useTheme>, tone: Tone) {
  switch (tone) {
    case "secondary":
      return theme.colors.inkSecondary;
    case "muted":
      return theme.colors.muted;
    case "primary":
      return theme.colors.primary;
    case "success":
      return theme.colors.success;
    case "danger":
      return theme.colors.danger;
    case "attention":
      return theme.colors.attention;
    case "onPrimary":
      return theme.colors.onPrimary;
    default:
      return theme.colors.ink;
  }
}

export function AppText({
  variant = "body",
  tone = "default",
  numeric = false,
  center = false,
  style,
  children,
  ...rest
}: TextProps & {
  variant?: TypeVariant;
  tone?: Tone;
  numeric?: boolean;
  center?: boolean;
}) {
  const theme = useTheme();
  const base = theme.type[variant];
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: toneColor(theme, tone) },
        numeric && { fontVariant: ["tabular-nums"] },
        center && { textAlign: "center" },
        style
      ]}
    >
      {children}
    </RNText>
  );
}

export function Money({
  amount,
  variant = "bodyStrong",
  tone = "default",
  style
}: {
  amount: number;
  variant?: TypeVariant;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
}) {
  const currency = useCurrency();
  return (
    <AppText numeric style={style} tone={tone} variant={variant}>
      {formatMoney(amount, currency)}
    </AppText>
  );
}

export function Screen({
  children,
  scroll = true,
  safeTop = false,
  padded = true,
  maxWidth,
  bottomSpace,
  contentStyle,
  keyboard = false,
  style
}: {
  children: ReactNode;
  scroll?: boolean;
  safeTop?: boolean;
  padded?: boolean;
  maxWidth?: number;
  bottomSpace?: number;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useScreenStyles();
  const insets = useSafeAreaInsets();
  const { isCompact, isMedium } = useResponsive();
  const horizontal = padded ? (isCompact ? 16 : isMedium ? 24 : 32) : 0;
  const top = safeTop ? insets.top + (isCompact ? 12 : 20) : 0;
  const bottom = bottomSpace ?? (safeTop ? 24 : 16);
  const inner = (
    <View
      style={[
        styles.inner,
        {
          maxWidth: maxWidth ?? 1200,
          paddingHorizontal: horizontal,
          paddingTop: top,
          paddingBottom: bottom
        },
        contentStyle
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {inner}
    </ScrollView>
  ) : (
    inner
  );

  return (
    <View style={[styles.root, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.scroll}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  size = "title1"
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  size?: "display" | "title1" | "title2";
}) {
  const styles = useHeaderStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant={size}>{title}</AppText>
        {subtitle ? (
          <AppText tone="secondary" variant="small">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic = false,
  style
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useButtonStyles();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }]
  }));
  const inactive = disabled || loading;

  function pressIn() {
    if (reduceMotion) return;
    scale.set(withTiming(0.97, { duration: theme.motion.press }));
  }

  function pressOut() {
    if (reduceMotion) return;
    scale.set(withTiming(1, { duration: theme.motion.press }));
  }

  const textTone: Tone =
    variant === "primary"
      ? "onPrimary"
      : variant === "danger"
        ? "danger"
        : variant === "secondary"
          ? "primary"
          : "primary";

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={() => {
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          styles.base,
          size === "sm" && styles.sm,
          size === "lg" && styles.lg,
          variant === "primary" && styles.primary,
          variant === "secondary" && styles.secondary,
          variant === "ghost" && styles.ghost,
          variant === "danger" && styles.danger,
          variant === "link" && styles.link,
          inactive && variant !== "link" && styles.disabled,
          inactive && variant === "link" && styles.disabledLink,
          fullWidth && styles.fullWidth
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={
              inactive
                ? theme.colors.muted
                : variant === "primary"
                  ? theme.colors.onPrimary
                  : variant === "danger"
                    ? theme.colors.danger
                    : theme.colors.primary
            }
            size="small"
          />
        ) : (
          <>
            {icon ? (
              <Ionicons
                color={toneColor(theme, inactive ? "muted" : textTone)}
                name={icon}
                size={size === "sm" ? 16 : 18}
              />
            ) : null}
            <AppText
              style={styles.label}
              tone={inactive ? "muted" : textTone}
              variant={size === "sm" ? "smallStrong" : "bodyStrong"}
            >
              {title}
            </AppText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = "default",
  variant = "ghost",
  size = 44
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger" | "muted";
  variant?: "ghost" | "tonal";
  size?: number;
}) {
  const styles = useIconButtonStyles();
  const theme = useTheme();
  const color =
    tone === "primary"
      ? theme.colors.primary
      : tone === "danger"
        ? theme.colors.danger
        : tone === "muted"
          ? theme.colors.muted
          : theme.colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height: size, width: size },
        variant === "tonal" && styles.tonal,
        pressed && { opacity: 0.65 }
      ]}
    >
      <Ionicons color={color} name={icon} size={size >= 44 ? 22 : 18} />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  editable = true,
  error,
  hint,
  right,
  autoFocus,
  maxLength,
  autoCapitalize,
  textContentType,
  returnKeyType,
  onSubmitEditing
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: string;
  hint?: string;
  right?: ReactNode;
  autoFocus?: boolean;
  maxLength?: number;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  textContentType?: TextInputProps["textContentType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
}) {
  const styles = useFieldStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const secure = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText tone="secondary" variant="label">
          {label}
        </AppText>
        {hint ? (
          <AppText tone="muted" variant="caption">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.inputShell,
          focused && { borderColor: theme.colors.focus },
          error ? { borderColor: theme.colors.danger } : null,
          !editable && styles.inputDisabled
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          returnKeyType={returnKeyType}
          secureTextEntry={secure && !revealed}
          selectionColor={theme.colors.primary}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
        {secure ? (
          <IconButton
            icon={revealed ? "eye-off-outline" : "eye-outline"}
            label={revealed ? "Hide PIN" : "Show PIN"}
            onPress={() => setRevealed((current) => !current)}
            tone="muted"
            size={40}
          />
        ) : null}
        {right}
      </View>
      {error ? (
        <AppText tone="danger" variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  onSubmitEditing
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
}) {
  const styles = useSearchStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[styles.shell, focused && { borderColor: theme.colors.focus }]}
    >
      <Ionicons color={theme.colors.muted} name="search-outline" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        returnKeyType="search"
        selectionColor={theme.colors.primary}
        style={styles.input}
        value={value}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close-circle"
          label="Clear search"
          onPress={() => onChangeText("")}
          size={36}
          tone="muted"
        />
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useSegmentedStyles();
  return (
    <View accessibilityRole="tablist" style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <AppText
              style={styles.label}
              tone={selected ? "default" : "secondary"}
              variant="smallStrong"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useChipStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && { opacity: 0.75 }
      ]}
    >
      {icon ? (
        <Ionicons
          color={selected ? theme.colors.primarySoftText : theme.colors.inkSecondary}
          name={icon}
          size={15}
        />
      ) : null}
      <AppText
        tone={selected ? "primary" : "secondary"}
        variant="smallStrong"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = "neutral",
  icon
}: {
  label: string;
  tone?: "neutral" | "success" | "attention" | "danger" | "primary";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useBadgeStyles();
  const theme = useTheme();
  const color =
    tone === "success"
      ? theme.colors.success
      : tone === "attention"
        ? theme.colors.attention
        : tone === "danger"
          ? theme.colors.danger
          : tone === "primary"
            ? theme.colors.primary
            : theme.colors.inkSecondary;
  const background =
    tone === "success"
      ? theme.colors.successSoft
      : tone === "attention"
        ? theme.colors.attentionSoft
        : tone === "danger"
          ? theme.colors.dangerSoft
          : tone === "primary"
            ? theme.colors.primarySoft
            : theme.colors.surfaceAlt;

  return (
    <View style={[styles.base, { backgroundColor: background }]}>
      {icon ? <Ionicons color={color} name={icon} size={12} /> : null}
      <AppText style={{ color }} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

export function ListRow({
  children,
  onPress,
  right,
  showChevron = false,
  divider = true,
  accessibilityLabel
}: {
  children: ReactNode;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  divider?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useRowStyles();
  const theme = useTheme();
  const content = (
    <>
      <View style={styles.main}>{children}</View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {showChevron ? (
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={18} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, divider && styles.divider]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && { backgroundColor: theme.colors.surfaceAlt }
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  style
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useSectionStyles();
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.head}>
          <View style={styles.headText}>
            {title ? <AppText variant="title3">{title}</AppText> : null}
            {description ? (
              <AppText tone="secondary" variant="small">
                {description}
              </AppText>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Surface({
  children,
  style,
  padded = true
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const styles = useSurfaceStyles();
  return (
    <View style={[styles.surface, padded && styles.padded, style]}>{children}</View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const styles = useEmptyStyles();
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons color={theme.colors.primary} name={icon} size={26} />
      </View>
      <AppText center variant="title3">
        {title}
      </AppText>
      {message ? (
        <AppText center tone="secondary" variant="small">
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function Skeleton({
  width = "100%",
  height = 20,
  radius = 8
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.set(0.5);
      return;
    }
    opacity.set(withRepeat(withTiming(0.9, { duration: 800 }), -1, true));
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.colors.border, borderRadius: radius, height, width },
        animatedStyle
      ]}
    />
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const styles = useAvatarStyles();
  const parts = name.split(" ").filter(Boolean);
  const initials = (
    parts.length === 1
      ? parts[0]?.slice(0, 2)
      : parts
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
  )?.toUpperCase();
  return (
    <View style={[styles.base, { height: size, width: size, borderRadius: size / 2 }]}>
      <AppText style={{ fontSize: size * 0.36 }} variant="smallStrong">
        {initials || "?"}
      </AppText>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 560
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  const styles = useSheetStyles();
  const { isCompact } = useResponsive();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType={reduceMotion ? "none" : isCompact ? "slide" : "fade"}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        style={[
          styles.overlay,
          isCompact ? styles.overlayBottom : styles.overlayCenter
        ]}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { outlineStyle: "solid", outlineWidth: 0 }
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.panel,
            isCompact
              ? { paddingBottom: Math.max(insets.bottom, 12) }
              : { maxWidth, marginBottom: 24, marginTop: 24 }
          ]}
        >
          {isCompact ? <View style={styles.grabber} /> : null}
          {title ? (
            <View style={styles.head}>
              <View style={styles.headText}>
                <AppText variant="title3">{title}</AppText>
                {description ? (
                  <AppText tone="secondary" variant="small">
                    {description}
                  </AppText>
                ) : null}
              </View>
              <IconButton icon="close" label="Close" onPress={onClose} tone="muted" />
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function ToastHost() {
  const styles = useToastStyles();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unsubscribe = subscribeToasts((toast) => {
      setToasts((current) => [...current.slice(-2), toast]);
      timers.push(
        setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== toast.id));
        }, 3400)
      );
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }]}
    >
      {toasts.map((toast) => {
        const tone: ToastTone = toast.tone ?? "default";
        const color =
          tone === "success"
            ? theme.colors.success
            : tone === "danger"
              ? theme.colors.danger
              : theme.colors.primary;
        return (
          <Animated.View
            entering={
              reduceMotion ? undefined : FadeInDown.duration(theme.motion.toast)
            }
            exiting={reduceMotion ? undefined : FadeOutUp.duration(150)}
            key={toast.id}
            style={styles.toast}
          >
            <Ionicons
              color={color}
              name={
                tone === "success"
                  ? "checkmark-circle"
                  : tone === "danger"
                    ? "alert-circle"
                    : "information-circle"
              }
              size={20}
            />
            <View style={styles.toastText}>
              <AppText variant="smallStrong">{toast.title}</AppText>
              {toast.message ? (
                <AppText tone="secondary" variant="caption">
                  {toast.message}
                </AppText>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function useBottomNavSpace() {
  const { isCompact } = useResponsive();
  const insets = useSafeAreaInsets();
  return isCompact ? tabBarHeight + insets.bottom + 12 : 24;
}

const screenStyles = createStyles((theme) => ({
  root: { backgroundColor: theme.colors.background, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { alignSelf: "center", gap: theme.space.md, width: "100%" }
}));
const useScreenStyles = () => screenStyles();

const headerStyles = createStyles((theme) => ({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between",
    paddingBottom: theme.space.xs
  },
  headerText: { flex: 1, gap: theme.space.xxs },
  headerRight: { alignItems: "center", flexDirection: "row", gap: theme.space.xs }
}));
const useHeaderStyles = () => headerStyles();

const buttonStyles = createStyles((theme) => ({
  base: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.space.md
  },
  sm: { minHeight: 40, paddingHorizontal: theme.space.sm },
  lg: { minHeight: 56, paddingHorizontal: theme.space.lg },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.primarySoft },
  ghost: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  danger: { backgroundColor: theme.colors.dangerSoft },
  link: { backgroundColor: "transparent", minHeight: 32, paddingHorizontal: 0 },
  disabled: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  disabledLink: { opacity: 0.6 },
  fullWidth: { alignSelf: "stretch", width: "100%" },
  label: { letterSpacing: 0.1 }
}));
const useButtonStyles = () => buttonStyles();

const iconButtonStyles = createStyles((theme) => ({
  base: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    justifyContent: "center"
  },
  tonal: { backgroundColor: theme.colors.surfaceAlt }
}));
const useIconButtonStyles = () => iconButtonStyles();

const fieldStyles = createStyles((theme) => ({
  field: { gap: theme.space.xxs },
  labelRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: theme.space.xs,
    justifyContent: "space-between"
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingRight: theme.space.xxs
  },
  input: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    outlineWidth: 0,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 0
  },
  inputDisabled: { backgroundColor: theme.colors.surfaceAlt, opacity: 0.8 }
}));
const useFieldStyles = () => fieldStyles();

const searchStyles = createStyles((theme) => ({
  shell: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.space.xs,
    minHeight: 48,
    paddingLeft: theme.space.sm,
    paddingRight: theme.space.xxs
  },
  input: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 46,
    outlineWidth: 0,
    paddingVertical: 0
  }
}));
const useSearchStyles = () => searchStyles();

const segmentedStyles = createStyles((theme) => ({
  group: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    padding: 3
  },
  item: {
    alignItems: "center",
    borderRadius: theme.radius.xs,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: theme.space.xs
  },
  itemSelected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  label: { textAlign: "center" }
}));
const useSegmentedStyles = () => segmentedStyles();

const chipStyles = createStyles((theme) => ({
  base: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: theme.space.md
  },
  selected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  }
}));
const useChipStyles = () => chipStyles();

const badgeStyles = createStyles((theme) => ({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: theme.radius.xs,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.space.xs,
    paddingVertical: 3
  }
}));
const useBadgeStyles = () => badgeStyles();

const rowStyles = createStyles((theme) => ({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    minHeight: 56,
    paddingVertical: theme.space.sm
  },
  divider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  main: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end", gap: 2 }
}));
const useRowStyles = () => rowStyles();

const sectionStyles = createStyles((theme) => ({
  section: { gap: theme.space.xs },
  head: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between"
  },
  headText: { flex: 1, gap: 2 }
}));
const useSectionStyles = () => sectionStyles();

const surfaceStyles = createStyles((theme) => ({
  surface: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1
  },
  padded: { padding: theme.space.md }
}));
const useSurfaceStyles = () => surfaceStyles();

const emptyStyles = createStyles((theme) => ({
  wrap: {
    alignItems: "center",
    gap: theme.space.xs,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xl
  },
  icon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.full,
    height: 56,
    justifyContent: "center",
    marginBottom: theme.space.xxs,
    width: 56
  },
  action: { marginTop: theme.space.xs }
}));
const useEmptyStyles = () => emptyStyles();

const avatarStyles = createStyles((theme) => ({
  base: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    justifyContent: "center"
  }
}));
const useAvatarStyles = () => avatarStyles();

const sheetStyles = createStyles((theme) => ({
  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBottom: {
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end"
  },
  overlayCenter: {
    alignItems: "center",
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: theme.space.lg
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: "92%",
    overflow: "hidden",
    width: "100%"
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: theme.colors.borderStrong,
    borderRadius: theme.radius.full,
    height: 4,
    marginTop: theme.space.xs,
    width: 40
  },
  head: {
    alignItems: "flex-start",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between",
    padding: theme.space.md
  },
  headText: { flex: 1, gap: 2 },
  body: { gap: theme.space.md, padding: theme.space.md },
  footer: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: theme.space.xs,
    padding: theme.space.md
  }
}));
const useSheetStyles = () => sheetStyles();

const toastStyles = createStyles((theme) => ({
  host: {
    alignItems: "center",
    left: theme.space.md,
    position: "absolute",
    right: theme.space.md,
    zIndex: 1000
  },
  toast: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
    maxWidth: 440,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: "100%"
  },
  toastText: { flex: 1, gap: 1 }
}));
const useToastStyles = () => toastStyles();
