import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import { getSaleWithItems, voidSale } from "@/db/database";
import type { Business, Sale, SaleItem, StaffRole } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { confirm, notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  EmptyState,
  Money,
  PageHeader,
  Screen,
  Skeleton,
  Surface
} from "@/ui/primitives";

const thermalReceiptWidth = 226;
const minimumThermalReceiptHeight = 420;

function printReceiptOnWeb(html: string) {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 1000);
    }
  };
  iframe.srcdoc = html;
}

function downloadReceiptHtml(html: string, filename: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReceiptHtml({
  business,
  sale,
  items,
  currency,
  staffName
}: {
  business: Business | null;
  sale: Sale;
  items: SaleItem[];
  currency: string;
  staffName: string | null;
}) {
  const subtotal = sale.total - sale.tax;
  const tax = sale.tax;
  const total = sale.total;
  const voided = sale.status === "voided";
  const businessName = escapeHtml(business?.name ?? "myERP");
  const businessCategory = escapeHtml(business?.category ?? "Receipt");
  const businessAddress = business?.address ? escapeHtml(business.address) : "";
  const businessPhone = business?.phone ? escapeHtml(business.phone) : "";
  const businessEmail = business?.email ? escapeHtml(business.email) : "";
  const businessTaxId = business?.taxId ? escapeHtml(business.taxId) : "";
  const receiptNumber = escapeHtml(sale.receiptNumber);
  const saleDate = escapeHtml(new Date(sale.createdAt).toLocaleString());
  const paymentLabel = escapeHtml(sale.paymentMethod.toUpperCase());
  const customerPhone = sale.customerPhone ? escapeHtml(sale.customerPhone) : "";
  const servedBy = staffName ? escapeHtml(staffName) : "";
  const footer = business?.receiptFooter
    ? escapeHtml(business.receiptFooter)
    : "Thank you for shopping with us.";

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            color: #111827;
            font-family: "Courier New", Courier, monospace;
            font-size: 10px;
            margin: 0;
            padding: 0;
            width: 80mm;
          }
          .receipt { padding: 4mm; width: 80mm; }
          .center { text-align: center; }
          .business {
            font-size: 16px;
            font-weight: 700;
            line-height: 1.15;
            margin: 0 0 2mm;
            text-transform: uppercase;
          }
          .muted { color: #4b5563; }
          .rule { border-top: 1px dashed #111827; margin: 3mm 0; }
          .row { display: flex; justify-content: space-between; gap: 4mm; }
          .item { margin-bottom: 2.5mm; }
          .item-name { font-weight: 700; overflow-wrap: anywhere; }
          .amount { text-align: right; white-space: nowrap; }
          .total { font-size: 13px; font-weight: 700; }
          .footer { margin-top: 5mm; text-align: center; }
        </style>
      </head>
      <body>
        <main class="receipt">
          <section class="center">
            <h1 class="business">${businessName}</h1>
            <div class="muted">${businessCategory}</div>
            ${businessAddress ? `<div class="muted">${businessAddress}</div>` : ""}
            ${
              businessPhone || businessEmail
                ? `<div class="muted">${[businessPhone, businessEmail]
                    .filter(Boolean)
                    .join(" · ")}</div>`
                : ""
            }
            ${businessTaxId ? `<div class="muted">TIN: ${businessTaxId}</div>` : ""}
            <div>${receiptNumber}</div>
            <div class="muted">${saleDate}</div>
            ${servedBy ? `<div class="muted">Served by ${servedBy}</div>` : ""}
          </section>
          <div class="rule"></div>
          ${items
            .map(
              (item) => `
                <section class="item">
                  <div class="item-name">${escapeHtml(item.productName)}</div>
                  <div class="row">
                    <span>${item.quantity} x ${escapeHtml(formatMoney(item.unitPrice, currency))}</span>
                    <span class="amount">${escapeHtml(formatMoney(item.lineTotal, currency))}</span>
                  </div>
                </section>
              `
            )
            .join("")}
          <div class="rule"></div>
          <section class="row">
            <span>SUBTOTAL</span>
            <span class="amount">${escapeHtml(formatMoney(subtotal, currency))}</span>
          </section>
          ${
            tax > 0
              ? `<section class="row">
                  <span>TAX</span>
                  <span class="amount">${escapeHtml(formatMoney(tax, currency))}</span>
                </section>`
              : ""
          }
          <section class="row total">
            <span>${voided ? "VOID TOTAL" : "TOTAL"}</span>
            <span class="amount">${escapeHtml(formatMoney(total, currency))}</span>
          </section>
          <section class="row">
            <span>PAID VIA</span>
            <span class="amount">${paymentLabel}</span>
          </section>
          ${
            customerPhone
              ? `<section class="row">
                  <span>CUSTOMER</span>
                  <span class="amount">${customerPhone}</span>
                </section>`
              : ""
          }
          <div class="rule"></div>
          <section class="footer">
            ${voided ? "VOIDED RECEIPT - NO CHARGE" : footer}
          </section>
        </main>
      </body>
    </html>
  `;
}

export default function ReceiptScreen() {
  const styles = useReceiptStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const params = useLocalSearchParams<{ id: string }>();
  const { staffRole } = useSession();
  const { business } = useBusiness();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canVoid = canAccess(role, "sales:void");

  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [voiding, setVoiding] = useState(false);

  function loadReceipt(saleId: number) {
    getSaleWithItems(saleId)
      .then((record) => {
        if (record) {
          setSale(record.sale);
          setItems(record.items);
          setStaffName(record.staffName);
        }
      })
      .catch((error) => console.error("Receipt load failed:", error))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const saleId = Number(params.id);
    if (saleId) loadReceipt(saleId);
  }, [params.id]);

  if (loading) {
    return (
      <Screen maxWidth={720}>
        <Skeleton height={420} radius={16} />
      </Screen>
    );
  }

  if (!sale) {
    return (
      <Screen maxWidth={720}>
        <EmptyState
          icon="receipt-outline"
          message="This receipt may have been removed."
          title="Receipt not found"
        />
      </Screen>
    );
  }

  const currency = business?.currency ?? "GHS";
  const subtotal = sale.total - sale.tax;
  const tax = sale.tax;
  const receiptHtml = buildReceiptHtml({ business, sale, items, currency, staffName });
  const receiptPrintOptions = {
    height: Math.max(minimumThermalReceiptHeight, 300 + items.length * 58),
    html: receiptHtml,
    margins: { bottom: 0, left: 0, right: 0, top: 0 },
    width: thermalReceiptWidth
  };
  const voided = sale.status === "voided";

  async function printReceipt() {
    setPrinting(true);
    try {
      if (Platform.OS === "web") {
        printReceiptOnWeb(receiptHtml);
      } else {
        await Print.printAsync(receiptPrintOptions);
      }
    } catch (error) {
      notify({
        title: "Receipt not printed",
        message:
          error instanceof Error
            ? error.message
            : "The printer could not complete this receipt.",
        tone: "danger"
      });
    } finally {
      setPrinting(false);
    }
  }

  async function shareReceipt() {
    setSharing(true);
    try {
      if (Platform.OS === "web") {
        downloadReceiptHtml(receiptHtml, `receipt-${sale?.receiptNumber}.html`);
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        notify({ title: "Sharing unavailable on this device" });
        return;
      }
      const file = await Print.printToFileAsync(receiptPrintOptions);
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      notify({
        title: "Receipt not shared",
        message: error instanceof Error ? error.message : "The PDF could not be created.",
        tone: "danger"
      });
    } finally {
      setSharing(false);
    }
  }

  async function handleVoid() {
    if (!sale) return;
    const ok = await confirm({
      title: "Void receipt",
      message:
        "Voiding restores stock and removes this sale from reports. This cannot be undone.",
      confirmText: "Void receipt",
      destructive: true
    });
    if (!ok) return;
    setVoiding(true);
    try {
      await voidSale(sale.id);
      loadReceipt(sale.id);
      notify({ title: "Receipt voided", tone: "success" });
    } catch (error) {
      notify({
        title: "Could not void receipt",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setVoiding(false);
    }
  }

  return (
    <Screen maxWidth={isCompact ? 720 : 820}>
      <PageHeader
        right={
          <Badge
            label={voided ? "Voided" : "Paid"}
            tone={voided ? "danger" : "success"}
          />
        }
        subtitle={new Date(sale.createdAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}
        title={sale.receiptNumber}
      />

      {voided ? (
        <View style={styles.voidBanner}>
          <Ionicons color={theme.colors.danger} name="alert-circle" size={18} />
          <AppText style={styles.voidText} tone="danger" variant="smallStrong">
            This receipt was voided. No charge applies.
          </AppText>
        </View>
      ) : null}

      <Surface padded={false} style={styles.paper}>
        <View style={styles.paperHead}>
          <AppText center variant="title3">
            {business?.name ?? "myERP"}
          </AppText>
          <AppText center tone="secondary" variant="small">
            {business?.category ?? "Receipt"}
          </AppText>
          {business?.address ? (
            <AppText center tone="secondary" variant="caption">
              {business.address}
            </AppText>
          ) : null}
          {business?.phone || business?.email ? (
            <AppText center tone="muted" variant="caption">
              {[business?.phone, business?.email].filter(Boolean).join(" · ")}
            </AppText>
          ) : null}
          {business?.taxId ? (
            <AppText center tone="muted" variant="caption">
              TIN: {business.taxId}
            </AppText>
          ) : null}
          <AppText center tone="muted" variant="caption">
            {sale.receiptNumber}
          </AppText>
        </View>

        <View style={styles.rule} />

        <View style={styles.items}>
          {items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemTop}>
                <AppText style={styles.grow} variant="smallStrong">
                  {item.productName}
                </AppText>
                <AppText numeric variant="smallStrong">
                  {formatMoney(item.lineTotal, currency)}
                </AppText>
              </View>
              <AppText tone="secondary" variant="caption">
                {item.quantity} × {formatMoney(item.unitPrice, currency)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.rule} />

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <AppText tone="secondary" variant="small">
              Subtotal
            </AppText>
            <AppText numeric variant="small">
              {formatMoney(subtotal, currency)}
            </AppText>
          </View>
          {tax > 0 ? (
            <View style={styles.totalRow}>
              <AppText tone="secondary" variant="small">
                Tax
              </AppText>
              <AppText numeric variant="small">
                {formatMoney(tax, currency)}
              </AppText>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <AppText variant="bodyStrong">Total</AppText>
            <Money amount={sale.total} variant="title2" />
          </View>
        </View>

        <View style={styles.payment}>
          <View style={styles.paymentRow}>
            <AppText tone="secondary" variant="small">
              Payment
            </AppText>
            <Badge
              label={sale.paymentMethod === "cash" ? "Cash" : "MoMo"}
              tone={sale.paymentMethod === "momo" ? "primary" : "neutral"}
            />
          </View>
          {sale.customerPhone ? (
            <View style={styles.paymentRow}>
              <AppText tone="secondary" variant="small">
                Customer
              </AppText>
              <AppText variant="smallStrong">{sale.customerPhone}</AppText>
            </View>
          ) : null}
          {staffName ? (
            <View style={styles.paymentRow}>
              <AppText tone="secondary" variant="small">
                Served by
              </AppText>
              <AppText variant="smallStrong">{staffName}</AppText>
            </View>
          ) : null}
        </View>

        <AppText center tone="muted" variant="caption">
          {voided
            ? "Voided receipt · no charge"
            : business?.receiptFooter ?? "Thank you for shopping with us."}
        </AppText>
      </Surface>

      <View style={styles.actions}>
        <Button
          disabled={printing || voided}
          fullWidth
          haptic
          icon="print-outline"
          loading={printing}
          onPress={printReceipt}
          title={voided ? "Receipt voided" : "Print receipt"}
        />
        <View style={styles.secondaryActions}>
          <View style={styles.grow}>
            <Button
              disabled={sharing}
              fullWidth
              icon="share-outline"
              loading={sharing}
              onPress={shareReceipt}
              title="Share PDF"
              variant="secondary"
            />
          </View>
          {canVoid && !voided ? (
            <View style={styles.grow}>
              <Button
                disabled={voiding}
                fullWidth
                icon="close-circle-outline"
                loading={voiding}
                onPress={handleVoid}
                title="Void"
                variant="danger"
              />
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const receiptStyles = createStyles((theme) => ({
  voidBanner: {
    alignItems: "center",
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  voidText: { flex: 1 },
  paper: { padding: theme.space.lg },
  paperHead: { alignItems: "center", gap: 2 },
  rule: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginVertical: theme.space.md
  },
  items: { gap: theme.space.sm },
  item: { gap: 2 },
  itemTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm
  },
  grow: { flex: 1 },
  totals: { gap: theme.space.xs },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  grandTotal: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.space.xs,
    padding: theme.space.sm
  },
  payment: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.space.xs,
    marginTop: theme.space.md,
    paddingTop: theme.space.sm
  },
  paymentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  actions: { gap: theme.space.xs },
  secondaryActions: { flexDirection: "row", gap: theme.space.xs }
}));
const useReceiptStyles = () => receiptStyles();
