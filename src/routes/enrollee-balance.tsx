import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Info, Download, ExternalLink, Lock } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Card, SectionTitle, Pill, Btn, Drawer,
} from "@/components/wireframe/Bits";
import {
  INDIVIDUALS, ORGS, BILLING_GROUPS, PAYMENT_LEDGER, ACCOUNT_ADJUSTMENTS, formatCents,
} from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import {
  FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort,
} from "@/components/wireframe/Filters";
import { writePhiAudit } from "@/lib/wireframe/phi-audit";

export const Route = createFileRoute("/enrollee-balance")({ component: View });

type SortKey = "name" | "email" | "status" | "billing" | "charges" | "paid" | "adjusted" | "balance";

// Render dollars guarding -0 → $0.00; signed=true shows leading "−" for negatives.
function fmt(cents: number, opts: { signed?: boolean } = {}): string {
  const c = Object.is(cents, -0) ? 0 : cents;
  if (c === 0) return "$0.00";
  if (opts.signed && c < 0) return `−${formatCents(Math.abs(c))}`;
  return formatCents(Math.abs(c));
}

function coverageTone(status: string): "ok" | "warn" | "bad" | "neutral" {
  if (status === "active" || status === "purchased") return "ok";
  if (status === "in_progress" || status === "not_started" || status === "pending") return "warn";
  if (status === "suspended" || status === "lapsed" || status === "terminated") return "bad";
  return "neutral"; // canceled, others
}
const COVERAGE_LABEL: Record<string, string> = {
  active: "Active", purchased: "Purchased", in_progress: "In Progress",
  not_started: "Not Started", suspended: "Suspended", lapsed: "Lapsed",
  canceled: "Canceled", terminated: "Terminated", pending: "Pending",
};

// Canonical computation per locked spec (2026-06-16).
// In production this is a SQL VIEW; here we derive from the dummy ledger.
type Row = {
  i: typeof INDIVIDUALS[number];
  bg: ReturnType<typeof BILLING_GROUPS["find"]>;
  name: string;
  email: string;
  status: string;
  billing: string;
  charges: number;
  paid: number;
  adjusted: number;
  balance: number;
  employerExcluded: number;
  premiumCharges: number;
  feeCharges: number;
};

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeBalances(inds: typeof INDIVIDUALS, asOfMonth: string | null): Row[] {
  const monthBound = asOfMonth; // YYYY-MM or null for live
  const adjBound = asOfMonth ? lastDayOfMonth(asOfMonth) : null;
  return inds.map((i) => {
    const bg = BILLING_GROUPS.find((b) => b.id === i.billing_group_id);
    const ledger = PAYMENT_LEDGER.filter((p) => {
      if (p.enrollment_id !== i.id) return false;
      if (monthBound && p.billing_cycle_month > monthBound) return false;
      return true;
    });
    // Total Charges: event_type IN ('premium','fee'), funding_source='employee_account', all statuses
    const chargeRows = ledger.filter(
      (p) => (p.event_type === "premium" || p.event_type === "fee") && p.funding_source === "employee_account",
    );
    const charges = chargeRows.reduce((s, p) => s + p.amount_cents, 0);
    const premiumCharges = chargeRows.filter((p) => p.event_type === "premium").reduce((s, p) => s + p.amount_cents, 0);
    const feeCharges = chargeRows.filter((p) => p.event_type === "fee").reduce((s, p) => s + p.amount_cents, 0);
    // Successful Payments: subset of charges with status='successful'
    const paid = chargeRows.filter((p) => p.status === "successful").reduce((s, p) => s + p.amount_cents, 0);
    // Adjustments: signed sum, bounded by effective_date when as-of is active
    const adjusted = ACCOUNT_ADJUSTMENTS
      .filter((a) => a.individual_id === i.id)
      .filter((a) => !adjBound || a.effective_date <= adjBound)
      .reduce((s, a) => s + a.amount_cents, 0);
    // Employer-paid charges (excluded — surfaced for the drawer caption)
    const employerExcluded = ledger
      .filter((p) => (p.event_type === "premium" || p.event_type === "fee") && p.funding_source === "employer_account")
      .reduce((s, p) => s + p.amount_cents, 0);
    const balance = charges - paid + adjusted;
    return {
      i, bg,
      name: i.full_name,
      email: i.email,
      status: i.coverage_status,
      billing: bg?.payment_method_display_label ?? "—",
      charges, paid, adjusted, balance, employerExcluded, premiumCharges, feeCharges,
    };
  });
}

