import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import { hashPin } from "@/lib/pin";
import type {
  Business,
  Customer,
  CustomerStats,
  CustomerSummary,
  DailyRevenue,
  DashboardSummary,
  PaymentMethod,
  PaymentBreakdown,
  Product,
  ProductStats,
  Sale,
  SaleItem,
  SaleItemWithReceipt,
  StaffMember,
  StaffRole,
  StaffStats,
  StockAuditSummary,
  StockMovement,
  StockMovementReason,
  TopProduct
} from "./types";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const businessListeners = new Set<() => void>();

function notifyBusinessChanged() {
  businessListeners.forEach((listener) => listener());
}

export function subscribeBusinessChange(listener: () => void): () => void {
  businessListeners.add(listener);
  return () => {
    businessListeners.delete(listener);
  };
}

function database() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("myerp.db").catch((err) => {
      databasePromise = null;
      throw err;
    });
  }
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await database();

  if (Platform.OS !== "web") {
    try {
      await db.execAsync("PRAGMA journal_mode = WAL;");
    } catch (err) {
      console.warn("Failed to set journal_mode to WAL:", err);
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      tax_rate REAL NOT NULL DEFAULT 0,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      receipt_footer TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      barcode TEXT,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock INTEGER NOT NULL,
      low_stock_at INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL,
      total REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      customer_phone TEXT,
      staff_id INTEGER,
      voided INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      total_spent REAL NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  await addColumn(db, "businesses", "phone", "TEXT");
  await addColumn(db, "businesses", "email", "TEXT");
  await addColumn(db, "businesses", "address", "TEXT");
  await addColumn(db, "businesses", "tax_id", "TEXT");
  await addColumn(db, "businesses", "receipt_footer", "TEXT");
  await addColumn(db, "sales", "tax", "REAL NOT NULL DEFAULT 0");
  await addColumn(db, "sales", "voided", "INTEGER NOT NULL DEFAULT 0");
  await addColumn(db, "stock_movements", "staff_id", "INTEGER");
  await addColumn(db, "stock_movements", "note", "TEXT");
  await addColumn(db, "stock_movements", "variance_reason", "TEXT");

  await db.execAsync(`UPDATE staff SET role = 'cashier' WHERE role = 'inventory';`);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_voided ON sales(voided);
    CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON sales(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_created ON sales(customer_phone, created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reason ON stock_movements(reason, created_at DESC);
  `);
}

async function addColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // column already exists
  }
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function businessFromRow(row: Record<string, unknown>): Business {
  return {
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    currency: String(row.currency),
    taxRate: Number(row.tax_rate),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    taxId: row.tax_id ? String(row.tax_id) : null,
    receiptFooter: row.receipt_footer ? String(row.receipt_footer) : null,
    createdAt: String(row.created_at)
  };
}

function productFromRow(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    barcode: row.barcode ? String(row.barcode) : null,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    stock: Number(row.stock),
    lowStockAt: Number(row.low_stock_at),
    createdAt: String(row.created_at)
  };
}

function staffFromRow(row: Record<string, unknown>): StaffMember {
  const role = String(row.role) as StaffRole;
  return {
    id: Number(row.id),
    name: String(row.name),
    role: role === "owner" || role === "manager" || role === "cashier" ? role : "cashier",
    pin: String(row.pin),
    active: Number(row.active) === 1,
    createdAt: String(row.created_at)
  };
}

export async function getStaffById(id: number): Promise<StaffMember | null> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM staff WHERE id = ?", id);
  return row ? staffFromRow(row) : null;
}

function saleFromRow(row: Record<string, unknown>): Sale {
  return {
    id: Number(row.id),
    receiptNumber: String(row.receipt_number),
    total: Number(row.total),
    tax: Number(row.tax ?? 0),
    paymentMethod: String(row.payment_method) as PaymentMethod,
    customerPhone: row.customer_phone ? String(row.customer_phone) : null,
    staffId: row.staff_id ? Number(row.staff_id) : null,
    status: Number(row.voided ?? 0) === 1 ? "voided" : "active",
    createdAt: String(row.created_at)
  };
}

function saleItemFromRow(row: Record<string, unknown>): SaleItem {
  return {
    id: Number(row.id),
    saleId: Number(row.sale_id),
    productId: Number(row.product_id),
    productName: String(row.product_name),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total)
  };
}

function stockMovementFromRow(row: Record<string, unknown>): StockMovement {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    productName: String(row.product_name),
    change: Number(row.change),
    reason: String(row.reason) as StockMovementReason,
    varianceReason: row.variance_reason
      ? (String(row.variance_reason) as StockMovement["varianceReason"])
      : null,
    staffId: row.staff_id ? Number(row.staff_id) : null,
    staffName: row.staff_name ? String(row.staff_name) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at)
  };
}

export async function getBusiness() {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM businesses ORDER BY id LIMIT 1");
  return row ? businessFromRow(row) : null;
}

export async function updateBusiness(input: {
  name?: string;
  category?: string;
  currency?: string;
  taxRate?: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  receiptFooter?: string | null;
}) {
  const db = await database();
  const current = await getBusiness();
  if (!current) return;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push("category = ?");
    values.push(input.category);
  }
  if (input.currency !== undefined) {
    updates.push("currency = ?");
    values.push(input.currency);
  }
  if (input.taxRate !== undefined) {
    updates.push("tax_rate = ?");
    values.push(input.taxRate);
  }
  if (input.phone !== undefined) {
    updates.push("phone = ?");
    values.push(input.phone?.trim() || null);
  }
  if (input.email !== undefined) {
    updates.push("email = ?");
    values.push(input.email?.trim() || null);
  }
  if (input.address !== undefined) {
    updates.push("address = ?");
    values.push(input.address?.trim() || null);
  }
  if (input.taxId !== undefined) {
    updates.push("tax_id = ?");
    values.push(input.taxId?.trim() || null);
  }
  if (input.receiptFooter !== undefined) {
    updates.push("receipt_footer = ?");
    values.push(input.receiptFooter?.trim() || null);
  }

  if (updates.length === 0) return;

  await db.runAsync(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, ...values, current.id);

  notifyBusinessChanged();
}

export async function saveBusiness(input: {
  name: string;
  category: string;
  currency: string;
  taxRate: number;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  receiptFooter: string;
  ownerName: string;
  ownerPin: string;
}): Promise<number> {
  const db = await database();
  const now = new Date().toISOString();
  const hashedPin = await hashPin(input.ownerPin);
  let ownerStaffId = 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO businesses
       (name, category, currency, tax_rate, phone, email, address, tax_id, receipt_footer, created_at)
       VALUES (?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?)`,
      input.name,
      input.category,
      input.currency,
      input.taxRate,
      input.phone.trim(),
      input.email.trim(),
      input.address.trim(),
      input.taxId.trim(),
      input.receiptFooter.trim(),
      now
    );
    const result = await db.runAsync(
      "INSERT INTO staff (name, role, pin, active, created_at) VALUES (?, 'owner', ?, 1, ?)",
      input.ownerName,
      hashedPin,
      now
    );
    ownerStaffId = result.lastInsertRowId;
  });

  notifyBusinessChanged();
  return ownerStaffId;
}

