import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { useSession } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { getProductById, updateProduct, restockProduct, listProductMovements } from "@/db/database";
import type { Product, StaffRole, StockMovement } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { Card, Field, PrimaryButton, Screen, ScreenLoader, SecondaryButton } from "@/ui/components";
import { notify } from "@/ui/dialog";
import { colors, fontSize } from "@/ui/theme";

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { staffRole } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [restockQty, setRestockQty] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const canEdit = canAccess(role, "products:edit");

  useEffect(() => {
    if (!canEdit) {
      router.back();
      return;
    }
    const productId = Number(id);
    if (productId) {
      loadProduct(productId);
      listProductMovements(productId).then(setMovements);
    }
  }, [id, canEdit, router]);

  function loadProduct(productId: number) {
    getProductById(productId).then((p) => {
      if (p) {
        setProduct(p);
        setName(p.name);
        setCategory(p.category);
        setBarcode(p.barcode || "");
        setCostPrice(String(p.costPrice));
        setSellingPrice(String(p.sellingPrice));
        setStock(String(p.stock));
        setLowStockAt(String(p.lowStockAt));
      }
      setLoading(false);
    });
  }

  async function handleRestock() {
    const qty = Number(restockQty);
    if (!product || !Number.isInteger(qty) || qty <= 0) return;
    await restockProduct(product.id, qty);
    setRestockQty("");
    loadProduct(product.id);
    listProductMovements(product.id).then(setMovements);
    notify({ title: "Stock received", message: `${qty} unit${qty !== 1 ? "s" : ""} added to stock.` });
  }

  const canSave = name.trim().length > 1 && parseMoney(sellingPrice) > 0;

  async function handleSave() {
    if (!product) return;

    await updateProduct(product.id, {
      name: name.trim(),
      category: category.trim() || "General",
      barcode: barcode.trim(),
      costPrice: parseMoney(costPrice),
      sellingPrice: parseMoney(sellingPrice),
      stock: Number(stock) || 0,
      lowStockAt: Number(lowStockAt) || 5
    });

    router.back();
  }

  if (loading) {
    return <ScreenLoader message="Loading product" />;
  }

  if (!product) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: fontSize.lg }}>Product not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 4 }}>Edit Product</Text>
            <Field label="Product name" onChangeText={setName} placeholder="Product name" value={name} />
            <Field label="Category" onChangeText={setCategory} placeholder="Category" value={category} />
            <Field label="Barcode" onChangeText={setBarcode} placeholder="Barcode (optional)" value={barcode} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field keyboardType="decimal-pad" label="Cost" onChangeText={setCostPrice} value={costPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Field keyboardType="decimal-pad" label="Price" onChangeText={setSellingPrice} value={sellingPrice} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field keyboardType="number-pad" label="Stock" onChangeText={setStock} value={stock} />
              </View>
              <View style={{ flex: 1 }}>
                <Field keyboardType="number-pad" label="Low stock at" onChangeText={setLowStockAt} value={lowStockAt} />
              </View>
            </View>
          </Card>

          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 4 }}>Receive stock</Text>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              Current stock: <Text style={{ color: colors.ink, fontWeight: "800" }}>{product.stock}</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <Field
                  keyboardType="number-pad"
                  label="Quantity received"
                  onChangeText={setRestockQty}
                  value={restockQty}
                  placeholder="e.g. 10"
                />
              </View>
              <PrimaryButton disabled={!(Number(restockQty) > 0)} onPress={handleRestock} title="Receive" />
            </View>
          </Card>

          {movements.length > 0 && (
            <Card>
              <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 8 }}>
                Stock movements
              </Text>
              {movements.slice(0, 20).map((movement, i) => (
                <View
                  key={movement.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                    borderBottomWidth: i < Math.min(movements.length, 20) - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: "700" }}>
                      {movement.reason.charAt(0).toUpperCase() + movement.reason.slice(1)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
                      {new Date(movement.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: movement.change > 0 ? colors.success : colors.warning,
                      fontWeight: "800",
                    }}
                  >
                    {movement.change > 0 ? "+" : ""}
                    {movement.change}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save changes" />
          <SecondaryButton onPress={() => router.back()} title="Cancel" />
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}