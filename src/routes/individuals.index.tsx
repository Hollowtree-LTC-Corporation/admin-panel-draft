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

function formatFaceAmount(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}
// ridersFor removed — LTC list no longer surfaces riders column per latest spec

function benefitClassFor(n: number): string { return n % 2 === 0 ? "All Employees" : "Management"; }
function premiumStructureFor(n: number): "lifetime" | "ten_pay" { return n % 4 === 0 ? "ten_pay" : "lifetime"; }
function premiumStructureLabel(v: string): string { return v === "ten_pay" ? "10-Pay" : "Lifetime"; }
function issueTypeFor(i: { issue_type?: string | null; relationship_type?: string | null }): "GI" | "SI" {
  if (i.issue_type === "GI" || i.issue_type === "SI") return i.issue_type;
  return i.relationship_type === "spouse" ? "SI" : "GI";
}

function paymentBadge(status: string | null, retry: number) {
  if (!status) return <span className="text-black/40">—</span>;
  if (status === "Successful") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Paid</span>;
  if (status === "Pending") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Pending</span>;
  if (status === "Failed") {
    const escalated = retry >= 3;
    const cls = escalated ? "bg-red-200 text-red-800 font-medium" : "bg-red-100 text-red-700";
    const label = retry > 0 ? `Failed (${retry})` : "Failed";
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${cls}`}>{label}</span>;
  }
  return <span className="text-black/40">—</span>;
}
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

type IndSearch = { org?: string; coverage?: string; stage?: string; type?: string; di_type?: string; payment?: string; rep?: string; issue?: string; bclass?: string };

export const Route = createFileRoute("/individuals/")({
  component: IndividualsView,
  validateSearch: (s: Record<string, unknown>): IndSearch => ({
    org: typeof s.org === "string" ? s.org : undefined,
    coverage: typeof s.coverage === "string" ? s.coverage : undefined,
    stage: typeof s.stage === "string" ? s.stage : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    di_type: typeof s.di_type === "string" ? s.di_type : undefined,
    payment: typeof s.payment === "string" ? s.payment : undefined,
    rep: typeof s.rep === "string" ? s.rep : undefined,
    issue: typeof s.issue === "string" ? s.issue : undefined,
    bclass: typeof s.bclass === "string" ? s.bclass : undefined,
  }),
});

type SortKey = "full_name" | "org_name" | "coverage_status" | "stage" | "plan" | "effective_date" | "monthly_premium_cents" | "relationship_type" | "di_type" | "face_amount_cents" | "last_payment_status" | "assigned_rep";

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
  const [paymentFilter, setPaymentFilter] = useState<string>(searchParams.payment ?? "all");
  const [repFilter, setRepFilter] = useState<string>(searchParams.rep ?? "all");
  const [issueFilter, setIssueFilter] = useState<string>(searchParams.issue ?? "all");
  const [bclassFilter, setBclassFilter] = useState<string>(searchParams.bclass ?? "all");
  const sort = useSort<SortKey>("full_name", "asc");

  useEffect(() => {
    if (searchParams.org !== undefined) setOrgFilter(searchParams.org);
    if (searchParams.coverage !== undefined) setCoverageFilter(searchParams.coverage);
    if (searchParams.stage !== undefined) setStageFilter(searchParams.stage);
    if (searchParams.type !== undefined) setTypeFilter(searchParams.type);
    if (searchParams.di_type !== undefined) setDiTypeFilter(searchParams.di_type);
    if (searchParams.payment !== undefined) setPaymentFilter(searchParams.payment);
    if (searchParams.rep !== undefined) setRepFilter(searchParams.rep);
    if (searchParams.issue !== undefined) setIssueFilter(searchParams.issue);
    if (searchParams.bclass !== undefined) setBclassFilter(searchParams.bclass);
  }, [searchParams.org, searchParams.coverage, searchParams.stage, searchParams.type, searchParams.di_type, searchParams.payment, searchParams.rep, searchParams.issue, searchParams.bclass]);

  const productRows = INDIVIDUALS.filter((i) => i.product === product);
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const stageOptions = Array.from(new Set(productRows.map((r) => r.stage)));
  const repOptions = Array.from(new Set(productRows.map((r) => r.assigned_rep).filter(Boolean))) as string[];
  const benefitClassOptions = ["All Employees", "Management"];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = productRows.filter((i) => {
      const n = parseInt(i.id.replace("ind_", ""), 10) || 1;
      if (s && !(i.full_name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s))) return false;
      if (orgFilter !== "all" && i.org_id !== orgFilter) return false;
      if (coverageFilter !== "all" && i.coverage_status !== coverageFilter) return false;
      if (stageFilter !== "all" && i.stage !== stageFilter) return false;
      if (isLTC && issueFilter !== "all" && issueTypeFor(i) !== issueFilter) return false;
      if (isLTC && bclassFilter !== "all" && benefitClassFor(n) !== bclassFilter) return false;
      if (!isLTC && typeFilter !== "all") {
        const isSpouse = i.relationship_type === "spouse";
        if (typeFilter === "Spouse" && !isSpouse) return false;
        if (typeFilter === "Employee" && isSpouse) return false;
      }
      if (!isLTC && diTypeFilter !== "all" && i.di_type !== diTypeFilter) return false;
      if (paymentFilter !== "all" && i.last_payment_status !== paymentFilter) return false;
      if (!isLTC && repFilter !== "all") {
        if (repFilter === "__unassigned__") { if (i.assigned_rep) return false; }
        else if (i.assigned_rep !== repFilter) return false;
      }
      return true;
    });
    return sort.applySort(rows, (r, k) => {
      if (k === "plan") return isLTC ? r.purchased_plan : r.coverage_plan;
      if (k === "relationship_type") return r.relationship_type === "spouse" ? "Spouse" : "Employee";
      return (r as unknown as Record<string, string | number>)[k];
    });
  }, [productRows, search, orgFilter, coverageFilter, stageFilter, typeFilter, diTypeFilter, paymentFilter, repFilter, issueFilter, bclassFilter, sort, isLTC]);

  const filtersActive = search !== "" || orgFilter !== "all" || coverageFilter !== "all" || stageFilter !== "all" || typeFilter !== "all" || diTypeFilter !== "all" || paymentFilter !== "all" || repFilter !== "all" || issueFilter !== "all" || bclassFilter !== "all" || !sort.isDefault;

  const clearAll = () => {
    setSearch(""); setOrgFilter("all"); setCoverageFilter("all"); setStageFilter("all"); setTypeFilter("all"); setDiTypeFilter("all"); setPaymentFilter("all"); setRepFilter("all"); setIssueFilter("all"); setBclassFilter("all");
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
        <FilterSelect value={coverageFilter} onChange={setCoverageFilter} allLabel="All statuses" options={COVERAGE_OPTIONS.map((v) => ({ value: v }))} />
        <FilterSelect value={stageFilter} onChange={setStageFilter} allLabel="All stages" options={stageOptions.map((v) => ({ value: v }))} />
        {isLTC && (
          <>
            <FilterSelect value={issueFilter} onChange={setIssueFilter} allLabel="All issue types" options={[{ value: "GI" }, { value: "SI" }]} />
            <FilterSelect value={bclassFilter} onChange={setBclassFilter} allLabel="All benefit classes" options={benefitClassOptions.map((v) => ({ value: v }))} />
          </>
        )}
        {!isLTC && (
          <>
            <FilterSelect value={diTypeFilter} onChange={setDiTypeFilter} allLabel="All types" options={[{ value: "STD+LTD" }, { value: "LTD", label: "LTD Only" }]} />
            <FilterSelect value={repFilter} onChange={setRepFilter} allLabel="All reps" options={[...repOptions.map((v) => ({ value: v })), { value: "__unassigned__", label: "Unassigned" }]} />
          </>
        )}
        <FilterSelect value={paymentFilter} onChange={setPaymentFilter} allLabel="All payments" options={[{ value: "Successful", label: "Paid" }, { value: "Failed" }, { value: "Pending" }]} />
        <ClearFiltersLink show={filtersActive} onClick={clearAll} />
        <ExportCsvButton filteredCount={filtered.length} totalCount={productRows.length} resourceLabel="individuals" />
      </FilterRow>

      <TableShell>
        <SortableTHead<SortKey>
          cols={isLTC ? [
            { key: "full_name", label: "Name" },
            { key: "org_name", label: "Org" },
            { key: null, label: "Issue Type" },
            { key: "coverage_status", label: "Coverage Status" },
            { key: "stage", label: "Stage" },
            { key: null, label: "Benefit Class" },
            { key: null, label: "Premium Structure" },
            { key: "face_amount_cents", label: "Face Amount" },
            { key: "monthly_premium_cents", label: "Monthly Premium" },
            { key: "last_payment_status", label: "Payment" },
          ] : [
            { key: "full_name", label: "Name" },
            { key: "org_name", label: "Org" },
            { key: "di_type", label: "DI Type" },
            { key: "coverage_status", label: "Coverage Status" },
            { key: "stage", label: "Stage" },
            { key: "plan", label: "Coverage Plan" },
            { key: "effective_date", label: "Effective Date" },
            { key: "monthly_premium_cents", label: "Monthly Premium" },
            { key: "assigned_rep", label: "Assigned Rep" },
            { key: "last_payment_status", label: "Payment" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((i) => {
            const unpurchased = i.coverage_status === "not_started" || i.coverage_status === "in_progress";
            const n = parseInt(i.id.replace("ind_", ""), 10) || 1;
            if (isLTC) {
              const issue = issueTypeFor(i);
              const bclass = benefitClassFor(n);
              const ps = premiumStructureFor(n);
              return (
                <TRow key={i.id} onClick={() => navigate({ to: "/individuals/$id", params: { id: i.id } })}>
                  <TCell className="font-medium">
                    {i.full_name}
                    <div className="text-[10px] text-black/40">{i.email}</div>
                  </TCell>
                  <TCell>{i.org_name}</TCell>
                  <TCell>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${issue === "GI" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
                      {issue}
                    </span>
                  </TCell>
                  <TCell><StatusBadge map={COVERAGE_BADGE} value={i.coverage_status} /></TCell>
                  <TCell><StatusBadge map={STAGE_BADGE} value={i.stage} /></TCell>
                  <TCell className="text-[12px]">{bclass}</TCell>
                  <TCell className="text-[12px]">{premiumStructureLabel(ps)}</TCell>
                  <TCell className="text-right">{unpurchased ? "—" : formatFaceAmount(i.face_amount_cents)}</TCell>
                  <TCell>{unpurchased ? "—" : formatCents(i.monthly_premium_cents)}</TCell>
                  <TCell>{unpurchased ? <span className="text-black/40">—</span> : paymentBadge(i.last_payment_status, i.retry_count)}</TCell>
                </TRow>
              );
            }
            return (
              <TRow key={i.id} onClick={() => navigate({ to: "/individuals/$id", params: { id: i.id } })}>
                <TCell className="font-medium">
                  {i.full_name}
                  <div className="text-[10px] text-black/40">{i.email}</div>
                </TCell>
                <TCell>{i.org_name}</TCell>
                <TCell>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${i.di_type === "STD+LTD" ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-500"}`}>
                    {i.di_type === "STD+LTD" ? "STD+LTD" : "LTD Only"}
                  </span>
                </TCell>
                <TCell><StatusBadge map={COVERAGE_BADGE} value={i.coverage_status} /></TCell>
                <TCell><StatusBadge map={STAGE_BADGE} value={i.stage} /></TCell>
                <TCell>{unpurchased ? "—" : i.coverage_plan}</TCell>
                <TCell className={i.coverage_status === "in_progress" ? "text-black/40" : ""}>{formatDate(i.effective_date)}</TCell>
                <TCell>{unpurchased ? "—" : formatCents(i.monthly_premium_cents)}</TCell>
                <TCell>{i.assigned_rep ?? <span className="text-black/40">Unassigned</span>}</TCell>
                <TCell>{unpurchased ? <span className="text-black/40">—</span> : paymentBadge(i.last_payment_status, i.retry_count)}</TCell>
              </TRow>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={12} className="px-3 py-8 text-center text-black/40 text-xs">No individuals match the current filters.</td></tr>
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
