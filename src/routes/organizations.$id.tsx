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
  ORGS, BENEFIT_CLASSES, INDIVIDUALS, CARRIERS,
  COMMISSION_SPLIT_DEFAULTS, formatCents,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { ChevronLeft, ChevronDown, ChevronRight, Pencil, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/organizations/$id")({ component: OrgDetail });

// Enum vocabularies (mirror prod CHECK constraints)
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const INDUSTRIES = ["education","healthcare","government","manufacturing","professional_services","transportation","hospitality","other"];
const ORG_TYPES = ["Employer Group","Association","Union","PEO","CPA Firm","P&C Firm"];
const ORG_STATUSES = ["active","pending_review","closed","suspended"];
const DI_HC_TYPES = ["MSO","Healthcare Practice","Medical Group","Dental","Other","General"];
const WINDOW_TYPES = ["initial","annual","new_joiner","special"];
const SPONSOR_TYPES = ["employer","affiliate"];
const WINDOW_STATUSES = ["upcoming","open","closed"];
const CARRIER_NAMES = [...new Set([...CARRIERS.map(c => c.name), "Sun Life", "Trustmark", "Transamerica", "MGIS"])];
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
const PAY_MODES = ["Monthly","10-Pay"];

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
    // Carrier & Product (dummy)
    carrier_name: carrierForProduct(product),
    carrier_product_name: carrierProductLabel(product, org.type_of_rate),
    group_policy_number: product === "DI" ? `GP-${10000000 + idx * 137}` : null,
    policy_effective_date: "2025-01-01",
    // Klaviyo
    klaviyo_list_id: ["TfRk9b","X4mP2q","Lz8Yhn","aQ3Wpv","R7nB2k","dE9Lto","Vc5Mxs","Jh1Knu"][idx % 8],
    // Coverage / Billing
    contribution_type: cca ? "voluntary" : "employer_paid",
    pay_mode: "Monthly",
    tpa_fee_cents: cca ? 2000 : 800,
    service_fee_retained_cents: cca ? 500 : null,
    tpa_fee_name: cca ? "CCA Membership Fee" : "Processing Fee",
    // Broker
    primary_broker: "Westfield Brokers",
    primary_override_pct: null as number | null,
    secondary_broker: null as string | null,
    secondary_override_pct: null as number | null,
    // Signatory
    signatory_name: "Test Signatory",
    signatory_title: "VP HR",
    signatory_email: `signatory@${slug}.example.com`,
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
        </TabsList>

        <TabsContent value="setup">
          <SetupTab org={org} product={product} readOnly={readOnly} isAdmin={role === "admin"} />
        </TabsContent>
        <TabsContent value="lifecycle">
          <LifecycleTab
            windows={windows}
            orgName={org.name}
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
  const statusValue = org.enrollment_status === "active" ? "active" : org.enrollment_status === "closed" ? "closed" : "pending_review";
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
        <BrokerSection org={org} product={product} readOnly={readOnly} />
        <PeopleSection org={org} readOnly={readOnly} />
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
  windows, orgName, onNew, onEdit, canEdit, canCreate, readOnly,
}: {
  windows: typeof DUMMY_WINDOWS;
  orgName: string;
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
  variant = "config", drives,
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
        <RField label="Carrier">{org.carrier_name}</RField>
        <RField label="Effective Date">
          {e.editing
            ? <input className={inputCls} type="date" defaultValue={org.policy_effective_date} />
            : fmtDate(org.policy_effective_date)}
        </RField>
        <RField label="Product">{org.carrier_product_name}</RField>
        {product === "LTC" ? (
          <RField label="Carrier Commission Schedule">
            <Link to="/carriers" className="text-sky-700 hover:underline inline-flex items-center gap-1">View schedule <ExternalLink className="h-3 w-3" /></Link>
          </RField>
        ) : (
          <RField label="Carrier Commission Rates">
            <span className="text-xs text-black/60 italic">Per-policy commission rates</span>
          </RField>
        )}
        {product === "DI" && (
          <RField label="Group Policy Number">
            {e.editing
              ? <input className={inputCls} defaultValue={org.group_policy_number ?? ""} />
              : <span className="font-mono text-xs">{org.group_policy_number}</span>}
          </RField>
        )}
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

function PricingFeesSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const cca = org.cca_group;
  const tpa = org.tpa_fee_cents;
  const retained = org.service_fee_retained_cents;
  return (
    <SectionCard
      title="Pricing & Fees"
      defaultOpen
      editing={e.editing}
      canEdit={!readOnly}
      onEdit={e.onEdit}
      drives={["billing", "payment processing"]}
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">Billing Configuration</div>
          <div className="space-y-4">
            <RField label="Contribution Type">
              {e.editing
                ? <select className={inputCls} defaultValue={org.contribution_type}>{CONTRIBUTION_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
                : titleCase(org.contribution_type === "buy_up" ? "Buy-Up" : org.contribution_type)}
            </RField>
            <RField label="Pay Mode">
              {e.editing
                ? <select className={inputCls} defaultValue={org.pay_mode}>{PAY_MODES.map((o) => <option key={o}>{o}</option>)}</select>
                : org.pay_mode}
            </RField>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">Fee Schedule</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <RField label="TPA Fee">{e.editing ? <input className={inputCls} defaultValue={String(tpa / 100)} /> : `${formatCents(tpa)} / mo`}</RField>
            <RField label="TPA Fee Name">{e.editing ? <input className={inputCls} defaultValue={org.tpa_fee_name} /> : org.tpa_fee_name}</RField>
            <RField label="Service Fee Retained">
              {retained === null
                ? <span className="text-black/60 italic">Full retention</span>
                : (e.editing ? <input className={inputCls} defaultValue={String(retained / 100)} /> : formatCents(retained))}
            </RField>
            <RField label="Card Percentage">{e.editing ? <input className={inputCls} defaultValue="3.7" /> : "3.7%"}</RField>
            <RField label="ACH First Fee">{e.editing ? <input className={inputCls} defaultValue="1.00" /> : "$1.00"}</RField>
            <RField label="ACH Subsequent Fee">{e.editing ? <input className={inputCls} defaultValue="0.50" /> : "$0.50"}</RField>
            <RField label="Failed ACH Penalty">{e.editing ? <input className={inputCls} defaultValue="15.00" /> : "$15.00"}</RField>
            <RField label="Failed Card Penalty Mode">
              {e.editing
                ? <select className={inputCls} defaultValue="flat">{["flat","percentage"].map((o) => <option key={o}>{o}</option>)}</select>
                : "flat"}
            </RField>
            <RField label="Failed Card Penalty Value">{e.editing ? <input className={inputCls} defaultValue="10.00" /> : "$10.00"}</RField>
            <RField label="Free Retry Count">{e.editing ? <input className={inputCls} type="number" defaultValue={2} /> : 2}</RField>
            <RField label="Effective From">{e.editing ? <input className={inputCls} type="date" defaultValue="2025-01-01" /> : fmtDate("2025-01-01")}</RField>
            <RField label="Effective To">{e.editing ? <input className={inputCls} type="date" defaultValue="" placeholder="(open-ended)" /> : <span className="text-black/50 italic">(open-ended)</span>}</RField>
          </div>
        </div>
      </div>

      {cca && (
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="p-3 bg-[#fefaf2] border border-amber-200 rounded">
            <div className="text-xs font-semibold text-amber-900 mb-2">How CCA fee splitting works</div>
            <p className="text-xs text-black/70 leading-relaxed mb-2">
              CCA orgs charge a <b>$20/month</b> membership fee (not the standard $8 TPA fee). Of the $20:
            </p>
            <ul className="text-xs text-black/70 list-disc pl-5 space-y-1 mb-2">
              <li><b>$5.00</b> retained by Hollowtree (<code>service_fee_retained_cents = 500</code>)</li>
              <li><b>$15.00</b> remitted to CCA</li>
            </ul>
            <p className="text-xs text-black/60 italic">
              This split is for reporting only. The <code>tpa_fee_cents</code> value is what the enrollee is charged regardless.
            </p>
          </div>
          <div className="p-3 bg-white border border-black/10 rounded">
            <div className="text-xs font-semibold text-black/70 uppercase tracking-wider mb-2">Worked example for this org</div>
            <div className="text-xs text-black/70 space-y-1">
              <div>Enrollee charged: <b>{formatCents(tpa)}</b> / mo</div>
              <div>Retained by Hollowtree: <b>{retained === null ? formatCents(tpa) + " (full)" : formatCents(retained)}</b></div>
              <div>Remitted to CCA: <b>{retained === null ? formatCents(0) : formatCents(tpa - retained)}</b></div>
            </div>
          </div>
        </div>
      )}

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

function PeopleSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="People" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit} drives={["carrier handoff", "operational comms"]}>
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">Signatory</div>
        <Grid2>
          <RField label="Name">{e.editing ? <input className={inputCls} defaultValue={org.signatory_name} /> : org.signatory_name}</RField>
          <RField label="Email">{e.editing ? <input className={inputCls} defaultValue={org.signatory_email} /> : org.signatory_email}</RField>
          <RField label="Title">{e.editing ? <input className={inputCls} defaultValue={org.signatory_title} /> : org.signatory_title}</RField>
        </Grid2>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0a3d3e] mb-3 pb-1 border-b border-black/10">Operations</div>
        <Grid2>
          <RField label="Ops Contact">
            {e.editing
              ? <input className={inputCls} type="email" defaultValue={org.assigned_gmail_person} />
              : (org.assigned_gmail_person
                  ? <a href={`mailto:${org.assigned_gmail_person}`} className="text-sky-700 hover:underline">{org.assigned_gmail_person}</a>
                  : <Empty />)}
          </RField>
        </Grid2>
      </div>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
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

function CarrierOperationalSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard
      title="Carrier / Operational"
      note="Carrier-assigned identifiers and configuration. Typically set during initial setup."
      editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}
    >
      <Grid2>
        <RField label="Case ID">{e.editing ? <input className={inputCls} defaultValue={org.case_id} /> : <span className="font-mono text-xs">{org.case_id}</span>}</RField>
        <RField label="Benefit System">{e.editing ? <input className={inputCls} defaultValue={org.benefit_system} /> : org.benefit_system}</RField>
        <RField label="Enrollment ID (Carrier)">{e.editing ? <input className={inputCls} defaultValue={org.enrollment_id_carrier} /> : <span className="font-mono text-xs">{org.enrollment_id_carrier}</span>}</RField>
        <RField label="Rider Codes">
          <div className="flex flex-wrap gap-1">
            {org.rider_codes.map((r) => <span key={r} className="px-1.5 py-0.5 rounded text-[11px] bg-[#d4b87a]/40 text-[#0a3d3e] font-mono">{r}</span>)}
          </div>
        </RField>
        <RField label="Form Number">{e.editing ? <input className={inputCls} defaultValue={org.form_number} /> : <span className="font-mono text-xs">{org.form_number}</span>}</RField>
        <RField label="Application Questions">
          <ol className="list-decimal pl-4 text-xs text-black/70 space-y-0.5">
            {org.application_questions.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
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
  return (
    <div className="mt-3">
      <div className="flex justify-end mb-2">
        <Btn variant="primary" disabled={!canCreate} onClick={onNew}>+ New Benefit Class</Btn>
      </div>
      <TableShell>
        <THead cols={["Name", "GI Offer", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Default"]} />
        <tbody>
          {classes.map((c) => {
            const bronzeAbsent = c.gi_offer_cents <= 5000000;
            return (
              <TRow key={c.id} onClick={canEdit ? () => onEdit(c) : undefined}>
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
                <TCell>{c.is_default ? <Pill tone="ok">Default</Pill> : null}</TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}

