export type Role = "Owner" | "Admin" | "Technician" | "Support" | "Accounts" | "Read Only";

export const roleValues = [
  "Owner",
  "Admin",
  "Technician",
  "Support",
  "Accounts",
  "Read Only",
] as const satisfies Role[];

export type Permission =
  | "customers:write"
  | "jobs:write"
  | "quotes:write"
  | "invoices:write"
  | "payments:write"
  | "settings:write"
  | "reports:read";

const permissionsByRole: Record<Role, Permission[]> = {
  Owner: ["customers:write", "jobs:write", "quotes:write", "invoices:write", "payments:write", "settings:write", "reports:read"],
  Admin: ["customers:write", "jobs:write", "quotes:write", "invoices:write", "payments:write", "reports:read"],
  Technician: ["customers:write", "jobs:write", "reports:read"],
  Support: ["customers:write", "jobs:write", "quotes:write", "reports:read"],
  Accounts: ["quotes:write", "invoices:write", "payments:write", "reports:read"],
  "Read Only": ["reports:read"],
};

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export function can(role: Role, permission: Permission) {
  return permissionsByRole[role].includes(permission);
}

export function formatCurrency(amount: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);
}

export function calculateTotals(items: LineItem[], gstRegistered: boolean) {
  return items.reduce(
    (totals, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const tax = gstRegistered ? subtotal * item.taxRate : 0;
      return {
        subtotal: totals.subtotal + subtotal,
        tax: totals.tax + tax,
        total: totals.total + subtotal + tax,
      };
    },
    { subtotal: 0, tax: 0, total: 0 },
  );
}

export function nextNumber(prefix: string, year: number, existingNumbers: string[]) {
  const next = existingNumbers
    .map((number) => number.match(new RegExp(`^${prefix}-${year}-(\\d{4})$`))?.[1])
    .filter(Boolean)
    .map(Number)
    .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export function quoteDecisionTransition(decision: "Approved" | "Declined" | "Contact Requested") {
  if (decision === "Approved") {
    return { quoteStatus: "Approved", jobStatus: "Awaiting Parts", auditEvent: "Quote approved by customer" };
  }

  if (decision === "Declined") {
    return { quoteStatus: "Declined", jobStatus: "Awaiting Quote", auditEvent: "Quote declined by customer" };
  }

  return { quoteStatus: "Viewed", jobStatus: "Awaiting Approval", auditEvent: "Customer requested contact about quote" };
}
