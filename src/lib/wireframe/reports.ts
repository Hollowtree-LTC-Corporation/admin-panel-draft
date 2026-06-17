// Reports catalog + dummy preview data for the wireframe.
// Pure functions; no API calls.

import {
  ORGS, INDIVIDUALS, PAYMENT_LEDGER, ACCOUNT_ADJUSTMENTS,
  ENROLLMENT_WINDOWS, CHANNEL_PARTNERS, COMMISSION_STATEMENTS,
  POLICY_SPLITS_INITIAL, POLICIES, MISSING_SUBMISSIONS, BILLING_GROUPS,
  AUDIT_LOG, TOKEN_AUDIT_LOG,
} from "./data";
import type { Product } from "./data";

export type ReportCategory =
  | "financial" | "enrollment" | "commission"
  | "carrier_handoff" | "compliance" | "operational";

export type ReportDef = {
  slug: string;
  title: string;
  description: string;
  category: ReportCategory;
  productOnly?: Product;     // hide when toggle != this product
  adminOnly?: boolean;
  scheduled?: boolean;       // shown in sidebar badge count
  extraParams?: Array<"carrier" | "payee" | "stage_threshold">;
  monthlyPivot?: boolean;    // render horizontally scrollable month columns
  carrierAction?: boolean;   // "Mark as Submitted" button (ops+)
};

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  financial: "Financial (Accounting)",
  enrollment: "Enrollment",
  commission: "Commission",
  carrier_handoff: "Carrier Handoff",
  compliance: "Compliance / Audit",
  operational: "Operational",
};

export const REPORTS: ReportDef[] = [
  // Financial
  { slug: "contract-grid", title: "Contract Grid", description: "Expected monthly collections per active enrollee. Premium + service fee + processing fee.", category: "financial", scheduled: true },
  { slug: "monthly-premium-collected", title: "Monthly Premium Collected", description: "Actual premium collected vs expected, per enrollee per month.", category: "financial", monthlyPivot: true, scheduled: true },
  { slug: "monthly-fees", title: "Monthly Fees", description: "TPA/CCA membership + processing fees, per enrollee per month. CCA vs non-CCA breakdown.", category: "financial", monthlyPivot: true },
  { slug: "monthly-balances", title: "Monthly Balances", description: "Running net balance per enrollee. Expected minus collected plus adjustments.", category: "financial", monthlyPivot: true },
  { slug: "cca-remittance", title: "CCA Remittance", description: "Monthly rollup of CCA membership fees: collected, Hollowtree retained ($5), CCA owed ($15), per org.", category: "financial", productOnly: "DI" },
  { slug: "adjustment-summary", title: "Adjustment Summary", description: "Account adjustments by type and period. Applied vs unapplied.", category: "financial" },

  // Enrollment
  { slug: "enrollment-summary", title: "Enrollment Summary", description: "Individuals by current_stage and coverage_status, grouped by organization. Participation rate.", category: "enrollment" },
  { slug: "window-status", title: "Window Status", description: "Enrollment windows: open, closing within 14 days, recently closed. Participation rates per window.", category: "enrollment" },
  { slug: "onboarding-progress", title: "Onboarding Progress", description: "Orgs with status in (not_started, onboarding). Checklist completion count per org.", category: "enrollment" },
  { slug: "stage-aging", title: "Stage Aging", description: "Individuals stuck in a stage for > N days. Ops action queue.", category: "enrollment", extraParams: ["stage_threshold"] },

  // Commission
  { slug: "commission-statements", title: "Commission Statements", description: "Per-payee, per-period statements. Premium, rate, owed, payment method, payable flag.", category: "commission", extraParams: ["payee"] },
  { slug: "partner-summary", title: "Partner Summary", description: "Aggregate commission by channel partner across all policies.", category: "commission" },
  { slug: "split-audit", title: "Split Audit", description: "Policies where commission splits do not sum to 100%, or splits were manually overridden.", category: "commission" },

  // Carrier Handoff
  { slug: "new-enrollment-file", title: "New Enrollment File", description: "Individuals purchased/active not yet in a carrier submission. Census-format output.", category: "carrier_handoff", extraParams: ["carrier"], carrierAction: true, scheduled: false },
  { slug: "status-change-report", title: "Status Change Report", description: "Coverage status transitions in a date range, grouped by carrier.", category: "carrier_handoff", extraParams: ["carrier"] },
  { slug: "census-reconciliation", title: "Census Reconciliation", description: "Enrolled vs eligible headcount per org. Gap analysis.", category: "carrier_handoff" },

  // Compliance / Audit
  { slug: "audit-trail", title: "Audit Trail", description: "Filterable export of the audit_log table.", category: "compliance" },
  { slug: "token-activity", title: "Token Activity", description: "Token validations, revocations, and expirations. Includes IP and user_agent.", category: "compliance", adminOnly: true },
  { slug: "data-change-history", title: "Data Change History", description: "Per-table change log with before/after diffs. SOC 2 evidence.", category: "compliance", adminOnly: true },

  // Operational
  { slug: "payment-health", title: "Payment Health", description: "Individuals with failed payments, grouped by retry count and org. Escalation tiers.", category: "operational" },
  { slug: "missing-submissions", title: "Missing Submissions", description: "Outstanding missing_submissions by status and age.", category: "operational", productOnly: "DI" },
  { slug: "billing-group-integrity", title: "Billing Group Integrity", description: "Groups with mismatched payment methods, orphans, or spouse-without-employee anomalies.", category: "operational" },
];

