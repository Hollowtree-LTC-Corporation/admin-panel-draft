import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, FilterBar } from "@/components/wireframe/Bits";
import { RATE_CELLS_LTC } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/rate-cells")({ component: View });

function View() {
  const { product } = useStore();
  if (product !== "LTC") {
    return (
      <div>
        <PageHeader title="Rate Cells" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Rate Cells is LTC-only.
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Rate Cells (LTC)" subtitle="Read-only · age × gender × carrier product" />
      <FilterBar />
      <TableShell>
        <THead cols={["Carrier Product", "Age", "Gender", "Rate / $1,000"]} />
        <tbody>
          {RATE_CELLS_LTC.map((r) => (
            <TRow key={r.id}>
              <TCell>{r.carrier_product}</TCell>
              <TCell>{r.age}</TCell>
              <TCell>{r.gender}</TCell>
              <TCell className="font-mono">${r.rate_per_1000.toFixed(2)}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
