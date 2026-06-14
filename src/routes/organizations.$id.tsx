import * as React from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  PageHeader, Card, Field, Btn, Pill, TableShell, THead, TRow, TCell, ProductBadge,
  Drawer, useDrawer, Input,
} from "@/components/wireframe/Bits";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ORGS, BENEFIT_CLASSES, INDIVIDUALS, POLICIES, PAYMENT_LEDGER, CARRIERS,
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
const BROKERS = ["Westfield Brokers","Hollowtree House","Override Group LLC","Jamie Rep"];
const PRODUCT_TEMPLATE_VARIANTS = ["base","eob_only","restoration_only","eob_and_restoration"];
const CONTRIBUTION_TYPES = ["voluntary","buy_up","employer_paid"];
const PAY_MODES = ["Monthly","10-Pay"];

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
  return {
    ...org,
    domain: `${slug}.example.com`,
    industry: ["professional_services","healthcare","manufacturing","transportation","education","hospitality"][idx % 6],
    org_type: cca ? "CPA Firm" : (idx % 3 === 0 ? "Association" : "Employer Group"),
    situs_city: ["Austin","Portland","Boston","Miami","Seattle","Chicago","Denver","Atlanta"][idx % 8],
    eligible_lives: org.individuals_count * 3,
    // DI
    gi_offer_cents: 15000000,
    microsite_url: `https://enroll.hollowtree.app/${org.id}`,
    di_healthcare_type: "Healthcare Practice",
    inbound_type: "Broker Referral",
    ltd_benefit_pct: 60,
    std_benefit_pct: 66.7,
    next_sun_life_report_date: "2026-07-15",
    contact_email: idx % 4 === 0 ? null : `hr@${slug}.example.com`,
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
  const totalEnrollees = orgIndividuals.length;
  const policies = POLICIES.filter((p) => p.org_id === id).length;
  const orgIndIds = new Set(orgIndividuals.map((i) => i.id));
  const currentCycle = "2025-06";
  const collectedCents = PAYMENT_LEDGER
    .filter((p) => orgIndIds.has(p.individual_id) && p.status === "successful" && p.date.startsWith(currentCycle))
    .reduce((s, p) => s + p.amount_cents, 0);
  const outstandingCents = Math.round(orgIndividuals.reduce((s, i) => s + i.monthly_premium_cents, 0) * 0.1);
  const openWindowsList = windows.filter((w) => w.status === "open");
  const openWindows = openWindowsList.length;
  // earliest dated open window with an end date
  const nextOpenEnd = openWindowsList
    .map((w) => w.end)
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
      <div className="grid grid-cols-6 gap-2 mb-4">
        <SummaryChip label="Active Enrollees" value={activeEnrollees} hint={`filter: org=${id} · active`} onClick={() => navigate({ to: "/individuals", search: { org: id, coverage: "active" } })} />
        <SummaryChip label="Total Enrollees" value={totalEnrollees} hint={`filter: org=${id}`} onClick={() => navigate({ to: "/individuals", search: { org: id } })} />
        <SummaryChip label="Policies" value={policies} hint={`filter: org=${id}`} onClick={() => navigate({ to: "/policies" })} />
        <SummaryChip label="Collected This Cycle" value={formatCents(collectedCents)} hint={`${currentCycle} · org=${id}`} onClick={() => navigate({ to: "/payment-ledger" })} />
        <SummaryChip label="Outstanding" value={formatCents(outstandingCents)} tone={outstandingCents > 0 ? "bad" : undefined} hint={`filter: org=${id}`} onClick={() => navigate({ to: "/enrollee-balance" })} />
        <SummaryChip
          label="Open Windows"
          value={openWindows}
          sub={openWindows > 0 && nextOpenEnd ? (
            <span className={daysToClose !== null && daysToClose <= 14 ? "text-amber-700" : "text-black/50"}>
              Window closes {fmtDate(nextOpenEnd)}
            </span>
          ) : undefined}
        />
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="windows">Enrollment Windows</TabsTrigger>
          {product === "LTC" ? <TabsTrigger value="bc">Benefit Classes</TabsTrigger> : null}
          <TabsTrigger value="newjoiner">New Joiner Config</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigTab org={org} product={product} readOnly={readOnly} isAdmin={role === "admin"} />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab org={orgBase} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="windows">
          <WindowsTab
            windows={windows}
            orgName={org.name}
            onNew={() => windowDrawer.open(undefined, "create")}
            onEdit={(w) => windowDrawer.open(w, "edit")}
            canEdit={can("enrollment_windows", "update")}
            canCreate={can("enrollment_windows", "create")}
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
        <TabsContent value="newjoiner">
          <NewJoinerTab readOnly={readOnly} />
        </TabsContent>
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

function ConfigTab({ org, product, readOnly, isAdmin }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean; isAdmin: boolean }) {
  const statusValue = org.enrollment_status === "active" ? "active" : org.enrollment_status === "closed" ? "closed" : "pending_review";
  const identitySummary = `${org.domain} · ${org.situs_city}, ${org.situs_state} · ${org.eligible_lives} eligible`;

  return (
    <div className="mt-3 space-y-4">
      <IdentitySection org={org} product={product} statusValue={statusValue} isAdmin={isAdmin} readOnly={readOnly} summary={identitySummary} />
      {product === "DI"
        ? <DISettingsSection org={org} readOnly={readOnly} />
        : <LTCProductConfigSection org={org} readOnly={readOnly} />}
      <CoverageBillingSection org={org} readOnly={readOnly} />
      <BrokerSection org={org} readOnly={readOnly} />
      <SignatorySection org={org} readOnly={readOnly} />
      <LinksRefsSection org={org} product={product} readOnly={readOnly} />
      <PlanDetailsSection org={org} product={product} readOnly={readOnly} />
      {product === "LTC" && <CarrierOperationalSection org={org} readOnly={readOnly} />}
      {org.employer_moov_account_id && <EmployerBillingSection org={org} readOnly={readOnly} />}
      <SystemRefsSection org={org} product={product} />
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
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  editing?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  note?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || editing);
  const isOpen = open || editing;
  return (
    <div className={`bg-white border rounded-lg p-5 ${editing ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left flex-1 min-w-0">
          {isOpen ? <ChevronDown className="h-4 w-4 text-black/40 shrink-0" /> : <ChevronRight className="h-4 w-4 text-black/40 shrink-0" />}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!isOpen && summary && <span className="text-xs text-black/50 truncate">· {summary}</span>}
        </button>
        {canEdit && !editing && isOpen && onEdit && (
          <button onClick={onEdit} className="text-black/40 hover:text-[#0a3d3e] p-1" title="Edit section">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="mt-4">
          {note && <div className="text-xs text-black/50 mb-3 italic">{note}</div>}
          {children}
        </div>
      )}
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

function IdentitySection({ org, product, statusValue, isAdmin, readOnly, summary }: { org: OrgDetail; product: "DI" | "LTC"; statusValue: string; isAdmin: boolean; readOnly: boolean; summary: string }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Identity" defaultOpen summary={summary} editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Name">{e.editing ? <input className={inputCls} defaultValue={org.name} /> : org.name}</RField>
        <RField label="CCA Group">
          {product === "DI"
            ? (e.editing ? <Switch defaultChecked={org.cca_group} /> : <YesNo b={org.cca_group} />)
            : <span className="text-black/40 text-xs">N/A for LTC</span>}
        </RField>
        <RField label="Domain">{e.editing ? <input className={inputCls} defaultValue={org.domain} /> : org.domain}</RField>
        {product === "LTC" ? (
          <RField label="NAIC Code">
            {e.editing ? <input className={inputCls} defaultValue={org.naic_code} /> : org.naic_code}
          </RField>
        ) : <div />}
        <RField label="Industry">
          {e.editing
            ? <select className={inputCls} defaultValue={org.industry}>{INDUSTRIES.map((o) => <option key={o}>{o}</option>)}</select>
            : titleCase(org.industry)}
        </RField>
        <RField label="Microsite URL"><ExtLink href={org.microsite_url}>{org.microsite_url}</ExtLink></RField>
        <RField label="Org Type">
          {e.editing
            ? <select className={inputCls} defaultValue={org.org_type}>{ORG_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
            : org.org_type}
        </RField>
        {product === "DI" ? (
          <RField label="Contact Email">
            {e.editing
              ? <input className={inputCls} type="email" defaultValue={org.contact_email ?? ""} />
              : (org.contact_email ? <a href={`mailto:${org.contact_email}`} className="text-sky-700 hover:underline">{org.contact_email}</a> : <Empty />)}
          </RField>
        ) : (
          <RField label="Company Years in Existence">{e.editing ? <input className={inputCls} type="number" defaultValue={org.company_years_in_existence} /> : org.company_years_in_existence}</RField>
        )}
        <RField label="Status">
          {e.editing
            ? <select className={inputCls} defaultValue={statusValue} disabled={!isAdmin}>{ORG_STATUSES.map((o) => <option key={o}>{o}</option>)}</select>
            : titleCase(statusValue)}
        </RField>
        {product === "LTC" ? (
          <RField label="Org Website"><ExtLink href={org.org_website}>{org.org_website}</ExtLink></RField>
        ) : <div />}
        <RField label="Situs State">
          {e.editing
            ? <select className={inputCls} defaultValue={org.situs_state}>{US_STATES.map((o) => <option key={o}>{o}</option>)}</select>
            : org.situs_state}
        </RField>
        <RField label="Situs City">{e.editing ? <input className={inputCls} defaultValue={org.situs_city} /> : org.situs_city}</RField>
        <RField label="Eligible Lives">{e.editing ? <input className={inputCls} type="number" defaultValue={org.eligible_lives} /> : org.eligible_lives}</RField>
        {!(product === "DI" && org.cca_group) && (
          <RField label="Policy Owner Type">
            {e.editing
              ? <select className={inputCls} defaultValue={org.policy_owner_type}>{["employer_group","cca"].map((o) => <option key={o}>{o}</option>)}</select>
              : policyOwnerLabel(org.policy_owner_type)}
          </RField>
        )}
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function DISettingsSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  const hasStd = org.type_of_rate === "STD+LTD";
  return (
    <SectionCard title="DI Product" defaultOpen editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Product Mix</div>
          <div className="text-sm text-gray-900 font-medium">
            {e.editing
              ? <select className={inputCls} defaultValue={org.type_of_rate ?? "LTD"}>{["LTD","STD+LTD"].map((o) => <option key={o} value={o}>{productMixLabel(o)}</option>)}</select>
              : productMixLabel(org.type_of_rate)}
          </div>
          <div className="text-[11px] text-black/50 mt-1 italic">
            Drives plan details, rate config, and which premium fields apply to individuals.
          </div>
        </div>
        <RField label="LTD Benefit %">{e.editing ? <input className={inputCls} defaultValue={String(org.ltd_benefit_pct)} /> : `${org.ltd_benefit_pct}%`}</RField>
        <RField label="DI Healthcare Type">
          {e.editing
            ? <select className={inputCls} defaultValue={org.di_healthcare_type}>{DI_HC_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
            : org.di_healthcare_type}
        </RField>
        <RField label="STD Benefit %">
          {hasStd
            ? (e.editing ? <input className={inputCls} defaultValue={String(org.std_benefit_pct)} /> : `${org.std_benefit_pct}%`)
            : <Empty />}
        </RField>
        <RField label="Inbound Type">{e.editing ? <input className={inputCls} defaultValue={org.inbound_type} /> : org.inbound_type}</RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function LTCProductConfigSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="LTC Product Config" defaultOpen editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Product Template Variant">
          {e.editing
            ? <select className={inputCls} defaultValue={org.product_template_variant}>{PRODUCT_TEMPLATE_VARIANTS.map((o) => <option key={o}>{o}</option>)}</select>
            : org.product_template_variant}
        </RField>
        <RField label="Extension of Benefits Rider">{e.editing ? <Switch defaultChecked={org.extension_of_benefits_rider} /> : <YesNo b={org.extension_of_benefits_rider} />}</RField>
        <RField label="Healthcare Company">{e.editing ? <input className={inputCls} defaultValue={org.healthcare_company} /> : org.healthcare_company}</RField>
        <RField label="Benefit Restoration Rider">{e.editing ? <Switch defaultChecked={org.benefit_restoration_rider} /> : <YesNo b={org.benefit_restoration_rider} />}</RField>
        <RField label="Benefit Duration">{e.editing ? <input className={inputCls} type="number" defaultValue={org.benefit_duration} /> : org.benefit_duration}</RField>
        <RField label="Duration">{e.editing ? <input className={inputCls} defaultValue={org.duration} /> : org.duration}</RField>
        <RField label="Min Age">{e.editing ? <input className={inputCls} type="number" defaultValue={org.min_age} /> : org.min_age}</RField>
        <RField label="Max Age">{e.editing ? <input className={inputCls} type="number" defaultValue={org.max_age} /> : org.max_age}</RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function CoverageBillingSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Coverage / Billing" defaultOpen editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Contribution Type">
          {e.editing
            ? <select className={inputCls} defaultValue={org.contribution_type}>{CONTRIBUTION_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
            : org.contribution_type}
        </RField>
        <RField label="TPA Fee">{e.editing ? <input className={inputCls} defaultValue={String(org.tpa_fee_cents / 100)} /> : `${formatCents(org.tpa_fee_cents)} / mo`}</RField>
        <RField label="Pay Mode">
          {e.editing
            ? <select className={inputCls} defaultValue={org.pay_mode}>{PAY_MODES.map((o) => <option key={o}>{o}</option>)}</select>
            : org.pay_mode}
        </RField>
        <RField label="Service Fee Retained">
          {org.service_fee_retained_cents === null
            ? <span className="text-black/60 italic">Full retention</span>
            : (e.editing ? <input className={inputCls} defaultValue={String(org.service_fee_retained_cents / 100)} /> : formatCents(org.service_fee_retained_cents))}
        </RField>
        <div />
        <RField label="TPA Fee Name">{e.editing ? <input className={inputCls} defaultValue={org.tpa_fee_name} /> : org.tpa_fee_name}</RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function BrokerSection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  function renderOverride(value: number | null, brokerName: string | null) {
    if (value !== null) return `${value}%`;
    const def = brokerDefaultPct(brokerName);
    if (def !== null) return <span>{def}% <span className="text-[11px] text-black/40">(default)</span></span>;
    return <Empty />;
  }
  return (
    <SectionCard title="Broker" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Primary Broker">
          {e.editing
            ? <select className={inputCls} defaultValue={org.primary_broker}>{BROKERS.map((o) => <option key={o}>{o}</option>)}</select>
            : org.primary_broker}
        </RField>
        <RField label="Secondary Broker">
          {e.editing
            ? <select className={inputCls} defaultValue={org.secondary_broker ?? ""}><option value="">— None —</option>{BROKERS.map((o) => <option key={o}>{o}</option>)}</select>
            : val(org.secondary_broker)}
        </RField>
        <RField label="Primary Override %">
          {e.editing ? <input className={inputCls} defaultValue={org.primary_override_pct ?? ""} placeholder="default" /> : renderOverride(org.primary_override_pct, org.primary_broker)}
        </RField>
        <RField label="Secondary Override %">
          {e.editing ? <input className={inputCls} defaultValue={org.secondary_override_pct ?? ""} placeholder="default" /> : renderOverride(org.secondary_override_pct, org.secondary_broker)}
        </RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function SignatorySection({ org, readOnly }: { org: OrgDetail; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Signatory" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Name">{e.editing ? <input className={inputCls} defaultValue={org.signatory_name} /> : org.signatory_name}</RField>
        <RField label="Email">{e.editing ? <input className={inputCls} defaultValue={org.signatory_email} /> : org.signatory_email}</RField>
        <RField label="Title">{e.editing ? <input className={inputCls} defaultValue={org.signatory_title} /> : org.signatory_title}</RField>
      </Grid2>
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
  );
}

function LinksRefsSection({ org, product, readOnly }: { org: OrgDetail; product: "DI" | "LTC"; readOnly: boolean }) {
  const e = useSectionEdit();
  return (
    <SectionCard title="Links & References" editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      <Grid2>
        <RField label="Google Drive Folder">
          {e.editing ? <input className={inputCls} defaultValue={org.google_drive_folder} /> : <ExtLink href={org.google_drive_folder}>Open folder</ExtLink>}
        </RField>
        <RField label="Assigned Gmail Person">{e.editing ? <input className={inputCls} defaultValue={org.assigned_gmail_person} /> : org.assigned_gmail_person}</RField>
        <RField label="Meeting Link">
          {e.editing ? <input className={inputCls} defaultValue={org.meeting_link} /> : <ExtLink href={org.meeting_link}>{org.meeting_link}</ExtLink>}
        </RField>
        <RField label="Gmail Label ID">{e.editing ? <input className={inputCls} defaultValue={org.gmail_label_id} /> : <span className="font-mono text-xs">{org.gmail_label_id}</span>}</RField>
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
  const note = "Plan terms displayed on the enrollment microsite. Changes here update enrollee-facing content.";
  const pd = org.plan_details as Record<string, unknown>;
  // Detect tier-nested LTC structure
  const isTierNested = product === "LTC" && LTC_TIERS.some((t) => t in pd) && typeof pd[LTC_TIERS[0]] === "object";

  return (
    <SectionCard title="Plan Details" note={note} editing={e.editing} canEdit={!readOnly} onEdit={e.onEdit}>
      {isTierNested ? (
        <LtcTierPanels details={pd as Record<string, Record<string, string>>} editing={e.editing} />
      ) : (
        <FlatPlanDetails details={pd as Record<string, string>} editing={e.editing} />
      )}
      {e.editing && <SectionActions onCancel={e.onCancel} onSave={e.onSave} />}
    </SectionCard>
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

function SystemRefsSection({ org, product }: { org: OrgDetail; product: "DI" | "LTC" }) {
  return (
    <SectionCard title="System References">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[11px]">
        <Ref label="Created At" value={org.created_at} />
        <Ref label="Updated At" value={org.updated_at} />
        <Ref label="Attio Deal ID" value={org.attio_deal_id} />
        <Ref label="Attio Company ID" value={org.attio_company_id} />
        <Ref label="Rate Sheet ID (legacy)" value={org.rate_sheet_id} muted />
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

function isCCA(orgId: string) { return orgId === "org_3" || orgId === "org_1" || orgId === "org_7"; }

function FeesTab({ org, readOnly }: { org: typeof ORGS[number]; readOnly: boolean }) {
  const cca = org.cca_group;
  const tpa = cca ? 2000 : 800;
  const retained = cca ? 500 : null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-8">
      <Card className="p-4 col-span-1">
        <SubHead>Fee Schedule</SubHead>
        <RowLegacy label="TPA Fee"><RO value={formatCents(tpa) + " / mo"} readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="TPA Fee Name"><RO value={cca ? "CCA Membership Fee" : "Processing Fee"} readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Service Fee Retained">{retained === null ? <span className="text-black/60">Full Retention</span> : <RO value={formatCents(retained)} readOnly={readOnly} />}</RowLegacy>
        <RowLegacy label="Card Percentage"><RO value="3.7%" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="ACH First Fee"><RO value="$1.00" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="ACH Subsequent Fee"><RO value="$0.50" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Failed ACH Penalty"><RO value="$15.00" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Failed Card Penalty Mode"><SelectLegacy value="flat" options={["flat","percentage"]} readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Failed Card Penalty Value"><RO value="$10.00" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Free Retry Count"><RO value={2} readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Effective From"><RO value="2025-01-01" readOnly={readOnly} /></RowLegacy>
        <RowLegacy label="Effective To"><RO value="" readOnly={readOnly} placeholder="(open-ended)" /></RowLegacy>
      </Card>

      <div className="col-span-1">
        <Card className="p-4 bg-[#fefaf2] border-amber-200">
          <div className="text-xs font-semibold text-amber-900 mb-2">How CCA fee splitting works</div>
          <p className="text-xs text-black/70 leading-relaxed mb-2">
            CCA orgs charge a <b>$20/month</b> membership fee (not the standard $8 TPA fee). Of the $20:
          </p>
          <ul className="text-xs text-black/70 list-disc pl-5 space-y-1 mb-3">
            <li><b>$5.00</b> retained by Hollowtree (<code>service_fee_retained_cents = 500</code>)</li>
            <li><b>$15.00</b> remitted to CCA</li>
          </ul>
          <p className="text-xs text-black/70 leading-relaxed mb-2">
            <b>Non-CCA orgs:</b> <code>service_fee_retained_cents = NULL</code> means full retention of the TPA fee.
          </p>
          <p className="text-xs text-black/60 italic">
            This split is for reporting only. The <code>tpa_fee_cents</code> value is what the enrollee is charged regardless.
          </p>
        </Card>
        <Card className="p-4 mt-3">
          <SubHead>Worked example for this org</SubHead>
          <div className="text-xs text-black/70 space-y-1">
            <div>Enrollee charged: <b>{formatCents(tpa)}</b> / mo</div>
            <div>Retained by Hollowtree: <b>{retained === null ? formatCents(tpa) + " (full)" : formatCents(retained)}</b></div>
            <div>Remitted to {cca ? "CCA" : "—"}: <b>{retained === null ? formatCents(0) : formatCents(tpa - retained)}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RowLegacy({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3 py-1.5 border-b border-black/5">
      <div className="text-[11px] uppercase tracking-wider text-black/50">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-black/60 mt-2 mb-2">{children}</div>;
}

function RO({ value, readOnly, placeholder }: { value?: string | number; readOnly: boolean; placeholder?: string }) {
  if (readOnly) return <span className="text-black/80">{value || <span className="text-black/30">—</span>}</span>;
  return <Input defaultValue={value === undefined || value === null ? "" : String(value)} placeholder={placeholder} />;
}

function SelectLegacy({ value, options, readOnly }: { value: string; options: string[]; readOnly: boolean }) {
  if (readOnly) return <span className="text-black/80">{value}</span>;
  return (
    <select defaultValue={value} className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function WindowsTab({ windows, orgName, onNew, onEdit, canEdit, canCreate }: {
  windows: typeof DUMMY_WINDOWS; orgName: string; onNew: () => void; onEdit: (w: typeof DUMMY_WINDOWS[number]) => void; canEdit: boolean; canCreate: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-end mb-2">
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
  );
}

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

function NewJoinerTab({ readOnly }: { readOnly: boolean }) {
  const [period, setPeriod] = useState(30);
  const [waiting, setWaiting] = useState(90);
  const [rule, setRule] = useState("first_of_next_month");
  return (
    <div className="mt-3 max-w-2xl">
      <Card className="p-4">
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
      </Card>
      <Card className="p-3 mt-3 bg-[#f7f3eb] border-black/10">
        <div className="text-xs text-black/70">
          New hires get <b>{period}</b> days to enroll after completing a <b>{waiting}</b> day waiting period. Coverage effective date follows the <b>{rule}</b> rule.
        </div>
      </Card>
    </div>
  );
}
