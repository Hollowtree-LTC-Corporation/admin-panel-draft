import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill } from "@/components/wireframe/Bits";
import { PAYMENT_LEDGER, INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, FilterDate, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/payment-ledger")({ component: View });

type SortKey = "event_date" | "individual_name" | "billing_group_id" | "event_type" | "amount_cents" | "status" | "funding_source" | "contribution_source" | "coverage_type";

function ContributionSourceBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    voluntary: { label: "Voluntary", cls: "bg-black/5 text-black/70" },
    employer_paid: { label: "Employer", cls: "bg-sky-100 text-sky-800" },
    employee_buyup: { label: "Buy-up", cls: "bg-teal-100 text-teal-800" },
  };
  const m = map[value] ?? { label: value, cls: "bg-black/5 text-black/60" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function CoverageTypeBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-black/40">—</span>;
  const label = value === "STDLTD" ? "STD+LTD" : value;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">{label}</span>;
}

function View() {
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [ind, setInd] = useState("all");
  const [status, setStatus] = useState("all");
  const [ctype, setCtype] = useState("all");
  const [source, setSource] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sort = useSort<SortKey>("event_date", "desc");

  const productInds = INDIVIDUALS.filter((i) => i.product === product);
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const indOptions = productInds.map((i) => ({ value: i.id, label: i.full_name }));
  const chargeOptions = Array.from(new Set(PAYMENT_LEDGER.map((p) => p.event_type))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = PAYMENT_LEDGER.filter((p) => {
      const indRec = INDIVIDUALS.find((i) => i.id === p.enrollment_id);
      if (!indRec || indRec.product !== product) return false;
      if (s && !(p.individual_name.toLowerCase().includes(s) || (indRec?.email.toLowerCase().includes(s) ?? false))) return false;
      if (org !== "all" && indRec.organization_id !== org) return false;
      if (ind !== "all" && p.enrollment_id !== ind) return false;
      if (status !== "all" && p.status !== status) return false;
      if (ctype !== "all" && p.event_type !== ctype) return false;
      if (source !== "all" && p.contribution_source !== source) return false;
      if (product === "DI" && coverage !== "all" && p.coverage_type !== coverage) return false;
      if (from && p.event_date < from) return false;
      if (to && p.event_date > to) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, org, ind, status, ctype, source, coverage, from, to, sort, product]);

  const active = search !== "" || org !== "all" || ind !== "all" || status !== "all" || ctype !== "all" || source !== "all" || coverage !== "all" || from !== "" || to !== "" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setInd("all"); setStatus("all"); setCtype("all"); setSource("all"); setCoverage("all"); setFrom(""); setTo(""); sort.reset(); };

  const cols: { key: SortKey; label: string }[] = [
    { key: "event_date", label: "Date" },
    { key: "individual_name", label: "Individual" },
    { key: "billing_group_id", label: "Group" },
    { key: "event_type", label: "Charge Type" },
    { key: "amount_cents", label: "Amount" },
    { key: "funding_source", label: "Funding" },
    { key: "contribution_source", label: "Source" },
    ...(product === "DI" ? [{ key: "coverage_type" as SortKey, label: "Coverage" }] : []),
    { key: "status", label: "Status" },
  ];

  return (
    <div>
      <PageHeader
        title="Payment Ledger"
        subtitle={`${rows.length} entries (${product}) · read-only chronological history`}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or email…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterCombobox value={ind} onChange={setInd} placeholder="All individuals" options={indOptions} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[{ value: "successful", label: "Successful" }, { value: "failed", label: "Failed" }, { value: "pending", label: "Pending" }, { value: "reversed", label: "Reversed" }]} />
        <FilterSelect value={ctype} onChange={setCtype} allLabel="All charge types" options={chargeOptions} />
        <FilterSelect value={source} onChange={setSource} allLabel="All sources" options={[
          { value: "voluntary", label: "Voluntary" },
          { value: "employer_paid", label: "Employer" },
          { value: "employee_buyup", label: "Buy-up" },
        ]} />
        {product === "DI" && (
          <FilterSelect value={coverage} onChange={setCoverage} allLabel="All coverage" options={[
            { value: "STDLTD", label: "STD+LTD" },
            { value: "LTD", label: "LTD" },
          ]} />
        )}
        <FilterDate value={from} onChange={setFrom} />
        <span className="text-[11px] text-black/40">to</span>
        <FilterDate value={to} onChange={setTo} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={PAYMENT_LEDGER.length} resourceLabel="payments" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={cols}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-mono text-[11px]">{p.event_date}</TCell>
              <TCell>{p.individual_name}</TCell>
              <TCell className="text-black/60">{p.billing_group_id}</TCell>
              <TCell className="capitalize">{p.event_type.replace(/_/g, " ")}</TCell>
              <TCell>{formatCents(p.amount_cents)}</TCell>
              <TCell className="capitalize">{p.funding_source}</TCell>
              <TCell><ContributionSourceBadge value={p.contribution_source} /></TCell>
              {product === "DI" && <TCell><CoverageTypeBadge value={p.coverage_type} /></TCell>}
              <TCell><Pill tone={p.status === "successful" ? "ok" : p.status === "failed" ? "bad" : "info"}>{p.status}</Pill></TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-black/40 text-xs">No payments match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
