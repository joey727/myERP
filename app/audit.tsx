import { useIsFocused } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useCurrency } from "@/business";
import {
  getStockAuditSummary,
  listProductsPage,
  listStockMovements,
  recordStockAudit
} from "@/db/database";
import type {
  Product,
  StaffRole,
  StockAuditReason,
  StockAuditSummary,
  StockMovement,
  StockMovementReason
} from "@/db/types";
import { formatMoney } from "@/lib/money";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  ListRow,
  Money,
  Screen,
  SearchField,
  Segmented,
  Sheet,
  Skeleton,
  Surface
} from "@/ui/primitives";

type ViewMode = "counts" | "activity";
type StockFilter = "all" | "low";
type MovementFilter = "all" | StockMovementReason;
type CountStep = "count" | "review";

const viewOptions = [
  { label: "Stocktake", value: "counts" as ViewMode },
  { label: "Activity", value: "activity" as ViewMode }
];

const stockFilters = [
  { label: "All stock", value: "all" as StockFilter },
  { label: "Needs attention", value: "low" as StockFilter }
];

const movementFilters = [
  { label: "All", value: "all" as MovementFilter },
  { label: "Audits", value: "audit" as MovementFilter },
  { label: "Sales", value: "sale" as MovementFilter },
  { label: "Restocks", value: "restock" as MovementFilter },
  { label: "Adjustments", value: "adjustment" as MovementFilter },
  { label: "Voids", value: "void" as MovementFilter }
];

const reasonLabels: Record<StockMovementReason, string> = {
  audit: "Audit count",
  sale: "Sale",
  restock: "Restock",
  adjustment: "Adjustment",
  void: "Void"
};

const varianceOptions: {
  value: StockAuditReason;
  label: string;
  help: string;
}[] = [
  { value: "damaged", label: "Damaged", help: "Broken, expired or unsellable." },
  { value: "missing", label: "Missing", help: "Not on the shelf and not sold." },
  { value: "found", label: "Found extra", help: "More on the shelf than expected." },
  {
    value: "supplier",
    label: "Short delivery",
    help: "Supplier brought fewer than recorded."
  },
  { value: "miscount", label: "Earlier miscount", help: "The previous number was wrong." },
  { value: "other", label: "Other", help: "Anything else. Add a note." }
];

const varianceLabels: Record<StockAuditReason, string> = {
  damaged: "Damaged",
  missing: "Missing or stolen",
  found: "Found extra",
  supplier: "Supplier short delivery",
  miscount: "Earlier miscount",
  other: "Other"
};