export async function listProducts() {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM products ORDER BY name COLLATE NOCASE");
  return rows.map(productFromRow);
}

export async function listProductsPage(input: {
  limit: number;
  offset: number;
  search?: string;
  category?: string | null;
  lowOnly?: boolean;
}): Promise<{ products: Product[]; total: number }> {
  const db = await database();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (input.search?.trim()) {
    const query = `%${input.search.trim()}%`;
    conditions.push("(name LIKE ? OR category LIKE ? OR barcode LIKE ?)");
    params.push(query, query, query);
  }
  if (input.category) {
    conditions.push("category = ?");
    params.push(input.category);
  }
  if (input.lowOnly) {
    conditions.push("stock <= low_stock_at");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) AS count FROM products ${where}`,
    ...params
  );
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM products ${where} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`,
    ...params,
    input.limit,
    input.offset
  );

  return {
    products: rows.map(productFromRow),
    total: Number(countRow?.count ?? 0)
  };
}

export async function getProductStats(): Promise<ProductStats> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN stock <= low_stock_at THEN 1 ELSE 0 END), 0) AS low_stock_count
    FROM products
  `);
  return {
    count: Number(row?.count ?? 0),
    lowStockCount: Number(row?.low_stock_count ?? 0)
  };
}

export async function listProductCategories(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT DISTINCT category FROM products WHERE category <> '' ORDER BY category COLLATE NOCASE"
  );
  return rows.map((row) => String(row.category));
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM products WHERE barcode = ? LIMIT 1",
    barcode
  );
  return row ? productFromRow(row) : null;
}

export async function getProductById(id: number): Promise<Product | null> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", id);
  return row ? productFromRow(row) : null;
}

export async function upsertProduct(input: {
  id?: number;
  name: string;
  category: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAt: number;
}) {
  const db = await database();

  if (input.id) {
    await db.runAsync(
      `UPDATE products
       SET name = ?, category = ?, barcode = NULLIF(?, ''), cost_price = ?, selling_price = ?, stock = ?, low_stock_at = ?
       WHERE id = ?`,
      input.name,
      input.category,
      input.barcode,
      input.costPrice,
      input.sellingPrice,
      input.stock,
      input.lowStockAt,
      input.id
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, low_stock_at, created_at)
     VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?)`,
    input.name,
    input.category,
    input.barcode,
    input.costPrice,
    input.sellingPrice,
    input.stock,
    input.lowStockAt,
    new Date().toISOString()
  );
}

