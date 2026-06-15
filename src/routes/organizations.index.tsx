import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, useDrawer, Field, Input, ProductBadge } from "@/components/wireframe/Bits";
import { ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort, US_STATE_OPTIONS } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/organizations/")({ component: OrgsView });

type SortKey = "name" | "product" | "situs_state" | "status" | "individuals_count" | "policy_owner_type";

function OrgsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const d = useDrawer<typeof ORGS[number]>();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [situs, setSitus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const sort = useSort<SortKey>("name", "asc");

  const productRows = ORGS.filter((o) => o.product === product);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = productRows.filter((o) => {
      if (s && !o.name.toLowerCase().includes(s)) return false;
      if (status !== "all" && o.status !== status) return false;
      if (situs !== "all" && o.situs_state !== situs) return false;
      if (owner !== "all" && o.policy_owner_type !== owner) return false;
      return true;
    });
    return sort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k] as string | number);
  }, [productRows, search, status, situs, owner, sort]);

  const active = search !== "" || status !== "all" || situs !== "all" || owner !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setStatus("all"); setSitus("all"); setOwner("all"); sort.reset(); };

  const subtitle = filtered.length === productRows.length
    ? `${productRows.length} orgs in ${product}`
    : `${filtered.length} of ${productRows.length} orgs in ${product}`;

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle={subtitle}
        actions={<Btn variant="primary" disabled={!can("organizations", "create")} onClick={() => d.open(undefined, "create")}>+ New Organization</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search name or domain…" />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[
          { value: "not_started", label: "not_started" }, { value: "onboarding", label: "onboarding" }, { value: "active" }, { value: "closed" }, { value: "suspended" },
        ]} />
        <FilterCombobox value={situs} onChange={setSitus} placeholder="All states" options={US_STATE_OPTIONS()} />
        <FilterSelect value={owner} onChange={setOwner} allLabel="All owner types" options={[
          { value: "employer", label: "employer_group" }, { value: "employer_group", label: "employer_group" }, { value: "individual", label: "individual" }, { value: "cca", label: "cca" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={filtered.length} totalCount={productRows.length} resourceLabel="organizations" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Name" },
            { key: "product", label: "Product" },
            { key: "situs_state", label: "Situs" },
            { key: "status", label: "Status" },
            { key: "individuals_count", label: "# Individuals" },
            { key: "policy_owner_type", label: "Owner Type" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((o) => (
            <TRow key={o.id} onClick={() => navigate({ to: "/organizations/$id", params: { id: o.id } })}>
              <TCell className="font-medium">{o.name}</TCell>
              <TCell><ProductBadge product={o.product} /></TCell>
              <TCell>{o.situs_state}</TCell>
              <TCell><Pill tone={o.status === "active" ? "ok" : o.status === "closed" || o.status === "suspended" ? "bad" : "info"}>{o.status}</Pill></TCell>
              <TCell>{o.individuals_count}</TCell>
              <TCell className="capitalize">{o.policy_owner_type}</TCell>
              <TCell onClick={(e) => e.stopPropagation()}>
                <Btn disabled={!can("organizations", "delete")} title={!can("organizations", "delete") ? "Requires admin" : ""}>Deactivate</Btn>
              </TCell>
            </TRow>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40 text-xs">No organizations match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="New Organization">
        <Field label="Name"><Input placeholder="Organization name" /></Field>
        <Field label="Product"><Input defaultValue={product} /></Field>
        <Field label="Situs State"><Input placeholder="TX" /></Field>
        <Field label="Policy Owner Type"><Input placeholder="employer_group" /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("organizations", "create")}>Save</Btn>
          <Btn onClick={d.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