function stockTone(product: Product): "danger" | "attention" | "neutral" {
  if (product.stock <= 0) return "danger";
  if (product.stock <= product.lowStockAt) return "attention";
  return "neutral";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function movementExplanation(movement: StockMovement) {
  switch (movement.reason) {
    case "sale":
      return "This product was sold at the till, so stock went down by the quantity sold.";
    case "restock":
      return "Stock was received and added back to the shelf count.";
    case "void":
      return "A sale was voided and the items returned to stock.";
    case "adjustment":
      return "Stock was edited by hand outside a stock audit.";
    case "audit":
      return movement.change === 0
        ? "A stock check confirmed the shelf matched the app. No units changed."
        : "A stock count replaced the app number with what was physically on the shelf.";
  }
}

export default function AuditScreen() {
  const styles = useAuditStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const { staffId, staffRole } = useSession();
  const currency = useCurrency();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canViewAudit = canAccess(role, "audit:view");
  const isFocused = useIsFocused();

  const [mode, setMode] = useState<ViewMode>("counts");
  const [summary, setSummary] = useState<StockAuditSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const productOffsetRef = useRef(0);
  const productRequestRef = useRef(0);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [movementTotal, setMovementTotal] = useState(0);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const movementOffsetRef = useRef(0);
  const movementRequestRef = useRef(0);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [countStep, setCountStep] = useState<CountStep>("count");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [varianceReason, setVarianceReason] = useState<StockAuditReason | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);

  useEffect(() => {
    if (!isFocused || !canViewAudit) return;
    loadSummary();
  }, [isFocused, canViewAudit]);

  useEffect(() => {
    if (!isFocused || !canViewAudit || mode !== "counts") return;
    const token = ++productRequestRef.current;
    const timer = setTimeout(() => loadProducts(true, token), 250);
    return () => clearTimeout(timer);
    // loadProducts reads the current request token and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, canViewAudit, mode, productSearch, stockFilter]);

  useEffect(() => {
    if (!isFocused || !canViewAudit || mode !== "activity") return;
    const token = ++movementRequestRef.current;
    const timer = setTimeout(() => loadMovements(true, token), 250);
    return () => clearTimeout(timer);
    // loadMovements reads the current request token and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, canViewAudit, mode, movementSearch, movementFilter]);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      setSummary(await getStockAuditSummary());
    } catch (error) {
      console.error("Stock audit summary load failed:", error);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadProducts(reset = true, token = productRequestRef.current) {
    setProductsLoading(true);
    const offset = reset ? 0 : productOffsetRef.current;
    try {
      const page = await listProductsPage({
        limit: 30,
        offset,
        search: productSearch.trim() || undefined,
        lowOnly: stockFilter === "low"
      });
      if (token !== productRequestRef.current) return;
      setProducts((current) =>
        reset ? page.products : [...current, ...page.products]
      );
      productOffsetRef.current = offset + page.products.length;
      setProductTotal(page.total);
    } catch (error) {
      console.error("Audit product load failed:", error);
    } finally {
      if (token === productRequestRef.current) setProductsLoading(false);
    }
  }

  async function loadMovements(reset = true, token = movementRequestRef.current) {
    setMovementsLoading(true);
    const offset = reset ? 0 : movementOffsetRef.current;
    try {
      const page = await listStockMovements({
        limit: 30,
        offset,
        search: movementSearch.trim() || undefined,
        reason: movementFilter === "all" ? undefined : movementFilter
      });
      if (token !== movementRequestRef.current) return;
      setMovements((current) =>
        reset ? page.movements : [...current, ...page.movements]
      );
      movementOffsetRef.current = offset + page.movements.length;
      setMovementTotal(page.total);
    } catch (error) {
      console.error("Stock movement load failed:", error);
    } finally {
      if (token === movementRequestRef.current) setMovementsLoading(false);
    }
  }

  function loadMoreProducts() {
    if (!productsLoading && products.length < productTotal) loadProducts(false);
  }

  function loadMoreMovements() {
    if (!movementsLoading && movements.length < movementTotal) loadMovements(false);
  }

  function openCount(product: Product) {
    setSelectedProduct(product);
    setCounted(String(product.stock));
    setNote("");
    setVarianceReason(null);
    setCountStep("count");
  }

  function closeCount() {
    setSelectedProduct(null);
    setCountStep("count");
  }

  async function saveCount() {
    if (!selectedProduct) return;
    const countedValue = Number(counted);
    if (!Number.isInteger(countedValue) || countedValue < 0) return;
    if (countedValue !== selectedProduct.stock && !varianceReason) return;

    setSaving(true);
    try {
      const change = await recordStockAudit({
        productId: selectedProduct.id,
        counted: countedValue,
        staffId,
        note,
        varianceReason
      });
      if (change === null) {
        notify({ title: "Count not saved", tone: "danger" });
        return;
      }
      const value = Math.abs(change) * selectedProduct.costPrice;
      notify({
        title: "Audit recorded",
        message:
          change === 0
            ? `${selectedProduct.name} matched the system count. The check is logged.`
            : `${selectedProduct.name} adjusted by ${change > 0 ? "+" : ""}${change} (${formatMoney(value, currency)} at cost).`,
        tone: "success"
      });
      closeCount();
      const productToken = ++productRequestRef.current;
      const movementToken = ++movementRequestRef.current;
      await Promise.all([
        loadSummary(),
        loadProducts(true, productToken),
        loadMovements(true, movementToken)
      ]);
    } catch (error) {
      notify({
        title: "Could not record audit",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  const countedValue = Number(counted);
  const validCount =
    counted.trim().length > 0 &&
    Number.isInteger(countedValue) &&
    countedValue >= 0;
  const difference =
    selectedProduct && validCount ? countedValue - selectedProduct.stock : null;
  const needsReason = difference !== null && difference !== 0;
  const canReview = validCount && (!needsReason || varianceReason !== null);
  const costImpact =
    selectedProduct && difference !== null
      ? Math.abs(difference) * selectedProduct.costPrice
      : 0;

  if (!canViewAudit) return <Redirect href="/(tabs)" />;

  const header = (
    <View style={styles.head}>
      <View style={styles.intro}>
        <View style={styles.introText}>
          <AppText tone="secondary" variant="small">
            Count what is on the shelf, explain any gap, then review the change.
          </AppText>
        </View>
        <View style={styles.introActions}>
          <Chip
            icon="help-circle-outline"
            label={guideOpen ? "Hide guide" : "How it works"}
            onPress={() => setGuideOpen((open) => !open)}
          />
          <Badge icon="lock-closed-outline" label="Owner only" tone="primary" />
        </View>
      </View>

      {guideOpen ? (
        <Surface style={styles.guide}>
          <AppText variant="bodyStrong">A stock audit in three steps</AppText>
          <GuideStep
            body="Pick a product and count the units physically on the shelf. Include the back room."
            number="1"
            title="Count the shelf"
          />
          <GuideStep
            body="Type the number you counted. The app shows the gap against its own number."
            number="2"
            title="Enter the count"
          />
          <GuideStep
            body="If the numbers differ, say why. Review the change, then confirm it."
            number="3"
            title="Explain and confirm"
          />
          <View style={styles.glossary}>
            <GlossaryRow
              term="System count"
              text="The number the app currently has for this product."
            />
            <GlossaryRow
              term="Difference"
              text="Counted minus system count. Negative means stock is missing."
            />
            <GlossaryRow
              term="Shrinkage"
              text="Missing stock from damage, loss or mistakes. The audit records it."
            />
          </View>
        </Surface>
      ) : null}

      {summaryLoading || !summary ? (
        <Skeleton height={168} radius={12} />
      ) : (
        <Surface style={styles.summary}>
          <View style={styles.metricGrid}>
            <SummaryMetric label="Stock at cost" money={summary.costValue} />
            <SummaryMetric label="Retail value" money={summary.retailValue} />
            <SummaryMetric label="Units on hand" value={summary.unitsInStock.toLocaleString()} />
            <SummaryMetric
              alert="attention"
              label="Low stock"
              value={String(summary.lowStockCount)}
            />
            <SummaryMetric
              alert="danger"
              label="Out of stock"
              value={String(summary.outOfStockCount)}
            />
            <SummaryMetric label="Last audit" value={formatDate(summary.lastAuditAt)} />
          </View>
          <View style={styles.summaryFoot}>
            <View style={styles.summaryNotes}>
              <AppText tone="muted" variant="caption">
                {summary.productCount} product{summary.productCount === 1 ? "" : "s"} ·{" "}
                {summary.movementCount.toLocaleString()} stock movement
                {summary.movementCount === 1 ? "" : "s"}
              </AppText>
              <AppText tone="muted" variant="caption">
                {summary.auditCount} count{summary.auditCount === 1 ? "" : "s"} logged ·{" "}
                {summary.auditChange === 0
                  ? "no units changed"
                  : `${Math.abs(summary.auditChange)} unit${
                      Math.abs(summary.auditChange) === 1 ? "" : "s"
                    } ${summary.auditChange > 0 ? "added" : "removed"}`}
              </AppText>
            </View>
            {summary.lowStockCount > 0 ? (
              <Chip
                icon="alert-circle-outline"
                label="Review low stock"
                onPress={() => {
                  setMode("counts");
                  setStockFilter("low");
                }}
              />
            ) : null}
          </View>
        </Surface>
      )}

      <Segmented onChange={setMode} options={viewOptions} value={mode} />

      {mode === "counts" ? (
        <View style={styles.filterBlock}>
          <SearchField
            onChangeText={setProductSearch}
            placeholder="Search products to count"
            value={productSearch}
          />
          <View style={styles.filters}>
            {stockFilters.map((filter) => (
              <Chip
                key={filter.value}
                label={filter.label}
                onPress={() => setStockFilter(filter.value)}
                selected={stockFilter === filter.value}
              />
            ))}
          </View>
          <AppText tone="muted" variant="caption">
            Needs attention shows products at or below their alert line, plus
            anything out of stock.
          </AppText>
        </View>
      ) : (
        <View style={styles.filterBlock}>
          <SearchField
            onChangeText={setMovementSearch}
            placeholder="Search stock movements"
            value={movementSearch}
          />
          <ScrollView
            contentContainerStyle={styles.filters}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {movementFilters.map((filter) => (
              <Chip
                key={filter.value}
                label={filter.label}
                onPress={() => setMovementFilter(filter.value)}
                selected={movementFilter === filter.value}
              />
            ))}
          </ScrollView>
          <AppText tone="muted" variant="caption">
            Tap any movement to see what changed and why.
          </AppText>
        </View>
      )}
    </View>
  );

  return (
    <Screen
      contentStyle={styles.screenContent}
      maxWidth={isCompact ? 900 : 1100}
      padded={false}
      scroll={false}
    >
      {mode === "counts" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={products}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(product) => String(product.id)}
          ListEmptyComponent={
            productsLoading ? (
              <View style={styles.loading}>
                <Skeleton height={64} radius={12} />
                <Skeleton height={64} radius={12} />
                <Skeleton height={64} radius={12} />
              </View>
            ) : (
              <EmptyState
                icon={productSearch ? "search-outline" : "checkmark-done-outline"}
                message={
                  productSearch
                    ? "Try a different product name or category."
                    : stockFilter === "low"
                      ? "No products are below their alert line right now."
                      : "Add a product first, then come back to count it."
                }
                title={
                  productSearch
                    ? "No matching products"
                    : stockFilter === "low"
                      ? "Nothing needs attention"
                      : "Nothing to count"
                }
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {productsLoading && products.length > 0 ? (
                <Skeleton height={56} radius={12} />
              ) : null}
              {!productsLoading && products.length < productTotal ? (
                <Button
                  onPress={loadMoreProducts}
                  title={`Load more products (${productTotal - products.length})`}
                  variant="secondary"
                />
              ) : null}
              {products.length > 0 ? (
                <AppText center tone="muted" variant="caption">
                  Showing {products.length} of {productTotal} products
                </AppText>
              ) : null}
            </View>
          }
          ListHeaderComponent={header}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          renderItem={({ item: product, index }) => (
            <View
              style={[
                styles.rowCard,
                index === 0 && styles.rowCardFirst,
                index === products.length - 1 && styles.rowCardLast
              ]}
            >
              <ListRow
                divider={index < products.length - 1}
                onPress={() => openCount(product)}
                right={
                  <View style={styles.rowRight}>
                    <Badge
                      label={`${product.stock} on hand`}
                      tone={stockTone(product)}
                    />
                    <Money
                      amount={product.stock * product.costPrice}
                      tone="muted"
                      variant="caption"
                    />
                  </View>
                }
                showChevron
              >
                <AppText numberOfLines={1} variant="bodyStrong">
                  {product.name}
                </AppText>
                <AppText tone="secondary" variant="small">
                  {product.category} · low at {product.lowStockAt} · count stock
                </AppText>
              </ListRow>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={movements}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(movement) => String(movement.id)}
          ListEmptyComponent={
            movementsLoading ? (
              <View style={styles.loading}>
                <Skeleton height={64} radius={12} />
                <Skeleton height={64} radius={12} />
                <Skeleton height={64} radius={12} />
              </View>
            ) : (
              <EmptyState
                icon={movementSearch ? "search-outline" : "swap-vertical-outline"}
                message={
                  movementSearch
                    ? "Try a different product name or note."
                    : "Stock movement appears here as you sell, receive and audit."
                }
                title={
                  movementSearch ? "No matching movements" : "No stock movement yet"
                }
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {movementsLoading && movements.length > 0 ? (
                <Skeleton height={56} radius={12} />
              ) : null}
              {!movementsLoading && movements.length < movementTotal ? (
                <Button
                  onPress={loadMoreMovements}
                  title={`Load more activity (${movementTotal - movements.length})`}
                  variant="secondary"
                />
              ) : null}
              {movements.length > 0 ? (
                <AppText center tone="muted" variant="caption">
                  Showing {movements.length} of {movementTotal} movements
                </AppText>
              ) : null}
            </View>
          }
          ListHeaderComponent={header}
          onEndReached={loadMoreMovements}
          onEndReachedThreshold={0.5}
          renderItem={({ item: movement, index }) => (
            <View
              style={[
                styles.rowCard,
                index === 0 && styles.rowCardFirst,
                index === movements.length - 1 && styles.rowCardLast
              ]}
            >
              <ListRow
                divider={index < movements.length - 1}
                onPress={() => setSelectedMovement(movement)}
                right={
                  <View style={styles.rowRight}>
                    <AppText
                      numeric
                      style={{
                        color:
                          movement.change > 0
                            ? theme.colors.success
                            : movement.change < 0
                              ? theme.colors.danger
                              : theme.colors.muted
                      }}
                      variant="bodyStrong"
                    >
                      {movement.change > 0 ? "+" : ""}
                      {movement.change}
                    </AppText>
                    <Badge
                      label={reasonLabels[movement.reason]}
                      tone={
                        movement.reason === "audit"
                          ? "primary"
                          : movement.reason === "void"
                            ? "danger"
                            : movement.reason === "adjustment"
                              ? "attention"
                              : "neutral"
                      }
                    />
                  </View>
                }
                showChevron
              >
                <AppText numberOfLines={1} variant="bodyStrong">
                  {movement.productName}
                </AppText>
                <AppText numberOfLines={2} tone="secondary" variant="small">
                  {formatTimestamp(movement.createdAt)}
                  {movement.staffName ? ` · ${movement.staffName}` : ""}
                  {movement.varianceReason
                    ? ` · ${varianceLabels[movement.varianceReason]}`
                    : ""}
                  {movement.note ? ` · ${movement.note}` : ""}
                </AppText>
              </ListRow>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Sheet
        description={
          countStep === "count"
            ? `System count: ${selectedProduct?.stock ?? 0}. Enter what you counted on the shelf.`
            : "Check the details before saving. Your name is attached to this count."
        }
        footer={
          countStep === "count" ? (
            <Button
              disabled={!canReview}
              fullWidth
              onPress={() => setCountStep("review")}
              title="Review count"
            />
          ) : (
            <View style={styles.sheetFooter}>
              <Button
                fullWidth
                haptic
                loading={saving}
                onPress={saveCount}
                title="Confirm count"
              />
              <Button
                fullWidth
                onPress={() => setCountStep("count")}
                title="Back to count"
                variant="ghost"
              />
            </View>
          )
        }
        onClose={closeCount}
        title={selectedProduct?.name ?? "Stock count"}
        visible={selectedProduct !== null}
      >
        {countStep === "count" ? (
          <>
            <Field
              autoFocus
              keyboardType="number-pad"
              label="Counted quantity"
              onChangeText={setCounted}
              placeholder="0"
              value={counted}
            />
            <View
              style={[
                styles.difference,
                difference !== null && difference < 0 && styles.differenceDanger,
                difference !== null && difference > 0 && styles.differenceAttention
              ]}
            >
              <AppText variant="smallStrong">
                {difference === null
                  ? "Enter a whole number to see the adjustment."
                  : difference === 0
                    ? "Matches the system count. The check is still logged."
                    : difference > 0
                      ? `Found ${difference} extra unit${difference === 1 ? "" : "s"}.`
                      : `Missing ${Math.abs(difference)} unit${Math.abs(difference) === 1 ? "" : "s"}.`}
              </AppText>
              {difference !== null && difference !== 0 && selectedProduct ? (
                <AppText tone="secondary" variant="caption">
                  Stock becomes {countedValue}. Cost value changes by{" "}
                  {formatMoney(costImpact, currency)}.
                </AppText>
              ) : null}
            </View>
            {needsReason ? (
              <View style={styles.reasonBlock}>
                <AppText variant="label">What happened?</AppText>
                <AppText tone="secondary" variant="caption">
                  Pick the closest reason. Patterns help you spot loss early.
                </AppText>
                <View style={styles.reasonChips}>
                  {varianceOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      onPress={() => setVarianceReason(option.value)}
                      selected={varianceReason === option.value}
                    />
                  ))}
                </View>
                <AppText tone="muted" variant="caption">
                  {varianceOptions.find((option) => option.value === varianceReason)
                    ?.help ?? "Choose a reason to continue."}
                </AppText>
              </View>
            ) : null}
            <Field
              hint="Optional"
              label="Audit note"
              onChangeText={setNote}
              placeholder="e.g. Two copies damaged in the store room"
              value={note}
            />
          </>
        ) : (
          <>
            <View style={styles.reviewCard}>
              <ReviewRow label="Product" value={selectedProduct?.name ?? ""} />
              <ReviewRow
                label="System count"
                value={String(selectedProduct?.stock ?? 0)}
              />
              <ReviewRow label="Counted" value={String(countedValue)} />
              <ReviewRow
                label="Difference"
                tone={
                  difference && difference < 0
                    ? "danger"
                    : difference && difference > 0
                      ? "attention"
                      : "neutral"
                }
                value={
                  difference === 0
                    ? "No change"
                    : `${difference && difference > 0 ? "+" : ""}${difference ?? 0}`
                }
              />
              {varianceReason ? (
                <ReviewRow label="Reason" value={varianceLabels[varianceReason]} />
              ) : null}
              {note.trim() ? <ReviewRow label="Note" value={note.trim()} /> : null}
              <ReviewRow
                label="Cost value change"
                value={
                  difference === 0 ? "No value change" : formatMoney(costImpact, currency)
                }
              />
            </View>
            <AppText tone="secondary" variant="small">
              Confirming sets the shelf stock to {countedValue} and adds this
              count to the activity ledger.
            </AppText>
          </>
        )}
      </Sheet>

      <Sheet
        description={
          selectedMovement
            ? `${reasonLabels[selectedMovement.reason]} · ${formatTimestamp(selectedMovement.createdAt)}`
            : undefined
        }
        footer={
          selectedMovement ? (
            <Button
              onPress={() => {
                const productId = selectedMovement.productId;
                setSelectedMovement(null);
                router.push(`/product/${productId}`);
              }}
              title="Open product"
              variant="secondary"
            />
          ) : undefined
        }
        onClose={() => setSelectedMovement(null)}
        title={selectedMovement?.productName ?? "Stock movement"}
        visible={selectedMovement !== null}
      >
        {selectedMovement ? (
          <>
            <View style={styles.detailBadges}>
              <Badge
                label={`${selectedMovement.change > 0 ? "+" : ""}${selectedMovement.change} units`}
                tone={
                  selectedMovement.change > 0
                    ? "success"
                    : selectedMovement.change < 0
                      ? "danger"
                      : "neutral"
                }
              />
              <Badge
                label={reasonLabels[selectedMovement.reason]}
                tone={selectedMovement.reason === "audit" ? "primary" : "neutral"}
              />
            </View>
            <AppText variant="body">{movementExplanation(selectedMovement)}</AppText>
            <View style={styles.reviewCard}>
              <ReviewRow
                label="Recorded by"
                value={selectedMovement.staffName ?? "Unknown staff"}
              />
              {selectedMovement.varianceReason ? (
                <ReviewRow
                  label="Reason"
                  value={varianceLabels[selectedMovement.varianceReason]}
                />
              ) : null}
              {selectedMovement.note ? (
                <ReviewRow label="Note" value={selectedMovement.note} />
              ) : null}
            </View>
            <AppText tone="muted" variant="caption">
              The product screen shows this product&apos;s own movement history.
            </AppText>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function GuideStep({
  number,
  title,
  body
}: {
  number: string;
  title: string;
  body: string;
}) {
  const styles = useAuditStyles();
  return (
    <View style={styles.guideStep}>
      <View style={styles.guideNumber}>
        <AppText variant="caption">{number}</AppText>
      </View>
      <View style={styles.guideText}>
        <AppText variant="smallStrong">{title}</AppText>
        <AppText tone="secondary" variant="caption">
          {body}
        </AppText>
      </View>
    </View>
  );
}

function GlossaryRow({ term, text }: { term: string; text: string }) {
  const styles = useAuditStyles();
  return (
    <View style={styles.glossaryRow}>
      <AppText style={styles.glossaryTerm} variant="caption">
        {term}
      </AppText>
      <AppText style={styles.glossaryText} tone="secondary" variant="caption">
        {text}
      </AppText>
    </View>
  );
}

function ReviewRow({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "attention";
}) {
  const styles = useAuditStyles();
  const theme = useTheme();
  return (
    <View style={styles.reviewRow}>
      <AppText tone="secondary" variant="small">
        {label}
      </AppText>
      <AppText
        style={
          tone === "danger"
            ? { color: theme.colors.danger }
            : tone === "attention"
              ? { color: theme.colors.attention }
              : undefined
        }
        variant="smallStrong"
      >
        {value}
      </AppText>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  money,
  alert
}: {
  label: string;
  value?: string;
  money?: number;
  alert?: "attention" | "danger";
}) {
  const styles = useAuditStyles();
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <AppText tone="muted" variant="caption">
        {label}
      </AppText>
      {money !== undefined ? (
        <Money amount={money} variant="bodyStrong" />
      ) : (
        <AppText
          style={
            alert
              ? {
                  color:
                    alert === "danger"
                      ? theme.colors.danger
                      : theme.colors.attention
                }
              : undefined
          }
          variant="bodyStrong"
        >
          {value}
        </AppText>
      )}
    </View>
  );
}

const auditStyles = createStyles((theme) => ({
  screenContent: { flex: 1, gap: 0 },
  head: {
    gap: theme.space.md,
    paddingBottom: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md
  },
  intro: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: theme.space.xs
  },
  introText: { gap: 2 },
  introActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.xs
  },
  guide: { gap: theme.space.sm },
  guideStep: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm
  },
  guideNumber: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.full,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  guideText: { flex: 1, gap: 1 },
  glossary: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.space.xxs,
    paddingTop: theme.space.sm
  },
  glossaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.xs
  },
  glossaryTerm: { flexBasis: 110, fontWeight: "600" },
  glossaryText: { flex: 1 },
  summary: { gap: theme.space.md },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm
  },
  metric: {
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    minWidth: 130
  },
  summaryFoot: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.xs,
    justifyContent: "space-between"
  },
  summaryNotes: { flex: 1, gap: 1, minWidth: 200 },
  filterBlock: { gap: theme.space.sm },
  filters: { flexDirection: "row", gap: theme.space.xs },
  list: {
    paddingBottom: theme.space.xl,
    paddingHorizontal: theme.space.md
  },
  rowCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    paddingHorizontal: theme.space.md
  },
  rowCardFirst: {
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    borderTopWidth: 1
  },
  rowCardLast: {
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    borderBottomWidth: 1
  },
  rowRight: { alignItems: "flex-end", gap: 4 },
  loading: { gap: theme.space.xs },
  footer: { gap: theme.space.sm, paddingTop: theme.space.sm },
  difference: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 2,
    padding: theme.space.sm
  },
  differenceDanger: { backgroundColor: theme.colors.dangerSoft },
  differenceAttention: { backgroundColor: theme.colors.attentionSoft },
  reasonBlock: { gap: theme.space.xs },
  reasonChips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.xs },
  reviewCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  reviewRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between"
  },
  sheetFooter: { gap: theme.space.xs },
  detailBadges: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.xs }
}));
const useAuditStyles = () => auditStyles();
