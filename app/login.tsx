import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { login } from "@/auth/session";
import { colors } from "@/ui/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleNumberPress = async (num: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    if (newPin.length >= 4) {
      setLoading(true);
      const staff = await login(newPin);
      setLoading(false);

      if (staff) {
        router.replace("/(tabs)");
        return;
      } else {
        setError(true);
        setPin("");
        setTimeout(() => setError(false), 500);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <View style={styles.container}>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>myERP</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i ? styles.dotFilled : null,
              error ? styles.dotError : null
            ]}
          />
        ))}
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}

      {error && (
        <Text style={styles.error}>Incorrect PIN. Try again.</Text>
      )}

      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key, i) => {
          if (key === "") {
            return <View key={i} style={styles.keyEmpty} />;
          }
          if (key === "back") {
            return (
              <Pressable key={i} onPress={handleBackspace} style={styles.key}>
                <Text style={styles.keyText}>⌫</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={i}
              onPress={() => handleNumberPress(key)}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 40
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900" as const,
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    textAlign: "center" as const
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#ffffff"
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  dotError: {
    borderColor: colors.warning,
    backgroundColor: colors.warning
  },
  error: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "700" as const
  },
  keypad: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    width: 280,
    justifyContent: "center" as const
  },
  key: {
    width: 80,
    height: 64,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    margin: 4,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border
  },
  keyEmpty: {
    width: 80,
    height: 64,
    margin: 4
  },
  keyPressed: {
    backgroundColor: colors.border
  },
  keyText: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700" as const
  }
});