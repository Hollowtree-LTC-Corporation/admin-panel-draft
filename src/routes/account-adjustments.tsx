import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Btn, FilterBar, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { ACCOUNT_ADJUSTMENTS, formatCents } from "@/lib/wireframe/data";
import { usePermission } from "@/lib/wireframe/store";

export const Route = createFileRoute("/account-adjustments")({ component: View });

function View() {
  const can = usePermission();
  const d = useDrawer();
  return (
    <div>
      <PageHeader
        title="Account Adjustments"
        subtitle="Manual balance corrections · immutable once created · admin approval required"
        actions={
          <Btn
            variant="primary"
            disabled={!can("account_adjustments", "create") || !can("account_adjustments", "approve")}
            title={!can("account_adjustments", "approve") ? "Approval requires admin" : ""}
            onClick={() => d.open()}
          >
            + New Adjustment
          </Btn>
        }
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Effective", "Individual", "Type", "Amount", "Reason", "Approved By", "Approved At"]} />
        <tbody>
          {ACCOUNT_ADJUSTMENTS.map((a) => (
            <TRow key={a.id}>
              <TCell className="font-mono text-[11px]">{a.effective_date}</TCell>
              <TCell className="font-medium">{a.individual_name}</TCell>
              <TCell className="capitalize">{a.adjustment_type.replace(/_/g, " ")}</TCell>
              <TCell className={a.amount_cents < 0 ? "text-rose-700" : ""}>{formatCents(a.amount_cents)}</TCell>
              <TCell className="text-black/70">{a.reason}</TCell>
              <TCell>{a.approved_by}</TCell>
              <TCell className="font-mono text-[11px]">{a.approved_at}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="New Account Adjustment">
        <Field label="Individual"><Input placeholder="Select individual…" /></Field>
        <Field label="Adjustment Type"><Input defaultValue="premium_correction" /></Field>
        <Field label="Amount (cents)"><Input placeholder="-1500" /></Field>
        <Field label="Reason"><Input placeholder="Short justification" /></Field>
        <Field label="Effective Date"><Input defaultValue="2025-06-12" /></Field>
        <div className="text-[11px] text-black/50 mt-2 mb-3">Once created, this row is immutable.</div>
        <div className="flex gap-2">
          <Btn variant="primary" disabled={!can("account_adjustments", "approve")}>Create &amp; Approve</Btn>
          <Btn onClick={d.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
