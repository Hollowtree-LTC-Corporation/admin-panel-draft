// Hardcoded dummy data for the Hollowtree admin wireframe.
// NOT real PII. All names are obviously fake (Test Person N, example.com).

export type Product = "DI" | "LTC";
export type Role = "admin" | "ops" | "read-only";

export const ORGS = [
  { id: "org_1", name: "Acme Widgets Co", product: "DI", situs_state: "TX", enrollment_status: "active", individuals_count: 12, policy_owner_type: "cca", type_of_rate: "STD+LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: true },
  { id: "org_2", name: "Bluefin Logistics", product: "DI", situs_state: "CA", enrollment_status: "active", individuals_count: 7, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false },
  { id: "org_3", name: "Coastal Credit Union", product: "LTC", situs_state: "FL", enrollment_status: "active", individuals_count: 9, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: true, benefit_restoration_rider: true, cca_group: false },
  { id: "org_4", name: "Delta Manufacturing", product: "DI", situs_state: "OH", enrollment_status: "closed", individuals_count: 4, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false },
  { id: "org_5", name: "Evergreen Health", product: "LTC", situs_state: "NY", enrollment_status: "active", individuals_count: 6, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: true, benefit_restoration_rider: false, cca_group: false },
  { id: "org_6", name: "Foxtail Education Trust", product: "LTC", situs_state: "WA", enrollment_status: "pending", individuals_count: 2, policy_owner_type: "employer_group", type_of_rate: null, extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false },
  { id: "org_7", name: "Greylock Partners LLC", product: "DI", situs_state: "MA", enrollment_status: "active", individuals_count: 5, policy_owner_type: "cca", type_of_rate: "STD+LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: true },
  { id: "org_8", name: "Harborline Shipping", product: "DI", situs_state: "WA", enrollment_status: "active", individuals_count: 8, policy_owner_type: "employer_group", type_of_rate: "LTD", extension_of_benefits_rider: false, benefit_restoration_rider: false, cca_group: false },
];

export const LTC_FACE_TIERS_CENTS = [2500000, 5000000, 7500000, 10000000, 15000000, 20000000, 25000000]; // $25K..$250K

export const BENEFIT_CLASSES = [
  { id: "bc_1", org_id: "org_3", name: "Class A — Full Time", gi_offer_cents: 200000, bronze: 50000, silver: 100000, gold: 150000, platinum: 200000, diamond: 250000, is_default: true },
  { id: "bc_2", org_id: "org_3", name: "Class B — Part Time", gi_offer_cents: 100000, bronze: 25000, silver: 50000, gold: 75000, platinum: 100000, diamond: 125000, is_default: false },
  { id: "bc_3", org_id: "org_5", name: "Default Class", gi_offer_cents: 150000, bronze: 50000, silver: 75000, gold: 100000, platinum: 150000, diamond: 200000, is_default: true },
];

export const COVERAGE_STATUSES = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"] as const;
export const STAGES = ["invited", "education", "selecting_plan", "medical_questions", "checkout", "completed"] as const;
// 25 realistic (coverage_status, current_stage) pairings; cycled for >25 rows.
const COVERAGE_STAGE_PAIRS: Array<[typeof COVERAGE_STATUSES[number], typeof STAGES[number]]> = [
  ["not_started", "invited"], ["not_started", "invited"], ["not_started", "invited"],
  ["in_progress", "education"], ["in_progress", "selecting_plan"], ["in_progress", "medical_questions"], ["in_progress", "checkout"], ["in_progress", "education"],
  ["purchased", "completed"], ["purchased", "completed"], ["purchased", "completed"],
  ["active", "completed"], ["active", "completed"], ["active", "completed"], ["active", "completed"], ["active", "completed"], ["active", "completed"], ["active", "completed"], ["active", "completed"],
  ["suspended", "completed"], ["suspended", "completed"], ["suspended", "completed"],
  ["canceled", "invited"], ["canceled", "selecting_plan"],
  ["lapsed", "completed"],
];
const PLANS_DI = ["Bronze DI", "Silver DI", "Gold DI"];
const PLANS_LTC = ["Bronze LTC", "Silver LTC", "Gold LTC", "Platinum LTC", "Diamond LTC"];

// Pre-defined spouse pairs (LTC only): spouse_n -> primary_n, both at same org.
const SPOUSE_PAIRS: Record<number, number> = { 11: 3, 13: 5, 14: 6 };

export const INDIVIDUALS = Array.from({ length: 40 }, (_, i) => {
  const n = i + 1;
  const org = ORGS[i % ORGS.length];
  const isLTC = org.product === "LTC";
  const isSpouse = isLTC && n in SPOUSE_PAIRS;
  const pair = COVERAGE_STAGE_PAIRS[i % COVERAGE_STAGE_PAIRS.length];
  const cov = pair[0];
  // hasPlan removed — list view handles display masking
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
  // Payment status by coverage_status
  let last_payment_status: "Successful" | "Failed" | "Pending" | null = null;
  let retry_count = 0;
  if (cov === "active") {
    const bucket = n % 10;
    if (bucket < 7) last_payment_status = "Successful";
    else if (bucket < 9) { last_payment_status = "Failed"; retry_count = (n % 5) + 1; }
    else last_payment_status = "Pending";
  } else if (cov === "suspended") {
    last_payment_status = "Failed";
    retry_count = (n % 3) + 2;
  } else if (cov === "purchased") {
    last_payment_status = n % 2 === 0 ? "Pending" : "Successful";
  } else if (cov === "lapsed") {
    last_payment_status = "Failed";
    retry_count = 4 + (n % 3);
  } else if (cov === "canceled") {
    last_payment_status = n % 2 === 0 ? "Successful" : null;
  }
  return {
    id: `ind_${n}`,
    full_name: `Test Person ${n}`,
    email: `person${n}@example.com`,
    phone: `555-0${100 + n}`,
    org_id: org.id,
    org_name: org.name,
    product: org.product as Product,
    coverage_status: cov,
    stage: pair[1],
    plan: isLTC ? PLANS_LTC[n % PLANS_LTC.length] : PLANS_DI[n % PLANS_DI.length],
    monthly_premium_cents: 2500 + (n * 137) % 8000,
    effective_date,
    billing_group_id: `bg_${(n % 8) + 1}`,
    // DI fields
    coverage_plan: PLANS_DI[n % PLANS_DI.length],
    di_type: org.type_of_rate as "STD+LTD" | "LTD" | null,
    monthly_benefit_cents: 300000 + (n % 5) * 50000,
    weekly_covered_benefit_cents: 80000 + (n % 4) * 10000,
    assigned_rep: ["Jamie Rep", "Casey Rep", "Morgan Rep"][n % 3],
    title: ["Manager", "Engineer", "Analyst", "Director"][n % 4],
    greeting: ["Mr.", "Ms.", "Mx."][n % 3],
    // LTC fields
    purchased_plan: PLANS_LTC[n % PLANS_LTC.length],
    upgrade_applied_for: n % 5 === 0,
    interested_upgrading: n % 3 === 0,
    interested_spousal: n % 4 === 0,
    relationship_type: isSpouse ? "spouse" : (isLTC ? "primary" : "employee"),
    linked_individual_id: isSpouse ? `ind_${SPOUSE_PAIRS[n]}` : null,
    face_amount_cents: LTC_FACE_TIERS_CENTS[isSpouse ? (n % 3) : 2 + (n % 5)],
    // v13: issue type (LTC). Spouses always SI; employees with higher face amounts SI.
    issue_type: isLTC ? (isSpouse ? "SI" : (2 + (n % 5) >= 5 ? "SI" : "GI")) : null,
    // v13: per-individual language preference (overrides org default)
    preferred_language: n === 4 || n === 17 ? "es" : "en",
    // Employer contribution
    contribution_tier: ["100%", "75%", "50%", "0%"][n % 4],
    contribution_duration_months: [12, 24, 36][n % 3],
    contribution_active: n % 5 !== 0,
    last_payment_status,
    retry_count,
  };
});

const PM_TYPES = ["ach", "card-payment", "ach", "apple-pay", "ach", "card-payment", null, "ach"] as const;
const PM_INSTITUTIONS = ["Chase", null, "Wells Fargo", null, "Bank of America", null, null, "Citibank"];
const PM_LAST4 = [null, "4242", null, null, null, "1881", null, null];
export const BILLING_GROUPS = Array.from({ length: 8 }, (_, i) => ({
  id: `bg_${i + 1}`,
  name: `Billing Group ${i + 1}`,
  individuals_count: INDIVIDUALS.filter((x) => x.billing_group_id === `bg_${i + 1}`).length,
  payment_method: ["ACH", "Card", "ACH", "Card"][i % 4],
  payment_method_type: PM_TYPES[i] as "ach" | "card-payment" | "apple-pay" | null,
  plaid_institution: PM_INSTITUTIONS[i],
  card_last4: PM_LAST4[i],
  moov_account_id: `moov_${1000 + i}`,
}));

export const PAYMENT_LEDGER = Array.from({ length: 60 }, (_, i) => {
  const ind = INDIVIDUALS[i % INDIVIDUALS.length];
  const org = ORGS.find((o) => o.id === ind.org_id);
  // contribution_source: voluntary by default; employer_paid for some rows when the
  // individual has an active employer contribution; employee_buyup for LTC SI rows
  // (above the GI base) on a subset of rows.
  let contribution_source: "voluntary" | "employer_paid" | "employee_buyup" = "voluntary";
  const employerEligible = ind.contribution_active && ind.contribution_tier !== "0%";
  if (employerEligible && i % 3 === 0) contribution_source = "employer_paid";
  else if (ind.product === "LTC" && ind.issue_type === "SI" && i % 4 === 1) contribution_source = "employee_buyup";
  // coverage_type: DI only. Most rows STDLTD; orgs with type_of_rate = "LTD" → LTD.
  const coverage_type = ind.product === "DI"
    ? (org?.type_of_rate === "LTD" ? "LTD" : "STDLTD")
    : null;
  return {
    id: `pl_${i + 1}`,
    date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    individual_id: ind.id,
    individual_name: ind.full_name,
    billing_group_id: ind.billing_group_id,
    charge_type: ["monthly_premium", "monthly_premium", "monthly_premium", "fee", "refund"][i % 5],
    amount_cents: ind.monthly_premium_cents,
    status: ["successful", "successful", "successful", "failed", "pending"][i % 5],
    funding_source: i % 3 === 0 ? "employer" : "employee",
    contribution_source,
    coverage_type,
  };
});

export const ACCOUNT_ADJUSTMENTS = [
  { id: "aa_1", individual_id: "ind_3", individual_name: "Test Person 3", adjustment_type: "premium_correction", amount_cents: -1500, reason: "Mid-cycle plan downgrade", effective_date: "2025-03-15", approved_by: "Guy (admin)", approved_at: "2025-03-15T14:22Z" },
  { id: "aa_2", individual_id: "ind_11", individual_name: "Test Person 11", adjustment_type: "penalty_waiver", amount_cents: -2500, reason: "Bank holiday processing delay", effective_date: "2025-04-02", approved_by: "Guy (admin)", approved_at: "2025-04-02T09:10Z" },
  { id: "aa_3", individual_id: "ind_22", individual_name: "Test Person 22", adjustment_type: "refund", amount_cents: -8500, reason: "Coverage canceled in cooling-off window", effective_date: "2025-05-19", approved_by: "Guy (admin)", approved_at: "2025-05-19T11:45Z" },
  { id: "aa_4", individual_id: "ind_7", individual_name: "Test Person 7", adjustment_type: "write_off", amount_cents: -4200, reason: "Uncollectible after 90 days", effective_date: "2025-06-01", approved_by: "Guy (admin)", approved_at: "2025-06-01T16:30Z" },
];

export type CarrierStatus = "active" | "inactive";
export type Carrier = {
  id: string;
  name: string;
  product: Product;
  carrier_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  status: CarrierStatus;
  notes: string;
};

export const CARRIERS: Carrier[] = [
  // DI: Sun Life is the active carrier. Pacific Reserve kept inactive for legacy policy references.
  { id: "car_1", name: "Sun Life", product: "DI", carrier_code: "SUNLIFE", contact_name: "Dana Whitmore", contact_email: "dana.whitmore@sunlife.example.com", contact_phone: "555-0201", website: "sunlife.com", status: "active", notes: "Primary DI carrier across all groups." },
  { id: "car_2", name: "Pacific Reserve Life", product: "DI", carrier_code: "PACRES", contact_name: "Lin Park", contact_email: "lin.park@pacres.example.com", contact_phone: "555-0202", website: "pacificreserve.example.com", status: "inactive", notes: "Legacy. Used by older policies; no new business." },
  // LTC: Trustmark and Transamerica are the active LTC carriers. Heritage/Sequoia kept inactive for legacy refs.
  { id: "car_3", name: "Heritage LTC Group", product: "LTC", carrier_code: "HERITAGE", contact_name: "Owen Reyes", contact_email: "owen.reyes@heritageltc.example.com", contact_phone: "555-0203", website: "heritageltc.example.com", status: "inactive", notes: "Legacy. Replaced by Trustmark for new LTC business." },
  { id: "car_4", name: "Sequoia Care Partners", product: "LTC", carrier_code: "SEQUOIA", contact_name: "Riley Chen", contact_email: "riley.chen@sequoiacare.example.com", contact_phone: "555-0204", website: "sequoiacare.example.com", status: "inactive", notes: "Legacy. No new policies." },
  { id: "car_5", name: "Trustmark", product: "LTC", carrier_code: "TRUSTMARK", contact_name: "Avery Singh", contact_email: "avery.singh@trustmark.example.com", contact_phone: "555-0205", website: "trustmarkbenefits.com", status: "active", notes: "Primary LTC carrier. State variants for NY." },
  { id: "car_6", name: "Transamerica", product: "LTC", carrier_code: "TRANSAM", contact_name: "Morgan Diaz", contact_email: "morgan.diaz@transamerica.example.com", contact_phone: "555-0206", website: "transamerica.com", status: "active", notes: "Secondary LTC carrier." },
];

export type ProductType = "universal_life" | "group_life" | "term_life" | "disability" | "other";
export type CarrierProduct = {
  id: string;
  carrier_id: string;
  name: string;
  product_code: string;
  product_type: ProductType;
  state_availability: string;
  si_max_cents: number | null;
  si_increment_cents: number | null;
  status: CarrierStatus;
};

export const CARRIER_PRODUCTS: CarrierProduct[] = [
  { id: "cp_1", carrier_id: "car_1", name: "Group Disability Insurance", product_code: "GDI", product_type: "disability", state_availability: "All states", si_max_cents: null, si_increment_cents: null, status: "active" },
  { id: "cp_2", carrier_id: "car_2", name: "Pacific DI Plus", product_code: "PAC-DI", product_type: "disability", state_availability: "All states", si_max_cents: null, si_increment_cents: null, status: "inactive" },
  { id: "cp_3", carrier_id: "car_3", name: "Heritage LTC Standard", product_code: "HER-STD", product_type: "universal_life", state_availability: "All states except NY", si_max_cents: 25000000, si_increment_cents: 250000, status: "inactive" },
  { id: "cp_4", carrier_id: "car_3", name: "Heritage LTC NY", product_code: "HER-NY", product_type: "universal_life", state_availability: "NY", si_max_cents: 15000000, si_increment_cents: 250000, status: "inactive" },
  { id: "cp_5", carrier_id: "car_4", name: "Sequoia LTC Premier", product_code: "SEQ-PREM", product_type: "universal_life", state_availability: "All states", si_max_cents: 20000000, si_increment_cents: 250000, status: "inactive" },
  { id: "cp_6", carrier_id: "car_5", name: "UL-205 Universal Life & LifeEvents", product_code: "UL-205", product_type: "universal_life", state_availability: "All states", si_max_cents: 25000000, si_increment_cents: 250000, status: "active" },
  { id: "cp_7", carrier_id: "car_5", name: "GTL-121 Life + Care", product_code: "GTL-121", product_type: "group_life", state_availability: "All states except NY", si_max_cents: 15000000, si_increment_cents: 250000, status: "active" },
  { id: "cp_8", carrier_id: "car_6", name: "TransElite", product_code: "TRANSELITE", product_type: "universal_life", state_availability: "All states", si_max_cents: 20000000, si_increment_cents: 250000, status: "active" },
  { id: "cp_9", carrier_id: "car_6", name: "UL10", product_code: "UL10", product_type: "universal_life", state_availability: "All states", si_max_cents: 15000000, si_increment_cents: 250000, status: "active" },
];

export type PolicyStatus = "active" | "pending" | "terminated";
export type Policy = {
  id: string;
  org_id: string;
  org_name: string;
  carrier_product_id: string;
  product: Product;
  status: PolicyStatus;
  carrier_commission_pct: number | null;
  override_pct: number | null;
  commission_schedule_id: string | null;
  initial_effective_date: string;
  attio_last_synced_at: string | null;
  updated_at: string;
  attio_record_id: string;
};

export const POLICIES: Policy[] = [
  { id: "pol_1", org_id: "org_1", org_name: "Acme Widgets Co", carrier_product_id: "cp_1", product: "DI", status: "active", carrier_commission_pct: 12, override_pct: 3, commission_schedule_id: null, initial_effective_date: "2025-02-01", attio_last_synced_at: "2025-06-10T14:14:00Z", updated_at: "2025-06-09T11:00:00Z", attio_record_id: "att_pol_1" },
  { id: "pol_2", org_id: "org_2", org_name: "Bluefin Logistics", carrier_product_id: "cp_2", product: "DI", status: "active", carrier_commission_pct: 10, override_pct: null, commission_schedule_id: null, initial_effective_date: "2025-03-15", attio_last_synced_at: "2025-05-20T09:00:00Z", updated_at: "2025-06-12T16:30:00Z", attio_record_id: "att_pol_2" },
  { id: "pol_3", org_id: "org_3", org_name: "Coastal Credit Union", carrier_product_id: "cp_3", product: "LTC", status: "active", carrier_commission_pct: null, override_pct: null, commission_schedule_id: "ccs_1", initial_effective_date: "2025-04-01", attio_last_synced_at: "2025-06-11T10:00:00Z", updated_at: "2025-06-08T08:00:00Z", attio_record_id: "att_pol_3" },
  { id: "pol_4", org_id: "org_5", org_name: "Evergreen Health", carrier_product_id: "cp_4", product: "LTC", status: "active", carrier_commission_pct: null, override_pct: null, commission_schedule_id: "ccs_2", initial_effective_date: "2025-05-01", attio_last_synced_at: "2025-06-12T13:00:00Z", updated_at: "2025-06-10T10:00:00Z", attio_record_id: "att_pol_4" },
  { id: "pol_5", org_id: "org_7", org_name: "Greylock Partners LLC", carrier_product_id: "cp_1", product: "DI", status: "pending", carrier_commission_pct: 12, override_pct: 3, commission_schedule_id: null, initial_effective_date: "2025-07-01", attio_last_synced_at: null, updated_at: "2025-06-14T09:00:00Z", attio_record_id: "att_pol_5" },
  { id: "pol_6", org_id: "org_4", org_name: "Delta Manufacturing", carrier_product_id: "cp_2", product: "DI", status: "terminated", carrier_commission_pct: 10, override_pct: 2, commission_schedule_id: null, initial_effective_date: "2024-06-01", attio_last_synced_at: "2025-04-01T10:00:00Z", updated_at: "2025-04-01T10:00:00Z", attio_record_id: "att_pol_6" },
  { id: "pol_7", org_id: "org_6", org_name: "Foxtail Education Trust", carrier_product_id: "cp_5", product: "LTC", status: "pending", carrier_commission_pct: null, override_pct: null, commission_schedule_id: "ccs_3", initial_effective_date: "2025-08-15", attio_last_synced_at: null, updated_at: "2025-06-13T12:00:00Z", attio_record_id: "att_pol_7" },
  { id: "pol_8", org_id: "org_3", org_name: "Coastal Credit Union", carrier_product_id: "cp_4", product: "LTC", status: "active", carrier_commission_pct: null, override_pct: null, commission_schedule_id: null, initial_effective_date: "2025-01-15", attio_last_synced_at: "2025-06-10T08:00:00Z", updated_at: "2025-06-10T07:00:00Z", attio_record_id: "att_pol_8" },
];

export const CHANNEL_PARTNERS = [
  { id: "cpn_1", name: "WTC Benefits", partner_type: "Broker", default_split_pct: 40, payment_method: "hollowtree_paid" },
  { id: "cpn_2", name: "Westfield Brokers", partner_type: "Broker", default_split_pct: 60, payment_method: "hollowtree_paid" },
  { id: "cpn_3", name: "Hollowtree House", partner_type: "House", default_split_pct: 45, payment_method: "hollowtree_paid" },
  { id: "cpn_4", name: "Jamie Rep", partner_type: "Internal", default_split_pct: 10, payment_method: "hollowtree_paid" },
  { id: "cpn_5", name: "Gallagher", partner_type: "Override", default_split_pct: 5, payment_method: "carrier_direct" },
  { id: "cpn_6", name: "Override Group LLC", partner_type: "Override", default_split_pct: 5, payment_method: "carrier_direct" },
];

export const INTERNAL_REPS = [
  { id: "rep_1", name: "Guy Livingstone" },
  { id: "rep_2", name: "Jamie Rep" },
  { id: "rep_3", name: "Casey Rep" },
  { id: "rep_4", name: "Morgan Rep" },
];

// Maps each org to its primary channel partner (broker firm) for splits defaults.
export const ORG_PRIMARY_CHANNEL_PARTNER: Record<string, string> = {
  org_1: "cpn_1", org_2: "cpn_2", org_3: "cpn_1", org_4: "cpn_2",
  org_5: "cpn_1", org_6: "cpn_2", org_7: "cpn_1", org_8: "cpn_2",
};

export const COMMISSION_SPLIT_DEFAULTS = CHANNEL_PARTNERS.map((p) => ({
  id: `csd_${p.id}`,
  channel_partner_id: p.id,
  channel_partner_name: p.name,
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

// Initial split rows by policy. pol_3 intentionally totals 85% to demo the warning state.
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

// Back-compat alias for the commission view (uses pct + channel_partner_name shape).
export const POLICY_SPLITS = POLICY_SPLITS_INITIAL.filter((s) => s.policy_id === "pol_1").map((s) => ({
  id: s.id, policy_id: s.policy_id, channel_partner_name: s.payee_name, pct: s.split_pct,
}));

export const COMMISSION_STATEMENTS = [
  { id: "cs_1", payee: "WTC Benefits", period: "2025-05", amount_cents: 245000, payable: true },
  { id: "cs_2", payee: "Hollowtree House", period: "2025-05", amount_cents: 81000, payable: true },
  { id: "cs_3", payee: "Guy Livingstone", period: "2025-05", amount_cents: 60500, payable: true },
  { id: "cs_4", payee: "Gallagher", period: "2025-05", amount_cents: 20000, payable: false },
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
  // Legacy (kept for back-compat with existing policies)
  { id: "ccs_1", carrier_product_id: "cp_3", carrier_product_name: "Heritage LTC Standard", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2023-01-01", effective_to: null },
  { id: "ccs_2", carrier_product_id: "cp_4", carrier_product_name: "Heritage LTC NY", state_code: "NY", schedule_name: "Flat 22%", schedule_type: "flat", is_default: true, effective_from: "2023-01-01", effective_to: null },
  { id: "ccs_3", carrier_product_id: "cp_5", carrier_product_name: "Sequoia LTC Premier", state_code: null, schedule_name: "Level", schedule_type: "level", is_default: true, effective_from: "2023-01-01", effective_to: null },
  { id: "ccs_4", carrier_product_id: "cp_3", carrier_product_name: "Heritage LTC Standard", state_code: null, schedule_name: "Default", schedule_type: "heaped", is_default: false, effective_from: "2022-01-01", effective_to: "2023-01-01" },
  // Trustmark UL-205
  { id: "ccs_5", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_6", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: "NY", schedule_name: "Heaped NY", schedule_type: "heaped", is_default: false, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_7", carrier_product_id: "cp_6", carrier_product_name: "UL-205 Universal Life & LifeEvents", state_code: null, schedule_name: "Flat", schedule_type: "flat", is_default: false, effective_from: "2024-01-01", effective_to: null },
  // Trustmark GTL-121
  { id: "ccs_8", carrier_product_id: "cp_7", carrier_product_name: "GTL-121 Life + Care", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  { id: "ccs_9", carrier_product_id: "cp_7", carrier_product_name: "GTL-121 Life + Care", state_code: null, schedule_name: "Flat", schedule_type: "flat", is_default: false, effective_from: "2024-01-01", effective_to: null },
  // Transamerica TransElite
  { id: "ccs_10", carrier_product_id: "cp_8", carrier_product_name: "TransElite", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
  // Transamerica UL10
  { id: "ccs_11", carrier_product_id: "cp_9", carrier_product_name: "UL10", state_code: null, schedule_name: "Heaped", schedule_type: "heaped", is_default: true, effective_from: "2024-01-01", effective_to: null },
];

export const COMMISSION_RATE_TIERS = [
  // Legacy tiers (back-compat)
  { id: "crt_1", schedule_id: "ccs_1", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_2", schedule_id: "ccs_1", year_from: 2, year_to: 5, pct: 4 },
  { id: "crt_3", schedule_id: "ccs_1", year_from: 6, year_to: 10, pct: 2 },
  { id: "crt_4", schedule_id: "ccs_2", year_from: 1, year_to: 1, pct: 80 },
  { id: "crt_5", schedule_id: "ccs_2", year_from: 2, year_to: 5, pct: 3 },
  { id: "crt_6", schedule_id: "ccs_3", year_from: 1, year_to: 1, pct: 110 },
  { id: "crt_7", schedule_id: "ccs_3", year_from: 2, year_to: 5, pct: 5 },
  // Trustmark UL-205 Heaped (standard)
  { id: "crt_10", schedule_id: "ccs_5", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_11", schedule_id: "ccs_5", year_from: 2, year_to: 10, pct: 5 },
  { id: "crt_12", schedule_id: "ccs_5", year_from: 11, year_to: 99, pct: 0 },
  // Trustmark UL-205 Heaped (NY)
  { id: "crt_13", schedule_id: "ccs_6", year_from: 1, year_to: 1, pct: 90 },
  { id: "crt_14", schedule_id: "ccs_6", year_from: 2, year_to: 3, pct: 10 },
  { id: "crt_15", schedule_id: "ccs_6", year_from: 4, year_to: 10, pct: 5 },
  { id: "crt_16", schedule_id: "ccs_6", year_from: 11, year_to: 99, pct: 0 },
  // Trustmark UL-205 Flat
  { id: "crt_17", schedule_id: "ccs_7", year_from: 1, year_to: 99, pct: 22 },
  // Trustmark GTL-121 Heaped
  { id: "crt_18", schedule_id: "ccs_8", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_19", schedule_id: "ccs_8", year_from: 2, year_to: 10, pct: 5 },
  { id: "crt_20", schedule_id: "ccs_8", year_from: 11, year_to: 99, pct: 0 },
  // Trustmark GTL-121 Flat
  { id: "crt_21", schedule_id: "ccs_9", year_from: 1, year_to: 99, pct: 22 },
  // Transamerica TransElite
  { id: "crt_22", schedule_id: "ccs_10", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_23", schedule_id: "ccs_10", year_from: 2, year_to: 4, pct: 4 },
  { id: "crt_24", schedule_id: "ccs_10", year_from: 5, year_to: 6, pct: 4 },
  { id: "crt_25", schedule_id: "ccs_10", year_from: 7, year_to: 99, pct: 2 },
  // Transamerica UL10
  { id: "crt_26", schedule_id: "ccs_11", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_27", schedule_id: "ccs_11", year_from: 2, year_to: 4, pct: 4 },
  { id: "crt_28", schedule_id: "ccs_11", year_from: 5, year_to: 6, pct: 4 },
  { id: "crt_29", schedule_id: "ccs_11", year_from: 7, year_to: 99, pct: 2 },
];

export type AffiliateType = "cca" | "union" | "industry_association" | "employer_trust" | "other";
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
  legal_entity_status: LegalEntityStatus | null;
  notes: string;
  deleted_at: string | null;
  logo_url: string | null;
};

export const AFFILIATE_ORGANIZATIONS: AffiliateOrganization[] = [
  { id: "aff_1", name: "CCU Member Foundation", affiliate_type: "industry_association", affiliation_level: "individual", industry: null, is_external: true, legal_entity_status: "operational", notes: "From enrollment windows dummy data.", deleted_at: null, logo_url: null },
  { id: "aff_2", name: "Foxtail Alumni Assoc", affiliate_type: "industry_association", affiliation_level: "individual", industry: null, is_external: true, legal_entity_status: "operational", notes: "From enrollment windows dummy data.", deleted_at: null, logo_url: null },
  { id: "aff_3", name: "Clinicians Care Association", affiliate_type: "cca", affiliation_level: "individual", industry: "healthcare", is_external: true, legal_entity_status: "operational", notes: "DI primary. The CCA.", deleted_at: null, logo_url: "icon:shield" },
  { id: "aff_4", name: "TeamHealth Affiliate Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "healthcare", is_external: false, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created.", deleted_at: null, logo_url: "icon:building" },
  { id: "aff_5", name: "Healthcare Workers United", affiliate_type: "union", affiliation_level: "individual", industry: "healthcare", is_external: true, legal_entity_status: "operational", notes: "Example union.", deleted_at: null, logo_url: "icon:handshake" },
  { id: "aff_6", name: "Pacific Educators Alliance", affiliate_type: "industry_association", affiliation_level: "individual", industry: "education", is_external: true, legal_entity_status: "operational", notes: "Example association.", deleted_at: null, logo_url: null },
  { id: "aff_7", name: "National Education Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "education", is_external: false, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created.", deleted_at: null, logo_url: null },
  { id: "aff_8", name: "Public Sector Benefits Trust", affiliate_type: "employer_trust", affiliation_level: "employer", industry: "government", is_external: false, legal_entity_status: "operational", notes: "LTC trust, Hollowtree-created.", deleted_at: null, logo_url: null },
];

export type EnrollmentWindow = {
  id: string;
  org_id: string | null;
  org_name: string | null;
  affiliate_org_id: string | null;
  affiliate_org: string | null;
  window_type: "initial" | "annual" | "new_joiner" | "special";
  start_date: string | null;
  end_date: string | null;
  default_effective_date: string | null;
  status: "upcoming" | "open" | "closed";
  sponsor_type: "employer" | "employer+affiliate" | "affiliate";
  carrier: string;
  gi_eligible: boolean;
  notes: string;
  channel_partners: Array<{ id: string; channel_partner_id: string; role: string }>;
};

export const ENROLLMENT_WINDOWS: EnrollmentWindow[] = [
  { id: "ew_1", org_id: "org_1", org_name: "Acme Widgets Co", affiliate_org_id: null, affiliate_org: null, window_type: "initial", start_date: "2025-01-01", end_date: "2025-01-31", default_effective_date: "2025-02-01", status: "closed", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "", channel_partners: [] },
  { id: "ew_2", org_id: "org_1", org_name: "Acme Widgets Co", affiliate_org_id: null, affiliate_org: null, window_type: "annual", start_date: "2025-09-01", end_date: "2025-09-30", default_effective_date: "2025-10-01", status: "upcoming", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "", channel_partners: [] },
  { id: "ew_3", org_id: "org_3", org_name: "Coastal Credit Union", affiliate_org_id: "aff_1", affiliate_org: "CCU Member Foundation", window_type: "annual", start_date: "2025-08-01", end_date: "2025-08-31", default_effective_date: "2025-09-01", status: "open", sponsor_type: "employer+affiliate", carrier: "Heritage LTC Group", gi_eligible: true, notes: "", channel_partners: [{ id: "ewcp_1", channel_partner_id: "cpn_1", role: "primary" }] },
  { id: "ew_4", org_id: null, org_name: null, affiliate_org_id: "aff_2", affiliate_org: "Foxtail Alumni Assoc", window_type: "special", start_date: "2025-07-15", end_date: "2025-08-15", default_effective_date: null, status: "open", sponsor_type: "affiliate", carrier: "Sequoia Care Partners", gi_eligible: false, notes: "", channel_partners: [] },
  { id: "ew_5", org_id: "org_1", org_name: "Acme Widgets Co", affiliate_org_id: null, affiliate_org: null, window_type: "new_joiner", start_date: null, end_date: null, default_effective_date: null, status: "open", sponsor_type: "employer", carrier: "Northstar Mutual", gi_eligible: true, notes: "Always open. Per-individual deadlines computed from hire date.", channel_partners: [] },
];

export const MAGIC_TOKENS = [
  { id: "mt_1", individual_id: "ind_1", individual_name: "Test Person 1", token_class: "enrollment", status: "active", expires_at: "2025-12-31", use_count: 0, last_used_at: null },
  { id: "mt_2", individual_id: "ind_5", individual_name: "Test Person 5", token_class: "portal", status: "active", expires_at: "2026-01-15", use_count: 3, last_used_at: "2025-06-01" },
  { id: "mt_3", individual_id: "ind_9", individual_name: "Test Person 9", token_class: "enrollment", status: "expired", expires_at: "2025-04-01", use_count: 1, last_used_at: "2025-03-22" },
  { id: "mt_4", individual_id: "ind_12", individual_name: "Test Person 12", token_class: "portal", status: "active", expires_at: "2026-02-10", use_count: 7, last_used_at: "2025-06-05" },
];

export const TOKEN_AUDIT_LOG = Array.from({ length: 12 }, (_, i) => ({
  id: `tal_${i + 1}`,
  ts: `2025-06-0${(i % 9) + 1}T1${i % 9}:22:00Z`,
  token_hash: `hash_${"abcdef".repeat(2)}${i}`,
  ip: `192.168.${i % 255}.${(i * 7) % 255}`,
  user_agent: "Mozilla/5.0 (wireframe)",
  result: i % 4 === 0 ? "rejected" : "accepted",
}));

export const AUDIT_LOG = Array.from({ length: 20 }, (_, i) => ({
  id: `al_${i + 1}`,
  ts: `2025-06-${String((i % 12) + 1).padStart(2, "0")}T10:${String(i * 3 % 60).padStart(2, "0")}:00Z`,
  table: ["individuals", "organizations", "policies", "account_adjustments", "billing_groups"][i % 5],
  record_id: `rec_${100 + i}`,
  action: ["update", "create", "update", "soft_delete", "update"][i % 5],
  actor: ["Guy (admin)", "Ops User 1", "Ops User 2"][i % 3],
  before: { status: "pending" },
  after: { status: "active" },
}));

export const MISSING_SUBMISSIONS = [
  { id: "ms_1", full_name: "Test Person A", email: "a@example.com", phone: "555-0001", org_name: "Acme Widgets Co", origin_url: "/enroll/acme", status: "new" },
  { id: "ms_2", full_name: "Test Person B", email: "b@example.com", phone: "555-0002", org_name: "Bluefin Logistics", origin_url: "/enroll/bluefin", status: "reviewing" },
  { id: "ms_3", full_name: "Test Person C", email: "c@example.com", phone: null, org_name: null, origin_url: "/enroll/unknown", status: "resolved" },
  { id: "ms_4", full_name: "Test Person D", email: "d@example.com", phone: "555-0004", org_name: "Greylock Partners LLC", origin_url: "/enroll/greylock", status: "new" },
];

export const RATE_CONFIG_DI = [
  { id: "rc_1", carrier_product: "Northstar DI Core", age_band: "18-29", rate_per_1000: 0.42 },
  { id: "rc_2", carrier_product: "Northstar DI Core", age_band: "30-39", rate_per_1000: 0.61 },
  { id: "rc_3", carrier_product: "Northstar DI Core", age_band: "40-49", rate_per_1000: 0.95 },
  { id: "rc_4", carrier_product: "Pacific DI Plus", age_band: "18-29", rate_per_1000: 0.38 },
];

export const RATE_CELLS_LTC = [
  { id: "rcl_1", carrier_product: "Heritage LTC Standard", age: 45, gender: "F", rate_per_1000: 1.22 },
  { id: "rcl_2", carrier_product: "Heritage LTC Standard", age: 45, gender: "M", rate_per_1000: 1.18 },
  { id: "rcl_3", carrier_product: "Heritage LTC Standard", age: 55, gender: "F", rate_per_1000: 2.04 },
  { id: "rcl_4", carrier_product: "Heritage LTC NY", age: 55, gender: "F", rate_per_1000: 2.31 },
];

export const ENROLLMENT_RESPONSES_LTC = [
  { id: "er_1", individual_name: "Test Person 3", question: "Smoker (last 12mo)?", answer: "No", submitted_at: "2025-05-01" },
  { id: "er_2", individual_name: "Test Person 3", question: "Family LTC claim history?", answer: "No", submitted_at: "2025-05-01" },
  { id: "er_3", individual_name: "Test Person 5", question: "Height", answer: "5'8\"", submitted_at: "2025-05-04" },
];

export function formatCents(cents: number): string {
  const n = (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return n;
}
