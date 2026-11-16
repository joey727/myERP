import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { login } from "@/auth/session";
import { useBusiness } from "@/business";
import { createStyles, useTheme } from "@/ui/design";
import { AppText } from "@/ui/primitives";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "blank", "0", "back"];

export default function LoginScreen() {
  const styles = useLoginStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { business } = useBusiness();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const shake = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }]
  }));

  function fail() {
    setError(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (!reduceMotion) {
      shake.set(
        withSequence(
          withTiming(-8, { duration: 55 }),
          withTiming(8, { duration: 55 }),
          withTiming(-5, { duration: 55 }),
          withTiming(5, { duration: 55 }),
          withTiming(0, { duration: 55 })
        )
      );
    }
    setTimeout(() => {
      setPin("");
      setError(false);
    }, 420);
  }

  function press(key: string) {
    if (loading || error) return;
    if (key === "back") {
      void Haptics.selectionAsync();
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    void Haptics.selectionAsync();
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      setLoading(true);
      login(next)
        .then((staff) => {
          setLoading(false);
          if (staff) {
            router.replace("/(tabs)");
            return;
          }
          fail();
        })
        .catch(() => {
          setLoading(false);
          fail();
        });
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= "0" && event.key <= "9") press(event.key);
      if (event.key === "Backspace") press("back");
    }
    if (Platform.OS === "web") {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  });

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 32 }
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.brandText}>
            <AppText center variant="title1">
              {business?.name ?? "myERP"}
            </AppText>
            <AppText center tone="secondary" variant="small">
              Enter your PIN to open the till
            </AppText>
          </View>
        </View>

        <Animated.View style={[styles.pinArea, animatedStyle]}>
          <View
            accessibilityLabel={`${pin.length} of 4 digits entered`}
            accessibilityLiveRegion="polite"
            style={styles.dots}
          >
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  pin.length > index && styles.dotFilled,
                  error && styles.dotError
                ]}
              />
            ))}
          </View>
          <View style={styles.status}>
            {loading ? (
              <View style={styles.statusRow}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <AppText tone="secondary" variant="small">
                  Checking PIN
                </AppText>
              </View>
            ) : error ? (
              <AppText tone="danger" variant="smallStrong">
                Incorrect PIN. Try again.
              </AppText>
            ) : (
              <AppText tone="muted" variant="small">
                Every person has their own PIN
              </AppText>
            )}
          </View>
        </Animated.View>

        <View style={styles.keypad}>
          {keys.map((key) => {
            if (key === "blank") {
              return <View key={key} style={styles.keyBlank} />;
            }
            return (
              <Pressable
                accessibilityLabel={key === "back" ? "Delete digit" : key}
                accessibilityRole="button"
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                {key === "back" ? (
                  <Ionicons
                    color={theme.colors.inkSecondary}
                    name="backspace-outline"
                    size={24}
                  />
                ) : (
                  <AppText variant="title2">{key}</AppText>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Ionicons color={theme.colors.muted} name="cloud-offline-outline" size={14} />
          <AppText tone="muted" variant="caption">
            Works without internet
          </AppText>
        </View>
      </View>
    </View>
  );
}

const loginStyles = createStyles((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: "center"
  },
  content: {
    alignSelf: "center",
    flex: 1,
    gap: theme.space["2xl"],
    justifyContent: "center",
    maxWidth: 380,
    paddingHorizontal: theme.space.xl,
    width: "100%"
  },
  brand: { alignItems: "center", gap: theme.space.md },
  brandText: { gap: theme.space.xxs },
  pinArea: { alignItems: "center", gap: theme.space.sm },
  dots: { flexDirection: "row", gap: theme.space.md },
  dot: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    height: 16,
    width: 16
  },
  dotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  dotError: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger
  },
  status: { alignItems: "center", minHeight: 22, justifyContent: "center" },
  statusRow: { alignItems: "center", flexDirection: "row", gap: theme.space.xs },
  keypad: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.xs,
    justifyContent: "center",
    maxWidth: 300
  },
  key: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: "30%"
  },
  keyPressed: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  keyBlank: { height: 64, width: "30%" },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center"
  }
}));
const useLoginStyles = () => loginStyles();