// ---------- Extra dummy data the reports need that aren't in data.ts ----------

export const PENDING_SUBMISSIONS = [
  { id: "ind_p1", full_name: "Test Person 41", dob: "1978-04-12", gender: "F", plan: "Silver LTC", face_amount: "$100,000", effective_date: "2026-07-01", org: "Coastal Credit Union", carrier: "Heritage LTC Group", benefit_class: "Class A — Full Time" },
  { id: "ind_p2", full_name: "Test Person 42", dob: "1985-09-30", gender: "M", plan: "Gold LTC", face_amount: "$150,000", effective_date: "2026-07-01", org: "Evergreen Health", carrier: "Sequoia Care Partners", benefit_class: "Default Class" },
  { id: "ind_p3", full_name: "Test Person 43", dob: "1971-01-22", gender: "F", plan: "Platinum LTC", face_amount: "$200,000", effective_date: "2026-08-01", org: "Foxtail Education Trust", carrier: "Sequoia Care Partners", benefit_class: "Default Class" },
  { id: "ind_p4", full_name: "Test Person 44", dob: "1990-06-08", gender: "M", plan: "Gold DI", face_amount: "$3,500/mo", effective_date: "2026-07-15", org: "Acme Widgets Co", carrier: "Northstar Mutual", benefit_class: "—" },
];

// Onboarding checklist completion (item count out of 12).
export const ONBOARDING_PROGRESS = [
  { organization_id: "org_6", org: "Foxtail Education Trust", status: "onboarding", completed: 7, total: 12, owner: "Casey Rep", days_in_stage: 11 },
  { organization_id: "org_9", org: "Ironwood Tech Co-op", status: "not_started", completed: 0, total: 12, owner: "Jamie Rep", days_in_stage: 3 },
  { organization_id: "org_10", org: "Juniper Health Network", status: "not_started", completed: 2, total: 12, owner: "Jamie Rep", days_in_stage: 6 },
];

const MONTHS_2025 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------- Preview row generator ----------

export type PreviewTable = {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, any>>;
  monthlyPivot?: boolean;
  footnote?: string;
};

function fmtCents(c: number) {
  const sign = c < 0 ? "-" : "";
  return `${sign}$${(Math.abs(c) / 100).toFixed(2)}`;
}

