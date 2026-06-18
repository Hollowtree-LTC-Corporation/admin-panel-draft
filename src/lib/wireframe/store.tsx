import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product, Role } from "./data";
import { AFFILIATE_ORGANIZATIONS, type AffiliateOrganization } from "./data";

type Ctx = {
  product: Product;
  setProduct: (p: Product) => void;
  role: Role;
  setRole: (r: Role) => void;
  affiliates: AffiliateOrganization[];
  setAffiliates: (a: AffiliateOrganization[] | ((prev: AffiliateOrganization[]) => AffiliateOrganization[])) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product>("DI");
  const [role, setRole] = useState<Role>("admin");
  const [affiliates, setAffiliatesState] = useState<AffiliateOrganization[]>(() => AFFILIATE_ORGANIZATIONS.map((a) => ({ ...a })));
  const setAffiliates: Ctx["setAffiliates"] = (a) => {
    setAffiliatesState((prev) => (typeof a === "function" ? (a as (p: AffiliateOrganization[]) => AffiliateOrganization[])(prev) : a));
  };
  return (
    <StoreCtx.Provider value={{ product, setProduct, role, setRole, affiliates, setAffiliates }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("StoreProvider missing");
  return ctx;
}

// Permission matrix per CRUD affordance spec. Returns whether the action is allowed.
type Action = "create" | "update" | "delete" | "revoke" | "approve" | "status_only";
type Resource =
  | "organizations" | "benefit_classes" | "individuals" | "billing_groups"
  | "payment_ledger" | "account_adjustments" | "fee_schedules" | "rate_config"
  | "enrollment_responses" | "carriers" | "carrier_products" | "policies"
  | "channel_partners" | "commission_statements" | "carrier_commission_schedules"
  | "commission_rate_tiers" | "commission_split_defaults" | "commission_splits"
  | "rate_cells" | "magic_tokens" | "token_audit_log" | "audit_log"
  | "missing_submissions" | "enrollment_windows" | "enrollment_window_channel_partners"
  | "affiliate_organizations";

const RESOURCE_CAPS: Record<Resource, Partial<Record<Action, boolean>>> = {
  organizations: { create: true, update: true, delete: true },
  benefit_classes: { create: true, update: true },
  individuals: { create: true, update: true, delete: true },
  billing_groups: { create: true, update: true },
  payment_ledger: {},
  account_adjustments: { create: true, approve: true },
  fee_schedules: { create: true, update: true },
  rate_config: { create: true, update: true },
  enrollment_responses: {},
  carriers: { create: true, update: true },
  carrier_products: { create: true, update: true },
  policies: { create: true, update: true },
  channel_partners: { create: true, update: true },
  commission_statements: {},
  carrier_commission_schedules: { create: true, update: true },
  commission_rate_tiers: { create: true, update: true },
  commission_split_defaults: { create: true, update: true },
  commission_splits: { create: true, update: true },
  rate_cells: {},
  magic_tokens: { revoke: true },
  token_audit_log: {},
  audit_log: {},
  missing_submissions: { status_only: true },
  enrollment_windows: { create: true, update: true },
  enrollment_window_channel_partners: { create: true, update: true },
  affiliate_organizations: { create: true, update: true, delete: true },
};

const ADMIN_ONLY: Array<[Resource, Action]> = [
  ["account_adjustments", "approve"],
  ["magic_tokens", "revoke"],
];
const ADMIN_ONLY_RESOURCES: Resource[] = ["token_audit_log", "audit_log", "magic_tokens"];

export function usePermission() {
  const { role } = useStore();
  return (resource: Resource, action: Action): boolean => {
    if (role === "read-only") return false;
    const allowed = RESOURCE_CAPS[resource]?.[action];
    if (!allowed) return false;
    if (role === "ops") {
      if (ADMIN_ONLY.some(([r, a]) => r === resource && a === action)) return false;
    }
    return true;
  };
}

export function useCanViewAdminOnly() {
  const { role } = useStore();
  return (resource: Resource) => {
    if (!ADMIN_ONLY_RESOURCES.includes(resource)) return true;
    return role === "admin";
  };
}
