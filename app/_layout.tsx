import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { initializeDatabase, getBusiness, subscribeBusinessChange } from "@/db/database";
import { useSession } from "@/auth/session";
import { colors, fontSize } from "@/ui/theme";

// Prevent auto-hide so we control when the splash dismisses
SplashScreen.preventAutoHideAsync();

function useAuth() {
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<{ id: number } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const { staffId, loading } = useSession();

  useEffect(() => {
    if (loading) return;

    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      console.error("Database initialization timed out");
      setInitError("Database initialization timed out after 10 seconds.");
      setReady(true);
    }, 10_000);

    initializeDatabase()
      .then(async () => {
        if (didTimeout) return;
        const b = await getBusiness();
        setBusiness(b);
        setReady(true);
      })
      .catch((err) => {
        console.error("Database initialization failed:", err);
        if (!didTimeout) {
          setInitError(err instanceof Error ? err.message : String(err));
          setReady(true);
        }
      })
      .finally(() => clearTimeout(timeout));
  }, [loading]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const b = await getBusiness();
        setBusiness(b);
      } catch (err) {
        console.error("getBusiness failed:", err);
      }
    };
    return subscribeBusinessChange(refresh);
  }, []);

  return { ready, business, staffId, loading, initError };
}

export default function RootLayout() {
  const { ready, business, staffId, loading, initError } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Hide the splash screen once initialization is complete
  useEffect(() => {
    if (ready && !loading) {
      SplashScreen.hideAsync();
    }
  }, [ready, loading]);

  useEffect(() => {
    if (!ready || loading) return;

    const firstSegment = segments[0] as string | undefined;
    const isSetup = firstSegment === undefined || firstSegment === "index";
    const isLogin = firstSegment === "login";

    if (!business && !isSetup) {
      router.replace("/");
      return;
    }

    if (business && !staffId && !isLogin) {
      router.replace("/login");
      return;
    }

    if (business && staffId && (isSetup || isLogin)) {
      router.replace("/(tabs)");
    }
  }, [ready, business, staffId, loading, segments]);

  if (initError) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "800", marginBottom: 12 }}>
          Database error
        </Text>
        <Text style={{ color: colors.muted, fontSize: fontSize.base, lineHeight: 22 }}>
          {initError}
        </Text>
        <Text style={{ color: colors.muted, fontSize: fontSize.sm, marginTop: 16 }}>
          Cross-Origin Isolation may be required. Make sure SharedArrayBuffer is available (try a hard refresh).
        </Text>
      </View>
    );
  }

  // Return null while loading — the splash screen stays visible
  if (!ready || loading) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "800" },
          headerBackTitle: "",
          headerShadowVisible: false
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: "Scan barcode" }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
        <Stack.Screen name="staff/[id]" options={{ title: "Staff" }} />
        <Stack.Screen name="history" options={{ title: "Sales History" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="backup" options={{ title: "Backup" }} />
      </Stack>
    </>
  );
}