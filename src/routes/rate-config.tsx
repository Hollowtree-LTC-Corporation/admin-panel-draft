import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Btn, FilterBar } from "@/components/wireframe/Bits";
import { RATE_CONFIG_DI } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/rate-config")({ component: View });

function View() {
  const { product } = useStore();
  const can = usePermission();
  if (product !== "DI") {
    return (
      <div>
        <PageHeader title="Rate Config" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Rate Config is DI-only.
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        title="Rate Config (DI)"
        subtitle="Age-banded rates per carrier product"
        actions={<Btn variant="primary" disabled={!can("rate_config", "create")}>+ New Rate Row</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Carrier Product", "Age Band", "Rate / $1,000", ""]} />
        <tbody>
          {RATE_CONFIG_DI.map((r) => (
            <TRow key={r.id}>
              <TCell>{r.carrier_product}</TCell>
              <TCell>{r.age_band}</TCell>
              <TCell className="font-mono">${r.rate_per_1000.toFixed(2)}</TCell>
              <TCell><Btn disabled={!can("rate_config", "update")}>Edit</Btn></TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
