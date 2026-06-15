import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, Field, Input } from "@/components/wireframe/Bits";
import {
  ENROLLMENT_WINDOWS,
  ORGS,
  CARRIERS,
  CHANNEL_PARTNERS,
  type EnrollmentWindow,
  type AffiliateOrganization,
  type AffiliateType,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export const Route = createFileRoute("/enrollment-windows")({ component: View });

type SortKey = "window_type" | "org_name" | "start_date" | "end_date" | "status" | "sponsor_type" | "carrier";

type SponsorShape = "employer" | "employer+affiliate" | "affiliate";

type DraftPartner = { id: string; channel_partner_id: string; role: string };

type Draft = {
  id: string | null;
  sponsor_type: SponsorShape;
  org_id: string | null;
  affiliate_org_id: string | null;
  window_type: "initial" | "annual" | "new_joiner" | "special";
  start_date: string;
  end_date: string;
  default_effective_date: string;
  carrier: string;
  gi_eligible: boolean;
  status: "upcoming" | "open" | "closed";
  notes: string;
  channel_partners: DraftPartner[];
};

function emptyDraft(): Draft {
  return {
    id: null,
    sponsor_type: "employer",
    org_id: null,
    affiliate_org_id: null,
    window_type: "annual",
    start_date: "",
    end_date: "",
    default_effective_date: "",
    carrier: CARRIERS[0]?.name ?? "",
    gi_eligible: true,
    status: "upcoming",
    notes: "",
    channel_partners: [],
  };
}

function toDraft(w: EnrollmentWindow): Draft {
  return {
    id: w.id,
    sponsor_type: w.sponsor_type,
    org_id: w.org_id,
    affiliate_org_id: w.affiliate_org_id,
    window_type: w.window_type,
    start_date: w.start_date ?? "",
    end_date: w.end_date ?? "",
    default_effective_date: w.default_effective_date ?? "",
    carrier: w.carrier,
    gi_eligible: w.gi_eligible,
    status: w.status,
    notes: w.notes,
    channel_partners: w.channel_partners.map((p) => ({ ...p })),
  };
}

function View() {
  const can = usePermission();
  const { product, affiliates, setAffiliates } = useStore();
  const activeAffiliates = useMemo(() => affiliates.filter((a) => !a.deleted_at), [affiliates]);
  const addAffiliate = (a: AffiliateOrganization): string => {
    const id = `aff_${Date.now()}`;
    const rec: AffiliateOrganization = { ...a, id };
    setAffiliates((prev) => [...prev, rec]);
    return id;
  };
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [wtype, setWtype] = useState("all");
  const [status, setStatus] = useState("all");
  const [sponsor, setSponsor] = useState("all");
  const [carrier, setCarrier] = useState("all");
  const sort = useSort<SortKey>("start_date", "desc");

  // Local mutable list (session-scoped) so save/edit persists during the wireframe demo.
  const [windows, setWindows] = useState<EnrollmentWindow[]>(() => ENROLLMENT_WINDOWS.map((w) => ({ ...w, channel_partners: [...w.channel_partners] })));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const productOrgs = ORGS.filter((o) => o.product === product);
  const orgOptions = productOrgs.map((o) => ({ value: o.name, label: o.name }));
  const carrierOptions = CARRIERS.map((c) => ({ value: c.name, label: c.name }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = windows.filter((w) => {
      if (s && !(((w.org_name ?? "").toLowerCase().includes(s)) || ((w.affiliate_org ?? "").toLowerCase().includes(s)))) return false;
      if (org !== "all" && w.org_name !== org) return false;
      if (wtype !== "all" && w.window_type !== wtype) return false;
      if (status !== "all" && w.status !== status) return false;
      if (sponsor !== "all" && !w.sponsor_type.includes(sponsor)) return false;
      if (carrier !== "all" && w.carrier !== carrier) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k] ?? "");
  }, [windows, search, org, wtype, status, sponsor, carrier, sort]);

  const active = search !== "" || org !== "all" || wtype !== "all" || status !== "all" || sponsor !== "all" || carrier !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setWtype("all"); setStatus("all"); setSponsor("all"); setCarrier("all"); sort.reset(); };

  const openCreate = () => { setDraft(emptyDraft()); setDrawerOpen(true); };
  const openEdit = (w: EnrollmentWindow) => { setDraft(toDraft(w)); setDrawerOpen(true); };

  const saveDraft = () => {
    const orgRec = draft.org_id ? ORGS.find((o) => o.id === draft.org_id) ?? null : null;
    const affRec = draft.affiliate_org_id ? affiliates.find((a) => a.id === draft.affiliate_org_id) ?? null : null;
    const isNewJoiner = draft.window_type === "new_joiner";
    const next: EnrollmentWindow = {
      id: draft.id ?? `ew_${Date.now()}`,
      org_id: draft.sponsor_type === "affiliate" ? null : draft.org_id,
      org_name: draft.sponsor_type === "affiliate" ? null : (orgRec?.name ?? null),
      affiliate_org_id: draft.sponsor_type === "employer" ? null : draft.affiliate_org_id,
      affiliate_org: draft.sponsor_type === "employer" ? null : (affRec?.name ?? null),
      window_type: draft.window_type,
      start_date: isNewJoiner ? null : (draft.start_date || null),
      end_date: isNewJoiner ? null : (draft.end_date || null),
      default_effective_date: isNewJoiner ? null : (draft.default_effective_date || null),
      status: isNewJoiner ? "open" : draft.status,
      sponsor_type: draft.sponsor_type,
      carrier: draft.carrier,
      gi_eligible: draft.gi_eligible,
      notes: draft.notes,
      channel_partners: draft.channel_partners.filter((p) => p.channel_partner_id),
    };
    setWindows((prev) => {
      const idx = prev.findIndex((w) => w.id === next.id);
      if (idx === -1) return [...prev, next];
      const copy = prev.slice(); copy[idx] = next; return copy;
    });
    setDrawerOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Enrollment Windows"
        subtitle={`${rows.length} of ${windows.length} windows`}
        actions={<Btn variant="primary" disabled={!can("enrollment_windows", "create")} onClick={openCreate}>+ New Window</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search org or affiliate…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={wtype} onChange={setWtype} allLabel="All types" options={[
          { value: "initial" }, { value: "annual" }, { value: "new_joiner" }, { value: "special" },
        ]} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[
          { value: "upcoming" }, { value: "open" }, { value: "closed" },
        ]} />
        <FilterSelect value={sponsor} onChange={setSponsor} allLabel="All sponsors" options={[
          { value: "employer" }, { value: "affiliate" },
        ]} />
        <FilterCombobox value={carrier} onChange={setCarrier} placeholder="All carriers" options={carrierOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "org_name", label: "Sponsor (Org / Affiliate)" },
            { key: "window_type", label: "Type" },
            { key: "start_date", label: "Start" },
            { key: "end_date", label: "End" },
            { key: "status", label: "Status" },
            { key: "sponsor_type", label: "Sponsor Shape" },
            { key: "carrier", label: "Carrier" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((w) => (
            <TRow key={w.id}>
              <TCell className="font-medium">
                {w.org_name ?? w.affiliate_org}
                {w.org_name && w.affiliate_org ? <div className="text-[10px] text-black/50">+ {w.affiliate_org}</div> : null}
              </TCell>
              <TCell className="capitalize">{w.window_type.replace(/_/g, " ")}</TCell>
              <TCell className="text-black/70">{w.start_date ?? <span className="text-black/30">—</span>}</TCell>
              <TCell className="text-black/70">{w.end_date ?? <span className="text-black/30">—</span>}</TCell>
              <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
              <TCell>{w.sponsor_type}</TCell>
              <TCell>{w.carrier}</TCell>
              <TCell><Btn disabled={!can("enrollment_windows", "update")} onClick={() => openEdit(w)}>Edit</Btn></TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-black/40 text-xs">No enrollment windows match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={draft.id ? "Edit Enrollment Window" : "New Enrollment Window"}
      >
        <WindowForm
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setDrawerOpen(false)}
          onSave={saveDraft}
          affiliates={activeAffiliates}
          addAffiliate={addAffiliate}
        />
      </Drawer>
    </div>
  );
}

function WindowForm({
  draft,
  setDraft,
  onCancel,
  onSave,
  affiliates,
  addAffiliate,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  affiliates: AffiliateOrganization[];
  addAffiliate: (a: AffiliateOrganization) => string;
}) {
  const [partnersOpen, setPartnersOpen] = useState(draft.channel_partners.length > 0);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineType, setInlineType] = useState<AffiliateType>("industry_association");
  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const SPONSOR_OPTIONS: Array<{ value: SponsorShape; label: string }> = [
    { value: "employer", label: "Employer" },
    { value: "employer+affiliate", label: "Employer + Affiliate" },
    { value: "affiliate", label: "Affiliate Only" },
  ];
  const sponsorHelper: Record<SponsorShape, string> = {
    employer: "Standard employer-sponsored window.",
    "employer+affiliate": "Employer-sponsored with affiliate co-sponsorship (e.g., TeamHealth + CCA).",
    affiliate: "Affiliate-sponsored, no employer of record (e.g., CCA direct, union direct).",
  };

  const isNewJoiner = draft.window_type === "new_joiner";
  const showOrg = draft.sponsor_type !== "affiliate";
  const showAffiliate = draft.sponsor_type !== "employer";

  return (
    <div className="-m-4 flex flex-col min-h-full">
      <div className="flex-1 p-4 space-y-5">

        {/* Section 1: Sponsor Shape */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Sponsor Shape</div>
          <div className="flex w-full rounded-md border border-black/15 overflow-hidden">
            {SPONSOR_OPTIONS.map((o) => {
              const selected = draft.sponsor_type === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update("sponsor_type", o.value)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${selected ? "bg-[#0a3d3e] text-white" : "bg-white text-black/70 hover:bg-black/5"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-black/50 mt-1.5">{sponsorHelper[draft.sponsor_type]}</div>

          <div className="mt-3 space-y-3">
            {showOrg && (
              <Field label="Organization">
                <select
                  value={draft.org_id ?? ""}
                  onChange={(e) => update("org_id", e.target.value || null)}
                  className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
                >
                  <option value="">Select organization…</option>
                  {ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
            )}
            {showAffiliate && (
              <Field label="Affiliate">
                <AffiliateDropdown
                  value={draft.affiliate_org_id}
                  affiliates={affiliates}
                  onChange={(id) => update("affiliate_org_id", id)}
                  onNew={() => setInlineOpen(true)}
                />
                {inlineOpen && (
                  <div className="mt-2 rounded-md border border-black/15 bg-[#f7f3eb] p-2.5 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-black/50">Create Affiliate</div>
                    <input
                      autoFocus
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      placeholder="Affiliate name"
                      className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
                    />
                    <select
                      value={inlineType}
                      onChange={(e) => setInlineType(e.target.value as AffiliateType)}
                      className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
                    >
                      <option value="cca">CCA (Clinicians Care Association)</option>
                      <option value="union">Union</option>
                      <option value="industry_association">Association</option>
                      <option value="employer_trust">Employer Trust</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href="/affiliates"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0a3d3e] hover:underline"
                      >
                        More options…
                      </a>
                      <div className="flex gap-1.5">
                        <Btn variant="ghost" onClick={() => { setInlineOpen(false); setInlineName(""); }}>Cancel</Btn>
                        <Btn
                          variant="primary"
                          disabled={!inlineName.trim()}
                          onClick={() => {
                            const isTrust = inlineType === "employer_trust";
                            const level = isTrust ? "employer" : (inlineType === "other" ? "individual" : "individual");
                            const id = addAffiliate({
                              id: "",
                              name: inlineName.trim(),
                              affiliate_type: inlineType,
                              affiliation_level: level,
                              industry: null,
                              is_external: !isTrust,
                              legal_entity_status: null,
                              notes: "",
                              deleted_at: null,
                              logo_url: null,
                            });
                            update("affiliate_org_id", id);
                            setInlineOpen(false);
                            setInlineName("");
                            setInlineType("industry_association");
                          }}
                        >
                          Save
                        </Btn>
                      </div>
                    </div>
                  </div>
                )}
              </Field>
            )}
          </div>
        </section>

        <div className="border-t border-black/10" />

        {/* Section 2: Window Configuration */}
        <section className="space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50">Window Configuration</div>

          <Field label="Window Type">
            <select
              value={draft.window_type}
              onChange={(e) => update("window_type", e.target.value as Draft["window_type"])}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
            >
              <option value="initial">Initial</option>
              <option value="annual">Annual</option>
              <option value="new_joiner">New Joiner</option>
              <option value="special">Special</option>
            </select>
          </Field>

          {isNewJoiner ? (
            <div className="rounded-md bg-black/[0.04] border border-black/10 px-3 py-2.5 text-[12px] text-black/65 leading-relaxed">
              New joiner windows are always open. Per-individual enrollment deadlines are calculated from hire date using the organization's new joiner rules (enrollment period days, waiting period days, effective date rule).
            </div>
          ) : (
            <>
              <Field label="Start Date">
                <input type="date" value={draft.start_date} onChange={(e) => update("start_date", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" />
              </Field>
              <Field label="End Date">
                <input type="date" value={draft.end_date} onChange={(e) => update("end_date", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" />
              </Field>
              <Field label="Default Effective Date">
                <input type="date" value={draft.default_effective_date} onChange={(e) => update("default_effective_date", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" />
              </Field>
            </>
          )}

          <Field label="Carrier">
            <select
              value={draft.carrier}
              onChange={(e) => update("carrier", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
            >
              {CARRIERS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-black/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft.gi_eligible}
              onChange={(e) => update("gi_eligible", e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Guaranteed Issue eligible in this window
          </label>

          {!isNewJoiner && (
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => update("status", e.target.value as Draft["status"])}
                className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
              >
                <option value="upcoming">Upcoming</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          )}

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Internal notes about this enrollment window..."
              rows={3}
              className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white"
            />
          </Field>
        </section>

        <div className="border-t border-black/10" />

        {/* Section 3: Channel Partner Attribution */}
        <section>
          <button
            type="button"
            onClick={() => setPartnersOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/60 hover:text-black/80"
          >
            {partnersOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Channel Partner Attribution
          </button>
          {partnersOpen && (
            <div className="mt-3 space-y-2">
              {draft.channel_partners.length === 0 && (
                <div className="text-[11px] text-black/40">No partners attributed yet.</div>
              )}
              {draft.channel_partners.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2">
                  <select
                    value={p.channel_partner_id}
                    onChange={(e) => {
                      const copy = draft.channel_partners.slice();
                      copy[idx] = { ...p, channel_partner_id: e.target.value };
                      update("channel_partners", copy);
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-black/15 rounded bg-white"
                  >
                    <option value="">Select partner…</option>
                    {CHANNEL_PARTNERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Input
                    defaultValue={p.role}
                    placeholder="e.g., primary, co-distributor"
                  />
                  <button
                    type="button"
                    onClick={() => update("channel_partners", draft.channel_partners.filter((_, i) => i !== idx))}
                    className="text-black/40 hover:text-rose-600 p-1"
                    aria-label="Remove partner"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("channel_partners", [...draft.channel_partners, { id: `ewcp_${Date.now()}`, channel_partner_id: "", role: "" }])}
                className="text-xs text-[#0a3d3e] hover:underline"
              >
                + Add Partner
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-black/10 px-4 py-3 flex items-center justify-end gap-2 bg-white">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave}>Save</Btn>
      </div>
    </div>
  );
}
