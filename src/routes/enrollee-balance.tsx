import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Card, SectionTitle } from "@/components/wireframe/Bits";
import { INDIVIDUALS, ORGS, PAYMENT_LEDGER, ACCOUNT_ADJUSTMENTS, formatCents } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/enrollee-balance")({ component: View });

type SortKey = "name" | "email" | "charges" | "paid" | "adjusted" | "balance";

function View() {
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [balStatus, setBalStatus] = useState("all");
  const sort = useSort<SortKey>("balance", "asc");

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const inds = INDIVIDUALS.filter((i) => i.product === product);

  const computed = useMemo(() => inds.slice(0, 12).map((i) => {
    const payments = PAYMENT_LEDGER.filter((p) => p.individual_id === i.id && p.status === "successful");
    const adjustments = ACCOUNT_ADJUSTMENTS.filter((a) => a.individual_id === i.id);
    const charges = i.monthly_premium_cents * 3;
    const paid = payments.reduce((s, p) => s + p.amount_cents, 0);
    const adjusted = adjustments.reduce((s, a) => s + a.amount_cents, 0);
    const balance = charges - paid + adjusted;
    return { i, name: i.full_name, email: i.email, charges, paid, adjusted, balance };
  }), [inds]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const f = computed.filter((r) => {
      if (s && !(r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s))) return false;
      if (org !== "all" && r.i.org_id !== org) return false;
      if (balStatus !== "all") {
        if (balStatus === "positive" && r.balance <= 0) return false;
        if (balStatus === "zero" && r.balance !== 0) return false;
        if (balStatus === "negative" && r.balance >= 0) return false;
      }
      return true;
    });
    return sort.applySort(f, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [computed, search, org, balStatus, sort]);

  const active = search !== "" || org !== "all" || balStatus !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setBalStatus("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Enrollee Balance"
        subtitle={`${filtered.length} of ${computed.length} · charges − successful payments + adjustments`}
      />

      <SectionTitle>Worked example (first row)</SectionTitle>
      <Card className="p-4 grid grid-cols-4 text-sm">
        <div><div className="text-[10px] uppercase text-black/50">Charges</div><div className="font-mono">{formatCents(computed[0].charges)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">− Successful payments</div><div className="font-mono">{formatCents(computed[0].paid)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">+ Adjustments</div><div className="font-mono">{formatCents(computed[0].adjusted)}</div></div>
        <div><div className="text-[10px] uppercase text-black/50">= Net Balance</div><div className="font-mono font-semibold">{formatCents(computed[0].balance)}</div></div>
      </Card>

      <SectionTitle>Per-individual balance</SectionTitle>
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or email…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={balStatus} onChange={setBalStatus} allLabel="All balances" options={[
          { value: "positive" }, { value: "zero" }, { value: "negative" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Individual" },
            { key: "email", label: "Email" },
            { key: "charges", label: "Total Charged" },
            { key: "paid", label: "Payments" },
            { key: "adjusted", label: "Total Adjustments" },
            { key: "balance", label: "Net Balance" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((r) => (
            <TRow key={r.i.id}>
              <TCell className="font-medium">{r.name}</TCell>
              <TCell className="text-black/60">{r.email}</TCell>
              <TCell className="font-mono">{formatCents(r.charges)}</TCell>
              <TCell className="font-mono text-emerald-700">−{formatCents(r.paid)}</TCell>
              <TCell className="font-mono">{formatCents(r.adjusted)}</TCell>
              <TCell className={`font-mono font-semibold ${r.balance > 0 ? "text-rose-700" : "text-black/70"}`}>{formatCents(r.balance)}</TCell>
            </TRow>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-black/40 text-xs">No enrollees match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
