import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Btn, Drawer, Field } from "@/components/wireframe/Bits";
import { FilterRow, FilterSearch, FilterSelect, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { usePermission, useStore } from "@/lib/wireframe/store";
import type { AffiliateOrganization, AffiliateType, AffiliationLevel, AffiliateIndustry, LegalEntityStatus } from "@/lib/wireframe/data";
import { Shield, Building2, Handshake, Camera, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/affiliates")({ component: View });

type SortKey = "name" | "affiliate_type" | "affiliation_level" | "industry" | "is_external" | "status";

// Cycle of sample "uploaded" logos for the wireframe upload interaction.
const SAMPLE_LOGOS = ["icon:shield", "icon:building", "icon:handshake", "icon:image"];
let sampleLogoIdx = 0;
function nextSampleLogo() {
  const v = SAMPLE_LOGOS[sampleLogoIdx % SAMPLE_LOGOS.length];
  sampleLogoIdx++;
  return v;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AffiliateLogo({
  affiliate,
  size = 32,
}: {
  affiliate: Pick<AffiliateOrganization, "name" | "logo_url">;
  size?: number;
}) {
  const px = `${size}px`;
  const radius = size >= 48 ? "rounded-md" : "rounded";
  const iconSize = Math.max(12, Math.round(size * 0.5));
  const baseStyle = { width: px, height: px, minWidth: px } as const;

  if (affiliate.logo_url) {
    if (affiliate.logo_url.startsWith("icon:")) {
      const which = affiliate.logo_url.slice(5);
      const Icon = which === "shield" ? Shield : which === "handshake" ? Handshake : which === "building" ? Building2 : ImageIcon;
      return (
        <div
          style={baseStyle}
          className={`${radius} bg-white border border-black/10 flex items-center justify-center text-[#0a3d3e]`}
        >
          <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.75} />
        </div>
      );
    }
    return (
      <img
        src={affiliate.logo_url}
        alt={`${affiliate.name} logo`}
        style={baseStyle}
        className={`${radius} object-cover border border-black/10`}
      />
    );
  }
  const fontSize = Math.max(9, Math.round(size * 0.36));
  return (
    <div
      style={baseStyle}
      className={`${radius} bg-black/10 text-black/60 font-semibold flex items-center justify-center select-none`}
    >
      <span style={{ fontSize }}>{initials(affiliate.name)}</span>
    </div>
  );
}

const TYPE_OPTIONS: Array<{ value: AffiliateType; label: string }> = [
  { value: "cca", label: "CCA (Clinicians Care Association)" },
  { value: "union", label: "Union" },
  { value: "industry_association", label: "Association" },
  { value: "employer_trust", label: "Employer Trust" },
  { value: "other", label: "Other" },
];

const TYPE_SHORT: Record<AffiliateType, string> = {
  cca: "CCA",
  union: "Union",
  industry_association: "Association",
  employer_trust: "Trust",
  other: "Other",
};

const TYPE_BADGE: Record<AffiliateType, string> = {
  cca: "bg-teal-100 text-teal-800",
  union: "bg-blue-100 text-blue-800",
  industry_association: "bg-purple-100 text-purple-800",
  employer_trust: "bg-amber-100 text-amber-800",
  other: "bg-black/10 text-black/70",
};

const INDUSTRY_OPTIONS: Array<{ value: AffiliateIndustry; label: string }> = [
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "government", label: "Government" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "professional_services", label: "Professional Services" },
  { value: "transportation", label: "Transportation" },
  { value: "hospitality", label: "Hospitality" },
  { value: "other", label: "Other" },
];

const LEGAL_OPTIONS: Array<{ value: LegalEntityStatus; label: string }> = [
  { value: "formed_no_tax_id", label: "Formed (no tax ID)" },
  { value: "formed_with_tax_id", label: "Formed (with tax ID)" },
  { value: "operational", label: "Operational" },
];

export function TypeBadge({ type }: { type: AffiliateType }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE[type]}`}>{TYPE_SHORT[type]}</span>;
}

function emptyDraft(): AffiliateOrganization {
  return {
    id: "",
    name: "",
    affiliate_type: "industry_association",
    affiliation_level: "individual",
    industry: null,
    is_external: true,
    legal_entity_status: null,
    notes: "",
    deleted_at: null,
    logo_url: null,
  };
}

function View() {
  const can = usePermission();
  const { affiliates, setAffiliates } = useStore();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AffiliateType | "all">("all");
  const [level, setLevel] = useState<AffiliationLevel | "all">("all");
  const sort = useSort<SortKey>("name", "asc");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<AffiliateOrganization>(emptyDraft());
  const [isCreate, setIsCreate] = useState(true);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = affiliates.filter((a) => {
      if (s && !a.name.toLowerCase().includes(s)) return false;
      if (type !== "all" && a.affiliate_type !== type) return false;
      if (level !== "all" && a.affiliation_level !== level) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => {
      if (k === "status") return r.deleted_at ? "z_deactivated" : "active";
      if (k === "is_external") return r.is_external ? "external" : "internal";
      return (r as unknown as Record<string, string | null>)[k] ?? "";
    });
  }, [affiliates, search, type, level, sort]);

  const active = search !== "" || type !== "all" || level !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setType("all"); setLevel("all"); sort.reset(); };

  const openCreate = () => { setDraft(emptyDraft()); setIsCreate(true); setDrawerOpen(true); };
  const openEdit = (a: AffiliateOrganization) => { setDraft({ ...a }); setIsCreate(false); setDrawerOpen(true); };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    setAffiliates((prev) => {
      if (isCreate) {
        return [...prev, { ...draft, id: `aff_${Date.now()}` }];
      }
      const idx = prev.findIndex((a) => a.id === draft.id);
      if (idx === -1) return prev;
      const copy = prev.slice(); copy[idx] = { ...draft }; return copy;
    });
    setDrawerOpen(false);
  };

  const deactivate = () => {
    if (!confirm(`Deactivate "${draft.name}"? It will no longer appear in selectors.`)) return;
    setAffiliates((prev) => prev.map((a) => a.id === draft.id ? { ...a, deleted_at: new Date().toISOString() } : a));
    setDrawerOpen(false);
  };

  const reactivate = () => {
    setAffiliates((prev) => prev.map((a) => a.id === draft.id ? { ...a, deleted_at: null } : a));
    setDraft({ ...draft, deleted_at: null });
  };

  return (
    <div>
      <PageHeader
        title="Affiliates"
        subtitle={`${rows.length} of ${affiliates.length} affiliates`}
        actions={<Btn variant="primary" disabled={!can("affiliate_organizations", "create")} onClick={openCreate}>+ New Affiliate</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search by name…" />
        <FilterSelect<AffiliateType>
          value={type}
          onChange={setType}
          allLabel="All types"
          options={[
            { value: "cca", label: "CCA" },
            { value: "union", label: "Union" },
            { value: "industry_association", label: "Association" },
            { value: "employer_trust", label: "Trust" },
            { value: "other", label: "Other" },
          ]}
        />
        <FilterSelect<AffiliationLevel>
          value={level}
          onChange={setLevel}
          allLabel="All levels"
          options={[
            { value: "individual", label: "Individual" },
            { value: "employer", label: "Employer" },
          ]}
        />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: null, label: "" },
            { key: "name", label: "Name" },
            { key: "affiliate_type", label: "Type" },
            { key: "affiliation_level", label: "Level" },
            { key: "industry", label: "Industry" },
            { key: "is_external", label: "External" },
            { key: "status", label: "Status" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((a) => {
            const deactivated = !!a.deleted_at;
            return (
              <TRow key={a.id} onClick={() => openEdit(a)}>
                <TCell className="w-10"><div className={deactivated ? "opacity-50" : ""}><AffiliateLogo affiliate={a} size={32} /></div></TCell>
                <TCell className={`font-medium ${deactivated ? "text-black/40" : ""}`}>{a.name}</TCell>
                <TCell><TypeBadge type={a.affiliate_type} /></TCell>
                <TCell className="capitalize text-black/70">{a.affiliation_level}</TCell>
                <TCell className="text-black/70">{a.industry ? <span className="capitalize">{a.industry.replace(/_/g, " ")}</span> : <span className="text-black/30">—</span>}</TCell>
                <TCell>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${a.is_external ? "bg-black/5 text-black/70" : "bg-emerald-50 text-emerald-800"}`}>
                    {a.is_external ? "External" : "Internal"}
                  </span>
                </TCell>
                <TCell>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${deactivated ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
                    {deactivated ? "Deactivated" : "Active"}
                  </span>
                </TCell>
              </TRow>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40 text-xs">No affiliates match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={isCreate ? "New Affiliate" : draft.name || "Affiliate"}
      >
        <AffiliateForm
          draft={draft}
          setDraft={setDraft}
          isCreate={isCreate}
          onCancel={() => setDrawerOpen(false)}
          onSave={saveDraft}
          onDeactivate={!isCreate && !draft.deleted_at && can("affiliate_organizations", "delete") ? deactivate : undefined}
          onReactivate={!isCreate && !!draft.deleted_at ? reactivate : undefined}
        />
      </Drawer>
    </div>
  );
}

