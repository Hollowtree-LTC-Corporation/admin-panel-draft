// Hardcoded dummy data for the Hollowtree admin wireframe.
// NOT real PII. All names are obviously fake (Test Person N, example.com).

export type Product = "DI" | "LTC";
export type Role = "admin" | "ops" | "read-only";

export const ORGS = [
  { id: "org_1", name: "Acme Widgets Co", product: "DI", situs_state: "TX", enrollment_status: "active", individuals_count: 12, policy_owner_type: "employer" },
  { id: "org_2", name: "Bluefin Logistics", product: "DI", situs_state: "CA", enrollment_status: "active", individuals_count: 7, policy_owner_type: "employer" },
  { id: "org_3", name: "Coastal Credit Union", product: "LTC", situs_state: "FL", enrollment_status: "active", individuals_count: 9, policy_owner_type: "individual" },
  { id: "org_4", name: "Delta Manufacturing", product: "DI", situs_state: "OH", enrollment_status: "closed", individuals_count: 4, policy_owner_type: "employer" },
  { id: "org_5", name: "Evergreen Health", product: "LTC", situs_state: "NY", enrollment_status: "active", individuals_count: 6, policy_owner_type: "individual" },
  { id: "org_6", name: "Foxtail Education Trust", product: "LTC", situs_state: "WA", enrollment_status: "pending", individuals_count: 2, policy_owner_type: "individual" },
  { id: "org_7", name: "Greylock Partners LLC", product: "DI", situs_state: "MA", enrollment_status: "active", individuals_count: 5, policy_owner_type: "employer" },
  { id: "org_8", name: "Harborline Shipping", product: "DI", situs_state: "WA", enrollment_status: "active", individuals_count: 8, policy_owner_type: "employer" },
];

export const BENEFIT_CLASSES = [
  { id: "bc_1", org_id: "org_3", name: "Class A — Full Time", gi_offer_cents: 200000, bronze: 50000, silver: 100000, gold: 150000, platinum: 200000, diamond: 250000, is_default: true },
  { id: "bc_2", org_id: "org_3", name: "Class B — Part Time", gi_offer_cents: 100000, bronze: 25000, silver: 50000, gold: 75000, platinum: 100000, diamond: 125000, is_default: false },
  { id: "bc_3", org_id: "org_5", name: "Default Class", gi_offer_cents: 150000, bronze: 50000, silver: 75000, gold: 100000, platinum: 150000, diamond: 200000, is_default: true },
];

const STAGES = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"] as const;
const PLANS_DI = ["Bronze DI", "Silver DI", "Gold DI"];
const PLANS_LTC = ["Bronze LTC", "Silver LTC", "Gold LTC", "Platinum LTC", "Diamond LTC"];

export const INDIVIDUALS = Array.from({ length: 40 }, (_, i) => {
  const n = i + 1;
  const org = ORGS[i % ORGS.length];
  const isLTC = org.product === "LTC";
  return {
    id: `ind_${n}`,
    full_name: `Test Person ${n}`,
    email: `person${n}@example.com`,
    phone: `555-0${100 + n}`,
    org_id: org.id,
    org_name: org.name,
    product: org.product as Product,
    stage: STAGES[n % STAGES.length],
    coverage_status: ["active", "pending", "suspended", "lapsed"][n % 4],
    plan: isLTC ? PLANS_LTC[n % PLANS_LTC.length] : PLANS_DI[n % PLANS_DI.length],
    monthly_premium_cents: 2500 + (n * 137) % 8000,
    billing_group_id: `bg_${(n % 8) + 1}`,
    // DI fields
    coverage_plan: PLANS_DI[n % PLANS_DI.length],
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
    relationship_type: n % 7 === 0 ? "spouse" : "employee",
    linked_individual_id: n % 7 === 0 ? `ind_${Math.max(1, n - 1)}` : null,
    employee_face_amount_cents: 10000000 + (n % 5) * 2500000,
    // Employer contribution
    contribution_tier: ["100%", "75%", "50%", "0%"][n % 4],
    contribution_duration_months: [12, 24, 36][n % 3],
    contribution_active: n % 5 !== 0,
  };
});

