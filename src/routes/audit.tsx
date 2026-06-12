import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Drawer, useDrawer, FilterBar } from "@/components/wireframe/Bits";
import { AUDIT_LOG } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/audit")({ component: View });

function View() {
  const { role } = useStore();
  const d = useDrawer<typeof AUDIT_LOG[number]>();

  if (role !== "admin") {
    return (
      <div>
        <PageHeader title="Audit Log" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Audit logs are admin-only · SOC 2 surface.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Global mutation log · before/after diff · SOC 2 surface" />
      <FilterBar />
      <TableShell>
        <THead cols={["Timestamp", "Table", "Record", "Action", "Actor", ""]} />
        <tbody>
          {AUDIT_LOG.map((l) => (
            <TRow key={l.id} onClick={() => d.open(l)}>
              <TCell className="font-mono text-[11px]">{l.ts}</TCell>
              <TCell className="font-mono text-[11px]">{l.table}</TCell>
              <TCell className="font-mono text-[11px]">{l.record_id}</TCell>
              <TCell><Pill tone={l.action === "create" ? "ok" : l.action === "soft_delete" ? "bad" : "info"}>{l.action}</Pill></TCell>
              <TCell>{l.actor}</TCell>
              <TCell className="text-black/40">view diff →</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="Audit Entry · Diff">
        {d.state.data ? (
          <div>
            <div className="mb-3 text-xs text-black/60 font-mono">{d.state.data.ts} · {d.state.data.actor}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase text-black/50 mb-1">Before</div>
                <pre className="bg-rose-50 border border-rose-200 rounded p-2 text-[11px]">{JSON.stringify(d.state.data.before, null, 2)}</pre>
              </div>
              <div>
                <div className="text-[10px] uppercase text-black/50 mb-1">After</div>
                <pre className="bg-emerald-50 border border-emerald-200 rounded p-2 text-[11px]">{JSON.stringify(d.state.data.after, null, 2)}</pre>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
