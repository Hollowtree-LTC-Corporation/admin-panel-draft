import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Btn, FilterBar } from "@/components/wireframe/Bits";
import { BILLING_GROUPS, INDIVIDUALS } from "@/lib/wireframe/data";
import { usePermission } from "@/lib/wireframe/store";

export const Route = createFileRoute("/billing-groups")({ component: View });

function View() {
  const can = usePermission();
  return (
    <div>
      <PageHeader
        title="Billing Groups"
        subtitle="A billing group is a Moov payment relationship · separation creates a new group"
        actions={<Btn variant="primary" disabled={!can("billing_groups", "create")}>+ New Group</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Group", "Individuals", "Payment Method", "Moov Account", ""]} />
        <tbody>
          {BILLING_GROUPS.map((g) => {
            const members = INDIVIDUALS.filter((i) => i.billing_group_id === g.id).slice(0, 3);
            return (
              <TRow key={g.id}>
                <TCell className="font-medium">{g.name}</TCell>
                <TCell>
                  {g.individuals_count} ·{" "}
                  <span className="text-black/50 text-[11px]">{members.map((m) => m.full_name).join(", ")}{g.individuals_count > 3 ? "…" : ""}</span>
                </TCell>
                <TCell>{g.payment_method}</TCell>
                <TCell className="font-mono text-[11px]">{g.moov_account_id}</TCell>
                <TCell>
                  <Btn disabled={!can("billing_groups", "update")} title="Separating a member creates a new billing group">
                    Separate member
                  </Btn>
                </TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}
