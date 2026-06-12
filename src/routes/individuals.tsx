import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar } from "@/components/wireframe/Bits";
import { INDIVIDUALS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals")({ component: IndividualsView });

function IndividualsView() {
  const { product } = useStore();
  const can = usePermission();
  const rows = INDIVIDUALS.filter((i) => i.product === product);
  const planLabel = product === "DI" ? "Coverage Plan" : "Purchased Plan";

  return (
    <div>
      <PageHeader
        title="Individuals"
        subtitle={`${rows.length} enrollees in ${product}`}
        actions={<Btn variant="primary" disabled={!can("individuals", "create")}>+ New Individual</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Name", "Org", "Coverage", "Stage", planLabel, "Monthly Premium", "Billing Group"]} />
        <tbody>
          {rows.map((i) => (
            <TRow key={i.id}>
              <TCell className="font-medium">
                <Link to="/individuals/$id" params={{ id: i.id }} className="hover:underline">{i.full_name}</Link>
                <div className="text-[10px] text-black/40">{i.email}</div>
              </TCell>
              <TCell>{i.org_name}</TCell>
              <TCell><Pill tone={i.coverage_status === "active" ? "ok" : "neutral"}>{i.coverage_status}</Pill></TCell>
              <TCell><Pill>{i.stage}</Pill></TCell>
              <TCell>{product === "DI" ? i.coverage_plan : i.purchased_plan}</TCell>
              <TCell>{formatCents(i.monthly_premium_cents)}</TCell>
              <TCell className="text-black/60">{i.billing_group_id}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
