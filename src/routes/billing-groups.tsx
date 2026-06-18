import { useMemo, useRef, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MoreVertical, Copy, HelpCircle, AlertTriangle } from "lucide-react";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, useDrawer, Field, Pill, SectionTitle, statusTone } from "@/components/wireframe/Bits";
import { BILLING_GROUPS, INDIVIDUALS, ORGS, PAYMENT_LEDGER, MAGIC_TOKENS, formatCents, type BillingGroup, type BillingGroupStatus } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/billing-groups")({ component: View });

type SortKey = "name" | "org_name" | "individuals_count" | "payment_method" | "status" | "moov_account_id";
type BG = BillingGroup & { org_name: string };

const STATUS_LABELS: Record<BillingGroupStatus, string> = {
  pending: "Pending Setup",
  active: "Active",
  suspended: "Suspended",
  terminated: "Terminated",
};
function statusPillTone(s: BillingGroupStatus): "ok" | "warn" | "neutral" | "bad" | "amber" {
  if (s === "active") return "ok";
  if (s === "pending") return "amber";
  if (s === "suspended") return "neutral";
  return "bad";
}
function pmTypeLabel(t: BillingGroup["payment_method_type"], last4?: string | null): string {
  if (!t) return "No payment method";
  if (t === "ach") return "Bank Account (ACH)";
  if (t === "card") return last4 ? `Card ending ${last4}` : "Card";
  return "Apple Pay";
}
// Short label for the filter dropdown (group multiple cards together).
function pmTypeFilterLabel(t: BillingGroup["payment_method_type"]): string {
  if (!t) return "—";
  if (t === "ach") return "ACH";
  if (t === "card") return "Card";
  return "Apple Pay";
}

function copyText(s: string | null | undefined) {
  if (!s) return;
  navigator.clipboard?.writeText(s).then(
    () => toast.success("Copied"),
    () => toast.error("Could not copy")
  );
}

