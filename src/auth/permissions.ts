import type { StaffRole } from "@/db/types";

export type Permission =
  | "products:create"
  | "products:edit"
  | "products:delete"
  | "sales:process"
  | "sales:void"
  | "staff:view"
  | "staff:create"
  | "staff:edit"
  | "staff:delete"
  | "customers:view"
  | "settings:edit"
  | "data:export"
  | "reports:view";

const rolePermissions: Record<StaffRole, Permission[]> = {
  owner: [
    "products:create",
    "products:edit",
    "products:delete",
    "sales:process",
    "sales:void",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "customers:view",
    "settings:edit",
    "data:export",
    "reports:view",
  ],
  manager: [
    "products:create",
    "products:edit",
    "products:delete",
    "sales:process",
    "sales:void",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "customers:view",
    "data:export",
    "reports:view",
  ],
  cashier: ["sales:process", "reports:view"],
};

export function canAccess(role: StaffRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
