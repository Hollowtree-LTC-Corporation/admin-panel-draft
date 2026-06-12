import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, FilterBar } from "@/components/wireframe/Bits";
import { PAYMENT_LEDGER, formatCents } from "@/lib/wireframe/data";

export const Route = createFileRoute("/payment-ledger")({ component: View });

function View() {
  return (
    <div>
      <PageHeader
        title="Payment Ledger"
        subtitle="Read-only chronological history · replaces 48+ Airtable monthly columns"
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Date", "Individual", "Group", "Charge Type", "Amount", "Status", "Funding"]} />
        <tbody>
          {PAYMENT_LEDGER.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-mono text-[11px]">{p.date}</TCell>
              <TCell>{p.individual_name}</TCell>
              <TCell className="text-black/60">{p.billing_group_id}</TCell>
              <TCell className="capitalize">{p.charge_type.replace(/_/g, " ")}</TCell>
              <TCell>{formatCents(p.amount_cents)}</TCell>
              <TCell><Pill tone={p.status === "successful" ? "ok" : p.status === "failed" ? "bad" : "info"}>{p.status}</Pill></TCell>
              <TCell className="capitalize">{p.funding_source}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
