import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn } from "@/components/wireframe/Bits";
import { MAGIC_TOKENS, TOKEN_AUDIT_LOG } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/tokens")({ component: View });

type SortKey = "individual_name" | "token_class" | "status" | "expires_at" | "use_count" | "last_used_at";

function View() {
  const { role } = useStore();
  const can = usePermission();

  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState("all");
  const [status, setStatus] = useState("all");
  const sort = useSort<SortKey>("expires_at", "asc");

  if (role !== "admin") {
    return (
      <div>
        <PageHeader title="Magic Tokens" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Magic tokens are admin-only. Switch the role to <span className="font-mono">admin</span> in the top bar to view.
        </div>
      </div>
    );
  }

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = MAGIC_TOKENS.filter((t) => {
      if (s && !t.individual_name.toLowerCase().includes(s)) return false;
      if (klass !== "all" && t.token_class !== klass) return false;
      if (status !== "all" && t.status !== status) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k] ?? "");
  }, [search, klass, status, sort]);

  const active = search !== "" || klass !== "all" || status !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setKlass("all"); setStatus("all"); sort.reset(); };

  return (
    <div>
      <PageHeader title="Magic Tokens" subtitle={`${rows.length} of ${MAGIC_TOKENS.length} tokens · view & revoke only`} />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or email…" />
        <FilterSelect value={klass} onChange={setKlass} allLabel="All classes" options={[
          { value: "enrollment" }, { value: "portal" },
        ]} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[
          { value: "active" }, { value: "expired" }, { value: "revoked" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "individual_name", label: "Individual" },
            { key: "token_class", label: "Class" },
            { key: "status", label: "Status" },
            { key: "expires_at", label: "Expires" },
            { key: "use_count", label: "Uses" },
            { key: "last_used_at", label: "Last Used" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((t) => (
            <TRow key={t.id}>
              <TCell className="font-medium">{t.individual_name}</TCell>
              <TCell><Pill tone="info">{t.token_class}</Pill></TCell>
              <TCell><Pill tone={t.status === "active" ? "ok" : "bad"}>{t.status}</Pill></TCell>
              <TCell className="font-mono text-[11px]">{t.expires_at}</TCell>
              <TCell>{t.use_count}</TCell>
              <TCell className="font-mono text-[11px]">{t.last_used_at ?? "—"}</TCell>
              <TCell><Btn variant="danger" disabled={!can("magic_tokens", "revoke") || t.status !== "active"}>Revoke</Btn></TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <div className="mt-6">
        <PageHeader title="Token Audit Log" subtitle="Append-only validation attempts" />
        <TableShell>
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["Timestamp", "Hashed Token", "IP", "User Agent", "Result"].map((c) => (<th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}</tr>
          </thead>
          <tbody>
            {TOKEN_AUDIT_LOG.map((l) => (
              <TRow key={l.id}>
                <TCell className="font-mono text-[11px]">{l.ts}</TCell>
                <TCell className="font-mono text-[11px]">{l.token_hash}</TCell>
                <TCell className="font-mono text-[11px]">{l.ip}</TCell>
                <TCell className="text-black/60">{l.user_agent}</TCell>
                <TCell><Pill tone={l.result === "accepted" ? "ok" : "bad"}>{l.result}</Pill></TCell>
              </TRow>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
