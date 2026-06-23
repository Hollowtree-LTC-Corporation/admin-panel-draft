import { Fragment, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronRight, Download, ExternalLink, Info, Lock } from "lucide-react";
import {
  PageHeader, Card, Btn, Pill, Drawer, SectionTitle, TableShell, THead, TRow, TCell,
} from "@/components/wireframe/Bits";
import {
  INDIVIDUALS, ORGS, PAYMENT_LEDGER, ACCOUNT_ADJUSTMENTS, BILLING_GROUPS, formatCents,
} from "@/lib/wireframe/data";
import type { Product } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import {
  availableRemittanceMonths, computeRemittance, contributionsForCarrier,
  trendByCarrier, carrierForIndividual,
  type RemittanceRow,
} from "@/lib/wireframe/carrier-remittance";
import { writePhiAudit } from "@/lib/wireframe/phi-audit";

function fmt(cents: number, opts: { signed?: boolean } = {}): string {
  const c = Object.is(cents, -0) ? 0 : cents;
  if (c === 0) return "$0.00";
  if (opts.signed && c < 0) return `−${formatCents(Math.abs(c))}`;
  return formatCents(Math.abs(c));
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function BackLink() {
  return (
    <div className="mb-2">
      <Link to="/reports" className="inline-flex items-center gap-1 text-[11px] text-black/50 hover:text-[#0a3d3e]">
        <ChevronLeft className="h-3 w-3" /> All reports
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BUILD 1 — Carrier Premium Remittance
// ─────────────────────────────────────────────────────────────────────────

export function CarrierRemittanceReport() {
  const { product, role } = useStore();
  const allMonths = useMemo(() => availableRemittanceMonths(product), [product]);
  const [month, setMonth] = useState(allMonths[0] ?? "2025-06");
  const [carrierFilter, setCarrierFilter] = useState<"all" | string>("all");
  const [orgFilter, setOrgFilter] = useState<"all" | string>("all");
  const [tab, setTab] = useState<"month" | "trend">("month");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drillCarrier, setDrillCarrier] = useState<RemittanceRow | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  const rows = useMemo(
    () => computeRemittance(product, month, carrierFilter, orgFilter),
    [product, month, carrierFilter, orgFilter],
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.accrued += r.accruedCents;
        acc.collected += r.collectedCents;
        acc.gap += r.gapCents;
        return acc;
      },
      { accrued: 0, collected: 0, gap: 0 },
    );
  }, [rows]);

  const trendMonths = useMemo(() => allMonths.slice(0, 12).reverse(), [allMonths]);
  const trendRows = useMemo(() => trendByCarrier(product, trendMonths), [product, trendMonths]);

  const orgs = ORGS.filter((o) => o.product === product);
  const distinctCarriers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of INDIVIDUALS.filter((x) => x.product === product)) {
      const c = carrierForIndividual(i.id);
      if (c) seen.set(c.id, c.carrier_name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [product]);

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }

  function handleAggregateExport() {
    if (role === "read-only") { toast.error("Export requires ops or admin role"); return; }
    toast.success(`Exported ${rows.length} carrier rollups for ${monthLabel(month)}.`, {
      description: "Aggregate export — logged as action='export'.",
    });
  }

  function handleDrillExport(reason: string) {
    if (!drillCarrier) return;
    writePhiAudit({
      table_name: "individuals",
      record_id: `carrier_remittance:${drillCarrier.carrier.id}:${month}`,
      action: "export_phi",
      actor_id: "current_user",
      actor_name: role === "admin" ? "Admin (you)" : "User (you)",
      new_values: {
        individual_id: "bulk",
        individual_name: `${drillCarrier.carrier.carrier_name} contributions for ${monthLabel(month)}`,
        reason,
        fields_viewed: ["billing_group", "org_name", "accrued", "collected"],
      },
    });
    toast.success(`Exported ${drillCarrier.carrier.carrier_name} drill (CSV). Access logged.`);
    setGateOpen(false);
  }

  return (
    <div>
      <BackLink />
      <PageHeader
        title="Carrier Premium Remittance"
        subtitle={
          <span>
            <span className="text-black/60">Financial (Accounting)</span> · Premium owed to each carrier per month, accrual basis. Employee + employer premium, net of the TPA fee.
          </span>
        }
      />

      {/* Filter bar */}
      <div className="bg-white border border-black/10 rounded-md p-3 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Parameters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Billing cycle month">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              {allMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Carrier">
            <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All carriers ({product})</option>
              {distinctCarriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Organization">
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All organizations</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <SummaryCard label="Total Accrued (owed)" value={fmt(totals.accrued)} hint="Premium events, status in (successful, failed, pending). Excludes reversed." />
        <SummaryCard label="Total Collected" value={fmt(totals.collected)} hint="Subset where status = successful." />
        <SummaryCard
          label="Collection Gap"
          value={fmt(totals.gap)}
          tone={totals.gap > 0 ? "amber" : "neutral"}
          hint="Accrued minus collected (failed + pending premium)."
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-2">
        <div className="inline-flex bg-white border border-black/10 rounded-md p-0.5">
          <button
            onClick={() => setTab("month")}
            className={`px-3 py-1 text-xs rounded ${tab === "month" ? "bg-[#0a3d3e] text-white" : "text-black/70 hover:bg-black/5"}`}
          >Selected month</button>
          <button
            onClick={() => setTab("trend")}
            className={`px-3 py-1 text-xs rounded ${tab === "trend" ? "bg-[#0a3d3e] text-white" : "text-black/70 hover:bg-black/5"}`}
          >Trend (last 12)</button>
        </div>
        <div className="ml-auto">
          <Btn variant="secondary" onClick={handleAggregateExport}>
            <Download className="h-3 w-3" /> Export CSV (rollup)
          </Btn>
        </div>
      </div>

      {tab === "month" ? (
        <TableShell>
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>
              <th className="text-left font-medium px-3 py-2 w-6"></th>
              <th className="text-left font-medium px-3 py-2">Carrier</th>
              <th className="text-left font-medium px-3 py-2">Policies</th>
              <th className="text-right font-medium px-3 py-2">Accrued</th>
              <th className="text-center font-medium px-3 py-2 text-black/40">(−)</th>
              <th className="text-right font-medium px-3 py-2">Collected</th>
              <th className="text-center font-medium px-3 py-2 text-black/40">=</th>
              <th className="text-right font-medium px-3 py-2">Gap</th>
              <th className="text-left font-medium px-3 py-2">Billing Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = expanded.has(r.carrier.id);
              const showSplit = product === "DI";
              return (
                <Fragment key={r.carrier.id}>
                  <TRow onClick={() => setDrillCarrier(r)}>
                    <TCell onClick={(e) => { e.stopPropagation(); if (showSplit) toggleExpand(r.carrier.id); }}>
                      {showSplit ? (
                        <button className="text-black/40 hover:text-black/70">
                          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      ) : null}
                    </TCell>
                    <TCell className="font-medium">{r.carrier.carrier_name}</TCell>
                    <TCell className="text-black/70">{r.policies}</TCell>
                    <TCell className="font-mono text-right">{fmt(r.accruedCents)}</TCell>
                    <TCell className="text-black/30 text-center">−</TCell>
                    <TCell className="font-mono text-right">{fmt(r.collectedCents)}</TCell>
                    <TCell className="text-black/30 text-center">=</TCell>
                    <TCell className={`font-mono text-right font-semibold ${r.gapCents > 0 ? "text-amber-700" : "text-black/60"}`}>
                      {fmt(r.gapCents)}
                    </TCell>
                    <TCell className="font-mono text-[11px] text-black/60">{r.carrier.billing_email}</TCell>
                  </TRow>
                  {showSplit && isOpen && (
                    <>
                      <tr className="border-t border-black/5 bg-[#faf7ef]/60">
                        <td></td>
                        <td className="px-3 py-1.5 text-[11px] text-black/60 pl-8">STD+LTD</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt(r.stdltdAccrued ?? 0)}</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt(r.stdltdCollected ?? 0)}</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt((r.stdltdAccrued ?? 0) - (r.stdltdCollected ?? 0))}</td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-black/5 bg-[#faf7ef]/60">
                        <td></td>
                        <td className="px-3 py-1.5 text-[11px] text-black/60 pl-8">LTD only</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt(r.ltdAccrued ?? 0)}</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt(r.ltdCollected ?? 0)}</td>
                        <td></td>
                        <td className="px-3 py-1.5 font-mono text-right text-[11px]">{fmt((r.ltdAccrued ?? 0) - (r.ltdCollected ?? 0))}</td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </FragmentWithKey>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-black/40 text-xs">No carrier premium activity for {monthLabel(month)}.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-[#f7f3eb]/60 border-t-2 border-black/10 text-[11px]">
              <tr>
                <td></td>
                <td className="px-3 py-2 font-semibold" colSpan={2}>Totals · {rows.length} carriers</td>
                <td className="px-3 py-2 font-mono font-semibold text-right">{fmt(totals.accrued)}</td>
                <td></td>
                <td className="px-3 py-2 font-mono font-semibold text-right">{fmt(totals.collected)}</td>
                <td></td>
                <td className={`px-3 py-2 font-mono font-semibold text-right ${totals.gap > 0 ? "text-amber-700" : ""}`}>{fmt(totals.gap)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </TableShell>
      ) : (
        <TableShell>
          <THead cols={["Carrier", ...trendMonths.map(monthLabel)]} />
          <tbody>
            {trendRows.map((tr) => (
              <TRow key={tr.carrier.id}>
                <TCell className="font-medium">{tr.carrier.carrier_name}</TCell>
                {trendMonths.map((m) => (
                  <TCell key={m} className="font-mono text-right">
                    {tr.cells[m] ? fmt(tr.cells[m]) : <span className="text-black/30">—</span>}
                  </TCell>
                ))}
              </TRow>
            ))}
            {trendRows.length === 0 && (
              <tr><td colSpan={trendMonths.length + 1} className="px-3 py-8 text-center text-black/40 text-xs">No premium activity in trend window.</td></tr>
            )}
          </tbody>
        </TableShell>
      )}

      <div className="mt-3 text-[11px] text-black/40 italic">
        Reversed premium excluded from Accrued. TPA fees and refund events never enter remittance totals. Wireframe binding; production pulls from payment_ledger joined to carriers via individuals → policies → carrier_products.
      </div>

      {/* Drawer */}
      <Drawer open={!!drillCarrier} onClose={() => setDrillCarrier(null)} title={drillCarrier ? `${drillCarrier.carrier.carrier_name} · ${monthLabel(month)}` : ""}>
        {drillCarrier && (
          <CarrierDrillContent
            row={drillCarrier}
            month={month}
            product={product}
            onExport={() => setGateOpen(true)}
          />
        )}
      </Drawer>

      {gateOpen && drillCarrier && (
        <ExportGateModal
          count={contributionsForCarrier(product, drillCarrier.carrier.id, month).length}
          subject={`${drillCarrier.carrier.carrier_name} billing-group breakdown for ${monthLabel(month)}`}
          onCancel={() => setGateOpen(false)}
          onConfirm={handleDrillExport}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "amber" }) {
  return (
    <Card className={`p-3 ${tone === "amber" ? "border-amber-300 bg-amber-50/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-black/50">{label}</div>
      <div className={`text-xl font-semibold font-mono mt-1 ${tone === "amber" ? "text-amber-800" : ""}`}>{value}</div>
      {hint ? <div className="text-[11px] text-black/40 mt-1 leading-snug">{hint}</div> : null}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">{label}</div>
      {children}
    </div>
  );
}

function CarrierDrillContent({ row, month, product, onExport }: { row: RemittanceRow; month: string; product: Product; onExport: () => void }) {
  const rows = useMemo(() => contributionsForCarrier(product, row.carrier.id, month), [row, month, product]);
  return (
    <div>
      <div className="mb-3 text-xs text-black/60">
        Contributing billing groups for {monthLabel(month)}. Read-only.
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="p-2"><div className="text-[10px] uppercase text-black/50">Accrued</div><div className="font-mono text-sm">{fmt(row.accruedCents)}</div></Card>
        <Card className="p-2"><div className="text-[10px] uppercase text-black/50">Collected</div><div className="font-mono text-sm">{fmt(row.collectedCents)}</div></Card>
        <Card className={`p-2 ${row.gapCents > 0 ? "border-amber-300 bg-amber-50/40" : ""}`}><div className="text-[10px] uppercase text-black/50">Gap</div><div className={`font-mono text-sm ${row.gapCents > 0 ? "text-amber-800" : ""}`}>{fmt(row.gapCents)}</div></Card>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>
              <th className="text-left font-medium px-3 py-2">Billing Group</th>
              <th className="text-left font-medium px-3 py-2">Org</th>
              <th className="text-right font-medium px-3 py-2">Accrued</th>
              <th className="text-right font-medium px-3 py-2">Collected</th>
              <th className="text-left font-medium px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-black/40">No contributing groups.</td></tr>}
            {rows.map((c) => (
              <tr key={c.billingGroupId} className="border-t border-black/5">
                <td className="px-3 py-1.5">{c.billingGroupLabel}</td>
                <td className="px-3 py-1.5 text-black/70">{c.orgName}</td>
                <td className="px-3 py-1.5 font-mono text-right">{fmt(c.accruedCents)}</td>
                <td className="px-3 py-1.5 font-mono text-right">{fmt(c.collectedCents)}</td>
                <td className="px-3 py-1.5">
                  <Pill tone={c.status === "successful" ? "ok" : c.status === "failed" ? "bad" : "warn"}>{c.status}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <Link to="/payment-ledger" className="text-[#0a3d3e] hover:underline inline-flex items-center gap-1">
          View in Payment Ledger <ExternalLink className="h-3 w-3" />
        </Link>
        <button onClick={onExport} className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border border-black/15 text-xs hover:bg-black/5">
          <Download className="h-3 w-3" /> Export drill (CSV)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BUILD 3 — Monthly Balances (pivot)
// ─────────────────────────────────────────────────────────────────────────

type MonthlyDelta = {
  charges: number;
  paid: number;
  adjustments: number;
  net: number;
};

function deltasForIndividual(individualId: string, months: string[]): Record<string, MonthlyDelta> {
  const out: Record<string, MonthlyDelta> = {};
  for (const m of months) out[m] = { charges: 0, paid: 0, adjustments: 0, net: 0 };
  for (const p of PAYMENT_LEDGER) {
    if (p.enrollment_id !== individualId) continue;
    if (p.funding_source !== "employee_account") continue;
    if (p.event_type !== "premium" && p.event_type !== "fee") continue;
    const m = p.billing_cycle_month;
    if (!out[m]) continue;
    out[m].charges += p.amount_cents;
    if (p.status === "successful") out[m].paid += p.amount_cents;
  }
  for (const a of ACCOUNT_ADJUSTMENTS) {
    if (a.individual_id !== individualId) continue;
    const m = a.effective_date.slice(0, 7);
    if (!out[m]) continue;
    out[m].adjustments += a.amount_cents;
  }
  for (const m of months) {
    const d = out[m];
    d.net = d.charges - d.paid + d.adjustments;
  }
  return out;
}

function listMonthsInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export function MonthlyBalancesReport() {
  const { product, role } = useStore();
  const [orgFilter, setOrgFilter] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "owes" | "credit" | "current">("all");
  const [fromMonth, setFromMonth] = useState("2025-01");
  const [toMonth, setToMonth] = useState("2025-06");
  const [drillCell, setDrillCell] = useState<{ name: string; email: string; month: string; delta: MonthlyDelta; individualId: string } | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  const months = useMemo(() => listMonthsInRange(fromMonth, toMonth), [fromMonth, toMonth]);

  const orgs = ORGS.filter((o) => o.product === product);

  const rows = useMemo(() => {
    const inds = INDIVIDUALS.filter((i) => i.product === product);
    return inds
      .filter((i) => orgFilter === "all" || i.organization_id === orgFilter)
      .filter((i) => statusFilter === "all" || i.coverage_status === statusFilter)
      .map((i) => {
        const deltas = deltasForIndividual(i.id, months);
        const cumulative = months.reduce((s, m) => s + deltas[m].net, 0);
        return { i, deltas, cumulative };
      })
      .filter((r) => {
        if (balanceFilter === "owes") return r.cumulative > 0;
        if (balanceFilter === "credit") return r.cumulative < 0;
        if (balanceFilter === "current") return r.cumulative === 0;
        return true;
      });
  }, [product, orgFilter, statusFilter, balanceFilter, months]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const m of months) totals[m] = 0;
    let cum = 0;
    for (const r of rows) {
      for (const m of months) totals[m] += r.deltas[m].net;
      cum += r.cumulative;
    }
    return { byMonth: totals, cumulative: cum };
  }, [rows, months]);

  function handleExport(reason: string) {
    writePhiAudit({
      table_name: "individuals",
      record_id: `monthly_balances:bulk:${fromMonth}_${toMonth}`,
      action: "export_phi",
      actor_id: "current_user",
      actor_name: role === "admin" ? "Admin (you)" : "User (you)",
      new_values: {
        individual_id: "bulk",
        individual_name: `${rows.length} enrollees · ${monthLabel(fromMonth)} – ${monthLabel(toMonth)}`,
        reason,
        fields_viewed: ["email", "monthly_net_balance", "cumulative_net"],
      },
    });
    toast.success(`Exported ${rows.length} enrollee monthly balances (CSV). Access logged.`);
    setGateOpen(false);
  }

  return (
    <div>
      <BackLink />
      <PageHeader
        title="Monthly Balances"
        subtitle={
          <span>
            <span className="text-black/60">Financial (Accounting)</span> · Running net balance per enrollee, structured by month. Cumulative Net for the last column reconciles to Enrollee Balance "as of" that month.
          </span>
        }
        actions={
          <Btn variant="secondary" onClick={() => setGateOpen(true)}>
            <Download className="h-3 w-3" /> Export CSV
          </Btn>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-black/10 rounded-md p-3 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Parameters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="From month">
            <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
          </Field>
          <Field label="To month">
            <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
          </Field>
          <Field label="Organization">
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All organizations</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Coverage status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="purchased">Purchased</option>
              <option value="suspended">Suspended</option>
              <option value="lapsed">Lapsed</option>
              <option value="canceled">Canceled</option>
            </select>
          </Field>
          <Field label="Balance filter">
            <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value as typeof balanceFilter)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All</option>
              <option value="owes">Owes (cumulative {">"} 0)</option>
              <option value="credit">Has credit (cumulative {"<"} 0)</option>
              <option value="current">Current ($0)</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="text-[11px] text-black/55 mb-2 flex items-center gap-1">
        <Info className="h-3 w-3" />
        Cell = monthly net delta (charges − successful payments + adjustments). Negative = credit owed to enrollee; positive = owed by enrollee. Cumulative Net = sum of cell values through the last month in range.
      </div>

      {/* Pivot */}
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>
            <th className="text-left font-medium px-3 py-2 sticky left-0 bg-[#f7f3eb] z-10">Enrollee</th>
            <th className="text-left font-medium px-3 py-2">Org</th>
            {months.map((m) => (
              <th key={m} className="text-right font-medium px-3 py-2 whitespace-nowrap">{monthLabel(m)}</th>
            ))}
            <th className="text-right font-medium px-3 py-2 border-l border-black/10">Cumulative Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <TRow key={r.i.id}>
              <TCell className="font-medium sticky left-0 bg-white">{r.i.full_name}</TCell>
              <TCell className="text-black/60">{r.i.org_name}</TCell>
              {months.map((m) => {
                const v = r.deltas[m].net;
                return (
                  <td
                    key={m}
                    onClick={() => setDrillCell({ name: r.i.full_name, email: r.i.email, month: m, delta: r.deltas[m], individualId: r.i.id })}
                    className={`px-3 py-2 font-mono text-right text-[11px] cursor-pointer hover:bg-[#f7f3eb] ${v > 0 ? "text-rose-700" : v < 0 ? "text-emerald-700" : "text-black/40"}`}
                  >
                    {v === 0 ? "—" : fmt(v, { signed: true })}
                  </td>
                );
              })}
              <td className={`px-3 py-2 font-mono text-right font-semibold border-l border-black/10 ${r.cumulative > 0 ? "text-rose-700" : r.cumulative < 0 ? "text-emerald-700" : "text-black/60"}`}>
                {fmt(r.cumulative, { signed: true })}
              </td>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={months.length + 3} className="px-3 py-8 text-center text-black/40 text-xs">No enrollees match the current filters.</td></tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="bg-[#f7f3eb]/60 border-t-2 border-black/10 text-[11px]">
            <tr>
              <td className="px-3 py-2 font-semibold sticky left-0 bg-[#f7f3eb]/80" colSpan={2}>
                Totals · {rows.length} enrollees
              </td>
              {months.map((m) => {
                const v = columnTotals.byMonth[m];
                return (
                  <td key={m} className={`px-3 py-2 font-mono font-semibold text-right ${v > 0 ? "text-rose-700" : v < 0 ? "text-emerald-700" : "text-black/60"}`}>
                    {v === 0 ? "—" : fmt(v, { signed: true })}
                  </td>
                );
              })}
              <td className={`px-3 py-2 font-mono font-semibold text-right border-l border-black/10 ${columnTotals.cumulative > 0 ? "text-rose-700" : columnTotals.cumulative < 0 ? "text-emerald-700" : "text-black/60"}`}>
                {fmt(columnTotals.cumulative, { signed: true })}
              </td>
            </tr>
          </tfoot>
        )}
      </TableShell>

      <div className="mt-3 text-[11px] text-black/40 italic">
        Reconciliation rule: Cumulative Net through month X equals Enrollee Balance "as of month X" for the same enrollee. Critical for matching Moov monthly statements.
      </div>

      <Drawer open={!!drillCell} onClose={() => setDrillCell(null)} title={drillCell ? `${drillCell.name} · ${monthLabel(drillCell.month)}` : ""}>
        {drillCell && (
          <div>
            <div className="text-xs text-black/60 mb-3">{drillCell.email}</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Card className="p-2"><div className="text-[10px] uppercase text-black/50">Charged</div><div className="font-mono text-sm">{fmt(drillCell.delta.charges)}</div></Card>
              <Card className="p-2"><div className="text-[10px] uppercase text-black/50">(−) Paid</div><div className="font-mono text-sm">{fmt(drillCell.delta.paid)}</div></Card>
              <Card className="p-2"><div className="text-[10px] uppercase text-black/50">(+) Adjustments</div><div className="font-mono text-sm">{fmt(drillCell.delta.adjustments, { signed: true })}</div></Card>
              <Card className="p-2"><div className="text-[10px] uppercase text-black/50">= Net</div><div className={`font-mono text-sm font-semibold ${drillCell.delta.net > 0 ? "text-rose-700" : drillCell.delta.net < 0 ? "text-emerald-700" : "text-black/60"}`}>{fmt(drillCell.delta.net, { signed: true })}</div></Card>
            </div>
            <SectionTitle>Ledger entries this month</SectionTitle>
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Date</th>
                    <th className="text-left font-medium px-3 py-2">Type</th>
                    <th className="text-right font-medium px-3 py-2">Amount</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYMENT_LEDGER
                    .filter((p) => p.enrollment_id === drillCell.individualId && p.billing_cycle_month === drillCell.month && p.funding_source === "employee_account" && (p.event_type === "premium" || p.event_type === "fee"))
                    .map((p) => (
                      <tr key={p.id} className="border-t border-black/5">
                        <td className="px-3 py-1.5">{p.event_date}</td>
                        <td className="px-3 py-1.5 text-black/70">{p.event_type}</td>
                        <td className="px-3 py-1.5 font-mono text-right">{fmt(p.amount_cents)}</td>
                        <td className="px-3 py-1.5"><Pill tone={p.status === "successful" ? "ok" : p.status === "failed" ? "bad" : "warn"}>{p.status}</Pill></td>
                      </tr>
                    ))}
                  {PAYMENT_LEDGER.filter((p) => p.enrollment_id === drillCell.individualId && p.billing_cycle_month === drillCell.month && p.funding_source === "employee_account" && (p.event_type === "premium" || p.event_type === "fee")).length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-black/40">No ledger entries this month.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <div className="mt-3 text-[11px]">
              <Link to="/payment-ledger" className="text-[#0a3d3e] hover:underline inline-flex items-center gap-1">
                View in Payment Ledger <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>

      {gateOpen && (
        <ExportGateModal
          count={rows.length}
          subject={`${rows.length} enrollee monthly-balance rows (${monthLabel(fromMonth)} – ${monthLabel(toMonth)})`}
          onCancel={() => setGateOpen(false)}
          onConfirm={handleExport}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared PHI export gate (mirrors enrollee-balance pattern)
// ─────────────────────────────────────────────────────────────────────────

function ExportGateModal({ count, subject, onCancel, onConfirm }: { count: number; subject: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const tooLarge = count > 10000;
  const ok = !tooLarge && reason.trim().length >= 10 && ack;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-md shadow-xl w-full max-w-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-amber-700" />
          <div className="font-medium text-sm">Export contains PHI-adjacent data</div>
        </div>
        <p className="text-sm text-black/70 mb-3">
          You are exporting <span className="font-medium">{subject}</span>, including enrollee identifiers and balance amounts. This export will be logged in the audit trail with your name, timestamp, and reason.
        </p>
        {tooLarge && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded p-2 mb-3">
            Sets over 10,000 rows must be exported via Reports.
          </div>
        )}
        <label className="block text-[11px] uppercase tracking-wider text-black/50 mb-1">Reason for export (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full text-sm border border-black/15 rounded p-2 mb-1"
          placeholder="e.g., Monthly carrier remittance reconciliation, July billing run."
        />
        <div className="text-[11px] text-black/50 mb-3">Minimum 10 characters. {reason.trim().length}/10</div>
        <label className="flex items-start gap-2 text-xs text-black/70 mb-4">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
          <span>I acknowledge this export is logged in the audit trail.</span>
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={!ok} onClick={() => onConfirm(reason.trim())}>Export CSV</Btn>
        </div>
      </div>
    </div>
  );
}

// Unused-suppression placeholders kept so headers/THead remain usable above.
void THead; void BILLING_GROUPS;
