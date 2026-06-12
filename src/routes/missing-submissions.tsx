import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, FilterBar } from "@/components/wireframe/Bits";
import { MISSING_SUBMISSIONS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/missing-submissions")({ component: View });

function View() {
  const { product } = useStore();
  const can = usePermission();
  if (product !== "DI") {
    return (
      <div>
        <PageHeader title="Missing Submissions" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Missing Submissions is a DI-only queue. Switch the product toggle to DI.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Missing Submissions" subtitle="Ops review queue · update status only" />
      <FilterBar />
      <TableShell>
        <THead cols={["Name", "Email", "Phone", "Org", "Origin", "Status"]} />
        <tbody>
          {MISSING_SUBMISSIONS.map((m) => (
            <TRow key={m.id}>
              <TCell className="font-medium">{m.full_name}</TCell>
              <TCell>{m.email}</TCell>
              <TCell>{m.phone ?? "—"}</TCell>
              <TCell>{m.org_name ?? <span className="text-black/40">unknown</span>}</TCell>
              <TCell className="font-mono text-[11px]">{m.origin_url}</TCell>
              <TCell>
                <select
                  defaultValue={m.status}
                  disabled={!can("missing_submissions", "status_only")}
                  className="px-1 py-0.5 border border-black/15 rounded text-xs bg-white disabled:opacity-40"
                >
                  <option value="new">new</option>
                  <option value="reviewing">reviewing</option>
                  <option value="resolved">resolved</option>
                </select>
                <div className="mt-1"><Pill tone={m.status === "resolved" ? "ok" : m.status === "reviewing" ? "info" : "warn"}>{m.status}</Pill></div>
              </TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
