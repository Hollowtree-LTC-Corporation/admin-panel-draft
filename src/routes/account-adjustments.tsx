import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { ACCOUNT_ADJUSTMENTS, INDIVIDUALS, BILLING_GROUPS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/account-adjustments")({ component: View });

type SortKey = "individual_name" | "billing_group_id" | "adjustment_type" | "amount_cents" | "reason" | "effective_date" | "approved_by";

function View() {
  const can = usePermission();
  const { product } = useStore();
  const d = useDrawer();

  const [search, setSearch] = useState("");
  const [ind, setInd] = useState("all");
  const [type, setType] = useState("all");
  const [approver, setApprover] = useState("all");
  const sort = useSort<SortKey>("effective_date", "desc");

  const productInds = INDIVIDUALS.filter((i) => i.product === product);
  const indOptions = productInds.map((i) => ({ value: i.id, label: i.full_name }));
  const approvers = Array.from(new Set(ACCOUNT_ADJUSTMENTS.map((a) => a.approved_by))).map((v) => ({ value: v, label: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = ACCOUNT_ADJUSTMENTS.map((a) => {
      const indRec = INDIVIDUALS.find((i) => i.id === a.individual_id);
      return { ...a, _indRec: indRec, billing_group_id: indRec?.billing_group_id ?? "" };
    }).filter((a) => {
      if (!a._indRec || a._indRec.product !== product) return false;
      if (s && !(a.individual_name.toLowerCase().includes(s) || (a._indRec.email.toLowerCase().includes(s)))) return false;
      if (ind !== "all" && a.individual_id !== ind) return false;
      if (type !== "all" && a.adjustment_type !== type) return false;
      if (approver !== "all" && a.approved_by !== approver) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, ind, type, approver, sort, product]);

  const active = search !== "" || ind !== "all" || type !== "all" || approver !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setInd("all"); setType("all"); setApprover("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Account Adjustments"
        subtitle={`${rows.length} of ${ACCOUNT_ADJUSTMENTS.length} adjustments · immutable once created`}
        actions={
          <Btn variant="primary" disabled={!can("account_adjustments", "create") || !can("account_adjustments", "approve")} onClick={() => d.open()}>
            + New Adjustment
          </Btn>
        }
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or email…" />
        <FilterCombobox value={ind} onChange={setInd} placeholder="All individuals" options={indOptions} />
        <FilterSelect value={type} onChange={setType} allLabel="All types" options={[
          { value: "premium_correction" }, { value: "penalty_waiver" }, { value: "refund" }, { value: "write_off" },
        ]} />
        <FilterCombobox value={approver} onChange={setApprover} placeholder="All approvers" options={approvers} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={ACCOUNT_ADJUSTMENTS.length} resourceLabel="adjustments" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "individual_name", label: "Individual" },
            { key: "billing_group_id", label: "Group" },
            { key: "adjustment_type", label: "Type" },
            { key: "amount_cents", label: "Amount" },
            { key: "reason", label: "Reason" },
            { key: "effective_date", label: "Effective" },
            { key: "approved_by", label: "Approved By" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((a) => (
            <TRow key={a.id}>
              <TCell className="font-medium">{a.individual_name}</TCell>
              <TCell className="text-black/60">{a.billing_group_id || "—"}</TCell>
              <TCell className="capitalize">{a.adjustment_type.replace(/_/g, " ")}</TCell>
              <TCell className={a.amount_cents < 0 ? "text-rose-700" : ""}>{formatCents(a.amount_cents)}</TCell>
              <TCell className="text-black/70">{a.reason}</TCell>
              <TCell className="font-mono text-[11px]">{a.effective_date}</TCell>
              <TCell>{a.approved_by}</TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40 text-xs">No adjustments match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="New Account Adjustment">
        <Field label="Individual"><Input placeholder="Select individual…" /></Field>
        <Field label="Billing Group"><Input defaultValue={BILLING_GROUPS[0]?.id ?? ""} /></Field>
        <Field label="Adjustment Type"><Input defaultValue="premium_correction" /></Field>
        <Field label="Amount (cents)"><Input placeholder="-1500" /></Field>
        <Field label="Reason"><Input placeholder="Short justification" /></Field>
        <Field label="Effective Date"><Input defaultValue="2025-06-12" /></Field>
        <div className="text-[11px] text-black/50 mt-2 mb-3">Once created, this row is immutable.</div>
        <div className="flex gap-2">
          <Btn variant="primary" disabled={!can("account_adjustments", "approve")}>Create &amp; Approve</Btn>
          <Btn onClick={d.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