export const BILLING_GROUPS = Array.from({ length: 8 }, (_, i) => ({
  id: `bg_${i + 1}`,
  name: `Billing Group ${i + 1}`,
  individuals_count: INDIVIDUALS.filter((x) => x.billing_group_id === `bg_${i + 1}`).length,
  payment_method: ["ACH", "Card", "ACH", "Card"][i % 4],
  moov_account_id: `moov_${1000 + i}`,
}));

export const PAYMENT_LEDGER = Array.from({ length: 60 }, (_, i) => {
  const ind = INDIVIDUALS[i % INDIVIDUALS.length];
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
  };
});

export const ACCOUNT_ADJUSTMENTS = [
  { id: "aa_1", individual_id: "ind_3", individual_name: "Test Person 3", adjustment_type: "premium_correction", amount_cents: -1500, reason: "Mid-cycle plan downgrade", effective_date: "2025-03-15", approved_by: "Guy (admin)", approved_at: "2025-03-15T14:22Z" },
  { id: "aa_2", individual_id: "ind_11", individual_name: "Test Person 11", adjustment_type: "penalty_waiver", amount_cents: -2500, reason: "Bank holiday processing delay", effective_date: "2025-04-02", approved_by: "Guy (admin)", approved_at: "2025-04-02T09:10Z" },
  { id: "aa_3", individual_id: "ind_22", individual_name: "Test Person 22", adjustment_type: "refund", amount_cents: -8500, reason: "Coverage canceled in cooling-off window", effective_date: "2025-05-19", approved_by: "Guy (admin)", approved_at: "2025-05-19T11:45Z" },
  { id: "aa_4", individual_id: "ind_7", individual_name: "Test Person 7", adjustment_type: "write_off", amount_cents: -4200, reason: "Uncollectible after 90 days", effective_date: "2025-06-01", approved_by: "Guy (admin)", approved_at: "2025-06-01T16:30Z" },
];

export const CARRIERS = [
  { id: "car_1", name: "Northstar Mutual", product: "DI" },
  { id: "car_2", name: "Pacific Reserve Life", product: "DI" },
  { id: "car_3", name: "Heritage LTC Group", product: "LTC" },
  { id: "car_4", name: "Sequoia Care Partners", product: "LTC" },
];

export const CARRIER_PRODUCTS = [
  { id: "cp_1", carrier_id: "car_1", name: "Northstar DI Core" },
  { id: "cp_2", carrier_id: "car_2", name: "Pacific DI Plus" },
  { id: "cp_3", carrier_id: "car_3", name: "Heritage LTC Standard" },
  { id: "cp_4", carrier_id: "car_3", name: "Heritage LTC NY" },
  { id: "cp_5", carrier_id: "car_4", name: "Sequoia LTC Premier" },
];

export const POLICIES = [
  { id: "pol_1", org_id: "org_1", org_name: "Acme Widgets Co", carrier_product_id: "cp_1", product: "DI", status: "active", carrier_commission_pct: 12, override_pct: 3 },
  { id: "pol_2", org_id: "org_2", org_name: "Bluefin Logistics", carrier_product_id: "cp_2", product: "DI", status: "active", carrier_commission_pct: 10, override_pct: 2 },
  { id: "pol_3", org_id: "org_3", org_name: "Coastal Credit Union", carrier_product_id: "cp_3", product: "LTC", status: "active", carrier_commission_pct: null, override_pct: null },
  { id: "pol_4", org_id: "org_5", org_name: "Evergreen Health", carrier_product_id: "cp_4", product: "LTC", status: "active", carrier_commission_pct: null, override_pct: null },
  { id: "pol_5", org_id: "org_7", org_name: "Greylock Partners LLC", carrier_product_id: "cp_1", product: "DI", status: "pending", carrier_commission_pct: 12, override_pct: 3 },
];

export const CHANNEL_PARTNERS = [
  { id: "cpn_1", name: "Westfield Brokers", partner_type: "Broker", default_split_pct: 60, payment_method: "hollowtree_paid" },
  { id: "cpn_2", name: "Hollowtree House", partner_type: "House", default_split_pct: 20, payment_method: "hollowtree_paid" },
  { id: "cpn_3", name: "Jamie Rep", partner_type: "Internal", default_split_pct: 15, payment_method: "hollowtree_paid" },
  { id: "cpn_4", name: "Override Group LLC", partner_type: "Override", default_split_pct: 5, payment_method: "carrier_direct" },
];

