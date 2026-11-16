import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import {
  deleteProduct,
  getProductById,
  listProductMovements,
  restockProduct,
  updateProduct
} from "@/db/database";
import type { Product, StaffRole, StockMovement } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { confirm, notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  Field,
  Money,
  PageHeader,
  Screen,
  Skeleton,
  Surface
} from "@/ui/primitives";

export default function ProductEditScreen() {
  const styles = useProductStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { staffRole } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canEdit = canAccess(role, "products:edit");
  const canDelete = canAccess(role, "products:delete");

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("");
  const [restockQty, setRestockQty] = useState("");

  useEffect(() => {
    if (!canEdit) {
      router.back();
      return;
    }
    const productId = Number(id);
    if (productId) {
      loadProduct(productId);
      listProductMovements(productId).then(setMovements).catch(() => {});
    }
  }, [id, canEdit]);

  function loadProduct(productId: number) {
    getProductById(productId)
      .then((next) => {
        if (next) {
          setProduct(next);
          setName(next.name);
          setCategory(next.category);
          setBarcode(next.barcode || "");
          setCostPrice(String(next.costPrice));
          setSellingPrice(String(next.sellingPrice));
          setStock(String(next.stock));
          setLowStockAt(String(next.lowStockAt));
        }
      })
      .catch((error) => console.error("Product load failed:", error))
      .finally(() => setLoading(false));
  }

  async function save() {
    if (!product) return;
    setSaving(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        category: category.trim() || "General",
        barcode: barcode.trim(),
        costPrice: parseMoney(costPrice),
        sellingPrice: parseMoney(sellingPrice),
        stock: Number(stock) || 0,
        lowStockAt: Number(lowStockAt) || 5
      });
      notify({ title: "Product saved", tone: "success" });
      loadProduct(product.id);
    } catch (error) {
      notify({
        title: "Could not save product",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function receiveStock() {
    const quantity = Number(restockQty);
    if (!product || !Number.isInteger(quantity) || quantity <= 0) return;
    await restockProduct(product.id, quantity);
    setRestockQty("");
    loadProduct(product.id);
    listProductMovements(product.id).then(setMovements).catch(() => {});
    notify({
      title: "Stock received",
      message: `${quantity} unit${quantity === 1 ? "" : "s"} added.`,
      tone: "success"
    });
  }

  async function remove() {
    if (!product) return;
    const ok = await confirm({
      title: "Delete product",
      message: `Delete "${product.name}"? Sales history keeps its own copy, but this product will disappear from stock.`,
      confirmText: "Delete",
      destructive: true
    });
    if (!ok) return;
    await deleteProduct(product.id);
    router.back();
  }

  if (loading) {
    return (
      <Screen maxWidth={720}>
        <Skeleton height={100} radius={12} />
        <Skeleton height={320} radius={12} />
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen maxWidth={720}>
        <PageHeader title="Product not found" />
        <Button onPress={() => router.back()} title="Go back" variant="ghost" />
      </Screen>
    );
  }

  const canSave = name.trim().length > 1 && parseMoney(sellingPrice) > 0;

  return (
    <Screen keyboard maxWidth={isCompact ? 720 : 820}>
      <PageHeader
        right={
          <Badge
            label={`${product.stock} in stock`}
            tone={
              product.stock === 0
                ? "danger"
                : product.stock <= product.lowStockAt
                  ? "attention"
                  : "success"
            }
          />
        }
        subtitle={product.category}
        title={product.name}
      />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <AppText tone="secondary" variant="caption">
            Selling price
          </AppText>
          <Money amount={product.sellingPrice} variant="title3" />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <AppText tone="secondary" variant="caption">
            Cost price
          </AppText>
          <Money amount={product.costPrice} tone="secondary" variant="title3" />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <AppText tone="secondary" variant="caption">
            Low-stock line
          </AppText>
          <AppText variant="title3">{product.lowStockAt}</AppText>
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="title3">Details</AppText>
        <Surface style={styles.form}>
          <Field label="Name" onChangeText={setName} value={name} />
          <Field label="Category" onChangeText={setCategory} value={category} />
          <Field
            hint="Optional"
            label="Barcode"
            onChangeText={setBarcode}
            placeholder="Scan or type"
            value={barcode}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                keyboardType="decimal-pad"
                label="Cost price"
                onChangeText={setCostPrice}
                value={costPrice}
              />
            </View>
            <View style={styles.half}>
              <Field
                keyboardType="decimal-pad"
                label="Selling price"
                onChangeText={setSellingPrice}
                value={sellingPrice}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                keyboardType="number-pad"
                label="Stock"
                onChangeText={setStock}
                value={stock}
              />
            </View>
            <View style={styles.half}>
              <Field
                hint="Alert line"
                keyboardType="number-pad"
                label="Low stock at"
                onChangeText={setLowStockAt}
                value={lowStockAt}
              />
            </View>
          </View>
          <Button
            disabled={!canSave}
            fullWidth
            loading={saving}
            onPress={save}
            title="Save changes"
          />
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText variant="title3">Receive stock</AppText>
        <Surface style={styles.receive}>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Field
                keyboardType="number-pad"
                label="Quantity received"
                onChangeText={setRestockQty}
                placeholder="e.g. 12"
                value={restockQty}
              />
            </View>
            <Button
              disabled={!(Number(restockQty) > 0)}
              icon="add"
              onPress={receiveStock}
              title="Receive"
              variant="secondary"
            />
          </View>
          <AppText tone="secondary" variant="small">
            Receiving stock adds to the current count and records a movement.
          </AppText>
        </Surface>
      </View>

      {movements.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title3">Recent movements</AppText>
          <Surface padded={false}>
            {movements.slice(0, 12).map((movement, index) => (
              <View
                key={movement.id}
                style={[
                  styles.movement,
                  index < Math.min(movements.length, 12) - 1 && styles.divider
                ]}
              >
                <View style={styles.grow}>
                  <AppText style={styles.capitalize} variant="smallStrong">
                    {movement.reason}
                  </AppText>
                  <AppText tone="muted" variant="caption">
                    {new Date(movement.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </AppText>
                </View>
                <AppText
                  numeric
                  style={{
                    color:
                      movement.change > 0 ? theme.colors.success : theme.colors.danger
                  }}
                  variant="smallStrong"
                >
                  {movement.change > 0 ? "+" : ""}
                  {movement.change}
                </AppText>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}

      {canDelete ? (
        <View style={styles.section}>
          <AppText variant="title3">Danger zone</AppText>
          <Surface style={styles.danger}>
            <AppText tone="secondary" variant="small">
              Deleting removes the product from stock. Existing receipts keep their
              own line items.
            </AppText>
            <Button
              icon="trash-outline"
              onPress={remove}
              title="Delete product"
              variant="danger"
            />
          </Surface>
        </View>
      ) : null}
    </Screen>
  );
}

const productStyles = createStyles((theme) => ({
  summary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.space.sm,
    padding: theme.space.md
  },
  summaryItem: { flex: 1, gap: 2 },
  summaryDivider: { backgroundColor: theme.colors.border, width: 1 },
  section: { gap: theme.space.xs },
  form: { gap: theme.space.md },
  row: { alignItems: "flex-end", flexDirection: "row", gap: theme.space.sm },
  half: { flex: 1 },
  grow: { flex: 1 },
  receive: { gap: theme.space.sm },
  movement: {
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
  capitalize: { textTransform: "capitalize" },
  danger: { gap: theme.space.sm }
}));
const useProductStyles = () => productStyles();
