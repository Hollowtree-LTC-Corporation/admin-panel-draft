import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn } from "@/components/wireframe/Bits";
import { POLICIES, CARRIER_PRODUCTS, ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/policies")({ component: View });

type SortKey = "id" | "org_name" | "carrier_product_name" | "status" | "carrier_commission_pct" | "override_pct";

function View() {
  const { product } = useStore();
  const can = usePermission();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState("all");
  const [cp, setCp] = useState("all");
  const sort = useSort<SortKey>("org_name", "asc");

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const cpOptions = CARRIER_PRODUCTS.map((p) => ({ value: p.id, label: p.name }));
  const statuses = Array.from(new Set(POLICIES.map((p) => p.status))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = POLICIES.filter((p) => p.product === product).map((p) => ({
      ...p,
      carrier_product_name: CARRIER_PRODUCTS.find((c) => c.id === p.carrier_product_id)?.name ?? "",
    })).filter((p) => {
      if (s && !(p.org_name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s))) return false;
      if (org !== "all" && p.org_id !== org) return false;
      if (status !== "all" && p.status !== status) return false;
      if (cp !== "all" && p.carrier_product_id !== cp) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, org, status, cp, sort, product]);

  const active = search !== "" || org !== "all" || status !== "all" || cp !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setStatus("all"); setCp("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle={`${rows.length} policies · ${product}`}
        actions={<Btn variant="primary" disabled={!can("policies", "create")}>+ New Policy</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search org or policy id…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={statuses} />
        <FilterCombobox value={cp} onChange={setCp} placeholder="All carrier products" options={cpOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "id", label: "Policy" },
            { key: "org_name", label: "Org" },
            { key: "carrier_product_name", label: "Carrier Product" },
            { key: "status", label: "Status" },
            { key: product === "DI" ? "carrier_commission_pct" : null, label: product === "DI" ? "Carrier %" : "Schedule" },
            { key: product === "DI" ? "override_pct" : null, label: product === "DI" ? "Override %" : "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-mono text-[11px]">{p.id}</TCell>
              <TCell className="font-medium">{p.org_name}</TCell>
              <TCell>{p.carrier_product_name}</TCell>
              <TCell><Pill tone={p.status === "active" ? "ok" : "info"}>{p.status}</Pill></TCell>
              <TCell>{product === "DI" ? `${p.carrier_commission_pct}%` : <a className="underline text-[#0a3d3e]">Linked schedule →</a>}</TCell>
              <TCell>{product === "DI" ? `${p.override_pct}%` : ""}</TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-black/40 text-xs">No policies match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