export async function updateProduct(id: number, input: {
  name?: string;
  category?: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  lowStockAt?: number;
}) {
  const db = await database();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push("category = ?");
    values.push(input.category);
  }
  if (input.barcode !== undefined) {
    updates.push("barcode = NULLIF(?, '')");
    values.push(input.barcode);
  }
  if (input.costPrice !== undefined) {
    updates.push("cost_price = ?");
    values.push(input.costPrice);
  }
  if (input.sellingPrice !== undefined) {
    updates.push("selling_price = ?");
    values.push(input.sellingPrice);
  }
  if (input.stock !== undefined) {
    updates.push("stock = ?");
    values.push(input.stock);
  }
  if (input.lowStockAt !== undefined) {
    updates.push("low_stock_at = ?");
    values.push(input.lowStockAt);
  }

  if (updates.length === 0) return;

  const current = input.stock !== undefined ? await getProductById(id) : null;
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, ...values, id);

    if (current && input.stock !== undefined && input.stock !== current.stock) {
      await db.runAsync(
        "INSERT INTO stock_movements (product_id, product_name, change, reason, note, created_at) VALUES (?, ?, ?, 'adjustment', ?, ?)",
        id,
        input.name ?? current.name,
        input.stock - current.stock,
        "Manual stock edit",
        now
      );
    }
  });
}

export async function deleteProduct(id: number) {
  const db = await database();
  await db.runAsync("DELETE FROM products WHERE id = ?", id);
}

export async function listStaff() {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM staff ORDER BY active DESC, name COLLATE NOCASE");
  return rows.map(staffFromRow);
}

export async function getStaffCount(): Promise<number> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT COUNT(*) AS count FROM staff");
  return Number(row?.count ?? 0);
}

export async function addStaff(input: { name: string; role: StaffRole; pin: string }) {
  const db = await database();
  const hashedPin = await hashPin(input.pin);
  await db.runAsync(
    "INSERT INTO staff (name, role, pin, active, created_at) VALUES (?, ?, ?, 1, ?)",
    input.name,
    input.role,
    hashedPin,
    new Date().toISOString()
  );
}

export async function updateStaff(id: number, input: {
  name?: string;
  role?: StaffRole;
  pin?: string;
  active?: boolean;
}) {
  const db = await database();
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.role !== undefined) {
    updates.push("role = ?");
    values.push(input.role);
  }
  if (input.pin !== undefined) {
    updates.push("pin = ?");
    values.push(await hashPin(input.pin));
  }
  if (input.active !== undefined) {
    updates.push("active = ?");
    values.push(input.active ? 1 : 0);
  }

  if (updates.length === 0) return;

  await db.runAsync(`UPDATE staff SET ${updates.join(", ")} WHERE id = ?`, ...values, id);
}

export async function deleteStaff(id: number) {
  const db = await database();
  await db.runAsync("DELETE FROM staff WHERE id = ?", id);
}

