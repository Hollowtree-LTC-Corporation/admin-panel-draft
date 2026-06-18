// SI Applications — derived view over INDIVIDUALS (LTC only).
// An SI application is any LTC individual where issue_type='SI' OR
// applied_for_upgrade=true (GI -> SI buy-up). Spouses are always SI.

import { INDIVIDUALS, ORGS, CARRIERS, ENROLLMENT_WINDOWS } from "./data";

export type CarrierDecision = "pending" | "approved" | "denied";

export type SiApplication = {
  individual_id: string;
  individual_name: string;
  first_name: string;
  last_name: string;
  respondent_type: "employee" | "spouse";
  organization_id: string;
  org_name: string;
  linked_individual_id: string | null;
  linked_individual_name: string | null;
  plan_applied_for: string; // employee_plan_selected or spouse_purchased_plan
  face_amount_cents: number;
  carrier_id: string;
  carrier_name: string;
  upgrade_submitted_at: string; // ISO date
  upgrade_carrier_decision: CarrierDecision;
  upgrade_carrier_decision_at: string | null;
  decision_reason: string | null;
  pre_upgrade_premium_cents: number | null;
  issue_type: "SI";
  plan_tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  assigned_rep: string | null;
  responses: SiResponse[];
};

export type SiResponseCategory =
  | "lifestyle"
  | "biometrics"
  | "family_history"
  | "current_conditions"
  | "prescriptions"
  | "other";

export type SiResponse = {
  id: string;
  question_code: string;
  question: string;
  category: SiResponseCategory;
  answer: string;
  detail: string | null;
  condition_date: string | null;
  provider_name: string | null;
  amount: string | null;
};

// Hardcoded category mapping. Phase A+ schema: move to enrollment_responses.question_category.
export const QUESTION_CATEGORIES: Record<string, SiResponseCategory> = {
  smoker_12mo: "lifestyle",
  tobacco_use: "lifestyle",
  alcohol_use: "lifestyle",
  height: "biometrics",
  weight: "biometrics",
  family_ltc_history: "family_history",
  family_dementia: "family_history",
  current_condition_diabetes: "current_conditions",
  current_condition_cardiac: "current_conditions",
  rx_blood_pressure: "prescriptions",
  rx_cholesterol: "prescriptions",
};

const QUESTION_LABELS: Record<string, string> = {
  smoker_12mo: "Smoker (last 12 months)?",
  tobacco_use: "Tobacco use?",
  alcohol_use: "Alcohol use (drinks/week)?",
  height: "Height",
  weight: "Weight",
  family_ltc_history: "Family LTC claim history?",
  family_dementia: "Family history of dementia or Alzheimer's?",
  current_condition_diabetes: "Diagnosed with Type II Diabetes?",
  current_condition_cardiac: "History of cardiac events?",
  rx_blood_pressure: "Currently prescribed blood pressure medication?",
  rx_cholesterol: "Currently prescribed cholesterol medication?",
};

const ALL_QUESTION_CODES = Object.keys(QUESTION_LABELS);

const PLAN_TIERS: SiApplication["plan_tier"][] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

function planTierFromName(name: string): SiApplication["plan_tier"] {
  for (const t of PLAN_TIERS) if (name.includes(t)) return t;
  return "Silver";
}

