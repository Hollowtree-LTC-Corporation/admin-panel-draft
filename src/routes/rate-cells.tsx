import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell } from "@/components/wireframe/Bits";
import { RATE_CELLS_LTC, ORGS } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/rate-cells")({ component: View });

type SortKey = "carrier_product" | "age" | "gender" | "rate_per_1000";

function View() {
  const { product } = useStore();
  const [org, setOrg] = useState("all");
  const [bclass, setBclass] = useState("all");
  const [smoker, setSmoker] = useState("all");
  const [tier, setTier] = useState("all");
  const sort = useSort<SortKey>("age", "asc");

  if (product !== "LTC") {
    return (
      <div>
        <PageHeader title="Rate Cells" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">Rate Cells is LTC-only.</div>
      </div>
    );
  }

  const orgOptions = ORGS.filter((o) => o.product === "LTC").map((o) => ({ value: o.id, label: o.name }));
  // Benefit class options cascade from org. Dummy "Class A / B / Default" per org.
  const bclassOptions = useMemo(() => {
    if (org === "all") return [{ value: "class_a", label: "Class A — Full Time" }, { value: "class_b", label: "Class B — Part Time" }, { value: "default", label: "Default Class" }];
    return [{ value: "default", label: "Default Class" }];
  }, [org]);

  const rows = useMemo(() => {
    const filtered = RATE_CELLS_LTC.filter(() => {
      // dummy data has no smoker/tier/org fields; treat filters as visual scaffolding
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [sort]);

  const active = org !== "all" || bclass !== "all" || smoker !== "all" || tier !== "all" || !sort.isDefault;
  const clearAll = () => { setOrg("all"); setBclass("all"); setSmoker("all"); setTier("all"); sort.reset(); };

  return (
    <div>
      <PageHeader title="Rate Cells (LTC)" subtitle={`${rows.length} of ${RATE_CELLS_LTC.length} cells · read-only`} />
      <FilterRow>
        <FilterCombobox value={org} onChange={(v) => { setOrg(v); setBclass("all"); }} placeholder="All orgs" options={orgOptions} />
        <FilterCombobox value={bclass} onChange={setBclass} placeholder="All benefit classes" options={bclassOptions} />
        <FilterSelect value={smoker} onChange={setSmoker} allLabel="All smoker statuses" options={[{ value: "smoker" }, { value: "non_smoker" }]} />
        <FilterSelect value={tier} onChange={setTier} allLabel="All tiers" options={[
          { value: "bronze" }, { value: "silver" }, { value: "gold" }, { value: "platinum" }, { value: "diamond" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "carrier_product", label: "Carrier Product" },
            { key: "age", label: "Age" },
            { key: "gender", label: "Gender" },
            { key: "rate_per_1000", label: "Rate / $1,000" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((r) => (
            <TRow key={r.id}>
              <TCell>{r.carrier_product}</TCell>
              <TCell>{r.age}</TCell>
              <TCell>{r.gender}</TCell>
              <TCell className="font-mono">${r.rate_per_1000.toFixed(2)}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
