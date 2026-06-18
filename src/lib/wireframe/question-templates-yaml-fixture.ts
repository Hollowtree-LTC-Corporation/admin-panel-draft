// YAML-shaped fixture for the Question Templates viewer.
// Mirrors apps/microsite/questions/<carrier>/<form>/<state>.yaml in the microsite repo.
// Phase A keeps a flattened projection for the existing read-only viewer; the source of
// truth at runtime is the YAML files in the microsite repo (loaded server-side).
// There is NO Supabase table backing this (the v3.16 enrollment_question_templates table
// was reverted in v3.17).

export type QuestionTier = "eligibility" | "base" | "si";
export type QuestionAppliesTo = "employee" | "spouse" | "children";

export type EnrollmentQuestionTemplate = {
  id: string;
  carrier_product_id: string;
  /** Denormalized display — resolved via carrier_product_id. Not a YAML field. */
  carrier_product_label: string;
  state_code: string | null; // null = default/generic (all states)
  tier: QuestionTier;
  question_code: string;
  question_text: string;
  applies_to: QuestionAppliesTo[];
  display_order: number;
  requires_detail: boolean;
  active: boolean;
};

export const ENROLLMENT_QUESTION_TEMPLATES: EnrollmentQuestionTemplate[] = [
  // Trustmark GTL-121 — generic (all states)
  { id: "eqt_1", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "base", question_code: "TOBACCO_12MO", question_text: "Has the proposed insured used any form of tobacco or nicotine in the past 12 months?", applies_to: ["employee", "spouse"], display_order: 10, requires_detail: false, active: true },
  { id: "eqt_2", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "base", question_code: "REPLACEMENT", question_text: "Is this insurance intended to replace any existing life or disability coverage?", applies_to: ["employee", "spouse"], display_order: 20, requires_detail: true, active: true },
  { id: "eqt_3", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "si", question_code: "MGI_DISABLED", question_text: "Are you currently disabled or unable to perform the duties of your occupation?", applies_to: ["employee", "spouse"], display_order: 110, requires_detail: false, active: true },
  { id: "eqt_4", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "si", question_code: "MGI_PHYSICIAN_6MO", question_text: "In the past 6 months, have you been treated by a physician or hospitalized for any condition?", applies_to: ["employee", "spouse"], display_order: 120, requires_detail: true, active: true },
  { id: "eqt_5", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "si", question_code: "MGI_HEALTH_5YR", question_text: "In the past 5 years, have you been diagnosed with or treated for cancer, heart disease, stroke, diabetes, or HIV/AIDS?", applies_to: ["employee", "spouse"], display_order: 130, requires_detail: true, active: true },
  { id: "eqt_6", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: null, tier: "eligibility", question_code: "ACTIVELY_AT_WORK", question_text: "Is the proposed insured actively at work performing the regular duties of their job?", applies_to: ["employee"], display_order: 1, requires_detail: false, active: true },

  // Trustmark GTL-121 — California variant (omits HIV per CA law)
  { id: "eqt_7", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "base", question_code: "TOBACCO_12MO", question_text: "Has the proposed insured used any form of tobacco or nicotine in the past 12 months?", applies_to: ["employee", "spouse"], display_order: 10, requires_detail: false, active: true },
  { id: "eqt_8", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "base", question_code: "REPLACEMENT", question_text: "Is this insurance intended to replace any existing life or disability coverage?", applies_to: ["employee", "spouse"], display_order: 20, requires_detail: true, active: true },
  { id: "eqt_9", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "si", question_code: "MGI_DISABLED", question_text: "Are you currently disabled or unable to perform the duties of your occupation?", applies_to: ["employee", "spouse"], display_order: 110, requires_detail: false, active: true },
  { id: "eqt_10", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "si", question_code: "MGI_PHYSICIAN_6MO", question_text: "In the past 6 months, have you been treated by a physician or hospitalized for any condition?", applies_to: ["employee", "spouse"], display_order: 120, requires_detail: true, active: true },
  { id: "eqt_11", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "si", question_code: "MGI_HEALTH_5YR_CA", question_text: "In the past 5 years, have you been diagnosed with or treated for cancer, heart disease, stroke, or diabetes?", applies_to: ["employee", "spouse"], display_order: 130, requires_detail: true, active: true },
  { id: "eqt_12", carrier_product_id: "cp_7", carrier_product_label: "Trustmark GTL-121", state_code: "CA", tier: "eligibility", question_code: "ACTIVELY_AT_WORK", question_text: "Is the proposed insured actively at work performing the regular duties of their job?", applies_to: ["employee"], display_order: 1, requires_detail: false, active: true },
];
