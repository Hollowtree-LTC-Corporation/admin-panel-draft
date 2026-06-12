import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar } from "@/components/wireframe/Bits";
import { POLICIES, CARRIER_PRODUCTS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/policies")({ component: View });

function View() {
  const { product } = useStore();
  const can = usePermission();
  const rows = POLICIES.filter((p) => p.product === product);

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle={`Policy records per organization · ${product}`}
        actions={<Btn variant="primary" disabled={!can("policies", "create")}>+ New Policy</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Policy", "Org", "Carrier Product", "Status", product === "DI" ? "Carrier %" : "Schedule", product === "DI" ? "Override %" : ""]} />
        <tbody>
          {rows.map((p) => {
            const cp = CARRIER_PRODUCTS.find((c) => c.id === p.carrier_product_id);
            return (
              <TRow key={p.id}>
                <TCell className="font-mono text-[11px]">{p.id}</TCell>
                <TCell className="font-medium">{p.org_name}</TCell>
                <TCell>{cp?.name}</TCell>
                <TCell><Pill tone={p.status === "active" ? "ok" : "info"}>{p.status}</Pill></TCell>
                <TCell>{product === "DI" ? `${p.carrier_commission_pct}%` : <a className="underline text-[#0a3d3e]">Linked schedule →</a>}</TCell>
                <TCell>{product === "DI" ? `${p.override_pct}%` : ""}</TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}
