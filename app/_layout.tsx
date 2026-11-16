import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeDatabase, getBusiness, subscribeBusinessChange } from "@/db/database";
import { useSession } from "@/auth/session";
import type { Business } from "@/db/types";
import { BusinessProvider } from "@/business";
import { recordAppOpen } from "@/lib/usage";
import { ThemeProvider, useTheme } from "@/ui/design";
import { ConfirmHost } from "@/ui/hosts";
import { AppText, Screen, ToastHost } from "@/ui/primitives";

SplashScreen.preventAutoHideAsync();

function useAuth() {
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const { staffId, loading } = useSession();

  function refreshBusiness() {
    getBusiness()
      .then(setBusiness)
      .catch((err) => console.error("getBusiness failed:", err));
  }

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
    return subscribeBusinessChange(refreshBusiness);
  }, []);

  return { ready, business, staffId, loading, initError, refreshBusiness };
}

export default function RootLayout() {
  const { ready, business, staffId, loading, initError, refreshBusiness } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (ready && !loading) {
      SplashScreen.hideAsync();
    }
  }, [ready, loading]);

  useEffect(() => {
    if (ready) recordAppOpen();
  }, [ready]);

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
  }, [ready, business, staffId, loading, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BusinessProvider business={business} refresh={refreshBusiness}>
            {initError ? (
              <DatabaseError message={initError} />
            ) : !ready || loading ? null : (
              <RootNavigator />
            )}
          </BusinessProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerBackTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontWeight: "600" }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
        <Stack.Screen name="staff/[id]" options={{ title: "Staff member" }} />
        <Stack.Screen name="history" options={{ title: "Sales history" }} />
        <Stack.Screen name="audit" options={{ title: "Stock audit" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="backup" options={{ title: "Backup and export" }} />
        <Stack.Screen name="updates" options={{ title: "App updates" }} />
      </Stack>
      <ToastHost />
      <ConfirmHost />
    </>
  );
}

function DatabaseError({ message }: { message: string }) {
  return (
    <Screen safeTop>
      <View style={{ gap: 8 }}>
        <AppText variant="title1">Database error</AppText>
        <AppText tone="secondary">{message}</AppText>
        <AppText tone="muted" variant="small">
          Cross-origin isolation may be required. Make sure SharedArrayBuffer is
          available, then reload the app.
        </AppText>
      </View>
    </Screen>
  );
}
