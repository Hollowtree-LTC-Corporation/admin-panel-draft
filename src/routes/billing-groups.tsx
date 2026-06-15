import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, useDrawer, Field, Input, Pill, SectionTitle, statusTone } from "@/components/wireframe/Bits";
import { BILLING_GROUPS, INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/billing-groups")({ component: View });

type SortKey = "name" | "org_name" | "individuals_count" | "payment_method" | "moov_account_id";
type BG = typeof BILLING_GROUPS[number];

function resolveOrgForGroup(groupId: string) {
  const member = INDIVIDUALS.find((i) => i.billing_group_id === groupId);
  if (!member) return null;
  return ORGS.find((o) => o.id === member.org_id) ?? null;
}

function View() {
  const can = usePermission();
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [pm, setPm] = useState("all");
  const sort = useSort<SortKey>("name", "asc");

  const detail = useDrawer<BG>();
  const create = useDrawer();
  const [newPm, setNewPm] = useState<"ACH" | "Card">("ACH");

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const pmOptions = Array.from(new Set(BILLING_GROUPS.map((g) => g.payment_method))).map((v) => ({ value: v }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = BILLING_GROUPS.map((g) => {
      const resolvedOrg = resolveOrgForGroup(g.id);
      return { ...g, org_name: resolvedOrg?.name ?? "—", _org_id: resolvedOrg?.id ?? null };
    }).filter((g) => {
      const members = INDIVIDUALS.filter((i) => i.billing_group_id === g.id);
      if (s) {
        const inGroup = g.name.toLowerCase().includes(s) || g.id.toLowerCase().includes(s) || members.some((m) => m.full_name.toLowerCase().includes(s)) || g.org_name.toLowerCase().includes(s);
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

  const detailGroup = detail.state.data;
  const detailMembers = detailGroup ? INDIVIDUALS.filter((i) => i.billing_group_id === detailGroup.id) : [];
  const detailOrg = detailGroup ? resolveOrgForGroup(detailGroup.id) : null;

  return (
    <div>
      <PageHeader
        title="Billing Groups"
        subtitle={`${rows.length} of ${BILLING_GROUPS.length} billing groups`}
        actions={<Btn variant="primary" disabled={!can("billing_groups", "create")} onClick={() => create.open()}>+ New Group</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search group, org or member…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={pm} onChange={setPm} allLabel="All payment methods" options={pmOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={BILLING_GROUPS.length} resourceLabel="billing groups" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Group" },
            { key: "org_name", label: "Org" },
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
              <TRow key={g.id} onClick={() => detail.open(g)}>
                <TCell className="font-medium">{g.name}</TCell>
                <TCell className="text-black/70">{g.org_name}</TCell>
                <TCell>
                  {g.individuals_count} · <span className="text-black/50 text-[11px]">{members.map((m) => m.full_name).join(", ")}{g.individuals_count > 3 ? "…" : ""}</span>
                </TCell>
                <TCell>{g.payment_method_display_label ?? g.payment_method}</TCell>
                <TCell className="font-mono text-[11px]">{g.moov_account_id}</TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  <Btn disabled={!can("billing_groups", "update")} title="Separating a member creates a new billing group">Separate member</Btn>
                </TCell>
              </TRow>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-black/40 text-xs">No billing groups match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* Detail drawer */}
      <Drawer open={detail.state.open} onClose={detail.close} title={detailGroup ? `Billing Group — ${detailGroup.name}` : "Billing Group"}>
        {detailGroup && (
          <>
            <SectionTitle>Group Info</SectionTitle>
            <Field label="Group Name"><div className="text-sm">{detailGroup.name}</div></Field>
            <Field label="Organization"><div className="text-sm">{detailOrg?.name ?? "—"}</div></Field>
            <Field label="Member Count"><div className="text-sm">{detailMembers.length}</div></Field>

            <SectionTitle>Payment Method</SectionTitle>
            <Field label="Payment Method"><Pill tone="info">{detailGroup.payment_method}</Pill></Field>
            <Field label="Display Label">
              <Input defaultValue={detailGroup.payment_method_display_label ?? ""} placeholder="e.g., Chase ending 4242" />
            </Field>
            <Field label="Moov Account"><div className="font-mono text-[11px]">{detailGroup.moov_account_id}</div></Field>

            <SectionTitle>Members</SectionTitle>
            <div className="border border-black/10 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                  <tr>
                    <th className="text-left font-medium px-2 py-1.5">Name</th>
                    <th className="text-left font-medium px-2 py-1.5">Email</th>
                    <th className="text-left font-medium px-2 py-1.5">Coverage Status</th>
                    <th className="text-left font-medium px-2 py-1.5">Monthly Premium</th>
                    <th className="text-left font-medium px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {detailMembers.map((m) => (
                    <tr key={m.id} className="border-t border-black/5">
                      <td className="px-2 py-1.5 font-medium">{m.full_name}</td>
                      <td className="px-2 py-1.5 text-black/60">{m.email}</td>
                      <td className="px-2 py-1.5"><Pill tone={statusTone(m.coverage_status)}>{m.coverage_status}</Pill></td>
                      <td className="px-2 py-1.5">{formatCents(m.monthly_premium_cents)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <Btn disabled={!can("billing_groups", "update")}>Remove from group</Btn>
                      </td>
                    </tr>
                  ))}
                  {detailMembers.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-black/40">No members in this group.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <Btn disabled={!can("billing_groups", "update")}>+ Add Member</Btn>
            </div>

            <div className="flex gap-2 mt-6">
              <Btn variant="primary" disabled={!can("billing_groups", "update")}>Save</Btn>
              <Btn onClick={detail.close}>Cancel</Btn>
            </div>
          </>
        )}
      </Drawer>

      {/* Create drawer */}
      <Drawer open={create.state.open} onClose={create.close} title="New Billing Group">
        <Field label="Organization *">
          <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" defaultValue="">
            <option value="" disabled>Select organization…</option>
            {orgOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Group Name"><Input placeholder="Auto-generated if blank (e.g., Billing Group N)" /></Field>
        <Field label="Payment Method *">
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="pm" checked={newPm === "ACH"} onChange={() => setNewPm("ACH")} /> ACH
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="pm" checked={newPm === "Card"} onChange={() => setNewPm("Card")} /> Card
            </label>
          </div>
        </Field>
        <Field label="Display Label"><Input placeholder="e.g., Chase ending 4242" /></Field>
        <Field label="Initial Members">
          <select multiple className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white min-h-[80px]">
            {INDIVIDUALS.slice(0, 20).map((i) => <option key={i.id} value={i.id}>{i.full_name}</option>)}
          </select>
        </Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("billing_groups", "create")}>Create Group</Btn>
          <Btn onClick={create.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
