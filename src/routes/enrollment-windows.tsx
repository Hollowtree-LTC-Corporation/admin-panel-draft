import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar } from "@/components/wireframe/Bits";
import { ENROLLMENT_WINDOWS } from "@/lib/wireframe/data";
import { usePermission } from "@/lib/wireframe/store";

export const Route = createFileRoute("/enrollment-windows")({ component: View });

function View() {
  const can = usePermission();
  return (
    <div>
      <PageHeader
        title="Enrollment Windows"
        subtitle="Per-org open enrollment periods · supports employer / employer+affiliate / affiliate-only sponsorship"
        actions={<Btn variant="primary" disabled={!can("enrollment_windows", "create")}>+ New Window</Btn>}
      />
      <FilterBar />
      <TableShell>
        <THead cols={["Sponsor (Org / Affiliate)", "Type", "Start", "End", "Status", "Sponsor Shape", "Carrier", ""]} />
        <tbody>
          {ENROLLMENT_WINDOWS.map((w) => (
            <TRow key={w.id}>
              <TCell className="font-medium">
                {w.org_name}
                {w.affiliate_org ? <div className="text-[10px] text-black/50">+ {w.affiliate_org}</div> : null}
              </TCell>
              <TCell className="capitalize">{w.window_type}</TCell>
              <TCell>{w.start_date}</TCell>
              <TCell>{w.end_date}</TCell>
              <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
              <TCell>{w.sponsor_type}</TCell>
              <TCell>{w.carrier}</TCell>
              <TCell><Btn disabled={!can("enrollment_windows", "update")}>Edit</Btn></TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
