import * as React from "react";
import { useState, useEffect, useReducer } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  PageHeader, Card, Field, Btn, Pill, TableShell, THead, TRow, TCell, ProductBadge,
  Drawer, useDrawer, Input,
} from "@/components/wireframe/Bits";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ORGS, BENEFIT_CLASSES, INDIVIDUALS, CARRIERS, CARRIER_PRODUCTS,
  COMMISSION_SPLIT_DEFAULTS, formatCents,
  DI_RATE_CONFIG, LTC_RATE_CELLS, type DIRateRow, type LTCRateCell,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { ChevronLeft, ChevronDown, ChevronRight, Pencil, ExternalLink, Mail, Phone, Star, Plus, Trash2, Check, X as XIcon, SkipForward, Circle } from "lucide-react";

export const Route = createFileRoute("/organizations/$id")({ component: OrgDetail });

// Enum vocabularies (mirror prod CHECK constraints)
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const INDUSTRIES = ["education","healthcare","government","manufacturing","professional_services","transportation","hospitality","other"];
const ORG_TYPES = ["Employer Group","Association","Union","PEO","CPA Firm","P&C Firm"];
const ORG_STATUSES = ["not_started","onboarding","active","closed","suspended"];
const DI_HC_TYPES = ["MSO","Healthcare Practice","Medical Group","Dental","Other","General"];
const WINDOW_TYPES = ["initial","annual","new_joiner","special"];
const SPONSOR_TYPES = ["employer","affiliate"];
const WINDOW_STATUSES = ["upcoming","open","closed"];
const CARRIER_NAMES = [...new Set([...CARRIERS.map(c => c.carrier_name), "Sun Life", "Trustmark", "Transamerica", "MGIS"])];
const BROKER_TYPES = ["Broker","IMO","Internal"] as const;
type BrokerType = typeof BROKER_TYPES[number];
type BrokerRecord = {
  id: string;
  broker_name: string;
  broker_type: BrokerType;
  default_commission_pct: number;
  contact_email: string | null;
};
// Shared (admin-panel-wide) channel_partners store. In-memory only; survives
// route navigation within a session because it lives at module scope.
const _BROKER_STORE: BrokerRecord[] = [
  { id: "cpn_1", broker_name: "Westfield Brokers", broker_type: "Broker",   default_commission_pct: 60, contact_email: "ops@westfield.example" },
  { id: "cpn_2", broker_name: "Hollowtree House",  broker_type: "Internal", default_commission_pct: 20, contact_email: null },
  { id: "cpn_3", broker_name: "Override Group LLC",broker_type: "IMO",      default_commission_pct: 5,  contact_email: null },
  { id: "cpn_4", broker_name: "Jamie Rep",         broker_type: "Internal", default_commission_pct: 15, contact_email: null },
];
const _BROKER_LISTENERS = new Set<() => void>();
function addBrokerToStore(b: Omit<BrokerRecord, "id">): BrokerRecord {
  const rec: BrokerRecord = { ...b, id: `cpn_${Date.now()}_${Math.floor(Math.random()*1000)}` };
  _BROKER_STORE.push(rec);
  _BROKER_LISTENERS.forEach((l) => l());
  return rec;
}
function useBrokers(): BrokerRecord[] {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    _BROKER_LISTENERS.add(force);
    return () => { _BROKER_LISTENERS.delete(force); };
  }, []);
  return _BROKER_STORE;
}
const INBOUND_TYPES = ["Broker Referral","Direct","Partner Referral","Inbound"];
const PRODUCT_TEMPLATE_VARIANTS = ["base","eob_only","restoration_only","eob_and_restoration"];
const CONTRIBUTION_TYPES = ["voluntary","buy_up","employer_paid"];
const PREMIUM_STRUCTURES = ["lifetime","10_pay"] as const;
type PremiumStructure = typeof PREMIUM_STRUCTURES[number];
function premiumStructureLabel(s: PremiumStructure): string {
  return s === "lifetime" ? "Lifetime" : "10-Pay";
}

function defaultMicrositeSuffix(product: "DI" | "LTC"): string {
  return product === "DI" ? ".hollowtree.co" : ".hollowtreeltc.com";
}
function parseMicrositeSubdomain(url: string, suffix: string): { matches: boolean; subdomain: string } {
  try {
    const host = new URL(url).hostname;
    const bare = suffix.startsWith(".") ? suffix.slice(1) : suffix;
    if (host === bare) return { matches: true, subdomain: "" };
    if (host.endsWith("." + bare)) {
      return { matches: true, subdomain: host.slice(0, host.length - bare.length - 1) };
    }
  } catch { /* ignore */ }
  return { matches: false, subdomain: "" };
}
function carrierForProduct(product: "DI" | "LTC"): string {
  return product === "DI" ? "Sun Life" : "Trustmark";
}
function carrierProductLabel(product: "DI" | "LTC", typeOfRate: string | null | undefined): string {
  if (product === "LTC") return "Universal Life with LTC Rider";
  return typeOfRate === "STD+LTD" ? "Group Disability (STD + LTD)" : "Group Disability (LTD)";
}
// Map carrier_product_id → "{carrier} - {product}" label using dummy carrier/product tables.
function carrierProductOptions(product: "DI" | "LTC"): Array<{ id: string; carrier: string; product: string; label: string }> {
  return CARRIER_PRODUCTS
    .map((cp) => {
      const carrier = CARRIERS.find((c) => c.id === cp.carrier_id);
      if (!carrier || carrier.product !== product) return null;
      return { id: cp.id, carrier: carrier.carrier_name, product: cp.product_name, label: `${carrier.carrier_name} - ${cp.product_name}` };
    })
    .filter((x): x is { id: string; carrier: string; product: string; label: string } => x !== null);
}
function pickCarrierProductId(product: "DI" | "LTC", idx: number): string | null {
  const opts = carrierProductOptions(product);
  if (opts.length === 0) return null;
  return opts[idx % opts.length].id;
}

const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
];
function languageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}

// Dummy enrollment windows scoped per org for this iteration
const DUMMY_WINDOWS = [
  { id: "ew_a", org_id: "org_1", window_type: "initial", sponsor_type: "employer", affiliate: null, start: "2025-01-01", end: "2025-01-31", effective: "2025-02-01", status: "closed", gi_eligible: true, carrier: "Northstar Mutual", notes: "Launch window" },
  { id: "ew_b", org_id: "org_1", window_type: "annual", sponsor_type: "employer", affiliate: null, start: "2025-09-01", end: "2025-09-30", effective: "2025-10-01", status: "upcoming", gi_eligible: false, carrier: "Northstar Mutual", notes: "" },
  { id: "ew_c", org_id: "org_1", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: true, carrier: "Northstar Mutual", notes: "Always-on" },
  { id: "ew_d", org_id: "org_2", window_type: "initial", sponsor_type: "employer", affiliate: null, start: "2025-02-01", end: "2025-02-28", effective: "2025-03-01", status: "closed", gi_eligible: true, carrier: "Pacific Reserve Life", notes: "" },
  { id: "ew_e", org_id: "org_2", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: true, carrier: "Pacific Reserve Life", notes: "" },
  { id: "ew_f", org_id: "org_3", window_type: "annual", sponsor_type: "employer", affiliate: "CCA", start: "2025-08-01", end: "2025-08-31", effective: "2025-09-01", status: "open", gi_eligible: true, carrier: "Heritage LTC Group", notes: "Co-sponsored" },
  { id: "ew_g", org_id: "org_3", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: false, carrier: "Heritage LTC Group", notes: "" },
  { id: "ew_h", org_id: "org_5", window_type: "annual", sponsor_type: "employer", affiliate: null, start: "2025-07-01", end: "2025-07-31", effective: "2025-08-01", status: "closed", gi_eligible: true, carrier: "Heritage LTC Group", notes: "" },
  { id: "ew_i", org_id: "org_6", window_type: "special", sponsor_type: "affiliate", affiliate: "Foxtail Alumni Assoc", start: "2025-07-15", end: "2025-08-15", effective: "2025-09-01", status: "open", gi_eligible: false, carrier: "Sequoia Care Partners", notes: "Affiliate-sponsored" },
];

const DI_PLAN_DETAILS = {
  ltd: {
    benefit_pct_text: "60% of base salary",
    monthly_cap_text: "Capped at $10,000/month",
    elimination_period_text: "90 days",
    benefit_duration_text: "To age 65",
    own_occupation_period_text: "24 months, then any occupation",
    definition_of_disability: "Own occupation for first 24 months, then any occupation",
    pre_existing_conditions: "12/12 look-back; excluded if treated in prior 12 months",
    exclusions: "Standard carrier exclusions apply",
  },
  std: {
    benefit_pct_text: "66.7% of base salary",
    weekly_cap_text: "Capped at $2,500/week",
    elimination_period_text: "7 days accident / 14 days illness",
    benefit_duration_text: "13 weeks",
    pre_existing_conditions: "Not applicable",
  },
};

const LTD_LABELS: Record<string, string> = {
  benefit_pct_text: "Benefit",
  monthly_cap_text: "Monthly Cap",
  elimination_period_text: "Elimination Period",
  benefit_duration_text: "Benefit Duration",
  own_occupation_period_text: "Own-Occupation Period",
  definition_of_disability: "Definition of Disability",
  pre_existing_conditions: "Pre-existing Conditions",
  exclusions: "Exclusions",
};
const STD_LABELS: Record<string, string> = {
  benefit_pct_text: "Benefit",
  weekly_cap_text: "Weekly Cap",
  elimination_period_text: "Elimination Period",
  benefit_duration_text: "Benefit Duration",
  pre_existing_conditions: "Pre-existing Conditions",
};

function titleCase(s: string | null | undefined): string {
  if (!s) return "—";
  return s.split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
function productMixLabel(v: string | null | undefined): string {
  if (v === "LTD") return "LTD only";
  if (v === "STD+LTD") return "STD + LTD";
  return "—";
}
function policyOwnerLabel(v: string | null | undefined): string {
  if (v === "employer_group") return "Employer Group";
  if (v === "cca") return "CCA";
  return v ?? "—";
}
function productTemplateVariantLabel(v: string | null | undefined): string {
  switch (v) {
    case "eob_and_restoration": return "EOB + Restoration";
    case "eob_only": return "EOB Only";
    case "restoration_only": return "Restoration Only";
    case "base": return "Base";
    default: return v ?? "—";
  }
}

const LTC_TIER_DETAILS = {
  bronze:   { benefit_trigger: "2 of 6 ADLs or cognitive impairment", portability: "Available at group rates", inflation_protection: "None" },
  silver:   { benefit_trigger: "2 of 6 ADLs or cognitive impairment", portability: "Available at group rates", inflation_protection: "3% simple" },
  gold:     { benefit_trigger: "2 of 6 ADLs or cognitive impairment", portability: "Available at group rates", inflation_protection: "3% compound" },
  platinum: { benefit_trigger: "2 of 6 ADLs or cognitive impairment", portability: "Available at group rates", inflation_protection: "5% compound" },
  diamond:  { benefit_trigger: "2 of 6 ADLs or cognitive impairment", portability: "Available at group rates", inflation_protection: "5% compound + benefit restoration" },
};
const LTC_TIERS = ["bronze","silver","gold","platinum","diamond"] as const;

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return "—";
  return `${MONTH_ABBR[m - 1]} ${day}, ${y}`;
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const target = new Date(d + "T00:00:00").getTime();
  const now = new Date("2026-06-14T00:00:00").getTime();
  return Math.round((target - now) / 86400000);
}

/* ---------- Synthesize per-org detail ---------- */
type FeeSchedule = {
  id: string;
  effective_from: string;
  effective_to: string | null;
  tpa_fee_cents: number;
  tpa_fee_name: string | null;
  service_fee_retained_cents: number | null;
  notes: string;
};
type OrgDetail = ReturnType<typeof synthesize>;
function synthesize(org: typeof ORGS[number]) {
  const slug = org.name.toLowerCase().replace(/[^a-z]/g, "");
  const idx = parseInt(org.id.replace("org_", ""), 10) || 1;
  const cca = org.cca_group;
  const product = org.product as "DI" | "LTC";
  const suffix = defaultMicrositeSuffix(product);
  // Sprinkle one non-standard microsite to exercise fallback path
  const micrositeUrl = idx === 4 ? `https://enroll.example.com/${org.id}` : `https://${slug}${suffix}`;
  return {
    ...org,
    domain: `${slug}.example.com`,
    industry: ["professional_services","healthcare","manufacturing","transportation","education","hospitality"][idx % 6],
    org_type: cca ? "CPA Firm" : (idx % 3 === 0 ? "Association" : "Employer Group"),
    situs_city: ["Austin","Portland","Boston","Miami","Seattle","Chicago","Denver","Atlanta"][idx % 8],
    eligible_lives: org.individuals_count * 3,
    // DI
    gi_offer_cents: 15000000,
    microsite_url: micrositeUrl,
    di_healthcare_type: "Healthcare Practice",
    inbound_type: "Broker Referral",
    ltd_benefit_pct: 60,
    std_benefit_pct: 66.7,
    next_sun_life_report_date: "2026-07-15",
    contact_email: idx % 4 === 0 ? null : `hr@${slug}.example.com`,
    // Carrier & Product (dummy) — carrier_product_id is the FK; name fields derive from it
    carrier_product_id: idx === 4 ? null : pickCarrierProductId(product, idx),
    carrier_name: carrierForProduct(product),
    carrier_product_name: carrierProductLabel(product, org.type_of_rate),
    group_policy_number: product === "DI"
      ? (idx % 5 === 0 ? null : `SL-2024-${String(100 + idx * 17).padStart(5, "0")}`)
      : null,
    group_policy_effective_date: product === "DI"
      ? (idx % 5 === 0 ? null : `2024-${String(((idx * 2) % 12) + 1).padStart(2, "0")}-01`)
      : null,
    policy_effective_date: "2025-01-01",
    // Klaviyo
    klaviyo_list_id: ["TfRk9b","X4mP2q","Lz8Yhn","aQ3Wpv","R7nB2k","dE9Lto","Vc5Mxs","Jh1Knu"][idx % 8],
    // Localization (v13)
    default_language: "en",
    supported_languages: idx % 4 === 0 ? ["en", "es"] : (idx === 3 ? ["en", "es", "zh"] : ["en"]),
    // Coverage / Billing
    contribution_type: cca ? "voluntary" : "employer_paid",
    available_premium_structures: (product === "LTC" ? (idx % 3 === 0 ? ["lifetime","10_pay"] : ["lifetime"]) : ["lifetime"]) as PremiumStructure[],
    tpa_fee_cents: cca ? 2000 : 800,
    service_fee_retained_cents: cca ? 500 : null,
    tpa_fee_name: cca ? "CCA Membership Fee" : "Processing Fee",
    // Versioned TPA fee schedules (DI v12 / LTC v3.12)
    fee_schedules: (cca
      ? [
          { id: `fs_${org.id}_1`, effective_from: "2024-01-01", effective_to: "2024-12-31", tpa_fee_cents: 1500, tpa_fee_name: "CCA Membership Fee", service_fee_retained_cents: 400, notes: "Initial pricing per launch agreement" },
          { id: `fs_${org.id}_2`, effective_from: "2025-01-01", effective_to: "2025-12-31", tpa_fee_cents: 1800, tpa_fee_name: "CCA Membership Fee", service_fee_retained_cents: 500, notes: "Year-2 increase per CCA agreement section 4.2" },
          { id: `fs_${org.id}_3`, effective_from: "2026-01-01", effective_to: null as string | null, tpa_fee_cents: 2000, tpa_fee_name: "CCA Membership Fee", service_fee_retained_cents: 500, notes: "Year-3 increase per CCA agreement section 4.2" },
        ]
      : [
          { id: `fs_${org.id}_1`, effective_from: "2025-01-01", effective_to: null as string | null, tpa_fee_cents: 800, tpa_fee_name: "Processing Fee", service_fee_retained_cents: null as number | null, notes: "Standard platform pricing" },
        ]) as FeeSchedule[],
    // Payment processing & retry config (platform defaults; a couple of orgs override)
    card_percentage_bps: idx === 2 ? 400 : 370,
    ach_first_fee_cents: 100,
    ach_subsequent_fee_cents: 50,
    failed_ach_penalty_cents: 1500,
    failed_card_penalty_mode: "flat" as "flat" | "percentage",
    failed_card_penalty_value_cents: 1000 as number | null,
    failed_card_penalty_pct_bps: null as number | null,
    free_retry_count: idx === 2 ? 1 : 2,
    // Broker
    primary_broker: "Westfield Brokers",
    primary_override_pct: null as number | null,
    secondary_broker: null as string | null,
    secondary_override_pct: null as number | null,
    // Contacts (organization_contacts table — replaces legacy scalar signatory_* fields)
    contacts: buildDummyContacts(org.id, slug, idx),
    // Links
    google_drive_folder: `https://drive.google.com/drive/folders/${org.id}_dummy`,
    meeting_link: "https://meet.google.com/abc-defg-hij",
    assigned_gmail_person: "ops@hollowtree.example.com",
    gmail_label_id: `Label_${1000 + idx}`,
    attio_deal_id: `deal_${org.id}_abc123`,
    attio_company_id: `cmp_${org.id}_xyz789`,
    // Plan details
    plan_details: org.product === "LTC" ? LTC_TIER_DETAILS as unknown as Record<string, unknown> : DI_PLAN_DETAILS as unknown as Record<string, unknown>,
    // Employer billing (some orgs have it)
    employer_moov_account_id: idx % 3 === 0 ? `moov_emp_${1000 + idx}` : null,
    employer_payment_method_id: idx % 3 === 0 ? `pm_${2000 + idx}` : null,
    employer_payment_method_type: idx % 3 === 0 ? "ach" : null,
    // System refs
    created_at: "2024-09-15T10:22:00Z",
    updated_at: "2025-06-01T14:11:00Z",
    rate_sheet_id: `rs_legacy_${idx}`,
    // LTC-only
    company_years_in_existence: 28,
    naic_code: "61271",
    org_website: `https://www.${slug}.example.com`,
    product_template_variant: "eob_and_restoration",
    healthcare_company: idx % 2 === 0 ? "yes" : "no",
    benefit_duration: 6,
    duration: "6 years",
    min_age: 18,
    max_age: 75,
    // LTC carrier/operational
    case_id: `CASE-${10000 + idx}`,
    enrollment_id_carrier: `ENR-${50000 + idx}`,
    form_number: "LTC-2024-A",
    agent_number: `AGT-${1000 + idx}`,
    benefit_system: "Heritage Online",
    rider_codes: ["EOB-100","BR-50","WAIVER"],
    application_questions: [
      "Have you used tobacco in the past 12 months?",
      "Have you been hospitalized in the past 5 years?",
      "Are you currently receiving disability benefits?",
    ],
    // LTC system
    ltc_enrollment_phase: "open_enrollment",
    ltc_one_week_to_go: "2025-08-24",
  };
}

