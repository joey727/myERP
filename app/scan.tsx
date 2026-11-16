import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createStyles, useTheme } from "@/ui/design";
import { AppText, Button, IconButton, Screen } from "@/ui/primitives";

export default function ScanScreen() {
  const styles = useScanStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  if (!permission) {
    return (
      <Screen safeTop>
        <View style={styles.permission}>
          <AppText tone="secondary">Checking camera permission…</AppText>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen maxWidth={520} safeTop>
        <View style={styles.permission}>
          <View style={styles.permissionIcon}>
            <Ionicons color={theme.colors.primary} name="camera-outline" size={30} />
          </View>
          <AppText center variant="title2">
            Camera access
          </AppText>
          <AppText center tone="secondary">
            Scanning barcodes needs the camera. Nothing is recorded or uploaded.
          </AppText>
          <Button
            fullWidth
            icon="camera-outline"
            onPress={requestPermission}
            title="Allow camera"
          />
          <Button
            fullWidth
            onPress={() => router.back()}
            title="Not now"
            variant="ghost"
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"]
        }}
        enableTorch={torch}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                const pathname =
                  target === "sales" ? "/(tabs)/sales" : "/(tabs)/inventory";
                router.replace({ pathname, params: { barcode: data } });
              }
        }
        style={styles.camera}
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon="close"
            label="Close scanner"
            onPress={() => router.back()}
            tone="default"
            variant="tonal"
          />
          <View style={styles.topLabel}>
            <AppText center style={styles.topLabelText} variant="smallStrong">
              Scan barcode
            </AppText>
          </View>
          <IconButton
            icon={torch ? "flash" : "flash-outline"}
            label={torch ? "Turn torch off" : "Turn torch on"}
            onPress={() => setTorch((current) => !current)}
            tone={torch ? "primary" : "default"}
            variant="tonal"
          />
        </View>

        <View pointerEvents="none" style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.scanLine} />
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.hint}>
            <Ionicons color="#FFFFFF" name="scan-outline" size={18} />
            <AppText center style={styles.hintText} variant="small">
              Place the barcode inside the frame. It is detected automatically.
            </AppText>
          </View>
          <Pressable onPress={() => router.back()} style={styles.cancel}>
            <AppText style={styles.cancelText} variant="smallStrong">
              Enter barcode manually
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const scanStyles = createStyles((theme) => ({
  root: { backgroundColor: "#000000", flex: 1 },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheetAbsolute,
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.md,
    width: "100%"
  },
  topLabel: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.space.md,
    paddingVertical: 6
  },
  topLabelText: { color: "#FFFFFF" },
  frame: {
    height: 190,
    justifyContent: "center",
    width: "78%"
  },
  corner: {
    borderColor: "#FFFFFF",
    height: 28,
    position: "absolute",
    width: 28
  },
  topLeft: { borderLeftWidth: 3, borderTopLeftRadius: 8, borderTopWidth: 3, left: 0, top: 0 },
  topRight: { borderRightWidth: 3, borderTopRightRadius: 8, borderTopWidth: 3, right: 0, top: 0 },
  bottomLeft: {
    borderBottomLeftRadius: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0
  },
  bottomRight: {
    borderBottomRightRadius: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0
  },
  scanLine: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: 2,
    opacity: 0.9,
    width: "100%"
  },
  bottom: {
    alignItems: "center",
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    width: "100%"
  },
  hint: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  hintText: { color: "#FFFFFF", flex: 1 },
  cancel: { padding: theme.space.sm },
  cancelText: { color: "#FFFFFF" },
  permission: {
    alignItems: "center",
    flex: 1,
    gap: theme.space.md,
    justifyContent: "center"
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.full,
    height: 64,
    justifyContent: "center",
    width: 64
  }
}));
const useScanStyles = () => scanStyles();

const StyleSheetAbsolute = {
  bottom: 0,
  left: 0,
  position: "absolute" as const,
  right: 0,
  top: 0
};
