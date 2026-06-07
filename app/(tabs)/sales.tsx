import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  createSale,
  listProducts,
  listStaff,
  getOrCreateCustomer,
} from "@/db/database";
import type { PaymentMethod, Product, StaffMember } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Card, Chip, EmptyState, Field, PrimaryButton, Screen } from "@/ui/components";
import { notify } from "@/ui/dialog";
import { colors, fontSize, radius, shadow } from "@/ui/theme";

type CartItem = {
  product: Product;
  quantity: number;
};

export default function SalesScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerPhone, setCustomerPhone] = useState("");
  const [staffId, setStaffId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      listProducts().then((p) => {
        setProducts(p);
        setFilteredProducts(p);
        
        if (params.barcode) {
          const found = p.find(item => item.barcode === params.barcode);
          if (found) {
            addToCart(found);
            // Clear the param so it doesn't keep adding on re-focus
            router.setParams({ barcode: undefined });
          } else {
            notify({ title: "Not found", message: `No product found with barcode ${params.barcode}` });
            router.setParams({ barcode: undefined });
          }
        }
      });
      listStaff().then((members) => {
        setStaff(members);
        setStaffId(
          (currentStaffId) => currentStaffId ?? members[0]?.id ?? null,
        );
      });
    }
  }, [isFocused, params.barcode]);

  useEffect(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const categories = (() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  })();

  const total = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0,
  );

  const columnCount = screenWidth > 400 ? 3 : 2;
  const gap = 8;
  const productCardWidth = (screenWidth - 40 - gap * (columnCount - 1)) / columnCount;

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      notify({ title: "Out of stock", message: `${product.name} is out of stock.` });
      return;
    }
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
            : item,
        ),
      );
    } else {
      setCart((current) => [...current, { product, quantity: 1 }]);
    }
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function getCartQuantity(productId: number) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Screen>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <TextInput
              placeholder="Search products..."
              placeholderTextColor={colors.inputPlaceholder}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              value={searchQuery}
            />
            <Pressable
              onPress={() => router.push({ pathname: "/scan", params: { target: "sales" } })}
              style={({ pressed }) => [styles.scanButton, pressed && { backgroundColor: colors.primaryDark }]}
            >
              <Ionicons color="#ffffff" name="scan-outline" size={20} />
            </Pressable>
          </View>

          {categories.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label="All"
                onPress={() => setSelectedCategory(null)}
                selected={!selectedCategory}
              />
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onPress={() => setSelectedCategory(cat)}
                  selected={selectedCategory === cat}
                />
              ))}
            </View>
          )}

          <View style={styles.gridContainer}>
            {filteredProducts.map((product) => {
              const inCart = getCartQuantity(product.id);
              const remaining = product.stock - inCart;
              const disabled = remaining <= 0;

              return (
                <Pressable
                  key={product.id}
                  disabled={disabled}
                  onPress={() => addToCart(product)}
                  style={({ pressed }) => [
                    styles.productCard,
                    { width: productCardWidth },
                    pressed && styles.productCardPressed,
                    disabled && styles.productCardDisabled,
                  ]}
                >
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatMoney(product.sellingPrice, "GHS")}
                  </Text>
                  <Text style={styles.productStock}>
                    {remaining} left
                  </Text>
                  {inCart > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{inCart}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {filteredProducts.length === 0 && (
            <EmptyState
              icon={searchQuery ? "search-outline" : "cube-outline"}
              title={searchQuery ? "No matches" : "No products in inventory"}
              subtitle={searchQuery ? "Try a different search term." : "Add products in the Inventory tab first."}
            />
          )}

          {cart.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.xl,
                  fontWeight: "900",
                  marginBottom: 12,
                }}
              >
                Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
              </Text>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: colors.ink, fontWeight: "700" }}
                      numberOfLines={1}
                    >
                      {item.product.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: fontSize.base }}>
                      {formatMoney(item.product.sellingPrice, "GHS")}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Pressable
                      onPress={() => updateQuantity(item.product.id, -1)}
                      style={({ pressed }) => [styles.qtyButton, pressed && { backgroundColor: colors.panelAlt }]}
                    >
                      <Text style={styles.qtyButtonText}>-</Text>
                    </Pressable>
                    <Text
                      style={{
                        color: colors.ink,
                        fontWeight: "900",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() => updateQuantity(item.product.id, 1)}
                      style={({ pressed }) => [styles.qtyButton, pressed && { backgroundColor: colors.panelAlt }]}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <View
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  paddingTop: 12,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}
                >
                  {formatMoney(total, "GHS")}
                </Text>
              </View>
            </Card>
          )}

          <Card>
            <Text
              style={{
                color: colors.ink,
                fontSize: fontSize.xl,
                fontWeight: "900",
                marginBottom: 8,
              }}
            >
              Payment
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              {(["cash", "momo"] as PaymentMethod[]).map((method) => (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={({ pressed }) => ({
                    alignItems: "center" as const,
                    backgroundColor:
                      paymentMethod === method ? colors.primary : colors.panel,
                    borderColor:
                      paymentMethod === method ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    flex: 1,
                    minHeight: 44,
                    justifyContent: "center" as const,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: paymentMethod === method ? "#ffffff" : colors.ink,
                      fontWeight: "900",
                    }}
                  >
                    {method.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            {paymentMethod === "momo" && (
              <View>
                <Field
                  keyboardType="phone-pad"
                  label="Customer MoMo (optional)"
                  onChangeText={setCustomerPhone}
                  value={customerPhone}
                  placeholder="For loyalty tracking"
                />
              </View>
            )}
            <Text
              style={{
                color: colors.ink,
                fontSize: fontSize.base,
                fontWeight: "700",
                marginTop: 8,
              }}
            >
              Staff
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {staff.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  onPress={() => setStaffId(member.id)}
                  selected={staffId === member.id}
                />
              ))}
            </View>
            <PrimaryButton
              disabled={cart.length === 0}
              onPress={async () => {
                if (
                  paymentMethod === "momo" &&
                  customerPhone.trim().length > 0 &&
                  customerPhone.trim().length < 9
                ) {
                  notify({
                    title: "Invalid number",
                    message: "Enter a valid 9-digit mobile number."
                  });
                  return;
                }

                if (customerPhone.trim().length >= 9) {
                  await getOrCreateCustomer(customerPhone.trim());
                }

                const saleId = await createSale({
                  items: cart,
                  paymentMethod,
                  customerPhone: customerPhone.trim(),
                  staffId,
                });

                setCart([]);
                setCustomerPhone("");
                router.push(`/receipt/${saleId}`);
              }}
              title="Complete Sale"
            />
          </Card>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: fontSize.lg,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 44,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  productCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 10,
    minHeight: 90,
    justifyContent: "space-between",
    ...shadow.sm,
  },
  productCardPressed: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.primary,
  },
  productCardDisabled: {
    opacity: 0.4,
  },
  productName: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: fontSize.sm,
    marginBottom: 4,
  },
  productPrice: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: fontSize.md,
  },
  productStock: {
    color: colors.muted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: fontSize.xs,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
});
