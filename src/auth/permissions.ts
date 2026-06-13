import type { StaffRole } from "@/db/types";

export type Permission =
  | "products:create"
  | "products:edit"
  | "products:delete"
  | "sales:process"
  | "staff:view"
  | "staff:create"
  | "staff:edit"
  | "staff:delete"
  | "settings:edit"
  | "data:export"
  | "reports:view";

const rolePermissions: Record<StaffRole, Permission[]> = {
  owner: [
    "products:create",
    "products:edit",
    "products:delete",
    "sales:process",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "settings:edit",
    "data:export",
    "reports:view",
  ],
  manager: [
    "products:create",
    "products:edit",
    "products:delete",
    "sales:process",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "data:export",
    "reports:view",
  ],
  cashier: ["sales:process", "reports:view"],
  inventory: ["products:create", "products:edit", "products:delete"],
};

export function canAccess(role: StaffRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
