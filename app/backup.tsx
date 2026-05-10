import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";

import { getBusiness, listProducts, listStaff, listSales, listAllCustomers, getSaleItems } from "@/db/database";
import { PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";
import { Text } from "react-native";

function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  if (data.length === 0) return "";
  const headerRow = headers.join(",");
  const rows = data.map(row =>
    headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  return [headerRow, ...rows].join("\n");
}

export default function BackupScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);

    try {
      const [business, products, staff, salesResult, customers] = await Promise.all([
        getBusiness(),
        listProducts(),
        listStaff(),
        listSales(1000, 0),
        listAllCustomers()
      ]);

      const allSaleItems: Record<string, unknown>[] = [];
      for (const sale of salesResult.sales) {
        const items = await getSaleItems(sale.id);
        allSaleItems.push(...items.map(item => ({
          ...item,
          receiptNumber: sale.receiptNumber
        })));
      }

      const csvParts: string[] = [];

      if (business) {
        csvParts.push("=== BUSINESS ===");
        const businessData = [{
          id: business.id,
          name: business.name,
          category: business.category,
          currency: business.currency,
          tax_rate: business.taxRate,
          created_at: business.createdAt
        }];
        csvParts.push(convertToCSV(businessData, ["id", "name", "category", "currency", "tax_rate", "created_at"]));
        csvParts.push("");
      }

      csvParts.push("=== PRODUCTS ===");
      if (products.length > 0) {
        csvParts.push(convertToCSV(products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          barcode: p.barcode || "",
          cost_price: p.costPrice,
          selling_price: p.sellingPrice,
          stock: p.stock,
          low_stock_at: p.lowStockAt,
          created_at: p.createdAt
        })), ["id", "name", "category", "barcode", "cost_price", "selling_price", "stock", "low_stock_at", "created_at"]));
      }
      csvParts.push("");

      csvParts.push("=== STAFF ===");
      if (staff.length > 0) {
        csvParts.push(convertToCSV(staff.map(s => ({
          id: s.id,
          name: s.name,
          role: s.role,
          active: s.active ? 1 : 0,
          created_at: s.createdAt
        })), ["id", "name", "role", "active", "created_at"]));
      }
      csvParts.push("");

      csvParts.push("=== SALES ===");
      if (salesResult.sales.length > 0) {
        csvParts.push(convertToCSV(salesResult.sales.map(s => ({
          id: s.id,
          receipt_number: s.receiptNumber,
          total: s.total,
          payment_method: s.paymentMethod,
          customer_phone: s.customerPhone || "",
          staff_id: s.staffId || "",
          created_at: s.createdAt
        })), ["id", "receipt_number", "total", "payment_method", "customer_phone", "staff_id", "created_at"]));
      }
      csvParts.push("");

      csvParts.push("=== SALE_ITEMS ===");
      if (allSaleItems.length > 0) {
        csvParts.push(convertToCSV(allSaleItems.map(item => ({
          id: item.id,
          receipt_number: item.receiptNumber,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal
        })), ["id", "receipt_number", "product_name", "quantity", "unit_price", "line_total"]));
      }
      csvParts.push("");

      csvParts.push("=== CUSTOMERS ===");
      if (customers.length > 0) {
        csvParts.push(convertToCSV(customers.map(c => ({
          id: c.id,
          phone: c.phone,
          name: c.name || "",
          total_spent: c.totalSpent,
          visit_count: c.visitCount,
          created_at: c.createdAt
        })), ["id", "phone", "name", "total_spent", "visit_count", "created_at"]));
      }

      const csv = csvParts.join("\n");

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const fileName = `myERP-backup-${new Date().toISOString().split("T")[0]}.csv`;
        await Sharing.shareAsync(csv, {
          mimeType: "text/csv",
          dialogTitle: "Export myERP Backup",
          UTI: "public.comma-separated-values-text"
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
            Export all your business data as a CSV file. You can use this to transfer data to another device or keep a backup.
          </Text>
        </View>

        <PrimaryButton
          disabled={exporting}
          onPress={handleExport}
          title={exporting ? "Exporting..." : "Export All Data (CSV)"}
        />

        <SecondaryButton onPress={() => router.back()} title="Back" />
      </Screen>
    </ScrollView>
  );
}