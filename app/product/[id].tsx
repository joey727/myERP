import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { getProductById, updateProduct } from "@/db/database";
import type { Product } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { Field, PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productId = Number(id);
    if (productId) {
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
  }, [id]);

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
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Product not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
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

          <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save changes" />
          <SecondaryButton onPress={() => router.back()} title="Cancel" />
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}