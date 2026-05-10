import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { Card, Field, PrimaryButton, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

type CartItem = {
  product: Product;
  quantity: number;
};

export default function SalesScreen() {
  const isFocused = useIsFocused();
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
      });
      listStaff().then((members) => {
        setStaff(members);
        setStaffId(
          (currentStaffId) => currentStaffId ?? members[0]?.id ?? null,
        );
      });
    }
  }, [isFocused]);

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

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const total = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0,
  );

  function addToCart(product: Product) {
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
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              value={searchQuery}
            />
            <Pressable
              onPress={() => router.push("/scan")}
              style={styles.scanButton}
            >
              <Text style={styles.scanButtonText}>Scan</Text>
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
              <Pressable
                onPress={() => setSelectedCategory(null)}
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.categoryChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
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
            <Card>
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                {searchQuery
                  ? "No products match your search"
                  : "No products in inventory"}
              </Text>
            </Card>
          )}

          {cart.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: 18,
                  fontWeight: "900",
                  marginBottom: 12,
                }}
              >
                Cart ({cart.length} items)
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
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
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
                      style={styles.qtyButton}
                    >
                      <Text
                        style={{
                          color: colors.ink,
                          fontSize: 18,
                          fontWeight: "700",
                        }}
                      >
                        -
                      </Text>
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
                      style={styles.qtyButton}
                    >
                      <Text
                        style={{
                          color: colors.ink,
                          fontSize: 18,
                          fontWeight: "700",
                        }}
                      >
                        +
                      </Text>
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
                fontSize: 18,
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
                  style={{
                    alignItems: "center",
                    backgroundColor:
                      paymentMethod === method ? colors.primary : "#ffffff",
                    borderColor:
                      paymentMethod === method ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    flex: 1,
                    minHeight: 44,
                    justifyContent: "center",
                  }}
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
                fontSize: 13,
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
                <Pressable
                  key={member.id}
                  onPress={() => setStaffId(member.id)}
                  style={{
                    backgroundColor:
                      staffId === member.id ? colors.primary : "#ffffff",
                    borderColor:
                      staffId === member.id ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: staffId === member.id ? "#ffffff" : colors.ink,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {member.name}
                  </Text>
                </Pressable>
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
                  Alert.alert(
                    "Invalid number",
                    "Enter a valid 9-digit mobile number.",
                  );
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
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    minHeight: 44,
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  categoryChip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  productCard: {
    width: "31%",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    minHeight: 80,
  },
  productCardPressed: {
    backgroundColor: colors.border,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productName: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 4,
  },
  productPrice: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 14,
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
    fontSize: 11,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
