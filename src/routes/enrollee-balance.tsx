import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Card, SectionTitle } from "@/components/wireframe/Bits";
import { INDIVIDUALS, PAYMENT_LEDGER, ACCOUNT_ADJUSTMENTS, formatCents } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/enrollee-balance")({ component: View });

function View() {
  const { product } = useStore();
  const inds = INDIVIDUALS.filter((i) => i.product === product);

  const rows = inds.slice(0, 12).map((i) => {
    const payments = PAYMENT_LEDGER.filter((p) => p.individual_id === i.id && p.status === "successful");
    const adjustments = ACCOUNT_ADJUSTMENTS.filter((a) => a.individual_id === i.id);
    const charges = i.monthly_premium_cents * 3;
    const paid = payments.reduce((s, p) => s + p.amount_cents, 0);
    const adjusted = adjustments.reduce((s, a) => s + a.amount_cents, 0);
    const balance = charges - paid + adjusted;
    return { i, charges, paid, adjusted, balance };
  });

  return (
    <div>
      <PageHeader
        title="Enrollee Balance"
        subtitle="Computed: charges − successful payments + adjustments. Replaces three Airtable accounting views."
      />

      <SectionTitle>Worked example (first row)</SectionTitle>
      <Card className="p-4 grid grid-cols-4 text-sm">
        <div><div className="text-[10px] uppercase text-black/50">Charges</div><div className="font-mono">{formatCents(rows[0].charges)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">− Successful payments</div><div className="font-mono">{formatCents(rows[0].paid)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">+ Adjustments</div><div className="font-mono">{formatCents(rows[0].adjusted)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">= Net Balance</div><div className="font-mono font-semibold">{formatCents(rows[0].balance)}</div></div>
      </Card>

      <SectionTitle>Per-individual balance</SectionTitle>
      <TableShell>
        <THead cols={["Individual", "Org", "Charges", "Payments", "Adjustments", "Net Balance"]} />
        <tbody>
          {rows.map((r) => (
            <TRow key={r.i.id}>
              <TCell className="font-medium">{r.i.full_name}</TCell>
              <TCell>{r.i.org_name}</TCell>
              <TCell className="font-mono">{formatCents(r.charges)}</TCell>
              <TCell className="font-mono text-emerald-700">−{formatCents(r.paid)}</TCell>
              <TCell className="font-mono">{formatCents(r.adjusted)}</TCell>
              <TCell className={`font-mono font-semibold ${r.balance > 0 ? "text-rose-700" : "text-black/70"}`}>{formatCents(r.balance)}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
