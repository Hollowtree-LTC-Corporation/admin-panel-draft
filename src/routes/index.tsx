import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, DollarSign, Percent } from "lucide-react";
import { Card, Stat, PageHeader, Pill, TableShell, THead, TRow, TCell } from "@/components/wireframe/Bits";
import { useStore } from "@/lib/wireframe/store";
import { INDIVIDUALS, ORGS, STAGES, COVERAGE_STATUSES, formatCents } from "@/lib/wireframe/data";

export const Route = createFileRoute("/")({ component: Dashboard });

// Synthesized for wireframe only — schema has organizations.eligible_lives but
// the dummy ORGS data does not populate it.
const eligibleLivesFor = (individuals_count: number) => individuals_count * 2 + 5;

const COVERAGE_COLOR: Record<(typeof COVERAGE_STATUSES)[number], string> = {
  active: "bg-emerald-500",
  in_progress: "bg-sky-500",
  purchased: "bg-teal-500",
  not_started: "bg-slate-400",
  suspended: "bg-amber-500",
  canceled: "bg-rose-500",
  lapsed: "bg-rose-800",
};

// Per spec: one closing, one closed, rest open.
const windowStatusFor = (orgId: string): { label: string; tone: "ok" | "warn" | "bad" | "neutral" } => {
  if (orgId === "org_6") return { label: "Closing in 5 days", tone: "warn" };
  if (orgId === "org_4") return { label: "Closed", tone: "bad" };
  return { label: "Open", tone: "ok" };
};

