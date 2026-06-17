import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, CircleAlert, Copy, Info, Minus, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, Field,
} from "@/components/wireframe/Bits";
import {
  POLICIES, CARRIER_PRODUCTS, ORGS, CARRIERS, CHANNEL_PARTNERS,
  INTERNAL_REPS, ORG_PRIMARY_CHANNEL_PARTNER, CARRIER_COMMISSION_SCHEDULES,
  POLICY_SPLITS_INITIAL,
  type Policy, type PolicySplit, type PolicyStatus, type PayeeType,
  type PaymentMethodSetting, type PolicyOwnerType,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import {
  FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink,
  SortableTHead, useSort,
} from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/policies")({ component: View });

type SortKey = "id" | "policy_name" | "policy_number" | "org_name" | "carrier_product_name" | "status" | "carrier_commission_pct" | "override_pct" | "schedule_name" | "initial_effective_date";

const STATUS_LABEL: Record<PolicyStatus, string> = {
  pending: "Pending", active: "Active", lapsed: "Lapsed", closed: "Closed", terminated: "Terminated",
};
const OWNER_LABEL: Record<PolicyOwnerType, string> = {
  employer_group: "Employer Group", affiliate: "Affiliate",
};
const PAYEE_LABEL: Record<PayeeType, string> = {
  house: "House", internal_rep: "Internal Rep", channel_partner: "Channel Partner", override: "Override",
};
const PAYMENT_LABEL: Record<PaymentMethodSetting, string> = {
  hollowtree_paid: "Hollowtree-paid", carrier_direct: "Carrier-direct",
};

const carrierProductLabel = (cpId: string) => {
  const cp = CARRIER_PRODUCTS.find((c) => c.id === cpId);
  if (!cp) return cpId;
  const car = CARRIERS.find((c) => c.id === cp.carrier_id);
  return car ? `${car.carrier_name} · ${cp.product_name}` : cp.product_name;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const fmtDollars = (cents: number | null | undefined) => {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function StatusChip({ s }: { s: PolicyStatus }) {
  const map: Record<PolicyStatus, string> = {
    pending: "bg-blue-100 text-blue-800 border-blue-200",
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    lapsed: "bg-amber-100 text-amber-800 border-amber-200",
    closed: "bg-gray-100 text-gray-700 border-gray-200",
    terminated: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${map[s]}`}>{STATUS_LABEL[s]}</span>;
}

function copyToClipboard(text: string, label = "Copied") {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${label} to clipboard`));
}

function View() {
  const { product } = useStore();
  const can = usePermission();
  const [policies, setPolicies] = useState<Policy[]>(POLICIES);
  const [splits, setSplits] = useState<PolicySplit[]>(POLICY_SPLITS_INITIAL);

  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState<PolicyStatus | "all">("all");
  const [ownerType, setOwnerType] = useState<PolicyOwnerType | "all">("all");
  const [cp, setCp] = useState("all");
  const sort = useSort<SortKey>("org_name", "asc");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const cpOptions = CARRIER_PRODUCTS
    .filter((c) => CARRIERS.find((cc) => cc.id === c.carrier_id)?.product === product)
    .map((c) => ({ value: c.id, label: carrierProductLabel(c.id) }));

  const statuses: { value: PolicyStatus; label: string }[] = [
    { value: "pending", label: "Pending" }, { value: "active", label: "Active" },
    { value: "lapsed", label: "Lapsed" }, { value: "closed", label: "Closed" },
    { value: "terminated", label: "Terminated" },
  ];

  const productPolicies = policies.filter((p) => p.product === product);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = productPolicies.map((p) => {
      const sched = p.commission_schedule_id ? CARRIER_COMMISSION_SCHEDULES.find((x) => x.id === p.commission_schedule_id) : null;
      return {
        ...p,
        carrier_product_name: carrierProductLabel(p.carrier_product_id),
        schedule_name: sched?.schedule_name ?? "Default",
      };
    }).filter((p) => {
      if (s && !(p.org_name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || (p.policy_number ?? "").toLowerCase().includes(s) || (p.policy_name ?? "").toLowerCase().includes(s))) return false;
      if (org !== "all" && p.organization_id !== org) return false;
      if (status !== "all" && p.status !== status) return false;
      if (ownerType !== "all" && p.policy_owner_type !== ownerType) return false;
      if (cp !== "all" && p.carrier_product_id !== cp) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number | null>)[k]);
  }, [productPolicies, search, org, status, ownerType, cp, sort]);

  const active = search !== "" || org !== "all" || status !== "all" || ownerType !== "all" || cp !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setStatus("all"); setOwnerType("all"); setCp("all"); sort.reset(); };

  const openView = (p: Policy) => { setEditingId(p.id); setMode("view"); setDrawerOpen(true); };
  const openCreate = () => { setEditingId(null); setMode("create"); setDrawerOpen(true); };

  const onSavePolicy = (next: Policy, nextSplits: PolicySplit[]) => {
    setPolicies((prev) => {
      const exists = prev.some((p) => p.id === next.id);
      return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [...prev, next];
    });
    setSplits((prev) => {
      const others = prev.filter((s) => s.policy_id !== next.id);
      return [...others, ...nextSplits];
    });
    setDrawerOpen(false);
    if (mode === "create") {
      toast.success("Policy created. Sync to Attio from the Policy Detail screen when ready.");
    } else {
      toast.success("Policy saved");
    }
  };

  const onSync = (policyId: string, ts: string) => {
    setPolicies((prev) => prev.map((p) => (p.id === policyId ? { ...p, attio_last_synced_at: ts, attio_policy_id: p.attio_policy_id ?? `att_${p.id}` } : p)));
  };

  const handleRowSync = (e: React.MouseEvent, p: Policy) => {
    e.stopPropagation();
    const ts = new Date().toISOString();
    onSync(p.id, ts);
    toast.success(`Synced ${p.policy_number ?? p.id} to Attio`);
  };

  const cols: { key: SortKey | null; label: string }[] = product === "DI"
    ? [
        { key: "policy_number", label: "Policy" },
        { key: "policy_name", label: "Policy Name" },
        { key: "org_name", label: "Org" },
        { key: "carrier_product_name", label: "Carrier Product" },
        { key: "status", label: "Status" },
        { key: "initial_effective_date", label: "Effective Date" },
        { key: "carrier_commission_pct", label: "Carrier %" },
        { key: "override_pct", label: "Override %" },
        { key: null, label: "Synced" },
      ]
    : [
        { key: "policy_number", label: "Policy" },
        { key: "policy_name", label: "Policy Name" },
        { key: "org_name", label: "Org" },
        { key: "carrier_product_name", label: "Carrier Product" },
        { key: "status", label: "Status" },
        { key: "initial_effective_date", label: "Effective Date" },
        { key: "schedule_name", label: "Schedule" },
        { key: null, label: "Synced" },
      ];

  const subtitle = active
    ? `${rows.length} of ${productPolicies.length} policies · ${product}`
    : `${rows.length} policies · ${product}`;

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle={subtitle}
        actions={<Btn variant="primary" disabled={!can("policies", "create")} onClick={openCreate}>+ New Policy</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search org, policy #, name…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={status} onChange={(v) => setStatus(v as PolicyStatus | "all")} allLabel="All statuses" options={statuses} />
        <FilterSelect
          value={ownerType}
          onChange={(v) => setOwnerType(v as PolicyOwnerType | "all")}
          allLabel="All owner types"
          options={[{ value: "employer_group", label: "Employer Group" }, { value: "affiliate", label: "Affiliate" }]}
        />
        <FilterCombobox value={cp} onChange={setCp} placeholder="All carrier products" options={cpOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={productPolicies.length} resourceLabel="policies" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey> cols={cols} sortKey={sort.sortKey} sortDir={sort.sortDir} onToggle={sort.toggle} />
        <tbody>
          {rows.map((p) => (
            <TRow key={p.id} onClick={() => openView(p)}>
              <TCell>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px]">
                    {p.policy_number ?? <span className="text-black/30">—</span>}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(p.id, "Internal ID copied"); }}
                    className="text-black/30 hover:text-black/70"
                    title={`Internal ID: ${p.id} (click to copy)`}
                    aria-label="Show internal ID"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              </TCell>
              <TCell>{p.policy_name ?? <span className="text-black/30">—</span>}</TCell>
              <TCell className="font-medium">{p.org_name}</TCell>
              <TCell>{p.carrier_product_name}</TCell>
              <TCell><StatusChip s={p.status} /></TCell>
              <TCell>{fmtDate(p.initial_effective_date)}</TCell>
              {product === "DI" ? (
                <>
                  <TCell>{p.carrier_commission_pct != null ? `${p.carrier_commission_pct}%` : "—"}</TCell>
                  <TCell>{p.override_pct != null ? `${p.override_pct}%` : "—"}</TCell>
                </>
              ) : (
                <TCell>{p.schedule_name}</TCell>
              )}
              <TCell>
                <div className="flex items-center gap-1.5">
                  {p.attio_last_synced_at ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-label={`Last synced: ${fmtDateTime(p.attio_last_synced_at)}`} />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-black/30" aria-label="Never synced" />
                  )}
                  <button
                    onClick={(e) => handleRowSync(e, p)}
                    className="text-black/30 hover:text-[#0a3d3e]"
                    title={p.attio_last_synced_at ? `Last synced: ${fmtDateTime(p.attio_last_synced_at)} — click to re-sync` : "Never synced — click to sync"}
                    aria-label="Re-sync to Attio"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              </TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-black/40 text-xs">No policies match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <PolicyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={mode}
        setMode={setMode}
        policy={editingId ? policies.find((p) => p.id === editingId) ?? null : null}
        existingSplits={editingId ? splits.filter((s) => s.policy_id === editingId) : []}
        product={product}
        onSave={onSavePolicy}
        onSync={onSync}
        canEdit={can("policies", "update")}
      />
    </div>
  );
}

