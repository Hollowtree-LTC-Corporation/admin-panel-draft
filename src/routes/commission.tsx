import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Download, FileText, User, ExternalLink, AlertTriangle } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, Field, SectionTitle, Card,
} from "@/components/wireframe/Bits";
import {
  CHANNEL_PARTNERS, POLICY_SPLITS_INITIAL, POLICIES, formatCents,
  type PayeeType, type PaymentMethodSetting, type SplitSource,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import {
  FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink,
} from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/commission")({ component: View });

// ---------------------------------------------------------------------------
// Schema-accurate partner_type values (per developer handoff). Mapped on top
// of the legacy CHANNEL_PARTNERS shape used elsewhere in the wireframe.
// ---------------------------------------------------------------------------
type PartnerTypeV2 =
  | "Benefits Broker" | "CPA Firm" | "P&C Firm" | "Individual Broker"
  | "Financial Advisory" | "IMO-BGA" | "PEO" | "Internal";
const PARTNER_TYPE_VALUES: PartnerTypeV2[] = [
  "Benefits Broker", "CPA Firm", "P&C Firm", "Individual Broker",
  "Financial Advisory", "IMO-BGA", "PEO", "Internal",
];
type EntityType = "individual" | "company";
type LicenseStatus = "Licensed" | "Unlicensed";
type ActivationStatus = "Prospect" | "In Conversation" | "Agreement Signed" | "Active" | "Dormant";
type AgreementStatus = "Not Sent" | "Sent" | "Signed";
type PortalStatus = "none" | "invited" | "active";

type PartnerExt = {
  partner_type_v2: PartnerTypeV2;
  partner_entity_type: EntityType;
  license_number: string;
  license_status: LicenseStatus;
  activation_status: ActivationStatus;
  agreement_status: AgreementStatus;
  agreement_date: string | null;
  primary_contact_name: string;
  primary_contact_email: string;
  google_drive_folder: string;
  attio_channel_partner_id: string;
  portal_status: PortalStatus;
  portal_invited_at: string | null;
  portal_last_login: string | null;
};

// Hollowtree House (cpn_3) is intentionally excluded. House is a payee_type
// with NULL ref_id, not a channel_partner. See discrepancy note at bottom.
const PARTNER_EXT: Record<string, PartnerExt> = {
  cpn_1: { partner_type_v2: "Benefits Broker", partner_entity_type: "company", license_number: "BR-TX-118422", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2024-03-15", primary_contact_name: "Liana Okafor", primary_contact_email: "liana.okafor@wtcbenefits.example.com", google_drive_folder: "https://drive.google.com/drive/folders/wtc-benefits", attio_channel_partner_id: "att_cp_wtc", portal_status: "active", portal_invited_at: "2024-03-20", portal_last_login: "2025-06-12" },
  cpn_2: { partner_type_v2: "Benefits Broker", partner_entity_type: "company", license_number: "BR-CA-072115", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-11-02", primary_contact_name: "Marcus Westfield", primary_contact_email: "mwestfield@westfieldbrokers.example.com", google_drive_folder: "https://drive.google.com/drive/folders/westfield", attio_channel_partner_id: "att_cp_westfield", portal_status: "active", portal_invited_at: "2023-11-10", portal_last_login: "2025-06-14" },
  cpn_4: { partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-NY-554102", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-01-15", primary_contact_name: "Jamie Rep", primary_contact_email: "jamie@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_jamie", portal_status: "active", portal_invited_at: "2023-01-15", portal_last_login: "2025-06-15" },
  cpn_5: { partner_type_v2: "IMO-BGA", partner_entity_type: "company", license_number: "IM-IL-440091", license_status: "Licensed", activation_status: "Agreement Signed", agreement_status: "Signed", agreement_date: "2024-09-10", primary_contact_name: "Patricia Kim", primary_contact_email: "pkim@gallagher.example.com", google_drive_folder: "https://drive.google.com/drive/folders/gallagher", attio_channel_partner_id: "att_cp_gallagher", portal_status: "invited", portal_invited_at: "2025-05-22", portal_last_login: null },
  cpn_6: { partner_type_v2: "IMO-BGA", partner_entity_type: "company", license_number: "IM-FL-119087", license_status: "Licensed", activation_status: "In Conversation", agreement_status: "Sent", agreement_date: null, primary_contact_name: "Derek Holloway", primary_contact_email: "derek@overridegroup.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_override", portal_status: "none", portal_invited_at: null, portal_last_login: null },
};
const ADDITIONAL_INTERNAL: Array<{ id: string; name: string; default_split_pct: number; payment_method: PaymentMethodSetting } & PartnerExt> = [
  { id: "cpn_7", name: "Guy Livingstone", default_split_pct: 10, payment_method: "hollowtree_paid", partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-NY-991133", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2022-05-01", primary_contact_name: "Guy Livingstone", primary_contact_email: "guy@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_guy", portal_status: "active", portal_invited_at: "2022-05-01", portal_last_login: "2025-06-15" },
  { id: "cpn_8", name: "Casey Rep", default_split_pct: 10, payment_method: "hollowtree_paid", partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-MA-220714", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-06-19", primary_contact_name: "Casey Rep", primary_contact_email: "casey@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_casey", portal_status: "active", portal_invited_at: "2023-06-20", portal_last_login: "2025-06-13" },
];

type Partner = {
  id: string;
  name: string;
  default_split_pct: number;
  payment_method: PaymentMethodSetting;
} & PartnerExt;

const ALL_PARTNERS: Partner[] = [
  ...CHANNEL_PARTNERS
    .filter((p) => p.partner_type !== "House")
    .filter((p) => PARTNER_EXT[p.id])
    .map((p) => ({
      id: p.id, name: p.name,
      default_split_pct: p.default_split_pct,
      payment_method: p.payment_method as PaymentMethodSetting,
      ...PARTNER_EXT[p.id],
    })),
  ...ADDITIONAL_INTERNAL,
];

// ---------------------------------------------------------------------------
// Commission split defaults (schema-aligned). One channel_partner has one or
// more rows. House rows have payee_ref_id = null.
// ---------------------------------------------------------------------------
type DefaultRow = {
  id: string;
  channel_partner_id: string;
  channel_partner_name: string;
  payee_type: PayeeType;
  payee_ref_id: string | null;
  payee_name: string;
  default_split_pct: number;
  payment_method: PaymentMethodSetting;
};

const INITIAL_DEFAULTS: DefaultRow[] = [
  // WTC Benefits agreement
  { id: "csd_1", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", default_split_pct: 45, payment_method: "hollowtree_paid" },
  { id: "csd_2", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "internal_rep", payee_ref_id: "cpn_7", payee_name: "Guy Livingstone", default_split_pct: 10, payment_method: "hollowtree_paid" },
  { id: "csd_3", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits", default_split_pct: 40, payment_method: "hollowtree_paid" },
  { id: "csd_4", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "override", payee_ref_id: "cpn_5", payee_name: "Gallagher", default_split_pct: 5, payment_method: "carrier_direct" },
  // Westfield Brokers agreement
  { id: "csd_5", channel_partner_id: "cpn_2", channel_partner_name: "Westfield Brokers", payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", default_split_pct: 50, payment_method: "hollowtree_paid" },
  { id: "csd_6", channel_partner_id: "cpn_2", channel_partner_name: "Westfield Brokers", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers", default_split_pct: 50, payment_method: "hollowtree_paid" },
];

// ---------------------------------------------------------------------------
// Active commission splits derived from POLICY_SPLITS_INITIAL.
// ---------------------------------------------------------------------------
type ActiveSplit = {
  id: string;
  policy_id: string;
  org_name: string;
  payee_type: PayeeType;
  payee_name: string;
  split_pct: number;
  source: SplitSource;
  payment_method: PaymentMethodSetting;
  effective_from: string;
  effective_to: string | null;
};
const ACTIVE_SPLITS: ActiveSplit[] = POLICY_SPLITS_INITIAL.map((s) => {
  const pol = POLICIES.find((p) => p.id === s.policy_id);
  return {
    id: s.id, policy_id: s.policy_id, org_name: pol?.org_name ?? "—",
    payee_type: s.payee_type, payee_name: s.payee_name, split_pct: s.split_pct,
    source: s.source, payment_method: s.payment_method,
    effective_from: pol?.initial_effective_date ?? "2025-01-01",
    effective_to: s.effective_to,
  };
});
// Demonstrate override badge: flip a couple of rows.
const OVERRIDE_DEMO_IDS = new Set(["ps_4_2", "ps_5_4"]);
for (const r of ACTIVE_SPLITS) if (OVERRIDE_DEMO_IDS.has(r.id)) r.source = "override";

// ---------------------------------------------------------------------------
// Commission statements (schema-aligned).
// ---------------------------------------------------------------------------
type StmtStatus = "draft" | "approved" | "paid";
type Statement = {
  id: string;
  policy_id: string;
  channel_partner_id: string | null; // null for house
  payee_type: PayeeType;
  payee_ref_id: string | null;
  payee_name: string;
  period_start: string;
  period_end: string;
  total_premium_cents: number;
  commission_pct: number;
  commission_owed_cents: number;
  status: StmtStatus;
  generated_at: string;
  generated_by: string;
  approved_at: string | null;
  paid_at: string | null;
  pdf_url: string;
  commission_split_id: string | null;
  carrier_commission_schedule_id: string | null;
  payable: boolean;
};

const STMT_SEED: Statement[] = [
  // July 2025
  { id: "stm_1", policy_id: "pol_1", channel_partner_id: null, payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 97200, status: "paid", generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", paid_at: "2025-08-08T14:00:00Z", pdf_url: "#", commission_split_id: "ps_1_1", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_2", policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits", period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 86400, status: "paid", generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", paid_at: "2025-08-08T14:00:00Z", pdf_url: "#", commission_split_id: "ps_1_3", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_3", policy_id: "pol_1", channel_partner_id: "cpn_7", payee_type: "internal_rep", payee_ref_id: "cpn_7", payee_name: "Guy Livingstone", period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 21600, status: "paid", generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", paid_at: "2025-08-08T14:00:00Z", pdf_url: "#", commission_split_id: "ps_1_2", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_4", policy_id: "pol_1", channel_partner_id: "cpn_5", payee_type: "override", payee_ref_id: "cpn_5", payee_name: "Gallagher", period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 10800, status: "paid", generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_1_4", carrier_commission_schedule_id: null, payable: false },
  // August 2025
  { id: "stm_5", policy_id: "pol_1", channel_partner_id: null, payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 113400, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_1_1", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_6", policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits", period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 100800, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_1_3", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_7", policy_id: "pol_2", channel_partner_id: "cpn_2", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers", period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 950000, commission_pct: 10.0, commission_owed_cents: 47500, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_2_2", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_8", policy_id: "pol_1", channel_partner_id: "cpn_7", payee_type: "internal_rep", payee_ref_id: "cpn_7", payee_name: "Guy Livingstone", period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 25200, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_1_2", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_9", policy_id: "pol_1", channel_partner_id: "cpn_5", payee_type: "override", payee_ref_id: "cpn_5", payee_name: "Gallagher", period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 12600, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", paid_at: null, pdf_url: "#", commission_split_id: "ps_1_4", carrier_commission_schedule_id: null, payable: false },
  // September 2025 — drafts
  { id: "stm_10", policy_id: "pol_1", channel_partner_id: null, payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 120960, status: "draft", generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, paid_at: null, pdf_url: "#", commission_split_id: "ps_1_1", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_11", policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits", period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 107520, status: "draft", generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, paid_at: null, pdf_url: "#", commission_split_id: "ps_1_3", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_12", policy_id: "pol_2", channel_partner_id: "cpn_2", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers", period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 1020000, commission_pct: 10.0, commission_owed_cents: 51000, status: "draft", generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, paid_at: null, pdf_url: "#", commission_split_id: "ps_2_2", carrier_commission_schedule_id: null, payable: true },
  { id: "stm_13", policy_id: "pol_4", channel_partner_id: "cpn_8", payee_type: "internal_rep", payee_ref_id: "cpn_8", payee_name: "Casey Rep", period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 640000, commission_pct: 12.0, commission_owed_cents: 7680, status: "draft", generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, paid_at: null, pdf_url: "#", commission_split_id: "ps_4_2", carrier_commission_schedule_id: "ccs_10", payable: true },
  { id: "stm_14", policy_id: "pol_5", channel_partner_id: "cpn_5", payee_type: "override", payee_ref_id: "cpn_5", payee_name: "Gallagher", period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 13440, status: "draft", generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, paid_at: null, pdf_url: "#", commission_split_id: "ps_5_4", carrier_commission_schedule_id: null, payable: false },
];

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function fmtPeriod(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const mo = s.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${mo} (${s.getDate()}-${e.getDate()})`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PartnerTypeBadge({ t }: { t: PartnerTypeV2 }) {
  const tone: Record<PartnerTypeV2, string> = {
    "Internal": "bg-teal-100 text-teal-800",
    "Benefits Broker": "bg-sky-100 text-sky-800",
    "Individual Broker": "bg-sky-50 text-sky-700",
    "IMO-BGA": "bg-amber-100 text-amber-800",
    "CPA Firm": "bg-black/5 text-black/70",
    "P&C Firm": "bg-black/5 text-black/70",
    "Financial Advisory": "bg-black/5 text-black/70",
    "PEO": "bg-black/5 text-black/70",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tone[t]}`}>{t}</span>;
}
function PayeeTypeBadge({ t }: { t: PayeeType }) {
  const tone: Record<PayeeType, string> = {
    house: "bg-black/5 text-black/70",
    internal_rep: "bg-teal-100 text-teal-800",
    channel_partner: "bg-sky-100 text-sky-800",
    override: "bg-amber-100 text-amber-800",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tone[t]}`}>{t.replace(/_/g, " ")}</span>;
}
function ActivationBadge({ s }: { s: ActivationStatus }) {
  const tone: Record<ActivationStatus, string> = {
    "Active": "bg-emerald-100 text-emerald-800",
    "Agreement Signed": "bg-emerald-50 text-emerald-700",
    "In Conversation": "bg-amber-100 text-amber-800",
    "Prospect": "bg-black/5 text-black/70",
    "Dormant": "bg-rose-50 text-rose-700",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tone[s]}`}>{s}</span>;
}
function StatusBadge({ s }: { s: StmtStatus }) {
  const t = s === "paid" ? "bg-emerald-100 text-emerald-800"
    : s === "approved" ? "bg-sky-100 text-sky-800"
    : "bg-black/5 text-black/70";
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${t}`}>{s}</span>;
}
function PaymentMethodBadge({ m }: { m: PaymentMethodSetting }) {
  return <Pill tone={m === "hollowtree_paid" ? "info" : "warn"}>{m === "hollowtree_paid" ? "Hollowtree Paid" : "Carrier Direct"}</Pill>;
}
function PortalCell({ p }: { p: PortalStatus }) {
  if (p === "active") return <Pill tone="ok">Active</Pill>;
  if (p === "invited") return <Pill tone="warn">Invited</Pill>;
  return <span className="text-black/30">—</span>;
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
function View() {
  const { product } = useStore();
  const can = usePermission();

  const [partners, setPartners] = useState<Partner[]>(ALL_PARTNERS);
  const [defaults, setDefaults] = useState<DefaultRow[]>(INITIAL_DEFAULTS);
  const [statements, setStatements] = useState<Statement[]>(STMT_SEED);

  // Drawers
  const [partnerDrawer, setPartnerDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [stmtDrawer, setStmtDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [genDrawer, setGenDrawer] = useState(false);

  // -------------- Section 1 filters --------------
  const [pSearch, setPSearch] = useState("");
  const [pTypes, setPTypes] = useState<Set<PartnerTypeV2>>(new Set());
  const [pEntity, setPEntity] = useState<EntityType | "all">("all");
  const [pActivations, setPActivations] = useState<Set<ActivationStatus>>(new Set());
  const [pInternalOnly, setPInternalOnly] = useState(false);

  const filteredPartners = useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    return partners.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (pTypes.size > 0 && !pTypes.has(p.partner_type_v2)) return false;
      if (pEntity !== "all" && p.partner_entity_type !== pEntity) return false;
      if (pActivations.size > 0 && !pActivations.has(p.activation_status)) return false;
      if (pInternalOnly && p.partner_type_v2 !== "Internal") return false;
      return true;
    });
  }, [partners, pSearch, pTypes, pEntity, pActivations, pInternalOnly]);

  // -------------- Section 2 filters --------------
  const [dPartner, setDPartner] = useState("all");
  const [dPayeeType, setDPayeeType] = useState<PayeeType | "all">("all");
  const [dPayMethod, setDPayMethod] = useState<PaymentMethodSetting | "all">("all");
  const filteredDefaults = useMemo(() => {
    return defaults.filter((d) => {
      if (dPartner !== "all" && d.channel_partner_id !== dPartner) return false;
      if (dPayeeType !== "all" && d.payee_type !== dPayeeType) return false;
      if (dPayMethod !== "all" && d.payment_method !== dPayMethod) return false;
      return true;
    });
  }, [defaults, dPartner, dPayeeType, dPayMethod]);

  // -------------- Section 3 filters --------------
  const [aPolicy, setAPolicy] = useState("");
  const [aPayee, setAPayee] = useState("all");
  const [aPayeeType, setAPayeeType] = useState<PayeeType | "all">("all");
  const [aSource, setASource] = useState<SplitSource | "all">("all");
  const [aPayMethod, setAPayMethod] = useState<PaymentMethodSetting | "all">("all");
  const [aCurrentOnly, setACurrentOnly] = useState(true);
  const payeeNameOptions = useMemo(() => {
    const set = new Set<string>(["Hollowtree", ...partners.map((p) => p.name)]);
    return Array.from(set).map((n) => ({ value: n, label: n }));
  }, [partners]);
  const filteredActive = useMemo(() => {
    const q = aPolicy.trim().toLowerCase();
    return ACTIVE_SPLITS.filter((s) => {
      if (q && !(s.policy_id.toLowerCase().includes(q) || s.org_name.toLowerCase().includes(q))) return false;
      if (aPayee !== "all" && s.payee_name !== aPayee) return false;
      if (aPayeeType !== "all" && s.payee_type !== aPayeeType) return false;
      if (aSource !== "all" && s.source !== aSource) return false;
      if (aPayMethod !== "all" && s.payment_method !== aPayMethod) return false;
      if (aCurrentOnly && s.effective_to !== null) return false;
      return true;
    });
  }, [aPolicy, aPayee, aPayeeType, aSource, aPayMethod, aCurrentOnly]);

  // -------------- Section 4 filters --------------
  const [sPartner, setSPartner] = useState("all");
  const [sPolicy, setSPolicy] = useState("all");
  const [sStatus, setSStatus] = useState<StmtStatus | "all">("all");
  const [sPeriod, setSPeriod] = useState<"all" | "30" | "qtr" | "ytd">("all");
  const [sPayable, setSPayable] = useState<"all" | "yes" | "no">("all");
  const policyOptions = useMemo(() => {
    return POLICIES.map((p) => ({ value: p.id, label: `${p.id} (${p.org_name})` }));
  }, []);
  const filteredStatements = useMemo(() => {
    return statements.filter((s) => {
      if (sPartner !== "all") {
        if (sPartner === "house" ? s.payee_type !== "house" : s.channel_partner_id !== sPartner) return false;
      }
      if (sPolicy !== "all" && s.policy_id !== sPolicy) return false;
      if (sStatus !== "all" && s.status !== sStatus) return false;
      if (sPayable !== "all" && (sPayable === "yes") !== s.payable) return false;
      if (sPeriod !== "all") {
        const end = new Date(s.period_end + "T00:00:00");
        const now = new Date("2025-10-15T00:00:00");
        if (sPeriod === "30") {
          const diff = (now.getTime() - end.getTime()) / 86400000;
          if (diff > 30 || diff < 0) return false;
        } else if (sPeriod === "qtr") {
          const diff = (now.getTime() - end.getTime()) / 86400000;
          if (diff > 90 || diff < 0) return false;
        } else if (sPeriod === "ytd") {
          if (end.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [statements, sPartner, sPolicy, sStatus, sPeriod, sPayable]);

  // -------------- Actions --------------
  const approveStatement = (id: string) => {
    setStatements((rows) => rows.map((r) => r.id === id ? { ...r, status: "approved", approved_at: new Date().toISOString() } : r));
    toast.success("Statement approved.");
  };
  const markPaid = (id: string) => {
    setStatements((rows) => rows.map((r) => r.id === id ? { ...r, status: "paid", paid_at: new Date().toISOString() } : r));
    toast.success("Statement marked paid.");
  };
  const rejectStatement = (id: string) => {
    setStatements((rows) => rows.filter((r) => r.id !== id));
    setStmtDrawer({ open: false, id: null });
    toast.success("Draft statement deleted.");
  };

  // Multi-select dropdown helper
  const togglePType = (t: PartnerTypeV2) => setPTypes((prev) => {
    const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next;
  });
  const toggleActivation = (t: ActivationStatus) => setPActivations((prev) => {
    const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next;
  });

  const selectedPartner = partnerDrawer.id ? partners.find((p) => p.id === partnerDrawer.id) ?? null : null;
  const selectedStmt = stmtDrawer.id ? statements.find((s) => s.id === stmtDrawer.id) ?? null : null;

  return (
    <div>
      <PageHeader
        title="Commission"
        subtitle={`${product} commission configuration. Waterfall must sum to 100%.`}
        actions={
          <Btn variant="primary" onClick={() => setGenDrawer(true)} disabled={!can("commission_statements", "create")}>
            Generate Statements for Period
          </Btn>
        }
      />

      {/* ============================ SECTION 1 ============================ */}
      <SectionTitle>Channel Partners</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Broker firms, individual brokers, and Hollowtree internal reps. All payees other than the house are channel_partners rows.
      </div>
      <FilterRow>
        <FilterSearch value={pSearch} onChange={setPSearch} placeholder="Search partner name…" />
        <span className="text-xs text-black/40">Synced from Attio. Edit partners in CRM.</span>
        <MultiPill label="Type" all={PARTNER_TYPE_VALUES} selected={pTypes} onToggle={togglePType} />
        <div className="inline-flex rounded border border-black/15 overflow-hidden text-xs">
          {(["all", "individual", "company"] as const).map((v) => (
            <button key={v} onClick={() => setPEntity(v)} className={`px-2 py-1 ${pEntity === v ? "bg-[#0a3d3e] text-white" : "bg-white hover:bg-black/5"}`}>
              {v === "all" ? "All" : v === "individual" ? "Individual" : "Company"}
            </button>
          ))}
        </div>
        <MultiPill<ActivationStatus> label="Activation" all={["Prospect","In Conversation","Agreement Signed","Active","Dormant"]} selected={pActivations} onToggle={toggleActivation} />
        <label className="inline-flex items-center gap-1 text-xs ml-1">
          <input type="checkbox" checked={pInternalOnly} onChange={(e) => setPInternalOnly(e.target.checked)} />
          Show internal reps only
        </label>
        <ClearFiltersLink show={pSearch !== "" || pTypes.size > 0 || pEntity !== "all" || pActivations.size > 0 || pInternalOnly}
          onClick={() => { setPSearch(""); setPTypes(new Set()); setPEntity("all"); setPActivations(new Set()); setPInternalOnly(false); }} />
        <ExportCsvButton filteredCount={filteredPartners.length} totalCount={partners.length} resourceLabel="channel partners" />
      </FilterRow>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>{["Partner Name","Type","Entity","License","Agreement","Activation","Portal","Actions"].map((c) => (
            <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {filteredPartners.map((p) => (
            <TRow key={p.id} onClick={() => setPartnerDrawer({ open: true, id: p.id })}>
              <TCell className="font-medium">{p.name}</TCell>
              <TCell><PartnerTypeBadge t={p.partner_type_v2} /></TCell>
              <TCell>
                {p.partner_entity_type === "individual"
                  ? <User className="h-3.5 w-3.5 text-black/50" />
                  : <Building2 className="h-3.5 w-3.5 text-black/50" />}
              </TCell>
              <TCell>
                <span title={`License #: ${p.license_number}`}>
                  <Pill tone={p.license_status === "Licensed" ? "ok" : "neutral"}>{p.license_status}</Pill>
                </span>
              </TCell>
              <TCell>
                {p.agreement_status === "Signed" && p.agreement_date
                  ? <span>Signed <span className="text-black/40">({fmtDate(p.agreement_date)})</span></span>
                  : p.agreement_status}
              </TCell>
              <TCell><ActivationBadge s={p.activation_status} /></TCell>
              <TCell><PortalCell p={p.portal_status} /></TCell>
              <TCell onClick={(e) => e.stopPropagation()}>
                {p.portal_status === "none"
                  ? <Btn onClick={() => { setPartners((r) => r.map(x => x.id === p.id ? { ...x, portal_status: "invited", portal_invited_at: new Date().toISOString().slice(0,10) } : x)); toast.success(`Invite sent to ${p.primary_contact_email}.`); }}>Invite to Portal</Btn>
                  : <Btn onClick={() => setPartnerDrawer({ open: true, id: p.id })}>View access</Btn>}
              </TCell>
            </TRow>
          ))}
          {filteredPartners.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-6 text-center text-black/40">No partners match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* ============================ SECTION 2 ============================ */}
      <SectionTitle>Commission Split Defaults</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Default split templates per channel partner agreement. Copied to per-policy splits at policy creation.
      </div>
      <FilterRow>
        <FilterCombobox value={dPartner} onChange={setDPartner} placeholder="All channel partners"
          options={partners.map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect value={dPayeeType} onChange={setDPayeeType} allLabel="All payee types"
          options={[{value:"house"},{value:"internal_rep",label:"internal rep"},{value:"channel_partner",label:"channel partner"},{value:"override"}]} />
        <FilterSelect value={dPayMethod} onChange={setDPayMethod} allLabel="All payment methods"
          options={[{value:"hollowtree_paid",label:"Hollowtree Paid"},{value:"carrier_direct",label:"Carrier Direct"}]} />
        <ClearFiltersLink show={dPartner !== "all" || dPayeeType !== "all" || dPayMethod !== "all"}
          onClick={() => { setDPartner("all"); setDPayeeType("all"); setDPayMethod("all"); }} />
        <ExportCsvButton filteredCount={filteredDefaults.length} totalCount={defaults.length} resourceLabel="commission split defaults" />
      </FilterRow>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>{["Channel Partner","Payee Type","Payee","Default Split %","Payment Method","Actions"].map((c) => (
            <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            const grouped = [...filteredDefaults].sort((a, b) =>
              a.channel_partner_name.localeCompare(b.channel_partner_name));
            let prev = "";
            return grouped.map((d) => {
              const sep = d.channel_partner_name !== prev;
              prev = d.channel_partner_name;
              return (
                <tr key={d.id} className={`border-t ${sep ? "border-black/15" : "border-black/5"}`}>
                  <td className="px-3 py-2">
                    <button className="text-[#0a3d3e] underline" onClick={() => setPartnerDrawer({ open: true, id: d.channel_partner_id })}>
                      {d.channel_partner_name}
                    </button>
                  </td>
                  <td className="px-3 py-2"><PayeeTypeBadge t={d.payee_type} /></td>
                  <td className="px-3 py-2">{d.payee_name}</td>
                  <td className="px-3 py-2">{d.default_split_pct}%</td>
                  <td className="px-3 py-2"><PaymentMethodBadge m={d.payment_method} /></td>
                  <td className="px-3 py-2 text-right">
                    <button className="text-[11px] text-black/50 hover:text-black mr-2" onClick={() => toast("Inline edit not wired in wireframe.")}>Edit</button>
                    <button className="text-[11px] text-rose-600 hover:underline" onClick={() => setDefaults((r) => r.filter((x) => x.id !== d.id))}>Remove</button>
                  </td>
                </tr>
              );
            });
          })()}
        </tbody>
      </TableShell>

      {/* ============================ SECTION 3 ============================ */}
      <SectionTitle>Active Commission Splits</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Per-policy waterfall rows currently in effect across all policies. Click a row to view the policy.
      </div>
      <FilterRow>
        <FilterSearch value={aPolicy} onChange={setAPolicy} placeholder="Search policy ID or org…" />
        <FilterCombobox value={aPayee} onChange={setAPayee} placeholder="All payees" options={payeeNameOptions} />
        <FilterSelect value={aPayeeType} onChange={setAPayeeType} allLabel="All payee types"
          options={[{value:"house"},{value:"internal_rep",label:"internal rep"},{value:"channel_partner",label:"channel partner"},{value:"override"}]} />
        <FilterSelect value={aSource} onChange={setASource} allLabel="All sources" options={[{value:"default"},{value:"override"}]} />
        <FilterSelect value={aPayMethod} onChange={setAPayMethod} allLabel="All payment methods"
          options={[{value:"hollowtree_paid",label:"Hollowtree Paid"},{value:"carrier_direct",label:"Carrier Direct"}]} />
        <label className="inline-flex items-center gap-1 text-xs ml-1">
          <input type="checkbox" checked={aCurrentOnly} onChange={(e) => setACurrentOnly(e.target.checked)} />
          Show current only
        </label>
        <ClearFiltersLink show={aPolicy !== "" || aPayee !== "all" || aPayeeType !== "all" || aSource !== "all" || aPayMethod !== "all" || !aCurrentOnly}
          onClick={() => { setAPolicy(""); setAPayee("all"); setAPayeeType("all"); setASource("all"); setAPayMethod("all"); setACurrentOnly(true); }} />
        <ExportCsvButton filteredCount={filteredActive.length} totalCount={ACTIVE_SPLITS.length} resourceLabel="commission splits" />
      </FilterRow>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>{["Policy","Payee Type","Payee","Split %","Source","Payment Method","Effective From","Effective To"].map((c) => (
            <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {filteredActive.map((s) => (
            <TRow key={s.id}>
              <TCell>
                <Link to="/policies" className="text-[#0a3d3e] underline">{s.policy_id}</Link>
                <span className="text-black/50"> ({s.org_name})</span>
              </TCell>
              <TCell><PayeeTypeBadge t={s.payee_type} /></TCell>
              <TCell>{s.payee_name}</TCell>
              <TCell>{s.split_pct}%</TCell>
              <TCell><Pill tone={s.source === "override" ? "warn" : "neutral"}>{s.source}</Pill></TCell>
              <TCell><PaymentMethodBadge m={s.payment_method} /></TCell>
              <TCell>{fmtDate(s.effective_from)}</TCell>
              <TCell>{s.effective_to ? fmtDate(s.effective_to) : <span className="text-emerald-700">Current</span>}</TCell>
            </TRow>
          ))}
          {filteredActive.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-6 text-center text-black/40">No active splits match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* ============================ SECTION 4 ============================ */}
      <SectionTitle>Commission Statements</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Generated per period per payee. Statements drive payment instructions and broker reporting.
      </div>
      <FilterRow>
        <FilterCombobox value={sPartner} onChange={setSPartner} placeholder="All channel partners"
          options={[{ value: "house", label: "Hollowtree (House)" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterCombobox value={sPolicy} onChange={setSPolicy} placeholder="All policies"
          options={policyOptions} />
        <FilterSelect value={sStatus} onChange={setSStatus} allLabel="All statuses"
          options={[{value:"draft"},{value:"approved"},{value:"paid"}]} />
        <FilterSelect value={sPeriod} onChange={setSPeriod} allLabel="All periods"
          options={[{value:"30",label:"Last 30 days"},{value:"qtr",label:"Last quarter"},{value:"ytd",label:"YTD"}]} />
        <FilterSelect value={sPayable} onChange={setSPayable} allLabel="All"
          options={[{value:"yes",label:"Payable"},{value:"no",label:"Carrier direct (not payable)"}]} />
        <ClearFiltersLink show={sPartner !== "all" || sPolicy !== "all" || sStatus !== "all" || sPeriod !== "all" || sPayable !== "all"}
          onClick={() => { setSPartner("all"); setSPolicy("all"); setSStatus("all"); setSPeriod("all"); setSPayable("all"); }} />
        <ExportCsvButton filteredCount={filteredStatements.length} totalCount={statements.length} resourceLabel="commission statements" />
      </FilterRow>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>{["Period","Policy","Payee","Payee Type","Premium Base","Rate %","Commission Owed","Status","Payable","PDF","Actions"].map((c) => (
            <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {filteredStatements.map((s) => {
            const pol = POLICIES.find((p) => p.id === s.policy_id);
            return (
              <TRow key={s.id} onClick={() => setStmtDrawer({ open: true, id: s.id })}>
                <TCell>{fmtPeriod(s.period_start, s.period_end)}</TCell>
                <TCell>
                  <Link to="/policies" className="text-[#0a3d3e] underline">{s.policy_id}</Link>
                  <span className="text-black/50"> ({pol?.org_name ?? "—"})</span>
                </TCell>
                <TCell className="font-medium">{s.payee_name}</TCell>
                <TCell><PayeeTypeBadge t={s.payee_type} /></TCell>
                <TCell>{formatCents(s.total_premium_cents)}</TCell>
                <TCell>{s.commission_pct.toFixed(2)}%</TCell>
                <TCell className="font-semibold">{formatCents(s.commission_owed_cents)}</TCell>
                <TCell><StatusBadge s={s.status} /></TCell>
                <TCell>{s.payable ? <span className="text-emerald-700">✓</span> : <Pill tone="warn">Carrier Direct</Pill>}</TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  <a href={s.pdf_url} className="text-[#0a3d3e]" onClick={(e) => { e.preventDefault(); toast("PDF download is a stub in the wireframe."); }}>
                    <Download className="h-3.5 w-3.5 inline" />
                  </a>
                </TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  {s.status === "draft" && <Btn onClick={() => approveStatement(s.id)}>Approve</Btn>}
                  {s.status === "approved" && <Btn onClick={() => markPaid(s.id)}>Mark Paid</Btn>}
                  {s.status === "paid" && <Btn onClick={() => setStmtDrawer({ open: true, id: s.id })}>View</Btn>}
                </TCell>
              </TRow>
            );
          })}
          {filteredStatements.length === 0 && (
            <tr><td colSpan={11} className="px-3 py-6 text-center text-black/40">No statements match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* ============================ DRAWERS ============================ */}
      <PartnerDrawerView
        open={partnerDrawer.open}
        partner={selectedPartner}
        defaults={defaults.filter((d) => d.channel_partner_id === partnerDrawer.id)}
        onClose={() => setPartnerDrawer({ open: false, id: null })}
        onInvite={(p) => {
          setPartners((r) => r.map(x => x.id === p.id ? { ...x, portal_status: "invited", portal_invited_at: new Date().toISOString().slice(0,10) } : x));
          toast.success(`Invite sent to ${p.primary_contact_email}.`);
        }}
        onRevoke={(p) => {
          setPartners((r) => r.map(x => x.id === p.id ? { ...x, portal_status: "none", portal_invited_at: null, portal_last_login: null } : x));
          toast.success("Portal access revoked.");
        }}
        onImpersonate={(p) => toast(`Impersonation event logged for ${p.name}.`)}
      />

      <StatementDrawerView
        open={stmtDrawer.open}
        stmt={selectedStmt}
        onClose={() => setStmtDrawer({ open: false, id: null })}
        onApprove={approveStatement}
        onReject={rejectStatement}
        onMarkPaid={markPaid}
      />

      <GenerateDrawer
        open={genDrawer}
        partners={partners}
        onClose={() => setGenDrawer(false)}
        onGenerate={(rows) => {
          setStatements((r) => [...rows, ...r]);
          toast.success(`${rows.length} statements created in draft status.`);
          setGenDrawer(false);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select pill control
// ---------------------------------------------------------------------------
function MultiPill<T extends string>({ label, all, selected, onToggle }: { label: string; all: T[]; selected: Set<T>; onToggle: (t: T) => void; }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="px-2 py-1 text-xs border border-black/15 rounded bg-white">
        {label}{selected.size > 0 ? ` (${selected.size})` : ""}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1 bg-white border border-black/15 rounded shadow-lg p-2 min-w-[180px]">
            {all.map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs px-1 py-0.5 hover:bg-black/5 cursor-pointer">
                <input type="checkbox" checked={selected.has(t)} onChange={() => onToggle(t)} />
                {t}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Partner detail drawer
// ---------------------------------------------------------------------------
function PartnerDrawerView({ open, partner, defaults, onClose, onInvite, onRevoke, onImpersonate }: {
  open: boolean; partner: Partner | null;
  defaults: DefaultRow[];
  onClose: () => void;
  onInvite: (p: Partner) => void;
  onRevoke: (p: Partner) => void;
  onImpersonate: (p: Partner) => void;
}) {
  const [confirmInvite, setConfirmInvite] = useState(false);
  const [confirmImp, setConfirmImp] = useState(false);
  if (!open) return null;
  const title = partner?.name ?? "Channel Partner";
  const total = defaults.reduce((s, d) => s + d.default_split_pct, 0);
  const totalOk = total === 100;

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      {partner && (
        <>
          {/* A — Identity */}
          <SectionHeader>Identity</SectionHeader>
          <Field label="Partner Name"><div>{partner.name}</div></Field>
          <Field label="Partner Type"><PartnerTypeBadge t={partner.partner_type_v2} /></Field>
          <Field label="Entity Type">
            <div className="inline-flex items-center gap-1">
              {partner.partner_entity_type === "individual" ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
              <span className="capitalize">{partner.partner_entity_type}</span>
            </div>
          </Field>

          {/* B — Licensing */}
          <SectionHeader>Licensing</SectionHeader>
          <Field label="License Number"><div className="font-mono text-[12px]">{partner.license_number}</div></Field>
          <Field label="License Status"><Pill tone={partner.license_status === "Licensed" ? "ok" : "neutral"}>{partner.license_status}</Pill></Field>

          {/* C — Agreement */}
          <SectionHeader>Agreement</SectionHeader>
          <Field label="Activation Status"><ActivationBadge s={partner.activation_status} /></Field>
          <Field label="Agreement Status"><div>{partner.agreement_status}</div></Field>
          <Field label="Agreement Date"><div>{fmtDate(partner.agreement_date)}</div></Field>
          <Field label="Default Commission %">
            <div className="text-black/60">{partner.default_split_pct}%
              <span className="ml-2 text-[10px] text-black/40">Deprecated. Defaults now live in Commission Split Defaults below.</span>
            </div>
          </Field>
          <Field label="Google Drive Folder">
            {partner.google_drive_folder
              ? <a href={partner.google_drive_folder} target="_blank" rel="noreferrer" className="text-[#0a3d3e] underline inline-flex items-center gap-1">Open folder <ExternalLink className="h-3 w-3" /></a>
              : <span className="text-black/40">—</span>}
          </Field>

          {/* D — Primary Contact */}
          <SectionHeader>Primary Contact</SectionHeader>
          <Field label="Name"><div>{partner.primary_contact_name}</div></Field>
          <Field label="Email"><a href={`mailto:${partner.primary_contact_email}`} className="text-[#0a3d3e] underline">{partner.primary_contact_email}</a></Field>

          {/* E — Commission Split Defaults for this partner */}
          <SectionHeader>Commission Split Defaults for this Partner</SectionHeader>
          <Card className="p-2 mb-3">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>{["Payee Type","Payee","Default %","Payment Method"].map((c) => (
                  <th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}
                </tr>
              </thead>
              <tbody>
                {defaults.map((d) => (
                  <tr key={d.id} className="border-t border-black/5">
                    <td className="px-2 py-1"><PayeeTypeBadge t={d.payee_type} /></td>
                    <td className="px-2 py-1">{d.payee_name}</td>
                    <td className="px-2 py-1">{d.default_split_pct}%</td>
                    <td className="px-2 py-1"><PaymentMethodBadge m={d.payment_method} /></td>
                  </tr>
                ))}
                {defaults.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-3 text-center text-black/40">No defaults configured.</td></tr>
                )}
                {defaults.length > 0 && (
                  <tr className={`border-t ${totalOk ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <td colSpan={2} className="px-2 py-1 font-semibold">Total</td>
                    <td colSpan={2} className={`px-2 py-1 font-semibold ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>
                      {total.toFixed(2)}% {totalOk ? "✓" : "≠ 100"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-2"><Btn onClick={() => toast("Add Default is stubbed in the wireframe.")}>+ Add Default</Btn></div>
          </Card>

          {/* F — Portal Access */}
          <SectionHeader>Portal Access</SectionHeader>
          <Field label="Invite Status">
            <div>{partner.portal_status === "none" ? "Not invited"
              : partner.portal_status === "invited" ? `Invited ${fmtDate(partner.portal_invited_at)}`
              : `Active (last login ${fmtDate(partner.portal_last_login)})`}</div>
          </Field>
          <Field label="Last Login"><div>{partner.portal_last_login ? fmtDate(partner.portal_last_login) : "Never"}</div></Field>
          <Field label="Token Status"><div>{partner.portal_status === "none" ? "—" : "Active"}</div></Field>
          <div className="flex gap-2 mb-4">
            {partner.portal_status === "none" && <Btn variant="primary" onClick={() => setConfirmInvite(true)}>Invite to Portal</Btn>}
            {partner.portal_status === "invited" && <Btn onClick={() => { onInvite(partner); }}>Resend Invite</Btn>}
            {partner.portal_status !== "none" && <Btn variant="danger" onClick={() => onRevoke(partner)}>Revoke Access</Btn>}
            {partner.portal_status === "active" && <Btn onClick={() => setConfirmImp(true)}>Impersonate</Btn>}
          </div>

          {/* G — Sync */}
          <SectionHeader>Sync</SectionHeader>
          <div className="text-xs text-black/50">Attio ID: <span className="font-mono">{partner.attio_channel_partner_id}</span></div>

          {/* Confirm modals */}
          {confirmInvite && (
            <ConfirmModal
              title="Send portal invite?"
              body={`Send a portal access invite to ${partner.primary_contact_email}? A magic link will be generated and emailed. The link expires in 7 days.`}
              onCancel={() => setConfirmInvite(false)}
              onConfirm={() => { setConfirmInvite(false); onInvite(partner); }}
            />
          )}
          {confirmImp && (
            <ConfirmModal
              title="Impersonate partner?"
              body={`You will be logged in as ${partner.name}. All actions are audit-logged. Continue?`}
              warn
              onCancel={() => setConfirmImp(false)}
              onConfirm={() => { setConfirmImp(false); onImpersonate(partner); window.open(`https://portal.hollowtree.example.com/?impersonate=${partner.id}`, "_blank"); }}
            />
          )}
        </>
      )}
    </Drawer>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-black/40 font-semibold border-b border-black/10 pb-1 mt-4 mb-2">{children}</div>;
}

function ConfirmModal({ title, body, warn, onCancel, onConfirm }: { title: string; body: string; warn?: boolean; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white border border-black/15 rounded-md shadow-xl p-4 w-[420px]">
        <div className="font-semibold text-sm mb-2 flex items-center gap-2">
          {warn ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
          {title}
        </div>
        <div className="text-xs text-black/70 mb-4">{body}</div>
        <div className="flex justify-end gap-2">
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant={warn ? "danger" : "primary"} onClick={onConfirm}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statement detail drawer
// ---------------------------------------------------------------------------
function StatementDrawerView({ open, stmt, onClose, onApprove, onReject, onMarkPaid }: {
  open: boolean; stmt: Statement | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0,10));
  const [payRef, setPayRef] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  if (!open || !stmt) return null;

  // Underlying policies — for the wireframe, attribute to the single linked split.
  const split = POLICY_SPLITS_INITIAL.find((p) => p.id === stmt.commission_split_id);
  const pol = split ? POLICIES.find((p) => p.id === split.policy_id) : null;
  const contribution = stmt.commission_owed_cents;

  return (
    <Drawer open={open} onClose={onClose} title={`Statement ${fmtPeriod(stmt.period_start, stmt.period_end)} for ${stmt.payee_name}`}>
      <SectionHeader>Summary</SectionHeader>
      <Field label="Period"><div>{fmtDate(stmt.period_start)} to {fmtDate(stmt.period_end)}</div></Field>
      <Field label="Payee"><div>{stmt.payee_name}</div></Field>
      <Field label="Payee Type"><PayeeTypeBadge t={stmt.payee_type} /></Field>
      <Field label="Total Premium Base"><div>{formatCents(stmt.total_premium_cents)}</div></Field>
      <Field label="Commission Rate"><div>{stmt.commission_pct.toFixed(2)}%</div></Field>
      <Field label="Commission Owed"><div className="text-lg font-semibold">{formatCents(stmt.commission_owed_cents)}</div></Field>
      <Field label="Status"><StatusBadge s={stmt.status} /></Field>
      <Field label="Payable"><div>{stmt.payable ? "Yes" : "No. Carrier Direct (informational only)."}</div></Field>
      {stmt.carrier_commission_schedule_id && (
        <Field label="Schedule snapshot"><div className="font-mono text-[12px]">{stmt.carrier_commission_schedule_id}</div></Field>
      )}

      <SectionHeader>Underlying Policies & Splits</SectionHeader>
      <Card className="p-2 mb-3">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["Policy","Premium (period)","Split %","Commission contribution"].map((c) => (
              <th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}
            </tr>
          </thead>
          <tbody>
            {split && pol ? (
              <tr className="border-t border-black/5">
                <td className="px-2 py-1">{pol.id} <span className="text-black/50">({pol.org_name})</span></td>
                <td className="px-2 py-1">{formatCents(stmt.total_premium_cents)}</td>
                <td className="px-2 py-1">{split.split_pct}%</td>
                <td className="px-2 py-1 font-medium">{formatCents(contribution)}</td>
              </tr>
            ) : (
              <tr><td colSpan={4} className="px-2 py-3 text-center text-black/40">No linked split.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <SectionHeader>Lifecycle</SectionHeader>
      <Field label="Generated"><div>{fmtDate(stmt.generated_at)} by {stmt.generated_by}</div></Field>
      <Field label="Approved"><div>{stmt.approved_at ? `${fmtDate(stmt.approved_at)} by Guy Livingstone` : "—"}</div></Field>
      <Field label="Paid"><div>{stmt.paid_at ? `${fmtDate(stmt.paid_at)} (ref pending)` : "—"}</div></Field>
      <Field label="PDF">
        <a href={stmt.pdf_url} onClick={(e) => { e.preventDefault(); toast("PDF download is a stub."); }} className="text-[#0a3d3e] underline inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> Download PDF
        </a>
      </Field>

      <div className="flex gap-2 mt-4 flex-wrap">
        {stmt.status === "draft" && (
          <>
            <Btn variant="primary" onClick={() => onApprove(stmt.id)}>Approve</Btn>
            <Btn variant="danger" onClick={() => onReject(stmt.id)}>Reject</Btn>
          </>
        )}
        {stmt.status === "approved" && (
          <Btn variant="primary" onClick={() => setPayOpen(true)}>Mark Paid</Btn>
        )}
        {stmt.status === "paid" && (
          <button className="text-xs text-[#0a3d3e] underline" onClick={() => toast("Audit trail is a stub.")}>View Audit Trail</button>
        )}
        <Btn onClick={() => toast("PDF download is a stub.")}>Download PDF</Btn>
        {stmt.status !== "draft" && (
          <Btn onClick={() => toast(`Statement sent to payee.`)}>Send to Payee</Btn>
        )}
      </div>

      {payOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPayOpen(false)} />
          <div className="relative bg-white border border-black/15 rounded-md shadow-xl p-4 w-[400px]">
            <div className="font-semibold text-sm mb-3">Mark statement as paid</div>
            <Field label="Payment Date">
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
            </Field>
            <Field label="Payment Reference">
              <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="ACH-2025-09-001" className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
            </Field>
            <div className="flex justify-end gap-2 mt-2">
              <Btn onClick={() => setPayOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={() => { setPayOpen(false); onMarkPaid(stmt.id); }}>Confirm</Btn>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Generate Statements drawer
// ---------------------------------------------------------------------------
function GenerateDrawer({ open, partners, onClose, onGenerate }: {
  open: boolean; partners: Partner[];
  onClose: () => void;
  onGenerate: (rows: Statement[]) => void;
}) {
  const [period, setPeriod] = useState("2025-10");
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeCarrierDirect, setIncludeCarrierDirect] = useState(true);
  const [preview, setPreview] = useState(true);
  const [previewed, setPreviewed] = useState<Statement[] | null>(null);

  if (!open) return null;

  const build = (): Statement[] => {
    const [y, m] = period.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2,"0")}-${lastDay}`;

    const pickedPartnerIds = scope === "all" ? new Set(partners.map((p) => p.id)) : selected;

    // Group active splits by payee, only payees that map to a picked partner
    // (plus house if scope=all).
    const groups: Record<string, ActiveSplit[]> = {};
    for (const s of ACTIVE_SPLITS) {
      if (s.effective_to !== null) continue;
      if (!includeCarrierDirect && s.payment_method === "carrier_direct") continue;
      if (s.payee_type === "house") {
        if (scope !== "all") continue;
      } else {
        const partner = partners.find((p) => p.name === s.payee_name);
        if (!partner || !pickedPartnerIds.has(partner.id)) continue;
      }
      const key = s.payee_name;
      (groups[key] ??= []).push(s);
    }

    const rows: Statement[] = [];
    let idx = 1;
    for (const [payee, splits] of Object.entries(groups)) {
      const totalPremiumCents = splits.length * 800000; // dummy: $8,000/policy/period
      const ratePct = 12;
      const totalSplitPct = splits.reduce((a, b) => a + b.split_pct, 0) / splits.length;
      const owed = Math.round(totalPremiumCents * (ratePct / 100) * (totalSplitPct / 100));
      const first = splits[0];
      const partner = partners.find((p) => p.name === payee);
      rows.push({
        id: `stm_gen_${Date.now()}_${idx++}`,
        policy_id: first.policy_id,
        channel_partner_id: first.payee_type === "house" ? null : partner?.id ?? null,
        payee_type: first.payee_type,
        payee_ref_id: first.payee_type === "house" ? null : partner?.id ?? null,
        payee_name: payee,
        period_start: start, period_end: end,
        total_premium_cents: totalPremiumCents,
        commission_pct: ratePct,
        commission_owed_cents: owed,
        status: "draft",
        generated_at: new Date().toISOString(),
        generated_by: "Guy Livingstone",
        approved_at: null, paid_at: null, pdf_url: "#",
        commission_split_id: first.id,
        carrier_commission_schedule_id: null,
        payable: first.payment_method === "hollowtree_paid",
      });
    }
    return rows;
  };

  const handleAction = () => {
    if (preview && !previewed) {
      setPreviewed(build());
      return;
    }
    onGenerate(previewed ?? build());
  };

  return (
    <Drawer open={open} onClose={onClose} title="Generate Commission Statements">
      <Field label="Period">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          <option value="2025-07">July 2025</option>
          <option value="2025-08">August 2025</option>
          <option value="2025-09">September 2025</option>
          <option value="2025-10">October 2025</option>
        </select>
      </Field>
      <Field label="Scope">
        <div className="flex gap-3 text-xs">
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> All channel partners
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={scope === "selected"} onChange={() => setScope("selected")} /> Selected partners
          </label>
        </div>
      </Field>
      {scope === "selected" && (
        <Field label="Selected Partners">
          <div className="border border-black/15 rounded p-2 max-h-40 overflow-y-auto">
            {partners.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => {
                  setSelected((prev) => { const next = new Set(prev); next.has(p.id) ? next.delete(p.id) : next.add(p.id); return next; });
                }} />
                {p.name}
              </label>
            ))}
          </div>
        </Field>
      )}
      <Field label="">
        <label className="inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeCarrierDirect} onChange={(e) => setIncludeCarrierDirect(e.target.checked)} />
          Include carrier_direct splits (non-payable, informational)
        </label>
      </Field>
      <Field label="">
        <label className="inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={preview} onChange={(e) => { setPreview(e.target.checked); setPreviewed(null); }} />
          Preview before generation
        </label>
      </Field>

      {previewed && (
        <Card className="p-2 mb-3">
          <div className="text-[11px] uppercase tracking-wider text-black/50 mb-1">Preview: Period {period}</div>
          <table className="w-full text-xs">
            <tbody>
              {previewed.map((r) => (
                <tr key={r.id} className="border-t border-black/5">
                  <td className="px-2 py-1">{r.payee_name}</td>
                  <td className="px-2 py-1"><PayeeTypeBadge t={r.payee_type} /></td>
                  <td className="px-2 py-1 text-right font-medium">{formatCents(r.commission_owed_cents)}</td>
                  <td className="px-2 py-1 text-right">{r.payable ? <span className="text-emerald-700">payable</span> : <Pill tone="warn">carrier_direct</Pill>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/15">
                <td colSpan={2} className="px-2 py-1 font-semibold">Total payable</td>
                <td colSpan={2} className="px-2 py-1 text-right font-semibold">
                  {formatCents(previewed.filter(r => r.payable).reduce((a,b) => a+b.commission_owed_cents, 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-2 py-1 text-black/60">Total non-payable (informational)</td>
                <td colSpan={2} className="px-2 py-1 text-right text-black/60">
                  {formatCents(previewed.filter(r => !r.payable).reduce((a,b) => a+b.commission_owed_cents, 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-2 py-1 text-[11px] text-black/50">{previewed.length} statements would be generated.</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleAction}>
          {preview && !previewed ? "Preview" : "Confirm Generation"}
        </Btn>
      </div>
    </Drawer>
  );
}