function Dashboard() {
  const { product } = useStore();
  const navigate = useNavigate();
  const [orgFilter, setOrgFilter] = useState<string>("all");

  const productOrgs = ORGS.filter((o) => o.product === product);
  const allInds = INDIVIDUALS.filter((i) => i.product === product);
  const inds = orgFilter === "all" ? allInds : allInds.filter((i) => i.org_id === orgFilter);

  const coverageCounts = COVERAGE_STATUSES.map((s) => ({
    status: s,
    n: inds.filter((i) => i.coverage_status === s).length,
  }));

  const enrolledLives = inds.filter((i) => ["active", "purchased", "in_progress"].includes(i.coverage_status)).length;
  const activePremium = inds.filter((i) => i.coverage_status === "active").reduce((sum, i) => sum + i.monthly_premium_cents, 0);
  const numOrgs = new Set(inds.map((i) => i.org_id)).size;

  // DI funnel stages (Airtable-aligned). LTC keeps the legacy microsite stages.
  const DI_FUNNEL_STAGES = [
    "Choosing a Plan",
    "Plan Selected - Confirming Information",
    "At Checkout",
    "Adding Payment Method",
    "Payment Method Added - Purchase Completed",
  ] as const;
  type DiBucket = (typeof DI_FUNNEL_STAGES)[number] | "canceled" | "test" | "transitioning";
  const diBucketFor = (ind: (typeof inds)[number], idx: number): DiBucket => {
    if (ind.coverage_status === "canceled") return "canceled";
    if (idx % 17 === 3) return "test";
    if (idx % 19 === 5) return "transitioning";
    switch (ind.stage) {
      case "invited":
      case "education":
      case "selecting_plan":
        return "Choosing a Plan";
      case "medical_questions":
        // DI is Guaranteed Issue — fold this legacy bucket into the prior step.
        return "Plan Selected - Confirming Information";
      case "checkout":
        return idx % 2 === 0 ? "At Checkout" : "Adding Payment Method";
      case "completed":
        return "Payment Method Added - Purchase Completed";
      default:
        return "Choosing a Plan";
    }
  };

  const isDI = product === "DI";
  const diBuckets = isDI ? inds.map((ind, idx) => diBucketFor(ind, idx)) : [];
  const diExcluded = {
    canceled: diBuckets.filter((b) => b === "canceled").length,
    test: diBuckets.filter((b) => b === "test").length,
    transitioning: diBuckets.filter((b) => b === "transitioning").length,
  };
  const stageCounts: Array<{ stage: string; n: number }> = isDI
    ? DI_FUNNEL_STAGES.map((s) => ({ stage: s, n: diBuckets.filter((b) => b === s).length }))
    : STAGES.map((s) => ({ stage: s, n: inds.filter((i) => i.stage === s).length }));
  const maxStage = Math.max(...stageCounts.map((c) => c.n), 1);

  const collected = inds.reduce((sum, i) => sum + i.monthly_premium_cents, 0);
  const expected = Math.round(collected * 1.08);
  const delta = collected - expected;
  const outstanding = Math.round(collected * 0.07);
  const outstandingEnrollees = inds.filter((i) => i.last_payment_status === "Failed" || i.last_payment_status === "Pending").length;

  const failedInds = inds.filter((i) => i.last_payment_status === "Failed");
  const grace = failedInds.filter((i) => i.retry_count <= 2).length;
  const penalty = failedInds.filter((i) => i.retry_count >= 3 && i.retry_count <= 4).length;
  const suspensionRisk = failedInds.filter((i) => i.retry_count >= 5).length;

  const orgRows = useMemo(() => productOrgs.map((o) => {
    const orgInds = allInds.filter((i) => i.org_id === o.id);
    const failed = orgInds.filter((i) => i.last_payment_status === "Failed").length;
    let healthTone: "ok" | "warn" | "bad" = "ok";
    if (failed >= 3) healthTone = "bad";
    else if (failed >= 1) healthTone = "warn";
    return {
      ...o,
      individuals_count: orgInds.length,
      eligible_lives: eligibleLivesFor(orgInds.length),
      failed,
      healthTone,
      window: windowStatusFor(o.id),
    };
  }), [productOrgs, allInds]);

  const stalled = allInds.filter((i) => i.coverage_status === "in_progress").length;
  const onboardingOrgs = productOrgs.filter((o) => o.status === "onboarding").length;

  const notify = (where: string) => toast(`Navigate to ${where}`, { description: "Wireframe only" });

  return (
    <div>
      <PageHeader
        title={`${product} Dashboard`}
        subtitle="Per-product overview · all numbers are dummy"
      />

      <div className="flex items-center gap-2 mb-4">
        <label className="text-[11px] uppercase tracking-wider text-black/50">Organization</label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="px-2 py-1 text-xs border border-black/15 rounded bg-white min-w-[220px]"
        >
          <option value="all">All Organizations</option>
          {productOrgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {orgFilter !== "all" ? (
          <button
            onClick={() => setOrgFilter("all")}
            className="text-[11px] text-[#0a3d3e] underline hover:no-underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Coverage Status */}
      <div className="text-[11px] uppercase tracking-wider text-black/55 font-semibold mb-2">Coverage Status</div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="col-span-2 space-y-3">
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#0a3d3e]/10 flex items-center justify-center text-[#0a3d3e]">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Enrolled Lives</div>
              <div className="text-2xl font-semibold">{enrolledLives}</div>
              <div className="text-[11px] text-black/40">across {numOrgs} organizations</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Monthly Premium</div>
              <div className="text-2xl font-semibold">{formatCents(activePremium)}</div>
              <div className="text-[11px] text-black/40">active enrollees only</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700">
              <Percent size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Monthly Net Commission</div>
              <div className="text-2xl font-semibold">$4,812.00</div>
              <div className="text-[11px] text-black/40">estimated, all payees</div>
            </div>
          </Card>
        </div>
        <Card>
          <TableShell>
            <THead cols={["Status", "Count"]} />
            <tbody>
              {coverageCounts.map((c) => (
                <TRow key={c.status}>
                  <TCell>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-sm ${COVERAGE_COLOR[c.status]}`} />
                      {c.status.replace("_", " ")}
                    </span>
                  </TCell>
                  <TCell className="font-medium">{c.n}</TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </div>

      {/* Enrollment Funnel */}
      <div className="text-[11px] uppercase tracking-wider text-black/55 font-semibold mb-2">
        Enrollment Funnel (stage)
      </div>
      <Card className="p-3 mb-5">
        <div className="space-y-1.5">
          {stageCounts.map((c) => {
            const pct = (c.n / maxStage) * 100;
            return (
              <div key={c.stage} className="flex items-center gap-2 text-xs">
                <div className="w-36 text-black/70">{c.stage.replace(/_/g, " ")}</div>
                <div className="flex-1 h-5 bg-black/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-[#0a3d3e] flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                    style={{ width: `${Math.max(pct, c.n > 0 ? 6 : 0)}%` }}
                  >
                    {c.n > 0 ? c.n : ""}
                  </div>
                </div>
                <div className="w-10 text-right text-black/60 tabular-nums">{c.n}</div>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-black/40 mt-2">
          Funnel reflects the enrollment microsite stages, distinct from coverage lifecycle.
        </div>
      </Card>

      {/* Payment Health */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-black/10 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50">Collected This Cycle</div>
          <div className="text-[10px] text-black/40 mt-0.5">June 2026</div>
          <div className="text-xl font-semibold mt-1">{formatCents(collected)}</div>
          <div className="text-[11px] text-black/50 mt-1">Expected: {formatCents(expected)}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {delta >= 0 ? "+" : ""}{formatCents(delta)} vs expected
          </div>
        </div>
        <Stat
          label="Outstanding Balance"
          value={formatCents(outstanding)}
          hint={`across ${outstandingEnrollees} enrollees`}
        />
        <Stat
          label="Suspended / Lapsed"
          value={inds.filter((i) => ["suspended", "lapsed"].includes(i.coverage_status)).length}
          hint="needs ops review"
        />
        <div className="bg-white border border-black/10 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50">Failed Payments (Last 30d)</div>
          <div className="text-xl font-semibold mt-1">{failedInds.length}</div>
          <div className="text-[10px] text-black/55 mt-1 leading-snug">
            Grace (1-2): <span className="font-medium">{grace}</span>
            <span className="mx-1 text-black/30">|</span>
            Penalty (3-4): <span className="font-medium">{penalty}</span>
            <span className="mx-1 text-black/30">|</span>
            Suspension risk (5+): <span className="font-medium text-rose-700">{suspensionRisk}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="px-3 py-2 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-black/60">
            Top organizations
          </div>
          <TableShell>
            <THead cols={["Org", "State", "Status", "Enrolled / Eligible", "Payment Health", "Window"]} />
            <tbody>
              {orgRows.map((o) => (
                <TRow key={o.id} onClick={() => setOrgFilter(o.id)}>
                  <TCell className="font-medium">{o.name}</TCell>
                  <TCell>{o.situs_state}</TCell>
                  <TCell><Pill tone={o.status === "active" ? "ok" : o.status === "onboarding" ? "info" : "neutral"}>{o.status}</Pill></TCell>
                  <TCell className="tabular-nums">{o.individuals_count} / {o.eligible_lives}</TCell>
                  <TCell>
                    <Pill tone={o.healthTone === "ok" ? "ok" : o.healthTone === "warn" ? "warn" : "bad"}>
                      {o.healthTone === "ok" ? "All current" : `${o.failed} failed`}
                    </Pill>
                  </TCell>
                  <TCell><Pill tone={o.window.tone}>{o.window.label}</Pill></TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </Card>

        <Card>
          <div className="px-3 py-2 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-black/60">
            Needs attention
          </div>
          <ul className="text-sm">
            {product === "DI" ? (
              <>
                <li onClick={() => navigate({ to: "/missing-submissions" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>4 missing submissions awaiting review</span>
                  <Pill tone="warn">DI</Pill>
                </li>
                <li onClick={() => navigate({ to: "/policies" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>2 policies missing carrier commission %</span>
                  <Pill tone="warn">DI</Pill>
                </li>
              </>
            ) : (
              <>
                <li onClick={() => navigate({ to: "/enrollment-windows" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>1 enrollment window closes in 5 days</span>
                  <Pill tone="warn">LTC</Pill>
                </li>
                <li onClick={() => navigate({ to: "/individuals" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>3 individuals interested in spousal coverage</span>
                  <Pill tone="info">LTC</Pill>
                </li>
              </>
            )}
            <li onClick={() => navigate({ to: "/payment-ledger" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>2 failed payments in last 7 days</span>
              <Pill tone="bad">payments</Pill>
            </li>
            <li onClick={() => navigate({ to: "/tokens" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>5 magic tokens expire within 30 days</span>
              <Pill tone="info">tokens</Pill>
            </li>
            <li onClick={() => navigate({ to: "/enrollment-windows" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>1 enrollment window closing in 5 days</span>
              <Pill tone="warn">windows</Pill>
            </li>
            <li onClick={() => navigate({ to: "/organizations", search: { status: "onboarding" } as never })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>{onboardingOrgs > 0 ? onboardingOrgs : 3} orgs still in onboarding</span>
              <Pill tone="info">onboarding</Pill>
            </li>
            <li onClick={() => navigate({ to: "/account-adjustments" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>2 unapplied account adjustments</span>
              <Pill tone="warn">billing</Pill>
            </li>
            <li onClick={() => notify("individuals (in_progress, stale)")} className="px-3 py-2 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>{stalled > 0 ? stalled : 4} individuals in progress for 30+ days</span>
              <Pill tone="neutral">stale</Pill>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
