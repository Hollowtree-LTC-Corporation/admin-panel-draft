import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, CircleAlert, Minus, Pencil, Trash2, X } from "lucide-react";
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

type SortKey = "id" | "org_name" | "carrier_product_name" | "status" | "carrier_commission_pct" | "override_pct" | "schedule_name" | "initial_effective_date";

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

const todayISO = () => new Date().toISOString().slice(0, 10);

const isOutOfSync = (p: Policy) =>
  p.attio_last_synced_at !== null && new Date(p.updated_at) > new Date(p.attio_last_synced_at);

function SyncIcon({ p }: { p: Policy }) {
  if (!p.attio_last_synced_at) return <Minus className="h-3.5 w-3.5 text-black/30" aria-label="Never synced" />;
  if (isOutOfSync(p)) return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-label="Out of sync" />;
  return <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Synced" />;
}

function statusTone(s: PolicyStatus): "ok" | "info" | "neutral" {
  if (s === "active") return "ok";
  if (s === "pending") return "info";
  return "neutral";
}

function View() {
  const { product } = useStore();
  const can = usePermission();
  const [policies, setPolicies] = useState<Policy[]>(POLICIES);
  const [splits, setSplits] = useState<PolicySplit[]>(POLICY_SPLITS_INITIAL);

  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState<PolicyStatus | "all">("all");
  const [cp, setCp] = useState("all");
  const sort = useSort<SortKey>("org_name", "asc");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "create">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));
  const cpOptions = CARRIER_PRODUCTS
    .filter((c) => {
      const car = CARRIERS.find((cc) => cc.id === c.carrier_id);
      return car?.product === product;
    })
    .map((c) => ({ value: c.id, label: carrierProductLabel(c.id) }));
  const statuses: { value: PolicyStatus }[] = [{ value: "active" }, { value: "pending" }, { value: "terminated" }];

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = policies.filter((p) => p.product === product).map((p) => {
      const sched = p.commission_schedule_id ? CARRIER_COMMISSION_SCHEDULES.find((x) => x.id === p.commission_schedule_id) : null;
      return {
        ...p,
        carrier_product_name: carrierProductLabel(p.carrier_product_id),
        schedule_name: sched?.schedule_name ?? "Default",
      };
    }).filter((p) => {
      if (s && !(p.org_name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s))) return false;
      if (org !== "all" && p.org_id !== org) return false;
      if (status !== "all" && p.status !== status) return false;
      if (cp !== "all" && p.carrier_product_id !== cp) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number | null>)[k]);
  }, [policies, search, org, status, cp, sort, product]);

  const active = search !== "" || org !== "all" || status !== "all" || cp !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setStatus("all"); setCp("all"); sort.reset(); };

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
    toast.success(mode === "create" ? "Policy created" : "Policy saved");
  };

  const onSync = (policyId: string, ts: string) => {
    setPolicies((prev) => prev.map((p) => (p.id === policyId ? { ...p, attio_last_synced_at: ts } : p)));
  };

  const cols: { key: SortKey | null; label: string }[] = product === "DI"
    ? [
        { key: "id", label: "Policy" },
        { key: "org_name", label: "Org" },
        { key: "carrier_product_name", label: "Carrier Product" },
        { key: "status", label: "Status" },
        { key: "initial_effective_date", label: "Effective Date" },
        { key: "carrier_commission_pct", label: "Carrier %" },
        { key: "override_pct", label: "Override %" },
        { key: null, label: "Synced" },
      ]
    : [
        { key: "id", label: "Policy" },
        { key: "org_name", label: "Org" },
        { key: "carrier_product_name", label: "Carrier Product" },
        { key: "status", label: "Status" },
        { key: "initial_effective_date", label: "Effective Date" },
        { key: "schedule_name", label: "Schedule" },
        { key: null, label: "Synced" },
      ];

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle={`${rows.length} policies · ${product}`}
        actions={<Btn variant="primary" disabled={!can("policies", "create")} onClick={openCreate}>+ New Policy</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search org or policy id…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={status} onChange={(v) => setStatus(v as PolicyStatus | "all")} allLabel="All statuses" options={statuses} />
        <FilterCombobox value={cp} onChange={setCp} placeholder="All carrier products" options={cpOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={policies.length} resourceLabel="policies" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey> cols={cols} sortKey={sort.sortKey} sortDir={sort.sortDir} onToggle={sort.toggle} />
        <tbody>
          {rows.map((p) => (
            <TRow key={p.id} onClick={() => openView(p)}>
              <TCell className="font-mono text-[11px]">{p.id}</TCell>
              <TCell className="font-medium">{p.org_name}</TCell>
              <TCell>{p.carrier_product_name}</TCell>
              <TCell><Pill tone={statusTone(p.status)}>{p.status}</Pill></TCell>
              <TCell>{fmtDate(p.initial_effective_date)}</TCell>
              {product === "DI" ? (
                <>
                  <TCell>{p.carrier_commission_pct != null ? `${p.carrier_commission_pct}%` : "—"}</TCell>
                  <TCell>{p.override_pct != null ? `${p.override_pct}%` : "—"}</TCell>
                </>
              ) : (
                <TCell>{p.schedule_name}</TCell>
              )}
              <TCell><SyncIcon p={p} /></TCell>
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
    id, policy_name: "", org_id: "", org_name: "", carrier_product_id: "",
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
  };
}

function PolicyDrawer({
  open, onClose, mode, policy, existingSplits, product, onSave, onSync, canEdit,
}: {
  open: boolean;
  onClose: () => void;
  mode: "view" | "create";
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
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PolicyStatus | null>(null);
  const [splitsLoadedFromDefaults, setSplitsLoadedFromDefaults] = useState(false);

  // Reset state when drawer (re)opens or target changes.
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setDraft(emptyPolicy(product));
      setDraftSplits([]);
      setSplitsLoadedFromDefaults(false);
      setLastSynced(null);
    } else if (policy) {
      setDraft(policy);
      setDraftSplits(existingSplits);
      setSplitsLoadedFromDefaults(true);
      setLastSynced(policy.attio_last_synced_at);
    }
    setEditingRow(null);
    setConfirmTerminate(false);
    setPendingStatus(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, policy?.id]);

  // Auto-populate splits in create mode when org + carrier product chosen.
  useEffect(() => {
    if (mode !== "create") return;
    if (!draft.org_id || !draft.carrier_product_id) return;
    if (splitsLoadedFromDefaults) return;
    const cpnId = ORG_PRIMARY_CHANNEL_PARTNER[draft.org_id];
    const partner = CHANNEL_PARTNERS.find((c) => c.id === cpnId);
    if (!partner) {
      toast.message("No default splits found for this partner. Add splits manually.");
      setSplitsLoadedFromDefaults(true);
      return;
    }
    // Build a standard 4-row default split set using this partner as channel_partner.
    const next: DraftSplit[] = [
      { id: `nsp_h`, policy_id: draft.id, payee_type: "house", payee_name: "Hollowtree", split_pct: 45, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_r`, policy_id: draft.id, payee_type: "internal_rep", payee_name: "Guy Livingstone", split_pct: 10, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_c`, policy_id: draft.id, payee_type: "channel_partner", payee_name: partner.name, split_pct: 40, payment_method: "hollowtree_paid", source: "default", effective_to: null },
      { id: `nsp_o`, policy_id: draft.id, payee_type: "override", payee_name: "Gallagher", split_pct: 5, payment_method: "carrier_direct", source: "default", effective_to: null },
    ];
    setDraftSplits(next);
    setSplitsLoadedFromDefaults(true);
    toast.success(`Splits loaded from ${partner.name} defaults.`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.org_id, draft.carrier_product_id, mode]);

  // Reset schedule when carrier product changes in LTC mode.
  const setCarrierProduct = (cpId: string) => {
    setDraft((d) => ({ ...d, carrier_product_id: cpId, commission_schedule_id: null }));
  };

  const setOrgId = (id: string) => {
    const o = ORGS.find((x) => x.id === id);
    setDraft((d) => ({ ...d, org_id: id, org_name: o?.name ?? "" }));
    if (mode === "create") setSplitsLoadedFromDefaults(false);
  };

  const handleStatusChange = (s: PolicyStatus) => {
    if (s === "terminated" && draft.status !== "terminated") {
      setPendingStatus(s);
      setConfirmTerminate(true);
      return;
    }
    setDraft((d) => ({ ...d, status: s }));
  };

  const confirmTerminationOK = () => {
    const today = todayISO();
    setDraft((d) => ({ ...d, status: "terminated", updated_at: new Date().toISOString() }));
    setDraftSplits((ss) => ss.map((s) => ({ ...s, effective_to: today })));
    setConfirmTerminate(false);
    setPendingStatus(null);
  };

  const total = draftSplits.reduce((acc, s) => acc + (Number(s.split_pct) || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.005;

  const canSave =
    canEdit && draft.org_id && draft.carrier_product_id && draft.initial_effective_date &&
    (product !== "DI" || draft.carrier_commission_pct != null) &&
    draftSplits.length > 0 && totalOk;

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
      // Flip source to override if this was a default row being modified.
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
      setDraft((d) => ({ ...d, attio_last_synced_at: ts }));
      setSyncing(false);
      toast.success(`Synced to Attio`);
    }, 1000);
  };

  const handleSave = () => {
    onSave({ ...draft, updated_at: new Date().toISOString() }, draftSplits.map(({ _isNew, ...s }) => s));
  };

  const title = mode === "create" ? "New Policy" : `Policy ${draft.id}`;
  const outOfSync = isOutOfSync({ ...draft, attio_last_synced_at: lastSynced });

  // Available schedules filtered by carrier product (LTC).
  const availableSchedules = CARRIER_COMMISSION_SCHEDULES.filter((s) => s.carrier_product_id === draft.carrier_product_id);

  // Carrier product options filtered to current product.
  const cpOptions = CARRIER_PRODUCTS
    .filter((c) => CARRIERS.find((cc) => cc.id === c.carrier_id)?.product === product)
    .map((c) => ({ value: c.id, label: carrierProductLabel(c.id) }));
  const orgOptions = ORGS.filter((o) => o.product === product).map((o) => ({ value: o.id, label: o.name }));

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      {/* Section 1: Metadata */}
      <SectionHeader title="Policy Metadata" />
      <Field label="Organization *">
        <FilterCombobox value={draft.org_id || "all"} onChange={(v) => v !== "all" && setOrgId(v)} placeholder="Select organization…" options={orgOptions} width="w-full" />
      </Field>
      <Field label="Carrier Product *">
        <FilterCombobox value={draft.carrier_product_id || "all"} onChange={(v) => v !== "all" && setCarrierProduct(v)} placeholder="Select carrier product…" options={cpOptions} width="w-full" />
      </Field>
      <Field label="Status *">
        <select
          value={draft.status}
          onChange={(e) => handleStatusChange(e.target.value as PolicyStatus)}
          className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
        >
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="terminated">terminated</option>
        </select>
      </Field>
      <Field label="Effective Date *">
        <input
          type="date"
          value={draft.initial_effective_date}
          onChange={(e) => setDraft((d) => ({ ...d, initial_effective_date: e.target.value }))}
          className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
        />
        <div className="text-[11px] text-black/50 mt-1">Commission tier year calculations start from this date.</div>
      </Field>

      {product === "DI" && (
        <>
          <Field label="Carrier Commission % *">
            <input
              type="number" step="0.01" value={draft.carrier_commission_pct ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, carrier_commission_pct: e.target.value === "" ? null : Number(e.target.value) }))}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
            />
          </Field>
          <Field label="Override %">
            <input
              type="number" step="0.01" value={draft.override_pct ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, override_pct: e.target.value === "" ? null : Number(e.target.value) }))}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
            />
          </Field>
          <div className="text-[11px] text-black/50 -mt-1 mb-3">DI carrier commission is negotiated per case. These rates apply to this policy only.</div>
        </>
      )}

      {product === "LTC" && (
        <>
          <Field label="Commission Schedule">
            <select
              value={draft.commission_schedule_id ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, commission_schedule_id: e.target.value || null }))}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
              disabled={!draft.carrier_product_id}
            >
              <option value="">Use default schedule</option>
              {availableSchedules.map((s) => (
                <option key={s.id} value={s.id}>{s.schedule_name}{s.state_code ? ` (${s.state_code})` : ""}</option>
              ))}
            </select>
          </Field>
          <div className="text-[11px] text-black/50 -mt-1 mb-3">LTC commission rates come from the carrier schedule. Select a specific schedule or use the default for this product.</div>
        </>
      )}

      {/* Section 2: Splits */}
      <SectionHeader title="Commission Splits" subtitle="Per-policy payment waterfall. Must total 100%." />
      <SplitsTable
        rows={draftSplits}
        editingRow={editingRow}
        onEdit={(id) => setEditingRow(id === editingRow ? null : id)}
        onUpdate={updateSplit}
        onRemove={removeSplit}
        canEdit={canEdit && draft.status !== "terminated"}
      />
      <div className="flex items-center justify-between mt-2">
        <Btn variant="secondary" onClick={addBlankSplit} disabled={!canEdit || draft.status === "terminated"}>+ Add Split</Btn>
        <div className={`text-xs font-semibold flex items-center gap-1 ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>
          {totalOk ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          TOTAL: {total.toFixed(2)}%
        </div>
      </div>

      {/* Section 3: Attio Sync */}
      <SectionHeader title="Attio Sync" />
      <div className="border border-black/10 rounded p-3 bg-[#f7f3eb]/40">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs">
            <div className="text-black/60">Last synced</div>
            <div className="font-medium text-black/80 mt-0.5">{fmtDateTime(lastSynced)}</div>
          </div>
          <Btn variant="secondary" onClick={handleSync} disabled={syncing || mode === "create"}>
            {syncing ? "Syncing…" : "Sync to Attio"}
          </Btn>
        </div>
        {outOfSync && lastSynced && (
          <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1">
            <CircleAlert className="h-3 w-3" /> Modified since last sync
          </div>
        )}
        <div className="mt-2">
          <a className="text-[11px] underline text-[#0a3d3e]" href={`https://app.attio.com/policies/${draft.attio_record_id}`} target="_blank" rel="noreferrer">View in Attio</a>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-end gap-2 sticky bottom-0 bg-white pt-3 border-t border-black/10">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={!canSave} title={!totalOk ? "Splits must total 100%" : undefined}>
          {mode === "create" ? "Create Policy" : "Save"}
        </Btn>
      </div>

      {confirmTerminate && (
        <ConfirmDialog
          message="Terminating a policy closes all active commission splits. Continue?"
          onConfirm={confirmTerminationOK}
          onCancel={() => { setConfirmTerminate(false); setPendingStatus(null); }}
        />
      )}
      {pendingStatus === null ? null : null}
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

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white border border-black/15 rounded-md shadow-xl p-4 w-[360px] text-sm">
        <div className="mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>Terminate</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Splits Table ─────────────────────────── */

function SplitsTable({
  rows, editingRow, onEdit, onUpdate, onRemove, canEdit,
}: {
  rows: DraftSplit[];
  editingRow: string | null;
  onEdit: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PolicySplit>) => void;
  onRemove: (id: string) => void;
  canEdit: boolean;
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
            const editing = editingRow === r.id;
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
                  ) : <span className="font-mono text-[11px]">{r.payee_type}</span>}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <PayeeNameSelect type={r.payee_type} value={r.payee_name} onChange={(v) => onUpdate(r.id, { payee_name: v })} />
                  ) : (r.payee_name || <span className="text-black/30">—</span>)}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <input
                      type="number" step="0.01" value={r.split_pct}
                      onChange={(e) => onUpdate(r.id, { split_pct: Number(e.target.value) })}
                      className="w-16 px-1 py-0.5 text-xs border border-black/15 rounded"
                    />
                  ) : `${r.split_pct.toFixed(2)}%`}
                </td>
                <td className="px-2 py-1.5">
                  {editing ? (
                    <select
                      value={r.payment_method}
                      onChange={(e) => onUpdate(r.id, { payment_method: e.target.value as PaymentMethodSetting })}
                      className="px-1 py-0.5 text-xs border border-black/15 rounded bg-white"
                    >
                      <option value="hollowtree_paid">Hollowtree Paid</option>
                      <option value="carrier_direct">Carrier Direct</option>
                    </select>
                  ) : (r.payment_method === "hollowtree_paid" ? "Hollowtree Paid" : "Carrier Direct")}
                </td>
                <td className="px-2 py-1.5">
                  <Pill tone={r.source === "default" ? "neutral" : "warn"}>{r.source}</Pill>
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
            <tr><td colSpan={6} className="px-2 py-4 text-center text-[11px] text-black/40">No splits. Click "+ Add Split" or select an organization to load defaults.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PayeeTypeSelect({ value, onChange }: { value: PayeeType; onChange: (v: PayeeType) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PayeeType)} className="px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
      <option value="house">house</option>
      <option value="internal_rep">internal_rep</option>
      <option value="channel_partner">channel_partner</option>
      <option value="override">override</option>
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
    const opts = CHANNEL_PARTNERS.filter((p) => p.partner_type === "Broker");
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
        <option value="">Select partner…</option>
        {opts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
      </select>
    );
  }
  // override
  const opts = CHANNEL_PARTNERS.filter((p) => p.partner_type === "Override");
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-1 py-0.5 text-xs border border-black/15 rounded bg-white">
      <option value="">Select override…</option>
      {opts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
    </select>
  );
}