export async function createSale(input: {
  items: { product: Product; quantity: number }[];
  paymentMethod: PaymentMethod;
  customerPhone: string;
  staffId: number | null;
}) {
  const db = await database();
  const business = await getBusiness();
  const now = new Date();
  const receiptNumber = `R-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-6)}`;

  const quantities = new Map<number, number>();
  const productNames = new Map<number, string>();
  for (const item of input.items) {
    quantities.set(item.product.id, (quantities.get(item.product.id) ?? 0) + item.quantity);
    productNames.set(item.product.id, item.product.name);
  }

  const lineItems = input.items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.product.sellingPrice,
    lineTotal: roundCents(item.product.sellingPrice * item.quantity)
  }));

  const subtotalAmount = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const tax = roundCents(subtotalAmount * ((business?.taxRate ?? 0) / 100));
  const total = roundCents(subtotalAmount + tax);
  const customerPhone = input.customerPhone.trim();
  let saleId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      "INSERT INTO sales (receipt_number, total, tax, payment_method, customer_phone, staff_id, voided, created_at) VALUES (?, ?, ?, ?, NULLIF(?, ''), ?, 0, ?)",
      receiptNumber,
      total,
      tax,
      input.paymentMethod,
      customerPhone,
      input.staffId,
      now.toISOString()
    );
    saleId = result.lastInsertRowId;

    if (lineItems.length > 0) {
      const placeholders = lineItems.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const values = lineItems.flatMap((line) => [
        saleId,
        line.productId,
        line.productName,
        line.quantity,
        line.unitPrice,
        line.lineTotal
      ]);
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES ${placeholders}`,
        ...values
      );
    }

    for (const [productId, quantity] of quantities) {
      await db.runAsync("UPDATE products SET stock = stock - ? WHERE id = ?", quantity, productId);
      await db.runAsync(
        "INSERT INTO stock_movements (product_id, product_name, change, reason, staff_id, created_at) VALUES (?, ?, ?, 'sale', ?, ?)",
        productId,
        productNames.get(productId)!,
        -quantity,
        input.staffId,
        now.toISOString()
      );
    }

    if (customerPhone) {
      const existing = await db.getFirstAsync<Record<string, unknown>>("SELECT id FROM customers WHERE phone = ?", customerPhone);
      if (existing) {
        await db.runAsync(
          "UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1 WHERE id = ?",
          total,
          Number(existing.id)
        );
      } else {
        await db.runAsync(
          "INSERT INTO customers (phone, name, total_spent, visit_count, created_at) VALUES (?, NULL, ?, 1, ?)",
          customerPhone,
          total,
          now.toISOString()
        );
      }
    }
  });

  return saleId;
}

export async function getSaleWithItems(saleId: number) {
  const db = await database();
  const saleRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT s.*, st.name AS staff_name
     FROM sales s
     LEFT JOIN staff st ON st.id = s.staff_id
     WHERE s.id = ?`,
    saleId
  );
  const itemRows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", saleId);

  return saleRow
    ? {
        sale: saleFromRow(saleRow),
        items: itemRows.map(saleItemFromRow),
        staffName: saleRow.staff_name ? String(saleRow.staff_name) : null
      }
    : null;
}

export async function listRecentSales() {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM sales WHERE voided = 0 ORDER BY created_at DESC, id DESC LIMIT 5"
  );
  return rows.map(saleFromRow);
}

export async function listLowStockProducts(limit = 3): Promise<Product[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM products
     WHERE stock <= low_stock_at
     ORDER BY stock ASC, name COLLATE NOCASE
     LIMIT ?`,
    limit
  );
  return rows.map(productFromRow);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      (SELECT COUNT(*) FROM products) AS product_count,
      (SELECT COUNT(*) FROM products WHERE stock <= low_stock_at) AS low_stock_count,
      (SELECT COUNT(*) FROM sales WHERE date(created_at) = date('now') AND voided = 0) AS today_sales,
      (SELECT COALESCE(SUM(total), 0) FROM sales WHERE date(created_at) = date('now') AND voided = 0) AS today_revenue,
      (SELECT COALESCE(SUM(si.line_total - p.cost_price * si.quantity), 0)
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE date(s.created_at) = date('now') AND s.voided = 0) AS today_profit
  `);

  return {
    productCount: Number(row?.product_count ?? 0),
    lowStockCount: Number(row?.low_stock_count ?? 0),
    todaySales: Number(row?.today_sales ?? 0),
    todayRevenue: Number(row?.today_revenue ?? 0),
    todayProfit: Number(row?.today_profit ?? 0)
  };
}

