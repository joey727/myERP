import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";

import { getBusiness, listProducts, listStaff, listSales, listAllCustomers } from "@/db/database";
import { PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";
import { Text } from "react-native";

export default function BackupScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);

    try {
      const [business, products, staff, sales, customers] = await Promise.all([
        getBusiness(),
        listProducts(),
        listStaff(),
        listSales(1000, 0),
        listAllCustomers()
      ]);

      const data = {
        exportedAt: new Date().toISOString(),
        business,
        products,
        staff: staff.map(s => ({ id: s.id, name: s.name, role: s.role, active: s.active })),
        sales: sales.sales,
        customers
      };

      const json = JSON.stringify(data, null, 2);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const fileName = `myERP-backup-${new Date().toISOString().split("T")[0]}.json`;
        await Sharing.shareAsync(json, {
          mimeType: "application/json",
          dialogTitle: "Export myERP Backup",
          UTI: "public.json"
        });
      } else {
        Alert.alert("Data Ready", "Your data is ready to export. Use the share feature.");
      }
    } catch (error) {
      Alert.alert("Export Failed", error instanceof Error ? error.message : "Could not export data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>Backup & Export</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>
            Export all your business data as a JSON file. You can use this to transfer data to another device or keep a backup.
          </Text>
        </View>

        <PrimaryButton
          disabled={exporting}
          onPress={handleExport}
          title={exporting ? "Exporting..." : "Export All Data"}
        />

        <SecondaryButton onPress={() => router.back()} title="Back" />
      </Screen>
    </ScrollView>
  );
}