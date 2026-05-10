import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import "react-native-gesture-handler";

import { initializeDatabase } from "@/db/database";
import { getBusiness } from "@/db/database";
import { useSession, initializeSession } from "@/auth/session";
import { colors } from "@/ui/theme";

function useAuth() {
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<{ id: number } | null>(null);
  const { staffId, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    initializeDatabase().then(async () => {
      const b = await getBusiness();
      setBusiness(b);
      setReady(true);
    });
  }, [loading]);

  return { ready, business, staffId, loading };
}

export default function RootLayout() {
  const { ready, business, staffId, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

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

  if (!ready || loading) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.background, flex: 1, gap: 12, justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.muted, fontWeight: "700" }}>Preparing local records</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink }}>
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