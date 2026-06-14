import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals")({ component: IndividualsView });

function IndividualsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const createDrawer = useDrawer();
  const rows = INDIVIDUALS.filter((i) => i.product === product);
  const planLabel = product === "DI" ? "Coverage Plan" : "Purchased Plan";

  return (
    <div>
      <PageHeader
        title="Individuals"
        subtitle={`${rows.length} enrollees in ${product}`}
        actions={<Btn variant="primary" disabled={!can("individuals", "create")} onClick={() => createDrawer.open()}>+ New Individual</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Name", "Org", "Coverage", "Stage", planLabel, "Monthly Premium", "Billing Group"]} />
        <tbody>
          {rows.map((i) => (
            <TRow key={i.id} onClick={() => navigate({ to: "/individuals/$id", params: { id: i.id } })}>
              <TCell className="font-medium">
                {i.full_name}
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

      <Drawer open={createDrawer.state.open} onClose={createDrawer.close} title="New Individual">
        <div className="space-y-3">
          <Field label="Full Name"><Input placeholder="Test Person N" /></Field>
          <Field label="Email"><Input placeholder="person@example.com" /></Field>
          <Field label="Organization">
            <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
              <option value="">— none (affiliate-sponsored) —</option>
              {ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Coverage Status">
            <input disabled value="not_started" className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-black/[0.03] text-black/60" />
          </Field>
          <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
            <Btn onClick={createDrawer.close}>Cancel</Btn>
            <Btn variant="primary" onClick={createDrawer.close}>Create</Btn>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