export function buildPreview(slug: string, product: Product): PreviewTable {
  const activeIndiv = INDIVIDUALS.filter((i) => ["active", "purchased", "suspended"].includes(i.coverage_status)).filter((i) => i.product === product);

  switch (slug) {
    case "contract-grid": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Organization" },
          { key: "premium", label: "Premium" },
          { key: "service_fee", label: "Service Fee" },
          { key: "processing_fee", label: "Processing Fee" },
          { key: "total", label: "Expected Monthly" },
        ],
        rows: activeIndiv.slice(0, 25).map((ind) => {
          const premium = ind.monthly_premium_cents;
          const service = ind.product === "DI" && ind.org_name?.includes("Acme") ? 2000 : 0; // CCA $20
          const processing = 99;
          return {
            individual: ind.full_name,
            org: ind.org_name,
            premium: fmtCents(premium),
            service_fee: fmtCents(service),
            processing_fee: fmtCents(processing),
            total: fmtCents(premium + service + processing),
          };
        }),
      };
    }

    case "monthly-premium-collected": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          ...MONTHS_2025.map((m) => ({ key: m, label: m })),
          { key: "ytd", label: "YTD" },
        ],
        monthlyPivot: true,
        rows: activeIndiv.slice(0, 25).map((ind, i) => {
          const base = ind.monthly_premium_cents;
          const row: Record<string, any> = { individual: ind.full_name, org: ind.org_name };
          let ytd = 0;
          MONTHS_2025.forEach((m, mi) => {
            const collected = mi <= 5 ? (i % 9 === 0 && mi === 3 ? 0 : base) : 0; // first half of year
            ytd += collected;
            row[m] = collected ? fmtCents(collected) : (mi <= 5 ? "—" : "");
          });
          row.ytd = fmtCents(ytd);
          return row;
        }),
      };
    }

    case "monthly-fees": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          { key: "cca", label: "CCA Group" },
          ...MONTHS_2025.slice(0, 6).map((m) => ({ key: m, label: m })),
          { key: "retained", label: "HT Retained" },
          { key: "remit", label: "CCA Remit" },
        ],
        monthlyPivot: true,
        rows: activeIndiv.slice(0, 25).map((ind) => {
          const org = ORGS.find((o) => o.id === ind.organization_id);
          const isCca = !!org?.cca_group;
          const row: Record<string, any> = { individual: ind.full_name, org: ind.org_name, cca: isCca ? "Yes" : "No" };
          MONTHS_2025.slice(0, 6).forEach((m) => { row[m] = fmtCents(isCca ? 2099 : 99); });
          row.retained = fmtCents(isCca ? 500 * 6 : 0);
          row.remit = fmtCents(isCca ? 1500 * 6 : 0);
          return row;
        }),
      };
    }

    case "monthly-balances": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          { key: "expected", label: "Expected YTD" },
          { key: "collected", label: "Collected YTD" },
          { key: "adjustments", label: "Adjustments" },
          { key: "balance", label: "Net Balance" },
        ],
        rows: activeIndiv.slice(0, 25).map((ind, i) => {
          const expected = ind.monthly_premium_cents * 6;
          const collected = expected - (i % 7 === 0 ? ind.monthly_premium_cents : 0);
          const adj = i % 5 === 0 ? -1500 : 0;
          return {
            individual: ind.full_name,
            org: ind.org_name,
            expected: fmtCents(expected),
            collected: fmtCents(collected),
            adjustments: fmtCents(adj),
            balance: fmtCents(expected - collected - adj),
          };
        }),
      };
    }

    case "cca-remittance": {
      const ccaOrgs = ORGS.filter((o) => o.cca_group && o.product === "DI");
      return {
        columns: [
          { key: "org", label: "Organization" },
          { key: "period", label: "Period" },
          { key: "enrollees", label: "Enrollees" },
          { key: "collected", label: "Total Collected" },
          { key: "retained", label: "Hollowtree Retained ($5)" },
          { key: "owed", label: "CCA Owed ($15)" },
        ],
        rows: ccaOrgs.flatMap((o) =>
          MONTHS_2025.slice(0, 6).map((m) => ({
            org: o.name,
            period: `2025-${m}`,
            enrollees: o.individuals_count,
            collected: fmtCents(o.individuals_count * 2000),
            retained: fmtCents(o.individuals_count * 500),
            owed: fmtCents(o.individuals_count * 1500),
          })),
        ),
      };
    }

    case "adjustment-summary": {
      return {
        columns: [
          { key: "type", label: "Type" },
          { key: "individual", label: "Individual" },
          { key: "amount", label: "Amount" },
          { key: "reason", label: "Reason" },
          { key: "effective", label: "Effective" },
          { key: "approved_by", label: "Approved By" },
        ],
        rows: ACCOUNT_ADJUSTMENTS.map((a) => ({
          type: a.adjustment_type,
          individual: a.individual_name,
          amount: fmtCents(a.amount_cents),
          reason: a.reason,
          effective: a.effective_date,
          approved_by: a.approved_by,
        })),
      };
    }

    case "enrollment-summary": {
      const grouped = ORGS.filter((o) => o.product === product).map((o) => {
        const orgInd = INDIVIDUALS.filter((i) => i.organization_id === o.id);
        const enrolled = orgInd.filter((i) => i.coverage_status === "active").length;
        const eligible = orgInd.length;
        return {
          org: o.name,
          eligible,
          enrolled,
          in_progress: orgInd.filter((i) => i.coverage_status === "in_progress").length,
          purchased: orgInd.filter((i) => i.coverage_status === "purchased").length,
          rate: eligible ? `${Math.round((enrolled / eligible) * 100)}%` : "0%",
        };
      });
      return {
        columns: [
          { key: "org", label: "Organization" },
          { key: "eligible", label: "Eligible" },
          { key: "enrolled", label: "Active" },
          { key: "purchased", label: "Purchased" },
          { key: "in_progress", label: "In Progress" },
          { key: "rate", label: "Participation" },
        ],
        rows: grouped,
      };
    }

    case "window-status": {
      const today = new Date("2025-06-15");
      const extra = [{
        id: "ew_6",
        organization_id: "org_1",
        org_name: "Acme Widgets Co",
        affiliate_organization_id: null,
        affiliate_org: null,
        window_type: "special" as const,
        start_date: "2025-06-01",
        end_date: "2025-06-20",
        default_effective_date: "2025-07-01",
        status: "open" as const,
        sponsor_type: "employer" as const,
        carrier: "Northstar Mutual",
        gi_eligible: true,
        notes: "",
        channel_partners: [],
      }];
      const all = [...ENROLLMENT_WINDOWS, ...extra];
      return {
        columns: [
          { key: "org", label: "Org" },
          { key: "window_type", label: "Window Type" },
          { key: "start_date", label: "Start" },
          { key: "end_date", label: "End" },
          { key: "status", label: "Status" },
          { key: "indicator", label: "Indicator" },
          { key: "carrier", label: "Carrier" },
        ],
        rows: all.map((w) => {
          let indicator = "";
          if (w.enrollment_end_date) {
            const days = Math.round((new Date(w.enrollment_end_date).getTime() - today.getTime()) / 86400000);
            if (w.status === "open" && days <= 14 && days >= 0) indicator = `Closing in ${days}d`;
            else if (w.status === "closed" && days >= -30) indicator = "Recently closed";
          }
          return {
            org: w.org_name ?? w.affiliate_org ?? "—",
            window_type: w.window_type,
            start_date: w.enrollment_start_date ?? "—",
            end_date: w.enrollment_end_date ?? "—",
            status: w.status,
            indicator,
            carrier: w.carrier ?? "—",
          };
        }),
      };
    }

    case "onboarding-progress": {
      return {
        columns: [
          { key: "org", label: "Organization" },
          { key: "status", label: "Status" },
          { key: "completed", label: "Checklist" },
          { key: "owner", label: "Owner" },
          { key: "days_in_stage", label: "Days in stage" },
        ],
        rows: ONBOARDING_PROGRESS.map((o) => ({
          org: o.org,
          status: o.status,
          completed: `${o.completed} / ${o.total}`,
          owner: o.owner,
          days_in_stage: o.days_in_stage,
        })),
      };
    }

    case "stage-aging": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          { key: "stage", label: "Stage" },
          { key: "days", label: "Days in stage" },
          { key: "owner", label: "Assigned Rep" },
        ],
        rows: INDIVIDUALS.filter((i) => i.coverage_status === "in_progress").slice(0, 25).map((i, idx) => ({
          individual: i.full_name,
          org: i.org_name,
          stage: (i as { current_stage?: string }).stage ?? "—",
          days: 14 + (idx * 3) % 40,
          owner: i.assigned_rep ?? "—",
        })),
      };
    }

    case "commission-statements": {
      return {
        columns: [
          { key: "payee", label: "Payee" },
          { key: "period", label: "Period" },
          { key: "premium_base", label: "Premium Base" },
          { key: "rate", label: "Rate" },
          { key: "owed", label: "Owed" },
          { key: "method", label: "Method" },
          { key: "payable", label: "Payable" },
        ],
        rows: COMMISSION_STATEMENTS.map((s, i) => ({
          payee: s.payee,
          period: s.period,
          premium_base: fmtCents(s.amount_cents * 10),
          rate: ["10%", "12%", "15%", "5%"][i % 4],
          owed: fmtCents(s.amount_cents),
          method: s.payable ? "hollowtree_paid" : "carrier_direct",
          payable: s.payable ? "Yes" : "No",
        })),
      };
    }

    case "partner-summary": {
      return {
        columns: [
          { key: "partner", label: "Channel Partner" },
          { key: "type", label: "Type" },
          { key: "policies", label: "Policies" },
          { key: "total", label: "YTD Commission" },
        ],
        rows: CHANNEL_PARTNERS.map((cp, i) => ({
          partner: cp.name,
          type: cp.partner_type,
          policies: 1 + (i % 4),
          total: fmtCents(100000 + i * 23500),
        })),
      };
    }

    case "split-audit": {
      const byPolicy: Record<string, number> = {};
      POLICY_SPLITS_INITIAL.forEach((s) => { byPolicy[s.policy_id] = (byPolicy[s.policy_id] ?? 0) + s.split_pct; });
      return {
        columns: [
          { key: "policy", label: "Policy" },
          { key: "org", label: "Org" },
          { key: "sum", label: "Splits Total" },
          { key: "issue", label: "Issue" },
        ],
        rows: Object.entries(byPolicy).map(([pid, total]) => {
          const pol = POLICIES.find((p) => p.id === pid);
          const overridden = POLICY_SPLITS_INITIAL.some((s) => s.policy_id === pid && s.source === "override");
          let issue = "";
          if (total !== 100) issue = `Does not sum to 100% (${total}%)`;
          else if (overridden) issue = "Manual override";
          return { policy: pid, org: pol?.org_name ?? "—", sum: `${total}%`, issue: issue || "OK" };
        }).filter((r) => r.issue !== "OK"),
      };
    }

    case "new-enrollment-file": {
      const cols = product === "LTC"
        ? [
            { key: "full_name", label: "Name" },
            { key: "dob", label: "DOB" },
            { key: "gender", label: "Gender" },
            { key: "plan", label: "Plan" },
            { key: "benefit_class", label: "Benefit Class" },
            { key: "face_amount", label: "Face Amount" },
            { key: "effective_date", label: "Effective" },
            { key: "org", label: "Org" },
          ]
        : [
            { key: "full_name", label: "Name" },
            { key: "dob", label: "DOB" },
            { key: "gender", label: "Gender" },
            { key: "plan", label: "Coverage Plan" },
            { key: "face_amount", label: "Monthly Benefit" },
            { key: "effective_date", label: "Effective" },
            { key: "org", label: "Org" },
          ];
      return {
        columns: cols,
        rows: PENDING_SUBMISSIONS.filter((p) => product === "LTC" ? p.plan.includes("LTC") : p.plan.includes("DI")),
      };
    }

    case "status-change-report": {
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          { key: "carrier", label: "Carrier" },
          { key: "from", label: "From" },
          { key: "to", label: "To" },
          { key: "date", label: "Effective" },
        ],
        rows: INDIVIDUALS.slice(0, 25).map((i, idx) => {
          const trans = ["new_active", "cancellation", "lapse", "reinstatement"][idx % 4];
          const map: Record<string, [string, string]> = {
            new_active: ["purchased", "active"],
            cancellation: ["active", "canceled"],
            lapse: ["active", "lapsed"],
            reinstatement: ["lapsed", "active"],
          };
          return {
            individual: i.full_name,
            org: i.org_name,
            carrier: i.product === "DI" ? "Northstar Mutual" : "Heritage LTC Group",
            from: map[trans][0],
            to: map[trans][1],
            date: `2025-06-${String((idx % 27) + 1).padStart(2, "0")}`,
          };
        }),
      };
    }

    case "census-reconciliation": {
      return {
        columns: [
          { key: "org", label: "Organization" },
          { key: "eligible", label: "Eligible" },
          { key: "enrolled", label: "Enrolled" },
          { key: "in_census", label: "In Carrier Census" },
          { key: "gap", label: "Gap" },
        ],
        rows: ORGS.filter((o) => o.product === product).map((o, idx) => {
          const orgInd = INDIVIDUALS.filter((i) => i.organization_id === o.id);
          const enrolled = orgInd.filter((i) => i.coverage_status === "active").length;
          const inCensus = Math.max(0, enrolled - (idx % 3));
          return {
            org: o.name,
            eligible: orgInd.length,
            enrolled,
            in_census: inCensus,
            gap: enrolled - inCensus,
          };
        }),
      };
    }

    case "audit-trail": {
      return {
        columns: [
          { key: "ts", label: "Timestamp" },
          { key: "table", label: "Table" },
          { key: "record_id", label: "Record" },
          { key: "action", label: "Action" },
          { key: "actor", label: "Actor" },
        ],
        rows: AUDIT_LOG.slice(0, 25).map((a) => ({
          ts: a.timestamp, table: a.table_name, record_id: a.record_id, action: a.action, actor: a.actor_name,
        })),
      };
    }

    case "token-activity": {
      return {
        columns: [
          { key: "ts", label: "Timestamp" },
          { key: "token_hash", label: "Token (hash)" },
          { key: "ip", label: "IP" },
          { key: "user_agent", label: "User Agent" },
          { key: "result", label: "Result" },
        ],
        rows: TOKEN_AUDIT_LOG.map((t) => ({
          ts: t.created_at, token_hash: t.attempted_token_hash, ip: t.ip_address, user_agent: t.user_agent, result: t.outcome,
        })),
      };
    }

    case "data-change-history": {
      return {
        columns: [
          { key: "ts", label: "Timestamp" },
          { key: "table", label: "Table" },
          { key: "record_id", label: "Record" },
          { key: "before", label: "Before" },
          { key: "after", label: "After" },
          { key: "actor", label: "Actor" },
        ],
        rows: AUDIT_LOG.slice(0, 20).map((a) => ({
          ts: a.timestamp,
          table: a.table_name,
          record_id: a.record_id,
          before: JSON.stringify(a.old_values),
          after: JSON.stringify(a.new_values),
          actor: a.actor_name,
        })),
      };
    }

    case "payment-health": {
      const failing = INDIVIDUALS.filter((i) => i.last_payment_status === "Failed");
      return {
        columns: [
          { key: "individual", label: "Individual" },
          { key: "org", label: "Org" },
          { key: "retries", label: "Retry Count" },
          { key: "tier", label: "Escalation Tier" },
          { key: "balance", label: "Past Due" },
        ],
        rows: failing.map((i) => {
          const tier = i.retry_count >= 5 ? "Suspension Risk" : i.retry_count >= 3 ? "Penalty Zone" : "Grace";
          return {
            individual: i.full_name,
            org: i.org_name,
            retries: i.retry_count,
            tier,
            balance: fmtCents(i.monthly_premium_cents),
          };
        }),
      };
    }

    case "missing-submissions": {
      return {
        columns: [
          { key: "full_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "org_name", label: "Org" },
          { key: "status", label: "Status" },
          { key: "origin_url", label: "Origin" },
        ],
        rows: MISSING_SUBMISSIONS.map((m) => ({ ...m })),
      };
    }

    case "billing-group-integrity": {
      return {
        columns: [
          { key: "group", label: "Billing Group" },
          { key: "individuals", label: "Individuals" },
          { key: "payment_method", label: "Payment Method" },
          { key: "anomaly", label: "Anomaly" },
        ],
        rows: BILLING_GROUPS.map((bg, i) => {
          let anomaly = "OK";
          if (i === 1) anomaly = "Mixed payment methods within group";
          else if (i === 4) anomaly = "Spouse without primary in same group";
          else if (i === 6) anomaly = "Empty group (orphaned)";
          return {
            group: bg.name,
            individuals: bg.individuals_count,
            payment_method: bg.payment_method,
            anomaly,
          };
        }).filter((r) => r.anomaly !== "OK"),
      };
    }

    default:
      return { columns: [{ key: "msg", label: "Notice" }], rows: [{ msg: "Preview not implemented." }] };
  }
}

// Convenience lookup
export function findReport(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug);
}

// Used for sidebar badge — count of reports with a saved schedule (dummy).
export const SCHEDULED_REPORT_COUNT = REPORTS.filter((r) => r.scheduled).length;
