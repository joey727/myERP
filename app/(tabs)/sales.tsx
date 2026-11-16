import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import {
  createSale,
  getProductByBarcode,
  getSaleWithItems,
  listProductCategories,
  listProductsPage,
  listStaff
} from "@/db/database";
import type { PaymentMethod, Product, StaffMember, StaffRole } from "@/db/types";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Money,
  PageHeader,
  Screen,
  SearchField,
  Segmented,
  Sheet,
  Skeleton
} from "@/ui/primitives";

type CartItem = { product: Product; quantity: number };
type Success = { saleId: number; receiptNumber: string; total: number };

const gap = 8;

export default function SalesScreen() {
  const styles = useSalesStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, isExpanded, isMedium, isTwoPane } = useResponsive();
  const { staffRole, staffId: sessionStaffId } = useSession();
  const { business } = useBusiness();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canProcessSales = canAccess(role, "sales:process");
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [staffId, setStaffId] = useState<number | null>(sessionStaffId);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const limit = 60;
  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isFocused) return;
    listStaff().then(setStaff).catch((error) => console.error(error));
    listProductCategories()
      .then(setCategories)
      .catch((error) => console.error(error));
    setStaffId((current) => current ?? sessionStaffId);
  }, [isFocused, sessionStaffId]);

  useEffect(() => {
    if (!isFocused) return;
    const token = ++requestRef.current;
    const timer = setTimeout(() => loadProductPage(true, token), 250);
    return () => clearTimeout(timer);
    // loadProductPage reads the current request token, search and category.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, search, category]);

  useEffect(() => {
    if (!params.barcode) return;
    const barcode = params.barcode;
    getProductByBarcode(barcode)
      .then((found) => {
        if (found) {
          addToCart(found);
        } else {
          notify({
            message: `No product uses barcode ${barcode}.`,
            title: "Not in stock",
            tone: "danger"
          });
        }
      })
      .catch((error) => console.error("Barcode lookup failed:", error))
      .finally(() => router.setParams({ barcode: undefined }));
  }, [params.barcode]);

  async function loadProductPage(reset = true, token = requestRef.current) {
    setProductsLoading(true);
    const offset = reset ? 0 : offsetRef.current;
    try {
      const page = await listProductsPage({
        limit,
        offset,
        search: search.trim() || undefined,
        category
      });
      if (token !== requestRef.current) return;
      setProducts((current) =>
        reset ? page.products : [...current, ...page.products]
      );
      offsetRef.current = offset + page.products.length;
      setProductTotal(page.total);
    } catch (error) {
      console.error("Product page load failed:", error);
    } finally {
      if (token === requestRef.current) setProductsLoading(false);
    }
  }

  function loadMoreProducts() {
    if (!productsLoading && products.length < productTotal) {
      loadProductPage(false);
    }
  }

  const total = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sidebarWidth = isExpanded ? 248 : isMedium ? 88 : 0;
  const horizontalPad = isTwoPane ? (isExpanded ? 32 : 24) : 16;
  const paneWidth = isTwoPane ? 380 : 0;
  const catalogWidth = Math.max(
    240,
    width - sidebarWidth - horizontalPad * 2 - (isTwoPane ? paneWidth + 24 : 0)
  );
  const columns = catalogWidth >= 820 ? 4 : catalogWidth >= 560 ? 3 : 2;
  const tileWidth = (catalogWidth - gap * (columns - 1)) / columns;

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      notify({
        message: `${product.name} has no stock left.`,
        title: "Out of stock",
        tone: "danger"
      });
      return;
    }
    void Haptics.selectionAsync();
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: Math.min(product.stock, item.quantity + 1)
              }
            : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(item.product.stock, item.quantity + delta)
                )
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: number) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  function quantityInCart(productId: number) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  async function completeSale() {
    if (!canProcessSales || cart.length === 0) return;
    const trimmedPhone = phone.trim();
    if (payment === "momo" && trimmedPhone.length > 0 && trimmedPhone.length < 9) {
      setPhoneError("Enter a valid mobile number, for example 024 123 4567.");
      return;
    }
    setPhoneError(undefined);
    setSubmitting(true);
    try {
      const saleId = await createSale({
        customerPhone: trimmedPhone,
        items: cart,
        paymentMethod: payment,
        staffId
      });
      const record = await getSaleWithItems(saleId);
      setSuccess({
        receiptNumber: record?.sale.receiptNumber ?? "Receipt saved",
        saleId,
        total
      });
      setCart([]);
      setPhone("");
      setPayment("cash");
      setCartOpen(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void loadProductPage(true, ++requestRef.current);
      listProductCategories()
        .then(setCategories)
        .catch((error) => console.error("Category refresh failed:", error));
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : "The sale was not saved.",
        title: "Could not complete sale",
        tone: "danger"
      });
    } finally {
      setSubmitting(false);
    }
  }

  function closeCheckout() {
    setCartOpen(false);
    setSuccess(null);
  }

  const cartBody = (
    <CartBody
      canProcessSales={canProcessSales}
      cart={cart}
      onComplete={completeSale}
      onNewSale={closeCheckout}
      onRemove={removeItem}
      onUpdate={updateQuantity}
      payment={payment}
      phone={phone}
      phoneError={phoneError}
      setPayment={setPayment}
      setPhone={(value) => {
        setPhone(value);
        setPhoneError(undefined);
      }}
      setStaffId={setStaffId}
      showSuccessAction={isTwoPane}
      staff={staff}
      staffId={staffId}
      staffSelectable={canAccess(role, "staff:view")}
      submitting={submitting}
      success={success}
      total={total}
    />
  );

  return (
    <Screen
      contentStyle={styles.screenContent}
      maxWidth={1440}
      padded={false}
      safeTop
      scroll={false}
    >
      <View style={[styles.header, { paddingHorizontal: horizontalPad }]}>
        <PageHeader
          right={
            <IconButton
              icon="scan-outline"
              label="Scan a barcode"
              onPress={() =>
                router.push({ pathname: "/scan", params: { target: "sales" } })
              }
              tone="primary"
              variant="tonal"
            />
          }
          subtitle={`${business?.name ?? "Till"} · ${itemCount} item${itemCount === 1 ? "" : "s"} in cart`}
          title="Sell"
        />
        <View style={styles.searchRow}>
          <View style={styles.searchGrow}>
            <SearchField
              onChangeText={setSearch}
              placeholder="Search name, category or barcode"
              value={search}
            />
          </View>
          {cart.length > 0 ? (
            <Badge label={`${itemCount} in cart`} tone="primary" />
          ) : null}
        </View>
        {categories.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.chips}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Chip
              label="All"
              onPress={() => setCategory(null)}
              selected={category === null}
            />
            {categories.map((entry) => (
              <Chip
                key={entry}
                label={entry}
                onPress={() => setCategory(entry)}
                selected={category === entry}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.body}>
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.grid,
            { paddingHorizontal: horizontalPad, paddingBottom: (cart.length > 0 ? 104 : 12) + insets.bottom }
          ]}
          data={products}
          key={`grid-${columns}`}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            productsLoading ? (
              <View style={{ gap: 8, paddingHorizontal: horizontalPad }}>
                <Skeleton height={106} radius={12} />
                <Skeleton height={106} radius={12} />
              </View>
            ) : (
              <View style={{ paddingHorizontal: horizontalPad }}>
                <EmptyState
                  action={
                    canAccess(role, "products:create") ? (
                      <Button
                        onPress={() => router.push("/(tabs)/inventory")}
                        title="Add a product"
                        variant="secondary"
                      />
                    ) : undefined
                  }
                  icon={search || category ? "search-outline" : "cube-outline"}
                  message={
                    search || category
                      ? "Try a different name, category or clear the filter."
                      : "Add products in Stock before taking a sale."
                  }
                  title={
                    search || category
                      ? "No matching products"
                      : "Nothing to sell yet"
                  }
                />
              </View>
            )
          }
          ListFooterComponent={
            products.length > 0 ? (
              <View
                style={{
                  gap: 8,
                  paddingHorizontal: horizontalPad,
                  paddingTop: 12
                }}
              >
                {productsLoading ? <Skeleton height={56} radius={12} /> : null}
                {!productsLoading && products.length < productTotal ? (
                  <Button
                    onPress={loadMoreProducts}
                    title={`Load more products (${productTotal - products.length})`}
                    variant="secondary"
                  />
                ) : null}
              </View>
            ) : null
          }
          numColumns={columns}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.6}
          renderItem={({ item }) => {
            const inCart = quantityInCart(item.id);
            const remaining = item.stock - inCart;
            const soldOut = remaining <= 0;
            return (
              <Pressable
                accessibilityLabel={`${item.name}, ${item.stock} in stock`}
                accessibilityRole="button"
                disabled={soldOut}
                onPress={() => addToCart(item)}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileWidth },
                  pressed && !soldOut && styles.tilePressed,
                  soldOut && styles.tileDisabled
                ]}
              >
                {inCart > 0 ? (
                  <View style={styles.tileBadge}>
                    <AppText tone="onPrimary" variant="caption">
                      {inCart}
                    </AppText>
                  </View>
                ) : null}
                <AppText numberOfLines={2} variant="smallStrong">
                  {item.name}
                </AppText>
                <View style={styles.tileBottom}>
                  <Money amount={item.sellingPrice} variant="bodyStrong" />
                  <View style={styles.tileStock}>
                    <Ionicons
                      color={
                        soldOut
                          ? theme.colors.danger
                          : remaining <= item.lowStockAt
                            ? theme.colors.attention
                            : theme.colors.muted
                      }
                      name={soldOut ? "close-circle-outline" : "cube-outline"}
                      size={12}
                    />
                    <AppText
                      tone={soldOut ? "danger" : remaining <= item.lowStockAt ? "attention" : "muted"}
                      variant="caption"
                    >
                      {soldOut ? "Out of stock" : `${remaining} left`}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />

        {isTwoPane ? (
          <View
            style={[
              styles.pane,
              { paddingBottom: insets.bottom + 12, width: paneWidth }
            ]}
          >
            <View style={styles.paneHead}>
              <AppText variant="title3">Current sale</AppText>
              {success ? null : (
                <Badge
                  label={`${itemCount} item${itemCount === 1 ? "" : "s"}`}
                  tone="neutral"
                />
              )}
            </View>
            <ScrollView
              contentContainerStyle={styles.paneBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {cartBody}
            </ScrollView>
          </View>
        ) : cart.length > 0 && !success ? (
          <View
            style={[
              styles.cartBar,
              { marginBottom: Math.max(insets.bottom, 8) + 4 }
            ]}
          >
            <View style={styles.cartBarText}>
              <AppText tone="secondary" variant="caption">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </AppText>
              <Money amount={total} variant="title3" />
            </View>
            <Button
              icon="arrow-forward"
              onPress={() => setCartOpen(true)}
              title="Checkout"
            />
          </View>
        ) : null}
      </View>

      {!isTwoPane ? (
        <Sheet
          description={
            success ? "Saved to sales history" : "Review the items and take payment"
          }
          footer={
            success ? (
              <View style={styles.sheetFooter}>
                <Button
                  onPress={() => {
                    closeCheckout();
                    router.push(`/receipt/${success.saleId}`);
                  }}
                  title="View receipt"
                />
                <Button
                  fullWidth
                  onPress={closeCheckout}
                  title="New sale"
                  variant="ghost"
                />
              </View>
            ) : undefined
          }
          onClose={closeCheckout}
          title={success ? "Sale complete" : "Checkout"}
          visible={cartOpen}
        >
          {cartBody}
        </Sheet>
      ) : null}
    </Screen>
  );
}

