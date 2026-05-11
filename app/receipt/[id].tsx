import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { getBusiness, getSaleWithItems } from "@/db/database";
import type { Business, Sale, SaleItem } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Badge, Card, PrimaryButton, Screen, ScreenLoader, SecondaryButton } from "@/ui/components";
import { colors, fontSize, radius } from "@/ui/theme";

const thermalReceiptWidth = 226;
const minimumThermalReceiptHeight = 420;

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
  taxRate
}: {
  business: Business | null;
  sale: Sale;
  items: SaleItem[];
  currency: string;
  taxRate: number;
}) {
  const subtotal = sale.total;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const businessName = escapeHtml(business?.name ?? "myERP");
  const businessCategory = escapeHtml(business?.category ?? "Receipt");
  const receiptNumber = escapeHtml(sale.receiptNumber);
  const saleDate = escapeHtml(new Date(sale.createdAt).toLocaleString());
  const paymentLabel = escapeHtml(sale.paymentMethod.toUpperCase());
  const customerPhone = sale.customerPhone ? escapeHtml(sale.customerPhone) : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #111827;
            font-family: "Courier New", Courier, monospace;
            font-size: 10px;
            margin: 0;
            padding: 0;
            width: 80mm;
          }

          .receipt {
            padding: 4mm;
            width: 80mm;
          }

          .center {
            text-align: center;
          }

          .business {
            font-size: 16px;
            font-weight: 700;
            line-height: 1.15;
            margin: 0 0 2mm;
            text-transform: uppercase;
          }

          .muted {
            color: #4b5563;
          }

          .rule {
            border-top: 1px dashed #111827;
            margin: 3mm 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 4mm;
          }

          .item {
            margin-bottom: 2.5mm;
          }

          .item-name {
            font-weight: 700;
            overflow-wrap: anywhere;
          }

          .amount {
            text-align: right;
            white-space: nowrap;
          }

          .total {
            font-size: 13px;
            font-weight: 700;
          }

          .footer {
            margin-top: 5mm;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <section class="center">
            <h1 class="business">${businessName}</h1>
            <div class="muted">${businessCategory}</div>
            <div>${receiptNumber}</div>
            <div class="muted">${saleDate}</div>
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
          ${taxRate > 0 ? `
          <section class="row">
            <span>TAX (${taxRate}%)</span>
            <span class="amount">${escapeHtml(formatMoney(tax, currency))}</span>
          </section>
          ` : ""}
          <section class="row total">
            <span>TOTAL</span>
            <span class="amount">${escapeHtml(formatMoney(total, currency))}</span>
          </section>
          <section class="row">
            <span>PAID VIA</span>
            <span class="amount">${paymentLabel}</span>
          </section>
          ${
            customerPhone
              ? `<section class="row">
                  <span>MOMO NO.</span>
                  <span class="amount">${customerPhone}</span>
                </section>`
              : ""
          }

          <div class="rule"></div>

          <section class="footer">
            Thank you for shopping with us.
          </section>
        </main>
      </body>
    </html>
  `;
}

export default function ReceiptScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const saleId = Number(params.id);

    if (saleId) {
      getBusiness().then(setBusiness);
      getSaleWithItems(saleId).then((record) => {
        if (record) {
          setSale(record.sale);
          setItems(record.items);
        }
      });
    }
  }, [params.id]);

  if (!sale) {
    return <ScreenLoader message="Loading receipt" />;
  }

  const currency = business?.currency ?? "GHS";
  const taxRate = business?.taxRate ?? 0;
  const subtotal = sale.total;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const receiptHtml = buildReceiptHtml({ business, sale, items, currency, taxRate });
  const receiptPrintOptions = {
    height: Math.max(minimumThermalReceiptHeight, 300 + items.length * 58),
    html: receiptHtml,
    margins: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0
    },
    width: thermalReceiptWidth
  };

  const printReceipt = async () => {
    setPrinting(true);

    try {
      await Print.printAsync(receiptPrintOptions);
    } catch (error) {
      Alert.alert("Receipt not printed", error instanceof Error ? error.message : "The printer could not complete this receipt.");
    } finally {
      setPrinting(false);
    }
  };

  const shareReceipt = async () => {
    setSharing(true);

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert("Sharing unavailable", "This device cannot share receipt PDFs right now.");
        return;
      }

      const file = await Print.printToFileAsync(receiptPrintOptions);
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      Alert.alert("Receipt not shared", error instanceof Error ? error.message : "The receipt PDF could not be created.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ gap: 4, flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{business?.name ?? "myERP"}</Text>
              <Text style={{ color: colors.muted }}>{sale.receiptNumber}</Text>
              <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>{new Date(sale.createdAt).toLocaleString()}</Text>
            </View>
            <Badge label="Paid" tone="success" />
          </View>

          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 10, paddingTop: 12 }}>
            {items.map((item, i) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 6,
                  backgroundColor: i % 2 === 0 ? "transparent" : colors.panelAlt,
                  marginHorizontal: -4,
                  paddingHorizontal: 4,
                  borderRadius: radius.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "900" }}>{item.productName}</Text>
                  <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
                    {item.quantity} x {formatMoney(item.unitPrice, currency)}
                  </Text>
                </View>
                <Text style={{ color: colors.ink, fontWeight: "900" }}>{formatMoney(item.lineTotal, currency)}</Text>
              </View>
            ))}
          </View>

          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 6, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.muted }}>Subtotal</Text>
              <Text style={{ color: colors.ink, fontWeight: "700" }}>{formatMoney(subtotal, currency)}</Text>
            </View>
            {taxRate > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.muted }}>Tax ({taxRate}%)</Text>
                <Text style={{ color: colors.ink, fontWeight: "700" }}>{formatMoney(tax, currency)}</Text>
              </View>
            )}
            <View style={{
              backgroundColor: colors.successBg,
              borderRadius: radius.md,
              padding: 12,
              marginTop: 4,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <Text style={{ color: colors.success, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: colors.success, fontSize: fontSize["3xl"], fontWeight: "900" }}>{formatMoney(total, currency)}</Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              Paid via {sale.paymentMethod.toUpperCase()}
              {sale.customerPhone ? `: ${sale.customerPhone}` : ""}
            </Text>
          </View>

          <PrimaryButton disabled={printing} onPress={printReceipt} title={printing ? "Printing..." : "Print receipt"} />
          <SecondaryButton disabled={sharing} onPress={shareReceipt} title={sharing ? "Preparing PDF..." : "Share PDF"} />
        </Card>
      </Screen>
    </ScrollView>
  );
}