function brokerDefaultPct(name: string | null): number | null {
  if (!name) return null;
  const d = COMMISSION_SPLIT_DEFAULTS.find((c) => c.channel_partner_name === name);
  return d ? d.default_split_pct : null;
}

function OrgDetail() {
  const { id } = Route.useParams();
  const { product, role } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const editDrawer = useDrawer<typeof ORGS[number]>();
  const windowDrawer = useDrawer<typeof DUMMY_WINDOWS[number]>();
  const bcDrawer = useDrawer<typeof BENEFIT_CLASSES[number]>();
  const orgBase = ORGS.find((o) => o.id === id);
  if (!orgBase) return <div className="p-4">Org not found.</div>;
  const org = synthesize(orgBase);

  const readOnly = !can("organizations", "update");
  const windows = DUMMY_WINDOWS.filter((w) => w.org_id === id);

  // Per-org benefit classes; synthesize a default for orgs with none
  let classes = BENEFIT_CLASSES.filter((b) => b.org_id === id);
  if (product === "LTC" && classes.length === 0) {
    classes = [{ id: `bc_synth_${id}`, org_id: id, name: "All Employees", gi_offer_cents: 15000000, bronze: 0, silver: 7500000, gold: 15000000, platinum: 20000000, diamond: 25000000, is_default: true }];
  }

  // Summary metrics
  const orgIndividuals = INDIVIDUALS.filter((i) => i.org_id === id);
  const activeEnrollees = orgIndividuals.filter((i) => i.coverage_status === "active").length;
  const enrolledLives = orgIndividuals.filter((i) =>
    i.coverage_status === "active" || i.coverage_status === "purchased" || i.coverage_status === "suspended"
  ).length;
  const totalMonthlyPremiumCents = orgIndividuals
    .filter((i) => i.coverage_status === "active")
    .reduce((s, i) => s + i.monthly_premium_cents, 0);
  // Plausible placeholder: ~12% carrier commission with ~50% house split
  const netHtCommissionCents = Math.round(totalMonthlyPremiumCents * 0.12 * 0.5);
  // Next enrollment window
  const openWindowsList = windows.filter((w) => w.status === "open");
  const upcomingList = windows.filter((w) => w.status === "upcoming");
  const nextOpenEnd = openWindowsList
    .map((w) => w.end)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;
  const nextUpcomingStart = upcomingList
    .map((w) => w.start)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;
  const daysToClose = daysUntil(nextOpenEnd);
  const showCcaBadge = product === "DI" && org.cca_group;

  return (
    <div>
      <Link to="/organizations" className="inline-flex items-center text-xs text-black/60 hover:text-black mb-2">
        <ChevronLeft className="h-3 w-3" /> Organizations
      </Link>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {org.name}
            <ProductBadge product={org.product} />
            {showCcaBadge && (
              <span
                className="border border-emerald-500 text-emerald-700 bg-emerald-50 rounded px-2 py-0.5 text-xs font-medium"
                title="CCA-affiliated organization. Uses CCA portal link and CCA-specific policy emails."
              >
                CCA
              </span>
            )}
          </span>
        }
        subtitle={<>Organizations &rsaquo; {org.name} · <span className="text-black/40">{org.id}</span></>}
        actions={
          <>
            <Btn onClick={() => editDrawer.open(orgBase, "edit")} disabled={readOnly}>Edit</Btn>
            <Btn disabled={!can("organizations", "delete")}>Deactivate</Btn>
          </>
        }
      />

      {/* Summary header */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <SummaryChip
          label="Current Monthly Premium"
          value={formatCents(totalMonthlyPremiumCents)}
          sub={<span className="text-black/50">across {activeEnrollees} active enrollees</span>}
        />
        <SummaryChip
          label="Net HT Commission"
          value={formatCents(netHtCommissionCents)}
          sub={<span className="text-black/40 italic">(formula pending)</span>}
        />
        <SummaryChip
          label="Enrolled Lives"
          value={enrolledLives}
          sub={<span className="text-black/50">of {org.eligible_lives} eligible</span>}
          onClick={() => navigate({ to: "/individuals", search: { org: id } })}
          hint={`filter: org=${id}`}
        />
        {nextOpenEnd ? (
          <SummaryChip
            label="Next Enrollment Window"
            value={fmtDate(nextOpenEnd)}
            tone={daysToClose !== null && daysToClose <= 14 ? "warn" : undefined}
            sub={<span className={daysToClose !== null && daysToClose <= 14 ? "text-amber-700" : "text-black/50"}>Currently open</span>}
          />
        ) : nextUpcomingStart ? (
          <SummaryChip
            label="Next Enrollment Window"
            value={fmtDate(nextUpcomingStart)}
            sub={<span className="text-black/50">Opens</span>}
          />
        ) : (
          <SummaryChip
            label="Next Enrollment Window"
            value="—"
            sub={<span className="text-black/40 italic">None scheduled</span>}
          />
        )}
        <QuickLinksCard org={org} />
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="lifecycle">Enrollment Lifecycle</TabsTrigger>
          {product === "LTC" ? <TabsTrigger value="bc">Benefit Classes</TabsTrigger> : null}
          {product === "DI" ? <TabsTrigger value="rates">Rates</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="setup">
          <SetupTab org={org} product={product} readOnly={readOnly} isAdmin={role === "admin"} />
        </TabsContent>
        <TabsContent value="lifecycle">
          <LifecycleTab
            windows={windows}
            orgName={org.name}
            orgId={org.id}
            orgStatus={org.status}
            product={product}
            isAdmin={role === "admin"}
            onNew={() => windowDrawer.open(undefined, "create")}
            onEdit={(w) => windowDrawer.open(w, "edit")}
            canEdit={can("enrollment_windows", "update")}
            canCreate={can("enrollment_windows", "create")}
            readOnly={readOnly}
          />
        </TabsContent>
        {product === "LTC" ? (
          <TabsContent value="bc">
            <BenefitClassesTab
              classes={classes}
              onNew={() => bcDrawer.open(undefined, "create")}
              onEdit={(c) => bcDrawer.open(c, "edit")}
              canEdit={can("benefit_classes", "update")}
              canCreate={can("benefit_classes", "create")}
            />
          </TabsContent>
        ) : null}
        {product === "DI" ? (
          <TabsContent value="rates">
            <DIRatesTab orgId={id} canEdit={can("rate_config", "update")} canCreate={can("rate_config", "create")} />
          </TabsContent>
        ) : null}
      </Tabs>

      {/* Edit drawer (top-of-page shortcut) */}
      <Drawer open={editDrawer.state.open} onClose={editDrawer.close} title={`Edit · ${org.name}`}>
        <Field label="Name"><Input defaultValue={org.name} /></Field>
        <Field label="Product"><DSelect defaultValue={org.product} options={["DI","LTC"]} /></Field>
        <Field label="Situs State"><DSelect defaultValue={org.situs_state} options={US_STATES} /></Field>
        <Field label="Policy Owner Type"><DSelect defaultValue={org.policy_owner_type === "employer" ? "employer_group" : "cca"} options={["employer_group","cca"]} /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={readOnly}>Save</Btn>
          <Btn onClick={editDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>

      <Drawer open={windowDrawer.state.open} onClose={windowDrawer.close} title={windowDrawer.state.mode === "create" ? "New Enrollment Window" : "Edit Window"}>
        <Field label="Window Type"><DSelect defaultValue={windowDrawer.state.data?.window_type ?? "initial"} options={WINDOW_TYPES} /></Field>
        <Field label="Sponsor Type"><DSelect defaultValue={windowDrawer.state.data?.sponsor_type ?? "employer"} options={SPONSOR_TYPES} /></Field>
        <Field label="Affiliate Org (if any)"><Input defaultValue={windowDrawer.state.data?.affiliate ?? ""} placeholder="e.g. CCA Member Foundation" /></Field>
        <Field label="Start Date"><Input defaultValue={windowDrawer.state.data?.start ?? ""} placeholder="YYYY-MM-DD (blank for new_joiner)" /></Field>
        <Field label="End Date"><Input defaultValue={windowDrawer.state.data?.end ?? ""} placeholder="YYYY-MM-DD (blank for new_joiner)" /></Field>
        <Field label="Default Effective Date"><Input defaultValue={windowDrawer.state.data?.effective ?? ""} /></Field>
        <Field label="Carrier"><DSelect defaultValue={windowDrawer.state.data?.carrier ?? CARRIER_NAMES[0]} options={CARRIER_NAMES} /></Field>
        <Field label="Status"><DSelect defaultValue={windowDrawer.state.data?.status ?? "upcoming"} options={WINDOW_STATUSES} /></Field>
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">GI Eligible</div>
          <div className="flex items-center gap-2">
            <Switch defaultChecked={windowDrawer.state.data?.gi_eligible ?? true} />
            <span className="text-xs text-black/60">Guaranteed-issue pricing (no medical underwriting)</span>
          </div>
        </div>
        <Field label="Notes"><Input defaultValue={windowDrawer.state.data?.notes ?? ""} /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("enrollment_windows", "update")}>Save</Btn>
          <Btn onClick={windowDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>

      <Drawer open={bcDrawer.state.open} onClose={bcDrawer.close} title={bcDrawer.state.mode === "create" ? "New Benefit Class" : "Edit Benefit Class"}>
        <Field label="Name"><Input defaultValue={bcDrawer.state.data?.name ?? ""} /></Field>
        <Field label="GI Offer (cents)"><Input defaultValue={String(bcDrawer.state.data?.gi_offer_cents ?? "")} /></Field>
        <Field label="Bronze (cents)"><Input defaultValue={String(bcDrawer.state.data?.bronze ?? "")} /></Field>
        <Field label="Silver (cents)"><Input defaultValue={String(bcDrawer.state.data?.silver ?? "")} /></Field>
        <Field label="Gold (cents) — must equal GI Offer"><Input defaultValue={String(bcDrawer.state.data?.gold ?? "")} /></Field>
        <Field label="Platinum (cents)"><Input defaultValue={String(bcDrawer.state.data?.platinum ?? "")} /></Field>
        <Field label="Diamond (cents)"><Input defaultValue={String(bcDrawer.state.data?.diamond ?? "")} /></Field>
        <div className="flex items-center gap-2 mb-3">
          <Switch defaultChecked={bcDrawer.state.data?.is_default} /> <span className="text-xs text-black/70">Default for org</span>
        </div>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("benefit_classes", "update")}>Save</Btn>
          <Btn onClick={bcDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}

/* ---------- Summary chip ---------- */

function SummaryChip({ label, value, onClick, tone, hint, sub }: { label: string; value: React.ReactNode; onClick?: () => void; tone?: "ok" | "warn" | "bad"; hint?: string; sub?: React.ReactNode }) {
  const valueColor = tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-black/85";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={hint}
      className={`text-left bg-white border border-black/10 rounded-md p-2 ${onClick ? "hover:bg-[#f7f3eb] cursor-pointer" : "cursor-default"}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-black/50">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5">{sub}</div>}
    </button>
  );
}

function QuickLinksCard({ org }: { org: OrgDetail }) {
  const driveUrl = org.google_drive_folder;
  const attioUrl = org.attio_deal_id ? `https://app.attio.com/deals/${org.attio_deal_id}` : null;
  const klaviyoUrl = org.klaviyo_list_id ? `https://www.klaviyo.com/list/${org.klaviyo_list_id}/members` : null;

  function LinkRow({
    label,
    href,
  }: {
    label: string;
    href: string | null;
  }) {
    if (!href) {
      return (
        <span
          className="flex items-center justify-between text-xs text-black/30 cursor-not-allowed"
          title="Not configured"
        >
          {label} <span className="text-black/20">↗</span>
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between text-xs text-black/70 hover:text-black hover:underline transition-colors"
      >
        {label} <span>↗</span>
      </a>
    );
  }

  return (
    <div className="bg-white border border-black/10 rounded-md p-2 flex flex-col justify-between">
      <div className="text-[9px] uppercase tracking-wider text-black/50">Quick Links</div>
      <div className="flex flex-col gap-1.5 mt-1.5">
        <LinkRow label="Drive folder" href={driveUrl} />
        <LinkRow label="Attio deal" href={attioUrl} />
        <LinkRow label="Klaviyo list" href={klaviyoUrl} />
      </div>
      {org.attio_deal_id ? (
        <div className="text-[10px] text-black/40 font-mono mt-1 truncate" title={org.attio_deal_id}>
          {org.attio_deal_id}
        </div>
      ) : null}
    </div>
  );
}



/* ---------- Drawer Select ---------- */

function DSelect({ defaultValue, options }: { defaultValue?: string; options: string[] }) {
  return (
    <select defaultValue={defaultValue} className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* =============================================================
   CONFIG TAB — section-card layout
============================================================= */

function SetupTab({ org, product, readOnly, isAdmin }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean; isAdmin: boolean }) {
  const statusValue = org.status;
  const identitySummary = product === "LTC"
    ? `${org.domain} · ${org.situs_city}, ${org.situs_state} · ${org.eligible_lives} eligible · NAIC ${org.naic_code}`
    : `${org.domain} · ${org.situs_city}, ${org.situs_state} · ${org.eligible_lives} eligible`;

  return (
    <div className="mt-3">
      <BucketHeader
        label="Organization Information"
        subtitle="Set during onboarding. Edit if needed, but changes here don't recalculate active enrollments."
      />
      <div className="space-y-3">
        <IdentitySection org={org} product={product} statusValue={statusValue} isAdmin={isAdmin} readOnly={readOnly} summary={identitySummary} variant="info" />
        <CarrierProductSection org={org} product={product} readOnly={readOnly} variant="info" />
        {product === "LTC" && <CarrierIdentifiersSection org={org} readOnly={readOnly} variant="info" />}
        <ContactsSection org={org} readOnly={readOnly} variant="info" />
      </div>

      <BucketHeader
        label="Configuration"
        subtitle="Active operational settings. Changes here flow to downstream systems."
      />
      <div className="space-y-4">
        {product === "DI"
          ? <DIProductPlanSection org={org} readOnly={readOnly} />
          : <LTCProductPlanSection org={org} readOnly={readOnly} />}
        <PricingFeesSection org={org} readOnly={readOnly} />
        <PaymentProcessingSection org={org} readOnly={readOnly} />
        <LocalizationSection org={org} readOnly={readOnly} />
        <BrokerSection org={org} product={product} readOnly={readOnly} />
        {product === "DI" && <GroupPolicySection org={org} readOnly={readOnly} />}
        {org.employer_moov_account_id && <EmployerBillingSection org={org} readOnly={readOnly} />}
      </div>

      <BucketHeader
        label="Integration & System"
        subtitle="External system links and audit metadata."
      />
      <div className="space-y-3">
        <LinksRefsSection org={org} product={product} readOnly={readOnly} variant="integration" />
        <SystemRefsSection org={org} product={product} variant="integration" />
      </div>
    </div>
  );
}

function LifecycleTab({
  windows, orgName, orgId, orgStatus, product, isAdmin, onNew, onEdit, canEdit, canCreate, readOnly,
}: {
  windows: typeof DUMMY_WINDOWS;
  orgName: string;
  orgId: string;
  orgStatus: string;
  product: "DI" | "LTC";
  isAdmin: boolean;
  onNew: () => void;
  onEdit: (w: typeof DUMMY_WINDOWS[number]) => void;
  canEdit: boolean;
  canCreate: boolean;
  readOnly: boolean;
}) {
  const [period, setPeriod] = useState(30);
  const [waiting, setWaiting] = useState(90);
  const [rule, setRule] = useState("first_of_next_month");
  return (
    <div className="mt-3 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Enrollment Windows</h2>
          <Btn variant="primary" disabled={!canCreate} onClick={onNew}>+ New Window</Btn>
        </div>
        <TableShell>
          <THead cols={["Type", "Sponsor", "Start", "End", "Default Effective", "Status", "GI", "Carrier", "Notes"]} />
          <tbody>
            {windows.map((w) => {
              const isAlwaysOpen = w.window_type === "new_joiner";
              const sponsor = w.sponsor_type === "affiliate"
                ? <span><span className="text-black/40">—</span> <span className="text-[11px] text-black/50">(affiliate-sponsored: {w.affiliate})</span></span>
                : w.affiliate
                  ? <span>{orgName} <span className="text-black/40">+</span> {w.affiliate}</span>
                  : <span>{orgName}</span>;
              return (
                <TRow key={w.id} onClick={canEdit ? () => onEdit(w) : undefined}>
                  <TCell className="capitalize font-medium">{w.window_type.replace("_", " ")}</TCell>
                  <TCell>{sponsor}</TCell>
                  <TCell>{isAlwaysOpen ? <span className="text-black/40 italic">Always Open</span> : w.start}</TCell>
                  <TCell>{isAlwaysOpen ? <span className="text-black/40 italic">Always Open</span> : w.end}</TCell>
                  <TCell>{w.effective}</TCell>
                  <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
                  <TCell>{w.gi_eligible ? <Pill tone="ok">GI</Pill> : <span className="text-black/30">—</span>}</TCell>
                  <TCell>{w.carrier}</TCell>
                  <TCell className="text-black/60">{w.notes}</TCell>
                </TRow>
              );
            })}
            {windows.length === 0 ? <TRow><TCell className="text-black/40">No enrollment windows.</TCell></TRow> : null}
          </tbody>
        </TableShell>
      </div>

      <OnboardingChecklist orgId={orgId} orgStatus={orgStatus} product={product} isAdmin={isAdmin} />



      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">New Joiner Defaults</h2>
        <Card className="p-4 max-w-2xl">
          <div className="grid grid-cols-[220px_1fr] gap-3 items-center">
            <div className="text-xs uppercase tracking-wider text-black/60">Enrollment Period (days)</div>
            <input type="number" defaultValue={period} disabled={readOnly} onChange={(e) => setPeriod(Number(e.target.value))} className="w-32 px-2 py-1 text-sm border border-black/15 rounded" />
            <div className="text-xs uppercase tracking-wider text-black/60">Waiting Period (days)</div>
            <input type="number" defaultValue={waiting} disabled={readOnly} onChange={(e) => setWaiting(Number(e.target.value))} className="w-32 px-2 py-1 text-sm border border-black/15 rounded" />
            <div className="text-xs uppercase tracking-wider text-black/60">Effective Date Rule</div>
            <select defaultValue={rule} disabled={readOnly} onChange={(e) => setRule(e.target.value)} className="w-64 px-2 py-1 text-sm border border-black/15 rounded bg-white">
              <option value="first_of_next_month">first_of_next_month</option>
              <option value="hire_date">hire_date</option>
              <option value="first_of_month_after_waiting">first_of_month_after_waiting</option>
            </select>
          </div>
          <div className="mt-3 p-3 bg-[#f7f3eb] border border-black/10 rounded text-xs text-black/70">
            New hires get <b>{period}</b> days to enroll after completing a <b>{waiting}</b> day waiting period. Coverage effective date follows the <b>{rule}</b> rule.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Onboarding Checklist ---------- */

type CheckStatus = "pending" | "passed" | "failed" | "skipped";
type CheckItem = {
  check_type: string;
  label: string;
  ltc_only?: boolean;
  status: CheckStatus;
  checked_by: string;
  checked_at: string;
  notes: string;
};

const CHECK_DEFS: Array<{ check_type: string; label: string; ltc_only?: boolean }> = [
  { check_type: "carrier_confirmed", label: "Carrier Confirmed" },
  { check_type: "rates_loaded", label: "Rates Loaded" },
  { check_type: "benefit_classes_created", label: "Benefit Classes Created", ltc_only: true },
  { check_type: "enrollment_window_created", label: "Enrollment Window Created" },
  { check_type: "fee_schedule_configured", label: "Fee Schedule Configured" },
  { check_type: "klaviyo_list_linked", label: "Klaviyo List Linked" },
  { check_type: "contacts_added", label: "Contacts Added" },
  { check_type: "microsite_verified", label: "Microsite Verified" },
];

function seedChecks(orgId: string, product: "DI" | "LTC"): CheckItem[] {
  const defs = CHECK_DEFS.filter((d) => !d.ltc_only || product === "LTC");
  if (orgId === "org_9") {
    // Ironwood Robotics: 4 passed, rest pending
    return defs.map((d, i) => i < 4
      ? { ...d, status: "passed" as CheckStatus, checked_by: "Jamie Chen", checked_at: "2026-06-08 14:22", notes: "" }
      : { ...d, status: "pending" as CheckStatus, checked_by: "", checked_at: "", notes: "" });
  }
  // Default (active orgs like Acme): all passed
  return defs.map((d) => ({
    ...d, status: "passed" as CheckStatus, checked_by: "Jamie Chen", checked_at: "2025-01-14 09:30", notes: "",
  }));
}

function statusTone(s: CheckStatus): "ok" | "bad" | "info" | "neutral" {
  if (s === "passed") return "ok";
  if (s === "failed") return "bad";
  if (s === "skipped") return "neutral";
  return "neutral";
}

function CheckIcon({ status }: { status: CheckStatus }) {
  const base = "h-4 w-4";
  if (status === "passed") return <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-green-600 text-white"><Check className={base} /></span>;
  if (status === "failed") return <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-red-600 text-white"><XIcon className={base} /></span>;
  if (status === "skipped") return <span className="inline-flex items-center justify-center h-5 w-5 rounded border border-black/30 text-black/60"><SkipForward className={base} /></span>;
  return <span className="inline-flex items-center justify-center h-5 w-5 rounded border border-black/30 text-black/30"><Circle className={base} /></span>;
}

function OnboardingChecklist({ orgId, orgStatus, product, isAdmin }: { orgId: string; orgStatus: string; product: "DI" | "LTC"; isAdmin: boolean }) {
  const [checks, setChecks] = useState<CheckItem[]>(() => seedChecks(orgId, product));
  const [expanded, setExpanded] = useState(orgStatus !== "active");

  useEffect(() => {
    setChecks(seedChecks(orgId, product));
    setExpanded(orgStatus !== "active");
  }, [orgId, orgStatus, product]);

  const showCollapsed = orgStatus === "active" && !expanded;

  const total = checks.length;
  const passed = checks.filter((c) => c.status === "passed").length;
  const nonSkipped = checks.filter((c) => c.status !== "skipped");
  const allPassed = nonSkipped.length > 0 && nonSkipped.every((c) => c.status === "passed");
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-900">Onboarding Checklist</h2>
        {orgStatus === "active" ? (
          <div className="flex items-center gap-3">
            <Pill tone="ok">Onboarding: Complete</Pill>
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Hide checklist" : "Show checklist"}
            </button>
          </div>
        ) : null}
      </div>

      {showCollapsed ? null : (
        <Card className="p-4 max-w-3xl">
          <ul className="divide-y divide-black/10">
            {checks.map((c, idx) => (
              <li key={c.check_type} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5"><CheckIcon status={c.status} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{c.label}</span>
                      <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                      {c.ltc_only ? <span className="text-[10px] uppercase tracking-wider text-black/40">LTC</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-black/60 flex items-center gap-3">
                      <span>Checked by: <span className="text-black/80">{c.checked_by || "—"}</span></span>
                      <span>At: <span className="text-black/80">{c.checked_at || "—"}</span></span>
                    </div>
                    <textarea
                      rows={1}
                      placeholder="Notes…"
                      defaultValue={c.notes}
                      onChange={(e) => {
                        const v = e.target.value;
                        setChecks((prev) => prev.map((p, i) => i === idx ? { ...p, notes: v } : p));
                      }}
                      className="mt-2 w-full px-2 py-1 text-xs border border-black/15 rounded resize-y min-h-[28px]"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-3 border-t border-black/10">
            <div className="flex items-center justify-between text-xs text-black/70 mb-1">
              <span>{passed} of {total} checks complete</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="h-2 w-full bg-black/10 rounded overflow-hidden">
              <div className="h-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            {isAdmin && orgStatus !== "active" ? (
              <div className="mt-3 flex justify-end">
                <Btn variant="primary" disabled={!allPassed}>Mark Onboarding Complete</Btn>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}



/* ---------- Section building blocks (mirror individual page) ---------- */

const inputCls = "w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";

function useSectionEdit() {
  const [editing, setEditing] = useState(false);
  return {
    editing,
    onEdit: () => setEditing(true),
    onCancel: () => setEditing(false),
    onSave: () => setEditing(false),
  };
}

function SectionCard({
  title, children, defaultOpen = false, summary, editing = false, canEdit = false, onEdit, note,
  variant = "config", drives, headerExtra,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  editing?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  note?: React.ReactNode;
  variant?: "info" | "config" | "integration";
  drives?: string[];
  headerExtra?: React.ReactNode;
}) {
  const initiallyOpen = variant === "integration" ? false : (defaultOpen || editing);
  const [open, setOpen] = useState(initiallyOpen);
  const isOpen = open || editing;
  const bgCls = variant === "config" ? "bg-white" : "bg-stone-50";
  const padCls = variant === "info" ? "p-4" : "p-5";
  const pencilCls = variant === "config"
    ? "text-stone-700 hover:text-[#0a3d3e]"
    : "text-stone-400 hover:text-stone-600";
  const bodySize = variant === "integration" ? "text-sm" : "";
  return (
    <div className={`${bgCls} border rounded-lg ${padCls} ${editing ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left flex-1 min-w-0">
          {isOpen ? <ChevronDown className="h-4 w-4 text-black/40 shrink-0" /> : <ChevronRight className="h-4 w-4 text-black/40 shrink-0" />}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!isOpen && summary && <span className="text-xs text-black/50 truncate">· {summary}</span>}
        </button>
        <div className="flex items-center gap-3 shrink-0">
          {variant === "config" && isOpen && drives && drives.length > 0 && (
            <div className="text-xs text-stone-500 lowercase">
              <span className="font-medium">Drives:</span>{" "}
              {drives.slice(0, 2).map((d, i) => (
                <React.Fragment key={d}>
                  {i > 0 && <span className="mx-1 text-stone-400">·</span>}
                  <span>{d}</span>
                </React.Fragment>
              ))}
              {drives.length > 2 && <span className="ml-1 text-stone-400">+{drives.length - 2} more</span>}
            </div>
          )}
          {isOpen && headerExtra}
          {canEdit && !editing && isOpen && onEdit && (
            <button onClick={onEdit} className={`${pencilCls} p-1`} title="Edit section">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <div className={`mt-4 ${bodySize}`}>
          {note && <div className="text-xs text-black/50 mb-3 italic">{note}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

function BucketHeader({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="mt-6 mb-3 first:mt-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-sm text-stone-400 mt-0.5">{subtitle}</div>
    </div>
  );
}

function SectionActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-4 pt-4 border-t border-black/10 flex justify-end gap-2">
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn variant="primary" onClick={onSave}>Save</Btn>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-8 gap-y-4">{children}</div>;
}

function RField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

function Empty() { return <span className="text-gray-400">—</span>; }
function val(v: React.ReactNode | null | undefined) {
  if (v === null || v === undefined || v === "") return <Empty />;
  return v;
}
function YesNo({ b }: { b: boolean }) { return <>{b ? "Yes" : "No"}</>; }
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline inline-flex items-center gap-1">{children}<ExternalLink className="h-3 w-3" /></a>;
}

/* ---------- Sections ---------- */

function IdentitySection({ org, product, statusValue, isAdmin, readOnly, summary, variant }: { org: OrgDetail; product: "DI" | "LTC"; statusValue: string; isAdmin: boolean; readOnly: boolean; summary: string; variant?: "info" | "config" | "integration" }) {
  const e = useSectionEdit();
  const NameField = (
    <RField label="Name">{e.editing ? <input className={inputCls} defaultValue={org.name} /> : org.name}</RField>
  );
  const DomainField = (
    <RField label="Domain">{e.editing ? <input className={inputCls} defaultValue={org.domain} /> : org.domain}</RField>
  );
  const IndustryField = (
    <RField label="Industry">
      {e.editing
        ? <select className={inputCls} defaultValue={org.industry}>{INDUSTRIES.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}</select>
        : titleCase(org.industry)}
    </RField>
  );
  const OrgTypeField = (
    <RField label="Org Type">
      {e.editing
        ? <select className={inputCls} defaultValue={org.org_type}>{ORG_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
        : org.org_type}
    </RField>
  );
  const StatusField = (
    <RField label="Status">
      {e.editing
        ? <select className={inputCls} defaultValue={statusValue} disabled={!isAdmin}>{ORG_STATUSES.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}</select>
        : titleCase(statusValue)}
    </RField>
  );
  const SitusStateField = (
    <RField label="Situs State">
      {e.editing
        ? <select className={inputCls} defaultValue={org.situs_state}>{US_STATES.map((o) => <option key={o}>{o}</option>)}</select>
        : org.situs_state}
    </RField>
  );
  const SitusCityField = (
    <RField label="Situs City">{e.editing ? <input className={inputCls} defaultValue={org.situs_city} /> : org.situs_city}</RField>
  );
  const EligibleLivesField = (
    <RField label="Eligible Lives">{e.editing ? <input className={inputCls} type="number" defaultValue={org.eligible_lives} /> : org.eligible_lives}</RField>
  );
  const PolicyOwnerField = (
    <RField label="Policy Owner Type">
      {e.editing
        ? <select className={inputCls} defaultValue={org.policy_owner_type}>{["employer_group","cca"].map((o) => <option key={o} value={o}>{policyOwnerLabel(o)}</option>)}</select>
        : policyOwnerLabel(org.policy_owner_type)}
    </RField>
  );
  const ContactEmailField = (
    <RField label="Contact Email">
      {e.editing
        ? <input className={inputCls} type="email" defaultValue={org.contact_email ?? ""} />
        : (org.contact_email ? <a href={`mailto:${org.contact_email}`} className="text-sky-700 hover:underline">{org.contact_email}</a> : <Empty />)}
    </RField>
  );
  const MicrositeFieldRow = (
    <RField label="Microsite URL"><MicrositeField url={org.microsite_url} product={product} editing={e.editing} /></RField>
  );

  return (
    <SectionCard title="Identity" defaultOpen summary={summary} editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit} variant={variant}>
      <Grid2>
        {product === "DI" ? (
          <>
            {NameField}
            <RField label="CCA Group">{e.editing ? <Switch defaultChecked={org.cca_group} /> : <YesNo b={org.cca_group} />}</RField>
            {DomainField}
            <div />
            {IndustryField}
            {MicrositeFieldRow}
            {OrgTypeField}
            {ContactEmailField}
            <RField label="DI Healthcare Type">
              {e.editing
                ? <select className={inputCls} defaultValue={org.di_healthcare_type}>{DI_HC_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
                : org.di_healthcare_type}
            </RField>
            {StatusField}
            {SitusStateField}
            {SitusCityField}
            {EligibleLivesField}
            {!org.cca_group && PolicyOwnerField}
          </>
        ) : (
          <>
            {NameField}
            <RField label="Company Years in Existence">{e.editing ? <input className={inputCls} type="number" defaultValue={org.company_years_in_existence} /> : org.company_years_in_existence}</RField>
            {DomainField}
            <RField label="NAIC Code">{e.editing ? <input className={inputCls} defaultValue={org.naic_code} /> : <span className="font-mono text-xs">{org.naic_code}</span>}</RField>
            {IndustryField}
            <RField label="Org Website">
              {e.editing ? <input className={inputCls} defaultValue={org.org_website} /> : <ExtLink href={org.org_website}>{org.org_website}</ExtLink>}
            </RField>
            {OrgTypeField}
            {ContactEmailField}
            {StatusField}
            {SitusStateField}
            {SitusCityField}
            {EligibleLivesField}
            {PolicyOwnerField}
            {MicrositeFieldRow}
          </>
        )}
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function DIProductPlanSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const hasStd = org.type_of_rate === "STD+LTD";
  const pd = (org.plan_details ?? {}) as { ltd?: Record<string, string>; std?: Record<string, string> };
  return (
    <SectionCard title="DI Product & Plan Terms" defaultOpen editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit} drives={["microsite", "premium calculation"]}>
      <div className="mb-5">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Product Mix</div>
        <div className="text-sm text-gray-900 font-medium">
          {e.editing
            ? <select className={inputCls} defaultValue={org.type_of_rate ?? "LTD"}>{["LTD","STD+LTD"].map((o) => <option key={o} value={o}>{productMixLabel(o)}</option>)}</select>
            : productMixLabel(org.type_of_rate)}
        </div>
        <div className="text-[11px] text-black/50 mt-1 italic">
          Drives plan terms below, rate config, and which premium fields apply to individuals.
        </div>
      </div>

      <DIPlanBlock
        header="Long-Term Disability (LTD)"
        benefitPctLabel="Benefit %"
        benefitPct={org.ltd_benefit_pct}
        capLabel="Monthly Cap"
        labels={LTD_LABELS}
        values={pd.ltd ?? {}}
        editing={e.editing}
      />
      {hasStd && (
        <div className="mt-5">
          <DIPlanBlock
            header="Short-Term Disability (STD)"
            benefitPctLabel="Benefit %"
            benefitPct={org.std_benefit_pct}
            capLabel="Weekly Cap"
            labels={STD_LABELS}
            values={pd.std ?? {}}
            editing={e.editing}
          />
        </div>
      )}
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function DIPlanBlock({
  header, benefitPctLabel, benefitPct, capLabel, labels, values, editing,
}: {
  header: string;
  benefitPctLabel: string;
  benefitPct: number;
  capLabel: string;
  labels: Record<string, string>;
  values: Record<string, string>;
  editing: boolean;
}) {
  // Render Benefit % (structured) first, then the labeled text fields. Two-column grid.
  const entries = Object.entries(labels);
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">{header}</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <RField label={benefitPctLabel}>
          {editing
            ? <div className="flex items-center gap-1"><input className={inputCls} type="number" defaultValue={String(benefitPct)} /><span className="text-sm text-black/60">%</span></div>
            : `${benefitPct}%`}
        </RField>
        {entries.map(([key, label]) => {
          // benefit_pct_text handled by structured field above; skip it
          if (key === "benefit_pct_text") return null;
          const isLong = key === "definition_of_disability" || key === "pre_existing_conditions" || key === "exclusions";
          return (
            <div key={key} className={isLong ? "col-span-2" : ""}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label === "Monthly Cap" || label === "Weekly Cap" ? capLabel : label}</div>
              <div className="text-sm text-gray-900">
                {editing
                  ? (isLong
                      ? <Textarea defaultValue={values[key] ?? ""} className="text-sm min-h-[60px]" />
                      : <input className={inputCls} defaultValue={values[key] ?? ""} />)
                  : (values[key] || <Empty />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MicrositeField({ url, product, editing }: { url: string; product: "DI" | "LTC"; editing: boolean }) {
  const suffix = defaultMicrositeSuffix(product);
  const parsed = parseMicrositeSubdomain(url, suffix);
  if (!editing) {
    return <ExtLink href={url}>{url}</ExtLink>;
  }
  if (!parsed.matches) {
    return (
      <div>
        <input className={inputCls} defaultValue={url} />
        <div className="text-[11px] text-amber-700 mt-1 italic">Non-standard domain — contact engineering.</div>
      </div>
    );
  }
  return (
    <div className="flex items-stretch border border-gray-300 rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-400">
      <input className="flex-1 min-w-0 px-2 py-1 text-sm bg-white focus:outline-none" defaultValue={parsed.subdomain} placeholder="subdomain" />
      <div className="px-2 py-1 text-sm text-black/60 bg-gray-50 border-l border-gray-300 select-none">{suffix}</div>
    </div>
  );
}

function CarrierProductSection({ org, product, readOnly, variant }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean; variant?: "info" | "config" | "integration" }) {
  const e = useSectionEdit();
  const note = product === "LTC"
    ? "Carrier and product are set during initial onboarding. Commission schedule changes flow to all enrollments after the effective date."
    : "Carrier and product are set during initial onboarding. To change, contact engineering.";
  const options = carrierProductOptions(product);
  const [carrierProductId, setCarrierProductId] = useState<string | null>(org.carrier_product_id);
  const selected = options.find((o) => o.id === carrierProductId) ?? null;
  return (
    <SectionCard
      title="Carrier & Product"
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      variant={variant}
      note={note}
    >
      <Grid2>
        <RField label="Carrier">{selected ? selected.carrier : <Empty />}</RField>
        <RField label="Effective Date">
          {e.editing
            ? <input className={inputCls} type="date" defaultValue={org.policy_effective_date} />
            : fmtDate(org.policy_effective_date)}
        </RField>
        <RField label="Product">{selected ? selected.product : <Empty />}</RField>
        {product === "LTC" ? (
          <RField label="Carrier Commission Schedule">
            <Link to="/carriers" className="text-sky-700 hover:underline inline-flex items-center gap-1">View schedule <ExternalLink className="h-3 w-3" /></Link>
          </RField>
        ) : (
          <RField label="Carrier Commission Rates">
            <span className="text-xs text-black/60 italic">Per-policy commission rates</span>
          </RField>
        )}
        <RField label="Carrier Product">
          {e.editing
            ? (
                <select
                  className={inputCls}
                  value={carrierProductId ?? ""}
                  onChange={(ev) => setCarrierProductId(ev.target.value || null)}
                >
                  <option value="">— Not set —</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              )
            : (selected
                ? <span className="text-sm">{selected.label}</span>
                : <Empty />)}
        </RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function LTCProductPlanSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const pd = (org.plan_details ?? {}) as Record<string, Record<string, string> | undefined>;
  const [active, setActive] = useState<typeof LTC_TIERS[number]>("bronze");
  const tierData = pd[active];
  return (
    <SectionCard
      title="LTC Product & Plan Terms"
      defaultOpen
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      drives={["microsite", "premium calculation", "rate cells"]}
    >
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">Product Configuration</div>
        <Grid2>
          <RField label="Product Template Variant">
            {e.editing
              ? <select className={inputCls} defaultValue={org.product_template_variant}>{PRODUCT_TEMPLATE_VARIANTS.map((o) => <option key={o} value={o}>{productTemplateVariantLabel(o)}</option>)}</select>
              : productTemplateVariantLabel(org.product_template_variant)}
          </RField>
          <RField label="Extension of Benefits Rider">{e.editing ? <Switch defaultChecked={org.extension_of_benefits_rider} /> : <YesNo b={org.extension_of_benefits_rider} />}</RField>
          <RField label="Healthcare Company">{e.editing ? <input className={inputCls} defaultValue={org.healthcare_company} /> : titleCase(org.healthcare_company)}</RField>
          <RField label="Benefit Restoration Rider">{e.editing ? <Switch defaultChecked={org.benefit_restoration_rider} /> : <YesNo b={org.benefit_restoration_rider} />}</RField>
        </Grid2>
        <div className="grid grid-cols-4 gap-x-6 gap-y-4 mt-4">
          <RField label="Benefit Duration">{e.editing ? <input className={inputCls} defaultValue={String(org.benefit_duration)} /> : org.benefit_duration}</RField>
          <RField label="Duration">{e.editing ? <input className={inputCls} defaultValue={org.duration} /> : org.duration}</RField>
          <RField label="Min Age">{e.editing ? <input className={inputCls} type="number" defaultValue={org.min_age} /> : org.min_age}</RField>
          <RField label="Max Age">{e.editing ? <input className={inputCls} type="number" defaultValue={org.max_age} /> : org.max_age}</RField>
        </div>
      </div>

      <hr className="border-black/10 my-5" />

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-2 pb-1 border-b border-black/10">Plan Terms by Tier</div>
        {!e.editing && (
          <div className="text-xs text-black/50 italic mb-3">Plan terms displayed on the enrollment microsite. Each tab corresponds to one coverage tier.</div>
        )}
        <div className="flex gap-1 border-b border-black/10 mb-3">
          {LTC_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`px-3 py-1.5 text-xs capitalize border-b-2 -mb-px ${active === t ? "border-[#0a3d3e] text-[#0a3d3e] font-medium" : "border-transparent text-black/50 hover:text-black/80"}`}
            >{t}</button>
          ))}
        </div>
        <div className="text-xs font-semibold text-black/70 mb-2 capitalize">{active} Tier</div>
        {tierData && Object.keys(tierData).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(tierData).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[220px_1fr] gap-3 items-start">
                <div className="text-xs font-semibold text-black/70 pt-2 capitalize">{k.replace(/_/g, " ")}</div>
                {e.editing
                  ? <Textarea defaultValue={v} className="text-sm min-h-[44px]" />
                  : <div className="text-sm text-black/80 leading-relaxed pt-1">{v}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-black/50 italic">No plan terms configured for {titleCase(active)}. Click edit to add.</div>
        )}
      </div>

      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

const TODAY_ISO = "2026-06-14";
function isCurrent(s: FeeSchedule): boolean {
  if (s.effective_from > TODAY_ISO) return false;
  if (s.effective_to && s.effective_to < TODAY_ISO) return false;
  return true;
}
function isFuture(s: FeeSchedule): boolean { return s.effective_from > TODAY_ISO; }
function isPast(s: FeeSchedule): boolean { return !!s.effective_to && s.effective_to < TODAY_ISO; }
function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function bpsToPct(bps: number): string { return (bps / 100).toFixed(2) + "%"; }

function PricingFeesSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  return (
    <SectionCard title="Pricing & Fees" defaultOpen canEdit={false} drives={["billing", "payment processing"]}>
      <div className="space-y-5">
        <TpaFeeScheduleSubBlock org={org} readOnly={readOnly} />
      </div>
    </SectionCard>
  );
}

function SubBlockHeader({
  title, subtitle, editing, canEdit, onEdit,
}: { title: string; subtitle: string; editing: boolean; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between mb-3 pb-2 border-b border-black/10">
      <div>
        <div className="text-sm font-semibold text-[#0a3d3e]">{title}</div>
        <div className="text-xs text-stone-500 mt-0.5">{subtitle}</div>
      </div>
      {canEdit && !editing && (
        <button onClick={onEdit} className="text-stone-700 hover:text-[#0a3d3e] p-1" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TpaFeeScheduleSubBlock({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const cca = org.cca_group;
  const [schedules, setSchedules] = useState<FeeSchedule[]>(() =>
    [...org.fee_schedules].sort((a, b) => b.effective_from.localeCompare(a.effective_from))
  );
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const current = schedules.find(isCurrent) ?? null;

  // Add-form state
  const [nfFrom, setNfFrom] = useState("");
  const [nfTo, setNfTo] = useState("");
  const [nfFee, setNfFee] = useState("");
  const [nfName, setNfName] = useState(cca ? "CCA Membership Fee" : "Processing Fee");
  const [nfRetained, setNfRetained] = useState("");
  const [nfNotes, setNfNotes] = useState("");
  const [nfError, setNfError] = useState<string | null>(null);

  function resetAddForm() {
    setNfFrom(""); setNfTo(""); setNfFee(""); setNfRetained(""); setNfNotes(""); setNfError(null);
    setNfName(cca ? "CCA Membership Fee" : "Processing Fee");
  }
  function saveNewSchedule() {
    setNfError(null);
    if (!nfFrom) return setNfError("Effective From is required.");
    if (nfFrom <= TODAY_ISO) return setNfError("Effective From must be later than today.");
    if (!nfFee || isNaN(Number(nfFee))) return setNfError("TPA Fee is required.");
    if (nfTo && nfTo < nfFrom) return setNfError("Effective To must be on/after Effective From.");
    if (!nfNotes.trim()) return setNfError("Notes are required.");
    // Overlap pre-check
    const newFrom = nfFrom, newTo = nfTo || null;
    let truncateCurrentTo: { schedId: string; newTo: string } | null = null;
    for (const s of schedules) {
      const sTo = s.effective_to ?? "9999-12-31";
      const nTo = newTo ?? "9999-12-31";
      const overlaps = !(nTo < s.effective_from || newFrom > sTo);
      if (!overlaps) continue;
      // Auto-close current open-ended schedule if new is in the future
      if (s.effective_to === null && isCurrent(s) && newFrom > TODAY_ISO) {
        const closeDate = addDaysIso(newFrom, -1);
        if (!confirm(`This will close the current schedule on ${closeDate}. Continue?`)) return;
        truncateCurrentTo = { schedId: s.id, newTo: closeDate };
      } else {
        return setNfError(`Overlaps with existing schedule ${fmtDate(s.effective_from)} – ${s.effective_to ? fmtDate(s.effective_to) : "open"}.`);
      }
    }
    const next: FeeSchedule = {
      id: `fs_new_${Date.now()}`,
      effective_from: newFrom,
      effective_to: newTo,
      tpa_fee_cents: Math.round(Number(nfFee)),
      tpa_fee_name: nfName.trim() || null,
      service_fee_retained_cents: cca && nfRetained ? Math.round(Number(nfRetained)) : null,
      notes: nfNotes.trim(),
    };
    setSchedules((prev) => {
      const updated = truncateCurrentTo
        ? prev.map((s) => s.id === truncateCurrentTo!.schedId ? { ...s, effective_to: truncateCurrentTo!.newTo } : s)
        : prev;
      return [...updated, next].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    });
    setAdding(false);
    resetAddForm();
  }

  // Edit-current form state
  const [efFrom, setEfFrom] = useState("");
  const [efTo, setEfTo] = useState("");
  const [efFee, setEfFee] = useState("");
  const [efName, setEfName] = useState("");
  const [efRetained, setEfRetained] = useState("");
  const [efNotes, setEfNotes] = useState("");
  useEffect(() => {
    if (editing && current) {
      setEfFrom(current.effective_from);
      setEfTo(current.effective_to ?? "");
      setEfFee(String(current.tpa_fee_cents));
      setEfName(current.tpa_fee_name ?? "");
      setEfRetained(current.service_fee_retained_cents == null ? "" : String(current.service_fee_retained_cents));
      setEfNotes(current.notes);
    }
  }, [editing, current]);
  function saveEditCurrent() {
    if (!current) return;
    setSchedules((prev) => prev.map((s) => s.id === current.id ? {
      ...s,
      effective_from: efFrom,
      effective_to: efTo || null,
      tpa_fee_cents: Math.round(Number(efFee)),
      tpa_fee_name: efName.trim() || null,
      service_fee_retained_cents: cca && efRetained ? Math.round(Number(efRetained)) : null,
      notes: efNotes.trim(),
    } : s));
    setEditing(false);
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-white">
      <SubBlockHeader
        title="TPA Fee Schedule"
        subtitle="Versioned per commercial agreement. Schedule future fee changes here."
        editing={editing}
        canEdit={!readOnly && !adding}
        onEdit={() => setEditing(true)}
      />

      {/* Current schedule */}
      {current ? (
        editing ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <RField label="Effective From"><input className={inputCls} type="date" value={efFrom} onChange={(e) => setEfFrom(e.target.value)} /></RField>
            <RField label="Effective To"><input className={inputCls} type="date" value={efTo} onChange={(e) => setEfTo(e.target.value)} placeholder="(open-ended)" /></RField>
            <RField label="TPA Fee (cents)">
              <div className="flex items-center gap-2">
                <input className={inputCls} value={efFee} onChange={(e) => setEfFee(e.target.value)} />
                <span className="text-[10px] text-black/40">(cents)</span>
              </div>
            </RField>
            <RField label="TPA Fee Name"><input className={inputCls} value={efName} onChange={(e) => setEfName(e.target.value)} /></RField>
            {cca && (
              <RField label="Service Fee Retained (cents)">
                <div className="flex items-center gap-2">
                  <input className={inputCls} value={efRetained} onChange={(e) => setEfRetained(e.target.value)} />
                  <span className="text-[10px] text-black/40">(cents)</span>
                </div>
              </RField>
            )}
            <div className="col-span-2">
              <RField label="Notes"><Textarea className="w-full" rows={2} value={efNotes} onChange={(e) => setEfNotes(e.target.value)} /></RField>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <RField label="Effective From">{fmtDate(current.effective_from)}</RField>
            <RField label="Effective To">{current.effective_to ? fmtDate(current.effective_to) : <span className="text-black/50 italic">Open-ended</span>}</RField>
            <RField label="TPA Fee">{`${formatCents(current.tpa_fee_cents)} / mo`}</RField>
            <RField label="TPA Fee Name">{current.tpa_fee_name ?? "—"}</RField>
            <RField label="Service Fee Retained">
              {current.service_fee_retained_cents == null
                ? <span className="text-black/60 italic">Full retention by Hollowtree</span>
                : formatCents(current.service_fee_retained_cents)}
            </RField>
            <div className="col-span-2">
              <RField label="Notes"><span className="text-black/70">{current.notes}</span></RField>
            </div>
          </div>
        )
      ) : (
        <div className="text-sm text-black/50 italic">No current schedule. Add one via "+ Schedule a fee change".</div>
      )}

      {editing && (
        <>
          <div className="mt-3 text-xs text-stone-500 italic">
            Editing the current schedule corrects the active row. To schedule a future change, use "Schedule a fee change" instead.
          </div>
          <SectionActions onCancel={() => setEditing(false)} onSave={saveEditCurrent} />
        </>
      )}

      {!editing && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setShowHistory((v) => !v)} className="text-xs text-sky-700 hover:underline">
            {showHistory ? "Hide" : "View"} schedule history ({schedules.length})
          </button>
          {!readOnly && !adding && (
            <Btn variant="primary" onClick={() => setAdding(true)}>+ Schedule a fee change</Btn>
          )}
        </div>
      )}

      {showHistory && !editing && (
        <div className="mt-3 border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Effective From</th>
                <th className="text-left px-2 py-1.5 font-medium">Effective To</th>
                <th className="text-left px-2 py-1.5 font-medium">TPA Fee</th>
                <th className="text-left px-2 py-1.5 font-medium">TPA Fee Name</th>
                <th className="text-left px-2 py-1.5 font-medium">Service Fee Retained</th>
                <th className="text-left px-2 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const cur = isCurrent(s);
                const past = isPast(s);
                const rowCls = past ? "text-stone-400" : "text-stone-800";
                const borderCls = cur ? "border-l-2 border-emerald-500" : "border-l-2 border-transparent";
                return (
                  <tr key={s.id} className={`${rowCls} ${borderCls} border-t border-gray-100`}>
                    <td className="px-2 py-1.5">{fmtDate(s.effective_from)}</td>
                    <td className="px-2 py-1.5">{s.effective_to ? fmtDate(s.effective_to) : <span className="italic">Open</span>}</td>
                    <td className="px-2 py-1.5">{formatCents(s.tpa_fee_cents)}</td>
                    <td className="px-2 py-1.5">{s.tpa_fee_name ?? "—"}</td>
                    <td className="px-2 py-1.5">{s.service_fee_retained_cents == null ? "—" : formatCents(s.service_fee_retained_cents)}</td>
                    <td className="px-2 py-1.5">{s.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding && !editing && (
        <div className="mt-4 p-3 border border-blue-200 bg-blue-50/40 rounded">
          <div className="text-xs font-semibold text-[#0a3d3e] mb-3">Schedule a fee change</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <RField label="Effective From (required, future)"><input className={inputCls} type="date" value={nfFrom} onChange={(e) => setNfFrom(e.target.value)} /></RField>
            <RField label="Effective To (optional)"><input className={inputCls} type="date" value={nfTo} onChange={(e) => setNfTo(e.target.value)} /></RField>
            <RField label="TPA Fee (cents)">
              <div className="flex items-center gap-2">
                <input className={inputCls} value={nfFee} onChange={(e) => setNfFee(e.target.value)} placeholder="e.g. 2000" />
                <span className="text-[10px] text-black/40">(cents)</span>
              </div>
            </RField>
            <RField label="TPA Fee Name (optional)"><input className={inputCls} value={nfName} onChange={(e) => setNfName(e.target.value)} /></RField>
            {cca && (
              <RField label="Service Fee Retained (cents)">
                <div className="flex items-center gap-2">
                  <input className={inputCls} value={nfRetained} onChange={(e) => setNfRetained(e.target.value)} placeholder="e.g. 500" />
                  <span className="text-[10px] text-black/40">(cents)</span>
                </div>
              </RField>
            )}
            <div className="col-span-2">
              <RField label="Notes (required)">
                <Textarea className="w-full" rows={2} value={nfNotes} onChange={(e) => setNfNotes(e.target.value)}
                  placeholder="Reason for this change, e.g., 'Annual TPA fee increase per CCA agreement section 4.2'" />
              </RField>
            </div>
          </div>
          {nfError && <div className="mt-2 text-xs text-red-700">{nfError}</div>}
          <div className="mt-3 flex justify-end gap-2">
            <Btn onClick={() => { setAdding(false); resetAddForm(); }}>Cancel</Btn>
            <Btn variant="primary" onClick={saveNewSchedule}>Save schedule</Btn>
          </div>
        </div>
      )}

      {cca && !editing && (
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="p-3 bg-[#fefaf2] border border-amber-200 rounded">
            <div className="text-xs font-semibold text-amber-900 mb-2">How CCA fee splitting works</div>
            <p className="text-xs text-black/70 leading-relaxed mb-2">
              CCA orgs charge a membership fee (not the standard TPA fee). The fee splits between Hollowtree and CCA per schedule.
            </p>
            <p className="text-xs text-black/60 italic">
              This split is for reporting only. The <code>tpa_fee_cents</code> value is what the enrollee is charged regardless.
            </p>
          </div>
          <div className="p-3 bg-white border border-black/10 rounded">
            <div className="text-xs font-semibold text-black/70 uppercase tracking-wider mb-2">Worked example (current schedule)</div>
            {current ? (
              <div className="text-xs text-black/70 space-y-1">
                <div>Enrollee charged: <b>{formatCents(current.tpa_fee_cents)}</b> / mo</div>
                <div>Retained by Hollowtree: <b>{current.service_fee_retained_cents == null ? formatCents(current.tpa_fee_cents) + " (full)" : formatCents(current.service_fee_retained_cents)}</b></div>
                <div>Remitted to CCA: <b>{current.service_fee_retained_cents == null ? formatCents(0) : formatCents(current.tpa_fee_cents - current.service_fee_retained_cents)}</b></div>
              </div>
            ) : <div className="text-xs text-black/50 italic">No current schedule.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentProcessingSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const [cardBps, setCardBps] = useState(String(org.card_percentage_bps));
  const [achFirst, setAchFirst] = useState(String(org.ach_first_fee_cents));
  const [achSub, setAchSub] = useState(String(org.ach_subsequent_fee_cents));
  const [achPenalty, setAchPenalty] = useState(String(org.failed_ach_penalty_cents));
  const [penaltyMode, setPenaltyMode] = useState<"flat" | "percentage">(org.failed_card_penalty_mode);
  const [penaltyFlat, setPenaltyFlat] = useState(String(org.failed_card_penalty_value_cents ?? ""));
  const [penaltyBps, setPenaltyBps] = useState(String(org.failed_card_penalty_pct_bps ?? ""));
  const [retry, setRetry] = useState(String(org.free_retry_count));

  function cancel() {
    setCardBps(String(org.card_percentage_bps));
    setAchFirst(String(org.ach_first_fee_cents));
    setAchSub(String(org.ach_subsequent_fee_cents));
    setAchPenalty(String(org.failed_ach_penalty_cents));
    setPenaltyMode(org.failed_card_penalty_mode);
    setPenaltyFlat(String(org.failed_card_penalty_value_cents ?? ""));
    setPenaltyBps(String(org.failed_card_penalty_pct_bps ?? ""));
    setRetry(String(org.free_retry_count));
    e.onCancel();
  }

  const cardPctHelp = (() => {
    const n = parseInt(cardBps, 10);
    if (isNaN(n)) return null;
    return `${(n / 100).toFixed(2)}%`;
  })();

  const penaltyDisplay = org.failed_card_penalty_mode === "flat"
    ? formatCents(org.failed_card_penalty_value_cents ?? 0)
    : bpsToPct(org.failed_card_penalty_pct_bps ?? 0);

  return (
    <SectionCard
      title="Payment Processing"
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      drives={["billing automation", "fee calculation"]}
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <RField label="Card Fee (bps)">
          {e.editing
            ? (
              <div>
                <input className={inputCls} type="number" value={cardBps} onChange={(ev) => setCardBps(ev.target.value)} />
                <div className="text-[11px] text-stone-500 mt-1">{cardPctHelp ? `${cardBps} = ${cardPctHelp}` : "370 = 3.70%"}</div>
              </div>
            )
            : <span>{org.card_percentage_bps} <span className="text-stone-400 text-xs">({bpsToPct(org.card_percentage_bps)})</span></span>}
        </RField>
        <RField label="Failed ACH Penalty">
          {e.editing
            ? <input className={inputCls} type="number" value={achPenalty} onChange={(ev) => setAchPenalty(ev.target.value)} />
            : formatCents(org.failed_ach_penalty_cents)}
        </RField>
        <RField label="ACH First Payment">
          {e.editing
            ? <input className={inputCls} type="number" value={achFirst} onChange={(ev) => setAchFirst(ev.target.value)} />
            : formatCents(org.ach_first_fee_cents)}
        </RField>
        <RField label="Free Retries">
          {e.editing
            ? <input className={inputCls} type="number" value={retry} onChange={(ev) => setRetry(ev.target.value)} />
            : org.free_retry_count}
        </RField>
        <RField label="ACH Subsequent">
          {e.editing
            ? <input className={inputCls} type="number" value={achSub} onChange={(ev) => setAchSub(ev.target.value)} />
            : formatCents(org.ach_subsequent_fee_cents)}
        </RField>
        <RField label="Failed Card Penalty Mode">
          {e.editing
            ? (
              <select className={inputCls} value={penaltyMode} onChange={(ev) => setPenaltyMode(ev.target.value as "flat" | "percentage")}>
                <option value="flat">Flat</option>
                <option value="percentage">Percentage</option>
              </select>
            )
            : (org.failed_card_penalty_mode === "flat" ? "Flat" : "Percentage")}
        </RField>
        {(e.editing ? penaltyMode : org.failed_card_penalty_mode) === "flat"
          ? (
            <RField label="Failed Card Penalty (flat)">
              {e.editing
                ? <input className={inputCls} type="number" value={penaltyFlat} onChange={(ev) => setPenaltyFlat(ev.target.value)} placeholder="cents" />
                : penaltyDisplay}
            </RField>
          )
          : (
            <RField label="Failed Card Penalty (bps)">
              {e.editing
                ? <input className={inputCls} type="number" value={penaltyBps} onChange={(ev) => setPenaltyBps(ev.target.value)} placeholder="basis points" />
                : penaltyDisplay}
            </RField>
          )}
      </div>
      {e.editing && <SectionActions onCancel={cancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function LocalizationSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const [defaultLang, setDefaultLang] = useState(org.default_language);
  const [supported, setSupported] = useState<string[]>(org.supported_languages);
  function toggleLang(code: string) {
    setSupported(supported.includes(code) ? supported.filter((c) => c !== code) : [...supported, code]);
  }
  function cancel() {
    setDefaultLang(org.default_language);
    setSupported(org.supported_languages);
    e.onCancel();
  }
  return (
    <SectionCard
      title="Localization"
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      drives={["microsite language", "email templates"]}
      note="Individual language preferences (preferred_language) override the org default for communications."
    >
      <Grid2>
        <RField label="Default Language">
          {e.editing
            ? (
              <select className={inputCls} value={defaultLang} onChange={(ev) => setDefaultLang(ev.target.value)}>
                {LANGUAGE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )
            : languageLabel(org.default_language)}
        </RField>
        <RField label="Supported Languages">
          {e.editing
            ? (
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((l) => {
                  const on = supported.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => toggleLang(l.code)}
                      className={`text-xs px-2 py-1 rounded-full border ${on ? "bg-[#0a3d3e] text-white border-[#0a3d3e]" : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"}`}
                    >{l.label}</button>
                  );
                })}
              </div>
            )
            : (
              <div className="flex flex-wrap gap-1.5">
                {org.supported_languages.map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">{languageLabel(c)}</span>
                ))}
              </div>
            )}
        </RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={cancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function GroupPolicySection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard
      title="Group Policy"
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      drives={["carrier reporting", "Sun Life integration"]}
    >
      <Grid2>
        <RField label="Policy Number">
          {e.editing
            ? <input className={inputCls} defaultValue={org.group_policy_number ?? ""} placeholder="e.g. SL-2024-00147" />
            : (org.group_policy_number
                ? <span className="font-mono text-xs">{org.group_policy_number}</span>
                : <Empty />)}
        </RField>
        <RField label="Effective Date">
          {e.editing
            ? <input className={inputCls} type="date" defaultValue={org.group_policy_effective_date ?? ""} />
            : (org.group_policy_effective_date ? fmtDate(org.group_policy_effective_date) : <Empty />)}
        </RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}


function BrokerSection({ org, product, readOnly }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean }) {
  const e = useSectionEdit();
  const brokers = useBrokers();
  const [primary, setPrimary] = useState<string>(org.primary_broker);
  const [secondary, setSecondary] = useState<string>(org.secondary_broker ?? "");
  const [creatingFor, setCreatingFor] = useState<"primary" | "secondary" | null>(null);
  const [prevSelection, setPrevSelection] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BrokerType>(BROKER_TYPES[0]);
  const [newPct, setNewPct] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Reset local selection state when leaving edit mode without committing
  // (section-level Cancel). The shared broker store is intentionally NOT
  // reverted -- newly created brokers remain available for other orgs.
  useEffect(() => {
    if (!e.editing) {
      setPrimary(org.primary_broker);
      setSecondary(org.secondary_broker ?? "");
      setCreatingFor(null);
      resetNewForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.editing]);

  function resetNewForm() {
    setNewName(""); setNewType(BROKER_TYPES[0]); setNewPct(""); setNewEmail(""); setFormError(null);
  }

  function renderOverride(value: number | null, brokerName: string | null) {
    if (value !== null) return `${value}%`;
    const def = brokerDefaultPct(brokerName)
      ?? brokers.find((b) => b.broker_name === brokerName)?.default_commission_pct
      ?? null;
    if (def !== null) return <span>{def}% <span className="text-[11px] text-black/40">(default)</span></span>;
    return <Empty />;
  }

  function handleSelectChange(slot: "primary" | "secondary", value: string) {
    if (value === "__create__") {
      setPrevSelection(slot === "primary" ? primary : secondary);
      setCreatingFor(slot);
      return;
    }
    if (slot === "primary") setPrimary(value); else setSecondary(value);
  }

  function cancelCreate() {
    if (creatingFor === "primary") setPrimary(prevSelection);
    else if (creatingFor === "secondary") setSecondary(prevSelection);
    setCreatingFor(null);
    resetNewForm();
  }

  function saveNewBroker() {
    const name = newName.trim();
    const pctNum = parseFloat(newPct);
    if (!name) { setFormError("Broker Name is required."); return; }
    if (!newPct.trim() || Number.isNaN(pctNum)) { setFormError("Default Commission % is required."); return; }
    if (pctNum < 0 || pctNum > 100) { setFormError("Default Commission % must be between 0 and 100."); return; }
    const rec = addBrokerToStore({
      broker_name: name,
      broker_type: newType,
      default_commission_pct: pctNum,
      contact_email: newEmail.trim() || null,
    });
    if (creatingFor === "primary") setPrimary(rec.broker_name);
    else if (creatingFor === "secondary") setSecondary(rec.broker_name);
    setCreatingFor(null);
    resetNewForm();
  }

  function BrokerSelect({ slot, value }: { slot: "primary" | "secondary"; value: string }) {
    return (
      <select
        className={inputCls}
        value={value}
        onChange={(ev) => handleSelectChange(slot, ev.target.value)}
      >
        {slot === "secondary" && <option value="">— None —</option>}
        {brokers.map((b) => <option key={b.id} value={b.broker_name}>{b.broker_name}</option>)}
        <option disabled>──────────────</option>
        <option value="__create__" className="text-stone-600">+ Create new broker…</option>
      </select>
    );
  }

  return (
    <SectionCard title="Distribution & Broker" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit} drives={["commission splits"]}>
      <Grid2>
        <RField label="Primary Broker">
          {e.editing ? <BrokerSelect slot="primary" value={primary} /> : org.primary_broker}
        </RField>
        {product === "DI" ? (
          <RField label="Inbound Type">
            {e.editing
              ? <select className={inputCls} defaultValue={org.inbound_type}>{INBOUND_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
              : org.inbound_type}
          </RField>
        ) : <div />}
        <RField label="Primary Override %">
          {e.editing ? <input className={inputCls} defaultValue={org.primary_override_pct ?? ""} placeholder="default" /> : renderOverride(org.primary_override_pct, org.primary_broker)}
        </RField>
        <RField label="Secondary Broker">
          {e.editing ? <BrokerSelect slot="secondary" value={secondary} /> : val(org.secondary_broker)}
        </RField>
        <div />
        <RField label="Secondary Override %">
          {e.editing ? <input className={inputCls} defaultValue={org.secondary_override_pct ?? ""} placeholder="default" /> : renderOverride(org.secondary_override_pct, org.secondary_broker)}
        </RField>
      </Grid2>

      {e.editing && creatingFor && (
        <div className="mt-4 p-4 border border-stone-300 bg-stone-50 rounded">
          <div className="mb-3">
            <div className="text-sm font-semibold text-[#0a3d3e]">New Broker</div>
            <div className="text-[11px] text-black/60 mt-0.5">
              Will be set as {creatingFor === "primary" ? "Primary" : "Secondary"} Broker for this org.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <RField label="Broker Name *">
              <input className={inputCls} value={newName} onChange={(ev) => setNewName(ev.target.value)} placeholder="e.g. Pinnacle Benefits" />
            </RField>
            <RField label="Broker Type *">
              <select className={inputCls} value={newType} onChange={(ev) => setNewType(ev.target.value as BrokerType)}>
                {BROKER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </RField>
            <RField label="Default Commission % *">
              <div className="relative">
                <input
                  className={inputCls + " pr-7"}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={newPct}
                  onChange={(ev) => setNewPct(ev.target.value)}
                  placeholder="e.g. 15"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-black/50 pointer-events-none">%</span>
              </div>
            </RField>
            <RField label="Contact Email">
              <input className={inputCls} type="email" value={newEmail} onChange={(ev) => setNewEmail(ev.target.value)} placeholder="optional" />
            </RField>
          </div>
          {formError && <div className="mt-2 text-xs text-red-600">{formError}</div>}
          <div className="mt-3 flex gap-2 justify-end">
            <Btn onClick={cancelCreate}>Cancel</Btn>
            <Btn variant="primary" onClick={saveNewBroker}>Save Broker</Btn>
          </div>
        </div>
      )}

      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

// ---------- Contacts (organization_contacts) ----------
type ContactRole = "signatory" | "hr_contact" | "billing_contact" | "ops_contact" | "primary_contact";
type OrgContact = {
  id: string;
  role: ContactRole;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

const CONTACT_ROLES: ContactRole[] = ["signatory", "hr_contact", "billing_contact", "ops_contact", "primary_contact"];
const ROLE_LABEL: Record<ContactRole, string> = {
  signatory: "Signatory",
  hr_contact: "HR",
  billing_contact: "Billing",
  ops_contact: "Ops",
  primary_contact: "Primary",
};
// Muted, distinct pill colors per role
const ROLE_PILL: Record<ContactRole, string> = {
  signatory:       "bg-amber-50 text-amber-800 border border-amber-200",
  hr_contact:      "bg-sky-50 text-sky-800 border border-sky-200",
  billing_contact: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  ops_contact:     "bg-violet-50 text-violet-800 border border-violet-200",
  primary_contact: "bg-stone-100 text-stone-700 border border-stone-300",
};

function buildDummyContacts(orgId: string, slug: string, idx: number): OrgContact[] {
  const signatoryNames = [
    ["Sarah Chen", "VP Benefits"],
    ["Marcus Holloway", "CFO"],
    ["Priya Ramanathan", "VP HR"],
    ["David Okafor", "Chief People Officer"],
    ["Elena Vasquez", "Director of Benefits"],
    ["James Whitfield", "CFO"],
    ["Aisha Brooks", "VP Total Rewards"],
    ["Noah Kimura", "Head of People Ops"],
  ];
  const opsNames = [
    ["Jordan Reyes", "555-0142"],
    ["Taylor Singh", "555-0188"],
    ["Riley Nakamura", "555-0231"],
    ["Casey Lindgren", "555-0177"],
  ];
  const hrNames = [
    ["Morgan Ellis", "HR Director"],
    ["Jamie Park", "Sr. HR Business Partner"],
  ];
  const [sigName, sigTitle] = signatoryNames[idx % signatoryNames.length];
  const [opsName, opsPhone] = opsNames[idx % opsNames.length];
  const sameAsSignatory = idx % 3 === 0; // some orgs: signatory is also primary
  const sigEmail = `${sigName.toLowerCase().replace(/[^a-z]/g, ".")}@${slug}.example.com`;
  const opsEmail = `${opsName.toLowerCase().replace(/[^a-z]/g, ".")}@${slug}.example.com`;
  const out: OrgContact[] = [
    { id: `oc_${orgId}_1`, role: "signatory", name: sigName, title: sigTitle, email: sigEmail, phone: null, is_primary: sameAsSignatory },
    { id: `oc_${orgId}_2`, role: "ops_contact", name: opsName, title: null, email: opsEmail, phone: opsPhone, is_primary: false },
  ];
  if (!sameAsSignatory) {
    const primaryName = "Alex Donovan";
    out.push({
      id: `oc_${orgId}_3`,
      role: "primary_contact",
      name: primaryName,
      title: "Benefits Program Manager",
      email: `alex.donovan@${slug}.example.com`,
      phone: "555-0119",
      is_primary: true,
    });
  }
  // Larger orgs get an HR contact
  if (idx % 2 === 0) {
    const [hrName, hrTitle] = hrNames[idx % hrNames.length];
    out.push({
      id: `oc_${orgId}_4`,
      role: "hr_contact",
      name: hrName,
      title: hrTitle,
      email: `${hrName.toLowerCase().replace(/[^a-z]/g, ".")}@${slug}.example.com`,
      phone: null,
      is_primary: false,
    });
  }
  return out;
}

type ContactDraft = Omit<OrgContact, "id"> & { id?: string };

function ContactsSection({ org, readOnly, variant }: { org: OrgDetail; readOnly: boolean; variant?: "info" | "config" | "integration" }) {
  const [contacts, setContacts] = useState<OrgContact[]>(org.contacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [adding, setAdding] = useState(false);

  const startAdd = () => {
    setEditingId(null);
    setAdding(true);
    setDraft({
      role: contacts.length === 0 ? "primary_contact" : ("" as unknown as ContactRole),
      name: "",
      title: "",
      email: "",
      phone: "",
      is_primary: contacts.length === 0,
    });
  };
  const startEdit = (c: OrgContact) => {
    setAdding(false);
    setEditingId(c.id);
    setDraft({ ...c });
  };
  const cancel = () => { setDraft(null); setEditingId(null); setAdding(false); };
  const save = () => {
    if (!draft) return;
    if (!draft.role || !draft.name.trim()) return;
    let next = [...contacts];
    if (draft.is_primary) next = next.map((c) => ({ ...c, is_primary: false }));
    if (adding) {
      next.push({
        id: `oc_${org.id}_${Date.now()}`,
        role: draft.role,
        name: draft.name.trim(),
        title: draft.title?.trim() || null,
        email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
        is_primary: draft.is_primary,
      });
    } else if (editingId) {
      next = next.map((c) => c.id === editingId ? {
        ...c,
        role: draft.role,
        name: draft.name.trim(),
        title: draft.title?.trim() || null,
        email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
        is_primary: draft.is_primary,
      } : c);
    }
    setContacts(next);
    cancel();
  };
  const remove = (c: OrgContact) => {
    if (!window.confirm(`Remove ${c.name} (${ROLE_LABEL[c.role]}) from contacts?`)) return;
    setContacts(contacts.filter((x) => x.id !== c.id));
  };

  const addAction = !readOnly && !adding && !editingId ? (
    <button
      onClick={startAdd}
      className="inline-flex items-center gap-1 text-xs font-medium text-[#0a3d3e] hover:text-[#0a3d3e]/80 px-2 py-1 rounded border border-[#0a3d3e]/20 hover:bg-[#0a3d3e]/5"
    >
      <Plus className="h-3 w-3" /> Add Contact
    </button>
  ) : null;

  return (
    <SectionCard title="Contacts" canEdit={false} variant={variant} headerExtra={addAction}>
      {contacts.length === 0 && !adding && (
        <div className="py-6 text-center">
          <div className="text-sm text-stone-500 mb-3">No contacts added. Add the first contact for this organization.</div>
          {!readOnly && (
            <button onClick={startAdd} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#0a3d3e] hover:bg-[#0a3d3e]/90 px-3 py-1.5 rounded">
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </button>
          )}
        </div>
      )}

      {contacts.length > 0 && (
        <ul className="divide-y divide-black/5">
          {contacts.map((c) => (
            <li key={c.id}>
              {editingId === c.id && draft
                ? <ContactEditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
                : (
                  <div className="flex items-center gap-3 py-2.5">
                    <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${ROLE_PILL[c.role]} shrink-0 w-[68px] text-center`}>
                      {ROLE_LABEL[c.role]}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                      {c.is_primary && <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
                      {c.title && <span className="text-xs text-stone-500 truncate">· {c.title}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.email
                        ? <a href={`mailto:${c.email}`} title={c.email} className="p-1.5 text-stone-500 hover:text-[#0a3d3e]"><Mail className="h-3.5 w-3.5" /></a>
                        : <span className="p-1.5 text-stone-300"><Mail className="h-3.5 w-3.5" /></span>}
                      {c.phone
                        ? <a href={`tel:${c.phone}`} title={c.phone} className="p-1.5 text-stone-500 hover:text-[#0a3d3e]"><Phone className="h-3.5 w-3.5" /></a>
                        : <span className="p-1.5 text-stone-300"><Phone className="h-3.5 w-3.5" /></span>}
                      {!readOnly && (
                        <>
                          <button onClick={() => startEdit(c)} className="p-1.5 text-stone-500 hover:text-[#0a3d3e]" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => remove(c)} className="p-1.5 text-stone-500 hover:text-red-600" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}

      {adding && draft && (
        <div className={contacts.length > 0 ? "border-t border-black/10 mt-2 pt-3" : ""}>
          <ContactEditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} isNew />
        </div>
      )}
    </SectionCard>
  );
}

function ContactEditRow({
  draft, setDraft, onSave, onCancel, isNew,
}: {
  draft: ContactDraft;
  setDraft: (d: ContactDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const canSave = !!draft.role && draft.name.trim().length > 0;
  return (
    <div className="py-3 bg-blue-50/40 -mx-2 px-2 rounded">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Role</label>
          <select
            className={inputCls}
            value={draft.role || ""}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as ContactRole })}
          >
            <option value="" disabled>Select…</option>
            {CONTACT_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Name *</label>
          <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Title</label>
          <input className={inputCls} value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        <div className="col-span-3 flex items-center gap-2 pb-1.5">
          <input
            id={`primary-${draft.id ?? "new"}`}
            type="checkbox"
            checked={draft.is_primary}
            onChange={(e) => setDraft({ ...draft, is_primary: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          <label htmlFor={`primary-${draft.id ?? "new"}`} className="text-xs text-stone-600">Primary contact</label>
        </div>
        <div className="col-span-6">
          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Email</label>
          <input type="email" className={inputCls} value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </div>
        <div className="col-span-6">
          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Phone</label>
          <input type="tel" className={inputCls} value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={canSave ? onSave : undefined}>{isNew ? "Add Contact" : "Save"}</Btn>
      </div>
    </div>
  );
}

function LinksRefsSection({ org, product, readOnly, variant }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean; variant?: "info" | "config" | "integration" }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Links & External References" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit} variant={variant}>
      <Grid2>
        <RField label="Google Drive Folder">
          {e.editing ? <input className={inputCls} defaultValue={org.google_drive_folder} /> : <ExtLink href={org.google_drive_folder}>Open folder</ExtLink>}
        </RField>
        <RField label="Assigned Gmail Person">{e.editing ? <input className={inputCls} defaultValue={org.assigned_gmail_person} /> : org.assigned_gmail_person}</RField>
        <RField label="Meeting Link">
          {e.editing ? <input className={inputCls} defaultValue={org.meeting_link} /> : <ExtLink href={org.meeting_link}>{org.meeting_link}</ExtLink>}
        </RField>
        <RField label="Klaviyo List">
          {e.editing
            ? <input className={inputCls} defaultValue={org.klaviyo_list_id ?? ""} placeholder="List ID (e.g. TfRk9b)" />
            : (org.klaviyo_list_id
                ? <ExtLink href={`https://www.klaviyo.com/list/${org.klaviyo_list_id}/members`}>{org.klaviyo_list_id}</ExtLink>
                : <Empty />)}
        </RField>
        
        
        <RField label="Attio Deal">
          <ExtLink href={`https://app.attio.com/deals/${org.attio_deal_id}`}><span className="font-mono text-xs">{org.attio_deal_id}</span></ExtLink>
        </RField>
        <RField label="Attio Company">
          <ExtLink href={`https://app.attio.com/companies/${org.attio_company_id}`}><span className="font-mono text-xs">{org.attio_company_id}</span></ExtLink>
        </RField>
        {product === "DI" && (
          <RField label="Next Sun Life Report Date">{e.editing ? <input className={inputCls} defaultValue={org.next_sun_life_report_date} /> : fmtDate(org.next_sun_life_report_date)}</RField>
        )}
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function PlanDetailsSection({ org, product, readOnly }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean }) {
  const e = useSectionEdit();
  const note = product === "DI"
    ? "Plan terms displayed on the enrollment microsite. Each block corresponds to one carrier product."
    : "Plan terms displayed on the enrollment microsite. Changes here update enrollee-facing content.";
  const pd = (org.plan_details ?? {}) as Record<string, unknown>;
  const isTierNested = product === "LTC" && LTC_TIERS.some((t) => t in pd) && typeof pd[LTC_TIERS[0]] === "object";
  const isDIShape = product === "DI" && ("ltd" in pd || "std" in pd);

  return (
    <SectionCard title="Plan Details" note={note} editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      {product === "DI" ? (
        isDIShape ? (
          <DIPlanDetails
            details={pd as { ltd?: Record<string, string>; std?: Record<string, string> }}
            includeStd={org.type_of_rate === "STD+LTD"}
            editing={e.editing}
          />
        ) : (
          <div className="text-sm text-black/50 italic">
            Plan details not yet configured. Click edit to add LTD plan terms.
          </div>
        )
      ) : isTierNested ? (
        <LtcTierPanels details={pd as Record<string, Record<string, string>>} editing={e.editing} />
      ) : (
        <FlatPlanDetails details={pd as Record<string, string>} editing={e.editing} />
      )}
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function DIPlanDetails({ details, includeStd, editing }: { details: { ltd?: Record<string, string>; std?: Record<string, string> }; includeStd: boolean; editing: boolean }) {
  return (
    <div className="space-y-5">
      <DISubBlock header="Long-Term Disability (LTD)" labels={LTD_LABELS} values={details.ltd ?? {}} editing={editing} />
      {includeStd && (
        <DISubBlock header="Short-Term Disability (STD)" labels={STD_LABELS} values={details.std ?? {}} editing={editing} />
      )}
    </div>
  );
}

function DISubBlock({ header, labels, values, editing }: { header: string; labels: Record<string, string>; values: Record<string, string>; editing: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-2 pb-1 border-b border-black/10">{header}</div>
      <div className="space-y-2">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="grid grid-cols-[220px_1fr] gap-3 items-start">
            <div className="text-xs font-semibold text-black/70 pt-2">{label}</div>
            {editing
              ? <Textarea defaultValue={values[key] ?? ""} className="text-sm min-h-[44px]" />
              : <div className="text-sm text-black/80 leading-relaxed pt-1">{values[key] || <Empty />}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FlatPlanDetails({ details, editing }: { details: Record<string, string>; editing: boolean }) {
  return (
    <div className="space-y-2">
      {Object.entries(details).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[220px_1fr] gap-3 items-start">
          <div className="text-xs font-semibold text-black/70 pt-2">{k}</div>
          {editing
            ? <Textarea defaultValue={v} className="text-sm min-h-[44px]" />
            : <div className="text-sm text-black/80 leading-relaxed pt-1">{v}</div>}
        </div>
      ))}
    </div>
  );
}

function LtcTierPanels({ details, editing }: { details: Record<string, Record<string, string>>; editing: boolean }) {
  const [active, setActive] = useState<typeof LTC_TIERS[number]>("bronze");
  const tier = details[active] ?? {};
  return (
    <div>
      <div className="flex gap-1 border-b border-black/10 mb-3">
        {LTC_TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-3 py-1.5 text-xs capitalize border-b-2 -mb-px ${active === t ? "border-[#0a3d3e] text-[#0a3d3e] font-medium" : "border-transparent text-black/50 hover:text-black/80"}`}
          >{t}</button>
        ))}
      </div>
      <div className="space-y-2">
        {Object.entries(tier).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[220px_1fr] gap-3 items-start">
            <div className="text-xs font-semibold text-black/70 pt-2 capitalize">{k.replace(/_/g, " ")}</div>
            {editing
              ? <Textarea defaultValue={v} className="text-sm min-h-[44px]" />
              : <div className="text-sm text-black/80 leading-relaxed pt-1">{v}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CarrierIdentifiersSection({ org, readOnly, variant }: { org: OrgDetail; readOnly: boolean; variant?: "info" | "config" | "integration" }) {
  const e = useSectionEdit();
  // Left column: Case ID, Enrollment ID (Carrier), Form Number, Agent Number
  // Right column: Benefit System, Rider Codes, Application Questions
  return (
    <SectionCard
      title="Carrier Identifiers"
      note="Carrier-assigned identifiers and configuration. Set during initial onboarding."
      editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}
      variant={variant}
    >
      <Grid2>
        <RField label="Case ID">{e.editing ? <input className={inputCls} defaultValue={org.case_id} /> : <span className="font-mono text-xs">{org.case_id}</span>}</RField>
        <RField label="Benefit System">{e.editing ? <input className={inputCls} defaultValue={org.benefit_system} /> : org.benefit_system}</RField>
        <RField label="Enrollment ID (Carrier)">{e.editing ? <input className={inputCls} defaultValue={org.enrollment_id_carrier} /> : <span className="font-mono text-xs">{org.enrollment_id_carrier}</span>}</RField>
        <RField label="Rider Codes">
          {e.editing
            ? <input className={inputCls} defaultValue={org.rider_codes.join(", ")} placeholder="comma-separated" />
            : (
              <div className="flex flex-wrap gap-1">
                {org.rider_codes.map((r) => <span key={r} className="px-1.5 py-0.5 rounded text-[11px] bg-[#d4b87a]/40 text-[#0a3d3e] font-mono">{r}</span>)}
              </div>
            )}
        </RField>
        <RField label="Form Number">{e.editing ? <input className={inputCls} defaultValue={org.form_number} /> : <span className="font-mono text-xs">{org.form_number}</span>}</RField>
        <RField label="Application Questions">
          {e.editing
            ? <Textarea defaultValue={org.application_questions.join("\n")} className="text-sm min-h-[88px]" placeholder="One question per line" />
            : (
              <ol className="list-decimal pl-4 text-xs text-black/70 space-y-0.5">
                {org.application_questions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            )}
        </RField>
        <RField label="Agent Number">{e.editing ? <input className={inputCls} defaultValue={org.agent_number} /> : <span className="font-mono text-xs">{org.agent_number}</span>}</RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function EmployerBillingSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Employer Billing" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Employer Moov Account ID"><span className="font-mono text-xs">{org.employer_moov_account_id}</span></RField>
        <RField label="Payment Method Type">{val(org.employer_payment_method_type)}</RField>
        <RField label="Payment Method ID"><span className="font-mono text-xs">{org.employer_payment_method_id}</span></RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function SystemRefsSection({ org, product, variant }: { org: OrgDetail; product: "DI" | "LTC"; variant?: "info" | "config" | "integration" }) {
  return (
    <SectionCard title="System References" variant={variant}>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[11px]">
        <Ref label="Created At" value={org.created_at} />
        <Ref label="Updated At" value={org.updated_at} />
        <Ref label="Attio Deal ID" value={org.attio_deal_id} />
        <Ref label="Attio Company ID" value={org.attio_company_id} />
        <Ref label="Rate Sheet ID (legacy)" value={org.rate_sheet_id} muted />
        <Ref label="Gmail Label ID" value={org.gmail_label_id} muted />
        {product === "LTC" && (
          <>
            <Ref label="LTC Enrollment Phase" value={org.ltc_enrollment_phase} />
            <Ref label="LTC One Week To Go" value={fmtDate(org.ltc_one_week_to_go)} />
          </>
        )}
      </div>
    </SectionCard>
  );
}

function Ref({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="mb-1">
      <div className="text-[9px] uppercase tracking-wider text-black/40 mb-0.5 font-sans">{label}</div>
      <div className={`${muted ? "text-black/40" : "text-black/70"} break-all`}>{value || "—"}</div>
    </div>
  );
}

/* =============================================================
   FEES / WINDOWS / BENEFIT CLASSES / NEW JOINER  (unchanged)
============================================================= */


function BenefitClassesTab({ classes, onNew, onEdit, canEdit, canCreate }: {
  classes: typeof BENEFIT_CLASSES; onNew: () => void; onEdit: (c: typeof BENEFIT_CLASSES[number]) => void; canEdit: boolean; canCreate: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <div className="flex justify-end mb-2">
        <Btn variant="primary" disabled={!canCreate} onClick={onNew}>+ New Benefit Class</Btn>
      </div>
      <TableShell>
        <THead cols={["", "Name", "GI Offer", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "# Rate Cells", "Last Rate Update", "Default"]} />
        <tbody>
          {classes.map((c) => {
            const bronzeAbsent = c.gi_offer_cents <= 5000000;
            const cells = LTC_RATE_CELLS.filter((r) => r.benefit_class_id === c.id);
            const lastUpdate = cells.length > 0 ? cells.map((r) => r.effective_date).sort().slice(-1)[0] : null;
            const isOpen = expanded === c.id;
            const hasRates = cells.length > 0;
            return (
              <React.Fragment key={c.id}>
                <TRow onClick={canEdit ? () => onEdit(c) : undefined}>
                  <TCell className="w-6" onClick={(e) => { e.stopPropagation(); if (hasRates) setExpanded(isOpen ? null : c.id); }}>
                    {hasRates ? (
                      <button className="text-black/60 hover:text-black" title={isOpen ? "Collapse" : "Expand rates"}>
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="text-black/20" title="No rates configured for this benefit class. Click Add Rate to start.">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </TCell>
                  <TCell className="font-medium">{c.name}</TCell>
                  <TCell>{formatCents(c.gi_offer_cents)}</TCell>
                  <TCell>
                    {bronzeAbsent
                      ? <span className="text-black/30" title="Bronze tier absent because GI offer is $50K or below">—</span>
                      : formatCents(c.bronze)}
                  </TCell>
                  <TCell>{formatCents(c.silver)}</TCell>
                  <TCell>{formatCents(c.gold)} <span className="text-[10px] text-black/40">(= GI)</span></TCell>
                  <TCell>{formatCents(c.platinum)}</TCell>
                  <TCell>{formatCents(c.diamond)}</TCell>
                  <TCell>{cells.length}</TCell>
                  <TCell>{lastUpdate ? fmtDate(lastUpdate) : <span className="text-black/30">—</span>}</TCell>
                  <TCell>{c.is_default ? <Pill tone="ok">Default</Pill> : null}</TCell>
                </TRow>
                {isOpen ? (
                  <tr className="bg-[#f7f3eb]/40 border-t border-black/5">
                    <td colSpan={11} className="p-3">
                      <LTCRatePanel benefitClassId={c.id} benefitClassName={c.name} />
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}

/* ---------- LTC Rate matrix panel (nested under benefit_class) ---------- */
function LTCRatePanel({ benefitClassId, benefitClassName }: { benefitClassId: string; benefitClassName: string }) {
  const [smoker, setSmoker] = useState<"non_tobacco" | "tobacco">("non_tobacco");
  const [importOpen, setImportOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cells, setCells] = useState<LTCRateCell[]>(() => LTC_RATE_CELLS.filter((r) => r.benefit_class_id === benefitClassId));
  const [editing, setEditing] = useState<string | null>(null); // cell id being edited
  const [editValue, setEditValue] = useState("");

  const visible = cells.filter((r) => r.smoker_status === smoker);
  const allTiers: Array<LTCRateCell["tier"]> = ["bronze","silver","gold","platinum","diamond"];
  const presentTiers = allTiers.filter((t) => cells.some((r) => r.tier === t));
  const ages = Array.from(new Set(visible.map((r) => r.issue_age))).sort((a, b) => a - b);
  const cellMap = new Map<string, LTCRateCell>();
  for (const r of visible) cellMap.set(`${r.issue_age}_${r.tier}`, r);

  const carrierProductId = cells[0]?.carrier_product_id;
  const carrierProduct = CARRIER_PRODUCTS.find((cp) => cp.id === carrierProductId);
  const carrierName = carrierProduct ? CARRIERS.find((c) => c.id === carrierProduct.carrier_id)?.carrier_name ?? "" : "";
  const lastEffective = cells.length ? cells.map((r) => r.effective_date).sort().slice(-1)[0] : null;
  const sourceCounts = new Map<string, number>();
  for (const r of cells) sourceCounts.set(r.source, (sourceCounts.get(r.source) ?? 0) + 1);
  const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const nominalRefBits = allTiers
    .map((t) => {
      const c = cells.find((r) => r.tier === t);
      if (!c) return null;
      return `${t[0].toUpperCase()}${t.slice(1)}: ${formatCents(c.nominal_death_benefit_cents)}`;
    })
    .filter(Boolean)
    .join(" · ");

  function startEdit(id: string, val: number) {
    setEditing(id);
    setEditValue((val / 100).toFixed(2));
  }
  function commitEdit(id: string) {
    const cents = Math.round(Number(editValue) * 100);
    if (!isNaN(cents)) {
      setCells((prev) => prev.map((r) => (r.id === id ? { ...r, monthly_premium_cents: cents } : r)));
    }
    setEditing(null);
  }

  function addRate(form: { issue_age: number; tier: LTCRateCell["tier"]; nominal: number; death: number; premium: number; effective: string }) {
    const newCell: LTCRateCell = {
      id: `lrc_${benefitClassId}_${Date.now()}`,
      benefit_class_id: benefitClassId,
      carrier_product_id: carrierProductId ?? "cp_6",
      smoker_status: smoker,
      issue_age: form.issue_age,
      tier: form.tier,
      nominal_death_benefit_cents: Math.round(form.nominal * 100),
      death_benefit_cents: Math.round(form.death * 100),
      monthly_premium_cents: Math.round(form.premium * 100),
      effective_date: form.effective,
      source: "manual_entry",
    };
    setCells((prev) => [...prev, newCell]);
    setAdding(false);
  }

  return (
    <div className="bg-white border border-black/10 rounded">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
        <div className="text-xs font-semibold">Rates for {benefitClassName}</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-black/15 overflow-hidden text-[11px]">
            {(["non_tobacco","tobacco"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSmoker(s)}
                className={`px-2 py-1 ${smoker === s ? "bg-[#0a3d3e] text-white" : "bg-white text-[#0a3d3e] hover:bg-black/5"}`}
              >{s === "non_tobacco" ? "Non-Tobacco" : "Tobacco"}</button>
            ))}
          </div>
          <Btn onClick={() => setAdding((v) => !v)} variant="primary">+ Add Rate</Btn>
          <Btn onClick={() => setImportOpen(true)}>Import from Carrier Proposal</Btn>
        </div>
      </div>

      {adding ? (
        <AddRateForm onCancel={() => setAdding(false)} onSubmit={addRate} smoker={smoker} tiers={presentTiers.length ? presentTiers : allTiers} defaultEffective={lastEffective ?? "2025-01-01"} />
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>
              <th className="text-left font-medium px-3 py-2">Issue Age</th>
              {presentTiers.map((t) => (
                <th key={t} className="text-right font-medium px-3 py-2 capitalize">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ages.map((age) => (
              <tr key={age} className="border-t border-black/5">
                <td className="px-3 py-1.5 font-medium">{age}</td>
                {presentTiers.map((t) => {
                  const c = cellMap.get(`${age}_${t}`);
                  if (!c) return <td key={t} className="px-3 py-1.5 text-right text-black/25">—</td>;
                  const isEdit = editing === c.id;
                  return (
                    <td key={t} className="px-3 py-1.5 text-right font-mono">
                      {isEdit ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(c.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(c.id); if (e.key === "Escape") setEditing(null); }}
                          className="w-20 px-1 py-0.5 text-xs border border-black/30 rounded text-right"
                        />
                      ) : (
                        <button onClick={() => startEdit(c.id, c.monthly_premium_cents)} className="hover:bg-black/5 rounded px-1">
                          {formatCents(c.monthly_premium_cents)}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {ages.length === 0 ? (
              <tr><td colSpan={presentTiers.length + 1} className="px-3 py-4 text-center text-black/40">No rates for this smoker status. Use Add Rate to start.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-t border-black/10 text-[10px] text-black/55 flex flex-wrap gap-x-4 gap-y-1">
        <span>Carrier product: <span className="text-black/75">{carrierName ? `${carrierName} - ${carrierProduct?.product_name}` : "—"}</span></span>
        <span>Effective date: <span className="text-black/75">{lastEffective ? fmtDate(lastEffective) : "—"}</span></span>
        <span>Source: <span className="text-black/75">{topSource ?? "—"}</span></span>
        {nominalRefBits ? <span>Nominal: <span className="text-black/75">{nominalRefBits}</span></span> : null}
      </div>

      <Drawer open={importOpen} onClose={() => setImportOpen(false)} title="Import from Carrier Proposal">
        <div className="text-xs text-black/60 mb-3">
          Standard format: carrier rate sheets are pasted as Age x Tier matrices per smoker status.
          The import deactivates prior rates for the same benefit_class + smoker_status + age + tier combinations.
        </div>
        <div className="border-2 border-dashed border-black/20 rounded p-6 text-center text-xs text-black/40 mb-3">
          Drop carrier proposal here, or click to browse
        </div>
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">Preview</div>
        <div className="border border-black/10 rounded p-2 text-xs text-black/60 mb-3">
          25 cells would be imported across ages 25-65, tiers bronze-platinum, smoker status non_tobacco.
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" onClick={() => setImportOpen(false)}>Confirm Import</Btn>
          <Btn onClick={() => setImportOpen(false)}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}

function AddRateForm({ onCancel, onSubmit, smoker, tiers, defaultEffective }: {
  onCancel: () => void;
  onSubmit: (form: { issue_age: number; tier: LTCRateCell["tier"]; nominal: number; death: number; premium: number; effective: string }) => void;
  smoker: "non_tobacco" | "tobacco";
  tiers: Array<LTCRateCell["tier"]>;
  defaultEffective: string;
}) {
  const [age, setAge] = useState("45");
  const [tier, setTier] = useState<LTCRateCell["tier"]>(tiers[0] ?? "bronze");
  const [nominal, setNominal] = useState("25000");
  const [death, setDeath] = useState("25000");
  const [premium, setPremium] = useState("50.00");
  const [effective, setEffective] = useState(defaultEffective);
  return (
    <div className="px-3 py-2 bg-[#f7f3eb]/60 border-b border-black/10">
      <div className="grid grid-cols-7 gap-2 items-end text-xs">
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Issue Age</span>
          <input value={age} onChange={(e) => setAge(e.target.value)} className="px-1.5 py-1 border border-black/15 rounded" /></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Smoker</span>
          <input value={smoker} disabled className="px-1.5 py-1 border border-black/10 bg-black/5 rounded text-black/50" /></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as LTCRateCell["tier"])} className="px-1.5 py-1 border border-black/15 rounded">
            {(["bronze","silver","gold","platinum","diamond"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Nominal $</span>
          <input value={nominal} onChange={(e) => setNominal(e.target.value)} className="px-1.5 py-1 border border-black/15 rounded" /></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Death $</span>
          <input value={death} onChange={(e) => setDeath(e.target.value)} className="px-1.5 py-1 border border-black/15 rounded" /></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Premium $/mo</span>
          <input value={premium} onChange={(e) => setPremium(e.target.value)} className="px-1.5 py-1 border border-black/15 rounded" /></label>
        <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-black/50">Effective</span>
          <input value={effective} onChange={(e) => setEffective(e.target.value)} className="px-1.5 py-1 border border-black/15 rounded" /></label>
      </div>
      <div className="flex gap-2 mt-2">
        <Btn variant="primary" onClick={() => onSubmit({ issue_age: Number(age) || 0, tier, nominal: Number(nominal) || 0, death: Number(death) || 0, premium: Number(premium) || 0, effective })}>Save</Btn>
        <Btn onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ---------- DI Rates tab ---------- */
function DIRatesTab({ orgId, canEdit, canCreate }: { orgId: string; canEdit: boolean; canCreate: boolean }) {
  const [rows, setRows] = useState<DIRateRow[]>(() => DI_RATE_CONFIG.filter((r) => r.organization_id === orgId));
  const [classFilter, setClassFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [currentOnly, setCurrentOnly] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DIRateRow>>({});

  const today = "2026-06-15";
  const classOptions = Array.from(new Set(rows.map((r) => r.employee_class)));
  const productOptions = Array.from(new Set(rows.map((r) => r.product)));

  const visible = rows.filter((r) => {
    if (classFilter !== "all" && r.employee_class !== classFilter) return false;
    if (productFilter !== "all" && r.product !== productFilter) return false;
    if (currentOnly && r.effective_to && r.effective_to < today) return false;
    return true;
  });

  function startEdit(r: DIRateRow) {
    setEditing(r.id);
    setDraft({ ...r });
  }
  function saveEdit() {
    if (!editing) return;
    setRows((prev) => prev.map((r) => (r.id === editing ? { ...r, ...draft } as DIRateRow : r)));
    setEditing(null);
    setDraft({});
  }
  function deactivate(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, effective_to: today } : r)));
  }
  function createRow() {
    const id = `dir_new_${Date.now()}`;
    const r: DIRateRow = {
      id,
      organization_id: orgId,
      employee_class: String(draft.employee_class ?? "Standard"),
      age_band: String(draft.age_band ?? "30-39"),
      product: String(draft.product ?? "Group LTD"),
      rate_per_unit: Number(draft.rate_per_unit ?? 0),
      benefit_percentage: Number(draft.benefit_percentage ?? 60),
      effective_from: String(draft.effective_from ?? today),
      effective_to: null,
      source: "manual_entry",
    };
    setRows((prev) => [r, ...prev]);
    setAdding(false);
    setDraft({});
  }

  return (
    <div className="mt-3">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold">Rates</h2>
          <div className="text-xs text-black/55">Sun Life rate schedule for this organization. Rates per $1,000 of coverage per month.</div>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" disabled={!canCreate} onClick={() => { setAdding(true); setDraft({ effective_from: today, benefit_percentage: 60, product: productOptions[0] ?? "Group LTD" }); }}>+ Add Rate Row</Btn>
          <Btn onClick={() => setImportOpen(true)}>Import from CSV</Btn>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-black/55">Class:</span>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-1.5 py-0.5 border border-black/15 rounded bg-white">
            <option value="all">All</option>
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-black/55">Product:</span>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="px-1.5 py-0.5 border border-black/15 rounded bg-white">
            <option value="all">All</option>
            {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 ml-2">
          <input type="checkbox" checked={currentOnly} onChange={(e) => setCurrentOnly(e.target.checked)} />
          <span className="text-black/70">Show current only</span>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded p-6 text-center text-sm text-black/55">
          No rates configured. Add a rate row or import from CSV.
        </div>
      ) : (
        <TableShell>
          <THead cols={["Employee Class","Age Band","Product","Rate / $1,000","Benefit %","Effective From","Effective To","Source","Actions"]} />
          <tbody>
            {adding ? (
              <tr className="border-t border-black/5 bg-[#f7f3eb]/60">
                <td className="px-2 py-1"><input value={String(draft.employee_class ?? "")} onChange={(e) => setDraft({ ...draft, employee_class: e.target.value })} className="w-full px-1 py-0.5 border border-black/15 rounded text-xs" placeholder="Class" /></td>
                <td className="px-2 py-1"><input value={String(draft.age_band ?? "")} onChange={(e) => setDraft({ ...draft, age_band: e.target.value })} className="w-full px-1 py-0.5 border border-black/15 rounded text-xs" placeholder="30-39" /></td>
                <td className="px-2 py-1"><input value={String(draft.product ?? "")} onChange={(e) => setDraft({ ...draft, product: e.target.value })} className="w-full px-1 py-0.5 border border-black/15 rounded text-xs" /></td>
                <td className="px-2 py-1"><input value={String(draft.rate_per_unit ?? "")} onChange={(e) => setDraft({ ...draft, rate_per_unit: Number(e.target.value) })} className="w-20 px-1 py-0.5 border border-black/15 rounded text-xs font-mono" placeholder="0.50" /></td>
                <td className="px-2 py-1"><input value={String(draft.benefit_percentage ?? "")} onChange={(e) => setDraft({ ...draft, benefit_percentage: Number(e.target.value) })} className="w-16 px-1 py-0.5 border border-black/15 rounded text-xs" /></td>
                <td className="px-2 py-1"><input value={String(draft.effective_from ?? "")} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} className="w-28 px-1 py-0.5 border border-black/15 rounded text-xs" /></td>
                <td className="px-2 py-1 text-black/40">Current</td>
                <td className="px-2 py-1 text-black/40">manual_entry</td>
                <td className="px-2 py-1">
                  <div className="flex gap-1">
                    <Btn variant="primary" onClick={createRow}>Save</Btn>
                    <Btn onClick={() => { setAdding(false); setDraft({}); }}>Cancel</Btn>
                  </div>
                </td>
              </tr>
            ) : null}
            {visible.map((r) => {
              const isEdit = editing === r.id;
              const current = !r.effective_to || r.effective_to >= today;
              return (
                <TRow key={r.id}>
                  <TCell>{isEdit ? <input value={String(draft.employee_class ?? "")} onChange={(e) => setDraft({ ...draft, employee_class: e.target.value })} className="px-1 py-0.5 border border-black/15 rounded text-xs" /> : r.employee_class}</TCell>
                  <TCell>{isEdit ? <input value={String(draft.age_band ?? "")} onChange={(e) => setDraft({ ...draft, age_band: e.target.value })} className="w-16 px-1 py-0.5 border border-black/15 rounded text-xs" /> : r.age_band}</TCell>
                  <TCell>{isEdit ? <input value={String(draft.product ?? "")} onChange={(e) => setDraft({ ...draft, product: e.target.value })} className="px-1 py-0.5 border border-black/15 rounded text-xs" /> : r.product}</TCell>
                  <TCell className="font-mono">{isEdit
                    ? <input value={String(draft.rate_per_unit ?? "")} onChange={(e) => setDraft({ ...draft, rate_per_unit: Number(e.target.value) })} className="w-20 px-1 py-0.5 border border-black/15 rounded text-xs font-mono" />
                    : `$${r.rate_per_unit.toFixed(2)}`}</TCell>
                  <TCell>{isEdit
                    ? <input value={String(draft.benefit_percentage ?? "")} onChange={(e) => setDraft({ ...draft, benefit_percentage: Number(e.target.value) })} className="w-14 px-1 py-0.5 border border-black/15 rounded text-xs" />
                    : `${r.benefit_percentage}%`}</TCell>
                  <TCell>{fmtDate(r.effective_from)}</TCell>
                  <TCell>{r.effective_to ? fmtDate(r.effective_to) : <Pill tone="ok">Current</Pill>}</TCell>
                  <TCell>
                    <Pill tone={r.source === "sun_life_rate_sheet" ? "info" : "neutral"}>
                      {r.source === "sun_life_rate_sheet" ? "Sun Life sheet" : r.source === "manual_entry" ? "Manual" : r.source}
                    </Pill>
                  </TCell>
                  <TCell>
                    {isEdit ? (
                      <div className="flex gap-1">
                        <Btn variant="primary" onClick={saveEdit}>Save</Btn>
                        <Btn onClick={() => { setEditing(null); setDraft({}); }}>Cancel</Btn>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button disabled={!canEdit} onClick={() => startEdit(r)} className="p-1 hover:bg-black/5 rounded disabled:opacity-30" title="Edit">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button disabled={!canEdit || !current} onClick={() => deactivate(r.id)} className="p-1 hover:bg-black/5 rounded disabled:opacity-30" title="Deactivate (sets Effective To = today)">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </TCell>
                </TRow>
              );
            })}
            {visible.length === 0 && !adding ? (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-black/40">No rate rows match the current filters.</td></tr>
            ) : null}
          </tbody>
        </TableShell>
      )}

      <Drawer open={importOpen} onClose={() => setImportOpen(false)} title="Import Rates from CSV">
        <div className="text-xs text-black/60 mb-3">
          CSV format: employee_class, age_band, product, rate_per_unit, benefit_percentage, effective_from.
          Existing rows with the same (class, age_band, product) and overlapping effective dates will be deactivated.
        </div>
        <div className="border-2 border-dashed border-black/20 rounded p-6 text-center text-xs text-black/40 mb-3">
          Drop CSV here, or click to browse
        </div>
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">Preview</div>
        <TableShell>
          <THead cols={["Class","Age Band","Product","Rate","Benefit %","Effective"]} />
          <tbody>
            {[
              ["Standard","18-29","Group LTD","$0.34","60%","2026-07-01"],
              ["Standard","30-39","Group LTD","$0.51","60%","2026-07-01"],
              ["Standard","40-49","Group LTD","$0.78","60%","2026-07-01"],
            ].map((row, i) => (
              <TRow key={i}>{row.map((c, j) => <TCell key={j} className={j === 3 ? "font-mono" : ""}>{c}</TCell>)}</TRow>
            ))}
          </tbody>
        </TableShell>
        <div className="flex gap-2 mt-3">
          <Btn variant="primary" onClick={() => setImportOpen(false)}>Confirm Import</Btn>
          <Btn onClick={() => setImportOpen(false)}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}