function CartBody({
  cart,
  success,
  total,
  payment,
  setPayment,
  phone,
  setPhone,
  phoneError,
  staff,
  staffId,
  setStaffId,
  canProcessSales,
  staffSelectable,
  showSuccessAction,
  submitting,
  onUpdate,
  onRemove,
  onComplete,
  onNewSale
}: {
  cart: CartItem[];
  success: Success | null;
  total: number;
  payment: PaymentMethod;
  setPayment: (value: PaymentMethod) => void;
  phone: string;
  setPhone: (value: string) => void;
  phoneError?: string;
  staff: StaffMember[];
  staffId: number | null;
  setStaffId: (value: number) => void;
  canProcessSales: boolean;
  staffSelectable: boolean;
  showSuccessAction: boolean;
  submitting: boolean;
  onUpdate: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onComplete: () => void;
  onNewSale: () => void;
}) {
  const styles = useSalesStyles();
  const theme = useTheme();

  if (success) {
    return (
      <View style={styles.success}>
        <View style={styles.successIcon}>
          <Ionicons color={theme.colors.success} name="checkmark" size={30} />
        </View>
        <AppText center variant="title2">
          Sale complete
        </AppText>
        <AppText center tone="secondary" variant="small">
          {success.receiptNumber}
        </AppText>
        <Money amount={success.total} style={styles.successTotal} variant="title1" />
        {showSuccessAction ? (
          <Button
            fullWidth
            icon="add"
            onPress={onNewSale}
            title="New sale"
            variant="secondary"
          />
        ) : null}
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        message="Tap a product to start a sale."
        title="The cart is empty"
      />
    );
  }

  return (
    <View style={styles.cartBody}>
      <View>
        {cart.map((item, index) => (
          <View
            key={item.product.id}
            style={[styles.cartRow, index < cart.length - 1 && styles.cartRowDivider]}
          >
            <View style={styles.cartItemText}>
              <AppText numberOfLines={1} variant="smallStrong">
                {item.product.name}
              </AppText>
              <Money amount={item.product.sellingPrice} tone="secondary" variant="caption" />
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel={`Remove one ${item.product.name}`}
                onPress={() => onUpdate(item.product.id, -1)}
                style={styles.stepButton}
              >
                <Ionicons color={theme.colors.ink} name="remove" size={16} />
              </Pressable>
              <AppText numeric style={styles.stepValue} variant="smallStrong">
                {item.quantity}
              </AppText>
              <Pressable
                accessibilityLabel={`Add one ${item.product.name}`}
                onPress={() => onUpdate(item.product.id, 1)}
                style={styles.stepButton}
              >
                <Ionicons color={theme.colors.ink} name="add" size={16} />
              </Pressable>
            </View>
            <Money amount={item.product.sellingPrice * item.quantity} variant="smallStrong" />
            <IconButton
              icon="trash-outline"
              label={`Remove ${item.product.name}`}
              onPress={() => onRemove(item.product.id)}
              size={32}
              tone="muted"
            />
          </View>
        ))}
      </View>

      <View style={styles.paymentBlock}>
        <AppText tone="secondary" variant="label">
          Payment
        </AppText>
        <Segmented
          onChange={setPayment}
          options={[
            { label: "Cash", value: "cash" as PaymentMethod },
            { label: "MoMo", value: "momo" as PaymentMethod }
          ]}
          value={payment}
        />
        <Field
          error={phoneError}
          hint="Optional for loyalty"
          keyboardType="phone-pad"
          label="Customer phone"
          onChangeText={setPhone}
          placeholder="024 123 4567"
          value={phone}
        />
      </View>

      {staffSelectable && staff.length > 1 ? (
        <View style={styles.staffBlock}>
          <AppText tone="secondary" variant="label">
            Serving staff
          </AppText>
          <View style={styles.staffChips}>
            {staff.map((member) => (
              <Chip
                key={member.id}
                label={member.name}
                onPress={() => setStaffId(member.id)}
                selected={staffId === member.id}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.totalRow}>
        <AppText tone="secondary" variant="small">
          Total
        </AppText>
        <Money amount={total} variant="title2" />
      </View>

      {canProcessSales ? (
        <Button
          fullWidth
          haptic
          icon="checkmark"
          loading={submitting}
          onPress={onComplete}
          size="lg"
          title="Complete sale"
        />
      ) : (
        <AppText tone="danger" variant="small">
          Your role cannot complete sales.
        </AppText>
      )}
    </View>
  );
}

const salesStyles = createStyles((theme) => ({
  screenContent: { flex: 1, gap: 0 },
  header: { gap: theme.space.sm, paddingBottom: theme.space.sm, paddingTop: theme.space.xs },
  searchRow: { alignItems: "center", flexDirection: "row", gap: theme.space.xs },
  searchGrow: { flex: 1 },
  chips: { gap: theme.space.xs, paddingRight: theme.space.md, paddingVertical: 2 },
  body: { flex: 1, flexDirection: "row" },
  list: { flex: 1 },
  grid: { gap: 0, paddingTop: theme.space.xs },
  row: { gap },
  tile: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 106,
    padding: theme.space.sm
  },
  tilePressed: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  tileDisabled: { opacity: 0.45 },
  tileBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: 22,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 5,
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 1
  },
  tileBottom: { gap: 4, marginTop: theme.space.xs },
  tileStock: { alignItems: "center", flexDirection: "row", gap: 4 },
  cartBar: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    bottom: 8,
    flexDirection: "row",
    gap: theme.space.sm,
    left: 16,
    padding: theme.space.sm,
    position: "absolute",
    right: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 14
  },
  cartBarText: { flex: 1, gap: 1 },
  pane: {
    backgroundColor: theme.colors.surfaceAlt,
    borderLeftColor: theme.colors.border,
    borderLeftWidth: 1,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.xs
  },
  paneHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.space.xs
  },
  paneBody: { gap: theme.space.md, paddingBottom: theme.space.lg },
  cartBody: { gap: theme.space.md },
  cartRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.xs,
    paddingVertical: theme.space.xs
  },
  cartRowDivider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  cartItemText: { flex: 1, gap: 1 },
  stepper: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row"
  },
  stepButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  stepValue: { minWidth: 22, textAlign: "center" },
  paymentBlock: { gap: theme.space.sm },
  staffBlock: { gap: theme.space.xs },
  staffChips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.xs },
  totalRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.space.sm
  },
  sheetFooter: { gap: theme.space.xs },
  success: { alignItems: "center", gap: theme.space.xs, paddingVertical: theme.space.xl },
  successIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radius.full,
    height: 64,
    justifyContent: "center",
    marginBottom: theme.space.xs,
    width: 64
  },
  successTotal: { marginTop: theme.space.xs }
}));
const useSalesStyles = () => salesStyles();
