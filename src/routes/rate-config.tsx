import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn } from "@/components/wireframe/Bits";
import { RATE_CONFIG_DI, ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/rate-config")({ component: View });

type SortKey = "carrier_product" | "age_band" | "rate_per_1000";

function View() {
  const { product } = useStore();
  const can = usePermission();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const sort = useSort<SortKey>("carrier_product", "asc");

  if (product !== "DI") {
    return (
      <div>
        <PageHeader title="Rate Config" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">Rate Config is DI-only.</div>
      </div>
    );
  }

  const orgOptions = ORGS.filter((o) => o.product === "DI").map((o) => ({ value: o.id, label: o.name }));

  const rows = (() => {
    const s = search.trim().toLowerCase();
    const filtered = RATE_CONFIG_DI.filter((r) => {
      if (s && !r.carrier_product.toLowerCase().includes(s)) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  })();
  void useMemo;

  const active = search !== "" || org !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Rate Config (DI)"
        subtitle={`${rows.length} of ${RATE_CONFIG_DI.length} rate rows · age-banded per carrier product`}
        actions={<Btn variant="primary" disabled={!can("rate_config", "create")}>+ New Rate Row</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search employee class…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All DI orgs" options={orgOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "carrier_product", label: "Carrier Product" },
            { key: "age_band", label: "Age Band" },
            { key: "rate_per_1000", label: "Rate / $1,000" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((r) => (
            <TRow key={r.id}>
              <TCell>{r.carrier_product}</TCell>
              <TCell>{r.age_band}</TCell>
              <TCell className="font-mono">${r.rate_per_1000.toFixed(2)}</TCell>
              <TCell><Btn disabled={!can("rate_config", "update")}>Edit</Btn></TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
