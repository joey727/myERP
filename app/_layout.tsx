import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { initializeDatabase, getBusiness } from "@/db/database";
import { useSession } from "@/auth/session";
import { colors } from "@/ui/theme";

// Prevent auto-hide so we control when the splash dismisses
SplashScreen.preventAutoHideAsync();

function useAuth() {
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<{ id: number } | null>(null);
  const { staffId, loading } = useSession();

  useEffect(() => {
    if (loading) return;

    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      console.error("Database initialization timed out");
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
        if (!didTimeout) setReady(true);
      })
      .finally(() => clearTimeout(timeout));
  }, [loading]);

  return { ready, business, staffId, loading };
}

export default function RootLayout() {
  const { ready, business, staffId, loading } = useAuth();
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