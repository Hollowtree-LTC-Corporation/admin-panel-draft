// Carrier Premium Remittance — wireframe computations (dummy data).
// Basis (LOCKED 2026-06-23, decision 388cbef2-2e52-812c-9ccc-c671942642b7):
//   Amount to remit (per carrier × billing_cycle_month) =
//     SUM(payment_ledger.amount_cents)
//     WHERE event_type = 'premium'
//     across BOTH funding_source = 'employee_account' AND 'employer_account'
//     grouped by carrier and billing_cycle_month
//   ACCRUED = status IN ('successful','failed','pending')   (excludes 'reversed')
//   COLLECTED = subset where status = 'successful'
//   GAP = ACCRUED − COLLECTED
//   Net of TPA fee is structural (fees are separate event_type='fee' rows).
//   Refunds are NOT netted (carrier remittance is gross premium).

import {
  PAYMENT_LEDGER, INDIVIDUALS, POLICIES, CARRIER_PRODUCTS, CARRIERS,
  BILLING_GROUPS,
} from "./data";
import type { Product, Carrier } from "./data";

export function carrierForIndividual(individualId: string): Carrier | null {
  const ind = INDIVIDUALS.find((i) => i.id === individualId);
  if (!ind) return null;
  // DI: per-individual policy preferred when present
  let pol = POLICIES.find(
    (p) => p.product === ind.product && p.individual_id === ind.id,
  );
  if (!pol) {
    pol = POLICIES.find(
      (p) =>
        p.product === ind.product &&
        p.organization_id === ind.organization_id &&
        (p.enrollment_status === "active" || p.enrollment_status === "pending"),
    );
  }
  if (!pol) return null;
  const cp = CARRIER_PRODUCTS.find((c) => c.id === pol!.carrier_product_id);
  if (!cp) return null;
  return CARRIERS.find((c) => c.id === cp.carrier_id) ?? null;
}

export type RemittanceRow = {
  carrier: Carrier;
  month: string;            // YYYY-MM
  policies: number;         // distinct enrollment_ids contributing
  accruedCents: number;     // status in ('successful','failed','pending')
  collectedCents: number;   // status = 'successful'
  gapCents: number;         // accrued − collected
  // DI coverage split
  stdltdAccrued?: number;
  stdltdCollected?: number;
  ltdAccrued?: number;
  ltdCollected?: number;
};

export type RemittanceContribution = {
  billingGroupId: string;
  billingGroupLabel: string;
  orgName: string;
  accruedCents: number;
  collectedCents: number;
  status: "successful" | "mixed" | "failed" | "pending";
};

const ACCRUED_STATUSES = new Set(["successful", "failed", "pending"]);

export function availableRemittanceMonths(product: Product): string[] {
  const months = new Set<string>();
  for (const p of PAYMENT_LEDGER) {
    if (p.event_type !== "premium") continue;
    const ind = INDIVIDUALS.find((i) => i.id === p.enrollment_id);
    if (!ind || ind.product !== product) continue;
    months.add(p.billing_cycle_month);
  }
  return Array.from(months).sort().reverse();
}