export async function getRevenueByDateRange(startDate: string, endDate: string): Promise<DailyRevenue[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(`
    SELECT
      date(created_at) AS date,
      COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE voided = 0 AND date(created_at) >= date(?) AND date(created_at) <= date(?)
    GROUP BY date(created_at)
    ORDER BY date ASC
  `, startDate, endDate);

  return rows.map((row) => ({
    date: String(row.date),
    total: Number(row.total)
  }));
}

export async function getTopProducts(limit: number, startDate?: string, endDate?: string): Promise<TopProduct[]> {
  const db = await database();
  let query = `
    SELECT
      p.id,
      p.name,
      COALESCE(SUM(si.quantity), 0) AS quantity_sold,
      COALESCE(SUM(si.line_total), 0) AS revenue,
      COALESCE(SUM(si.line_total - p.cost_price * si.quantity), 0) AS profit
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND s.voided = 0
  `;

  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (startDate && endDate) {
    conditions.push(`date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)`);
    params.push(startDate, endDate);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` GROUP BY p.id ORDER BY quantity_sold DESC LIMIT ?`;
  params.push(limit);

  const rows = await db.getAllAsync<Record<string, unknown>>(query, ...params);

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    quantitySold: Number(row.quantity_sold),
    revenue: Number(row.revenue),
    profit: Number(row.profit)
  }));
}

