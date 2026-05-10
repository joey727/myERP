import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { deleteProduct, listProducts, searchProducts, upsertProduct } from "@/db/database";
import type { Product } from "@/db/types";
import { formatMoney, parseMoney } from "@/lib/money";
import { Card, Field, PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function InventoryScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("5");

  useEffect(() => {
    if (isFocused) {
      loadProducts();
    }
  }, [isFocused, searchQuery]);

  useEffect(() => {
    if (typeof params.barcode === "string") {
      setBarcode(params.barcode);
    }
  }, [params.barcode]);

  async function loadProducts() {
    if (searchQuery.trim()) {
      setProducts(await searchProducts(searchQuery.trim()));
    } else {
      setProducts(await listProducts());
    }
  }

  const canSave = name.trim().length > 1 && parseMoney(sellingPrice) > 0;

  function handleEdit(product: Product) {
    router.push(`/product/${product.id}`);
  }

  function handleDelete(product: Product) {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProduct(product.id);
            loadProducts();
          }
        }
      ]
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Search products..."
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>

          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Add product</Text>
            <Field label="Product name" onChangeText={setName} placeholder="5kg rice" value={name} />
            <Field label="Category" onChangeText={setCategory} placeholder="Food items" value={category} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Barcode" onChangeText={setBarcode} placeholder="Scan or type" value={barcode} />
              </View>
              <View style={{ justifyContent: "flex-end", width: 96 }}>
                <SecondaryButton onPress={() => router.push("/scan")} title="Scan" />
              </View>
            </View>
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
                <Field keyboardType="number-pad" label="Low at" onChangeText={setLowStockAt} value={lowStockAt} />
              </View>
            </View>
            <PrimaryButton
              disabled={!canSave}
              onPress={async () => {
                await upsertProduct({
                  name: name.trim(),
                  category: category.trim() || "General",
                  barcode: barcode.trim(),
                  costPrice: parseMoney(costPrice),
                  sellingPrice: parseMoney(sellingPrice),
                  stock: Number(stock) || 0,
                  lowStockAt: Number(lowStockAt) || 5
                });
                setName("");
                setCategory("");
                setBarcode("");
                setCostPrice("");
                setSellingPrice("");
                setStock("");
                setLowStockAt("5");
                loadProducts();
              }}
              title="Save product"
            />
          </Card>

          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Inventory ({products.length})</Text>
            {products.length === 0 ? (
              <Card>
                <Text style={{ color: colors.muted, lineHeight: 21 }}>
                  {searchQuery ? "No products match your search." : "Products you add will appear here with price and stock."}
                </Text>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product.id}>
                  <Pressable onPress={() => handleEdit(product)}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>{product.name}</Text>
                        <Text style={{ color: colors.muted }}>{product.category}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                          {formatMoney(product.sellingPrice, "GHS")}
                        </Text>
                        <Text style={{ color: product.stock <= product.lowStockAt ? colors.warning : colors.muted }}>
                          {product.stock} in stock
                        </Text>
                      </View>
                    </View>
                    {product.barcode ? <Text style={{ color: colors.muted }}>Barcode: {product.barcode}</Text> : null}
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pressable onPress={() => handleEdit(product)} style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(product)} style={[styles.actionButton, styles.deleteButton]}>
                      <Text style={[styles.actionButtonText, { color: colors.warning }]}>Delete</Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </View>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  searchContainer: {
    marginBottom: 8
  },
  searchInput: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700" as const
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.warning
  }
};