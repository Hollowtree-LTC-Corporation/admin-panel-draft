import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

type IndSearch = { org?: string; coverage?: string; stage?: string; type?: string };

export const Route = createFileRoute("/individuals/")({
  component: IndividualsView,
  validateSearch: (s: Record<string, unknown>): IndSearch => ({
    org: typeof s.org === "string" ? s.org : undefined,
    coverage: typeof s.coverage === "string" ? s.coverage : undefined,
    stage: typeof s.stage === "string" ? s.stage : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
  }),
});

type SortKey = "full_name" | "org_name" | "coverage_status" | "stage" | "plan" | "monthly_premium_cents" | "billing_group_id" | "relationship_type";

const COVERAGE_OPTIONS = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"];

function IndividualsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const createDrawer = useDrawer();
  const searchParams = useSearch({ from: "/individuals/" });
  const isLTC = product === "LTC";
  const planLabel = isLTC ? "Purchased Plan" : "Coverage Plan";

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>(searchParams.org ?? "all");
  const [coverageFilter, setCoverageFilter] = useState<string>(searchParams.coverage ?? "all");
  const [stageFilter, setStageFilter] = useState<string>(searchParams.stage ?? "all");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.type ?? "all");
  const sort = useSort<SortKey>("full_name", "asc");

  // Sync from URL when params change (e.g. cross-page nav)
  useEffect(() => {
    if (searchParams.org !== undefined) setOrgFilter(searchParams.org);
    if (searchParams.coverage !== undefined) setCoverageFilter(searchParams.coverage);
    if (searchParams.stage !== undefined) setStageFilter(searchParams.stage);
    if (searchParams.type !== undefined) setTypeFilter(searchParams.type);
  }, [searchParams.org, searchParams.coverage, searchParams.stage, searchParams.type]);

  const productRows = INDIVIDUALS.filter((i) => i.product === product);
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const stageOptions = Array.from(new Set(productRows.map((r) => r.stage)));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = productRows.filter((i) => {
      if (s && !(i.full_name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s))) return false;
      if (orgFilter !== "all" && i.org_id !== orgFilter) return false;
      if (coverageFilter !== "all" && i.coverage_status !== coverageFilter) return false;
      if (stageFilter !== "all" && i.stage !== stageFilter) return false;
      if (isLTC && typeFilter !== "all") {
        const isSpouse = i.relationship_type === "spouse";
        if (typeFilter === "Spouse" && !isSpouse) return false;
        if (typeFilter === "Employee" && isSpouse) return false;
      }
      return true;
    });
    return sort.applySort(rows, (r, k) => {
      if (k === "plan") return isLTC ? r.purchased_plan : r.coverage_plan;
      if (k === "relationship_type") return r.relationship_type === "spouse" ? "Spouse" : "Employee";
      return (r as Record<string, string | number>)[k] as string | number;
    });
  }, [productRows, search, orgFilter, coverageFilter, stageFilter, typeFilter, sort, isLTC]);

  const filtersActive = search !== "" || orgFilter !== "all" || coverageFilter !== "all" || stageFilter !== "all" || typeFilter !== "all" || !sort.isDefault;

  const clearAll = () => {
    setSearch(""); setOrgFilter("all"); setCoverageFilter("all"); setStageFilter("all"); setTypeFilter("all");
    sort.reset();
    navigate({ to: "/individuals", search: {} });
  };

  const subtitle = filtered.length === productRows.length
    ? `${productRows.length} enrollees in ${product}`
    : `${filtered.length} of ${productRows.length} enrollees in ${product}`;

  return (
    <div>
      <PageHeader
        title="Individuals"
        subtitle={subtitle}
        actions={<Btn variant="primary" disabled={!can("individuals", "create")} onClick={() => createDrawer.open()}>+ New Individual</Btn>}
      />

      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search name or email…" />
        <FilterCombobox value={orgFilter} onChange={setOrgFilter} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={coverageFilter} onChange={setCoverageFilter} allLabel="All coverage" options={COVERAGE_OPTIONS.map((v) => ({ value: v }))} />
        <FilterSelect value={stageFilter} onChange={setStageFilter} allLabel="All stages" options={stageOptions.map((v) => ({ value: v }))} />
        {isLTC && (
          <FilterSelect value={typeFilter} onChange={setTypeFilter} allLabel="All types" options={[{ value: "Employee" }, { value: "Spouse" }]} />
        )}
        <ClearFiltersLink show={filtersActive} onClick={clearAll} />
      </FilterRow>

      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "full_name", label: "Name" },
            ...(isLTC ? [{ key: "relationship_type" as SortKey, label: "Type" }] : []),
            { key: "org_name", label: "Org" },
            { key: "coverage_status", label: "Coverage" },
            { key: "stage", label: "Stage" },
            { key: "plan", label: planLabel },
            { key: "monthly_premium_cents", label: "Monthly Premium" },
            { key: "billing_group_id", label: "Billing Group" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((i) => {
            const isSpouse = i.relationship_type === "spouse";
            return (
              <TRow key={i.id} onClick={() => navigate({ to: "/individuals/$id", params: { id: i.id } })}>
                <TCell className="font-medium">
                  {i.full_name}
                  <div className="text-[10px] text-black/40">{i.email}</div>
                </TCell>
                {isLTC && (
                  <TCell>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${isSpouse ? "bg-violet-100 text-violet-800" : "bg-black/5 text-black/70"}`}>
                      {isSpouse ? "Spouse" : "Employee"}
                    </span>
                  </TCell>
                )}
                <TCell>{i.org_name}</TCell>
                <TCell><Pill tone={i.coverage_status === "active" ? "ok" : "neutral"}>{i.coverage_status}</Pill></TCell>
                <TCell><Pill>{i.stage}</Pill></TCell>
                <TCell>{isLTC ? i.purchased_plan : i.coverage_plan}</TCell>
                <TCell>{formatCents(i.monthly_premium_cents)}</TCell>
                <TCell className="text-black/60">{i.billing_group_id}</TCell>
              </TRow>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={isLTC ? 8 : 7} className="px-3 py-8 text-center text-black/40 text-xs">No individuals match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={createDrawer.state.open} onClose={createDrawer.close} title="New Individual">
        <div className="space-y-3">
          <Field label="Full Name"><Input placeholder="Test Person N" /></Field>
          <Field label="Email"><Input placeholder="person@example.com" /></Field>
          <Field label="Organization">
            <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
              <option value="">— none (affiliate-sponsored) —</option>
              {ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Coverage Status">
            <input disabled value="not_started" className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-black/[0.03] text-black/60" />
          </Field>
          <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
            <Btn onClick={createDrawer.close}>Cancel</Btn>
            <Btn variant="primary" onClick={createDrawer.close}>Create</Btn>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
