import { createFileRoute } from "@tanstack/react-router";
import { Card, Stat, PageHeader, Pill, TableShell, THead, TRow, TCell } from "@/components/wireframe/Bits";
import { useStore } from "@/lib/wireframe/store";
import { INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { product } = useStore();
  const inds = INDIVIDUALS.filter((i) => i.product === product);
  const stages = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"] as const;
  const stageCounts = stages.map((s) => ({ s, n: inds.filter((i) => i.coverage_status === s).length }));
  const orgCounts = ORGS.filter((o) => o.product === product).map((o) => ({
    ...o,
    individuals_count: inds.filter((i) => i.org_id === o.id).length,
  }));
  const collected = inds.reduce((sum, i) => sum + i.monthly_premium_cents, 0);
  const outstanding = Math.round(collected * 0.07);

  return (
    <div>
      <PageHeader
        title={`${product} Dashboard`}
        subtitle="Per-product overview · all numbers are dummy"
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        {stageCounts.slice(0, 4).map((c) => (
          <Stat key={c.s} label={c.s.replace("_", " ")} value={c.n} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stageCounts.slice(4).map((c) => (
          <Stat key={c.s} label={c.s.replace("_", " ")} value={c.n} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Collected this cycle" value={formatCents(collected)} hint="successful ledger entries" />
        <Stat label="Outstanding balance" value={formatCents(outstanding)} hint="aggregate across enrollees" />
        <Stat
          label="Suspended / lapsed"
          value={inds.filter((i) => ["suspended", "lapsed"].includes(i.stage)).length}
          hint="needs ops review"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="px-3 py-2 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-black/60">
            Top organizations
          </div>
          <TableShell>
            <THead cols={["Org", "State", "Status", "# Individuals"]} />
            <tbody>
              {orgCounts.map((o) => (
                <TRow key={o.id}>
                  <TCell className="font-medium">{o.name}</TCell>
                  <TCell>{o.situs_state}</TCell>
                  <TCell><Pill tone={o.enrollment_status === "active" ? "ok" : "neutral"}>{o.enrollment_status}</Pill></TCell>
                  <TCell>{o.individuals_count}</TCell>
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
                <li className="px-3 py-2 border-b border-black/5 flex justify-between">
                  <span>4 missing submissions awaiting review</span>
                  <Pill tone="warn">DI</Pill>
                </li>
                <li className="px-3 py-2 border-b border-black/5 flex justify-between">
                  <span>2 policies missing carrier commission %</span>
                  <Pill tone="warn">DI</Pill>
                </li>
              </>
            ) : (
              <>
                <li className="px-3 py-2 border-b border-black/5 flex justify-between">
                  <span>1 enrollment window closes in 5 days</span>
                  <Pill tone="warn">LTC</Pill>
                </li>
                <li className="px-3 py-2 border-b border-black/5 flex justify-between">
                  <span>3 individuals interested in spousal coverage</span>
                  <Pill tone="info">LTC</Pill>
                </li>
              </>
            )}
            <li className="px-3 py-2 border-b border-black/5 flex justify-between">
              <span>2 failed payments in last 7 days</span>
              <Pill tone="bad">payments</Pill>
            </li>
            <li className="px-3 py-2 flex justify-between">
              <span>5 magic tokens expire within 30 days</span>
              <Pill tone="info">tokens</Pill>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