export function AffiliateForm({
  draft,
  setDraft,
  isCreate,
  onCancel,
  onSave,
  onDeactivate,
  onReactivate,
}: {
  draft: AffiliateOrganization;
  setDraft: (d: AffiliateOrganization) => void;
  isCreate: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
}) {
  const update = <K extends keyof AffiliateOrganization>(k: K, v: AffiliateOrganization[K]) => setDraft({ ...draft, [k]: v });

  const onTypeChange = (t: AffiliateType) => {
    const next = { ...draft, affiliate_type: t };
    // Auto-derive level for known types
    if (t === "cca" || t === "union" || t === "industry_association") next.affiliation_level = "individual";
    else if (t === "employer_trust") next.affiliation_level = "employer";
    // Auto-derive is_external default
    next.is_external = t !== "employer_trust";
    setDraft(next);
  };

  const levelAutoSet = draft.affiliate_type !== "other";

  return (
    <div className="-m-4 flex flex-col min-h-full">
      <div className="flex-1 p-4 space-y-4">
        {draft.deleted_at && (
          <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-[12px] text-rose-800">
            This affiliate is deactivated. It does not appear in selectors.
          </div>
        )}

        <LogoUpload
          affiliate={draft}
          onPick={() => update("logo_url", nextSampleLogo())}
          onClear={draft.logo_url ? () => update("logo_url", null) : undefined}
        />



        <Field label="Name">
          <input
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Affiliate name"
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          />
        </Field>

        <Field label="Type">
          <select
            value={draft.affiliate_type}
            onChange={(e) => onTypeChange(e.target.value as AffiliateType)}
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Level">
          <select
            value={draft.affiliation_level}
            onChange={(e) => update("affiliation_level", e.target.value as AffiliationLevel)}
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          >
            <option value="individual">Individual</option>
            <option value="employer">Employer</option>
          </select>
          {levelAutoSet && (
            <div className="text-[11px] text-black/50 mt-1">Auto-set from type. Change if needed.</div>
          )}
        </Field>

        <Field label="Industry">
          <select
            value={draft.industry ?? ""}
            onChange={(e) => update("industry", (e.target.value || null) as AffiliateIndustry | null)}
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          >
            <option value="">Not set</option>
            {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <label className="flex items-start gap-2 text-sm text-black/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.is_external}
            onChange={(e) => update("is_external", e.target.checked)}
            className="h-3.5 w-3.5 mt-0.5"
          />
          <span className="text-[12px] leading-snug">This is an external third-party entity (not created by Hollowtree).</span>
        </label>

        <Field label="Legal Status">
          <select
            value={draft.legal_entity_status ?? ""}
            onChange={(e) => update("legal_entity_status", (e.target.value || null) as LegalEntityStatus | null)}
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          >
            <option value="">Not set</option>
            {LEGAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Internal notes about this affiliate..."
            rows={3}
            className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
          />
        </Field>

        {!isCreate && onDeactivate && (
          <div className="pt-2">
            <button type="button" onClick={onDeactivate} className="text-xs text-rose-600 hover:text-rose-700 hover:underline">
              Deactivate affiliate
            </button>
          </div>
        )}
        {!isCreate && onReactivate && (
          <div className="pt-2">
            <button type="button" onClick={onReactivate} className="text-xs text-emerald-700 hover:underline">
              Reactivate affiliate
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-black/10 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave} disabled={!draft.name.trim()}>Save</Btn>
      </div>
    </div>
  );
}

function LogoUpload({
  affiliate,
  onPick,
  onClear,
}: {
  affiliate: Pick<AffiliateOrganization, "name" | "logo_url">;
  onPick: () => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1.5">Logo</div>
      <div className="flex items-center gap-3">
        <div className="relative group">
          <AffiliateLogo affiliate={affiliate} size={64} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#0a3d3e] text-white flex items-center justify-center shadow border border-white hover:bg-[#0a3d3e]/90"
            aria-label="Upload logo"
            title="Upload logo"
          >
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-[#0a3d3e] hover:underline text-left"
          >
            {affiliate.logo_url ? "Replace logo" : "Upload logo"}
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-black/50 hover:text-rose-600 text-left"
            >
              Remove
            </button>
          )}
          <div className="text-[11px] text-black/40">PNG or SVG, square preferred.</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          // Wireframe: ignore the actual file, swap to a sample logo.
          if (e.target.files && e.target.files.length > 0) onPick();
          e.target.value = "";
        }}
      />
    </div>
  );
}

