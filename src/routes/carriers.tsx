import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn, SectionTitle, ProductBadge } from "@/components/wireframe/Bits";
import { CARRIERS, CARRIER_PRODUCTS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/carriers")({ component: View });

type SortKey = "name" | "product" | "carrier_products_count";
type ProdSortKey = "name" | "carrier_name";

function View() {
  const { product } = useStore();
  const can = usePermission();

  const [search, setSearch] = useState("");
  const sort = useSort<SortKey>("name", "asc");
  const prodSort = useSort<ProdSortKey>("name", "asc");

  const carriers = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = CARRIERS.filter((c) => c.product === product).map((c) => ({
      ...c,
      carrier_products_count: CARRIER_PRODUCTS.filter((p) => p.carrier_id === c.id).length,
    })).filter((c) => !s || c.name.toLowerCase().includes(s));
    return sort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, product, sort]);

  const products = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = CARRIER_PRODUCTS.filter((p) => CARRIERS.find((c) => c.id === p.carrier_id)?.product === product)
      .map((p) => ({ ...p, carrier_name: CARRIERS.find((c) => c.id === p.carrier_id)?.name ?? "" }))
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.carrier_name.toLowerCase().includes(s));
    return prodSort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, product, prodSort]);

  const active = search !== "" || !sort.isDefault || !prodSort.isDefault;
  const clearAll = () => { setSearch(""); sort.reset(); prodSort.reset(); };

  return (
    <div>
      <PageHeader
        title="Carriers & Products"
        subtitle={`${carriers.length} carriers · ${products.length} products`}
        actions={<Btn variant="primary" disabled={!can("carriers", "create")}>+ New Carrier</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search carrier or product…" />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Carrier" },
            { key: "product", label: "Product" },
            { key: "carrier_products_count", label: "# Carrier Products" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {carriers.map((c) => (
            <TRow key={c.id}>
              <TCell className="font-medium">{c.name}</TCell>
              <TCell><ProductBadge product={c.product} /></TCell>
              <TCell>{c.carrier_products_count}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Carrier Products</SectionTitle>
      <div className="flex justify-end mb-2"><Btn variant="primary" disabled={!can("carrier_products", "create")}>+ New Carrier Product</Btn></div>
      <TableShell>
        <SortableTHead<ProdSortKey>
          cols={[
            { key: "name", label: "Product Name" },
            { key: "carrier_name", label: "Carrier" },
          ]}
          sortKey={prodSort.sortKey}
          sortDir={prodSort.sortDir}
          onToggle={prodSort.toggle}
        />
        <tbody>
          {products.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-medium">{p.name}</TCell>
              <TCell>{p.carrier_name}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
