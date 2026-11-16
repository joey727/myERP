import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import {
  listAllCustomers,
  listAllSaleItems,
  listAllSales,
  listProducts,
  listStaff
} from "@/db/database";
import type { StaffRole } from "@/db/types";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import { AppText, Button, Screen, Surface } from "@/ui/primitives";

function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  if (data.length === 0) return "";
  const headerRow = headers.join(",");
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );
  return [headerRow, ...rows].join("\n");
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

export default function BackupScreen() {
  const styles = useBackupStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const { staffRole } = useSession();
  const { business } = useBusiness();
  const role = (staffRole ?? "cashier") as StaffRole;
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!canAccess(role, "data:export")) router.back();
  }, [role]);

  async function handleExport() {
    setExporting(true);
    try {
      const [products, staff, sales, customers, allSaleItems] =
        await Promise.all([
          listProducts(),
          listStaff(),
          listAllSales(),
          listAllCustomers(),
          listAllSaleItems()
        ]);

      const csvParts: string[] = [];

      if (business) {
        csvParts.push("=== BUSINESS ===");
        csvParts.push(
          convertToCSV(
            [
              {
                id: business.id,
                name: business.name,
                category: business.category,
                phone: business.phone || "",
                email: business.email || "",
                address: business.address || "",
                tax_id: business.taxId || "",
                receipt_footer: business.receiptFooter || "",
                currency: business.currency,
                tax_rate: business.taxRate,
                created_at: business.createdAt
              }
            ],
            [
              "id",
              "name",
              "category",
              "phone",
              "email",
              "address",
              "tax_id",
              "receipt_footer",
              "currency",
              "tax_rate",
              "created_at"
            ]
          )
        );
        csvParts.push("");
      }

      csvParts.push("=== PRODUCTS ===");
      csvParts.push(
        convertToCSV(
          products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            barcode: product.barcode || "",
            cost_price: product.costPrice,
            selling_price: product.sellingPrice,
            stock: product.stock,
            low_stock_at: product.lowStockAt,
            created_at: product.createdAt
          })),
          [
            "id",
            "name",
            "category",
            "barcode",
            "cost_price",
            "selling_price",
            "stock",
            "low_stock_at",
            "created_at"
          ]
        )
      );
      csvParts.push("");

      csvParts.push("=== STAFF ===");
      csvParts.push(
        convertToCSV(
          staff.map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role,
            active: member.active ? 1 : 0,
            created_at: member.createdAt
          })),
          ["id", "name", "role", "active", "created_at"]
        )
      );
      csvParts.push("");

      csvParts.push("=== SALES ===");
      csvParts.push(
        convertToCSV(
          sales.map((sale) => ({
            id: sale.id,
            receipt_number: sale.receiptNumber,
            total: sale.total,
            payment_method: sale.paymentMethod,
            customer_phone: sale.customerPhone || "",
            staff_id: sale.staffId || "",
            created_at: sale.createdAt
          })),
          [
            "id",
            "receipt_number",
            "total",
            "payment_method",
            "customer_phone",
            "staff_id",
            "created_at"
          ]
        )
      );
      csvParts.push("");

      csvParts.push("=== SALE_ITEMS ===");
      csvParts.push(
        convertToCSV(
          allSaleItems.map((item) => ({
            id: item.id,
            receipt_number: item.receiptNumber,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.lineTotal
          })),
          [
            "id",
            "receipt_number",
            "product_name",
            "quantity",
            "unit_price",
            "line_total"
          ]
        )
      );
      csvParts.push("");

      csvParts.push("=== CUSTOMERS ===");
      csvParts.push(
        convertToCSV(
          customers.map((customer) => ({
            id: customer.id,
            phone: customer.phone,
            name: customer.name || "",
            total_spent: customer.totalSpent,
            visit_count: customer.visitCount,
            created_at: customer.createdAt
          })),
          ["id", "phone", "name", "total_spent", "visit_count", "created_at"]
        )
      );

      const csv = csvParts.join("\n");
      const filename = `myERP-backup-${new Date().toISOString().split("T")[0]}.csv`;

      if (Platform.OS === "web") {
        downloadCsvOnWeb(csv, filename);
        notify({ title: "Backup downloaded", tone: "success" });
      } else {
        const file = new File(Paths.document, filename);
        file.write(csv, { encoding: "utf8" });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "text/csv",
            dialogTitle: "Export myERP backup",
            UTI: "public.comma-separated-values-text"
          });
        } else {
          notify({
            title: "Backup ready",
            message: `Saved as ${filename} in the app documents folder.`
          });
        }
      }
    } catch (error) {
      notify({
        title: "Export failed",
        message: error instanceof Error ? error.message : "Could not export data.",
        tone: "danger"
      });
    } finally {
      setExporting(false);
    }
  }

  const included = [
    "Business profile and tax settings",
    "Products, prices, stock and barcodes",
    "Sales, line items and payment method",
    "Customer phone numbers and lifetime value",
    "Staff names, roles and active status"
  ];

  return (
    <Screen maxWidth={isCompact ? 720 : 860}>
      <AppText tone="secondary" variant="small">
        A complete, portable copy of your data. Nothing is uploaded.
      </AppText>

      <Surface style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.primary} name="download-outline" size={26} />
        </View>
        <AppText variant="title3">CSV backup</AppText>
        <AppText tone="secondary">
          Export every table into one CSV file. Open it in Excel, Google Sheets,
          Numbers or keep it as an offline record. Nothing is uploaded.
        </AppText>
        <Button
          fullWidth
          icon="download-outline"
          loading={exporting}
          onPress={handleExport}
          size="lg"
          title={exporting ? "Preparing backup" : "Export all data"}
        />
      </Surface>

      <View style={styles.section}>
        <AppText variant="title3">What is included</AppText>
        <Surface padded={false}>
          {included.map((item, index) => (
            <View
              key={item}
              style={[styles.row, index < included.length - 1 && styles.divider]}
            >
              <Ionicons color={theme.colors.success} name="checkmark-circle" size={18} />
              <AppText style={styles.rowText} variant="small">
                {item}
              </AppText>
            </View>
          ))}
        </Surface>
      </View>

      <View style={styles.note}>
        <AppText tone="secondary" variant="small">
          Keep the file somewhere safe. To move to a new device, install myERP
          and use the same export as a reference while the import tool is built.
        </AppText>
        <Button
          onPress={() => router.back()}
          title="Back"
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const backupStyles = createStyles((theme) => ({
  card: { gap: theme.space.sm },
  icon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  section: { gap: theme.space.xs },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm
  },
  divider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  rowText: { flex: 1 },
  note: { gap: theme.space.xs }
}));
const useBackupStyles = () => backupStyles();
