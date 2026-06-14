import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Card, SectionTitle } from "@/components/wireframe/Bits";
import {
  CHANNEL_PARTNERS, COMMISSION_SPLIT_DEFAULTS, POLICY_SPLITS, COMMISSION_STATEMENTS,
  CARRIER_COMMISSION_SCHEDULES, COMMISSION_RATE_TIERS, POLICIES, formatCents,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/commission")({ component: View });

type PartnerSortKey = "name" | "partner_type" | "default_split_pct" | "payment_method";
type StmtSortKey = "payee" | "period" | "amount_cents" | "payable";

function View() {
  const { product } = useStore();
  const can = usePermission();
  const splitTotal = POLICY_SPLITS.reduce((s, p) => s + p.pct, 0);
  const totalOk = splitTotal === 100;

  // Channel partners filters
  const [pSearch, setPSearch] = useState("");
  const [pType, setPType] = useState("all");
  const [pPayment, setPPayment] = useState("all");
  const pSort = useSort<PartnerSortKey>("name", "asc");
  const partners = useMemo(() => {
    const s = pSearch.trim().toLowerCase();
    const f = CHANNEL_PARTNERS.filter((p) => {
      if (s && !p.name.toLowerCase().includes(s)) return false;
      if (pType !== "all" && p.partner_type !== pType) return false;
      if (pPayment !== "all" && p.payment_method !== pPayment) return false;
      return true;
    });
    return pSort.applySort(f, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [pSearch, pType, pPayment, pSort]);
  const pActive = pSearch !== "" || pType !== "all" || pPayment !== "all" || !pSort.isDefault;
  const pClear = () => { setPSearch(""); setPType("all"); setPPayment("all"); pSort.reset(); };

  // Statement filters
  const [sPayee, setSPayee] = useState("all");
  const [sPeriod, setSPeriod] = useState("all");
  const [sPayable, setSPayable] = useState("all");
  const sSort = useSort<StmtSortKey>("period", "desc");
  const payeeOptions = Array.from(new Set(COMMISSION_STATEMENTS.map((s) => s.payee))).map((v) => ({ value: v, label: v }));
  const periodOptions = Array.from(new Set(COMMISSION_STATEMENTS.map((s) => s.period))).map((v) => ({ value: v }));
  const statements = useMemo(() => {
    const f = COMMISSION_STATEMENTS.filter((s) => {
      if (sPayee !== "all" && s.payee !== sPayee) return false;
      if (sPeriod !== "all" && s.period !== sPeriod) return false;
      if (sPayable === "payable" && !s.payable) return false;
      if (sPayable === "carrier_direct" && s.payable) return false;
      return true;
    });
    return sSort.applySort(f, (r, k) => (r as unknown as Record<string, string | number | boolean>)[k] as string | number);
  }, [sPayee, sPeriod, sPayable, sSort]);
  const sActive = sPayee !== "all" || sPeriod !== "all" || sPayable !== "all" || !sSort.isDefault;
  const sClear = () => { setSPayee("all"); setSPeriod("all"); setSPayable("all"); sSort.reset(); };

  return (
    <div>
      <PageHeader title="Commission" subtitle={`${product} commission configuration · waterfall must sum to 100%`} />

      <SectionTitle>Channel Partners</SectionTitle>
      <div className="flex justify-end mb-2"><Btn variant="primary" disabled={!can("channel_partners", "create")}>+ New Channel Partner</Btn></div>
      <FilterRow>
        <FilterSearch value={pSearch} onChange={setPSearch} placeholder="Search partner name…" />
        <FilterSelect value={pType} onChange={setPType} allLabel="All types" options={[
          { value: "Broker" }, { value: "House" }, { value: "Internal" }, { value: "Override" },
        ]} />
        <FilterSelect value={pPayment} onChange={setPPayment} allLabel="All payment methods" options={[
          { value: "hollowtree_paid", label: "Hollowtree Paid" }, { value: "carrier_direct", label: "Carrier Direct" },
        ]} />
        <ClearFiltersLink show={pActive} onClick={pClear} />
      </FilterRow>
      <TableShell>
        <SortableTHead<PartnerSortKey>
          cols={[
            { key: "name", label: "Name" },
            { key: "partner_type", label: "Type" },
            { key: "default_split_pct", label: "Default Split %" },
            { key: "payment_method", label: "Payment Method" },
          ]}
          sortKey={pSort.sortKey}
          sortDir={pSort.sortDir}
          onToggle={pSort.toggle}
        />
        <tbody>
          {partners.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-medium">{p.name}</TCell>
              <TCell><Pill tone={p.partner_type === "House" ? "info" : p.partner_type === "Internal" ? "ok" : "neutral"}>{p.partner_type}</Pill></TCell>
              <TCell>{p.default_split_pct}%</TCell>
              <TCell className="capitalize">{p.payment_method.replace(/_/g, " ")}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Commission Split Defaults</SectionTitle>
      <TableShell>
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>
            {["Channel Partner", "Payee Type", "Default %", "Payment Method"].map((c) => (
              <th key={c} className="text-left font-medium px-3 py-2">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMMISSION_SPLIT_DEFAULTS.map((d) => (
            <TRow key={d.id}>
              <TCell>{d.channel_partner_name}</TCell>
              <TCell className="capitalize">{d.payee_type.replace(/_/g, " ")}</TCell>
              <TCell>{d.default_split_pct}%</TCell>
              <TCell className="capitalize">{d.payment_method.replace(/_/g, " ")}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Per-Policy Splits — Policy pol_1 (Acme Widgets Co)</SectionTitle>
      <Card className="p-3">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["Payee", "% Split"].map((c) => (<th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}</tr>
          </thead>
          <tbody>
            {POLICY_SPLITS.map((s) => (
              <TRow key={s.id}>
                <TCell>{s.channel_partner_name}</TCell>
                <TCell>{s.pct}%</TCell>
              </TRow>
            ))}
            <tr className={`border-t ${totalOk ? "bg-emerald-50" : "bg-rose-50"}`}>
              <TCell className="font-semibold">Total</TCell>
              <TCell className={`font-semibold ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>{splitTotal}% {totalOk ? "✓" : "≠ 100"}</TCell>
            </tr>
          </tbody>
        </table>
      </Card>

      <SectionTitle>Commission Statements (read-only)</SectionTitle>
      <FilterRow>
        <FilterCombobox value={sPayee} onChange={setSPayee} placeholder="All payees" options={payeeOptions} />
        <FilterSelect value={sPeriod} onChange={setSPeriod} allLabel="All periods" options={periodOptions} />
        <FilterSelect value={sPayable} onChange={setSPayable} allLabel="All" options={[
          { value: "payable" }, { value: "carrier_direct" },
        ]} />
        <ClearFiltersLink show={sActive} onClick={sClear} />
      </FilterRow>
      <TableShell>
        <SortableTHead<StmtSortKey>
          cols={[
            { key: "payee", label: "Payee" },
            { key: "period", label: "Period" },
            { key: "amount_cents", label: "Amount" },
            { key: "payable", label: "Payable" },
          ]}
          sortKey={sSort.sortKey}
          sortDir={sSort.sortDir}
          onToggle={sSort.toggle}
        />
        <tbody>
          {statements.map((s) => (
            <TRow key={s.id}>
              <TCell className="font-medium">{s.payee}</TCell>
              <TCell>{s.period}</TCell>
              <TCell>{formatCents(s.amount_cents)}</TCell>
              <TCell>{s.payable ? <Pill tone="ok">payable</Pill> : <Pill tone="neutral">carrier_direct</Pill>}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      {product === "LTC" ? (
        <>
          <SectionTitle>Carrier Commission Schedules (LTC)</SectionTitle>
          <TableShell>
            <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
              <tr>{["Carrier Product", "State", "Tier Bands"].map((c) => (<th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}</tr>
            </thead>
            <tbody>
              {CARRIER_COMMISSION_SCHEDULES.map((s) => {
                const tiers = COMMISSION_RATE_TIERS.filter((t) => t.schedule_id === s.id);
                return (
                  <TRow key={s.id}>
                    <TCell className="font-medium">{s.carrier_product_name}</TCell>
                    <TCell>{s.state_code ?? "—"}</TCell>
                    <TCell>
                      <div className="flex flex-wrap gap-1">
                        {tiers.map((t) => (
                          <span key={t.id} className="px-1.5 py-0.5 rounded bg-[#f7f3eb] border border-black/10 text-[11px]">
                            Y{t.year_from}{t.year_to !== t.year_from ? `-${t.year_to}` : ""}: {t.pct}%
                          </span>
                        ))}
                      </div>
                    </TCell>
                  </TRow>
                );
              })}
            </tbody>
          </TableShell>
        </>
      ) : (
        <>
          <SectionTitle>Per-Policy Commission Rates (DI)</SectionTitle>
          <TableShell>
            <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
              <tr>{["Policy", "Org", "Carrier Commission %", "Override %"].map((c) => (<th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}</tr>
            </thead>
            <tbody>
              {POLICIES.filter((p) => p.product === "DI").map((p) => (
                <TRow key={p.id}>
                  <TCell className="font-mono text-[11px]">{p.id}</TCell>
                  <TCell>{p.org_name}</TCell>
                  <TCell>{p.carrier_commission_pct}%</TCell>
                  <TCell>{p.override_pct}%</TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  );
}