export const COMMISSION_SPLIT_DEFAULTS = CHANNEL_PARTNERS.map((p) => ({
  id: `csd_${p.id}`,
  channel_partner_id: p.id,
  channel_partner_name: p.name,
  payee_type: p.partner_type === "House" ? "house" : p.partner_type === "Internal" ? "internal_rep" : p.partner_type === "Override" ? "override" : "channel_partner",
  default_split_pct: p.default_split_pct,
  payment_method: p.payment_method,
}));

export const POLICY_SPLITS = [
  { id: "ps_1", policy_id: "pol_1", channel_partner_name: "Westfield Brokers", pct: 60 },
  { id: "ps_2", policy_id: "pol_1", channel_partner_name: "Hollowtree House", pct: 20 },
  { id: "ps_3", policy_id: "pol_1", channel_partner_name: "Jamie Rep", pct: 15 },
  { id: "ps_4", policy_id: "pol_1", channel_partner_name: "Override Group LLC", pct: 5 },
];

export const COMMISSION_STATEMENTS = [
  { id: "cs_1", payee: "Westfield Brokers", period: "2025-05", amount_cents: 245000, payable: true },
  { id: "cs_2", payee: "Hollowtree House", period: "2025-05", amount_cents: 81000, payable: true },
  { id: "cs_3", payee: "Jamie Rep", period: "2025-05", amount_cents: 60500, payable: true },
  { id: "cs_4", payee: "Override Group LLC", period: "2025-05", amount_cents: 20000, payable: false },
];

export const CARRIER_COMMISSION_SCHEDULES = [
  { id: "ccs_1", carrier_product_id: "cp_3", carrier_product_name: "Heritage LTC Standard", state_code: null },
  { id: "ccs_2", carrier_product_id: "cp_4", carrier_product_name: "Heritage LTC NY", state_code: "NY" },
  { id: "ccs_3", carrier_product_id: "cp_5", carrier_product_name: "Sequoia LTC Premier", state_code: null },
];

export const COMMISSION_RATE_TIERS = [
  { id: "crt_1", schedule_id: "ccs_1", year_from: 1, year_to: 1, pct: 100 },
  { id: "crt_2", schedule_id: "ccs_1", year_from: 2, year_to: 5, pct: 4 },
  { id: "crt_3", schedule_id: "ccs_1", year_from: 6, year_to: 10, pct: 2 },
  { id: "crt_4", schedule_id: "ccs_2", year_from: 1, year_to: 1, pct: 80 },
  { id: "crt_5", schedule_id: "ccs_2", year_from: 2, year_to: 5, pct: 3 },
  { id: "crt_6", schedule_id: "ccs_3", year_from: 1, year_to: 1, pct: 110 },
  { id: "crt_7", schedule_id: "ccs_3", year_from: 2, year_to: 5, pct: 5 },
];

export const ENROLLMENT_WINDOWS = [
  { id: "ew_1", org_id: "org_1", org_name: "Acme Widgets Co", window_type: "initial", start_date: "2025-01-01", end_date: "2025-01-31", status: "closed", sponsor_type: "employer", carrier: "Northstar Mutual", affiliate_org: null },
  { id: "ew_2", org_id: "org_1", org_name: "Acme Widgets Co", window_type: "annual", start_date: "2025-09-01", end_date: "2025-09-30", status: "upcoming", sponsor_type: "employer", carrier: "Northstar Mutual", affiliate_org: null },
  { id: "ew_3", org_id: "org_3", org_name: "Coastal Credit Union", window_type: "annual", start_date: "2025-08-01", end_date: "2025-08-31", status: "open", sponsor_type: "employer+affiliate", carrier: "Heritage LTC Group", affiliate_org: "CCU Member Foundation" },
  { id: "ew_4", org_id: "org_6", org_name: "Foxtail Education Trust", window_type: "special", start_date: "2025-07-15", end_date: "2025-08-15", status: "open", sponsor_type: "affiliate", carrier: "Sequoia Care Partners", affiliate_org: "Foxtail Alumni Assoc" },
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
