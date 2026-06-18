// Hardcoded dummy data for the Hollowtree admin wireframe.
// NOT real PII. All names are obviously fake (Test Person N, example.com).

export type Product = "DI" | "LTC";
export type Role = "admin" | "ops" | "read-only";

export const ORGS: Array<{
  id: string; name: string; product: string; situs_state: string; status: string;
  individuals_count: number; policy_owner_type: string; type_of_rate: string | null;
  extension_of_benefits_rider: boolean; benefit_restoration_rider: boolean; cca_group: boolean;
  logo_url: string | null;
}> = [
  { id: "org_1", name: "Acme Widgets Co", product: "DI", situs_state: "TX", status: "active", individuals_count: 12, policy_owner_type: "cca", type_of_rate: "STD+LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: true, logo_url: "https://placehold.co/100x100/0a3d3e/white?text=ACME" },
  { id: "org_2", name: "Bluefin Logistics", product: "DI", situs_state: "CA", status: "active", individuals_count: 7, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false, logo_url: "https://placehold.co/100x100/1e40af/white?text=BFL" },
  { id: "org_3", name: "Coastal Credit Union", product: "LTC", situs_state: "FL", status: "active", individuals_count: 9, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: true, benefit_restoration_rider: true, cca_group: false, logo_url: null },
  { id: "org_4", name: "Delta Manufacturing", product: "DI", situs_state: "OH", status: "closed", individuals_count: 4, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false, logo_url: "https://broken-url-test.invalid/logo.png" },
  { id: "org_5", name: "Evergreen Health", product: "LTC", situs_state: "NY", status: "active", individuals_count: 6, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: true, benefit_restoration_rider: false, cca_group: false, logo_url: null },
  { id: "org_6", name: "Foxtail Education Trust", product: "LTC", situs_state: "WA", status: "onboarding", individuals_count: 2, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false, logo_url: null },
  { id: "org_7", name: "Greylock Partners LLC", product: "DI", situs_state: "MA", status: "active", individuals_count: 5, policy_owner_type: "cca", type_of_rate: "STD+LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: true, logo_url: "https://placehold.co/100x100/047857/white?text=GPL" },
  { id: "org_8", name: "Harborline Shipping", product: "DI", situs_state: "WA", status: "active", individuals_count: 8, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false, logo_url: "https://placehold.co/100x100/0369a1/white?text=HBL" },
  { id: "org_9", name: "Ironwood Robotics", product: "DI", situs_state: "CO", status: "onboarding", individuals_count: 0, policy_owner_type: "employer_group", type_of_rate: "STD+LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false, logo_url: null },
];

export const LTC_FACE_TIERS_CENTS = [2500000, 5000000, 7500000, 10000000, 15000000, 20000000, 25000000]; // $25K..$250K

// v16: spouse_gi_offer_cents added (nullable). Layer 2 of LTC spouse cap waterfall.
// Populated only when employer group has specifically negotiated spouse GI with carrier (atypical).
export const BENEFIT_CLASSES: Array<{
  id: string; organization_id: string; name: string; gi_offer_cents: number;
  bronze: number | null; silver: number; gold: number; platinum: number; diamond: number;
  is_default: boolean; spouse_gi_offer_cents: number | null;
}> = [
  { id: "bc_1", organization_id: "org_3", name: "Class A — Full Time", gi_offer_cents: 200000, bronze: 50000, silver: 100000, gold: 150000, platinum: 200000, diamond: 250000, is_default: true, spouse_gi_offer_cents: 2500000 },
  { id: "bc_2", organization_id: "org_3", name: "Class B — Part Time", gi_offer_cents: 100000, bronze: 25000, silver: 50000, gold: 75000, platinum: 100000, diamond: 125000, is_default: false, spouse_gi_offer_cents: null },
  { id: "bc_3", organization_id: "org_5", name: "Default Class", gi_offer_cents: 150000, bronze: 50000, silver: 75000, gold: 100000, platinum: 150000, diamond: 200000, is_default: true, spouse_gi_offer_cents: null },
];

export const COVERAGE_STATUSES = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"] as const;

// Canonical DI current_stage CHECK values (5).
export const DI_STAGES = ["choosing_plan", "confirming_info", "at_checkout", "adding_payment", "purchased"] as const;
export type DIStage = typeof DI_STAGES[number];
export const DI_STAGE_LABELS: Record<DIStage, string> = {
  choosing_plan: "Choosing Plan",
  confirming_info: "Confirming Info",
  at_checkout: "At Checkout",
  adding_payment: "Adding Payment",
  purchased: "Purchased",
};

// Canonical LTC current_stage CHECK values (21).
export const LTC_STAGES = [
  // Core flow (5)
  "starting_application", "selecting_plan", "beneficiary_form", "at_checkout", "adding_payment",
  // Post-purchase (5)
  "upsell_survey", "interested_spouse", "interested_upgrade", "interested_both", "at_more_coverage",
  // Spousal sub-funnel (5)
  "choosing_spousal_pricing", "spouse_eligibility", "spouse_confirming_details", "spouse_designee", "spouse_checkout",
  // Upgrade sub-funnel (6)
  "choosing_upgrade", "upgrade_medical", "upgrade_checkout", "upgrade_applied", "upgrade_approved", "upgrade_denied",
] as const;
export type LTCStage = typeof LTC_STAGES[number];
export const LTC_STAGE_LABELS: Record<LTCStage, string> = {
  starting_application: "Starting Application",
  selecting_plan: "Selecting Plan",
  beneficiary_form: "Beneficiary Form",
  at_checkout: "At Checkout",
  adding_payment: "Adding Payment",
  upsell_survey: "Upsell Survey",
  interested_spouse: "Interested: Spouse",
  interested_upgrade: "Interested: Upgrade",
  interested_both: "Interested: Both",
  at_more_coverage: "At More Coverage",
  choosing_spousal_pricing: "Choosing Spousal Pricing",
  spouse_eligibility: "Spouse Eligibility",
  spouse_confirming_details: "Spouse Confirming Details",
  spouse_designee: "Spouse Designee",
  spouse_checkout: "Spouse Checkout",
  choosing_upgrade: "Choosing Upgrade",
  upgrade_medical: "Upgrade Medical",
  upgrade_checkout: "Upgrade Checkout",
  upgrade_applied: "Upgrade Applied",
  upgrade_approved: "Upgrade Approved",
  upgrade_denied: "Upgrade Denied",
};

// 25 realistic (coverage_status, DI current_stage) pairings; cycled for >25 rows.
// For LTC individuals, the DI stage is remapped to the LTC equivalent below.
const COVERAGE_STAGE_PAIRS: Array<[typeof COVERAGE_STATUSES[number], DIStage]> = [
  ["not_started", "choosing_plan"], ["not_started", "choosing_plan"], ["not_started", "choosing_plan"],
  ["in_progress", "choosing_plan"], ["in_progress", "confirming_info"], ["in_progress", "confirming_info"], ["in_progress", "at_checkout"], ["in_progress", "adding_payment"],
  ["purchased", "purchased"], ["purchased", "purchased"], ["purchased", "purchased"],
  ["active", "purchased"], ["active", "purchased"], ["active", "purchased"], ["active", "purchased"], ["active", "purchased"], ["active", "purchased"], ["active", "purchased"], ["active", "purchased"],
  ["suspended", "purchased"], ["suspended", "purchased"], ["suspended", "purchased"],
  ["canceled", "choosing_plan"], ["canceled", "confirming_info"],
  ["lapsed", "purchased"],
];
// Map a DI canonical stage to the closest LTC canonical stage.
function diToLtcStage(s: DIStage): LTCStage {
  switch (s) {
    case "choosing_plan": return "selecting_plan";
    case "confirming_info": return "beneficiary_form";
    case "at_checkout": return "at_checkout";
    case "adding_payment": return "adding_payment";
    case "purchased": return "at_more_coverage";
  }
}
const PLANS_DI = ["Bronze DI", "Silver DI", "Gold DI"];
const PLANS_LTC = ["Bronze LTC", "Silver LTC", "Gold LTC", "Platinum LTC", "Diamond LTC"];

// Pre-defined spouse pairs (LTC only): spouse_n -> primary_n, both at same org.
const SPOUSE_PAIRS: Record<number, number> = { 11: 3, 13: 5, 14: 6 };

// v15 wireframe additions: DI group→individual conversion, employee departure, GI life add-on.
export type DepartureReason = "voluntary_resignation" | "termination" | "retirement" | "other";
export const DEPARTURE_REASON_LABELS: Record<DepartureReason, string> = {
  voluntary_resignation: "Voluntary Resignation",
  termination: "Termination",
  retirement: "Retirement",
  other: "Other",
};
export type CoverageMode = "group" | "individual";
const _V15_CONVERTED = new Set(["ind_10", "ind_19"]);
const _V15_ELIGIBLE = new Set(["ind_8", "ind_17", "ind_28"]);
const _V15_DEPARTED: Record<string, { date: string; reason: DepartureReason }> = {
  ind_19: { date: "2026-04-01", reason: "voluntary_resignation" },
  ind_25: { date: "2026-03-15", reason: "retirement" },
  ind_12: { date: "2026-02-10", reason: "voluntary_resignation" },
  ind_15: { date: "2026-05-01", reason: "retirement" },
};
const _V15_LIFE: Record<string, { face_cents: number; premium_cents: number; date: string }> = {
  ind_10: { face_cents: 5000000, premium_cents: 1500, date: "2025-08-01" },
  ind_18: { face_cents: 2500000, premium_cents: 800, date: "2026-01-15" },
  ind_19: { face_cents: 10000000, premium_cents: 3000, date: "2025-09-01" },
  ind_29: { face_cents: 5000000, premium_cents: 1500, date: "2026-03-10" },
};
function _addMonths12(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setMonth(dt.getMonth() + 12);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export const INDIVIDUALS = Array.from({ length: 40 }, (_, i) => {
  const n = i + 1;
  const org = ORGS[i % ORGS.length];
  const isLTC = org.product === "LTC";
  const isSpouse = isLTC && n in SPOUSE_PAIRS;
  const pair = COVERAGE_STAGE_PAIRS[i % COVERAGE_STAGE_PAIRS.length];
  const cov = pair[0];
  const current_stage: DIStage | LTCStage = isLTC ? diToLtcStage(pair[1]) : pair[1];
  let effective_date: string | null = null;
  if (cov === "active" || cov === "suspended" || cov === "lapsed") {
    const month = (n * 3) % 16;
    const y = 2025 + Math.floor(month / 12);
    const m = (month % 12) + 1;
    const d = ((n * 7) % 27) + 1;
    effective_date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } else if (cov === "purchased") {
    const d0 = 15 + (n % 30);
    const m = d0 > 30 ? 7 : 6;
    const day = d0 > 30 ? d0 - 30 : d0;
    effective_date = `2026-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  } else if (cov === "in_progress") {
    effective_date = n % 2 === 0 ? `2026-07-01` : null;
  } else if (cov === "canceled") {
    effective_date = `2025-${String(((n * 2) % 12) + 1).padStart(2, "0")}-15`;
  }
  // Payment status by coverage_status (lowercase per canonical CHECK).
  let last_payment_status: "successful" | "failed" | "pending" | null = null;
  let retry_count = 0;
  if (cov === "active") {
    const bucket = n % 10;
    if (bucket < 7) last_payment_status = "successful";
    else if (bucket < 9) { last_payment_status = "failed"; retry_count = (n % 5) + 1; }
    else last_payment_status = "pending";
  } else if (cov === "suspended") {
    last_payment_status = "failed";
    retry_count = (n % 3) + 2;
  } else if (cov === "purchased") {
    last_payment_status = n % 2 === 0 ? "pending" : "successful";
  } else if (cov === "lapsed") {
    last_payment_status = "failed";
    retry_count = 4 + (n % 3);
  } else if (cov === "canceled") {
    last_payment_status = n % 2 === 0 ? "successful" : null;
  }
  const monthly_premium_cents = 2500 + (n * 137) % 8000;
  // v15-audit: coverage lifecycle dates (display-only on Payment & Billing)
  const cov_effective = (cov === "active" || cov === "suspended" || cov === "lapsed" || cov === "purchased" || cov === "canceled")
    ? (effective_date ?? `2025-${String(((n * 2) % 12) + 1).padStart(2, "0")}-15`)
    : (n % 10 < 3 ? `2025-${String(((n * 2) % 12) + 1).padStart(2, "0")}-15` : null);
  const cov_end = (cov === "canceled" || cov === "lapsed")
    ? `2026-${String(((n * 3) % 12) + 1).padStart(2, "0")}-10`
    : null;
  // v15-audit: realistic job titles (both products)
  const JOB_TITLES = ["Operations Manager", "Staff Accountant", "Warehouse Supervisor", "Senior Engineer", "Account Analyst", "Director of HR", "Project Manager", "Field Technician"];
  const orgSlug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "org";
  return {
    id: `ind_${n}`,
    full_name: `Test Person ${n}`,
    email: `person${n}@example.com`,
    work_email: `test.person${n}@${orgSlug}.com`,
    phone: `555-0${100 + n}`,
    organization_id: org.id,
    org_name: org.name,
    product: org.product as Product,
    coverage_status: cov,
    current_stage,
    plan: isLTC ? PLANS_LTC[n % PLANS_LTC.length] : PLANS_DI[n % PLANS_DI.length],
    monthly_premium_cents,
    effective_date,
    coverage_effective_date: cov_effective,
    coverage_end_date: cov_end,
    billing_group_id: `bg_${(n % 8) + 1}`,
    // DI fields (null for LTC)
    coverage_plan: isLTC ? null : PLANS_DI[n % PLANS_DI.length],
    di_type: isLTC ? null : (org.type_of_rate as "STD+LTD" | "LTD" | null),
    monthly_benefit_cents: 150000 + (n % 10) * 50000,
    weekly_covered_benefit_cents: 80000 + (n % 4) * 10000,
    // std_premium / ltd_premium stored as whole dollars (DI only).
    std_premium: isLTC ? null : Math.round((monthly_premium_cents * 0.4) / 100),
    ltd_premium: isLTC ? null : Math.round((monthly_premium_cents * 0.6) / 100),
    assigned_rep: ["Jamie Rep", "Casey Rep", "Morgan Rep"][n % 3],
    title: JOB_TITLES[n % JOB_TITLES.length],
    greeting: ["Mr.", "Ms.", "Mx."][n % 3],
    is_union_member: isLTC ? null : (n % 7 === 0),
    union_local_name: isLTC ? null : (n % 7 === 0 ? `Local ${100 + n}` : null),
    // LTC fields
    purchased_plan: isLTC ? PLANS_LTC[n % PLANS_LTC.length] : null,
    applied_for_upgrade: isLTC && n % 5 === 0,
    interested_upgrading: n % 3 === 0,
    interested_spousal: n % 4 === 0,
    // relationship_type is LTC-only (CHECK: primary | spouse). null for DI.
    relationship_type: isLTC ? (isSpouse ? "spouse" : "primary") : null,
    linked_individual_id: isSpouse ? `ind_${SPOUSE_PAIRS[n]}` : null,
    face_amount_cents: LTC_FACE_TIERS_CENTS[isSpouse ? (n % 3) : 2 + (n % 5)],
    issue_type: isLTC ? (isSpouse ? "SI" : (2 + (n % 5) >= 5 ? "SI" : "GI")) : null,
    // DI-only per-individual language preference (overrides org default)
    preferred_language: isLTC ? null : (n === 4 || n === 17 ? "es" : "en"),
    // Employer contribution
    employer_contribution_tier: ["100%", "75%", "50%", "0%"][n % 4],
    employer_contribution_duration_months: [12, 24, 36][n % 3],
    employer_contribution_active: n % 5 !== 0,
    employer_contribution_start_date: n % 5 !== 0 ? "2025-01-01" : null,
    last_payment_status,
    retry_count,
    // v15: employee departure tracking (both products)
    departed_organization_at: _V15_DEPARTED[`ind_${n}`]?.date ?? null,
    departure_reason: (_V15_DEPARTED[`ind_${n}`]?.reason ?? null) as DepartureReason | null,
    // v15: DI group→individual conversion (DI only)
    coverage_mode: (isLTC ? null : (_V15_CONVERTED.has(`ind_${n}`) ? "individual" : "group")) as CoverageMode | null,
    converted_to_individual_at: !isLTC && _V15_CONVERTED.has(`ind_${n}`) ? (n === 10 ? "2026-04-15" : "2026-05-20") : null,
    conversion_eligible_date: isLTC ? null : (_V15_ELIGIBLE.has(`ind_${n}`) ? "2024-12-01" : _addMonths12(effective_date)),
    pre_conversion_monthly_benefit_cents: !isLTC && _V15_CONVERTED.has(`ind_${n}`) ? 500000 : null,
    pre_conversion_employee_monthly_premium_cents: !isLTC && _V15_CONVERTED.has(`ind_${n}`) ? Math.round(monthly_premium_cents * 1.25) : null,
    policy_id: !isLTC && _V15_CONVERTED.has(`ind_${n}`) ? (n === 10 ? "pol_10" : "pol_11") : null,
    // v15: GI Life add-on (DI only)
    life_enrolled: !isLTC && !!_V15_LIFE[`ind_${n}`],
    life_face_amount_cents: _V15_LIFE[`ind_${n}`]?.face_cents ?? null,
    life_premium_cents: _V15_LIFE[`ind_${n}`]?.premium_cents ?? null,
    life_effective_date: _V15_LIFE[`ind_${n}`]?.date ?? null,
    life_policy_id: !isLTC && _V15_LIFE[`ind_${n}`] ? "pol_12" : null,
  };
});

// v14 billing_groups
export type BillingGroupStatus = "pending" | "active" | "suspended" | "terminated";
export type BillingGroupPMType = "ach" | "card" | "card-payment" | "apple_pay" | "apple-pay" | null;

export type BillingGroup = {
  id: string;
  name: string | null;
  organization_id: string;
  primary_individual_id: string;
  status: BillingGroupStatus;
  moov_account_id: string | null;
  payment_method_id: string | null;
  payment_method_type: BillingGroupPMType;
  payment_method_display_label: string | null;
  payment_method: string;
  plaid_institution: string | null;
  card_last4: string | null;
  created_at: string;
  updated_at: string;
  individuals_count: number;
};

const SEPARATED_SPOUSES = new Set<string>(["ind_11"]);

const _PM_SAMPLES: Array<{
  v14: "ach" | "card" | "apple_pay";
  legacy: "ach" | "card-payment" | "apple-pay";
  label: string;
  institution: string | null;
  last4: string | null;
  display: string;
}> = [
  { v14: "ach",       legacy: "ach",          label: "ACH", institution: "Chase",            last4: null,   display: "Chase ACH ··7890" },
  { v14: "card",      legacy: "card-payment", label: "Card", institution: null,              last4: "4242", display: "Visa ending 4242" },
  { v14: "ach",       legacy: "ach",          label: "ACH", institution: "Wells Fargo",      last4: null,   display: "Wells Fargo ACH ··3344" },
  { v14: "apple_pay", legacy: "apple-pay",    label: "Apple Pay", institution: null,         last4: null,   display: "Apple Pay" },
  { v14: "ach",       legacy: "ach",          label: "ACH", institution: "Bank of America",  last4: null,   display: "Bank of America ACH ··2211" },
  { v14: "card",      legacy: "card-payment", label: "Card", institution: null,              last4: "1881", display: "Mastercard ending 1881" },
  { v14: "ach",       legacy: "ach",          label: "ACH", institution: "Citibank",         last4: null,   display: "Citibank ACH ··5566" },
];

// Demo: a few groups have a user-set name, rest leave name=null so the list
// view exercises the derived "{pm_type} — Group {short_id}" label fallback.
const NAMED_GROUPS: Record<string, string> = {
  bg_1: "Engineering Team ACH",
  bg_3: "Wells Fargo Primary",
  bg_5: "BoA Family Plan",
};

function _buildBillingGroups(): BillingGroup[] {
  const list: BillingGroup[] = [];
  const indToBg: Record<string, string> = {};
  let n = 0;

  for (const ind of INDIVIDUALS) {
    if (
      ind.relationship_type === "spouse" &&
      ind.linked_individual_id &&
      !SEPARATED_SPOUSES.has(ind.id) &&
      indToBg[ind.linked_individual_id]
    ) {
      indToBg[ind.id] = indToBg[ind.linked_individual_id];
      continue;
    }
    n += 1;
    const id = `bg_${n}`;
    const isSeparatedSpouse = SEPARATED_SPOUSES.has(ind.id);
    const status: BillingGroupStatus = isSeparatedSpouse
      ? "pending"
      : n === 7
        ? "suspended"
        : n === 21
          ? "terminated"
          : "active";
    const s = _PM_SAMPLES[n % _PM_SAMPLES.length];
    const blank = isSeparatedSpouse || status === "terminated";
    indToBg[ind.id] = id;
    const created = isSeparatedSpouse
      ? "2025-09-15T14:30:00Z"
      : `2025-${String(((n * 2) % 12) + 1).padStart(2, "0")}-${String(((n * 5) % 27) + 1).padStart(2, "0")}T10:00:00Z`;
    list.push({
      id,
      name: NAMED_GROUPS[id] ?? null,
      organization_id: ind.organization_id,
      primary_individual_id: ind.id,
      status,
      moov_account_id: blank ? null : `moov_${1000 + n}`,
      payment_method_id: blank ? null : `pm_${2000 + n}`,
      payment_method_type: blank ? null : s.v14,
      payment_method_display_label: blank ? null : s.display,
      plaid_institution: blank ? null : s.institution,
      card_last4: blank ? null : s.last4,
      payment_method: blank ? "—" : s.label,
      created_at: created,
      updated_at: created,
      individuals_count: 0,
    });
  }

  for (const ind of INDIVIDUALS) {
    if (ind.relationship_type === "spouse" && ind.linked_individual_id && !indToBg[ind.id]) {
      const primaryBg = indToBg[ind.linked_individual_id];
      if (primaryBg) indToBg[ind.id] = primaryBg;
    }
  }

  for (const g of list) {
    g.individuals_count = Object.values(indToBg).filter((b) => b === g.id).length;
  }
  for (const ind of INDIVIDUALS) {
    (ind as { billing_group_id: string }).billing_group_id = indToBg[ind.id] ?? ind.billing_group_id;
  }
  return list;
}

export const BILLING_GROUPS: BillingGroup[] = _buildBillingGroups();

// Derived display label for a billing group when name is null.
export function billingGroupLabel(g: Pick<BillingGroup, "id" | "name" | "payment_method_type">): string {
  if (g.name && g.name.trim()) return g.name;
  const pm = g.payment_method_type ?? "group";
  const short = g.id.replace(/^bg_/, "");
  return `${pm} — Group ${short}`;
}

export const PAYMENT_LEDGER = Array.from({ length: 60 }, (_, i) => {
  const ind = INDIVIDUALS[i % INDIVIDUALS.length];
  const org = ORGS.find((o) => o.id === ind.organization_id);
  let contribution_source: "voluntary" | "employer_paid" | "employee_buyup" = "voluntary";
  const employerEligible = ind.employer_contribution_active && ind.employer_contribution_tier !== "0%";
  if (employerEligible && i % 3 === 0) contribution_source = "employer_paid";
  else if (ind.product === "LTC" && ind.issue_type === "SI" && i % 4 === 1) contribution_source = "employee_buyup";
  const coverage_type = ind.product === "DI"
    ? (org?.type_of_rate === "LTD" ? "LTD" : "STDLTD")
    : null;
  // Status cycle now includes "reversed" as a 4th canonical CHECK value.
  const status = ["successful", "successful", "successful", "failed", "pending", "reversed"][i % 6];
  // event_type cycle includes "adjustment" alongside premium/fee/refund.
  const event_type = ["premium", "premium", "premium", "fee", "refund", "adjustment"][i % 6];
  // funding_source canonical values.
  const funding_source = i % 3 === 0 ? "employer_account" : "employee_account";
  return {
    id: `pl_${i + 1}`,
    event_date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    enrollment_id: ind.id,
    individual_name: ind.full_name,
    billing_group_id: ind.billing_group_id,
    event_type,
    amount_cents: ind.monthly_premium_cents,
    status,
    funding_source,
    contribution_source,
    coverage_type,
  };
});

export const ACCOUNT_ADJUSTMENTS = [
  { id: "aa_1", individual_id: "ind_3", individual_name: "Test Person 3", adjustment_type: "premium_correction", amount_cents: -1500, reason: "Mid-cycle plan downgrade", notes: "Confirmed via support ticket #4821.", effective_date: "2025-03-15", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-03-15T14:22Z" },
  { id: "aa_2", individual_id: "ind_11", individual_name: "Test Person 11", adjustment_type: "penalty_waiver", amount_cents: -2500, reason: "Bank holiday processing delay", notes: "", effective_date: "2025-04-02", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-04-02T09:10Z" },
  { id: "aa_3", individual_id: "ind_22", individual_name: "Test Person 22", adjustment_type: "refund", amount_cents: -8500, reason: "Coverage canceled in cooling-off window", notes: "Refund issued via Moov reversal.", effective_date: "2025-05-19", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-05-19T11:45Z" },
  { id: "aa_4", individual_id: "ind_7", individual_name: "Test Person 7", adjustment_type: "write_off", amount_cents: -4200, reason: "Uncollectible after 90 days", notes: "", effective_date: "2025-06-01", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-06-01T16:30Z" },
  { id: "aa_5", individual_id: "ind_5", individual_name: "Test Person 5", adjustment_type: "premium_correction", amount_cents: -750, reason: "Rate cell update applied retroactively", notes: "", effective_date: "2025-06-05", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-06-05T10:00Z" },
  { id: "aa_6", individual_id: "ind_14", individual_name: "Test Person 14", adjustment_type: "penalty_waiver", amount_cents: -1200, reason: "Auto-retry false positive", notes: "Awaiting batch run.", effective_date: "2025-06-10", applied_to_balance: false, approved_by: "Guy (admin)", approved_at: "2025-06-10T11:00Z" },
  { id: "aa_7", individual_id: "ind_18", individual_name: "Test Person 18", adjustment_type: "refund", amount_cents: -3000, reason: "Duplicate charge reversal", notes: "", effective_date: "2025-06-12", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-06-12T13:30Z" },
  { id: "aa_8", individual_id: "ind_24", individual_name: "Test Person 24", adjustment_type: "other", amount_cents: 1500, reason: "Manual debit — late premium", notes: "Pending review by ops lead.", effective_date: "2025-06-14", applied_to_balance: false, approved_by: "Guy (admin)", approved_at: "2025-06-14T09:00Z" },
  { id: "aa_9", individual_id: "ind_9", individual_name: "Test Person 9", adjustment_type: "premium_correction", amount_cents: -425, reason: "Mid-month tier change proration", notes: "", effective_date: "2025-06-15", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-06-15T08:00Z" },
  { id: "aa_10", individual_id: "ind_30", individual_name: "Test Person 30", adjustment_type: "write_off", amount_cents: -2100, reason: "Bad address — uncollectible", notes: "", effective_date: "2025-06-16", applied_to_balance: true, approved_by: "Guy (admin)", approved_at: "2025-06-16T14:00Z" },
];

// Carriers — schema-aligned (DI v13 / LTC v3.13 `carriers` table).
export type CarrierType =
  | "Group DI Carrier"
  | "Group LTC Carrier"
  | "Lloyds MGU"
  | "Domestic Carrier";

export type Carrier = {
  id: string;
  product: Product;
  attio_carrier_id: string | null;
  carrier_name: string;
  carrier_type: CarrierType;
  am_best_rating: string;
  cca_carrier: boolean;
  billing_email: string;
  primary_contact_name: string;
  primary_contact_email: string;
  attio_last_synced_at: string | null;
};

export const CARRIERS: Carrier[] = [
  {
    id: "car_1", product: "DI",
    attio_carrier_id: "att_car_sunlife",
    carrier_name: "Sun Life",
    carrier_type: "Group DI Carrier",
    am_best_rating: "A+",
    cca_carrier: true,
    billing_email: "billing@sunlife.example.com",
    primary_contact_name: "Dana Whitmore",
    primary_contact_email: "dana.whitmore@sunlife.example.com",
    attio_last_synced_at: "2025-06-12T09:15:00Z",
  },
  {
    id: "car_5", product: "LTC",
    attio_carrier_id: "att_car_trustmark",
    carrier_name: "Trustmark",
    carrier_type: "Group LTC Carrier",
    am_best_rating: "A",
    cca_carrier: false,
    billing_email: "billing@trustmark.example.com",
    primary_contact_name: "Marcus Reilly",
    primary_contact_email: "marcus.reilly@trustmark.example.com",
    attio_last_synced_at: "2025-06-11T14:02:00Z",
  },
  {
    id: "car_6", product: "LTC",
    attio_carrier_id: "att_car_transam",
    carrier_name: "Transamerica",
    carrier_type: "Group LTC Carrier",
    am_best_rating: "A+",
    cca_carrier: false,
    billing_email: "billing@transamerica.example.com",
    primary_contact_name: "Priya Shah",
    primary_contact_email: "priya.shah@transamerica.example.com",
    attio_last_synced_at: "2025-06-10T11:30:00Z",
  },
];

export type CarrierProduct = {
  id: string;
  attio_product_id: string | null;
  carrier_id: string;
  product_name: string;
  product_type: string;
  line_of_business: "DI" | "LTC" | "life";
  cca_product: boolean;
  payment_methods_allowed: string;
  active: boolean;
  attio_last_synced_at: string | null;
};

export const CARRIER_PRODUCTS: CarrierProduct[] = [
  { id: "cp_1", attio_product_id: "att_prod_sunlife_gdi", carrier_id: "car_1", product_name: "Group Disability Insurance", product_type: "Disability", line_of_business: "DI", cca_product: true, payment_methods_allowed: "ACH, Credit Card, Apple Pay", active: true, attio_last_synced_at: "2025-06-12T09:15:00Z" },
  { id: "cp_6", attio_product_id: "att_prod_tm_ul205", carrier_id: "car_5", product_name: "UL-205 Universal Life & LifeEvents", product_type: "Universal Life", line_of_business: "LTC", cca_product: false, payment_methods_allowed: "ACH, Credit Card", active: true, attio_last_synced_at: "2025-06-11T14:02:00Z" },
  { id: "cp_7", attio_product_id: "att_prod_tm_gtl121", carrier_id: "car_5", product_name: "GTL-121 Life + Care", product_type: "Group Term Life", line_of_business: "LTC", cca_product: false, payment_methods_allowed: "ACH, Credit Card", active: true, attio_last_synced_at: "2025-06-11T14:02:00Z" },
  { id: "cp_8", attio_product_id: "att_prod_ta_transelite", carrier_id: "car_6", product_name: "TransElite", product_type: "Universal Life", line_of_business: "LTC", cca_product: false, payment_methods_allowed: "ACH", active: true, attio_last_synced_at: "2025-06-10T11:30:00Z" },
  { id: "cp_9", attio_product_id: "att_prod_ta_ul10", carrier_id: "car_6", product_name: "UL10", product_type: "Universal Life", line_of_business: "LTC", cca_product: false, payment_methods_allowed: "ACH", active: true, attio_last_synced_at: "2025-06-10T11:30:00Z" },
  // v15: GI Life add-on (DI). Owned by a DI carrier so it appears in DI policy lists.
  { id: "cp_10", attio_product_id: null, carrier_id: "car_1", product_name: "Group Term Life (GI)", product_type: "group_term_life", line_of_business: "life", cca_product: false, payment_methods_allowed: "ACH, Credit Card", active: true, attio_last_synced_at: null },
];

export type CarrierConstraint = {
  id: string;
  carrier_product_id: string;
  si_max_cents: number;
  increment: number;
  tier_floor_cents: number;
  round_preference_threshold_cents: number;
  // v16: Layer 1 of spouse cap waterfall; nullable (e.g., Trustmark has no hard cap).
  spouse_max_face_cents: number | null;
  // v16: Carrier hard cap on child face; Transamerica caps to MIN(this, applicant face).
  child_max_face_cents: number | null;
  effective_from: string;
  effective_to: string | null;
  verified_by: string;
  last_verified: string;
  source: string;
  notes: string;
};

export const CARRIER_CONSTRAINTS: CarrierConstraint[] = [
  { id: "cc_1", carrier_product_id: "cp_6", si_max_cents: 50000000, increment: 2500000, tier_floor_cents: 10000000, round_preference_threshold_cents: 1000000, spouse_max_face_cents: null, child_max_face_cents: null, effective_from: "2024-01-01", effective_to: null, verified_by: "Guy Livingstone", last_verified: "2025-08-15", source: "Trustmark Producer Guide 2024", notes: "Placeholder values, not validated production rules." },
  { id: "cc_2", carrier_product_id: "cp_7", si_max_cents: 30000000, increment: 1000000, tier_floor_cents: 5000000, round_preference_threshold_cents: 500000, spouse_max_face_cents: null, child_max_face_cents: null, effective_from: "2024-01-01", effective_to: null, verified_by: "Guy Livingstone", last_verified: "2025-08-15", source: "Trustmark GTL Producer Guide 2024", notes: "Placeholder values." },
  { id: "cc_3", carrier_product_id: "cp_8", si_max_cents: 50000000, increment: 2500000, tier_floor_cents: 10000000, round_preference_threshold_cents: 1000000, spouse_max_face_cents: 10000000, child_max_face_cents: 2500000, effective_from: "2024-01-01", effective_to: null, verified_by: "Casey Rep", last_verified: "2025-07-20", source: "Transamerica TransElite Producer Manual", notes: "Placeholder values." },
  { id: "cc_4", carrier_product_id: "cp_9", si_max_cents: 25000000, increment: 1000000, tier_floor_cents: 5000000, round_preference_threshold_cents: 500000, spouse_max_face_cents: 10000000, child_max_face_cents: 2500000, effective_from: "2024-01-01", effective_to: null, verified_by: "Casey Rep", last_verified: "2025-07-20", source: "Transamerica UL10 Producer Manual", notes: "Placeholder values." },
];

export type RiderAvailability = "available" | "not_available" | "requires_state_proposal";
// v16: documents whether the source carrier form treats a rider as inherent (bundled
// into product) or elected (form checkbox per insured). Reference only — Hollowtree
// bundles the richest rider package at the org level regardless.
export type RiderType = "inherent" | "elected";
export type CarrierRiderAvailability = {
  id: string;
  carrier_product_id: string;
  state: string;
  rider_code: string;
  rider_full_name: string;
  available: RiderAvailability;
  rider_type: RiderType;
  effective_from: string | null;
  effective_to: string | null;
  last_verified: string | null;
  verified_by: string;
  source_document: string;
  notes: string;
};

export const CARRIER_RIDER_AVAILABILITY: CarrierRiderAvailability[] = [
  // Trustmark L-205 (UL & LifeEvents) — elected on the carrier form per v16 spec.
  { id: "cra_1", carrier_product_id: "cp_6", state: "NY", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "available", rider_type: "elected", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-08-15", verified_by: "Guy Livingstone", source_document: "Trustmark NY Filing 2024", notes: "" },
  { id: "cra_2", carrier_product_id: "cp_6", state: "CA", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "available", rider_type: "elected", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-08-15", verified_by: "Guy Livingstone", source_document: "Trustmark CA Filing 2024", notes: "" },
  { id: "cra_3", carrier_product_id: "cp_6", state: "FL", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "available", rider_type: "elected", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-08-15", verified_by: "Guy Livingstone", source_document: "Trustmark FL Filing 2024", notes: "" },
  { id: "cra_4", carrier_product_id: "cp_6", state: "NY", rider_code: "CI", rider_full_name: "Chronic Illness Rider", available: "requires_state_proposal", rider_type: "elected", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-08-15", verified_by: "Guy Livingstone", source_document: "Trustmark NY Filing 2024", notes: "Requires state proposal review before issue." },
  { id: "cra_5", carrier_product_id: "cp_6", state: "CA", rider_code: "CI", rider_full_name: "Chronic Illness Rider", available: "available", rider_type: "elected", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-08-15", verified_by: "Guy Livingstone", source_document: "Trustmark CA Filing 2024", notes: "" },
  { id: "cra_6", carrier_product_id: "cp_8", state: "NY", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "not_available", rider_type: "inherent", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-07-20", verified_by: "Casey Rep", source_document: "Transamerica NY Filing 2024", notes: "Not filed in NY." },
  { id: "cra_7", carrier_product_id: "cp_8", state: "CA", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "available", rider_type: "inherent", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-07-20", verified_by: "Casey Rep", source_document: "Transamerica CA Filing 2024", notes: "" },
  { id: "cra_8", carrier_product_id: "cp_9", state: "NY", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "not_available", rider_type: "inherent", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-07-20", verified_by: "Casey Rep", source_document: "Transamerica NY Filing 2024", notes: "" },
  { id: "cra_9", carrier_product_id: "cp_9", state: "TX", rider_code: "LTC", rider_full_name: "Long-Term Care Rider", available: "available", rider_type: "inherent", effective_from: "2024-01-01", effective_to: null, last_verified: "2025-07-20", verified_by: "Casey Rep", source_document: "Transamerica TX Filing 2024", notes: "" },
];

// 5 canonical PolicyStatus CHECK values (renamed from `status` to `enrollment_status` on Policy).
export type PolicyStatus = "pending" | "active" | "lapsed" | "closed" | "terminated";
export type PolicyOwnerType = "employer_group" | "affiliate" | "individual";

export type Policy = {
  id: string;
  policy_name: string | null;
  policy_number: string | null;
  organization_id: string;
  org_name: string;
  carrier_product_id: string;
  product: Product;
  enrollment_status: PolicyStatus;
  policy_owner_type: PolicyOwnerType;
  individual_id?: string | null;
  carrier_commission_pct: number | null;
  override_pct: number | null;
  channel_partner_id: string | null;
  commission_schedule_id: string | null;
  initial_effective_date: string;
  attio_synced_at: string | null;
  updated_at: string;
  attio_record_id: string;
  attio_policy_id: string | null;
  account_manager: string | null;
  google_drive_folder: string | null;
  original_enrollee_count: number | null;
  // Dollar columns (whole dollars, NOT cents).
  original_monthly_premium: number | null;
  ltc_bronze: number | null;
  ltc_silver: number | null;
  ltc_gold: number | null;
  ltc_platinum: number | null;
  ltc_diamond: number | null;
  // v15-audit: hollowtree_paid (default) vs carrier_direct affects commission payable.
  // Optional in data layer; consumers default to 'hollowtree_paid'. See getPolicyPaymentMethod().
  payment_method?: "hollowtree_paid" | "carrier_direct";
};

// Whole-dollar tier defaults for LTC policies.
const _LTC_TIERS = { ltc_bronze: 50000, ltc_silver: 100000, ltc_gold: 150000, ltc_platinum: 200000, ltc_diamond: 250000 };
const _NO_TIERS = { ltc_bronze: null, ltc_silver: null, ltc_gold: null, ltc_platinum: null, ltc_diamond: null };
const _CARRIER_DIRECT_POL_IDS = new Set(["pol_4", "pol_8", "pol_9"]);
export function getPolicyPaymentMethod(id: string): "hollowtree_paid" | "carrier_direct" {
  return _CARRIER_DIRECT_POL_IDS.has(id) ? "carrier_direct" : "hollowtree_paid";
}

export const POLICIES: Policy[] = [
  { id: "pol_1", policy_name: "Acme Widgets Group DI 2025", policy_number: "DI-AC-2025-001", organization_id: "org_1", org_name: "Acme Widgets Co", carrier_product_id: "cp_1", product: "DI", enrollment_status: "active", policy_owner_type: "affiliate", carrier_commission_pct: 12, override_pct: 3, channel_partner_id: "cpn_1", commission_schedule_id: null, initial_effective_date: "2025-02-01", attio_synced_at: "2025-06-10T14:14:00Z", updated_at: "2025-06-09T11:00:00Z", attio_record_id: "att_pol_1", attio_policy_id: "att_pol_1", account_manager: "Guy Livingstone", google_drive_folder: "https://drive.google.com/drive/folders/acme-2025", original_enrollee_count: 12, original_monthly_premium: 2450, ..._NO_TIERS },
  { id: "pol_2", policy_name: "Bluefin Logistics DI Plan", policy_number: "DI-BF-2025-002", organization_id: "org_2", org_name: "Bluefin Logistics", carrier_product_id: "cp_1", product: "DI", enrollment_status: "active", policy_owner_type: "employer_group", carrier_commission_pct: 10, override_pct: null, channel_partner_id: "cpn_2", commission_schedule_id: null, initial_effective_date: "2025-03-15", attio_synced_at: "2025-05-20T09:00:00Z", updated_at: "2025-06-12T16:30:00Z", attio_record_id: "att_pol_2", attio_policy_id: "att_pol_2", account_manager: "Casey Rep", google_drive_folder: null, original_enrollee_count: 7, original_monthly_premium: 1420, ..._NO_TIERS },
  { id: "pol_3", policy_name: "Coastal CU LTC Group", policy_number: "TM-UL205-2025-CCU", organization_id: "org_3", org_name: "Coastal Credit Union", carrier_product_id: "cp_6", product: "LTC", enrollment_status: "active", policy_owner_type: "employer_group", carrier_commission_pct: null, override_pct: null, channel_partner_id: "cpn_1", commission_schedule_id: "ccs_5", initial_effective_date: "2025-04-01", attio_synced_at: "2025-06-11T10:00:00Z", updated_at: "2025-06-08T08:00:00Z", attio_record_id: "att_pol_3", attio_policy_id: "att_pol_3", account_manager: "Guy Livingstone", google_drive_folder: "https://drive.google.com/drive/folders/coastal-ltc", original_enrollee_count: 9, original_monthly_premium: 1875, ..._LTC_TIERS },
  { id: "pol_4", policy_name: "Evergreen Health LTC", policy_number: "TM-UL205-2025-EVG", organization_id: "org_5", org_name: "Evergreen Health", carrier_product_id: "cp_6", product: "LTC", enrollment_status: "active", policy_owner_type: "employer_group", carrier_commission_pct: null, override_pct: null, channel_partner_id: "cpn_1", commission_schedule_id: "ccs_6", initial_effective_date: "2025-05-01", attio_synced_at: "2025-06-12T13:00:00Z", updated_at: "2025-06-10T10:00:00Z", attio_record_id: "att_pol_4", attio_policy_id: "att_pol_4", account_manager: "Casey Rep", google_drive_folder: null, original_enrollee_count: 6, original_monthly_premium: 1240, ..._LTC_TIERS },
  { id: "pol_5", policy_name: "Greylock Partners Affiliate DI", policy_number: null, organization_id: "org_7", org_name: "Greylock Partners LLC", carrier_product_id: "cp_1", product: "DI", enrollment_status: "pending", policy_owner_type: "affiliate", carrier_commission_pct: 12, override_pct: 3, channel_partner_id: "cpn_1", commission_schedule_id: null, initial_effective_date: "2025-07-01", attio_synced_at: null, updated_at: "2025-06-14T09:00:00Z", attio_record_id: "att_pol_5", attio_policy_id: null, account_manager: "Morgan Rep", google_drive_folder: null, original_enrollee_count: 5, original_monthly_premium: 980, ..._NO_TIERS },
  { id: "pol_6", policy_name: null, policy_number: "DI-DEL-2024-006", organization_id: "org_4", org_name: "Delta Manufacturing", carrier_product_id: "cp_1", product: "DI", enrollment_status: "terminated", policy_owner_type: "employer_group", carrier_commission_pct: 10, override_pct: 2, channel_partner_id: "cpn_2", commission_schedule_id: null, initial_effective_date: "2024-06-01", attio_synced_at: "2025-04-01T10:00:00Z", updated_at: "2025-04-01T10:00:00Z", attio_record_id: "att_pol_6", attio_policy_id: "att_pol_6", account_manager: null, google_drive_folder: null, original_enrollee_count: 4, original_monthly_premium: 750, ..._NO_TIERS },
  { id: "pol_7", policy_name: "Foxtail Education LTC Trust", policy_number: null, organization_id: "org_6", org_name: "Foxtail Education Trust", carrier_product_id: "cp_8", product: "LTC", enrollment_status: "pending", policy_owner_type: "employer_group", carrier_commission_pct: null, override_pct: null, channel_partner_id: null, commission_schedule_id: "ccs_10", initial_effective_date: "2025-08-15", attio_synced_at: null, updated_at: "2025-06-13T12:00:00Z", attio_record_id: "att_pol_7", attio_policy_id: null, account_manager: "Morgan Rep", google_drive_folder: null, original_enrollee_count: 2, original_monthly_premium: 380, ..._LTC_TIERS },
  { id: "pol_8", policy_name: "Coastal CU LTC Amendment", policy_number: "TM-UL205-2025-CCU-A", organization_id: "org_3", org_name: "Coastal Credit Union", carrier_product_id: "cp_6", product: "LTC", enrollment_status: "lapsed", policy_owner_type: "employer_group", carrier_commission_pct: null, override_pct: null, channel_partner_id: "cpn_2", commission_schedule_id: null, initial_effective_date: "2025-01-15", attio_synced_at: "2025-06-10T08:00:00Z", updated_at: "2025-06-10T07:00:00Z", attio_record_id: "att_pol_8", attio_policy_id: "att_pol_8", account_manager: "Guy Livingstone", google_drive_folder: null, original_enrollee_count: 3, original_monthly_premium: 620, ..._LTC_TIERS },
  { id: "pol_9", policy_name: "Foxtail Closed Pilot", policy_number: "TA-TE-2024-FX", organization_id: "org_6", org_name: "Foxtail Education Trust", carrier_product_id: "cp_8", product: "LTC", enrollment_status: "closed", policy_owner_type: "affiliate", carrier_commission_pct: null, override_pct: null, channel_partner_id: null, commission_schedule_id: "ccs_10", initial_effective_date: "2024-03-01", attio_synced_at: "2024-12-01T10:00:00Z", updated_at: "2024-12-01T10:00:00Z", attio_record_id: "att_pol_9", attio_policy_id: "att_pol_9", account_manager: null, google_drive_folder: null, original_enrollee_count: 1, original_monthly_premium: 180, ..._LTC_TIERS },
  // v15: individual-type DI policies (converted enrollees)
  { id: "pol_10", policy_name: "Test Person 10 — Individual DI", policy_number: "DI-IND-2026-010", organization_id: "org_1", org_name: "Acme Widgets Co", carrier_product_id: "cp_1", product: "DI", enrollment_status: "active", policy_owner_type: "individual", individual_id: "ind_10", carrier_commission_pct: 8, override_pct: null, channel_partner_id: null, commission_schedule_id: null, initial_effective_date: "2026-04-15", attio_synced_at: null, updated_at: "2026-04-15T10:00:00Z", attio_record_id: "att_pol_10", attio_policy_id: null, account_manager: null, google_drive_folder: null, original_enrollee_count: 1, original_monthly_premium: 50, ..._NO_TIERS },
  { id: "pol_11", policy_name: "Test Person 19 — Individual DI", policy_number: "DI-IND-2026-011", organization_id: "org_2", org_name: "Bluefin Logistics", carrier_product_id: "cp_1", product: "DI", enrollment_status: "active", policy_owner_type: "individual", individual_id: "ind_19", carrier_commission_pct: 8, override_pct: null, channel_partner_id: null, commission_schedule_id: null, initial_effective_date: "2026-05-20", attio_synced_at: null, updated_at: "2026-05-20T10:00:00Z", attio_record_id: "att_pol_11", attio_policy_id: null, account_manager: null, google_drive_folder: null, original_enrollee_count: 1, original_monthly_premium: 60, ..._NO_TIERS },
  // v15: GI Life group policy (DI add-on)
  { id: "pol_12", policy_name: "GI Life Group Policy", policy_number: "LIFE-2025-001", organization_id: "org_1", org_name: "Acme Widgets Co", carrier_product_id: "cp_10", product: "DI", enrollment_status: "active", policy_owner_type: "employer_group", individual_id: null, carrier_commission_pct: 10, override_pct: null, channel_partner_id: "cpn_1", commission_schedule_id: null, initial_effective_date: "2025-08-01", attio_synced_at: null, updated_at: "2025-08-01T10:00:00Z", attio_record_id: "att_pol_12", attio_policy_id: null, account_manager: "Guy Livingstone", google_drive_folder: null, original_enrollee_count: 4, original_monthly_premium: 200, ..._NO_TIERS },
];

export const CHANNEL_PARTNERS = [
  { id: "cpn_1", partner_name: "WTC Benefits", partner_type: "Broker", default_split_pct: 40, payment_method: "hollowtree_paid" },
  { id: "cpn_2", partner_name: "Westfield Brokers", partner_type: "Broker", default_split_pct: 60, payment_method: "hollowtree_paid" },
  { id: "cpn_3", partner_name: "Hollowtree House", partner_type: "House", default_split_pct: 45, payment_method: "hollowtree_paid" },
  { id: "cpn_4", partner_name: "Jamie Rep", partner_type: "Internal", default_split_pct: 10, payment_method: "hollowtree_paid" },
  { id: "cpn_5", partner_name: "Gallagher", partner_type: "Override", default_split_pct: 5, payment_method: "carrier_direct" },
  { id: "cpn_6", partner_name: "Override Group LLC", partner_type: "Override", default_split_pct: 5, payment_method: "carrier_direct" },
];

export const INTERNAL_REPS = [
  { id: "rep_1", name: "Guy Livingstone" },
  { id: "rep_2", name: "Jamie Rep" },
  { id: "rep_3", name: "Casey Rep" },
  { id: "rep_4", name: "Morgan Rep" },
];

export const ORG_PRIMARY_CHANNEL_PARTNER: Record<string, string> = {
  org_1: "cpn_1", org_2: "cpn_2", org_3: "cpn_1", org_4: "cpn_2",
  org_5: "cpn_1", org_6: "cpn_2", org_7: "cpn_1", org_8: "cpn_2",
};

export const COMMISSION_SPLIT_DEFAULTS = CHANNEL_PARTNERS.map((p) => ({
  id: `csd_${p.id}`,
  channel_partner_id: p.id,
  channel_partner_name: p.partner_name,
  payee_type: p.partner_type === "House" ? "house" : p.partner_type === "Internal" ? "internal_rep" : p.partner_type === "Override" ? "override" : "channel_partner",
  default_split_pct: p.default_split_pct,
  payment_method: p.payment_method,
}));

export type PayeeType = "house" | "internal_rep" | "channel_partner" | "override";
export type PaymentMethodSetting = "hollowtree_paid" | "carrier_direct";
export type SplitSource = "default" | "override";

export type PolicySplit = {
  id: string;
  policy_id: string;
  payee_type: PayeeType;
  payee_name: string;
  split_pct: number;
  payment_method: PaymentMethodSetting;
  source: SplitSource;
  effective_to: string | null;
};

export const POLICY_SPLITS_INITIAL: PolicySplit[] = [
  { id: "ps_1_1", policy_id: "pol_1", payee_type: "house", payee_name: "Hollowtree", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_1_2", policy_id: "pol_1", payee_type: "internal_rep", payee_name: "Guy Livingstone", split_pct: 10, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_1_3", policy_id: "pol_1", payee_type: "channel_partner", payee_name: "WTC Benefits", split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_1_4", policy_id: "pol_1", payee_type: "override", payee_name: "Gallagher", split_pct: 5, payment_method: "carrier_direct", source: "default", effective_to: null },

  { id: "ps_2_1", policy_id: "pol_2", payee_type: "house", payee_name: "Hollowtree", split_pct: 50, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_2_2", policy_id: "pol_2", payee_type: "channel_partner", payee_name: "Westfield Brokers", split_pct: 50, payment_method: "hollowtree_paid", source: "default", effective_to: null },

  { id: "ps_3_1", policy_id: "pol_3", payee_type: "house", payee_name: "Hollowtree", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_3_2", policy_id: "pol_3", payee_type: "channel_partner", payee_name: "WTC Benefits", split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },

  { id: "ps_4_1", policy_id: "pol_4", payee_type: "house", payee_name: "Hollowtree", split_pct: 50, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_4_2", policy_id: "pol_4", payee_type: "internal_rep", payee_name: "Casey Rep", split_pct: 10, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_4_3", policy_id: "pol_4", payee_type: "channel_partner", payee_name: "WTC Benefits", split_pct: 35, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_4_4", policy_id: "pol_4", payee_type: "override", payee_name: "Override Group LLC", split_pct: 5, payment_method: "carrier_direct", source: "default", effective_to: null },

  { id: "ps_5_1", policy_id: "pol_5", payee_type: "house", payee_name: "Hollowtree", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_5_2", policy_id: "pol_5", payee_type: "internal_rep", payee_name: "Guy Livingstone", split_pct: 10, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_5_3", policy_id: "pol_5", payee_type: "channel_partner", payee_name: "WTC Benefits", split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_5_4", policy_id: "pol_5", payee_type: "override", payee_name: "Gallagher", split_pct: 5, payment_method: "carrier_direct", source: "default", effective_to: null },

  { id: "ps_6_1", policy_id: "pol_6", payee_type: "house", payee_name: "Hollowtree", split_pct: 50, payment_method: "hollowtree_paid", source: "default", effective_to: "2025-04-01" },
  { id: "ps_6_2", policy_id: "pol_6", payee_type: "channel_partner", payee_name: "Westfield Brokers", split_pct: 50, payment_method: "hollowtree_paid", source: "default", effective_to: "2025-04-01" },

  { id: "ps_7_1", policy_id: "pol_7", payee_type: "house", payee_name: "Hollowtree", split_pct: 60, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_7_2", policy_id: "pol_7", payee_type: "channel_partner", payee_name: "Westfield Brokers", split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },

  { id: "ps_8_1", policy_id: "pol_8", payee_type: "house", payee_name: "Hollowtree", split_pct: 55, payment_method: "hollowtree_paid", source: "default", effective_to: null },
  { id: "ps_8_2", policy_id: "pol_8", payee_type: "channel_partner", payee_name: "WTC Benefits", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
];

export const POLICY_SPLITS = POLICY_SPLITS_INITIAL.filter((s) => s.policy_id === "pol_1").map((s) => ({
  id: s.id, policy_id: s.policy_id, channel_partner_name: s.payee_name, pct: s.split_pct,
}));

// Commission statements — wireframe demo includes draft / approved / paid lifecycle.
export type CommissionStatementStatus = "draft" | "approved" | "paid";
export type CommissionStatement = {
  id: string;
  payee: string;
  period: string;
  amount_cents: number;
  payable: boolean;
  status: CommissionStatementStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  payment_reference: string | null;
};

export const COMMISSION_STATEMENTS: CommissionStatement[] = [
  { id: "cs_1", payee: "WTC Benefits", period: "2025-05", amount_cents: 245000, payable: true, status: "paid", approved_by: "Guy Livingstone", approved_at: "2025-06-03T14:22Z", paid_by: "Alex Admin", paid_at: "2025-06-08T11:00Z", payment_reference: "ACH-2025-0617-WTC" },
  { id: "cs_2", payee: "Hollowtree House", period: "2025-05", amount_cents: 81000, payable: true, status: "approved", approved_by: "Guy Livingstone", approved_at: "2025-06-03T14:22Z", paid_by: null, paid_at: null, payment_reference: null },
  { id: "cs_3", payee: "Guy Livingstone", period: "2025-05", amount_cents: 60500, payable: true, status: "draft", approved_by: null, approved_at: null, paid_by: null, paid_at: null, payment_reference: null },
  { id: "cs_4", payee: "Gallagher", period: "2025-05", amount_cents: 20000, payable: false, status: "draft", approved_by: null, approved_at: null, paid_by: null, paid_at: null, payment_reference: null },
];

export type ScheduleType = "heaped" | "flat" | "level";
export type CarrierCommissionSchedule = {
  id: string;
  carrier_product_id: string;
  carrier_product_name: string;
  state_code: string | null;
  schedule_name: string;
  schedule_type: ScheduleType;
  is_default: boolean;
  effective_from: string;
  effective_to: string | null;
};

export const CARRIER_COMMISSION_SCHEDULES: CarrierCommissionSchedule[] = [
  { id: "ccs_5", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: null, schedule_name: "Heaped Standard", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_6", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: "NY", schedule_name: "Heaped NY", schedule_type: "heaped", is_default: false, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_7", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: null, schedule_name: "Flat", schedule_type: "flat", is_default: false, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_8", carrier_product_id: "cp_7", carrier_product_name: "GTL-121 Life + Care", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_9", carrier_product_id: "cp_7", carrier_product_name: "GTL-121 Life + Care", state_code: null, schedule_name: "Flat", schedule_type: "flat", is_default: false, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_10", carrier_product_id: "cp_8", carrier_product_name: "TransElite", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_11", carrier_product_id: "cp_9", carrier_product_name: "UL10", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
];

// commission_rate_tiers — canonical: from_year, to_year, rate_pct.
export const COMMISSION_RATE_TIERS = [
  { id: "crt_10", schedule_id: "ccs_5", from_year: 1, to_year: 1, rate_pct: 100 },
  { id: "crt_11", schedule_id: "ccs_5", from_year: 2, to_year: 10, rate_pct: 5 },
  { id: "crt_12", schedule_id: "ccs_5", from_year: 11, to_year: 99, rate_pct: 0 },
  { id: "crt_13", schedule_id: "ccs_6", from_year: 1, to_year: 1, rate_pct: 90 },
  { id: "crt_14", schedule_id: "ccs_6", from_year: 2, to_year: 3, rate_pct: 10 },
  { id: "crt_15", schedule_id: "ccs_6", from_year: 4, to_year: 10, rate_pct: 5 },
  { id: "crt_16", schedule_id: "ccs_6", from_year: 11, to_year: 99, rate_pct: 0 },
  { id: "crt_17", schedule_id: "ccs_7", from_year: 1, to_year: 99, rate_pct: 22 },
  { id: "crt_18", schedule_id: "ccs_8", from_year: 1, to_year: 1, rate_pct: 100 },
  { id: "crt_19", schedule_id: "ccs_8", from_year: 2, to_year: 10, rate_pct: 5 },
  { id: "crt_20", schedule_id: "ccs_8", from_year: 11, to_year: 99, rate_pct: 0 },
  { id: "crt_21", schedule_id: "ccs_9", from_year: 1, to_year: 99, rate_pct: 22 },
  { id: "crt_22", schedule_id: "ccs_10", from_year: 1, to_year: 1, rate_pct: 100 },
  { id: "crt_23", schedule_id: "ccs_10", from_year: 2, to_year: 4, rate_pct: 4 },
  { id: "crt_24", schedule_id: "ccs_10", from_year: 5, to_year: 6, rate_pct: 4 },
  { id: "crt_25", schedule_id: "ccs_10", from_year: 7, to_year: 99, rate_pct: 2 },
  { id: "crt_26", schedule_id: "ccs_11", from_year: 1, to_year: 1, rate_pct: 100 },
  { id: "crt_27", schedule_id: "ccs_11", from_year: 2, to_year: 4, rate_pct: 4 },
  { id: "crt_28", schedule_id: "ccs_11", from_year: 5, to_year: 6, rate_pct: 4 },
  { id: "crt_29", schedule_id: "ccs_11", from_year: 7, to_year: 99, rate_pct: 2 },
];

// AffiliateType canonical: "industry_association" renamed to "association".
export type AffiliateType = "cca" | "union" | "association" | "employer_trust" | "other";
export type AffiliationLevel = "individual" | "employer";
export type AffiliateIndustry =
  | "education" | "healthcare" | "government" | "manufacturing"
  | "professional_services" | "transportation" | "hospitality" | "other";
export type LegalEntityStatus = "formed_no_tax_id" | "formed_with_tax_id" | "operational";

export type AffiliateOrganization = {
  id: string;
  name: string;
  affiliate_type: AffiliateType;
  affiliation_level: AffiliationLevel;
  industry: AffiliateIndustry | null;
  is_external: boolean;
  is_active: boolean;
  legal_entity_status: LegalEntityStatus | null;
  notes: string;
};

export const AFFILIATE_ORGANIZATIONS: AffiliateOrganization[] = [
  { id: "aff_1", name: "CCU Member Foundation", affiliate_type: "association", affiliation_level: "individual", industry: null, is_external: true, is_active: true, legal_entity_status: "operational", notes: "From enrollment windows dummy data." },
  { id: "aff_2", name: "Foxtail Alumni Assoc", affiliate_type: "association", affiliation_level: "individual", industry: null, is_external: true, is_active: true, legal_entity_status: "operational", notes: "From enrollment windows dummy data." },
  { id: "aff_3", name: "Clinicians Care Association", affiliate_type: "cca", affiliation_level: "individual", industry: "healthcare", is_external: true, is_active: true, legal_entity_status: "operational", notes: "DI primary. The CCA." },
  { id: "aff_4", name: "TeamHealth Affiliate Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "healthcare", is_external: false, is_active: true, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created." },
  { id: "aff_5", name: "Healthcare Workers United", affiliate_type: "union", affiliation_level: "individual", industry: "healthcare", is_external: true, is_active: true, legal_entity_status: "operational", notes: "Example union." },
  { id: "aff_6", name: "Pacific Educators Alliance", affiliate_type: "association", affiliation_level: "individual", industry: "education", is_external: true, is_active: true, legal_entity_status: "operational", notes: "Example association." },
  { id: "aff_7", name: "National Education Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "education", is_external: false, is_active: true, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created." },
  { id: "aff_8", name: "Public Sector Benefits Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "government", is_external: false, is_active: true, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created." },
];

// sponsor_type CHECK is only "employer" | "affiliate". The "Employer + Affiliate"
// display state is derived when sponsor_type='employer' AND affiliate_organization_id IS NOT NULL.
export type EnrollmentWindow = {
  id: string;
  organization_id: string | null;
  org_name: string | null;
  affiliate_organization_id: string | null;
  affiliate_org: string | null;
  window_type: "initial" | "annual" | "new_joiner" | "special";
  enrollment_start_date: string | null;
  enrollment_end_date: string | null;
  default_effective_date: string | null;
  status: "upcoming" | "open" | "closed";
  sponsor_type: "employer" | "affiliate";
  carrier: string;
  gi_eligible: boolean;
  notes: string;
  channel_partners: Array<{ id: string; channel_partner_id: string; role: string }>;
};

export const ENROLLMENT_WINDOWS: EnrollmentWindow[] = [
  { id: "ew_1", organization_id: "org_1", org_name: "Acme Widgets Co", affiliate_organization_id: null, affiliate_org: null, window_type: "initial", enrollment_start_date: "2025-01-01", enrollment_end_date: "2025-01-31", default_effective_date: "2025-02-01", status: "closed", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "", channel_partners: [] },
  { id: "ew_2", organization_id: "org_1", org_name: "Acme Widgets Co", affiliate_organization_id: null, affiliate_org: null, window_type: "annual", enrollment_start_date: "2025-09-01", enrollment_end_date: "2025-09-30", default_effective_date: "2025-10-01", status: "upcoming", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "", channel_partners: [] },
  // ew_3: employer sponsor with linked affiliate — display badge derives "Employer + Affiliate".
  { id: "ew_3", organization_id: "org_3", org_name: "Coastal Credit Union", affiliate_organization_id: "aff_1", affiliate_org: "CCU Member Foundation", window_type: "annual", enrollment_start_date: "2025-08-01", enrollment_end_date: "2025-08-31", default_effective_date: "2025-09-01", status: "open", sponsor_type: "employer", carrier: "Heritage LTC Group", gi_eligible: true, notes: "", channel_partners: [{ id: "ewcp_1", channel_partner_id: "cpn_1", role: "primary" }] },
  { id: "ew_4", organization_id: null, org_name: null, affiliate_organization_id: "aff_2", affiliate_org: "Foxtail Alumni Assoc", window_type: "special", enrollment_start_date: "2025-07-15", enrollment_end_date: "2025-08-15", default_effective_date: null, status: "open", sponsor_type: "affiliate", carrier: "Sequoia Care Partners", gi_eligible: false, notes: "", channel_partners: [] },
  { id: "ew_5", organization_id: "org_1", org_name: "Acme Widgets Co", affiliate_organization_id: null, affiliate_org: null, window_type: "new_joiner", enrollment_start_date: null, enrollment_end_date: null, default_effective_date: null, status: "open", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "Always open. Per-individual deadlines computed from hire date.", channel_partners: [] },
];

// v14 magic_tokens — 14 columns; raw token never exposed in UI.
export type MagicTokenClass = "enrollment" | "portal";
export type MagicTokenStatus = "active" | "revoked" | "expired";
export type MagicToken = {
  id: string;
  individual_id: string;
  individual_name: string;
  token_class: MagicTokenClass;
  status: MagicTokenStatus;
  expires_at: string;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  portal_destination: "hollowtree" | "cca" | null;
};

function _hash64(seed: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  let v = h;
  for (let i = 0; i < 8; i++) {
    v = Math.imul(v ^ (i * 2654435761), 16777619) >>> 0;
    out += v.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

const _MT_SEED: Array<Partial<MagicToken> & { individual_id: string; token_class: MagicTokenClass; status: MagicTokenStatus; expires_at: string; created_at: string }> = [
  { individual_id: "ind_1",  token_class: "enrollment", status: "active",  expires_at: "2026-08-15T23:59:59Z", created_at: "2026-05-01T10:12:00Z", use_count: 0, last_used_at: null, portal_destination: null },
  { individual_id: "ind_3",  token_class: "portal",     status: "active",  expires_at: "2027-03-04T12:00:00Z", created_at: "2026-03-04T12:00:00Z", use_count: 11, last_used_at: "2026-06-12T08:42:00Z", portal_destination: "hollowtree" },
  { individual_id: "ind_5",  token_class: "portal",     status: "active",  expires_at: "2027-01-15T09:00:00Z", created_at: "2026-01-15T09:00:00Z", use_count: 3, last_used_at: "2026-06-01T14:10:00Z", portal_destination: "hollowtree" },
  { individual_id: "ind_6",  token_class: "enrollment", status: "active",  expires_at: "2026-09-30T23:59:59Z", created_at: "2026-04-22T16:30:00Z", use_count: 2, last_used_at: "2026-06-08T19:01:00Z", portal_destination: null },
  { individual_id: "ind_8",  token_class: "enrollment", status: "active",  expires_at: "2026-05-30T23:59:59Z", created_at: "2026-03-15T11:45:00Z", use_count: 4, last_used_at: "2026-05-28T20:13:00Z", portal_destination: null },
  { individual_id: "ind_9",  token_class: "enrollment", status: "expired", expires_at: "2025-04-01T23:59:59Z", created_at: "2025-02-20T09:00:00Z", use_count: 1, last_used_at: "2025-03-22T08:14:00Z", portal_destination: null },
  { individual_id: "ind_11", token_class: "portal",     status: "active",  expires_at: "2026-10-15T23:59:59Z", created_at: "2025-10-15T14:30:00Z", use_count: 0, last_used_at: null, portal_destination: "hollowtree" },
  { individual_id: "ind_12", token_class: "portal",     status: "active",  expires_at: "2027-02-10T09:00:00Z", created_at: "2026-02-10T09:00:00Z", use_count: 7, last_used_at: "2026-06-05T17:55:00Z", portal_destination: "hollowtree" },
  { individual_id: "ind_13", token_class: "portal",     status: "revoked", expires_at: "2027-04-01T10:00:00Z", created_at: "2026-04-01T10:00:00Z", use_count: 2, last_used_at: "2026-05-02T11:22:00Z", revoked_at: "2026-05-30T15:08:00Z", revoked_by: "Guy (admin)", revocation_reason: "Enrollee reported phishing attempt — unauthorized access from unrecognized IP.", portal_destination: "hollowtree" },
  { individual_id: "ind_14", token_class: "portal",     status: "active",  expires_at: "2027-05-22T10:00:00Z", created_at: "2026-05-22T10:00:00Z", use_count: 1, last_used_at: "2026-06-10T07:09:00Z", portal_destination: "cca" },
  { individual_id: "ind_17", token_class: "enrollment", status: "revoked", expires_at: "2026-07-15T23:59:59Z", created_at: "2026-05-10T13:00:00Z", use_count: 0, last_used_at: null, revoked_at: "2026-06-02T10:00:00Z", revoked_by: "Ops User 1", revocation_reason: "Enrollee requested re-issue after losing device.", portal_destination: null },
  { individual_id: "ind_22", token_class: "portal",     status: "expired", expires_at: "2026-01-08T10:00:00Z", created_at: "2025-01-08T10:00:00Z", use_count: 12, last_used_at: "2025-12-30T19:00:00Z", portal_destination: "hollowtree" },
];

export const MAGIC_TOKENS: MagicToken[] = _MT_SEED.map((s, i) => {
  const ind = INDIVIDUALS.find((x) => x.id === s.individual_id);
  return {
    id: `mt_${i + 1}`,
    individual_id: s.individual_id,
    individual_name: ind?.full_name ?? s.individual_id,
    token_class: s.token_class,
    status: s.status,
    expires_at: s.expires_at,
    created_at: s.created_at,
    last_used_at: s.last_used_at ?? null,
    use_count: s.use_count ?? 0,
    revoked_at: s.revoked_at ?? null,
    revoked_by: s.revoked_by ?? null,
    revocation_reason: s.revocation_reason ?? null,
    portal_destination: s.portal_destination ?? null,
  };
});

export type TokenAuditOutcome = "success" | "invalid_token" | "revoked" | "expired" | "class_mismatch" | "rate_limited";
export type TokenAuditEntry = {
  id: string;
  token_id: string | null;
  individual_id: string | null;
  individual_name: string | null;
  token_class: MagicTokenClass | null;
  attempted_token_hash: string;
  outcome: TokenAuditOutcome;
  ip_address: string;
  user_agent: string;
  created_at: string;
};

const _UA_SAMPLES = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "curl/8.4.0",
];

const _OUTCOMES: TokenAuditOutcome[] = ["success", "success", "success", "success", "invalid_token", "expired", "revoked", "class_mismatch", "rate_limited", "success"];

export const TOKEN_AUDIT_LOG: TokenAuditEntry[] = Array.from({ length: 38 }, (_, i) => {
  const outcome = _OUTCOMES[i % _OUTCOMES.length];
  const resolves = outcome !== "invalid_token";
  const token = resolves ? MAGIC_TOKENS[i % MAGIC_TOKENS.length] : null;
  const day = (i % 14) + 1;
  const hour = (i * 3) % 24;
  const minute = (i * 7) % 60;
  const ts = `2026-06-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
  const hashSeed = i === 4 || i === 11 || i === 24 ? "shared-bad-token-seed" : `${token?.id ?? "unknown"}-${i}`;
  return {
    id: `tal_${i + 1}`,
    token_id: token?.id ?? null,
    individual_id: token?.individual_id ?? null,
    individual_name: token?.individual_name ?? null,
    token_class: token?.token_class ?? null,
    attempted_token_hash: _hash64(hashSeed),
    outcome,
    ip_address: `${10 + (i % 240)}.${(i * 13) % 255}.${(i * 7) % 255}.${(i * 3) % 255}`,
    user_agent: _UA_SAMPLES[i % _UA_SAMPLES.length],
    created_at: ts,
  };
});

export type AuditAction = "create" | "update" | "soft_delete" | "view_phi" | "export_phi";
export type AuditEntry = {
  id: string;
  timestamp: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  actor_id: string;
  actor_name: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
};

const _AL_TABLES = [
  "individuals", "organizations", "policies", "account_adjustments",
  "billing_groups", "enrollment_responses", "benefit_classes",
  "enrollment_windows", "magic_tokens", "commission_statements",
] as const;
const _AL_ACTORS: Array<[string, string]> = [
  ["user_2abcDEF123", "Alex Admin"],
  ["user_2ghiJKL456", "Jordan Ops"],
  ["user_2mnoPQR789", "Riley Ops"],
  ["user_2stuVWX012", "Morgan Admin"],
  ["system", "System"],
];
const _AL_REASONS = [
  "Reviewing enrollment for carrier handoff",
  "Investigating billing discrepancy reported by enrollee",
  "Routine compliance spot-check",
  "Preparing renewal packet for broker",
  "Responding to enrollee support request",
];
const _AL_ACTIONS: AuditAction[] = ["create", "update", "update", "update", "soft_delete", "view_phi", "view_phi", "export_phi"];

export const AUDIT_LOG: AuditEntry[] = Array.from({ length: 84 }, (_, i) => {
  const action = _AL_ACTIONS[i % _AL_ACTIONS.length];
  const table_name = action === "view_phi" || action === "export_phi"
    ? ["individuals", "enrollment_responses", "individuals"][i % 3]
    : _AL_TABLES[i % _AL_TABLES.length];
  const [actor_id, actor_name] = _AL_ACTORS[i % _AL_ACTORS.length];
  const daysAgo = i % 30;
  const d = new Date(Date.UTC(2026, 5, 16) - daysAgo * 86400000 - (i % 8) * 3600000);
  const timestamp = d.toISOString();
  const record_id = action === "view_phi" || action === "export_phi"
    ? `ind_${(i % 40) + 1}`
    : `rec_${String(100 + i).padStart(6, "0")}-${(i * 7 % 9999).toString(16)}`;

  let old_values: Record<string, unknown> | null = null;
  let new_values: Record<string, unknown> | null = null;
  if (action === "create") {
    new_values = { id: record_id, status: "pending", name: `Record ${i}`, created_at: timestamp };
  } else if (action === "update") {
    old_values = { status: "pending", premium_cents: 12500, updated_at: timestamp };
    new_values = { status: "active", premium_cents: 13200, updated_at: timestamp };
  } else if (action === "soft_delete") {
    old_values = { id: record_id, status: "active", name: `Record ${i}`, deleted_at: null };
    new_values = { deleted_at: timestamp };
  } else if (action === "view_phi") {
    new_values = {
      context: "Opened PHI drawer",
      fields_viewed: ["ssn_encrypted", "date_of_birth", "address_line_1"],
      reason: _AL_REASONS[i % _AL_REASONS.length],
    };
  } else if (action === "export_phi") {
    new_values = {
      export_mode: i % 2 === 0 ? "full" : "metadata_only",
      row_count: 25 + (i % 200),
      reason: _AL_REASONS[i % _AL_REASONS.length],
    };
  }
  return {
    id: `al_${String(i + 1).padStart(4, "0")}-${(i * 11).toString(16)}`,
    timestamp, table_name, record_id, action,
    actor_id, actor_name,
    old_values, new_values,
  };
});

// MissingSubmission canonical CHECK values.
export type MissingSubmissionStatus = "unreviewed" | "employee_added" | "not_an_employee";
export type MissingSubmission = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  org_name: string | null;
  origin_url: string;
  status: MissingSubmissionStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};
export const MISSING_SUBMISSIONS: MissingSubmission[] = [
  { id: "ms_1", full_name: "Test Person A", email: "a@example.com", phone: "555-0001", org_name: "Acme Widgets Co", origin_url: "/enroll/acme", status: "unreviewed", created_at: "2026-06-17T16:42:00Z", reviewed_by: null, reviewed_at: null },
  { id: "ms_2", full_name: "Test Person B", email: "b@example.com", phone: "555-0002", org_name: "Bluefin Logistics", origin_url: "/enroll/bluefin", status: "employee_added", created_at: "2026-06-10T09:15:00Z", reviewed_by: "jordan.ops", reviewed_at: "2026-06-11T14:30:00Z" },
  { id: "ms_3", full_name: "Test Person C", email: "c@example.com", phone: null, org_name: null, origin_url: "/enroll/unknown", status: "not_an_employee", created_at: "2026-05-22T08:00:00Z", reviewed_by: "alex.admin", reviewed_at: "2026-05-23T11:05:00Z" },
  { id: "ms_4", full_name: "Test Person D", email: "d@example.com", phone: "555-0004", org_name: "Greylock Partners LLC", origin_url: "/enroll/greylock", status: "unreviewed", created_at: "2026-06-18T07:20:00Z", reviewed_by: null, reviewed_at: null },
];

export type DIRateRow = {
  id: string;
  organization_id: string;
  employee_class: string;
  age_band: string;
  product: string;
  rate_per_unit: number;
  benefit_percentage: number;
  effective_from: string;
  effective_to: string | null;
  source: string;
};
const DI_AGE_BANDS = ["18-29","30-39","40-49","50-59","60-64","65+"];
const DI_RATES_STD: Record<string, number> = { "18-29": 0.32, "30-39": 0.48, "40-49": 0.74, "50-59": 1.05, "60-64": 1.18, "65+": 1.22 };
const DI_RATES_EXEC: Record<string, number> = { "18-29": 0.36, "30-39": 0.54, "40-49": 0.82, "50-59": 1.14, "60-64": 1.28, "65+": 1.34 };
export const DI_RATE_CONFIG: DIRateRow[] = [
  ...DI_AGE_BANDS.map((band, i) => ({
    id: `dir_a_s_${i}`, organization_id: "org_1", employee_class: "Standard", age_band: band,
    product: "Group LTD", rate_per_unit: DI_RATES_STD[band], benefit_percentage: 60,
    effective_from: "2025-01-01", effective_to: null, source: "sun_life_rate_sheet",
  })),
  ...DI_AGE_BANDS.map((band, i) => ({
    id: `dir_a_e_${i}`, organization_id: "org_1", employee_class: "Executive", age_band: band,
    product: "Group LTD", rate_per_unit: DI_RATES_EXEC[band], benefit_percentage: 66.7,
    effective_from: "2025-01-01", effective_to: null, source: "sun_life_rate_sheet",
  })),
  ...DI_AGE_BANDS.map((band, i) => ({
    id: `dir_b_s_${i}`, organization_id: "org_2", employee_class: "All Employees", age_band: band,
    product: "Group LTD", rate_per_unit: DI_RATES_STD[band] * 0.95, benefit_percentage: 60,
    effective_from: "2024-07-01", effective_to: null, source: "manual_entry",
  })),
];

export type LTCRateCell = {
  id: string;
  benefit_class_id: string;
  carrier_product_id: string;
  smoker_status: "non_tobacco" | "tobacco";
  issue_age: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  nominal_death_benefit_cents: number;
  death_benefit_cents: number;
  monthly_premium_cents: number;
  effective_date: string;
  source: string;
};
const LTC_TIER_FACES: Record<string, number> = { bronze: 2500000, silver: 5000000, gold: 7500000, platinum: 10000000, diamond: 15000000 };
const LTC_TIER_BASE: Record<string, number> = { bronze: 1800, silver: 3400, gold: 5100, platinum: 6800, diamond: 10200 };
function ltcPremiumCents(tier: "bronze" | "silver" | "gold" | "platinum" | "diamond", age: number, smoker: boolean): number {
  const base = LTC_TIER_BASE[tier];
  const ageMult = 1 + (age - 25) * 0.045;
  const smokerMult = smoker ? 1.45 : 1.0;
  return Math.round(base * ageMult * smokerMult);
}
const _ltcCells: LTCRateCell[] = [];
const BC1_AGES = [25,30,35,40,45,50,55,60,65];
const BC1_TIERS: Array<"bronze" | "silver" | "gold" | "platinum" | "diamond"> = ["bronze","silver","gold","platinum","diamond"];
for (const age of BC1_AGES) {
  for (const smoker of [false, true]) {
    for (const tier of BC1_TIERS) {
      const face = LTC_TIER_FACES[tier];
      _ltcCells.push({
        id: `lrc_bc1_${age}_${smoker ? "t" : "n"}_${tier}`,
        benefit_class_id: "bc_1",
        carrier_product_id: "cp_6",
        smoker_status: smoker ? "tobacco" : "non_tobacco",
        issue_age: age,
        tier,
        nominal_death_benefit_cents: face,
        death_benefit_cents: face,
        monthly_premium_cents: ltcPremiumCents(tier, age, smoker),
        effective_date: "2025-03-15",
        source: "carrier_proposal",
      });
    }
  }
}
const BC2_AGES = [30,40,50,55];
const BC2_TIERS: Array<"bronze" | "silver" | "gold" | "platinum" | "diamond"> = ["bronze","silver","gold"];
for (const age of BC2_AGES) {
  for (const smoker of [false, true]) {
    for (const tier of BC2_TIERS) {
      const face = LTC_TIER_FACES[tier];
      _ltcCells.push({
        id: `lrc_bc2_${age}_${smoker ? "t" : "n"}_${tier}`,
        benefit_class_id: "bc_2",
        carrier_product_id: "cp_6",
        smoker_status: smoker ? "tobacco" : "non_tobacco",
        issue_age: age,
        tier,
        nominal_death_benefit_cents: face,
        death_benefit_cents: face,
        monthly_premium_cents: ltcPremiumCents(tier, age, smoker),
        effective_date: "2024-11-01",
        source: "carrier_proposal",
      });
    }
  }
}
export const LTC_RATE_CELLS: LTCRateCell[] = _ltcCells;


export const ENROLLMENT_RESPONSES_LTC = [
  { id: "er_1", individual_name: "Test Person 3", question: "Smoker (last 12mo)?", answer: "No", submitted_at: "2025-05-01" },
  { id: "er_2", individual_name: "Test Person 3", question: "Family LTC claim history?", answer: "No", submitted_at: "2025-05-01" },
  { id: "er_3", individual_name: "Test Person 5", question: "Height", answer: "5'8\"", submitted_at: "2025-05-04" },
];

export function formatCents(cents: number): string {
  const n = (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return n;
}
