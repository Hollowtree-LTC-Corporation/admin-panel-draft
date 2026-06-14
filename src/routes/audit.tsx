import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Drawer, useDrawer } from "@/components/wireframe/Bits";
import { AUDIT_LOG } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, FilterDate, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/audit")({ component: View });

type SortKey = "table" | "record_id" | "action" | "actor" | "ts";

function View() {
  const { role } = useStore();
  const d = useDrawer<typeof AUDIT_LOG[number]>();

  const [search, setSearch] = useState("");
  const [table, setTable] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sort = useSort<SortKey>("ts", "desc");

  if (role !== "admin") {
    return (
      <div>
        <PageHeader title="Audit Log" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">Audit logs are admin-only · SOC 2 surface.</div>
      </div>
    );
  }

  const tableOptions = Array.from(new Set(AUDIT_LOG.map((l) => l.table))).map((v) => ({ value: v }));
  const actorOptions = Array.from(new Set(AUDIT_LOG.map((l) => l.actor))).map((v) => ({ value: v, label: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = AUDIT_LOG.filter((l) => {
      if (s && !(l.table.toLowerCase().includes(s) || l.record_id.toLowerCase().includes(s))) return false;
      if (table !== "all" && l.table !== table) return false;
      if (action !== "all" && l.action !== action) return false;
      if (actor !== "all" && l.actor !== actor) return false;
      const day = l.ts.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, table, action, actor, from, to, sort]);

  const active = search !== "" || table !== "all" || action !== "all" || actor !== "all" || from !== "" || to !== "" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setTable("all"); setAction("all"); setActor("all"); setFrom(""); setTo(""); sort.reset(); };

  return (
    <div>
      <PageHeader title="Audit Log" subtitle={`${rows.length} of ${AUDIT_LOG.length} entries · before/after diff`} />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search table or record id…" />
        <FilterSelect value={table} onChange={setTable} allLabel="All tables" options={tableOptions} />
        <FilterSelect value={action} onChange={setAction} allLabel="All actions" options={[
          { value: "create" }, { value: "update" }, { value: "delete" }, { value: "soft_delete" },
        ]} />
        <FilterCombobox value={actor} onChange={setActor} placeholder="All users" options={actorOptions} />
        <FilterDate value={from} onChange={setFrom} />
        <span className="text-[11px] text-black/40">to</span>
        <FilterDate value={to} onChange={setTo} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "ts", label: "Timestamp" },
            { key: "table", label: "Table" },
            { key: "record_id", label: "Record" },
            { key: "action", label: "Action" },
            { key: "actor", label: "Actor" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((l) => (
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
