import * as SQLite from "expo-sqlite";

import type {
  Business,
  Customer,
  DailyRevenue,
  DashboardSummary,
  PaymentMethod,
  PaymentBreakdown,
  Product,
  Sale,
  SaleItem,
  StaffMember,
  StaffRole,
  StaffStats,
  TopProduct
} from "./types";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function database() {
  databasePromise ??= SQLite.openDatabaseAsync("myerp.db");
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await database();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      tax_rate REAL NOT NULL DEFAULT 0,
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
      payment_method TEXT NOT NULL,
      customer_phone TEXT,
      staff_id INTEGER,
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

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      total_spent REAL NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

function businessFromRow(row: Record<string, unknown>): Business {
  return {
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    currency: String(row.currency),
    taxRate: Number(row.tax_rate),
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
  return {
    id: Number(row.id),
    name: String(row.name),
    role: String(row.role) as StaffRole,
    pin: String(row.pin),
    active: Number(row.active) === 1,
    createdAt: String(row.created_at)
  };
}

export async function getStaffByPin(pin: string): Promise<StaffMember | null> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM staff WHERE pin = ?", pin);
  return row ? staffFromRow(row) : null;
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
    paymentMethod: String(row.payment_method) as PaymentMethod,
    customerPhone: row.customer_phone ? String(row.customer_phone) : null,
    staffId: row.staff_id ? Number(row.staff_id) : null,
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
}) {
  const db = await database();
  const current = await getBusiness();
  if (!current) return;

  const updates: string[] = [];
  const values: (string | number)[] = [];

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

  if (updates.length === 0) return;

  await db.runAsync(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, ...values, current.id);
}

export async function saveBusiness(input: {
  name: string;
  category: string;
  currency: string;
  taxRate: number;
  ownerName: string;
  ownerPin: string;
}) {
  const db = await database();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO businesses (name, category, currency, tax_rate, created_at) VALUES (?, ?, ?, ?, ?)",
      input.name,
      input.category,
      input.currency,
      input.taxRate,
      now
    );
    await db.runAsync(
      "INSERT INTO staff (name, role, pin, active, created_at) VALUES (?, 'owner', ?, 1, ?)",
      input.ownerName,
      input.ownerPin,
      now
    );
  });
}

export async function listProducts() {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM products ORDER BY name COLLATE NOCASE");
  return rows.map(productFromRow);
}

export async function searchProducts(query: string) {
  const db = await database();
  const searchTerm = `%${query}%`;
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? OR category LIKE ? ORDER BY name COLLATE NOCASE",
    searchTerm,
    searchTerm,
    searchTerm
  );
  return rows.map(productFromRow);
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

  await db.runAsync(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, ...values, id);
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

export async function addStaff(input: { name: string; role: StaffRole; pin: string }) {
  const db = await database();
  await db.runAsync(
    "INSERT INTO staff (name, role, pin, active, created_at) VALUES (?, ?, ?, 1, ?)",
    input.name,
    input.role,
    input.pin,
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
    values.push(input.pin);
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
  const now = new Date();
  const receiptNumber = `R-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-6)}`;
  const total = input.items.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  let saleId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      "INSERT INTO sales (receipt_number, total, payment_method, customer_phone, staff_id, created_at) VALUES (?, ?, ?, NULLIF(?, ''), ?, ?)",
      receiptNumber,
      total,
      input.paymentMethod,
      input.customerPhone,
      input.staffId,
      now.toISOString()
    );
    saleId = result.lastInsertRowId;

    for (const item of input.items) {
      const lineTotal = item.product.sellingPrice * item.quantity;
      await db.runAsync(
        "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)",
        saleId,
        item.product.id,
        item.product.name,
        item.quantity,
        item.product.sellingPrice,
        lineTotal
      );
      await db.runAsync("UPDATE products SET stock = stock - ? WHERE id = ?", item.quantity, item.product.id);
    }
  });

  return saleId;
}

export async function getSaleWithItems(saleId: number) {
  const db = await database();
  const saleRow = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM sales WHERE id = ?", saleId);
  const itemRows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", saleId);

  return saleRow
    ? {
        sale: saleFromRow(saleRow),
        items: itemRows.map(saleItemFromRow)
      }
    : null;
}

