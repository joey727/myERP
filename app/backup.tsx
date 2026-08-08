import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";

import { useSession } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { getBusiness, listProducts, listStaff, listSales, listAllCustomers, listAllSaleItems } from "@/db/database";
import type { StaffRole } from "@/db/types";
import { PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { notify } from "@/ui/dialog";
import { colors, fontSize } from "@/ui/theme";

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
  const { staffRole } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!canAccess(role, "data:export")) {
      router.back();
    }
  }, [role, router]);

  async function handleExport() {
    setExporting(true);

    try {
      const [business, products, staff, salesResult, customers, allSaleItems] = await Promise.all([
        getBusiness(),
        listProducts(),
        listStaff(),
        listSales(1000, 0),
        listAllCustomers(),
        listAllSaleItems()
      ]);

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
      const fileName = `myERP-backup-${new Date().toISOString().split("T")[0]}.csv`;

      if (Platform.OS === "web") {
        downloadCsvOnWeb(csv, fileName);
      } else {
        const file = new File(Paths.document, fileName);
        file.write(csv, { encoding: "utf8" });

        const fileUri = file.uri;
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Export myERP Backup",
            UTI: "public.comma-separated-values-text"
          });
        } else {
          notify({ title: "Data Ready", message: "Your data is ready to export. Use the share feature." });
        }
      }
    } catch (error) {
      notify({
        title: "Export Failed",
        message: error instanceof Error ? error.message : "Could not export data"
      });
    } finally {
      setExporting(false);
    }
  }

  function downloadCsvOnWeb(csv: string, filename: string) {
    if (typeof document === "undefined") return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.ink, fontSize: fontSize["3xl"], fontWeight: "900" }}>Backup & Export</Text>
          <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 22 }}>
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