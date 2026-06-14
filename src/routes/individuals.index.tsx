import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";

const COVERAGE_BADGE: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  purchased: { label: "Purchased", cls: "bg-teal-100 text-teal-700" },
  active: { label: "Active", cls: "bg-green-100 text-green-700" },
  suspended: { label: "Suspended", cls: "bg-amber-100 text-amber-700" },
  canceled: { label: "Canceled", cls: "bg-red-100 text-red-700" },
  lapsed: { label: "Lapsed", cls: "border border-red-300 text-red-600 bg-transparent" },
};

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  invited: { label: "Invited", cls: "bg-purple-50 text-purple-600" },
  education: { label: "Education", cls: "bg-purple-100 text-purple-700" },
  selecting_plan: { label: "Selecting Plan", cls: "bg-purple-200 text-purple-800" },
  medical_questions: { label: "Medical Qs", cls: "bg-violet-200 text-violet-800" },
  checkout: { label: "Checkout", cls: "bg-violet-100 text-violet-700" },
  completed: { label: "Completed", cls: "bg-indigo-100 text-indigo-700" },
};

function StatusBadge({ map, value }: { map: typeof COVERAGE_BADGE; value: string }) {
  const m = map[value] ?? { label: value, cls: "bg-black/5 text-black/70" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return "—";
  return `${MONTH_ABBR[m - 1]} ${day}, ${y}`;
}
import { INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

type IndSearch = { org?: string; coverage?: string; stage?: string; type?: string; di_type?: string };

export const Route = createFileRoute("/individuals/")({
  component: IndividualsView,
  validateSearch: (s: Record<string, unknown>): IndSearch => ({
    org: typeof s.org === "string" ? s.org : undefined,
    coverage: typeof s.coverage === "string" ? s.coverage : undefined,
    stage: typeof s.stage === "string" ? s.stage : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    di_type: typeof s.di_type === "string" ? s.di_type : undefined,
  }),
});

type SortKey = "full_name" | "org_name" | "coverage_status" | "stage" | "plan" | "effective_date" | "monthly_premium_cents" | "relationship_type" | "di_type";

const COVERAGE_OPTIONS = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"];

function IndividualsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const createDrawer = useDrawer();
  const searchParams = useSearch({ from: "/individuals/" });
  const isLTC = product === "LTC";
  

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>(searchParams.org ?? "all");
  const [coverageFilter, setCoverageFilter] = useState<string>(searchParams.coverage ?? "all");
  const [stageFilter, setStageFilter] = useState<string>(searchParams.stage ?? "all");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.type ?? "all");
  const [diTypeFilter, setDiTypeFilter] = useState<string>(searchParams.di_type ?? "all");
  const sort = useSort<SortKey>("full_name", "asc");

  useEffect(() => {
    if (searchParams.org !== undefined) setOrgFilter(searchParams.org);
    if (searchParams.coverage !== undefined) setCoverageFilter(searchParams.coverage);
    if (searchParams.stage !== undefined) setStageFilter(searchParams.stage);
    if (searchParams.type !== undefined) setTypeFilter(searchParams.type);
    if (searchParams.di_type !== undefined) setDiTypeFilter(searchParams.di_type);
  }, [searchParams.org, searchParams.coverage, searchParams.stage, searchParams.type, searchParams.di_type]);

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
      if (!isLTC && diTypeFilter !== "all" && i.di_type !== diTypeFilter) return false;
      return true;
    });
    return sort.applySort(rows, (r, k) => {
      if (k === "plan") return isLTC ? r.purchased_plan : r.coverage_plan;
      if (k === "relationship_type") return r.relationship_type === "spouse" ? "Spouse" : "Employee";
      return (r as unknown as Record<string, string | number>)[k];
    });
  }, [productRows, search, orgFilter, coverageFilter, stageFilter, typeFilter, diTypeFilter, sort, isLTC]);

  const filtersActive = search !== "" || orgFilter !== "all" || coverageFilter !== "all" || stageFilter !== "all" || typeFilter !== "all" || diTypeFilter !== "all" || !sort.isDefault;

  const clearAll = () => {
    setSearch(""); setOrgFilter("all"); setCoverageFilter("all"); setStageFilter("all"); setTypeFilter("all"); setDiTypeFilter("all");
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
        {!isLTC && (
          <FilterSelect value={diTypeFilter} onChange={setDiTypeFilter} allLabel="All types" options={[{ value: "STD+LTD" }, { value: "LTD", label: "LTD Only" }]} />
        )}
        <ClearFiltersLink show={filtersActive} onClick={clearAll} />
      </FilterRow>

      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "full_name", label: "Name" },
            ...(isLTC ? [{ key: "relationship_type" as SortKey, label: "Type" }] : []),
            { key: "org_name", label: "Org" },
            ...(!isLTC ? [{ key: "di_type" as SortKey, label: "DI Type" }] : []),
            { key: "coverage_status", label: "Coverage Status" },
            { key: "stage", label: "Stage" },
            { key: "plan", label: "Coverage Plan" },
            { key: "effective_date", label: "Effective Date" },
            { key: "monthly_premium_cents", label: "Monthly Premium" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((i) => {
            const isSpouse = i.relationship_type === "spouse";
            const unpurchased = i.coverage_status === "not_started" || i.coverage_status === "in_progress";
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
                {!isLTC && (
                  <TCell>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${i.di_type === "STD+LTD" ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-500"}`}>
                      {i.di_type === "STD+LTD" ? "STD+LTD" : "LTD Only"}
                    </span>
                  </TCell>
                )}
                <TCell><StatusBadge map={COVERAGE_BADGE} value={i.coverage_status} /></TCell>
                <TCell><StatusBadge map={STAGE_BADGE} value={i.stage} /></TCell>
                <TCell>{unpurchased ? "—" : (isLTC ? i.purchased_plan : i.coverage_plan)}</TCell>
                <TCell className={i.coverage_status === "in_progress" ? "text-black/40" : ""}>{formatDate(i.effective_date)}</TCell>
                <TCell>{unpurchased ? "—" : formatCents(i.monthly_premium_cents)}</TCell>
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
