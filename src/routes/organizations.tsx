import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar, Drawer, useDrawer, Field, Input, ProductBadge } from "@/components/wireframe/Bits";
import { ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/organizations")({ component: OrgsView });

function OrgsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const d = useDrawer<typeof ORGS[number]>();
  const rows = ORGS.filter((o) => o.product === product);

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle={`${rows.length} orgs in ${product}`}
        actions={
          <Btn variant="primary" disabled={!can("organizations", "create")} onClick={() => d.open(undefined, "create")}>
            + New Organization
          </Btn>
        }
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Name", "Product", "Situs", "Status", "# Individuals", "Owner Type", ""]} />
        <tbody>
          {rows.map((o) => (
            <TRow key={o.id} onClick={() => navigate({ to: "/organizations/$id", params: { id: o.id } })}>
              <TCell className="font-medium">{o.name}</TCell>
              <TCell><ProductBadge product={o.product} /></TCell>
              <TCell>{o.situs_state}</TCell>
              <TCell><Pill tone={o.enrollment_status === "active" ? "ok" : o.enrollment_status === "closed" ? "bad" : "info"}>{o.enrollment_status}</Pill></TCell>
              <TCell>{o.individuals_count}</TCell>
              <TCell className="capitalize">{o.policy_owner_type}</TCell>
              <TCell onClick={(e) => e.stopPropagation()}>
                <Btn disabled={!can("organizations", "delete")} title={!can("organizations", "delete") ? "Requires admin" : ""}>
                  Deactivate
                </Btn>
              </TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="New Organization">
        <Field label="Name"><Input placeholder="Organization name" /></Field>
        <Field label="Product"><Input defaultValue={product} /></Field>
        <Field label="Situs State"><Input placeholder="TX" /></Field>
        <Field label="Policy Owner Type"><Input placeholder="employer_group" /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("organizations", "create")}>Save</Btn>
          <Btn onClick={d.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