export function computeRemittance(
  product: Product,
  month: string,
  carrierFilter: "all" | string,
  orgFilter: "all" | string,
): RemittanceRow[] {
  const byCarrier = new Map<string, RemittanceRow>();
  for (const p of PAYMENT_LEDGER) {
    if (p.event_type !== "premium") continue;
    if (p.billing_cycle_month !== month) continue;
    if (!ACCRUED_STATUSES.has(p.status)) continue;
    const ind = INDIVIDUALS.find((i) => i.id === p.enrollment_id);
    if (!ind || ind.product !== product) continue;
    if (orgFilter !== "all" && ind.organization_id !== orgFilter) continue;
    const car = carrierForIndividual(ind.id);
    if (!car) continue;
    if (carrierFilter !== "all" && car.id !== carrierFilter) continue;
    let row = byCarrier.get(car.id);
    if (!row) {
      row = {
        carrier: car,
        month,
        policies: 0,
        accruedCents: 0,
        collectedCents: 0,
        gapCents: 0,
        stdltdAccrued: 0,
        stdltdCollected: 0,
        ltdAccrued: 0,
        ltdCollected: 0,
      };
      byCarrier.set(car.id, row);
    }
    row.accruedCents += p.amount_cents;
    if (p.status === "successful") row.collectedCents += p.amount_cents;
    if (product === "DI") {
      if (p.coverage_type === "LTD") {
        row.ltdAccrued! += p.amount_cents;
        if (p.status === "successful") row.ltdCollected! += p.amount_cents;
      } else {
        row.stdltdAccrued! += p.amount_cents;
        if (p.status === "successful") row.stdltdCollected! += p.amount_cents;
      }
    }
  }
  // Policy count: distinct enrollment_ids per carrier in that month
  const seenByCarrier = new Map<string, Set<string>>();
  for (const p of PAYMENT_LEDGER) {
    if (p.event_type !== "premium" || p.billing_cycle_month !== month) continue;
    if (!ACCRUED_STATUSES.has(p.status)) continue;
    const car = carrierForIndividual(p.enrollment_id);
    if (!car) continue;
    if (!byCarrier.has(car.id)) continue;
    if (!seenByCarrier.has(car.id)) seenByCarrier.set(car.id, new Set());
    seenByCarrier.get(car.id)!.add(p.enrollment_id);
  }
  for (const [cid, row] of byCarrier) {
    row.policies = seenByCarrier.get(cid)?.size ?? 0;
    row.gapCents = row.accruedCents - row.collectedCents;
  }
  return Array.from(byCarrier.values()).sort((a, b) =>
    a.carrier.carrier_name.localeCompare(b.carrier.carrier_name),
  );
}

export function trendByCarrier(
  product: Product,
  months: string[],
): Array<{ carrier: Carrier; cells: Record<string, number> }> {
  const monthSet = new Set(months);
  const map = new Map<string, { carrier: Carrier; cells: Record<string, number> }>();
  for (const p of PAYMENT_LEDGER) {
    if (p.event_type !== "premium") continue;
    if (!monthSet.has(p.billing_cycle_month)) continue;
    if (!ACCRUED_STATUSES.has(p.status)) continue;
    const ind = INDIVIDUALS.find((i) => i.id === p.enrollment_id);
    if (!ind || ind.product !== product) continue;
    const car = carrierForIndividual(ind.id);
    if (!car) continue;
    let row = map.get(car.id);
    if (!row) {
      row = { carrier: car, cells: {} };
      map.set(car.id, row);
    }
    row.cells[p.billing_cycle_month] = (row.cells[p.billing_cycle_month] ?? 0) + p.amount_cents;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.carrier.carrier_name.localeCompare(b.carrier.carrier_name),
  );
}

export function contributionsForCarrier(
  product: Product,
  carrierId: string,
  month: string,
): RemittanceContribution[] {
  const byBg = new Map<string, RemittanceContribution>();
  for (const p of PAYMENT_LEDGER) {
    if (p.event_type !== "premium" || p.billing_cycle_month !== month) continue;
    if (!ACCRUED_STATUSES.has(p.status)) continue;
    const ind = INDIVIDUALS.find((i) => i.id === p.enrollment_id);
    if (!ind || ind.product !== product) continue;
    const car = carrierForIndividual(ind.id);
    if (!car || car.id !== carrierId) continue;
    const bg = BILLING_GROUPS.find((b) => b.id === p.billing_group_id);
    const key = p.billing_group_id;
    let row = byBg.get(key);
    if (!row) {
      row = {
        billingGroupId: key,
        billingGroupLabel: bg?.payment_method_display_label ?? bg?.name ?? key,
        orgName: ind.org_name,
        accruedCents: 0,
        collectedCents: 0,
        status: "successful",
      };
      byBg.set(key, row);
    }
    row.accruedCents += p.amount_cents;
    if (p.status === "successful") row.collectedCents += p.amount_cents;
  }
  for (const r of byBg.values()) {
    if (r.collectedCents === r.accruedCents) r.status = "successful";
    else if (r.collectedCents === 0) r.status = "failed";
    else r.status = "mixed";
  }
  return Array.from(byBg.values()).sort((a, b) =>
    b.accruedCents - a.accruedCents,
  );
}