function isoDateMinusDays(days: number): string {
  const d = new Date("2025-06-01T14:32:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function buildResponses(seed: number): SiResponse[] {
  return ALL_QUESTION_CODES.map((code, idx) => {
    const k = (seed + idx) % 7;
    let answer = "";
    let detail: string | null = null;
    let condition_date: string | null = null;
    let provider_name: string | null = null;
    let amount: string | null = null;
    switch (code) {
      case "smoker_12mo":
      case "tobacco_use":
        answer = k % 4 === 0 ? "Yes" : "No";
        break;
      case "alcohol_use":
        answer = `${k} drinks/week`;
        break;
      case "height":
        answer = `5'${4 + (k % 8)}"`;
        break;
      case "weight":
        answer = `${140 + k * 6} lb`;
        break;
      case "family_ltc_history":
      case "family_dementia":
        answer = k % 3 === 0 ? "Yes" : "No";
        if (answer === "Yes") detail = "Maternal grandmother, diagnosed 2012.";
        break;
      case "current_condition_diabetes":
      case "current_condition_cardiac":
        answer = k === 0 ? "Yes" : "No";
        if (answer === "Yes") {
          condition_date = `201${k}-0${(k % 9) + 1}-15`;
          provider_name = "Dr. Patel, City Medical Group";
          detail = "Well-managed, no hospitalizations in last 5 years.";
        }
        break;
      case "rx_blood_pressure":
      case "rx_cholesterol":
        answer = k % 2 === 0 ? "Yes" : "No";
        if (answer === "Yes") {
          provider_name = "Dr. Patel, City Medical Group";
          amount = `${10 + k * 5} mg daily`;
        }
        break;
    }
    return {
      id: `er_${seed}_${idx}`,
      question_code: code,
      question: QUESTION_LABELS[code],
      category: QUESTION_CATEGORIES[code] ?? "other",
      answer,
      detail,
      condition_date,
      provider_name,
      amount,
    };
  });
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.split(/\s+/);
  return { first: parts.slice(0, -1).join(" ") || full, last: parts[parts.length - 1] || "" };
}

export const SI_APPLICATIONS: SiApplication[] = INDIVIDUALS
  .filter((i) => i.product === "LTC" && (i.issue_type === "SI" || i.applied_for_upgrade))
  .map((i, idx) => {
    const org = ORGS.find((o) => o.id === i.organization_id);
    const ew = ENROLLMENT_WINDOWS.find((w) => w.organization_id === i.organization_id) ?? ENROLLMENT_WINDOWS[2];
    // Resolve carrier via FK; fall back to first LTC carrier if none.
    const ltcCarriers = CARRIERS.filter((c) => c.product === "LTC");
    const carrier =
      ltcCarriers.find((c) => c.id === ew.carrier_id) ??
      ltcCarriers[idx % ltcCarriers.length];
    const isSpouse = i.relationship_type === "spouse";
    const linked = isSpouse && i.linked_individual_id
      ? INDIVIDUALS.find((x) => x.id === i.linked_individual_id) ?? null
      : null;
    const decisionPool: CarrierDecision[] = ["pending", "pending", "pending", "approved", "denied", "pending"];
    const decision = decisionPool[idx % decisionPool.length];
    const submittedDaysAgo = 2 + ((idx * 7) % 35);
    const decidedDaysAgo = decision === "pending" ? null : Math.max(1, submittedDaysAgo - (3 + (idx % 8)));
    const planName = i.purchased_plan ?? i.plan;
    const { first, last } = splitName(i.full_name);
    return {
      individual_id: i.id,
      individual_name: i.full_name,
      first_name: first,
      last_name: last,
      respondent_type: isSpouse ? "spouse" : "employee",
      organization_id: i.organization_id,
      org_name: org?.name ?? i.org_name,
      linked_individual_id: linked?.id ?? null,
      linked_individual_name: linked?.full_name ?? null,
      plan_applied_for: planName,
      face_amount_cents: i.face_amount_cents,
      carrier_id: carrier.id,
      carrier_name: carrier.carrier_name,
      upgrade_submitted_at: isoDateMinusDays(submittedDaysAgo),
      upgrade_carrier_decision: decision,
      upgrade_carrier_decision_at: decidedDaysAgo === null ? null : isoDateMinusDays(decidedDaysAgo),
      decision_reason:
        decision === "denied"
          ? "Underwriting findings outside carrier guidelines."
          : decision === "approved"
          ? "Standard approval. Effective per window."
          : null,
      pre_upgrade_premium_cents: i.applied_for_upgrade ? i.monthly_premium_cents - 800 : null,
      issue_type: "SI",
      plan_tier: planTierFromName(planName),
      assigned_rep: i.assigned_rep ?? null,
      responses: buildResponses(idx + 1),
    };
  });

export function daysBetween(fromIso: string, toIso: string | Date = new Date()): number {
  const from = new Date(fromIso).getTime();
  const to = typeof toIso === "string" ? new Date(toIso).getTime() : toIso.getTime();
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
