import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill } from "@/components/wireframe/Bits";
import { MISSING_SUBMISSIONS, ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/missing-submissions")({ component: View });

type SortKey = "full_name" | "email" | "phone" | "org_name" | "origin_url" | "status";

function View() {
  const { product } = useStore();
  const can = usePermission();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState("all");
  const sort = useSort<SortKey>("full_name", "asc");

  if (product !== "DI") {
    return (
      <div>
        <PageHeader title="Missing Submissions" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">Missing Submissions is a DI-only queue. Switch the product toggle to DI.</div>
      </div>
    );
  }

  const orgOptions = ORGS.filter((o) => o.product === "DI").map((o) => ({ value: o.name, label: o.name }));
  const statuses = Array.from(new Set(MISSING_SUBMISSIONS.map((m) => m.status))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = MISSING_SUBMISSIONS.filter((m) => {
      if (s && !(m.full_name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || (m.phone?.toLowerCase().includes(s) ?? false))) return false;
      if (org !== "all" && m.org_name !== org) return false;
      if (status !== "all" && m.status !== status) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k] ?? "");
  }, [search, org, status, sort]);

  const active = search !== "" || org !== "all" || status !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setStatus("all"); sort.reset(); };

  return (
    <div>
      <PageHeader title="Missing Submissions" subtitle={`${rows.length} of ${MISSING_SUBMISSIONS.length} submissions · ops review queue`} />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search name, email or phone…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={statuses} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "full_name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "org_name", label: "Org" },
            { key: "origin_url", label: "Origin" },
            { key: "status", label: "Status" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((m) => (
            <TRow key={m.id}>
              <TCell className="font-medium">{m.full_name}</TCell>
              <TCell>{m.email}</TCell>
              <TCell>{m.phone ?? "—"}</TCell>
              <TCell>{m.org_name ?? <span className="text-black/40">unknown</span>}</TCell>
              <TCell className="font-mono text-[11px]">{m.origin_url}</TCell>
              <TCell>
                <select defaultValue={m.status} disabled={!can("missing_submissions", "status_only")} className="px-1 py-0.5 border border-black/15 rounded text-xs bg-white disabled:opacity-40">
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