export async function getStaffSalesStats(startDate?: string, endDate?: string): Promise<StaffStats[]> {
  const db = await database();
  let query = `
    SELECT
      st.id AS staff_id,
      st.name AS staff_name,
      COUNT(s.id) AS sales_count,
      COALESCE(SUM(s.total), 0) AS total_revenue
    FROM staff st
    LEFT JOIN sales s ON st.id = s.staff_id AND s.voided = 0
  `;

  const params: string[] = [];
  if (startDate && endDate) {
    query += ` WHERE date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY st.id ORDER BY total_revenue DESC`;

  const rows = await db.getAllAsync<Record<string, unknown>>(query, ...params);

  return rows.map((row) => ({
    staffId: Number(row.staff_id),
    staffName: String(row.staff_name),
    salesCount: Number(row.sales_count),
    totalRevenue: Number(row.total_revenue)
  }));
}

export async function getPaymentBreakdown(startDate?: string, endDate?: string): Promise<PaymentBreakdown[]> {
  const db = await database();
  let query = `
    SELECT
      payment_method AS method,
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE voided = 0
  `;

  const params: string[] = [];
  if (startDate && endDate) {
    query += ` AND date(created_at) >= date(?) AND date(created_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY payment_method`;

  const rows = await db.getAllAsync<Record<string, unknown>>(query, ...params);

  return rows.map((row) => ({
    method: String(row.method) as PaymentMethod,
    count: Number(row.count),
    total: Number(row.total)
  }));
}

export async function getSalesCount(startDate?: string, endDate?: string): Promise<number> {
  const db = await database();
  let query = "SELECT COUNT(*) as count FROM sales WHERE voided = 0";
  const params: string[] = [];

  if (startDate && endDate) {
    query += " AND date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  const row = await db.getFirstAsync<Record<string, unknown>>(query, ...params);
  return Number(row?.count ?? 0);
}

export async function getTotalRevenue(startDate?: string, endDate?: string): Promise<number> {
  const db = await database();
  let query = "SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE voided = 0";
  const params: string[] = [];

  if (startDate && endDate) {
    query += " AND date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  const row = await db.getFirstAsync<Record<string, unknown>>(query, ...params);
  return Number(row?.total ?? 0);
}

export async function getGrossProfit(startDate?: string, endDate?: string): Promise<number> {
  const db = await database();
  let query = `
    SELECT COALESCE(SUM(si.line_total - p.cost_price * si.quantity), 0) AS profit
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id AND s.voided = 0
    JOIN products p ON p.id = si.product_id
  `;
  const params: string[] = [];

  if (startDate && endDate) {
    query += " WHERE date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  const row = await db.getFirstAsync<Record<string, unknown>>(query, ...params);
  return Number(row?.profit ?? 0);
}

function customerFromRow(row: Record<string, unknown>): Customer {
  return {
    id: Number(row.id),
    phone: String(row.phone),
    name: row.name ? String(row.name) : null,
    totalSpent: Number(row.total_spent),
    visitCount: Number(row.visit_count),
    createdAt: String(row.created_at)
  };
}

export async function listAllCustomers(): Promise<Customer[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM customers ORDER BY total_spent DESC");
  return rows.map(customerFromRow);
}

export async function getCustomerStats(): Promise<CustomerStats> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total_spent), 0) AS lifetime_value,
      COALESCE(SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END), 0) AS repeat_buyers
    FROM customers
  `);
  return {
    count: Number(row?.count ?? 0),
    lifetimeValue: Number(row?.lifetime_value ?? 0),
    repeatBuyers: Number(row?.repeat_buyers ?? 0)
  };
}

export async function listCustomersPage(input: {
  limit: number;
  offset: number;
  search?: string;
}): Promise<{ customers: CustomerSummary[]; total: number }> {
  const db = await database();
  const search = input.search?.trim() ?? "";
  const where = search ? "WHERE c.phone LIKE ? OR c.name LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const countRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) AS count FROM customers c ${where}`,
    ...params
  );
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT c.*,
      (SELECT created_at FROM sales WHERE customer_phone = c.phone AND voided = 0 ORDER BY created_at DESC LIMIT 1) AS last_sale_at,
      (SELECT total FROM sales WHERE customer_phone = c.phone AND voided = 0 ORDER BY created_at DESC LIMIT 1) AS last_sale_total
     FROM customers c
     ${where}
     ORDER BY c.total_spent DESC, c.id ASC
     LIMIT ? OFFSET ?`,
    ...params,
    input.limit,
    input.offset
  );

  return {
    customers: rows.map((row) => ({
      ...customerFromRow(row),
      lastSaleAt: row.last_sale_at ? String(row.last_sale_at) : null,
      lastSaleTotal: Number(row.last_sale_total ?? 0)
    })),
    total: Number(countRow?.count ?? 0)
  };
}

export async function listSales(input: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  paymentMethod?: PaymentMethod;
} = {}): Promise<{ sales: Sale[]; total: number }> {
  const db = await database();
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  let whereClause = "voided = 0";
  const params: (string | number)[] = [];

  if (input.startDate && input.endDate) {
    whereClause += " AND date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(input.startDate, input.endDate);
  }

  if (input.search?.trim()) {
    whereClause += " AND receipt_number LIKE ?";
    params.push(`%${input.search.trim()}%`);
  }

  if (input.paymentMethod) {
    whereClause += " AND payment_method = ?";
    params.push(input.paymentMethod);
  }

  const countRow = await db.getFirstAsync<Record<string, unknown>>(`SELECT COUNT(*) as count FROM sales WHERE ${whereClause}`, ...params);
  const total = Number(countRow?.count ?? 0);

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );

  return { sales: rows.map(saleFromRow), total };
}

export async function listAllSales(): Promise<Sale[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM sales ORDER BY created_at DESC, id DESC"
  );
  return rows.map(saleFromRow);
}

export async function listAllSaleItems(): Promise<SaleItemWithReceipt[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT si.*, s.receipt_number
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     ORDER BY si.id`
  );
  return rows.map((row) => ({ ...saleItemFromRow(row), receiptNumber: String(row.receipt_number) }));
}

export async function listProductMovements(productId: number): Promise<StockMovement[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT sm.*, st.name AS staff_name
     FROM stock_movements sm
     LEFT JOIN staff st ON st.id = sm.staff_id
     WHERE sm.product_id = ?
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT 50`,
    productId
  );
  return rows.map(stockMovementFromRow);
}

export async function listStockMovements(input: {
  limit: number;
  offset: number;
  search?: string;
  reason?: StockMovementReason;
}): Promise<{ movements: StockMovement[]; total: number }> {
  const db = await database();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  const search = input.search?.trim() ?? "";

  if (search) {
    conditions.push("(sm.product_name LIKE ? OR sm.note LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (input.reason) {
    conditions.push("sm.reason = ?");
    params.push(input.reason);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) AS count FROM stock_movements sm ${where}`,
    ...params
  );
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT sm.*, st.name AS staff_name
     FROM stock_movements sm
     LEFT JOIN staff st ON st.id = sm.staff_id
     ${where}
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    input.limit,
    input.offset
  );

  return {
    movements: rows.map(stockMovementFromRow),
    total: Number(countRow?.count ?? 0)
  };
}