function monthOptions(): string[] {
  const months = new Set<string>();
  for (const p of PAYMENT_LEDGER) months.add(p.billing_cycle_month);
  return Array.from(months).sort().reverse();
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

function View() {
  const { product, role } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [balStatus, setBalStatus] = useState("all");
  const [covStatus, setCovStatus] = useState("all");
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [asOfMonth, setAsOfMonth] = useState<string>("current");
  const sort = useSort<SortKey>("balance", "asc");

  const months = useMemo(() => monthOptions(), []);
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const inds = INDIVIDUALS.filter((i) => i.product === product);
  const computed = useMemo(
    () => computeBalances(inds, asOfMonth === "current" ? null : asOfMonth),
    [inds, asOfMonth],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const f = computed.filter((r) => {
      if (s && !(
        r.name.toLowerCase().includes(s)
        || r.email.toLowerCase().includes(s)
        || r.billing.toLowerCase().includes(s)
      )) return false;
      if (org !== "all" && r.i.organization_id !== org) return false;
      if (covStatus !== "all" && r.status !== covStatus) return false;
      if (balStatus !== "all") {
        if (balStatus === "owes" && !(r.balance > 0)) return false;
        if (balStatus === "credit" && !(r.balance < 0)) return false;
        if (balStatus === "current" && r.balance !== 0) return false;
        if (balStatus === "owes_gt_100" && !(r.balance > 10000)) return false;
      }
      return true;
    });
    return sort.applySort(f, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [computed, search, org, balStatus, covStatus, sort]);

  const totals = useMemo(() => {
    const t = filtered.reduce((acc, r) => {
      acc.charges += r.charges; acc.paid += r.paid; acc.adjusted += r.adjusted; acc.balance += r.balance;
      if (r.balance > 0) acc.owe += 1;
      else if (r.balance < 0) acc.credit += 1;
      else acc.current += 1;
      return acc;
    }, { charges: 0, paid: 0, adjusted: 0, balance: 0, owe: 0, credit: 0, current: 0 });
    return t;
  }, [filtered]);

  const active = search !== "" || org !== "all" || balStatus !== "all" || covStatus !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setBalStatus("all"); setCovStatus("all"); sort.reset(); };

  const example = filtered[0] ?? computed[0];

  const onConfirmExport = (reason: string) => {
    if (filtered.length > 10000) {
      toast.error("Set exceeds 10k rows — please export via Reports section.");
      setGateOpen(false);
      return;
    }
    writePhiAudit({
      table_name: "individuals",
      record_id: "enrollee_balance:bulk_export",
      action: "export_phi",
      actor_id: "current_user",
      actor_name: role === "admin" ? "Admin (you)" : "User (you)",
      new_values: {
        individual_id: "bulk",
        individual_name: `${filtered.length} enrollees`,
        reason,
        fields_viewed: ["email", "balance", "billing_group"],
      },
    });
    toast.success(`Exported ${filtered.length} enrollee balances (CSV). Access logged.`);
    setGateOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Enrollee Balance
            <span
              title="This view recomputes on every page load. No snapshot."
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </span>
        }
        subtitle={
          <div className="space-y-0.5">
            <div>{filtered.length} of {computed.length} enrollees</div>
            <div className="flex items-center gap-1.5">
              <span>Net Balance = Total Charges − Successful Payments + Adjustments. Live computation (no cache).</span>
              <span
                className="inline-flex items-center cursor-help text-black/40 hover:text-black/70"
                title="Adjustments are signed: negative = credit to enrollee (refund, write-off), positive = additional charge (penalty, correction). Employer-paid charges and refund events are excluded from this view; see Reports → Employer Receivables for those."
              >
                <Info className="h-3 w-3" />
              </span>
            </div>
            <div className="text-black/40 italic">Showing per-individual balances. Per-group view coming.</div>
          </div>
        }
        actions={
          <Btn variant="secondary" onClick={() => setGateOpen(true)}>
            <Download className="h-3 w-3" /> Export CSV
          </Btn>
        }
      />

      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          Worked example (first row)
          <span
            className="text-black/40 hover:text-black/70 cursor-help"
            title="This example uses the first row in the table below. Click any row to see its own worked breakdown."
          >
            <Info className="h-3 w-3" />
          </span>
        </span>
      </SectionTitle>
      {example && (
        <Card className="p-4 grid grid-cols-4 text-sm gap-2">
          <div>
            <div className="text-[10px] uppercase text-black/50">Total Charged</div>
            <div className="font-mono">{fmt(example.charges)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-black/50">(−) Successful Payments</div>
            <div className="font-mono">{fmt(example.paid)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-black/50">(+) Adjustments</div>
            <div className="font-mono">{fmt(example.adjusted, { signed: true })}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-black/50">= Net Balance</div>
            <div className={`font-mono font-semibold ${example.balance > 0 ? "text-rose-700" : example.balance < 0 ? "text-emerald-700" : "text-black/60"}`}>
              {fmt(example.balance, { signed: true })}
            </div>
          </div>
        </Card>
      )}

      <SectionTitle>Per-individual balance</SectionTitle>
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search by name, email, or billing group label…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={covStatus} onChange={setCovStatus} allLabel="All statuses" options={[
          { value: "active", label: "Active" },
          { value: "purchased", label: "Purchased" },
          { value: "in_progress", label: "In Progress" },
          { value: "suspended", label: "Suspended" },
          { value: "lapsed", label: "Lapsed" },
          { value: "canceled", label: "Canceled" },
        ]} />
        <FilterSelect value={balStatus} onChange={setBalStatus} allLabel="All balances" options={[
          { value: "owes", label: "Owes (> $0)" },
          { value: "credit", label: "Has credit (< $0)" },
          { value: "current", label: "Current ($0.00)" },
          { value: "owes_gt_100", label: "Owes > $100" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Individual" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "billing", label: "Billing Group" },
            { key: "charges", label: "Total Charged" },
            { key: "paid", label: "(−) Payments" },
            { key: "adjusted", label: "(+) Adjustments" },
            { key: "balance", label: "Net Balance" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((r) => (
            <TRow key={r.i.id} onClick={() => setOpenRow(r)}>
              <TCell className="font-medium">{r.name}</TCell>
              <TCell className="text-black/60">{r.email}</TCell>
              <TCell>
                <Pill tone={coverageTone(r.status)}>{COVERAGE_LABEL[r.status] ?? r.status}</Pill>
              </TCell>
              <TCell className="text-black/70">
                {r.bg ? (
                  <span className="inline-flex items-center gap-1">
                    {r.billing}
                    <ExternalLink className="h-3 w-3 text-black/40" />
                  </span>
                ) : "—"}
              </TCell>
              <TCell className="font-mono">{fmt(r.charges)}</TCell>
              <TCell className="font-mono">{fmt(r.paid)}</TCell>
              <TCell className="font-mono">{fmt(r.adjusted, { signed: true })}</TCell>
              <TCell className={`font-mono font-semibold ${r.balance > 0 ? "text-rose-700" : r.balance < 0 ? "text-emerald-700" : "text-black/60"}`}>
                {fmt(r.balance, { signed: true })}
              </TCell>
            </TRow>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-black/40 text-xs">No enrollees match the current filters.</td></tr>
          )}
        </tbody>
        {filtered.length > 0 && (
          <tfoot className="bg-[#f7f3eb]/60 border-t-2 border-black/10 text-[11px]">
            <tr>
              <td className="px-3 py-2 font-semibold" colSpan={4}>
                Totals · {filtered.length} enrollees · {totals.owe} owe · {totals.current} current · {totals.credit} have credit
              </td>
              <td className="px-3 py-2 font-mono font-semibold">{fmt(totals.charges)}</td>
              <td className="px-3 py-2 font-mono font-semibold">{fmt(totals.paid)}</td>
              <td className="px-3 py-2 font-mono font-semibold">{fmt(totals.adjusted, { signed: true })}</td>
              <td className={`px-3 py-2 font-mono font-semibold ${totals.balance > 0 ? "text-rose-700" : totals.balance < 0 ? "text-emerald-700" : "text-black/60"}`}>
                {fmt(totals.balance, { signed: true })}
              </td>
            </tr>
          </tfoot>
        )}
      </TableShell>

      <BalanceDrawer row={openRow} onClose={() => setOpenRow(null)} />

      {gateOpen && (
        <ExportGateModal
          count={filtered.length}
          onCancel={() => setGateOpen(false)}
          onConfirm={onConfirmExport}
        />
      )}
    </div>
  );
}

function BalanceDrawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const open = !!row;
  if (!row) return <Drawer open={open} onClose={onClose} title="Enrollee Balance">{null}</Drawer>;

  const org = ORGS.find((o) => o.id === row.i.organization_id);
  const ledgerRows = PAYMENT_LEDGER
    .filter((p) => p.enrollment_id === row.i.id && p.funding_source === "employee_account" && (p.event_type === "premium" || p.event_type === "fee"))
    .slice(0, 10);
  const adjustments = ACCOUNT_ADJUSTMENTS.filter((a) => a.individual_id === row.i.id);

  return (
    <Drawer open={open} onClose={onClose} title={`Balance · ${row.name}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="text-base font-semibold">{row.name}</div>
        <div className="text-xs text-black/60">{row.email}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Pill tone={coverageTone(row.status)}>{COVERAGE_LABEL[row.status] ?? row.status}</Pill>
          {row.bg && (
            <span className="text-[11px] text-black/60 inline-flex items-center gap-1">
              <span className="text-black/40">Billing Group:</span>
              <Link to="/billing-groups" className="text-[#0a3d3e] hover:underline inline-flex items-center gap-0.5">
                {row.billing} <ExternalLink className="h-3 w-3" />
              </Link>
            </span>
          )}
          {org && (
            <span className="text-[11px] text-black/60 inline-flex items-center gap-1">
              <span className="text-black/40">Org:</span>
              <Link to="/organizations/$id" params={{ id: org.id }} className="text-[#0a3d3e] hover:underline inline-flex items-center gap-0.5">
                {org.name} <ExternalLink className="h-3 w-3" />
              </Link>
            </span>
          )}
        </div>
        <div className="text-[10px] text-black/40 mt-1">Computed live · {new Date().toLocaleString()}</div>
      </div>

      {/* Worked breakdown */}
      <div className="grid grid-cols-4 gap-2 mb-1">
        <Card className="p-2">
          <div className="text-[10px] uppercase text-black/50">Total Charged</div>
          <div className="font-mono text-sm">{fmt(row.charges)}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[10px] uppercase text-black/50">(−) Successful Payments</div>
          <div className="font-mono text-sm">{fmt(row.paid)}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[10px] uppercase text-black/50">(+) Adjustments</div>
          <div className="font-mono text-sm">{fmt(row.adjusted, { signed: true })}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[10px] uppercase text-black/50">= Net Balance</div>
          <div className={`font-mono text-sm font-semibold ${row.balance > 0 ? "text-rose-700" : row.balance < 0 ? "text-emerald-700" : "text-black/60"}`}>
            {fmt(row.balance, { signed: true })}
          </div>
        </Card>
      </div>
      {row.employerExcluded > 0 && (
        <div className="text-[11px] text-black/50 italic mb-4">
          Excludes {fmt(row.employerExcluded)} in employer-paid charges. See Reports → Employer Receivables.
        </div>
      )}

      {/* Charge breakdown */}
      <SectionTitle>Charge breakdown</SectionTitle>
      <Card className="p-3 text-xs">
        <div className="flex justify-between py-1"><span className="text-black/60">Premium charges</span><span className="font-mono">{fmt(row.premiumCharges)}</span></div>
        <div className="flex justify-between py-1"><span className="text-black/60">Fee charges</span><span className="font-mono">{fmt(row.feeCharges)}</span></div>
        <div className="flex justify-between py-1 border-t border-black/10 mt-1 pt-2 font-semibold"><span>Subtotal</span><span className="font-mono">{fmt(row.charges)}</span></div>
      </Card>

      {/* Recent ledger */}
      <SectionTitle>Recent ledger entries</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>
              <th className="text-left font-medium px-3 py-2">Date</th>
              <th className="text-left font-medium px-3 py-2">Type</th>
              <th className="text-left font-medium px-3 py-2">Amount</th>
              <th className="text-left font-medium px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-black/40">No ledger entries.</td></tr>
            )}
            {ledgerRows.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="px-3 py-1.5">{p.event_date}</td>
                <td className="px-3 py-1.5 text-black/70">{p.event_type === "premium" ? "Premium" : "Fee"}</td>
                <td className="px-3 py-1.5 font-mono">{fmt(p.amount_cents)}</td>
                <td className="px-3 py-1.5">
                  <Pill tone={p.status === "successful" ? "ok" : p.status === "failed" ? "bad" : "warn"}>
                    {p.status}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-1 text-[11px]">
        <Link to="/payment-ledger" className="text-[#0a3d3e] hover:underline">View full ledger →</Link>
      </div>

      {/* Recent adjustments */}
      <SectionTitle>Recent adjustments</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>
              <th className="text-left font-medium px-3 py-2">Effective</th>
              <th className="text-left font-medium px-3 py-2">Type</th>
              <th className="text-left font-medium px-3 py-2">Amount</th>
              <th className="text-left font-medium px-3 py-2">Reason</th>
              <th className="text-left font-medium px-3 py-2">Approved By</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-black/40">No adjustments.</td></tr>
            )}
            {adjustments.map((a) => (
              <tr key={a.id} className="border-t border-black/5">
                <td className="px-3 py-1.5">{a.effective_date}</td>
                <td className="px-3 py-1.5 text-black/70">{a.adjustment_type}</td>
                <td className={`px-3 py-1.5 font-mono ${a.amount_cents > 0 ? "text-rose-700" : a.amount_cents < 0 ? "text-emerald-700" : "text-black/60"}`}>
                  {fmt(a.amount_cents, { signed: true })}
                </td>
                <td className="px-3 py-1.5 truncate max-w-[200px]" title={a.reason}>{a.reason}</td>
                <td className="px-3 py-1.5 text-black/60">{a.approved_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-1 text-[11px]">
        <Link to="/account-adjustments" className="text-[#0a3d3e] hover:underline">View all adjustments →</Link>
      </div>
    </Drawer>
  );
}

function ExportGateModal({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (reason: string) => void }) {
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
          You are exporting <span className="font-medium">{count} enrollee balance records</span>, including email addresses and outstanding balance amounts. This export will be logged in the audit trail with your name, timestamp, and reason.
        </p>
        {tooLarge && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded p-2 mb-3">
            Sets over 10,000 rows must be exported via Reports → Enrollee Balance.
          </div>
        )}
        <label className="block text-[11px] uppercase tracking-wider text-black/50 mb-1">Reason for export (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full text-sm border border-black/15 rounded p-2 mb-1"
          placeholder="e.g., Monthly Moov reconciliation against July billing run."
        />
        <div className="text-[11px] text-black/50 mb-3">
          Minimum 10 characters. {reason.trim().length}/10
        </div>
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