export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", saleId);
  return rows.map(saleItemFromRow);
}

export async function listRecentSales() {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM sales ORDER BY created_at DESC LIMIT 20");
  return rows.map(saleFromRow);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>(`
    SELECT
      (SELECT COUNT(*) FROM products) AS product_count,
      (SELECT COUNT(*) FROM products WHERE stock <= low_stock_at) AS low_stock_count,
      (SELECT COUNT(*) FROM sales WHERE date(created_at) = date('now')) AS today_sales,
      (SELECT COALESCE(SUM(total), 0) FROM sales WHERE date(created_at) = date('now')) AS today_revenue
  `);

  return {
    productCount: Number(row?.product_count ?? 0),
    lowStockCount: Number(row?.low_stock_count ?? 0),
    todaySales: Number(row?.today_sales ?? 0),
    todayRevenue: Number(row?.today_revenue ?? 0)
  };
}

export async function getRevenueByDateRange(startDate: string, endDate: string): Promise<DailyRevenue[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>(`
    SELECT
      date(created_at) AS date,
      COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
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
      COALESCE(SUM(si.line_total), 0) AS revenue
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id
  `;

  const params: (string | number)[] = [];
  if (startDate && endDate) {
    query += ` WHERE date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY p.id ORDER BY quantity_sold DESC LIMIT ?`;
  params.push(limit);

  const rows = await db.getAllAsync<Record<string, unknown>>(query, ...params);

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    quantitySold: Number(row.quantity_sold),
    revenue: Number(row.revenue)
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
    LEFT JOIN sales s ON st.id = s.staff_id
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
  `;

  const params: string[] = [];
  if (startDate && endDate) {
    query += ` WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)`;
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
  let query = "SELECT COUNT(*) as count FROM sales";
  const params: string[] = [];

  if (startDate && endDate) {
    query += " WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  const row = await db.getFirstAsync<Record<string, unknown>>(query, ...params);
  return Number(row?.count ?? 0);
}

export async function getTotalRevenue(startDate?: string, endDate?: string): Promise<number> {
  const db = await database();
  let query = "SELECT COALESCE(SUM(total), 0) as total FROM sales";
  const params: string[] = [];

  if (startDate && endDate) {
    query += " WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  const row = await db.getFirstAsync<Record<string, unknown>>(query, ...params);
  return Number(row?.total ?? 0);
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

export async function getOrCreateCustomer(phone: string, name?: string): Promise<Customer> {
  const db = await database();
  let existing = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM customers WHERE phone = ?", phone);

  if (existing) {
    if (name && !existing.name) {
      await db.runAsync("UPDATE customers SET name = ? WHERE id = ?", name, Number(existing.id));
      existing = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM customers WHERE id = ?", Number(existing.id));
    }
    return customerFromRow(existing!);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO customers (phone, name, total_spent, visit_count, created_at) VALUES (?, ?, 0, 0, ?)",
    phone,
    name || null,
    now
  );

  const newCustomer = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM customers WHERE phone = ?", phone);
  return customerFromRow(newCustomer!);
}



export async function listAllCustomers(): Promise<Customer[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM customers ORDER BY total_spent DESC");
  return rows.map(customerFromRow);
}

export async function getCustomerCount(): Promise<number> {
  const db = await database();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT COUNT(*) as count FROM customers");
  return Number(row?.count ?? 0);
}

export async function listSales(limit: number = 50, offset: number = 0, startDate?: string, endDate?: string, search?: string): Promise<{ sales: Sale[]; total: number }> {
  const db = await database();
  let whereClause = "1=1";
  const params: (string | number)[] = [];

  if (startDate && endDate) {
    whereClause += " AND date(created_at) >= date(?) AND date(created_at) <= date(?)";
    params.push(startDate, endDate);
  }

  if (search) {
    whereClause += " AND receipt_number LIKE ?";
    params.push(`%${search}%`);
  }

  const countRow = await db.getFirstAsync<Record<string, unknown>>(`SELECT COUNT(*) as count FROM sales WHERE ${whereClause}`, ...params);
  const total = Number(countRow?.count ?? 0);

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );

  return { sales: rows.map(saleFromRow), total };
}
