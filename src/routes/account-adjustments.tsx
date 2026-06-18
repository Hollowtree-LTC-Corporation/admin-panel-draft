import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { ACCOUNT_ADJUSTMENTS, INDIVIDUALS, BILLING_GROUPS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/account-adjustments")({ component: View });

type SortKey = "individual_name" | "billing_group_id" | "adjustment_type" | "amount_cents" | "reason" | "effective_date" | "applied_to_next_charge" | "approved_by";

const ADJ_TYPES = ["premium_correction", "penalty_waiver", "refund", "write_off", "other"] as const;
const ADJ_TYPE_LABELS: Record<typeof ADJ_TYPES[number], string> = {
  premium_correction: "Premium Correction",
  penalty_waiver: "Penalty Waiver",
  refund: "Refund",
  write_off: "Write-off",
  other: "Other",
};

type Adjustment = typeof ACCOUNT_ADJUSTMENTS[number];

function View() {
  const can = usePermission();
  const { product, role } = useStore();
  const d = useDrawer<Adjustment>();

  const [search, setSearch] = useState("");
  const [ind, setInd] = useState("all");
  const [type, setType] = useState("all");
  const [approver, setApprover] = useState("all");
  const sort = useSort<SortKey>("effective_date", "desc");

  const [appliedDraft, setAppliedDraft] = useState<boolean>(true);
  const isAdmin = role === "admin";

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

  const openRow = (a: Adjustment) => {
    setAppliedDraft(a.applied_to_next_charge);
    d.open(a);
  };
  const openNew = () => {
    setAppliedDraft(true);
    d.open();
  };

  const drawerAdj = d.state.data;

  return (
    <div>
      <PageHeader
        title="Account Adjustments"
        subtitle={`${rows.length} of ${ACCOUNT_ADJUSTMENTS.length} adjustments · immutable once created`}
        actions={
          <Btn variant="primary" disabled={!can("account_adjustments", "create") || !can("account_adjustments", "approve")} onClick={openNew}>
            + New Adjustment
          </Btn>
        }
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or email…" />
        <FilterCombobox value={ind} onChange={setInd} placeholder="All individuals" options={indOptions} />
        <FilterSelect value={type} onChange={setType} allLabel="All types" options={[
          { value: "premium_correction", label: "Premium Correction" }, { value: "penalty_waiver", label: "Penalty Waiver" }, { value: "refund", label: "Refund" }, { value: "write_off", label: "Write-off" }, { value: "other", label: "Other" },
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
            { key: "applied_to_next_charge", label: "Applied" },
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
            <TRow key={a.id} onClick={() => openRow(a)}>
              <TCell className="font-medium">{a.individual_name}</TCell>
              <TCell className="text-black/60">{a.billing_group_id || "—"}</TCell>
              <TCell className="capitalize">{a.adjustment_type.replace(/_/g, " ")}</TCell>
              <TCell className={a.amount_cents < 0 ? "text-rose-700" : ""}>{formatCents(a.amount_cents)}</TCell>
              <TCell>
                {a.applied_to_next_charge
                  ? <Check className="h-4 w-4 text-emerald-600" aria-label="Applied to balance" />
                  : <Minus className="h-4 w-4 text-black/30" aria-label="Not applied" />}
              </TCell>
              <TCell className="text-black/70">{a.reason}</TCell>
              <TCell className="font-mono text-[11px]">{a.effective_date}</TCell>
              <TCell>{a.approved_by}</TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-black/40 text-xs">No adjustments match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title={drawerAdj ? `Adjustment · ${drawerAdj.individual_name}` : "New Account Adjustment"}>
        <Field label="Individual">
          {drawerAdj ? <div className="text-sm py-1">{drawerAdj.individual_name}</div> : <Input placeholder="Select individual…" />}
        </Field>
        <Field label="Billing Group">
          {drawerAdj
            ? <div className="text-sm py-1 font-mono text-[11px]">{INDIVIDUALS.find((i) => i.id === drawerAdj.individual_id)?.billing_group_id ?? "—"}</div>
            : <Input defaultValue={BILLING_GROUPS[0]?.id ?? ""} />}
        </Field>
        <Field label="Adjustment Type">
          {drawerAdj
            ? <div className="text-sm py-1 capitalize">{drawerAdj.adjustment_type.replace(/_/g, " ")}</div>
            : (
              <select defaultValue="premium_correction" className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
                {ADJ_TYPES.map((t) => <option key={t} value={t}>{ADJ_TYPE_LABELS[t]}</option>)}
              </select>
            )}
        </Field>
        <Field label="Amount (cents)">
          {drawerAdj
            ? <div className={`text-sm py-1 ${drawerAdj.amount_cents < 0 ? "text-rose-700" : ""}`}>{formatCents(drawerAdj.amount_cents)}</div>
            : <Input placeholder="-1500" />}
        </Field>
        <Field label="Reason">
          {drawerAdj ? <div className="text-sm py-1">{drawerAdj.reason}</div> : <Input placeholder="Short justification" />}
        </Field>
        <Field label="Notes">
          {drawerAdj
            ? <div className="text-sm py-1 text-black/70 whitespace-pre-wrap">{drawerAdj.notes || <span className="text-black/40">—</span>}</div>
            : <textarea placeholder="Internal notes (optional)..." className="w-full px-2 py-1 text-sm border border-black/15 rounded min-h-[60px]" />}
        </Field>
        <Field label="Effective Date">
          {drawerAdj ? <div className="text-sm py-1 font-mono text-[11px]">{drawerAdj.effective_date}</div> : <Input defaultValue="2025-06-12" />}
        </Field>

        <div className="mt-3 mb-3 pt-3 border-t border-black/10">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={appliedDraft}
              onChange={(e) => setAppliedDraft(e.target.checked)}
              disabled={!isAdmin}
            />
            <span className="font-medium">Applied to Balance</span>
          </label>
          <div className="text-[11px] text-black/50 mt-1 ml-6 leading-snug">
            When checked, this adjustment is included in the enrollee's balance calculation.
          </div>
          {!isAdmin && (
            <div className="text-[11px] text-amber-700 mt-1 ml-6">Admin role required to change this flag.</div>
          )}
        </div>

        {!drawerAdj && (
          <div className="text-[11px] text-black/50 mt-2 mb-3">Once created, this row is immutable.</div>
        )}
        <div className="flex gap-2">
          {drawerAdj ? (
            <>
              <Btn variant="primary" disabled={!isAdmin}>Save</Btn>
              <Btn onClick={d.close}>Close</Btn>
            </>
          ) : (
            <>
              <Btn variant="primary" disabled={!can("account_adjustments", "approve")}>Create &amp; Approve</Btn>
              <Btn onClick={d.close}>Cancel</Btn>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
}
