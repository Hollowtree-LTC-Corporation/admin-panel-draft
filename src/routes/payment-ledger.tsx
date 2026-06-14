import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill } from "@/components/wireframe/Bits";
import { PAYMENT_LEDGER, INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, FilterDate, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/payment-ledger")({ component: View });

type SortKey = "date" | "individual_name" | "billing_group_id" | "charge_type" | "amount_cents" | "status" | "funding_source";

function View() {
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [ind, setInd] = useState("all");
  const [status, setStatus] = useState("all");
  const [ctype, setCtype] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sort = useSort<SortKey>("date", "desc");

  const productInds = INDIVIDUALS.filter((i) => i.product === product);
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const indOptions = productInds.map((i) => ({ value: i.id, label: i.full_name }));
  const chargeOptions = Array.from(new Set(PAYMENT_LEDGER.map((p) => p.charge_type))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = PAYMENT_LEDGER.filter((p) => {
      const indRec = INDIVIDUALS.find((i) => i.id === p.individual_id);
      if (!indRec || indRec.product !== product) return false;
      if (s && !(p.individual_name.toLowerCase().includes(s) || (indRec?.email.toLowerCase().includes(s) ?? false))) return false;
      if (org !== "all" && indRec.org_id !== org) return false;
      if (ind !== "all" && p.individual_id !== ind) return false;
      if (status !== "all" && p.status !== status) return false;
      if (ctype !== "all" && p.charge_type !== ctype) return false;
      if (from && p.date < from) return false;
      if (to && p.date > to) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, org, ind, status, ctype, from, to, sort, product]);

  const active = search !== "" || org !== "all" || ind !== "all" || status !== "all" || ctype !== "all" || from !== "" || to !== "" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setInd("all"); setStatus("all"); setCtype("all"); setFrom(""); setTo(""); sort.reset(); };

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
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[{ value: "successful" }, { value: "failed" }, { value: "pending" }]} />
        <FilterSelect value={ctype} onChange={setCtype} allLabel="All charge types" options={chargeOptions} />
        <FilterDate value={from} onChange={setFrom} />
        <span className="text-[11px] text-black/40">to</span>
        <FilterDate value={to} onChange={setTo} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "date", label: "Date" },
            { key: "individual_name", label: "Individual" },
            { key: "billing_group_id", label: "Group" },
            { key: "charge_type", label: "Charge Type" },
            { key: "amount_cents", label: "Amount" },
            { key: "status", label: "Status" },
            { key: "funding_source", label: "Funding" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-mono text-[11px]">{p.date}</TCell>
              <TCell>{p.individual_name}</TCell>
              <TCell className="text-black/60">{p.billing_group_id}</TCell>
              <TCell className="capitalize">{p.charge_type.replace(/_/g, " ")}</TCell>
              <TCell>{formatCents(p.amount_cents)}</TCell>
              <TCell><Pill tone={p.status === "successful" ? "ok" : p.status === "failed" ? "bad" : "info"}>{p.status}</Pill></TCell>
              <TCell className="capitalize">{p.funding_source}</TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40 text-xs">No payments match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
