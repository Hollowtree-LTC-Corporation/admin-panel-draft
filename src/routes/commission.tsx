import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2, Download, FileText, User, ExternalLink, AlertTriangle,
  Pencil, Trash2, Plus, Info,
} from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, Field, SectionTitle, Card,
} from "@/components/wireframe/Bits";
import {
  CHANNEL_PARTNERS, POLICY_SPLITS_INITIAL, POLICIES, formatCents,
  CARRIER_COMMISSION_SCHEDULES, COMMISSION_RATE_TIERS, CARRIER_PRODUCTS, CARRIERS,
  type PayeeType, type PaymentMethodSetting, type SplitSource,
  type CarrierCommissionSchedule, type ScheduleType,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import {
  FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink,
} from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/commission")({ component: View });

// ---------------------------------------------------------------------------
// Partner type & ext data (Attio mirror). House is NOT a channel_partner — it
// is a payee_type with NULL ref_id.
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
};

const PARTNER_EXT: Record<string, PartnerExt> = {
  cpn_1: { partner_type_v2: "Benefits Broker", partner_entity_type: "company", license_number: "BR-TX-118422", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2024-03-15", primary_contact_name: "Liana Okafor", primary_contact_email: "liana.okafor@wtcbenefits.example.com", google_drive_folder: "https://drive.google.com/drive/folders/wtc-benefits", attio_channel_partner_id: "att_cp_wtc" },
  cpn_2: { partner_type_v2: "Benefits Broker", partner_entity_type: "company", license_number: "BR-CA-072115", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-11-02", primary_contact_name: "Marcus Westfield", primary_contact_email: "mwestfield@westfieldbrokers.example.com", google_drive_folder: "https://drive.google.com/drive/folders/westfield", attio_channel_partner_id: "att_cp_westfield" },
  cpn_4: { partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-NY-554102", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-01-15", primary_contact_name: "Jamie Rep", primary_contact_email: "jamie@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_jamie" },
  cpn_5: { partner_type_v2: "IMO-BGA", partner_entity_type: "company", license_number: "IM-IL-440091", license_status: "Licensed", activation_status: "Agreement Signed", agreement_status: "Signed", agreement_date: "2024-09-10", primary_contact_name: "Patricia Kim", primary_contact_email: "pkim@gallagher.example.com", google_drive_folder: "https://drive.google.com/drive/folders/gallagher", attio_channel_partner_id: "att_cp_gallagher" },
  cpn_6: { partner_type_v2: "IMO-BGA", partner_entity_type: "company", license_number: "IM-FL-119087", license_status: "Licensed", activation_status: "In Conversation", agreement_status: "Sent", agreement_date: null, primary_contact_name: "Derek Holloway", primary_contact_email: "derek@overridegroup.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_override" },
};
const ADDITIONAL_INTERNAL: Array<{ id: string; name: string; default_split_pct: number; payment_method: PaymentMethodSetting } & PartnerExt> = [
  { id: "cpn_7", name: "Guy Livingstone", default_split_pct: 10, payment_method: "hollowtree_paid", partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-NY-991133", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2022-05-01", primary_contact_name: "Guy Livingstone", primary_contact_email: "guy@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_guy" },
  { id: "cpn_8", name: "Casey Rep", default_split_pct: 10, payment_method: "hollowtree_paid", partner_type_v2: "Internal", partner_entity_type: "individual", license_number: "RP-MA-220714", license_status: "Licensed", activation_status: "Active", agreement_status: "Signed", agreement_date: "2023-06-19", primary_contact_name: "Casey Rep", primary_contact_email: "casey@hollowtree.example.com", google_drive_folder: "", attio_channel_partner_id: "att_cp_casey" },
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
      id: p.id, name: p.partner_name,
      default_split_pct: p.default_split_pct,
      payment_method: p.payment_method as PaymentMethodSetting,
      ...PARTNER_EXT[p.id],
    })),
  ...ADDITIONAL_INTERNAL,
];