function CopyChip({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-black/40">—</span>;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
      {value}
      <button onClick={(e) => { e.stopPropagation(); copyText(value); }} className="text-black/40 hover:text-black/70" title="Copy">
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}

function HelpPopover({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative inline-block ml-1 align-middle">
      <button onClick={() => setOpen((v) => !v)} className="text-black/40 hover:text-black/70" aria-label="What is a billing group?">
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-80 bg-white border border-black/15 rounded shadow-lg p-3 text-xs text-black/70 leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

function ActionMenu({ items }: { items: Array<{ label: string; onClick: () => void; danger?: boolean; disabled?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  if (items.length === 0) return null;
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded hover:bg-black/5 text-black/60"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 bg-white border border-black/15 rounded shadow-lg py-1">
          {items.map((it, idx) => (
            <button
              key={idx}
              disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f7f3eb] disabled:opacity-40 disabled:cursor-not-allowed ${it.danger ? "text-rose-700" : ""}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtTs(s: string): string {
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function View() {
  const can = usePermission();
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [pm, setPm] = useState("all");
  const [status, setStatus] = useState<BillingGroupStatus | "all">("all");
  const sort = useSort<SortKey>("name", "asc");

  const detail = useDrawer<BG>();
  // separation modal state
  const [sepGroup, setSepGroup] = useState<BG | null>(null);
  const [sepMemberId, setSepMemberId] = useState<string | null>(null);

  // Reactive store of separated groups so the list refreshes after spouse separation.
  type Override = { departingId: string; newGroupId: string; createdAt: string };
  const [separations, setSeparations] = useState<Override[]>([]);

  const orgsByProduct = useMemo(() => ORGS.filter((o) => o.product === product), [product]);
  const orgIds = useMemo(() => new Set(orgsByProduct.map((o) => o.id)), [orgsByProduct]);

  // Build a working list of billing groups: base + any synthesized via separation.
  const workingGroups: BG[] = useMemo(() => {
    const base: BG[] = BILLING_GROUPS.map((g) => {
      const o = ORGS.find((x) => x.id === g.organization_id);
      return { ...g, org_name: o?.name ?? "—" };
    });
    for (const sep of separations) {
      // The new group already won't be in BILLING_GROUPS — synth it
      const departing = INDIVIDUALS.find((i) => i.id === sep.departingId);
      if (!departing) continue;
      base.push({
        id: sep.newGroupId,
        name: `Billing Group ${sep.newGroupId.split("_")[1]}`,
        organization_id: departing.organization_id,
        org_name: ORGS.find((o) => o.id === departing.organization_id)?.name ?? "—",
        primary_individual_id: departing.id,
        status: "pending",
        moov_account_id: null,
        payment_method_id: null,
        payment_method_type: null,
        payment_method_display_label: null,
        payment_method: "—",
        plaid_institution: null,
        card_last4: null,
        created_at: sep.createdAt,
        updated_at: sep.createdAt,
        individuals_count: 1,
      });
    }
    return base;
  }, [separations]);

  // Effective membership: account for separations (departing ind moves to new group).
  const memberMap = useMemo(() => {
    const sepMap: Record<string, string> = {};
    for (const s of separations) sepMap[s.departingId] = s.newGroupId;
    const m: Record<string, typeof INDIVIDUALS> = {};
    for (const ind of INDIVIDUALS) {
      const gid = sepMap[ind.id] ?? ind.billing_group_id;
      if (!gid) continue;
      (m[gid] ||= []).push(ind);
    }
    return m;
  }, [separations]);

  // LTC-scoped data (filter by current product toggle)
  const productGroups = useMemo(() => workingGroups.filter((g) => orgIds.has(g.organization_id)), [workingGroups, orgIds]);

  const orgOptions = orgsByProduct.map((o) => ({ value: o.id, label: o.name }));
  const pmOptions = Array.from(new Set(productGroups.map((g) => pmTypeFilterLabel(g.payment_method_type)).filter((v) => v !== "—"))).map((v) => ({ value: v }));
  const statusOptions: { value: BillingGroupStatus; label: string }[] = [
    { value: "pending", label: STATUS_LABELS.pending },
    { value: "active", label: STATUS_LABELS.active },
    { value: "suspended", label: STATUS_LABELS.suspended },
    { value: "terminated", label: STATUS_LABELS.terminated },
  ];

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = productGroups.filter((g) => {
      const members = memberMap[g.id] ?? [];
      if (s) {
        const inGroup =
          (g.name ?? "").toLowerCase().includes(s) ||
          g.id.toLowerCase().includes(s) ||
          g.org_name.toLowerCase().includes(s) ||
          members.some((m) => m.full_name.toLowerCase().includes(s));
        if (!inGroup) return false;
      }
      if (org !== "all" && g.organization_id !== org) return false;
      if (pm !== "all" && pmTypeFilterLabel(g.payment_method_type) !== pm) return false;
      if (status !== "all" && g.status !== status) return false;
      return true;
    }).map((g) => ({ ...g, _members: memberMap[g.id] ?? [] }));
    return sort.applySort(filtered, (r, k) => {
      if (k === "status") return r.status;
      if (k === "payment_method") return pmTypeLabel(r.payment_method_type);
      return (r as unknown as Record<string, string | number>)[k];
    });
  }, [search, org, pm, status, sort, productGroups, memberMap]);

  const active = search !== "" || org !== "all" || pm !== "all" || status !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setPm("all"); setStatus("all"); sort.reset(); };

  function handleSeparate(group: BG) {
    const members = memberMap[group.id] ?? [];
    if (members.length < 2) return;
    setSepGroup(group);
    const spouse = members.find((m) => m.relationship_type === "spouse");
    setSepMemberId(spouse?.id ?? members[0].id);
  }

  function confirmSeparation() {
    if (!sepGroup || !sepMemberId) return;
    const newId = `bg_sep_${Date.now()}`;
    const departing = INDIVIDUALS.find((i) => i.id === sepMemberId);
    if (!departing) return;
    const createdAt = new Date().toISOString();
    setSeparations((s) => [...s, { departingId: sepMemberId, newGroupId: newId, createdAt }]);
    // simulate audit_log + magic_tokens writes (wireframe only)
    toast.success("Member separated. New billing group created (Pending Setup). Setup link sent.");
    setSepGroup(null);
    setSepMemberId(null);
  }

  const detailGroup = detail.state.data;
  const detailMembers = detailGroup ? memberMap[detailGroup.id] ?? [] : [];
  const detailOrg = detailGroup ? ORGS.find((o) => o.id === detailGroup.organization_id) ?? null : null;
  const detailToken = detailGroup ? MAGIC_TOKENS.find((t) => t.individual_id === detailGroup.primary_individual_id && t.token_class === "portal") : null;
  const detailCharges = detailGroup ? PAYMENT_LEDGER.filter((p) => p.billing_group_id === detailGroup.id).slice(0, 5) : [];
  const detailTotalCents = detailMembers.filter((m) => m.coverage_status === "active").reduce((sum, m) => sum + (m.monthly_premium_cents ?? 0), 0);

  function actionsFor(g: BG, members: typeof INDIVIDUALS): Array<{ label: string; onClick: () => void; danger?: boolean }> {
    const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
    if (g.status === "active" && members.length >= 2) {
      items.push({ label: "Separate member…", onClick: () => handleSeparate(g) });
    }
    if (g.status === "pending") {
      items.push({ label: "Resend setup link", onClick: () => toast.success("Setup link re-sent.") });
      items.push({ label: "Cancel pending group", danger: true, onClick: () => toast("Cancel pending group (wireframe)") });
    }
    if (g.status === "suspended") {
      items.push({ label: "Reactivate", onClick: () => toast("Reactivate (wireframe)") });
      items.push({ label: "Terminate", danger: true, onClick: () => toast("Terminate (wireframe)") });
    }
    items.push({ label: "View detail", onClick: () => detail.open(g) });
    return items;
  }

  return (
    <div>
      <PageHeader
        title={<span className="inline-flex items-center">Billing Groups<HelpPopover text="A billing group is a payment aggregation unit. One Moov account, one charge per billing cycle, covering all individuals in the group. Most groups have one member (solo enrollee); couples sharing a payment method have two members. Groups are created automatically during enrollment — admins only act on them via spouse separation or status changes." /></span>}
        subtitle={
          <>
            <div>{rows.length} of {productGroups.length} billing groups · {product}</div>
            <div className="text-[11px] text-black/40 mt-0.5">Created during enrollment. Manage spouse separation via the action menu.</div>
          </>
        }
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search group, org or member…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={pm} onChange={setPm} allLabel="All payment methods" options={pmOptions} />
        <FilterSelect<BillingGroupStatus> value={status} onChange={setStatus} allLabel="All statuses" options={statusOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={productGroups.length} resourceLabel="billing groups" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Group" },
            { key: "org_name", label: "Org" },
            { key: "individuals_count", label: "# Individuals" },
            { key: "payment_method", label: "Payment Method" },
            { key: "status", label: "Status" },
            { key: "moov_account_id", label: "Moov Account" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((g) => {
            const members = g._members;
            const preview = members.slice(0, 2).map((m) => m.full_name).join(", ");
            const items = actionsFor(g, members);
            return (
              <TRow key={g.id} onClick={() => detail.open(g)}>
                <TCell className="font-medium underline decoration-dotted underline-offset-2">{g.name}</TCell>
                <TCell>
                  <Link
                    to="/organizations/$id"
                    params={{ id: g.organization_id }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#0a3d3e] hover:underline"
                  >
                    {g.org_name}
                  </Link>
                </TCell>
                <TCell>
                  {members.length} · <span className="text-black/50 text-[11px]">{preview || "—"}{members.length > 2 ? "…" : ""}</span>
                </TCell>
                <TCell>{g.payment_method_display_label ?? pmTypeLabel(g.payment_method_type, g.card_last4)}</TCell>
                <TCell><Pill tone={statusPillTone(g.status)}>{STATUS_LABELS[g.status]}</Pill></TCell>
                <TCell className="font-mono text-[11px]">
                  {g.moov_account_id ?? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-black/40">—</span>
                      <Pill tone="amber">Awaiting setup</Pill>
                    </span>
                  )}
                </TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  <ActionMenu items={items} />
                </TCell>
              </TRow>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40 text-xs">No billing groups match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      {/* Detail drawer */}
      <Drawer open={detail.state.open} onClose={detail.close} title={detailGroup ? `Billing Group — ${detailGroup.name}` : "Billing Group"}>
        {detailGroup && (
          <>
            {/* a. Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <input
                  defaultValue={detailGroup.name ?? ""}
                  disabled={!can("billing_groups", "update")}
                  className="text-sm font-medium border border-transparent hover:border-black/15 rounded px-1 py-0.5 disabled:bg-transparent"
                />
                <div className="mt-1"><Pill tone={statusPillTone(detailGroup.status)}>{STATUS_LABELS[detailGroup.status]}</Pill></div>
              </div>
              <ActionMenu items={actionsFor(detailGroup, detailMembers)} />
            </div>

            {/* b. Members */}
            <SectionTitle>Members</SectionTitle>
            <div className="border border-black/10 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                  <tr>
                    <th className="text-left font-medium px-2 py-1.5">Name</th>
                    <th className="text-left font-medium px-2 py-1.5">Relationship</th>
                    <th className="text-left font-medium px-2 py-1.5">Coverage Status</th>
                    <th className="text-left font-medium px-2 py-1.5">Monthly Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMembers.map((m) => (
                    <tr key={m.id} className="border-t border-black/5">
                      <td className="px-2 py-1.5 font-medium">
                        <Link to="/individuals/$id" params={{ id: m.id }} className="underline hover:text-[#0a3d3e]">{m.full_name}</Link>
                      </td>
                      <td className="px-2 py-1.5 capitalize text-black/70">{m.relationship_type ?? "—"}</td>
                      <td className="px-2 py-1.5"><Pill tone={statusTone(m.coverage_status)}>{m.coverage_status}</Pill></td>
                      <td className="px-2 py-1.5">{formatCents(m.monthly_premium_cents)}</td>
                    </tr>
                  ))}
                  {detailMembers.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-black/40">No members in this group.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-black/60 mt-1.5">
              Total monthly charge (active members): <span className="font-medium text-black/80">{formatCents(detailTotalCents)}</span>
            </div>

            {/* c. Payment Method */}
            <SectionTitle>Payment Method</SectionTitle>
            {detailGroup.status === "pending" && (
              <div className="mb-3 p-3 border border-amber-300 bg-amber-50 rounded text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-amber-900">
                      Spouse has not yet set up their payment method. They received a portal link on{" "}
                      <span className="font-medium">{fmtTs(detailGroup.created_at)}</span>.
                      {detailToken?.last_used_at ? <> Last reminded on <span className="font-medium">{fmtTs(detailToken.last_used_at)}</span>.</> : <> No reminder sent yet.</>}
                    </div>
                    <div className="mt-2">
                      <Btn onClick={() => toast.success("Setup link re-sent.")}>Resend Setup Link</Btn>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Field label="Payment Method Type"><div className="text-sm">{pmTypeLabel(detailGroup.payment_method_type, detailGroup.card_last4)}</div></Field>
            <Field label="Display Label"><div className="text-sm">{detailGroup.payment_method_display_label ?? "—"}</div></Field>
            <Field label="Moov Account ID"><CopyChip value={detailGroup.moov_account_id} /></Field>
            <Field label="Payment Method ID"><CopyChip value={detailGroup.payment_method_id} /></Field>

            {/* d. Recent Charges */}
            <SectionTitle>Recent Charges</SectionTitle>
            <div className="border border-black/10 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                  <tr>
                    <th className="text-left font-medium px-2 py-1.5">Date</th>
                    <th className="text-left font-medium px-2 py-1.5">Charge Type</th>
                    <th className="text-left font-medium px-2 py-1.5">Amount</th>
                    <th className="text-left font-medium px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailCharges.map((p) => (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="px-2 py-1.5">{p.event_date}</td>
                      <td className="px-2 py-1.5 text-black/70">{p.event_type}</td>
                      <td className="px-2 py-1.5">{formatCents(p.amount_cents)}</td>
                      <td className="px-2 py-1.5"><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
                    </tr>
                  ))}
                  {detailCharges.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-black/40">No charges yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-1.5">
              <Link to="/payment-ledger" className="text-[11px] underline text-[#0a3d3e]">View full ledger for this group →</Link>
            </div>

            {/* e. Status Timeline */}
            <SectionTitle>Status Timeline</SectionTitle>
            <div className="text-xs text-black/70 space-y-1">
              <div><span className="text-black/50">Created:</span> {fmtTs(detailGroup.created_at)}</div>
              <div><span className="text-black/50">Current status:</span> <Pill tone={statusPillTone(detailGroup.status)}>{STATUS_LABELS[detailGroup.status]}</Pill></div>
              <div className="text-[11px] text-black/40 italic">Full audit-driven timeline coming in Phase A+.</div>
            </div>

            {/* f. Organization */}
            <SectionTitle>Organization</SectionTitle>
            {detailOrg ? (
              <Link to="/organizations/$id" params={{ id: detailOrg.id }} className="text-sm underline hover:text-[#0a3d3e]">{detailOrg.name}</Link>
            ) : <div className="text-sm text-black/50">—</div>}
          </>
        )}
      </Drawer>

      {/* Spouse separation modal */}
      {sepGroup && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSepGroup(null); setSepMemberId(null); }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded shadow-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Separate member from billing group</h2>
            <div className="text-xs text-black/60 mb-3">Group: <span className="font-medium text-black/80">{sepGroup.name}</span></div>
            <div className="space-y-2 mb-3">
              {(memberMap[sepGroup.id] ?? []).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="sep_member" checked={sepMemberId === m.id} onChange={() => setSepMemberId(m.id)} />
                  <span>{m.full_name}</span>
                  <span className="text-[11px] text-black/40 capitalize">({m.relationship_type})</span>
                </label>
              ))}
            </div>
            <div className="p-3 bg-stone-50 border border-black/10 rounded text-[11px] text-black/70 leading-relaxed mb-4">
              The departing member will be moved to a new billing group with status <span className="font-medium">Pending Setup</span>. They will receive an email with a portal link to add their own payment method. Until they complete setup, no charges will be attempted for their new group. The remaining member continues in the current group.
            </div>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => { setSepGroup(null); setSepMemberId(null); }}>Cancel</Btn>
              <Btn variant="primary" disabled={!sepMemberId || !can("billing_groups", "update")} onClick={confirmSeparation}>
                Separate and Send Setup Link
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