export async function getStockAuditSummary(): Promise<StockAuditSummary> {
  const db = await database();
  const products = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COUNT(*) AS product_count,
      COALESCE(SUM(stock), 0) AS units_in_stock,
      COALESCE(SUM(stock * cost_price), 0) AS cost_value,
      COALESCE(SUM(stock * selling_price), 0) AS retail_value,
      COALESCE(SUM(CASE WHEN stock <= low_stock_at THEN 1 ELSE 0 END), 0) AS low_stock_count,
      COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count
    FROM products
  `);
  const movements = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COUNT(*) AS movement_count,
      COALESCE(SUM(CASE WHEN reason = 'audit' THEN 1 ELSE 0 END), 0) AS audit_count,
      COALESCE(SUM(CASE WHEN reason = 'audit' THEN change ELSE 0 END), 0) AS audit_change,
      MAX(CASE WHEN reason = 'audit' THEN created_at END) AS last_audit_at
    FROM stock_movements
  `);

  return {
    productCount: Number(products?.product_count ?? 0),
    unitsInStock: Number(products?.units_in_stock ?? 0),
    costValue: Number(products?.cost_value ?? 0),
    retailValue: Number(products?.retail_value ?? 0),
    lowStockCount: Number(products?.low_stock_count ?? 0),
    outOfStockCount: Number(products?.out_of_stock_count ?? 0),
    movementCount: Number(movements?.movement_count ?? 0),
    auditCount: Number(movements?.audit_count ?? 0),
    auditChange: Number(movements?.audit_change ?? 0),
    lastAuditAt: movements?.last_audit_at ? String(movements.last_audit_at) : null
  };
}

export async function recordStockAudit(input: {
  productId: number;
  counted: number;
  staffId?: number | null;
  note?: string;
  varianceReason?: StockMovement["varianceReason"];
}): Promise<number | null> {
  const product = await getProductById(input.productId);
  if (!product || !Number.isInteger(input.counted) || input.counted < 0) {
    return null;
  }

  const db = await database();
  const change = input.counted - product.stock;
  const now = new Date().toISOString();
  const note = input.note?.trim() || null;

  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE products SET stock = ? WHERE id = ?", input.counted, input.productId);
    await db.runAsync(
      `INSERT INTO stock_movements
        (product_id, product_name, change, reason, variance_reason, staff_id, note, created_at)
       VALUES (?, ?, ?, 'audit', ?, ?, ?, ?)`,
      input.productId,
      product.name,
      change,
      change === 0 ? null : input.varianceReason ?? null,
      input.staffId ?? null,
      note,
      now
    );
  });

  return change;
}

export async function restockProduct(productId: number, quantity: number, reason: "restock" | "adjustment" = "restock") {
  const db = await database();
  const product = await getProductById(productId);
  if (!product || quantity <= 0) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE products SET stock = stock + ? WHERE id = ?", quantity, productId);
    await db.runAsync(
      "INSERT INTO stock_movements (product_id, product_name, change, reason, created_at) VALUES (?, ?, ?, ?, ?)",
      productId,
      product.name,
      quantity,
      reason,
      new Date().toISOString()
    );
  });
}

export async function voidSale(saleId: number) {
  const db = await database();
  const record = await getSaleWithItems(saleId);
  if (!record || record.sale.status === "voided") return;

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE sales SET voided = 1 WHERE id = ? AND voided = 0", saleId);

    for (const productId of new Set(record.items.map((item) => item.productId))) {
      const quantity = record.items
        .filter((item) => item.productId === productId)
        .reduce((sum, item) => sum + item.quantity, 0);
      await db.runAsync("UPDATE products SET stock = stock + ? WHERE id = ?", quantity, productId);
      await db.runAsync(
        "INSERT INTO stock_movements (product_id, product_name, change, reason, created_at) VALUES (?, ?, ?, 'void', ?)",
        productId,
        record.items.find((item) => item.productId === productId)!.productName,
        quantity,
        now
      );
    }

    if (record.sale.customerPhone) {
      await db.runAsync(
        "UPDATE customers SET total_spent = MAX(0, total_spent - ?), visit_count = MAX(0, visit_count - 1) WHERE phone = ?",
        record.sale.total,
        record.sale.customerPhone
      );
    }
  });
}