// ---------------------------------------------------------------------------
// Commission split defaults
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
  { id: "csd_1", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", default_split_pct: 45, payment_method: "hollowtree_paid" },
  { id: "csd_2", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "internal_rep", payee_ref_id: "cpn_7", payee_name: "Guy Livingstone", default_split_pct: 10, payment_method: "hollowtree_paid" },
  { id: "csd_3", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits", default_split_pct: 40, payment_method: "hollowtree_paid" },
  { id: "csd_4", channel_partner_id: "cpn_1", channel_partner_name: "WTC Benefits", payee_type: "override", payee_ref_id: "cpn_5", payee_name: "Gallagher", default_split_pct: 5, payment_method: "carrier_direct" },
  { id: "csd_5", channel_partner_id: "cpn_2", channel_partner_name: "Westfield Brokers", payee_type: "house", payee_ref_id: null, payee_name: "Hollowtree", default_split_pct: 50, payment_method: "hollowtree_paid" },
  { id: "csd_6", channel_partner_id: "cpn_2", channel_partner_name: "Westfield Brokers", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers", default_split_pct: 50, payment_method: "hollowtree_paid" },
];

// ---------------------------------------------------------------------------
// Active splits
// ---------------------------------------------------------------------------
type ActiveSplit = {
  id: string;
  policy_id: string;
  org_name: string;
  payee_type: PayeeType;
  payee_ref_id: string | null;
  payee_name: string;
  split_pct: number;
  source: SplitSource;
  payment_method: PaymentMethodSetting;
  effective_from: string;
  effective_to: string | null;
};
const ACTIVE_SPLITS_SEED: ActiveSplit[] = POLICY_SPLITS_INITIAL.map((s) => {
  const pol = POLICIES.find((p) => p.id === s.policy_id);
  const partner = ALL_PARTNERS.find((p) => p.partner_name === s.payee_name);
  return {
    id: s.id, policy_id: s.policy_id, org_name: pol?.org_name ?? "—",
    payee_type: s.payee_type,
    payee_ref_id: s.payee_type === "house" ? null : (partner?.id ?? null),
    payee_name: s.payee_name, split_pct: s.split_pct,
    source: s.source, payment_method: s.payment_method,
    effective_from: pol?.initial_effective_date ?? "2025-01-01",
    effective_to: s.effective_to,
  };
});
const OVERRIDE_DEMO_IDS = new Set(["ps_4_2", "ps_5_4"]);
for (const r of ACTIVE_SPLITS_SEED) if (OVERRIDE_DEMO_IDS.has(r.id)) r.source = "override";

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------
type StmtStatus = "draft" | "approved" | "paid";
type Statement = {
  id: string;
  policy_id: string;
  channel_partner_id: string | null;
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
  approved_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  payment_reference: string | null;
  pdf_url: string;
  commission_split_id: string | null;
  payable: boolean;
};

const STMT_SEED: Statement[] = [
  { id: "stm_1",  policy_id: "pol_1", channel_partner_id: null,    payee_type: "house",            payee_ref_id: null,    payee_name: "Hollowtree",         period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 97200,  status: "paid",     generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", approved_by: "Guy Livingstone", paid_at: "2025-08-08T14:00:00Z", paid_by: "Guy Livingstone", payment_reference: "Wire 88102", pdf_url: "#", commission_split_id: "ps_1_1", payable: true  },
  { id: "stm_2",  policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits",       period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 86400,  status: "paid",     generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", approved_by: "Guy Livingstone", paid_at: "2025-08-08T14:00:00Z", paid_by: "Guy Livingstone", payment_reference: "ACH 99201", pdf_url: "#", commission_split_id: "ps_1_3", payable: true  },
  { id: "stm_3",  policy_id: "pol_1", channel_partner_id: "cpn_7", payee_type: "internal_rep",    payee_ref_id: "cpn_7", payee_name: "Guy Livingstone",     period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 21600,  status: "paid",     generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", approved_by: "Guy Livingstone", paid_at: "2025-08-08T14:00:00Z", paid_by: "Guy Livingstone", payment_reference: "Payroll 8/15", pdf_url: "#", commission_split_id: "ps_1_2", payable: true  },
  { id: "stm_4",  policy_id: "pol_1", channel_partner_id: "cpn_5", payee_type: "override",        payee_ref_id: "cpn_5", payee_name: "Gallagher",          period_start: "2025-07-01", period_end: "2025-07-31", total_premium_cents: 1800000, commission_pct: 12.0, commission_owed_cents: 10800,  status: "approved", generated_at: "2025-08-02T09:15:00Z", generated_by: "Guy Livingstone", approved_at: "2025-08-03T10:00:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_4", payable: false },
  { id: "stm_5",  policy_id: "pol_1", channel_partner_id: null,    payee_type: "house",            payee_ref_id: null,    payee_name: "Hollowtree",         period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 113400, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_1", payable: true  },
  { id: "stm_6",  policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits",       period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 100800, status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_3", payable: true  },
  { id: "stm_7",  policy_id: "pol_2", channel_partner_id: "cpn_2", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers",  period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 950000,  commission_pct: 10.0, commission_owed_cents: 47500,  status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_2_2", payable: true  },
  { id: "stm_8",  policy_id: "pol_1", channel_partner_id: "cpn_7", payee_type: "internal_rep",    payee_ref_id: "cpn_7", payee_name: "Guy Livingstone",     period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 25200,  status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_2", payable: true  },
  { id: "stm_9",  policy_id: "pol_1", channel_partner_id: "cpn_5", payee_type: "override",        payee_ref_id: "cpn_5", payee_name: "Gallagher",          period_start: "2025-08-01", period_end: "2025-08-31", total_premium_cents: 2100000, commission_pct: 12.0, commission_owed_cents: 12600,  status: "approved", generated_at: "2025-09-02T09:00:00Z", generated_by: "Guy Livingstone", approved_at: "2025-09-04T11:30:00Z", approved_by: "Guy Livingstone", paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_4", payable: false },
  { id: "stm_10", policy_id: "pol_1", channel_partner_id: null,    payee_type: "house",            payee_ref_id: null,    payee_name: "Hollowtree",         period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 120960, status: "draft",    generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, approved_by: null, paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_1", payable: true  },
  { id: "stm_11", policy_id: "pol_1", channel_partner_id: "cpn_1", payee_type: "channel_partner", payee_ref_id: "cpn_1", payee_name: "WTC Benefits",       period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 107520, status: "draft",    generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, approved_by: null, paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_1_3", payable: true  },
  { id: "stm_12", policy_id: "pol_2", channel_partner_id: "cpn_2", payee_type: "channel_partner", payee_ref_id: "cpn_2", payee_name: "Westfield Brokers",  period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 1020000, commission_pct: 10.0, commission_owed_cents: 51000,  status: "draft",    generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, approved_by: null, paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_2_2", payable: true  },
  { id: "stm_13", policy_id: "pol_4", channel_partner_id: "cpn_8", payee_type: "internal_rep",    payee_ref_id: "cpn_8", payee_name: "Casey Rep",          period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 640000,  commission_pct: 12.0, commission_owed_cents: 7680,   status: "draft",    generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, approved_by: null, paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_4_2", payable: true  },
  { id: "stm_14", policy_id: "pol_5", channel_partner_id: "cpn_5", payee_type: "override",        payee_ref_id: "cpn_5", payee_name: "Gallagher",          period_start: "2025-09-01", period_end: "2025-09-30", total_premium_cents: 2240000, commission_pct: 12.0, commission_owed_cents: 13440,  status: "draft",    generated_at: "2025-10-02T08:45:00Z", generated_by: "Guy Livingstone", approved_at: null, approved_by: null, paid_at: null, paid_by: null, payment_reference: null, pdf_url: "#", commission_split_id: "ps_5_4", payable: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date("2025-10-15T12:00:00Z");
function relTime(iso: string): string {
  const diff = (NOW.getTime() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.floor(diff)} minute${Math.floor(diff) === 1 ? "" : "s"} ago`;
  const h = diff / 60;
  if (h < 24) return `${Math.floor(h)} hour${Math.floor(h) === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
}
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
function lastCompletedMonth(): { start: string; end: string } {
  const d = new Date(NOW);
  d.setUTCDate(1);
  d.setUTCDate(0);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mm = String(m + 1).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
function attioUrl(id: string) {
  return `https://app.attio.com/hollowtree/object/channel_partners/${id}`;
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
  if (s === "draft") return <Pill tone="warn">draft</Pill>;
  if (s === "approved") return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-800">approved</span>;
  return <Pill tone="ok">paid</Pill>;
}
function PaymentMethodBadge({ m }: { m: PaymentMethodSetting }) {
  return <Pill tone={m === "hollowtree_paid" ? "info" : "warn"}>{m === "hollowtree_paid" ? "Hollowtree Paid" : "Carrier Direct"}</Pill>;
}
function EntityCell({ et }: { et: EntityType }) {
  return (
    <div className="inline-flex items-center gap-1">
      {et === "individual" ? <User className="h-3.5 w-3.5 text-black/50" /> : <Building2 className="h-3.5 w-3.5 text-black/50" />}
      <span className="capitalize">{et}</span>
    </div>
  );
}
function SubtotalChip({ total }: { total: number }) {
  const ok = Math.abs(total - 100) < 0.005;
  if (ok) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Subtotal: 100%</span>;
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800">Subtotal: {total.toFixed(2)}% ⚠ Must sum to 100%</span>;
}
function PolicyTotalChip({ total }: { total: number }) {
  const ok = Math.abs(total - 100) < 0.005;
  if (ok) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Total: 100%</span>;
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800">Total: {total.toFixed(2)}% ⚠ Splits must sum to 100%</span>;
}

// ---------------------------------------------------------------------------
// LTC schedule helpers
// ---------------------------------------------------------------------------
function scheduleTypeChip(t: ScheduleType) {
  const tone: Record<ScheduleType, string> = {
    heaped: "bg-purple-100 text-purple-800",
    flat: "bg-sky-100 text-sky-800",
    level: "bg-teal-100 text-teal-800",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${tone[t]}`}>{t}</span>;
}
function stateChip(s: string | null) {
  if (!s) return <span className="text-[11px] text-black/50">All states</span>;
  if (s === "NY") return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">NY only</span>;
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/5 text-black/70">{s} only</span>;
}
function tiersFor(scheduleId: string) {
  return COMMISSION_RATE_TIERS.filter((t) => t.schedule_id === scheduleId).sort((a, b) => a.from_year - b.from_year);
}
function tierPreview(scheduleId: string): string {
  const tiers = tiersFor(scheduleId);
  if (tiers.length === 0) return "—";
  const fmt = (t: { from_year: number; to_year: number | null; rate_pct: number }) => {
    if (t.to_year === null || t.to_year >= 99) return `${t.rate_pct}% Y${t.from_year}+`;
    if (t.to_year === t.from_year) return `${t.rate_pct}% Y${t.from_year}`;
    return `${t.rate_pct}% Y${t.from_year}–${t.to_year}`;
  };
  if (tiers.length === 1) {
    const t = tiers[0];
    if ((t.to_year === null || t.to_year >= 99) && t.from_year === 1) return `${t.rate_pct}% all years`;
  }
  if (tiers.length <= 4) return tiers.map(fmt).join(" → ");
  return `${tiers.slice(0, 3).map(fmt).join(" → ")} … (${tiers.length} tiers)`;
}
function policyYearFor(effectiveDate: string, periodStart: string): number {
  const a = new Date(effectiveDate + "T00:00:00");
  const b = new Date(periodStart + "T00:00:00");
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  return Math.max(1, Math.floor(months / 12) + 1);
}
function matchTier(scheduleId: string, year: number) {
  return tiersFor(scheduleId).find((t) => year >= t.from_year && (t.to_year === null || year <= t.to_year));
}
function carrierProductLabel(cpId: string): string {
  const cp = CARRIER_PRODUCTS.find((p) => p.id === cpId);
  if (!cp) return cpId;
  const c = CARRIERS.find((x) => x.id === cp.carrier_id);
  return `${c?.carrier_name ?? "—"} — ${cp.product_name}`;
}
function deriveScheduleForPolicy(policyId: string): CarrierCommissionSchedule | null {
  const pol = POLICIES.find((p) => p.id === policyId);
  if (!pol) return null;
  // explicit assignment first
  if (pol.commission_schedule_id) {
    const s = CARRIER_COMMISSION_SCHEDULES.find((x) => x.id === pol.commission_schedule_id);
    if (s) return s;
  }
  // fall back to default for carrier_product
  return CARRIER_COMMISSION_SCHEDULES.find((s) => s.carrier_product_id === pol.carrier_product_id && s.is_default) ?? null;
}
// Main view
// ---------------------------------------------------------------------------
const LAST_ATTIO_SYNC = "2025-10-15T11:56:00Z";

function View() {
  const { product } = useStore();
  const can = usePermission();

  const [partners] = useState<Partner[]>(ALL_PARTNERS);
  const [defaults, setDefaults] = useState<DefaultRow[]>(INITIAL_DEFAULTS);
  const [activeSplits, setActiveSplits] = useState<ActiveSplit[]>(ACTIVE_SPLITS_SEED);
  const [statements, setStatements] = useState<Statement[]>(STMT_SEED);

  const [partnerDrawer, setPartnerDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [stmtDrawer, setStmtDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [splitsDrawer, setSplitsDrawer] = useState<{ open: boolean; policy_id: string | null }>({ open: false, policy_id: null });
  const [genModal, setGenModal] = useState(false);
  const [addPayeeFor, setAddPayeeFor] = useState<string | null>(null);
  const [editDefault, setEditDefault] = useState<DefaultRow | null>(null);
  const [removeDefault, setRemoveDefault] = useState<DefaultRow | null>(null);
  const [approveStmt, setApproveStmt] = useState<Statement | null>(null);
  const [paidStmt, setPaidStmt] = useState<Statement | null>(null);
  const [selectedStmtIds, setSelectedStmtIds] = useState<Set<string>>(new Set());

  // -------------- Section 1 filters --------------
  const [pSearch, setPSearch] = useState("");
  const [pTypes, setPTypes] = useState<Set<PartnerTypeV2>>(new Set());
  const [pEntity, setPEntity] = useState<EntityType | "all">("all");
  const [pActivations, setPActivations] = useState<Set<ActivationStatus>>(new Set());
  const [pInternalOnly, setPInternalOnly] = useState(false);

  const filteredPartners = useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    return partners.filter((p) => {
      if (q && !p.partner_name.toLowerCase().includes(q)) return false;
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
  const filteredDefaults = useMemo(() => defaults.filter((d) => {
    if (dPartner !== "all" && d.channel_partner_id !== dPartner) return false;
    if (dPayeeType !== "all" && d.payee_type !== dPayeeType) return false;
    if (dPayMethod !== "all" && d.payment_method !== dPayMethod) return false;
    return true;
  }), [defaults, dPartner, dPayeeType, dPayMethod]);

  const defaultsByPartner = useMemo(() => {
    const groups: Record<string, { partner_id: string; partner_name: string; rows: DefaultRow[] }> = {};
    for (const d of filteredDefaults) {
      const key = d.channel_partner_id;
      (groups[key] ??= { partner_id: d.channel_partner_id, partner_name: d.channel_partner_name, rows: [] }).rows.push(d);
    }
    return Object.values(groups).sort((a, b) => a.partner_name.localeCompare(b.partner_name));
  }, [filteredDefaults]);

  // For Edit warning — count active splits sourced from defaults per channel partner
  const activeSplitsByPartner = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of activeSplits) {
      if (s.source !== "default" || s.effective_to !== null || !s.payee_ref_id) continue;
      counts[s.payee_ref_id] = (counts[s.payee_ref_id] ?? 0) + 1;
    }
    return counts;
  }, [activeSplits]);

  // -------------- Section 3 filters --------------
  const [aPolicy, setAPolicy] = useState("");
  const [aPayeeType, setAPayeeType] = useState<PayeeType | "all">("all");
  const [aSource, setASource] = useState<SplitSource | "all">("all");
  const [aPayMethod, setAPayMethod] = useState<PaymentMethodSetting | "all">("all");
  const [aCurrentOnly, setACurrentOnly] = useState(true);

  const filteredActive = useMemo(() => {
    const q = aPolicy.trim().toLowerCase();
    return activeSplits.filter((s) => {
      if (q && !(s.policy_id.toLowerCase().includes(q) || s.org_name.toLowerCase().includes(q))) return false;
      if (aPayeeType !== "all" && s.payee_type !== aPayeeType) return false;
      if (aSource !== "all" && s.source !== aSource) return false;
      if (aPayMethod !== "all" && s.payment_method !== aPayMethod) return false;
      if (aCurrentOnly && s.effective_to !== null) return false;
      return true;
    });
  }, [activeSplits, aPolicy, aPayeeType, aSource, aPayMethod, aCurrentOnly]);

  const activeByPolicy = useMemo(() => {
    const groups: Record<string, { policy_id: string; org_name: string; rows: ActiveSplit[] }> = {};
    for (const s of filteredActive) {
      (groups[s.policy_id] ??= { policy_id: s.policy_id, org_name: s.org_name, rows: [] }).rows.push(s);
    }
    return Object.values(groups).sort((a, b) => a.policy_id.localeCompare(b.policy_id));
  }, [filteredActive]);

  // -------------- Section 4 filters --------------
  const [sPartner, setSPartner] = useState("all");
  const [sPolicy, setSPolicy] = useState("all");
  const [sPayeeType, setSPayeeType] = useState<PayeeType | "all">("all");
  const [sStatus, setSStatus] = useState<StmtStatus | "all">("all");
  const [sPeriod, setSPeriod] = useState<"all" | "30" | "qtr" | "ytd">("all");
  const policyOptions = useMemo(() => POLICIES.map((p) => ({ value: p.id, label: `${p.id} (${p.org_name})` })), []);
  const filteredStatements = useMemo(() => statements.filter((s) => {
    if (sPartner !== "all") {
      if (sPartner === "house" ? s.payee_type !== "house" : s.channel_partner_id !== sPartner) return false;
    }
    if (sPolicy !== "all" && s.policy_id !== sPolicy) return false;
    if (sPayeeType !== "all" && s.payee_type !== sPayeeType) return false;
    if (sStatus !== "all" && s.status !== sStatus) return false;
    if (sPeriod !== "all") {
      const end = new Date(s.period_end + "T00:00:00");
      if (sPeriod === "30") {
        const diff = (NOW.getTime() - end.getTime()) / 86400000;
        if (diff > 30 || diff < 0) return false;
      } else if (sPeriod === "qtr") {
        const diff = (NOW.getTime() - end.getTime()) / 86400000;
        if (diff > 90 || diff < 0) return false;
      } else if (sPeriod === "ytd") {
        if (end.getUTCFullYear() !== NOW.getUTCFullYear()) return false;
      }
    }
    return true;
  }), [statements, sPartner, sPolicy, sPayeeType, sStatus, sPeriod]);

  const stmtTotals = useMemo(() => {
    let owed = 0, payable = 0, carrier = 0;
    let draft = 0, approved = 0, paid = 0;
    for (const s of filteredStatements) {
      owed += s.commission_owed_cents;
      if (s.payable) payable += s.commission_owed_cents;
      else carrier += s.commission_owed_cents;
      if (s.status === "draft") draft++;
      else if (s.status === "approved") approved++;
      else paid++;
    }
    return { owed, payable, carrier, draft, approved, paid };
  }, [filteredStatements]);

  const selectableDraftIds = useMemo(
    () => filteredStatements.filter((s) => s.status === "draft").map((s) => s.id),
    [filteredStatements],
  );
  const selectedCount = selectedStmtIds.size;

  // -------------- Mutators --------------
  const doApprove = (id: string, ref?: string) => {
    setStatements((rows) => rows.map((r) => r.id === id
      ? { ...r, status: "approved", approved_at: new Date().toISOString(), approved_by: "Guy Livingstone" }
      : r));
    toast.success("Statement approved.", { description: ref });
  };
  const doMarkPaid = (id: string, ref: string) => {
    setStatements((rows) => rows.map((r) => r.id === id
      ? { ...r, status: "paid", paid_at: new Date().toISOString(), paid_by: "Guy Livingstone", payment_reference: ref }
      : r));
    toast.success("Statement marked paid.");
  };
  const bulkApprove = () => {
    const ids = Array.from(selectedStmtIds);
    setStatements((rows) => rows.map((r) => ids.includes(r.id)
      ? { ...r, status: "approved", approved_at: new Date().toISOString(), approved_by: "Guy Livingstone" }
      : r));
    setSelectedStmtIds(new Set());
    toast.success(`Approved ${ids.length} statement${ids.length === 1 ? "" : "s"}.`);
  };

  const selectedPartner = partnerDrawer.id ? partners.find((p) => p.id === partnerDrawer.id) ?? null : null;
  const selectedStmt = stmtDrawer.id ? statements.find((s) => s.id === stmtDrawer.id) ?? null : null;

  return (
    <div>
      <PageHeader
        title="Commission"
        subtitle={
          <div>
            <div>{product} commission configuration.</div>
            <div className="text-[11px] text-black/40 mt-0.5">
              Channel partners synced from Attio (read-only here). Defaults and splits editable. Statements generated per billing period.
            </div>
          </div>
        }
        actions={
          <Btn variant="primary" onClick={() => setGenModal(true)} disabled={!can("commission_statements", "create")}>
            Generate Statements for Period
          </Btn>
        }
      />

      {/* ============================ SECTION 1 ============================ */}
      <SectionTitle>Channel Partners</SectionTitle>
      <div className="text-xs text-black/50 mb-1">
        Broker firms, individual brokers, and Hollowtree internal reps. All payees other than the house are channel_partners rows.
      </div>
      <div className="text-[11px] text-black/40 mb-2">
        Last synced from Attio: {relTime(LAST_ATTIO_SYNC)}
      </div>
      <FilterRow>
        <FilterSearch value={pSearch} onChange={setPSearch} placeholder="Search partner name…" />
        <MultiPill label="Type" all={PARTNER_TYPE_VALUES} selected={pTypes} onToggle={(t) => setPTypes((p) => toggleSet(p, t))} />
        <div className="inline-flex rounded border border-black/15 overflow-hidden text-xs">
          {(["all", "individual", "company"] as const).map((v) => (
            <button key={v} onClick={() => setPEntity(v)} className={`px-2 py-1 ${pEntity === v ? "bg-[#0a3d3e] text-white" : "bg-white hover:bg-black/5"}`}>
              {v === "all" ? "All" : v === "individual" ? "Individual" : "Company"}
            </button>
          ))}
        </div>
        <MultiPill<ActivationStatus> label="Activation" all={["Prospect","In Conversation","Agreement Signed","Active","Dormant"]} selected={pActivations} onToggle={(t) => setPActivations((p) => toggleSet(p, t))} />
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
          <tr>{["Partner Name","Type","Entity","License","Agreement","Activation","Actions"].map((c) => (
            <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {filteredPartners.map((p) => (
            <TRow key={p.id} onClick={() => setPartnerDrawer({ open: true, id: p.id })}>
              <TCell className="font-medium">
                <a id={`partner-${p.id}`}>{p.partner_name}</a>
              </TCell>
              <TCell><PartnerTypeBadge t={p.partner_type_v2} /></TCell>
              <TCell><EntityCell et={p.partner_entity_type} /></TCell>
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
              <TCell onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <a href={attioUrl(p.attio_channel_partner_id)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0a3d3e] hover:underline">
                    View in Attio <ExternalLink className="h-3 w-3" />
                  </a>
                  <button className="text-[11px] text-black/60 hover:underline"
                    onClick={() => setPartnerDrawer({ open: true, id: p.id })}>
                    View details
                  </button>
                </div>
              </TCell>
            </TRow>
          ))}
          {filteredPartners.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-black/40">No partners match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* ============================ SECTION 2 ============================ */}
      <SectionTitle>Commission Split Defaults</SectionTitle>
      <div className="text-xs text-black/50 mb-1">
        Default split templates per channel partner agreement. Copied to per-policy splits at policy creation.
      </div>
      <div className="text-[11px] text-black/40 italic mb-2 flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>Defaults are auto-seeded when Attio fires agreement_signed for a channel partner (template: house 50%, channel_partner 50%). Add internal reps, overrides, and adjust splits below as the agreement details are finalized.</span>
      </div>
      <FilterRow>
        <FilterCombobox value={dPartner} onChange={setDPartner} placeholder="All channel partners"
          options={partners.map((p) => ({ value: p.id, label: p.partner_name }))} />
        <FilterSelect value={dPayeeType} onChange={setDPayeeType} allLabel="All payee types"
          options={[{value:"house"},{value:"internal_rep",label:"internal rep"},{value:"channel_partner",label:"channel partner"},{value:"override"}]} />
        <FilterSelect value={dPayMethod} onChange={setDPayMethod} allLabel="All payment methods"
          options={[{value:"hollowtree_paid",label:"Hollowtree Paid"},{value:"carrier_direct",label:"Carrier Direct"}]} />
        <ClearFiltersLink show={dPartner !== "all" || dPayeeType !== "all" || dPayMethod !== "all"}
          onClick={() => { setDPartner("all"); setDPayeeType("all"); setDPayMethod("all"); }} />
        <ExportCsvButton filteredCount={filteredDefaults.length} totalCount={defaults.length} resourceLabel="commission split defaults" />
      </FilterRow>
      <div className="space-y-3">
        {defaultsByPartner.map((g) => {
          const subtotal = g.rows.reduce((s, r) => s + r.default_split_pct, 0);
          return (
            <div key={g.partner_id} className="bg-white border border-black/10 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#f7f3eb] border-b border-black/10">
                <button className="text-sm font-semibold text-[#0a3d3e] hover:underline"
                  onClick={() => setPartnerDrawer({ open: true, id: g.partner_id })}>
                  {g.partner_name}
                </button>
                <div className="flex items-center gap-2">
                  <SubtotalChip total={subtotal} />
                  <Btn onClick={() => setAddPayeeFor(g.partner_id)}>
                    <Plus className="h-3 w-3" /> Add Payee Row
                  </Btn>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-black/50">
                  <tr>{["Payee Type","Payee","Default Split %","Payment Method","Actions"].map((c) => (
                    <th key={c} className="text-left font-medium px-3 py-1.5">{c}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((d) => (
                    <tr key={d.id} className="border-t border-black/5">
                      <td className="px-3 py-2"><PayeeTypeBadge t={d.payee_type} /></td>
                      <td className="px-3 py-2">{d.payee_name}</td>
                      <td className="px-3 py-2">{d.default_split_pct}%</td>
                      <td className="px-3 py-2"><PaymentMethodBadge m={d.payment_method} /></td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-[11px] text-black/60 hover:text-black mr-3 inline-flex items-center gap-1"
                          onClick={() => setEditDefault(d)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1"
                          onClick={() => setRemoveDefault(d)}>
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {defaultsByPartner.length === 0 && (
          <div className="bg-white border border-black/10 rounded-md p-6 text-center text-xs text-black/40">
            No defaults match the current filters.
          </div>
        )}
      </div>

      {/* ============================ SECTION 3 ============================ */}
      <SectionTitle>Active Commission Splits</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Per-policy waterfall rows currently in effect. Each policy must sum to 100%.
      </div>
      <FilterRow>
        <FilterSearch value={aPolicy} onChange={setAPolicy} placeholder="Search policy ID or org…" />
        <FilterSelect value={aPayeeType} onChange={setAPayeeType} allLabel="All payee types"
          options={[{value:"house"},{value:"internal_rep",label:"internal rep"},{value:"channel_partner",label:"channel partner"},{value:"override"}]} />
        <FilterSelect value={aSource} onChange={setASource} allLabel="All sources" options={[{value:"default"},{value:"override"}]} />
        <FilterSelect value={aPayMethod} onChange={setAPayMethod} allLabel="All payment methods"
          options={[{value:"hollowtree_paid",label:"Hollowtree Paid"},{value:"carrier_direct",label:"Carrier Direct"}]} />
        <label className="inline-flex items-center gap-1 text-xs ml-1">
          <input type="checkbox" checked={aCurrentOnly} onChange={(e) => setACurrentOnly(e.target.checked)} />
          Show current only
        </label>
        <ClearFiltersLink show={aPolicy !== "" || aPayeeType !== "all" || aSource !== "all" || aPayMethod !== "all" || !aCurrentOnly}
          onClick={() => { setAPolicy(""); setAPayeeType("all"); setASource("all"); setAPayMethod("all"); setACurrentOnly(true); }} />
        <ExportCsvButton filteredCount={filteredActive.length} totalCount={activeSplits.length} resourceLabel="commission splits" />
      </FilterRow>
      <div className="space-y-3">
        {activeByPolicy.map((g) => {
          const currentRows = g.rows.filter((r) => r.effective_to === null);
          const total = currentRows.reduce((s, r) => s + r.split_pct, 0);
          const pol = POLICIES.find((p) => p.id === g.policy_id);
          const isActive = pol?.status === "active";
          return (
            <div key={g.policy_id} className="bg-white border border-black/10 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#f7f3eb] border-b border-black/10">
                <div className="flex items-center gap-2 text-sm">
                  <Link to="/policies" className="font-semibold text-[#0a3d3e] underline">{g.policy_id}</Link>
                  <span className="text-black/50">({g.org_name})</span>
                  <Pill tone={isActive ? "ok" : "neutral"}>{isActive ? "Active" : "Inactive"}</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <PolicyTotalChip total={total} />
                  <Btn onClick={() => setSplitsDrawer({ open: true, policy_id: g.policy_id })}>
                    <Pencil className="h-3 w-3" /> Edit splits
                  </Btn>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-black/50">
                  <tr>{["Payee Type","Payee","Split %","Source","Payment Method","Effective From","Effective To"].map((c) => (
                    <th key={c} className="text-left font-medium px-3 py-1.5">{c}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((s) => {
                    const isHouse = s.payee_type === "house";
                    return (
                      <tr key={s.id} className="border-t border-black/5">
                        <td className="px-3 py-2"><PayeeTypeBadge t={s.payee_type} /></td>
                        <td className="px-3 py-2">
                          {isHouse || !s.payee_ref_id
                            ? <span>{s.payee_name}</span>
                            : <a href={`#partner-${s.payee_ref_id}`} className="text-[#0a3d3e] underline">{s.payee_name}</a>}
                        </td>
                        <td className="px-3 py-2">{s.split_pct}%</td>
                        <td className="px-3 py-2">
                          <Pill tone={s.source === "override" ? "warn" : "neutral"}>{s.source}</Pill>
                        </td>
                        <td className="px-3 py-2"><PaymentMethodBadge m={s.payment_method} /></td>
                        <td className="px-3 py-2">{fmtDate(s.effective_from)}</td>
                        <td className="px-3 py-2">
                          {s.effective_to
                            ? <span className="text-black/40 italic">{fmtDate(s.effective_to)}</span>
                            : <span className="text-emerald-700">Current</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {activeByPolicy.length === 0 && (
          <div className="bg-white border border-black/10 rounded-md p-6 text-center text-xs text-black/40">
            No active splits match the current filters.
          </div>
        )}
      </div>

      {/* ===================== SECTION 4 (LTC ONLY) ===================== */}
      {product === "LTC" && <LtcSchedulesSection />}

      {/* ============================ SECTION 5 ============================ */}
      <SectionTitle>Commission Statements</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        Generated per period per payee. Statements drive payment instructions and broker reporting.
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 mb-2 flex items-center justify-between px-3 py-2 bg-[#0a3d3e] text-white rounded-md text-xs">
          <div>{selectedCount} selected</div>
          <div className="flex gap-2">
            <Btn onClick={() => setSelectedStmtIds(new Set())}>Clear</Btn>
            <Btn variant="primary" onClick={bulkApprove}>Approve selected ({selectedCount})</Btn>
          </div>
        </div>
      )}

      <FilterRow>
        <FilterCombobox value={sPartner} onChange={setSPartner} placeholder="All channel partners"
          options={[{ value: "house", label: "Hollowtree (House)" }, ...partners.map((p) => ({ value: p.id, label: p.partner_name }))]} />
        <FilterCombobox value={sPolicy} onChange={setSPolicy} placeholder="All policies" options={policyOptions} />
        <FilterSelect value={sPayeeType} onChange={setSPayeeType} allLabel="All payee types"
          options={[{value:"house"},{value:"internal_rep",label:"internal rep"},{value:"channel_partner",label:"channel partner"},{value:"override"}]} />
        <FilterSelect value={sStatus} onChange={setSStatus} allLabel="All statuses"
          options={[{value:"draft"},{value:"approved"},{value:"paid"}]} />
        <FilterSelect value={sPeriod} onChange={setSPeriod} allLabel="All periods"
          options={[{value:"30",label:"Last 30 days"},{value:"qtr",label:"Last quarter"},{value:"ytd",label:"YTD"}]} />
        <ClearFiltersLink show={sPartner !== "all" || sPolicy !== "all" || sPayeeType !== "all" || sStatus !== "all" || sPeriod !== "all"}
          onClick={() => { setSPartner("all"); setSPolicy("all"); setSPayeeType("all"); setSStatus("all"); setSPeriod("all"); }} />
        <ExportCsvButton filteredCount={filteredStatements.length} totalCount={statements.length} resourceLabel="commission statements" />
      </FilterRow>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>
            <th className="px-3 py-2 w-6">
              <input type="checkbox"
                checked={selectableDraftIds.length > 0 && selectableDraftIds.every((id) => selectedStmtIds.has(id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStmtIds(new Set(selectableDraftIds.slice(0, 50)));
                  } else {
                    setSelectedStmtIds(new Set());
                  }
                }} />
            </th>
            {(product === "LTC"
              ? ["Period","Policy Year","Policy","Payee","Payee Type","Premium Base","Rate %","Schedule","Commission Owed","Status","Payable","PDF","Actions"]
              : ["Period","Policy","Payee","Payee Type","Premium Base","Rate %","Commission Owed","Status","Payable","PDF","Actions"]
            ).map((c) => (
              <th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {filteredStatements.map((s) => {
            const pol = POLICIES.find((p) => p.id === s.policy_id);
            const checkable = s.status === "draft";
            const sched = product === "LTC" ? deriveScheduleForPolicy(s.policy_id) : null;
            const polYear = product === "LTC" && pol ? policyYearFor(pol.initial_effective_date, s.period_start) : null;
            const matched = sched && polYear ? matchTier(sched.id, polYear) : null;
            const rateTooltip = sched && matched
              ? `Rate derived from ${sched.schedule_name}, Year ${polYear} tier (${matched.from_year}–${matched.to_year === 99 ? "perpetual" : matched.to_year})`
              : undefined;
            return (
              <TRow key={s.id} onClick={() => setStmtDrawer({ open: true, id: s.id })}>
                <TCell onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" disabled={!checkable}
                    checked={selectedStmtIds.has(s.id)}
                    onChange={(e) => {
                      setSelectedStmtIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          if (next.size >= 50) { toast("Selection capped at 50 rows."); return prev; }
                          next.add(s.id);
                        } else next.delete(s.id);
                        return next;
                      });
                    }} />
                </TCell>
                <TCell>{fmtPeriod(s.period_start, s.period_end)}</TCell>
                {product === "LTC" && (
                  <TCell><span className="font-mono text-[11px]">Y{polYear ?? "?"}</span></TCell>
                )}
                <TCell>
                  <Link to="/policies" className="text-[#0a3d3e] underline">{s.policy_id}</Link>
                  <span className="text-black/50"> ({pol?.org_name ?? "—"})</span>
                </TCell>
                <TCell className="font-medium">{s.payee_name}</TCell>
                <TCell><PayeeTypeBadge t={s.payee_type} /></TCell>
                <TCell>{formatCents(s.total_premium_cents)}</TCell>
                <TCell>
                  <span title={rateTooltip}>{s.commission_pct.toFixed(2)}%</span>
                  {product === "LTC" && <Info className="h-3 w-3 inline ml-1 text-black/30" />}
                </TCell>
                {product === "LTC" && (
                  <TCell>
                    {sched
                      ? <button className="text-[11px] text-[#0a3d3e] underline" onClick={(e) => { e.stopPropagation(); document.getElementById(`sched-${sched.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{sched.schedule_name}</button>
                      : <span className="text-rose-700 text-[11px]">no schedule</span>}
                  </TCell>
                )}
                <TCell className="font-semibold">{formatCents(s.commission_owed_cents)}</TCell>
                <TCell><StatusBadge s={s.status} /></TCell>
                <TCell>
                  {s.payable
                    ? <span className="text-emerald-700">✓</span>
                    : <span className="text-black/50 italic text-[11px]">Carrier Direct</span>}
                </TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  <a href={s.pdf_url} className="text-[#0a3d3e]"
                    onClick={(e) => { e.preventDefault(); toast(`Downloading PDF (${s.status === "paid" ? "final" : s.status.toUpperCase()} watermark).`); }}>
                    <Download className="h-3.5 w-3.5 inline" />
                  </a>
                </TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  {s.status === "draft" && <Btn onClick={() => setApproveStmt(s)}>Approve</Btn>}
                  {s.status === "approved" && <Btn onClick={() => setPaidStmt(s)}>Mark Paid</Btn>}
                  {s.status === "paid" && <span className="text-[11px] text-black/40 italic">Immutable</span>}
                </TCell>
              </TRow>
            );
          })}
          {filteredStatements.length === 0 && (
            <tr><td colSpan={product === "LTC" ? 14 : 12} className="px-3 py-6 text-center text-black/40">No statements match the current filters.</td></tr>
          )}
        </tbody>
        {filteredStatements.length > 0 && (
          <tfoot className="bg-[#f7f3eb] text-[11px] text-black/70">
            <tr className="border-t-2 border-black/15">
              <td colSpan={product === "LTC" ? 9 : 7} className="px-3 py-2 font-semibold text-right">Total commission owed</td>
              <td className="px-3 py-2 font-semibold">{formatCents(stmtTotals.owed)}</td>
              <td colSpan={4} className="px-3 py-2">
                <span className="text-black/60">
                  Payable: <span className="font-semibold text-emerald-700">{formatCents(stmtTotals.payable)}</span>
                  {" · "}
                  Carrier direct: <span className="font-semibold">{formatCents(stmtTotals.carrier)}</span>
                </span>
              </td>
            </tr>
            <tr>
              <td colSpan={product === "LTC" ? 14 : 12} className="px-3 py-1 text-[11px] text-black/50">
                {stmtTotals.draft} draft · {stmtTotals.approved} approved · {stmtTotals.paid} paid
              </td>
            </tr>
          </tfoot>
        )}
      </TableShell>

      {/* ============================ DRAWERS / MODALS ============================ */}
      <PartnerDrawerView
        open={partnerDrawer.open}
        partner={selectedPartner}
        defaults={defaults.filter((d) => d.channel_partner_id === partnerDrawer.id)}
        statements={statements.filter((s) => s.channel_partner_id === partnerDrawer.id)}
        onClose={() => setPartnerDrawer({ open: false, id: null })}
      />

      <StatementDrawerView
        open={stmtDrawer.open}
        stmt={selectedStmt}
        product={product}
        onClose={() => setStmtDrawer({ open: false, id: null })}
        onApprove={(s) => setApproveStmt(s)}
        onMarkPaid={(s) => setPaidStmt(s)}
      />

      <ActiveSplitsDrawer
        open={splitsDrawer.open}
        policyId={splitsDrawer.policy_id}
        partners={partners}
        rows={splitsDrawer.policy_id ? activeSplits.filter((s) => s.policy_id === splitsDrawer.policy_id && s.effective_to === null) : []}
        onClose={() => setSplitsDrawer({ open: false, policy_id: null })}
        onSave={(policyId, newRows, effectiveFrom) => {
          setActiveSplits((all) => {
            const closed = all.map((r) =>
              r.policy_id === policyId && r.effective_to === null
                ? { ...r, effective_to: shiftDate(effectiveFrom, -1) }
                : r,
            );
            return [...closed, ...newRows];
          });
          setSplitsDrawer({ open: false, policy_id: null });
          toast.success("Splits updated. Previous waterfall closed.");
        }}
      />

      <GenerateModal
        open={genModal}
        onClose={() => setGenModal(false)}
        existingStatements={statements}
        activeSplits={activeSplits.filter((s) => s.effective_to === null)}
        onGenerate={(rows) => {
          setStatements((prev) => {
            // Idempotency dedup: skip rows that exist as approved/paid; replace drafts.
            const key = (r: Statement) => `${r.channel_partner_id ?? "house"}|${r.period_start}|${r.period_end}|${r.payee_type}|${r.payee_ref_id ?? ""}|${r.commission_split_id ?? ""}`;
            const existing = new Map(prev.map((r) => [key(r), r] as const));
            const out = [...prev];
            let added = 0, updated = 0, skipped = 0;
            for (const r of rows) {
              const k = key(r);
              const e = existing.get(k);
              if (!e) { out.unshift(r); added++; }
              else if (e.status === "draft") {
                const idx = out.findIndex((x) => x.id === e.id);
                out[idx] = { ...e, total_premium_cents: r.total_premium_cents, commission_owed_cents: r.commission_owed_cents, commission_pct: r.commission_pct, generated_at: r.generated_at };
                updated++;
              } else skipped++;
            }
            toast.success(`Generated ${added} new · updated ${updated} drafts · skipped ${skipped} immutable.`);
            return out;
          });
          setGenModal(false);
        }}
      />

      {addPayeeFor && (
        <AddPayeeModal
          partnerId={addPayeeFor}
          partners={partners}
          onCancel={() => setAddPayeeFor(null)}
          onAdd={(row) => {
            setDefaults((rs) => [...rs, row]);
            setAddPayeeFor(null);
            toast.success("Default added.");
          }}
        />
      )}
      {editDefault && (
        <EditDefaultModal
          row={editDefault}
          activeCount={activeSplitsByPartner[editDefault.channel_partner_id] ?? 0}
          onCancel={() => setEditDefault(null)}
          onSave={(updated) => {
            setDefaults((rs) => rs.map((r) => r.id === updated.id ? updated : r));
            setEditDefault(null);
            toast.success("Default updated. Existing splits unchanged.");
          }}
        />
      )}
      {removeDefault && (
        <RemoveDefaultModal
          row={removeDefault}
          activeCount={activeSplitsByPartner[removeDefault.channel_partner_id] ?? 0}
          onCancel={() => setRemoveDefault(null)}
          onConfirm={() => {
            setDefaults((rs) => rs.filter((r) => r.id !== removeDefault.id));
            setRemoveDefault(null);
            toast.success("Default removed. Existing splits unaffected.");
          }}
        />
      )}
      {approveStmt && (
        <ApproveModal
          stmt={approveStmt}
          onCancel={() => setApproveStmt(null)}
          onConfirm={() => { doApprove(approveStmt.id); setApproveStmt(null); }}
        />
      )}
      {paidStmt && (
        <MarkPaidModal
          stmt={paidStmt}
          onCancel={() => setPaidStmt(null)}
          onConfirm={(ref) => { doMarkPaid(paidStmt.id, ref); setPaidStmt(null); }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Helpers / small components
// ===========================================================================
function toggleSet<T>(prev: Set<T>, t: T): Set<T> {
  const next = new Set(prev);
  if (next.has(t)) next.delete(t); else next.add(t);
  return next;
}
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-black/40 font-semibold border-b border-black/10 pb-1 mt-4 mb-2">{children}</div>;
}

function Modal({ title, body, warn, onCancel, children, footer, width = 420 }: {
  title: string; body?: React.ReactNode; warn?: boolean; onCancel: () => void;
  children?: React.ReactNode; footer: React.ReactNode; width?: number;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white border border-black/15 rounded-md shadow-xl p-4" style={{ width }}>
        <div className="font-semibold text-sm mb-2 flex items-center gap-2">
          {warn ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
          {title}
        </div>
        {body ? <div className="text-xs text-black/70 mb-3">{body}</div> : null}
        {children}
        <div className="flex justify-end gap-2 mt-3">{footer}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// Drawer A — Channel Partner detail
// ===========================================================================
function PartnerDrawerView({ open, partner, defaults, statements, onClose }: {
  open: boolean; partner: Partner | null;
  defaults: DefaultRow[];
  statements: Statement[];
  onClose: () => void;
}) {
  if (!open) return null;
  const total = defaults.reduce((s, d) => s + d.default_split_pct, 0);

  // Last 6 periods
  const periods = useMemo(() => {
    const map: Record<string, { period_start: string; period_end: string; total_cents: number; draft: number; approved: number; paid: number }> = {};
    for (const s of statements) {
      const key = `${s.period_start}|${s.period_end}`;
      const e = (map[key] ??= { period_start: s.period_start, period_end: s.period_end, total_cents: 0, draft: 0, approved: 0, paid: 0 });
      e.total_cents += s.commission_owed_cents;
      e[s.status]++;
    }
    return Object.values(map).sort((a, b) => b.period_start.localeCompare(a.period_start)).slice(0, 6);
  }, [statements]);

  // YTD
  const ytd = useMemo(() => {
    let paid = 0, premium = 0; const policySet = new Set<string>();
    for (const s of statements) {
      if (new Date(s.period_end).getUTCFullYear() !== NOW.getUTCFullYear()) continue;
      if (s.status === "paid") paid += s.commission_owed_cents;
      premium += s.total_premium_cents;
      policySet.add(s.policy_id);
    }
    return { paid, premium, policies: policySet.size };
  }, [statements]);

  return (
    <Drawer open={open} onClose={onClose} title={partner?.name ?? "Channel Partner"}>
      {partner && (
        <>
          <SectionHeader>Header</SectionHeader>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-lg font-semibold">{partner.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <PartnerTypeBadge t={partner.partner_type_v2} />
                <EntityCell et={partner.partner_entity_type} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Pill tone={partner.license_status === "Licensed" ? "ok" : "neutral"}>{partner.license_status}</Pill>
                <span className="text-[11px] text-black/50">Agreement {partner.agreement_status}{partner.agreement_date ? ` (${fmtDate(partner.agreement_date)})` : ""}</span>
              </div>
            </div>
            <a href={attioUrl(partner.attio_channel_partner_id)} target="_blank" rel="noreferrer">
              <Btn variant="primary">View in Attio <ExternalLink className="h-3 w-3" /></Btn>
            </a>
          </div>
          <div className="text-[11px] text-black/40 mb-3">Edit partner details in Attio. Local view is read-only.</div>

          <SectionHeader>Contact</SectionHeader>
          <Field label="Primary Contact"><div>{partner.primary_contact_name}</div></Field>
          <Field label="Email">
            <a href={`mailto:${partner.primary_contact_email}`} className="text-[#0a3d3e] underline">{partner.primary_contact_email}</a>
          </Field>
          <Field label="Google Drive Folder">
            {partner.google_drive_folder
              ? <a href={partner.google_drive_folder} target="_blank" rel="noreferrer" className="text-[#0a3d3e] underline inline-flex items-center gap-1">Open folder <ExternalLink className="h-3 w-3" /></a>
              : <span className="text-black/40">—</span>}
          </Field>

          <SectionHeader>Commission Defaults Summary</SectionHeader>
          <Card className="p-2 mb-3">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>{["Payee Type","Payee","Default %","Payment Method"].map((c) => (
                  <th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}</tr>
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
              </tbody>
              {defaults.length > 0 && (
                <tfoot>
                  <tr className="border-t border-black/15">
                    <td colSpan={2} className="px-2 py-1 font-semibold">Subtotal</td>
                    <td colSpan={2} className="px-2 py-1"><SubtotalChip total={total} /></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>

          <SectionHeader>Recent Statements (last 6 periods)</SectionHeader>
          <Card className="p-2 mb-3">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>{["Period","Total Commission","Status"].map((c) => (
                  <th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}</tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.period_start} className="border-t border-black/5">
                    <td className="px-2 py-1">{fmtPeriod(p.period_start, p.period_end)}</td>
                    <td className="px-2 py-1 font-medium">{formatCents(p.total_cents)}</td>
                    <td className="px-2 py-1 text-[11px] text-black/60">
                      {p.draft > 0 && <span className="mr-2">{p.draft} draft</span>}
                      {p.approved > 0 && <span className="mr-2">{p.approved} approved</span>}
                      {p.paid > 0 && <span>{p.paid} paid</span>}
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr><td colSpan={3} className="px-2 py-3 text-center text-black/40">No statements yet.</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <SectionHeader>YTD Totals</SectionHeader>
          <Field label="Commission Paid YTD"><div className="text-base font-semibold">{formatCents(ytd.paid)}</div></Field>
          <Field label="Policies Attributed YTD"><div>{ytd.policies}</div></Field>
          <Field label="Premium Base YTD"><div>{formatCents(ytd.premium)}</div></Field>
        </>
      )}
    </Drawer>
  );
}

// ===========================================================================
// Drawer B — Active Splits Edit
// ===========================================================================
type EditRow = {
  id: string;
  payee_type: PayeeType;
  payee_ref_id: string | null;
  payee_name: string;
  split_pct: number;
  payment_method: PaymentMethodSetting;
};
function ActiveSplitsDrawer({ open, policyId, partners, rows, onClose, onSave }: {
  open: boolean; policyId: string | null; partners: Partner[];
  rows: ActiveSplit[]; onClose: () => void;
  onSave: (policyId: string, newRows: ActiveSplit[], effectiveFrom: string) => void;
}) {
  const todayISO = NOW.toISOString().slice(0, 10);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [effFrom, setEffFrom] = useState(todayISO);

  // Reset state when drawer opens for a new policy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (open && policyId) {
      setEditRows(rows.map((r) => ({
        id: r.id, payee_type: r.payee_type, payee_ref_id: r.payee_ref_id,
        payee_name: r.payee_name, split_pct: r.split_pct, payment_method: r.payment_method,
      })));
      setEffFrom(todayISO);
    }
  }, [open, policyId]);

  if (!open || !policyId) return null;
  const pol = POLICIES.find((p) => p.id === policyId);
  const total = editRows.reduce((s, r) => s + (Number(r.split_pct) || 0), 0);
  const canSave = Math.abs(total - 100) < 0.005 && editRows.length > 0;

  function setRow(idx: number, patch: Partial<EditRow>) {
    setEditRows((rs) => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function addRow() {
    setEditRows((rs) => [...rs, { id: `new_${Date.now()}_${rs.length}`, payee_type: "channel_partner", payee_ref_id: partners[0]?.id ?? null, payee_name: partners[0]?.name ?? "", split_pct: 0, payment_method: "hollowtree_paid" }]);
  }
  function removeRow(idx: number) {
    setEditRows((rs) => rs.filter((_, i) => i !== idx));
  }
  function handleSave() {
    if (!canSave || !policyId || !pol) return;
    const newRows: ActiveSplit[] = editRows.map((r, i) => ({
      id: `${policyId}_v${Date.now()}_${i}`,
      policy_id: policyId,
      org_name: pol.org_name,
      payee_type: r.payee_type,
      payee_ref_id: r.payee_type === "house" ? null : r.payee_ref_id,
      payee_name: r.payee_type === "house" ? "Hollowtree" : r.payee_name,
      split_pct: Number(r.split_pct),
      source: "override",
      payment_method: r.payment_method,
      effective_from: effFrom,
      effective_to: null,
    }));
    onSave(policyId, newRows, effFrom);
  }

  return (
    <Drawer open={open} onClose={onClose} title={`Edit splits — ${policyId}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">{policyId} <span className="text-black/50 font-normal">({pol?.org_name})</span></div>
        </div>
        <PolicyTotalChip total={total} />
      </div>

      <SectionHeader>Splits Editor</SectionHeader>
      <Card className="p-2 mb-3">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["Payee Type","Payee","Split %","Payment Method",""].map((c) => (
              <th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}</tr>
          </thead>
          <tbody>
            {editRows.map((r, i) => (
              <tr key={r.id} className="border-t border-black/5">
                <td className="px-2 py-1">
                  <select value={r.payee_type} onChange={(e) => {
                    const pt = e.target.value as PayeeType;
                    setRow(i, {
                      payee_type: pt,
                      payee_ref_id: pt === "house" ? null : (partners[0]?.id ?? null),
                      payee_name: pt === "house" ? "Hollowtree" : (partners[0]?.name ?? ""),
                    });
                  }} className="px-1 py-0.5 text-xs border border-black/15 rounded">
                    <option value="house">house</option>
                    <option value="internal_rep">internal rep</option>
                    <option value="channel_partner">channel partner</option>
                    <option value="override">override</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  {r.payee_type === "house"
                    ? <span className="text-black/60">Hollowtree</span>
                    : <select value={r.payee_ref_id ?? ""} onChange={(e) => {
                        const id = e.target.value;
                        const p = partners.find((x) => x.id === id);
                        setRow(i, { payee_ref_id: id, payee_name: p?.name ?? "" });
                      }} className="px-1 py-0.5 text-xs border border-black/15 rounded">
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.partner_name}</option>)}
                      </select>}
                </td>
                <td className="px-2 py-1">
                  <input type="number" min={0} max={100} step={0.5} value={r.split_pct}
                    onChange={(e) => setRow(i, { split_pct: Number(e.target.value) })}
                    className="w-20 px-1 py-0.5 text-xs border border-black/15 rounded" />%
                </td>
                <td className="px-2 py-1">
                  <select value={r.payment_method} onChange={(e) => setRow(i, { payment_method: e.target.value as PaymentMethodSetting })}
                    className="px-1 py-0.5 text-xs border border-black/15 rounded">
                    <option value="hollowtree_paid">Hollowtree Paid</option>
                    <option value="carrier_direct">Carrier Direct</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-right">
                  <button className="text-rose-600 hover:underline text-[11px]" onClick={() => removeRow(i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2"><Btn onClick={addRow}><Plus className="h-3 w-3" /> Add Row</Btn></div>
      </Card>

      <SectionHeader>Effective Dating</SectionHeader>
      <Field label="Effective From">
        <input type="date" value={effFrom} onChange={(e) => setEffFrom(e.target.value)}
          className="px-2 py-1 text-sm border border-black/15 rounded" />
      </Field>

      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 mb-3 flex items-start gap-1">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Saving will close current splits and create a new waterfall effective {fmtDate(effFrom)}. This affects future statements only. Past statements are unchanged.</span>
      </div>

      <div className="flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={!canSave}>Save splits</Btn>
      </div>
    </Drawer>
  );
}

// ===========================================================================
// Drawer C — Statement Detail
// ===========================================================================
function StatementDrawerView({ open, stmt, product, onClose, onApprove, onMarkPaid }: {
  open: boolean; stmt: Statement | null;
  product: "DI" | "LTC";
  onClose: () => void;
  onApprove: (s: Statement) => void;
  onMarkPaid: (s: Statement) => void;
}) {
  if (!open || !stmt) return null;
  const pol = POLICIES.find((p) => p.id === stmt.policy_id);
  // Derivation: count of ledger entries that fed the premium base (PHI-gated — count only)
  const contributingEntries = Math.max(1, Math.round(stmt.total_premium_cents / 80000));
  const sched = product === "LTC" ? deriveScheduleForPolicy(stmt.policy_id) : null;
  const polYear = product === "LTC" && pol ? policyYearFor(pol.initial_effective_date, stmt.period_start) : null;
  const matched = sched && polYear ? matchTier(sched.id, polYear) : null;

  return (
    <Drawer open={open} onClose={onClose} title={`Statement ${fmtPeriod(stmt.period_start, stmt.period_end)} — ${stmt.payee_name}`}>
      <SectionHeader>Header</SectionHeader>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">{fmtPeriod(stmt.period_start, stmt.period_end)}</div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge s={stmt.status} />
            {stmt.payable
              ? <Pill tone="ok">Payable</Pill>
              : <span className="text-[11px] text-black/50 italic">Carrier Direct</span>}
          </div>
        </div>
        <Btn onClick={() => toast(`Downloading PDF (${stmt.status === "paid" ? "final" : stmt.status.toUpperCase()} watermark).`)}>
          <FileText className="h-3 w-3" /> Download PDF
        </Btn>
      </div>

      <SectionHeader>Statement Summary</SectionHeader>
      <Field label="Policy">
        <Link to="/policies" className="text-[#0a3d3e] underline">{stmt.policy_id}</Link>
        <span className="text-black/50"> ({pol?.org_name ?? "—"})</span>
      </Field>
      <Field label="Payee"><div>{stmt.payee_name}</div></Field>
      <Field label="Payee Type"><PayeeTypeBadge t={stmt.payee_type} /></Field>
      <Field label="Premium Base"><div>{formatCents(stmt.total_premium_cents)}</div></Field>
      <Field label="Commission Rate"><div>{stmt.commission_pct.toFixed(2)}%</div></Field>
      <Field label="Commission Owed"><div className="text-lg font-semibold">{formatCents(stmt.commission_owed_cents)}</div></Field>

      {product === "LTC" && (
        <>
          <SectionHeader>Rate Derivation</SectionHeader>
          <Card className="p-2 mb-3 text-xs space-y-1">
            {sched ? (
              <>
                <div><span className="text-black/50">Schedule:</span> <span className="font-medium">{sched.schedule_name}</span></div>
                <div><span className="text-black/50">Type:</span> {scheduleTypeChip(sched.schedule_type)}</div>
                <div><span className="text-black/50">State:</span> {stateChip(sched.state_code)}</div>
                <div><span className="text-black/50">Policy effective:</span> {fmtDate(pol?.initial_effective_date ?? null)}</div>
                <div><span className="text-black/50">Billing period:</span> {fmtPeriod(stmt.period_start, stmt.period_end)}</div>
                <div><span className="text-black/50">Policy year:</span> <span className="font-mono">Y{polYear}</span></div>
                {matched ? (
                  <div><span className="text-black/50">Tier matched:</span> from_year={matched.from_year}, to_year={matched.to_year === 99 ? "perpetual" : matched.to_year}, rate_pct={matched.rate_pct}</div>
                ) : (
                  <div className="text-rose-700">No tier matches policy year {polYear}.</div>
                )}
                <div className="pt-1 border-t border-black/10">
                  <span className="text-black/50">Snapshot commission_pct:</span> <span className="font-semibold">{stmt.commission_pct.toFixed(2)}%</span>
                </div>
              </>
            ) : (
              <div className="text-rose-700">No active schedule derived for this policy.</div>
            )}
          </Card>
        </>
      )}

      <SectionHeader>Derivation Breakdown</SectionHeader>
      <Card className="p-2 mb-3">
        <div className="text-[11px] text-black/60 mb-2">
          {contributingEntries} payment_ledger entries contributed to the premium base for this period.
          <span className="block mt-1 italic text-black/40">PHI-gated detail (individual names) requires a separate access request.</span>
        </div>
        <div className="text-xs">
          {formatCents(stmt.total_premium_cents)} × {stmt.commission_pct.toFixed(2)}% × split = <span className="font-semibold">{formatCents(stmt.commission_owed_cents)}</span>
        </div>
      </Card>

      <SectionHeader>Audit Trail</SectionHeader>
      <Field label="Generated"><div>{fmtDate(stmt.generated_at)} by {stmt.generated_by}</div></Field>
      <Field label="Approved"><div>{stmt.approved_at ? `${fmtDate(stmt.approved_at)} by ${stmt.approved_by}` : "—"}</div></Field>
      <Field label="Paid">
        <div>
          {stmt.paid_at
            ? <>{fmtDate(stmt.paid_at)} by {stmt.paid_by} <span className="text-black/50">(ref: {stmt.payment_reference})</span></>
            : "—"}
        </div>
      </Field>
      <Field label="Source Split">
        {stmt.commission_split_id
          ? <span className="font-mono text-[11px]">{stmt.commission_split_id}</span>
          : <span className="text-black/40">—</span>}
      </Field>

      <div className="flex gap-2 mt-4">
        {stmt.status === "draft" && <Btn variant="primary" onClick={() => onApprove(stmt)}>Approve</Btn>}
        {stmt.status === "approved" && <Btn variant="primary" onClick={() => onMarkPaid(stmt)}>Mark Paid</Btn>}
      </div>
    </Drawer>
  );
}

// ===========================================================================
// Modal A — Generate Statements
// ===========================================================================
function GenerateModal({ open, onClose, existingStatements, activeSplits, onGenerate }: {
  open: boolean; onClose: () => void;
  existingStatements: Statement[];
  activeSplits: ActiveSplit[];
  onGenerate: (rows: Statement[]) => void;
}) {
  const defaults = lastCompletedMonth();
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [step, setStep] = useState<1 | 2>(1);

  if (!open) return null;

  const preview = useMemo<Statement[]>(() => {
    const rows: Statement[] = [];
    let idx = 0;
    for (const s of activeSplits) {
      const partner = ALL_PARTNERS.find((p) => p.partner_name === s.payee_name && s.payee_type !== "house");
      const premium = 800000; // dummy per-policy/period base
      const ratePct = 12;
      const owed = Math.round(premium * (ratePct / 100) * (s.split_pct / 100));
      rows.push({
        id: `stm_gen_${start}_${idx++}`,
        policy_id: s.policy_id,
        channel_partner_id: s.payee_type === "house" ? null : (partner?.id ?? null),
        payee_type: s.payee_type,
        payee_ref_id: s.payee_type === "house" ? null : (partner?.id ?? null),
        payee_name: s.payee_name,
        period_start: start, period_end: end,
        total_premium_cents: premium,
        commission_pct: ratePct,
        commission_owed_cents: owed,
        status: "draft",
        generated_at: new Date().toISOString(),
        generated_by: "Guy Livingstone",
        approved_at: null, approved_by: null,
        paid_at: null, paid_by: null, payment_reference: null,
        pdf_url: "#",
        commission_split_id: s.id,
        payable: s.payment_method === "hollowtree_paid",
      });
    }
    return rows;
  }, [start, end, activeSplits]);

  const byType = useMemo(() => {
    const c = { house: 0, internal_rep: 0, channel_partner: 0, override: 0 } as Record<PayeeType, number>;
    for (const r of preview) c[r.payee_type]++;
    return c;
  }, [preview]);
  const totalOwed = preview.reduce((s, r) => s + r.commission_owed_cents, 0);
  const totalPayable = preview.filter((r) => r.payable).reduce((s, r) => s + r.commission_owed_cents, 0);
  const totalCarrier = totalOwed - totalPayable;

  const overlaps = useMemo(() => {
    let drafts = 0, immutable = 0;
    const existingKey = (s: Statement) => `${s.channel_partner_id ?? "house"}|${s.period_start}|${s.period_end}|${s.payee_type}|${s.payee_ref_id ?? ""}|${s.commission_split_id ?? ""}`;
    const map = new Map(existingStatements.filter((s) => s.period_start === start && s.period_end === end).map((s) => [existingKey(s), s] as const));
    for (const r of preview) {
      const e = map.get(existingKey(r));
      if (!e) continue;
      if (e.status === "draft") drafts++;
      else immutable++;
    }
    return { drafts, immutable };
  }, [preview, existingStatements, start, end]);

  function setQuick(kind: "last-month" | "last-quarter") {
    if (kind === "last-month") {
      const lm = lastCompletedMonth();
      setStart(lm.start); setEnd(lm.end);
    } else {
      const d = new Date(NOW); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 3);
      const s = d.toISOString().slice(0, 10);
      const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 0)).toISOString().slice(0, 10);
      setStart(s); setEnd(e);
    }
    setStep(1);
  }

  return (
    <Modal
      title="Generate Commission Statements"
      onCancel={onClose}
      width={520}
      footer={
        step === 1 ? (
          <>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={() => setStep(2)}>Preview</Btn>
          </>
        ) : (
          <>
            <Btn onClick={() => setStep(1)}>Back</Btn>
            <Btn variant="primary" onClick={() => onGenerate(preview)}>Confirm Generation</Btn>
          </>
        )
      }
    >
      {step === 1 && (
        <div>
          <div className="flex gap-2 mb-3 text-[11px]">
            <button className="px-2 py-1 rounded border border-black/15 bg-white hover:bg-black/5" onClick={() => setQuick("last-month")}>Last month</button>
            <button className="px-2 py-1 rounded border border-black/15 bg-white hover:bg-black/5" onClick={() => setQuick("last-quarter")}>Last quarter</button>
            <span className="text-black/40 self-center">or custom range below</span>
          </div>
          <Field label="Period Start">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 text-sm border border-black/15 rounded" />
          </Field>
          <Field label="Period End">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-1 text-sm border border-black/15 rounded" />
          </Field>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="text-xs mb-2">Period: <span className="font-semibold">{fmtDate(start)} – {fmtDate(end)}</span></div>
          <div className="rounded border border-black/10 bg-stone-50 p-3 text-xs space-y-1 mb-3">
            <div>Total statements to generate: <span className="font-semibold">{preview.length}</span></div>
            <div className="text-black/60">
              house ({byType.house}) · internal_rep ({byType.internal_rep}) · channel_partner ({byType.channel_partner}) · override ({byType.override})
            </div>
            <div className="border-t border-black/10 pt-1 mt-1">
              Total commission owed: <span className="font-semibold">{formatCents(totalOwed)}</span>
            </div>
            <div>Total payable: <span className="font-semibold text-emerald-700">{formatCents(totalPayable)}</span></div>
            <div>Total carrier direct (informational): <span className="font-semibold">{formatCents(totalCarrier)}</span></div>
          </div>
          {(overlaps.drafts > 0 || overlaps.immutable > 0) && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 flex items-start gap-1">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {overlaps.drafts} draft statement{overlaps.drafts === 1 ? "" : "s"} already exist for this period and will be UPDATED with current data.
                {overlaps.immutable > 0 && <> {overlaps.immutable} approved or paid statement{overlaps.immutable === 1 ? "" : "s"} will be SKIPPED (immutable).</>}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ===========================================================================
// Modal B — Approve Statement
// ===========================================================================
function ApproveModal({ stmt, onCancel, onConfirm }: { stmt: Statement; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <Modal title="Approve commission statement?" onCancel={onCancel}
      footer={<><Btn onClick={onCancel}>Cancel</Btn><Btn variant="primary" onClick={onConfirm}>Approve</Btn></>}>
      <div className="space-y-2 text-xs">
        <div><span className="text-black/50">Payee:</span> <span className="font-medium">{stmt.payee_name}</span></div>
        <div><span className="text-black/50">Period:</span> {fmtPeriod(stmt.period_start, stmt.period_end)}</div>
        <div className="pt-2 border-t border-black/10">
          <div className="text-black/50">Commission owed</div>
          <div className="text-2xl font-semibold">{formatCents(stmt.commission_owed_cents)}</div>
        </div>
        <div><PaymentMethodBadge m={stmt.payable ? "hollowtree_paid" : "carrier_direct"} /></div>
      </div>
    </Modal>
  );
}

// ===========================================================================
// Modal C — Mark Paid
// ===========================================================================
function MarkPaidModal({ stmt, onCancel, onConfirm }: { stmt: Statement; onCancel: () => void; onConfirm: (ref: string) => void; }) {
  const [ref, setRef] = useState("");
  return (
    <Modal title="Mark statement as paid?" onCancel={onCancel}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={() => onConfirm(ref.trim())} disabled={ref.trim().length < 3}>Mark Paid</Btn>
        </>
      }>
      <div className="space-y-2 text-xs mb-3">
        <div><span className="text-black/50">Payee:</span> <span className="font-medium">{stmt.payee_name}</span></div>
        <div><span className="text-black/50">Period:</span> {fmtPeriod(stmt.period_start, stmt.period_end)}</div>
        <div><span className="text-black/50">Commission owed:</span> <span className="font-semibold">{formatCents(stmt.commission_owed_cents)}</span></div>
        <div><PaymentMethodBadge m={stmt.payable ? "hollowtree_paid" : "carrier_direct"} /></div>
      </div>
      <Field label="Payment Reference (required)">
        <input value={ref} onChange={(e) => setRef(e.target.value)}
          placeholder="e.g., Wire ref 88291 or Check 1042"
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
      </Field>
    </Modal>
  );
}

// ===========================================================================
// Add Payee Modal (Section 2)
// ===========================================================================
function AddPayeeModal({ partnerId, partners, onCancel, onAdd }: {
  partnerId: string; partners: Partner[];
  onCancel: () => void; onAdd: (row: DefaultRow) => void;
}) {
  const partner = partners.find((p) => p.id === partnerId)!;
  const [payeeType, setPayeeType] = useState<PayeeType>("internal_rep");
  const [payeeRefId, setPayeeRefId] = useState<string>(partners[0]?.id ?? "");
  const [rate_pct, setPct] = useState<number>(10);
  const [method, setMethod] = useState<PaymentMethodSetting>("hollowtree_paid");

  const payeeName = payeeType === "house"
    ? "Hollowtree"
    : (partners.find((p) => p.id === payeeRefId)?.name ?? "");

  return (
    <Modal title={`Add payee row — ${partner.name}`} onCancel={onCancel}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={rate_pct <= 0 || rate_pct > 100} onClick={() => onAdd({
            id: `csd_new_${Date.now()}`,
            channel_partner_id: partnerId,
            channel_partner_name: partner.name,
            payee_type: payeeType,
            payee_ref_id: payeeType === "house" ? null : payeeRefId,
            payee_name: payeeName,
            default_split_pct: Number(rate_pct),
            payment_method: method,
          })}>Add</Btn>
        </>
      }>
      <Field label="Payee Type">
        <select value={payeeType} onChange={(e) => setPayeeType(e.target.value as PayeeType)}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          <option value="house">house</option>
          <option value="internal_rep">internal rep</option>
          <option value="channel_partner">channel partner</option>
          <option value="override">override</option>
        </select>
      </Field>
      <Field label="Payee">
        {payeeType === "house"
          ? <input value="Hollowtree" disabled className="px-2 py-1 text-sm border border-black/15 rounded w-full bg-stone-50 text-black/60" />
          : <select value={payeeRefId} onChange={(e) => setPayeeRefId(e.target.value)}
              className="px-2 py-1 text-sm border border-black/15 rounded w-full">
              {partners.map((p) => <option key={p.id} value={p.id}>{p.partner_name}</option>)}
            </select>}
      </Field>
      <Field label="Default Split %">
        <input type="number" min={0} max={100} step={0.5} value={rate_pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
      </Field>
      <Field label="Payment Method">
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodSetting)}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          <option value="hollowtree_paid">Hollowtree Paid</option>
          <option value="carrier_direct">Carrier Direct</option>
        </select>
      </Field>
    </Modal>
  );
}

// ===========================================================================
// Edit / Remove Default Modals (Section 2)
// ===========================================================================
function EditDefaultModal({ row, activeCount, onCancel, onSave }: {
  row: DefaultRow; activeCount: number;
  onCancel: () => void; onSave: (row: DefaultRow) => void;
}) {
  const [rate_pct, setPct] = useState(row.default_split_pct);
  const [method, setMethod] = useState<PaymentMethodSetting>(row.payment_method);
  return (
    <Modal title={`Edit default — ${row.payee_name}`} warn onCancel={onCancel}
      footer={<><Btn onClick={onCancel}>Cancel</Btn><Btn variant="primary" onClick={() => onSave({ ...row, default_split_pct: Number(rate_pct), payment_method: method })}>Save</Btn></>}>
      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 mb-3">
        Edits apply to NEW policies only. Existing {activeCount} commission_splits row{activeCount === 1 ? "" : "s"} for this channel partner are unaffected. Use Active Commission Splits below to override an individual policy.
      </div>
      <Field label="Default Split %">
        <input type="number" min={0} max={100} step={0.5} value={rate_pct} onChange={(e) => setPct(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
      </Field>
      <Field label="Payment Method">
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodSetting)}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          <option value="hollowtree_paid">Hollowtree Paid</option>
          <option value="carrier_direct">Carrier Direct</option>
        </select>
      </Field>
    </Modal>
  );
}

function RemoveDefaultModal({ row, activeCount, onCancel, onConfirm }: {
  row: DefaultRow; activeCount: number;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal title="Remove default split?" warn onCancel={onCancel}
      footer={<><Btn onClick={onCancel}>Cancel</Btn><Btn variant="danger" onClick={onConfirm}>Remove</Btn></>}>
      <div className="text-xs">
        Remove default split for <span className="font-medium">{row.payee_name}</span> ({row.payee_type.replace(/_/g, " ")}, {row.default_split_pct}%)?
        This default has been copied to {activeCount} active policy split{activeCount === 1 ? "" : "s"}. Those existing splits will NOT be removed automatically. New policies for {row.channel_partner_name} won't include this payee.
      </div>
    </Modal>
  );
}

// ===========================================================================
// LTC Section 4 — Carrier Commission Schedules
// ===========================================================================
type SchedDraft = {
  id: string;
  carrier_product_id: string;
  schedule_name: string;
  schedule_type: ScheduleType;
  state_code: string;
  is_default: boolean;
  effective_from: string;
  effective_to: string;
  notes: string;
  tiers: Array<{ key: string; from_year: number; to_year: number | null; rate_pct: number }>;
};

function ltcCarrierProducts() {
  return CARRIER_PRODUCTS.filter((p) => p.line_of_business === "LTC");
}

function LtcSchedulesSection() {
  const [schedules, setSchedules] = useState<CarrierCommissionSchedule[]>(CARRIER_COMMISSION_SCHEDULES);
  const [tiers, setTiers] = useState(COMMISSION_RATE_TIERS);
  const [fProduct, setFProduct] = useState<string>("all");
  const [fType, setFType] = useState<ScheduleType | "all">("all");
  const [fState, setFState] = useState<"all" | "ny" | "std">("all");
  const [fDefaultOnly, setFDefaultOnly] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null; create?: boolean }>({ open: false, id: null });

  const filtered = useMemo(() => schedules.filter((s) => {
    if (fProduct !== "all" && s.carrier_product_id !== fProduct) return false;
    if (fType !== "all" && s.schedule_type !== fType) return false;
    if (fState === "ny" && s.state_code !== "NY") return false;
    if (fState === "std" && s.state_code !== null) return false;
    if (fDefaultOnly && !s.is_default) return false;
    return true;
  }), [schedules, fProduct, fType, fState, fDefaultOnly]);

  const grouped = useMemo(() => {
    const g: Record<string, CarrierCommissionSchedule[]> = {};
    for (const s of filtered) (g[s.carrier_product_id] ??= []).push(s);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const ltcProducts = ltcCarrierProducts();
  const stmtsBySchedule = (sid: string) => 0; // placeholder; statement snapshots don't store schedule_id in seed

  function makeDefault(id: string) {
    setSchedules((rs) => {
      const target = rs.find((r) => r.id === id);
      if (!target) return rs;
      return rs.map((r) => {
        if (r.carrier_product_id !== target.carrier_product_id) return r;
        return { ...r, is_default: r.id === id };
      });
    });
    toast.success("Promoted to default. Previous default demoted.");
  }

  return (
    <>
      <SectionTitle>Carrier Commission Schedules</SectionTitle>
      <div className="text-xs text-black/50 mb-2">
        What each carrier product pays in commission, by year band. Multiple schedules per product (heaped vs flat vs level). One default per carrier product. State-specific variants supported (NY).
      </div>
      <FilterRow>
        <FilterCombobox value={fProduct} onChange={setFProduct} placeholder="All carrier products"
          options={ltcProducts.map((p) => ({ value: p.id, label: carrierProductLabel(p.id) }))} />
        <FilterSelect value={fType} onChange={setFType} allLabel="All types"
          options={[{value:"heaped"},{value:"flat"},{value:"level"}]} />
        <FilterSelect value={fState} onChange={setFState} allLabel="All states"
          options={[{value:"ny",label:"NY only"},{value:"std",label:"Standard only"}]} />
        <label className="inline-flex items-center gap-1 text-xs ml-1">
          <input type="checkbox" checked={fDefaultOnly} onChange={(e) => setFDefaultOnly(e.target.checked)} />
          Show defaults only
        </label>
        <ClearFiltersLink show={fProduct !== "all" || fType !== "all" || fState !== "all" || fDefaultOnly}
          onClick={() => { setFProduct("all"); setFType("all"); setFState("all"); setFDefaultOnly(false); }} />
        <ExportCsvButton filteredCount={filtered.length} totalCount={schedules.length} resourceLabel="carrier commission schedules" />
        <div className="ml-auto">
          <Btn variant="primary" onClick={() => setDrawer({ open: true, id: null, create: true })}>
            <Plus className="h-3 w-3" /> New Schedule
          </Btn>
        </div>
      </FilterRow>
      <div className="space-y-3">
        {grouped.map(([cpId, rows]) => (
          <div key={cpId} className="bg-white border border-black/10 rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[#f7f3eb] border-b border-black/10">
              <div className="text-sm font-semibold text-[#0a3d3e]">{carrierProductLabel(cpId)}</div>
              <div className="text-[11px] text-black/50">{rows.length} schedule{rows.length === 1 ? "" : "s"}</div>
            </div>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-black/50">
                <tr>{["Schedule Name","Type","State","Effective","Tier Preview","Default","Actions"].map((c) => (
                  <th key={c} className="text-left font-medium px-3 py-1.5">{c}</th>))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} id={`sched-${s.id}`} className="border-t border-black/5 hover:bg-stone-50 cursor-pointer"
                    onClick={() => setDrawer({ open: true, id: s.id })}>
                    <td className="px-3 py-2 font-medium text-[#0a3d3e] underline">{s.schedule_name}</td>
                    <td className="px-3 py-2">{scheduleTypeChip(s.schedule_type)}</td>
                    <td className="px-3 py-2">{stateChip(s.state_code)}</td>
                    <td className="px-3 py-2">{fmtDate(s.effective_from)} — {s.effective_to ? fmtDate(s.effective_to) : <span className="text-emerald-700">current</span>}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{tierPreview(s.id)}</td>
                    <td className="px-3 py-2">
                      {s.is_default
                        ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Default</span>
                        : <span className="text-black/30">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="text-[11px] text-black/60 hover:text-black mr-3 inline-flex items-center gap-1"
                        onClick={() => setDrawer({ open: true, id: s.id })}>
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      {!s.is_default && (
                        <button className="text-[11px] text-[#0a3d3e] hover:underline"
                          onClick={() => makeDefault(s.id)}>
                          Make default
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="bg-white border border-black/10 rounded-md p-6 text-center text-xs text-black/40">
            No schedules match the current filters.
          </div>
        )}
      </div>

      {drawer.open && (
        <ScheduleDrawer
          schedule={drawer.id ? schedules.find((s) => s.id === drawer.id) ?? null : null}
          tiers={tiers}
          allSchedules={schedules}
          onClose={() => setDrawer({ open: false, id: null })}
          onSave={(sched, newTiers) => {
            setSchedules((rs) => {
              const exists = rs.some((r) => r.id === sched.id);
              let next = exists ? rs.map((r) => r.id === sched.id ? sched : r) : [...rs, sched];
              if (sched.is_default) {
                next = next.map((r) =>
                  r.carrier_product_id === sched.carrier_product_id && r.id !== sched.id ? { ...r, is_default: false } : r
                );
              }
              return next;
            });
            setTiers((ts) => [
              ...ts.filter((t) => t.schedule_id !== sched.id),
              ...newTiers,
            ]);
            setDrawer({ open: false, id: null });
            toast.success(exists(schedules, sched.id) ? "Schedule updated. Existing approved/paid statements unaffected." : "Schedule created.");
          }}
        />
      )}
    </>
  );
}

function exists(arr: CarrierCommissionSchedule[], id: string) {
  return arr.some((s) => s.id === id);
}

// ===========================================================================
// Drawer D — Schedule + Tiers
// ===========================================================================
function ScheduleDrawer({ schedule, tiers, allSchedules, onClose, onSave }: {
  schedule: CarrierCommissionSchedule | null;
  tiers: typeof COMMISSION_RATE_TIERS;
  allSchedules: CarrierCommissionSchedule[];
  onClose: () => void;
  onSave: (sched: CarrierCommissionSchedule, tiers: typeof COMMISSION_RATE_TIERS) => void;
}) {
  const ltcProducts = ltcCarrierProducts();
  const isNew = !schedule;
  const initialTiers = schedule ? tiersFor(schedule.id) : [{ id: `crt_new_1`, schedule_id: "new", from_year: 1, to_year: null as number | null, rate_pct: 0 }];
  const [draft, setDraft] = useState<SchedDraft>({
    id: schedule?.id ?? `ccs_new_${Date.now()}`,
    carrier_product_id: schedule?.carrier_product_id ?? (ltcProducts[0]?.id ?? ""),
    schedule_name: schedule?.schedule_name ?? "",
    schedule_type: schedule?.schedule_type ?? "heaped",
    state_code: schedule?.state_code ?? "",
    is_default: schedule?.is_default ?? false,
    effective_from: schedule?.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: schedule?.effective_to ?? "",
    notes: "",
    tiers: initialTiers.map((t, i) => ({ key: `${t.id}_${i}`, from_year: t.from_year, to_year: t.to_year === 99 ? null : t.to_year, rate_pct: t.rate_pct })),
  });

  const otherDefault = allSchedules.find((s) => s.carrier_product_id === draft.carrier_product_id && s.is_default && s.id !== draft.id);
  const onlySchedule = allSchedules.filter((s) => s.carrier_product_id === draft.carrier_product_id && s.id !== draft.id).length === 0;

  // Validation
  const sorted = [...draft.tiers].sort((a, b) => a.from_year - b.from_year);
  let overlap = false;
  let gap: number | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (cur.to_year !== null && cur.from_year > cur.to_year) overlap = true;
    if (nxt) {
      const curEnd = cur.to_year ?? Infinity;
      if (nxt.from_year <= curEnd) overlap = true;
      else if (nxt.from_year > curEnd + 1 && gap === null) gap = curEnd + 1;
    }
  }
  const allClosed = sorted.length > 0 && sorted.every((t) => t.to_year !== null);
  const canSave = draft.schedule_name.trim().length > 0 && draft.carrier_product_id && !overlap && draft.tiers.every((t) => t.rate_pct >= 0 && t.from_year >= 1);

  function updateTier(idx: number, patch: Partial<SchedDraft["tiers"][number]>) {
    setDraft((d) => ({ ...d, tiers: d.tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) }));
  }

  function handleSave() {
    const sched: CarrierCommissionSchedule = {
      id: draft.id,
      carrier_product_id: draft.carrier_product_id,
      carrier_product_name: CARRIER_PRODUCTS.find((p) => p.id === draft.carrier_product_id)?.product_name ?? "",
      schedule_name: draft.schedule_name.trim(),
      schedule_type: draft.schedule_type,
      state_code: draft.state_code.trim() || null,
      is_default: onlySchedule ? true : draft.is_default,
      effective_from: draft.effective_from,
      effective_to: draft.effective_to || null,
    };
    const newTiers = draft.tiers.map((t, i) => ({
      id: `${draft.id}_t${i}`,
      schedule_id: draft.id,
      from_year: Number(t.from_year),
      to_year: t.to_year === null ? 99 : Number(t.to_year),
      rate_pct: Number(t.rate_pct),
    }));
    onSave(sched, newTiers);
  }

  return (
    <Drawer open onClose={onClose} title={isNew ? "New Commission Schedule" : `Edit — ${schedule?.schedule_name}`}>
      <SectionHeader>Schedule</SectionHeader>
      <Field label="Carrier Product">
        <select value={draft.carrier_product_id} onChange={(e) => setDraft({ ...draft, carrier_product_id: e.target.value })}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          {ltcProducts.map((p) => <option key={p.id} value={p.id}>{carrierProductLabel(p.id)}</option>)}
        </select>
      </Field>
      <Field label="Schedule Name">
        <input value={draft.schedule_name} onChange={(e) => setDraft({ ...draft, schedule_name: e.target.value })}
          placeholder="e.g., Trustmark UL Heaped 100/5"
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
      </Field>
      <Field label="Schedule Type">
        <select value={draft.schedule_type} onChange={(e) => setDraft({ ...draft, schedule_type: e.target.value as ScheduleType })}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full">
          <option value="heaped">Heaped</option>
          <option value="flat">Flat</option>
          <option value="level">Level</option>
        </select>
      </Field>
      <Field label="State Code">
        <input value={draft.state_code} onChange={(e) => setDraft({ ...draft, state_code: e.target.value.toUpperCase() })}
          placeholder="Blank = all states. 'NY' for NY-specific."
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Effective From">
          <input type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })}
            className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
        </Field>
        <Field label="Effective To">
          <input type="date" value={draft.effective_to} onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })}
            className="px-2 py-1 text-sm border border-black/15 rounded w-full" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className="px-2 py-1 text-sm border border-black/15 rounded w-full" rows={2} />
      </Field>

      <SectionHeader>Default</SectionHeader>
      <label className="inline-flex items-center gap-2 text-xs">
        <input type="checkbox" disabled={onlySchedule} checked={onlySchedule ? true : draft.is_default}
          onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} />
        Make this the default schedule for this carrier product
      </label>
      {onlySchedule && (
        <div className="text-[11px] text-black/50 mt-1">Only schedule for this product — must be default.</div>
      )}
      {draft.is_default && otherDefault && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
          This will demote the current default ({otherDefault.schedule_name}) automatically.
        </div>
      )}

      <SectionHeader>Rate Tiers</SectionHeader>
      <Card className="p-2 mb-2">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["From Year","To Year","Rate %",""].map((c) => (<th key={c} className="text-left font-medium px-2 py-1">{c}</th>))}</tr>
          </thead>
          <tbody>
            {draft.tiers.map((t, i) => (
              <tr key={t.key} className="border-t border-black/5">
                <td className="px-2 py-1"><input type="number" min={1} value={t.from_year} onChange={(e) => updateTier(i, { from_year: Number(e.target.value) })} className="px-1 py-0.5 text-xs border border-black/15 rounded w-16" /></td>
                <td className="px-2 py-1">
                  <input type="number" min={1} value={t.to_year ?? ""} placeholder="∞"
                    onChange={(e) => updateTier(i, { to_year: e.target.value === "" ? null : Number(e.target.value) })}
                    className="px-1 py-0.5 text-xs border border-black/15 rounded w-16" />
                </td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.5} value={t.rate_pct} onChange={(e) => updateTier(i, { rate_pct: Number(e.target.value) })} className="px-1 py-0.5 text-xs border border-black/15 rounded w-20" />%</td>
                <td className="px-2 py-1 text-right">
                  <button className="text-[11px] text-rose-600 hover:underline" onClick={() => setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-3 w-3 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-2 py-1">
          <button className="text-[11px] text-[#0a3d3e] hover:underline inline-flex items-center gap-1"
            onClick={() => setDraft((d) => ({ ...d, tiers: [...d.tiers, { key: `new_${Date.now()}`, from_year: (d.tiers.at(-1)?.to_year ?? 0) + 1, to_year: null, rate_pct: 0 }] }))}>
            <Plus className="h-3 w-3" /> Add Tier
          </button>
        </div>
      </Card>
      {overlap && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-2">
          Overlapping or invalid year ranges. Fix before saving.
        </div>
      )}
      {gap !== null && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
          Gap in coverage: Year {gap} has no defined rate. Statements for that policy year will fail to derive a rate.
        </div>
      )}
      {allClosed && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
          All tiers have a closed end year. Add a perpetual tier (blank To Year) or commissions stop after the last band.
        </div>
      )}

      {!isNew && (
        <div className="text-[11px] text-black/60 bg-stone-50 border border-black/10 rounded p-2 mb-2">
          Changes do NOT propagate to existing approved or paid statements. Draft statements re-derive on regeneration. Past commission_pct snapshots are preserved.
        </div>
      )}

      <SectionHeader>Usage</SectionHeader>
      <div className="text-[11px] text-black/60">
        {POLICIES.filter((p) => p.commission_schedule_id === draft.id).length} polic
        {POLICIES.filter((p) => p.commission_schedule_id === draft.id).length === 1 ? "y" : "ies"} reference this schedule.
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={!canSave}>Save</Btn>
      </div>
    </Drawer>
  );
}
