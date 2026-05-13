import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PrimaryButton, Screen, ScreenLoader } from "@/ui/components";
import { colors, fontSize, radius } from "@/ui/theme";

export default function ScanScreen() {
  const { target } = useLocalSearchParams<{ target?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <ScreenLoader message="Checking camera permission" />;
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, gap: 14, justifyContent: "center" }}>
          <Text style={{ color: colors.ink, fontSize: fontSize["2xl"], fontWeight: "900" }}>Camera access</Text>
          <Text style={{ color: colors.muted, fontSize: fontSize.lg, lineHeight: 23 }}>
            Barcode scanning needs camera permission.
          </Text>
          <PrimaryButton onPress={requestPermission} title="Allow camera" />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ backgroundColor: "#000000", flex: 1 }}>
      <CameraView
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"]
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                const pathname = target === "sales" ? "/(tabs)/sales" : "/(tabs)/inventory";
                router.replace({ pathname, params: { barcode: data } });
              }
        }
        style={{ flex: 1 }}
      />
      <View
        pointerEvents="none"
        style={{
          borderColor: "#ffffff",
          borderRadius: radius.md,
          borderWidth: 2,
          height: 180,
          left: "10%",
          position: "absolute",
          right: "10%",
          top: "35%"
        }}
      />
      <View style={{ bottom: 36, left: 20, position: "absolute", right: 20 }}>
        <Text style={{ color: "#ffffff", fontSize: fontSize.lg, fontWeight: "800", textAlign: "center" }}>
          Place the barcode inside the frame
        </Text>
      </View>
    </View>
  );
}
