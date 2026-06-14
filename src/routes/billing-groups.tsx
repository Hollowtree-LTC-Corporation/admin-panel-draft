import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn } from "@/components/wireframe/Bits";
import { BILLING_GROUPS, INDIVIDUALS, ORGS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/billing-groups")({ component: View });

type SortKey = "name" | "individuals_count" | "payment_method" | "moov_account_id";

function View() {
  const can = usePermission();
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [pm, setPm] = useState("all");
  const sort = useSort<SortKey>("name", "asc");

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const pmOptions = Array.from(new Set(BILLING_GROUPS.map((g) => g.payment_method))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = BILLING_GROUPS.filter((g) => {
      const members = INDIVIDUALS.filter((i) => i.billing_group_id === g.id);
      if (s) {
        const inGroup = g.name.toLowerCase().includes(s) || g.id.toLowerCase().includes(s) || members.some((m) => m.full_name.toLowerCase().includes(s));
        if (!inGroup) return false;
      }
      if (org !== "all" && !members.some((m) => m.org_id === org)) return false;
      if (pm !== "all" && g.payment_method !== pm) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, org, pm, sort]);

  const active = search !== "" || org !== "all" || pm !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setPm("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Billing Groups"
        subtitle={`${rows.length} of ${BILLING_GROUPS.length} billing groups`}
        actions={<Btn variant="primary" disabled={!can("billing_groups", "create")}>+ New Group</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search group or member…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={pm} onChange={setPm} allLabel="All payment methods" options={pmOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Group" },
            { key: "individuals_count", label: "# Individuals" },
            { key: "payment_method", label: "Payment Method" },
            { key: "moov_account_id", label: "Moov Account" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((g) => {
            const members = INDIVIDUALS.filter((i) => i.billing_group_id === g.id).slice(0, 3);
            return (
              <TRow key={g.id}>
                <TCell className="font-medium">{g.name}</TCell>
                <TCell>
                  {g.individuals_count} · <span className="text-black/50 text-[11px]">{members.map((m) => m.full_name).join(", ")}{g.individuals_count > 3 ? "…" : ""}</span>
                </TCell>
                <TCell>{g.payment_method}</TCell>
                <TCell className="font-mono text-[11px]">{g.moov_account_id}</TCell>
                <TCell>
                  <Btn disabled={!can("billing_groups", "update")} title="Separating a member creates a new billing group">Separate member</Btn>
                </TCell>
              </TRow>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-black/40 text-xs">No billing groups match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