/* ─────────────────────────── Policy Drawer ─────────────────────────── */

type DraftSplit = PolicySplit & { _isNew?: boolean };

function emptyPolicy(product: "DI" | "LTC"): Policy {
  const id = `pol_${Math.floor(Math.random() * 9000) + 1000}`;
  return {
    id, policy_name: "", policy_number: null, organization_id: "", org_name: "", carrier_product_id: "",
    product, status: "pending",
    policy_owner_type: "employer_group",
    carrier_commission_pct: product === "DI" ? 12 : null,
    override_pct: null,
    channel_partner_id: null,
    commission_schedule_id: null,
    initial_effective_date: "",
    attio_last_synced_at: null,
    updated_at: new Date().toISOString(),
    attio_record_id: `att_${id}`,
    attio_policy_id: null,
    account_manager: null,
    google_drive_folder: null,
    original_enrollee_count: null,
    original_monthly_premium_cents: null,
    ltc_bronze_cents: null, ltc_silver_cents: null, ltc_gold_cents: null, ltc_platinum_cents: null, ltc_diamond_cents: null,
  };
}

function PolicyDrawer({
  open, onClose, mode, setMode, policy, existingSplits, product, onSave, onSync, canEdit,
}: {
  open: boolean;
  onClose: () => void;
  mode: "view" | "create" | "edit";
  setMode: (m: "view" | "create" | "edit") => void;
  policy: Policy | null;
  existingSplits: PolicySplit[];
  product: "DI" | "LTC";
  onSave: (p: Policy, s: PolicySplit[]) => void;
  onSync: (id: string, ts: string) => void;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<Policy>(() => policy ?? emptyPolicy(product));
  const [draftSplits, setDraftSplits] = useState<DraftSplit[]>(existingSplits);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(policy?.attio_last_synced_at ?? null);
  const [splitsLoadedFromDefaults, setSplitsLoadedFromDefaults] = useState(false);
  const [defaultsPartner, setDefaultsPartner] = useState<string | null>(null);

  const isCreate = mode === "create";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  // Reset on open/target change
  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      setDraft(emptyPolicy(product));
      setDraftSplits([]);
      setSplitsLoadedFromDefaults(false);
      setDefaultsPartner(null);
      setLastSynced(null);
    } else if (policy) {
      setDraft(policy);
      setDraftSplits(existingSplits);
      setSplitsLoadedFromDefaults(true);
      setLastSynced(policy.attio_last_synced_at);
    }
    setEditingRow(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, policy?.id]);

  // Auto-load splits in CREATE mode when org chosen.
  useEffect(() => {
    if (!isCreate) return;
    if (!draft.organization_id) return;
    if (splitsLoadedFromDefaults) return;
    const cpnId = ORG_PRIMARY_CHANNEL_PARTNER[draft.organization_id];
    const partner = CHANNEL_PARTNERS.find((c) => c.id === cpnId);
    setSplitsLoadedFromDefaults(true);
    if (!partner) {
      setDefaultsPartner(null);
      return;
    }
    setDefaultsPartner(partner.name);
    setDraftSplits([
      { id: `nsp_h`, policy_id: draft.id, payee_type: "house", payee_name: "Hollowtree", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_r`, policy_id: draft.id, payee_type: "internal_rep", payee_name: "Guy Livingstone", split_pct: 10, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_c`, policy_id: draft.id, payee_type: "channel_partner", payee_name: partner.name, split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_o`, policy_id: draft.id, payee_type: "override", payee_name: "Gallagher", split_pct: 5, payment_method: "carrier_direct", source: "default", effective_to: null },
    ]);
    toast.success(`Defaults loaded from ${partner.name}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.organization_id, isCreate]);

  const setCarrierProduct = (cpId: string) => {
    setDraft((d) => ({ ...d, carrier_product_id: cpId, commission_schedule_id: null }));
  };

  const setOrgId = (id: string) => {
    const o = ORGS.find((x) => x.id === id);
    setDraft((d) => ({ ...d, organization_id: id, org_name: o?.name ?? "" }));
    if (isCreate) { setSplitsLoadedFromDefaults(false); setDefaultsPartner(null); }
  };

  const clearLoadedDefaults = () => {
    setDraftSplits([]);
    setDefaultsPartner(null);
  };

  const total = draftSplits.reduce((acc, s) => acc + (Number(s.split_pct) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.005;

  // Determine first missing requirement for tooltip
  const missing = !draft.organization_id ? "Select an organization"
    : !draft.policy_name?.trim() ? "Enter a policy name"
    : !draft.carrier_product_id ? "Select a carrier product"
    : !draft.status ? "Select a status"
    : !draft.policy_owner_type ? "Select a policy owner type"
    : !draft.initial_effective_date ? "Set the effective date"
    : draftSplits.length === 0 ? "Add at least one commission split"
    : !totalOk ? `Commission splits must total 100.00% (currently ${total.toFixed(2)}%)`
    : null;

  const canSave = canEdit && missing === null && (product !== "DI" || draft.carrier_commission_pct != null);

  // Fields editable in view/edit (post-create)
  const editableInEdit = isEdit; // policy_number, account_manager, drive folder, commission_schedule
  const readOnly = isView;

  const addBlankSplit = () => {
    const id = `nsp_${Date.now()}`;
    const row: DraftSplit = {
      id, policy_id: draft.id, payee_type: "channel_partner", payee_name: "",
      split_pct: 0, payment_method: "hollowtree_paid", source: "override",
      effective_to: null, _isNew: true,
    };
    setDraftSplits((ss) => [...ss, row]);
    setEditingRow(id);
  };

  const updateSplit = (id: string, patch: Partial<PolicySplit>) => {
    setDraftSplits((ss) => ss.map((s) => {
      if (s.id !== id) return s;
      const next = { ...s, ...patch };
      const isFieldEdit = (["payee_type", "payee_name", "split_pct", "payment_method"] as const)
        .some((k) => k in patch && patch[k] !== s[k]);
      if (s.source === "default" && isFieldEdit && !s._isNew) next.source = "override";
      return next;
    }));
  };

  const removeSplit = (id: string) => {
    setDraftSplits((ss) => ss.filter((s) => s.id !== id));
    if (editingRow === id) setEditingRow(null);
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      const ts = new Date().toISOString();
      setLastSynced(ts);
      onSync(draft.id, ts);
      setDraft((d) => ({ ...d, attio_last_synced_at: ts, attio_policy_id: d.attio_policy_id ?? `att_${d.id}` }));
      setSyncing(false);
      toast.success(`Synced to Attio`);
    }, 800);
  };

  const handleSave = () => {
    onSave({ ...draft, updated_at: new Date().toISOString() }, draftSplits.map(({ _isNew, ...s }) => s));
  };

  const title = isCreate ? "New Policy" : `${draft.policy_number ?? draft.policy_name ?? draft.id}`;

  const availableSchedules = CARRIER_COMMISSION_SCHEDULES.filter((s) => s.carrier_product_id === draft.carrier_product_id);
  const defaultSchedule = availableSchedules.find((s) => s.is_default);
  const cpOptions = CARRIER_PRODUCTS
    .filter((c) => CARRIERS.find((cc) => cc.id === c.carrier_id)?.product === product)
    .map((c) => ({ value: c.id, label: carrierProductLabel(c.id) }));
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));

  const orgHasPartner = draft.organization_id ? !!ORG_PRIMARY_CHANNEL_PARTNER[draft.organization_id] : true;

  const inputCls = "w-full px-2 py-1 text-sm border border-black/15 rounded bg-white disabled:bg-black/5 disabled:text-black/60";

  const isLTC = product === "LTC";
  const namePlaceholder = isLTC ? "e.g. Acme Health LTC 2025" : "e.g. Acme Widgets Group DI 2025";

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      {/* Top action bar for view mode */}
      {isView && canEdit && (
        <div className="flex justify-end mb-2">
          <Btn variant="secondary" onClick={() => setMode("edit")}>
            <Pencil className="h-3 w-3 mr-1 inline" /> Edit
          </Btn>
        </div>
      )}

      <SectionHeader title="Policy Metadata" />
      <Field label="Organization *">
        {readOnly || isEdit ? (
          <div className="text-sm text-black/80 py-1">{draft.org_name || "—"}</div>
        ) : (
          <FilterCombobox value={draft.organization_id || "all"} onChange={(v) => v !== "all" && setOrgId(v)} placeholder="Select organization…" options={orgOptions} width="w-full" />
        )}
      </Field>

      <Field label="Policy Name *">
        {readOnly || isEdit ? (
          <div className="text-sm text-black/80 py-1">{draft.policy_name ?? "—"}</div>
        ) : (
          <input
            type="text"
            value={draft.policy_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, policy_name: e.target.value === "" ? null : e.target.value }))}
            placeholder={namePlaceholder}
            className={inputCls}
          />
        )}
      </Field>

      <Field label="Policy Number">
        {readOnly ? (
          <div className="text-sm font-mono text-black/80 py-1">{draft.policy_number ?? "—"}</div>
        ) : (
          <>
            <input
              type="text"
              value={draft.policy_number ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, policy_number: e.target.value === "" ? null : e.target.value }))}
              placeholder="Carrier-assigned policy number"
              className={inputCls}
            />
            <div className="text-[11px] text-black/50 mt-1">
              {isCreate
                ? "Leave blank if not yet issued by carrier. Can be added later from the Policy Detail screen."
                : "Editable post-creation as the carrier issues the policy."}
            </div>
          </>
        )}
      </Field>

      <Field label="Carrier Product *">
        {readOnly || isEdit ? (
          <div className="text-sm text-black/80 py-1">{carrierProductLabel(draft.carrier_product_id) || "—"}</div>
        ) : (
          <FilterCombobox value={draft.carrier_product_id || "all"} onChange={(v) => v !== "all" && setCarrierProduct(v)} placeholder="Select carrier product…" options={cpOptions} width="w-full" />
        )}
      </Field>

      <Field label="Status *">
        {readOnly || isEdit ? (
          <div className="py-1"><StatusChip s={draft.status} /></div>
        ) : (
          <select
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as PolicyStatus }))}
            className={inputCls}
          >
            {(Object.keys(STATUS_LABEL) as PolicyStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Policy Owner Type *">
        {readOnly || isEdit ? (
          <div className="text-sm text-black/80 py-1">{OWNER_LABEL[draft.policy_owner_type]}</div>
        ) : (
          <div className="inline-flex rounded border border-black/15 overflow-hidden text-xs">
            {(["employer_group", "affiliate"] as PolicyOwnerType[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, policy_owner_type: v }))}
                className={`px-3 py-1 ${draft.policy_owner_type === v ? "bg-[#0a3d3e] text-white" : "bg-white text-black/70 hover:bg-black/5"}`}
              >
                {OWNER_LABEL[v]}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Effective Date *">
        {readOnly || isEdit ? (
          <div className="text-sm text-black/80 py-1">{fmtDate(draft.initial_effective_date) || "—"}</div>
        ) : (
          <>
            <input
              type="date"
              value={draft.initial_effective_date}
              onChange={(e) => setDraft((d) => ({ ...d, initial_effective_date: e.target.value }))}
              className={inputCls}
            />
            <div className="text-[11px] text-black/50 mt-1">Commission tier year calculations start from this date.</div>
          </>
        )}
      </Field>

      {product === "DI" && !isLTC && (
        <Field label="Carrier Commission % *">
          {readOnly ? (
            <div className="text-sm text-black/80 py-1">{draft.carrier_commission_pct != null ? `${draft.carrier_commission_pct}%` : "—"}</div>
          ) : (
            <input type="number" step="0.01" value={draft.carrier_commission_pct ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, carrier_commission_pct: e.target.value === "" ? null : Number(e.target.value) }))}
              className={inputCls} />
          )}
        </Field>
      )}

      {isLTC && (
        <Field label="Commission Schedule">
          {readOnly ? (
            <div className="text-sm text-black/80 py-1">
              {(() => {
                const id = draft.commission_schedule_id;
                if (!id) return defaultSchedule ? `Default: ${defaultSchedule.schedule_name}` : "—";
                const s = CARRIER_COMMISSION_SCHEDULES.find((x) => x.id === id);
                return s?.schedule_name ?? "—";
              })()}
            </div>
          ) : (
            <>
              <select
                value={draft.commission_schedule_id ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, commission_schedule_id: e.target.value || null }))}
                className={inputCls}
                disabled={!draft.carrier_product_id}
              >
                <option value="">{draft.carrier_product_id ? "Use default schedule" : "Select carrier product first"}</option>
                {availableSchedules.map((s) => (
                  <option key={s.id} value={s.id}>{s.schedule_name}{s.state_code ? ` (${s.state_code})` : ""}</option>
                ))}
              </select>
              <div className="text-[11px] text-black/50 mt-1">
                {!draft.commission_schedule_id && defaultSchedule && (
                  <>Default: {defaultSchedule.schedule_name}. </>
                )}
                LTC commission rates come from the carrier schedule. Heaped schedules pay year-1 premiums at a higher rate; flat/level schedules pay the same rate across years.
              </div>
            </>
          )}
        </Field>
      )}

      {/* Post-create-only fields */}
      {!isCreate && (
        <>
          <Field label="Account Manager">
            {readOnly ? (
              <div className="text-sm text-black/80 py-1">{draft.account_manager ?? "—"}</div>
            ) : (
              <input
                type="text"
                value={draft.account_manager ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, account_manager: e.target.value === "" ? null : e.target.value }))}
                placeholder="Hollowtree rep name"
                className={inputCls}
              />
            )}
          </Field>
          <Field label="Google Drive Folder">
            {readOnly ? (
              draft.google_drive_folder
                ? <a href={draft.google_drive_folder} target="_blank" rel="noreferrer" className="text-sm text-[#0a3d3e] underline py-1 inline-block break-all">{draft.google_drive_folder}</a>
                : <div className="text-sm text-black/40 py-1">—</div>
            ) : (
              <input
                type="url"
                value={draft.google_drive_folder ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, google_drive_folder: e.target.value === "" ? null : e.target.value }))}
                placeholder="https://drive.google.com/..."
                className={inputCls}
              />
            )}
          </Field>

          {isLTC && (
            <>
              <Field label="Enrollment Snapshot">
                <div className="text-xs text-black/70 grid grid-cols-2 gap-2 py-1">
                  <div><span className="text-black/50">Original enrollees:</span> {draft.original_enrollee_count ?? "—"}</div>
                  <div><span className="text-black/50">Original monthly premium:</span> {fmtDollars(draft.original_monthly_premium_cents)}</div>
                </div>
              </Field>
              <Field label="Face Amount Tiers (snapshot)">
                <div className="text-xs text-black/70 grid grid-cols-5 gap-2 py-1">
                  <div><div className="text-black/50">Bronze</div>{fmtDollars(draft.ltc_bronze_cents)}</div>
                  <div><div className="text-black/50">Silver</div>{fmtDollars(draft.ltc_silver_cents)}</div>
                  <div><div className="text-black/50">Gold</div>{fmtDollars(draft.ltc_gold_cents)}</div>
                  <div><div className="text-black/50">Platinum</div>{fmtDollars(draft.ltc_platinum_cents)}</div>
                  <div><div className="text-black/50">Diamond</div>{fmtDollars(draft.ltc_diamond_cents)}</div>
                </div>
              </Field>
            </>
          )}
        </>
      )}

      {/* Commission Splits */}
      <SectionHeader title="Commission Splits" subtitle="Per-policy payment waterfall. Must total 100%." />

      {isCreate && draft.organization_id && !orgHasPartner && (
        <div className="mb-2 border border-amber-300 bg-amber-50 rounded px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
          <CircleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>This organization has no primary channel partner set. Splits must be entered manually.</div>
        </div>
      )}
      {isCreate && defaultsPartner && draftSplits.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-[11px] text-black/60 bg-black/5 rounded px-2 py-1">
          <span>Defaults loaded from {defaultsPartner}</span>
          <button onClick={clearLoadedDefaults} className="text-black/60 hover:text-rose-700">× Clear</button>
        </div>
      )}

      <SplitsTable
        rows={draftSplits}
        editingRow={editingRow}
        onEdit={(id) => setEditingRow(id === editingRow ? null : id)}
        onUpdate={updateSplit}
        onRemove={removeSplit}
        canEdit={!isView && canEdit}
        emptyMessage="No splits yet. Select an organization to auto-load channel-partner defaults, or click '+ Add Split' to enter manually."
      />
      {!isView && (
        <div className="flex items-center justify-between mt-2">
          <Btn variant="secondary" onClick={addBlankSplit} disabled={!canEdit}>+ Add Split</Btn>
          <div className={`text-xs font-semibold flex items-center gap-1 ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>
            {totalOk ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            TOTAL: {total.toFixed(2)}%
          </div>
        </div>
      )}
      {isView && (
        <div className="flex items-center justify-end mt-2">
          <div className={`text-xs font-semibold ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>
            TOTAL: {total.toFixed(2)}%
          </div>
        </div>
      )}

      {/* Attio Sync — only when policy exists */}
      {!isCreate && (
        <>
          <SectionHeader title="Attio Sync" />
          <div className="border border-black/10 rounded p-3 bg-[#f7f3eb]/40">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs">
                <div className="text-black/60">Last synced</div>
                <div className="font-medium text-black/80 mt-0.5">{fmtDateTime(lastSynced)}</div>
                {draft.attio_policy_id && (
                  <div className="text-[11px] text-black/50 mt-1 font-mono flex items-center gap-1">
                    {draft.attio_policy_id}
                    <button onClick={() => copyToClipboard(draft.attio_policy_id!, "Attio ID copied")} className="text-black/40 hover:text-black/70"><Copy className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
              <Btn variant="secondary" onClick={handleSync} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync to Attio"}
              </Btn>
            </div>
            {draft.attio_policy_id && (
              <div className="mt-2">
                <a className="text-[11px] underline text-[#0a3d3e]" href={`https://app.attio.com/policies/${draft.attio_policy_id}`} target="_blank" rel="noreferrer">View in Attio →</a>
              </div>
            )}
          </div>

          <div className="mt-3 text-[11px] text-black/40 grid grid-cols-2 gap-2">
            <div>Created: {fmtDateTime(draft.updated_at)}</div>
            <div>Updated: {fmtDateTime(draft.updated_at)}</div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-end gap-2 sticky bottom-0 bg-white pt-3 border-t border-black/10">
        <Btn variant="ghost" onClick={onClose}>{isView ? "Close" : "Cancel"}</Btn>
        {!isView && (
          <span title={!canSave && missing ? missing : undefined}>
            <Btn variant="primary" onClick={handleSave} disabled={!canSave}>
              {isCreate ? "Create Policy" : "Save"}
            </Btn>
          </span>
        )}
      </div>
    </Drawer>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mt-5 mb-2">
      <div className="text-sm font-semibold text-black/80">{title}</div>
      {subtitle && <div className="text-[11px] text-black/50 mt-0.5">{subtitle}</div>}
    </div>
  );
}

/* ─────────────────────────── Splits Table ─────────────────────────── */

function SplitsTable({
  rows, editingRow, onEdit, onUpdate, onRemove, canEdit, emptyMessage,
}: {
  rows: DraftSplit[];
  editingRow: string | null;
  onEdit: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PolicySplit>) => void;
  onRemove: (id: string) => void;
  canEdit: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="border border-black/10 rounded overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
          <tr>
            <th className="text-left font-medium px-2 py-1.5">Payee Type</th>
            <th className="text-left font-medium px-2 py-1.5">Payee Name</th>
            <th className="text-left font-medium px-2 py-1.5 w-16">Split %</th>
            <th className="text-left font-medium px-2 py-1.5">Payment Method</th>
            <th className="text-left font-medium px-2 py-1.5 w-20">Source</th>
            <th className="text-left font-medium px-2 py-1.5 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const editing = editingRow === r.id && canEdit;
            const terminated = r.effective_to !== null;
            return (
              <tr key={r.id} className={`border-t border-black/5 ${terminated ? "opacity-50" : ""}`}>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <PayeeTypeSelect value={r.payee_type} onChange={(v) => {
                      const patch: Partial<PolicySplit> = { payee_type: v };
                      if (v === "house") patch.payee_name = "Hollowtree";
                      else patch.payee_name = "";
                      onUpdate(r.id, patch);
                    }} />
                  ) : <span>{PAYEE_LABEL[r.payee_type]}</span>}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <PayeeNameSelect type={r.payee_type} value={r.payee_name} onChange={(v) => onUpdate(r.id, { payee_name: v })} />
                  ) : (r.payee_name || <span className="text-black/30">—</span>)}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <input
                      type="number" step="0.01" min="0" max="100" value={r.split_pct}
                      onChange={(e) => onUpdate(r.id, { split_pct: Number(e.target.value) })}
                      className="w-16 px-1 py-0.5 text-xs border border-black/15 rounded"
                    />
                  ) : `${Number(r.split_pct).toFixed(2)}%`}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <select
                      value={r.payment_method}
                      onChange={(e) => onUpdate(r.id, { payment_method: e.target.value as PaymentMethodSetting })}
                      className="px-1 py-0.5 text-xs border border-black/15 rounded bg-white"
                    >
                      <option value="hollowtree_paid">Hollowtree-paid</option>
                      <option value="carrier_direct">Carrier-direct</option>
                    </select>
                  ) : PAYMENT_LABEL[r.payment_method]}
                </td>
                <td className="px-2 py-1.5">
                  <Pill tone={r.source === "default" ? "neutral" : "warn"}>{r.source === "default" ? "Default" : "Override"}</Pill>
                  {terminated && <div className="text-[10px] text-black/40 mt-0.5">to {r.effective_to}</div>}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(r.id)} className="text-black/50 hover:text-black/80" aria-label="Edit"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => onRemove(r.id)} className="text-black/50 hover:text-rose-700" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-2 py-4 text-center text-[11px] text-black/40">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PayeeTypeSelect({ value, onChange }: { value: PayeeType; onChange: (v: PayeeType) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PayeeType)} className="px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
      {(Object.keys(PAYEE_LABEL) as PayeeType[]).map((t) => (
        <option key={t} value={t}>{PAYEE_LABEL[t]}</option>
      ))}
    </select>
  );
}

function PayeeNameSelect({ type, value, onChange }: { type: PayeeType; value: string; onChange: (v: string) => void }) {
  if (type === "house") {
    return <input value="Hollowtree" disabled className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-black/5" />;
  }
  if (type === "internal_rep") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
        <option value="">Select rep…</option>
        {INTERNAL_REPS.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
      </select>
    );
  }
  if (type === "channel_partner") {
    const opts = CHANNEL_PARTNERS.filter((p) => p.partner_type === "Broker" || p.partner_type === "Agency" || p.partner_type === "Other");
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
        <option value="">Select partner…</option>
        {opts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
      </select>
    );
  }
  // override — free text
  return (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder="Override payee name"
      className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-white"
    />
  );
}
