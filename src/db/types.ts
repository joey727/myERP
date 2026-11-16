export type Business = {
  id: number;
  name: string;
  category: string;
  currency: string;
  taxRate: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  receiptFooter: string | null;
  createdAt: string;
};

export type StaffRole = "owner" | "manager" | "cashier";

export type StaffMember = {
  id: number;
  name: string;
  role: StaffRole;
  pin: string;
  active: boolean;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  barcode: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAt: number;
  createdAt: string;
};

export type PaymentMethod = "cash" | "momo";

type SaleStatus = "active" | "voided";

export type Sale = {
  id: number;
  receiptNumber: string;
  total: number;
  tax: number;
  paymentMethod: PaymentMethod;
  customerPhone: string | null;
  staffId: number | null;
  status: SaleStatus;
  createdAt: string;
};

export type SaleItem = {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type DashboardSummary = {
  productCount: number;
  lowStockCount: number;
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
};

export type Customer = {
  id: number;
  phone: string;
  name: string | null;
  totalSpent: number;
  visitCount: number;
  createdAt: string;
};

export type DailyRevenue = {
  date: string;
  total: number;
};

export type TopProduct = {
  id: number;
  name: string;
  quantitySold: number;
  revenue: number;
  profit: number;
};

export type StaffStats = {
  staffId: number;
  staffName: string;
  salesCount: number;
  totalRevenue: number;
};

export type PaymentBreakdown = {
  method: PaymentMethod;
  count: number;
  total: number;
};

export type StockMovementReason = "sale" | "restock" | "adjustment" | "void" | "audit";

export type StockAuditReason =
  | "damaged"
  | "missing"
  | "found"
  | "supplier"
  | "miscount"
  | "other";

export type StockMovement = {
  id: number;
  productId: number;
  productName: string;
  change: number;
  reason: StockMovementReason;
  varianceReason: StockAuditReason | null;
  staffId: number | null;
  staffName: string | null;
  note: string | null;
  createdAt: string;
};

export type StockAuditSummary = {
  productCount: number;
  unitsInStock: number;
  costValue: number;
  retailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  movementCount: number;
  auditCount: number;
  auditChange: number;
  lastAuditAt: string | null;
};

export type SaleItemWithReceipt = SaleItem & { receiptNumber: string };

export type CustomerSummary = Customer & {
  lastSaleAt: string | null;
  lastSaleTotal: number;
};

export type CustomerStats = {
  count: number;
  lifetimeValue: number;
  repeatBuyers: number;
};

export type ProductStats = {
  count: number;
  lowStockCount: number;
};
