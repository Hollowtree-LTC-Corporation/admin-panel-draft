import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Info, X } from "lucide-react";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, useDrawer, Field, SectionTitle, Card } from "@/components/wireframe/Bits";
import {
  MAGIC_TOKENS,
  TOKEN_AUDIT_LOG,
  INDIVIDUALS,
  ORGS,
  type MagicToken,
  type MagicTokenStatus,
  type MagicTokenClass,
  type TokenAuditEntry,
  type TokenAuditOutcome,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/tokens")({ component: View });

const NOW = new Date("2026-06-16T12:00:00Z");

type IndLite = (typeof INDIVIDUALS)[number];
const INDIVIDUAL_BY_ID: Record<string, IndLite> = Object.fromEntries(INDIVIDUALS.map((i) => [i.id, i]));
const ORG_BY_ID: Record<string, (typeof ORGS)[number]> = Object.fromEntries(ORGS.map((o) => [o.id, o]));

const CLASS_TONE: Record<MagicTokenClass, "info" | "purple"> = { enrollment: "info", portal: "purple" };
const CLASS_LABEL: Record<MagicTokenClass, string> = { enrollment: "Enrollment", portal: "Portal" };
const STATUS_TONE: Record<MagicTokenStatus, "ok" | "neutral" | "bad"> = { active: "ok", revoked: "neutral", expired: "bad" };
const STATUS_LABEL: Record<MagicTokenStatus, string> = { active: "Active", revoked: "Revoked", expired: "Expired" };
const OUTCOME_TONE: Record<TokenAuditOutcome, "ok" | "warn" | "bad" | "neutral"> = {
  success: "ok",
  rate_limited: "warn",
  expired: "neutral",
  revoked: "neutral",
  invalid_token: "bad",
  class_mismatch: "bad",
};
const OUTCOME_LABEL: Record<TokenAuditOutcome, string> = {
  success: "Success",
  rate_limited: "Rate limited",
  expired: "Expired",
  revoked: "Revoked",
  invalid_token: "Invalid token",
  class_mismatch: "Class mismatch",
};

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}
function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = d - NOW.getTime();
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const mo = Math.round(day / 30);
  const yr = Math.round(day / 365);
  let phrase: string;
  if (sec < 60) phrase = `${sec}s`;
  else if (min < 60) phrase = `${min}m`;
  else if (hr < 48) phrase = `${hr}h`;
  else if (day < 60) phrase = `${day}d`;
  else if (mo < 24) phrase = `${mo}mo`;
  else phrase = `${yr}y`;
  return diff < 0 ? `${phrase} ago` : `in ${phrase}`;
}
function shortHash(h: string): string {
  if (h.length <= 14) return h;
  return `hash_${h.slice(0, 6)}…${h.slice(-6)}`;
}
function isEffectivelyExpired(t: MagicToken): boolean {
  return t.status === "active" && new Date(t.expires_at).getTime() < NOW.getTime();
}
function spouseTag(individual_id: string | null) {
  if (!individual_id) return null;
  const ind = INDIVIDUAL_BY_ID[individual_id];
  if (!ind || ind.relationship_type !== "spouse") return null;
  return <span className="ml-1 inline-block px-1 py-0.5 rounded text-[9px] bg-black/5 text-black/60">Spouse</span>;
}
function copy(text: string, label = "Copied") {
  void navigator.clipboard?.writeText(text);
  toast.success(label);
}

function View() {
  const { role } = useStore();
  const can = usePermission();

  if (role !== "admin" && role !== "ops") {
    return (
      <div>
        <PageHeader title="Magic Tokens" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Magic tokens are restricted to admin and ops roles.
        </div>
      </div>
    );
  }

  // ------- Magic Tokens table state
  const [tokens, setTokens] = useState<MagicToken[]>(MAGIC_TOKENS);
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState<MagicTokenClass | "all">("all");
  const [status, setStatus] = useState<MagicTokenStatus | "all">("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  type MTSortKey = "individual_name" | "token_class" | "status" | "created_at" | "expires_at" | "use_count" | "last_used_at";
  const sort = useSort<MTSortKey>("expires_at", "asc");

  const orgOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const t of tokens) {
      const ind = INDIVIDUAL_BY_ID[t.individual_id];
      if (ind?.org_id) ids.add(ind.org_id);
    }
    return Array.from(ids)
      .map((id) => ({ value: id, label: ORG_BY_ID[id]?.name ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tokens]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = tokens.filter((t) => {
      if (q && !t.individual_name.toLowerCase().includes(q)) return false;
      if (klass !== "all" && t.token_class !== klass) return false;
      if (status !== "all" && t.status !== status) return false;
      if (orgFilter !== "all") {
        const ind = INDIVIDUAL_BY_ID[t.individual_id];
        if (ind?.org_id !== orgFilter) return false;
      }
      return true;
    });
    return sort.applySort(f, (r, k) => (r as unknown as Record<string, string | number>)[k] ?? "");
  }, [tokens, search, klass, status, orgFilter, sort]);

  const activeFilters = search !== "" || klass !== "all" || status !== "all" || orgFilter !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setKlass("all"); setStatus("all"); setOrgFilter("all"); sort.reset(); };

  // ------- Revoke modal
  const [revokeTarget, setRevokeTarget] = useState<MagicToken | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  function openRevoke(t: MagicToken) { setRevokeTarget(t); setRevokeReason(""); }
  function closeRevoke() { setRevokeTarget(null); setRevokeReason(""); }
  function confirmRevoke() {
    if (!revokeTarget) return;
    if (revokeReason.trim().length < 10) return;
    setTokens((prev) => prev.map((t) => t.id === revokeTarget.id ? {
      ...t,
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: "Guy (admin)",
      revocation_reason: revokeReason.trim(),
    } : t));
    toast.success("Token revoked", { description: "Recorded to audit_log" });
    closeRevoke();
  }

  // ------- Drawers
  const tokenDrawer = useDrawer<MagicToken>();
  const auditDrawer = useDrawer<TokenAuditEntry>();

  // ------- Audit log state
  const [auditOutcome, setAuditOutcome] = useState<TokenAuditOutcome | "all">("all");
  const [auditClass, setAuditClass] = useState<MagicTokenClass | "all">("all");
  const [auditRange, setAuditRange] = useState<"24h" | "7d" | "30d">("30d");
  const [auditPage, setAuditPage] = useState(0);
  const [tokenIdFilter, setTokenIdFilter] = useState<string | null>(null);
  const PAGE_SIZE = 50;
  const auditFiltered = useMemo(() => {
    const cutoffMs = NOW.getTime() - ({ "24h": 1, "7d": 7, "30d": 30 }[auditRange] * 24 * 3600 * 1000);
    const f = TOKEN_AUDIT_LOG.filter((e) => {
      if (tokenIdFilter && e.token_id !== tokenIdFilter) return false;
      if (auditOutcome !== "all" && e.outcome !== auditOutcome) return false;
      if (auditClass !== "all" && e.token_class !== auditClass) return false;
      if (new Date(e.created_at).getTime() < cutoffMs) return false;
      return true;
    });
    return [...f].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [auditOutcome, auditClass, auditRange, tokenIdFilter]);
  const auditPaged = auditFiltered.slice(auditPage * PAGE_SIZE, (auditPage + 1) * PAGE_SIZE);
  const auditTotalPages = Math.max(1, Math.ceil(auditFiltered.length / PAGE_SIZE));

  // ------- Export modal (PHI gate)
  const [exportOpen, setExportOpen] = useState(false);
  const [exportReason, setExportReason] = useState("");
  function confirmExport() {
    if (exportReason.trim().length < 10) return;
    toast.success("Audit log export prepared", { description: "Logged to audit_log (action=export_phi)" });
    setExportOpen(false); setExportReason("");
  }

  return (
    <div>
      <PageHeader title="Magic Tokens" subtitle={`${rows.length} of ${tokens.length} tokens · view & revoke only`} />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual…" />
        <FilterSelect value={klass} onChange={(v) => setKlass(v as MagicTokenClass | "all")} allLabel="All classes" options={[
          { value: "enrollment", label: "Enrollment" }, { value: "portal", label: "Portal" },
        ]} />
        <FilterCombobox value={orgFilter} onChange={setOrgFilter} placeholder="All organizations" options={orgOptions} width="w-56" />
        <FilterSelect value={status} onChange={(v) => setStatus(v as MagicTokenStatus | "all")} allLabel="All statuses" options={[
          { value: "active", label: "Active" }, { value: "revoked", label: "Revoked" }, { value: "expired", label: "Expired" },
        ]} />
        <ClearFiltersLink show={activeFilters} onClick={clearAll} />
        <ExportCsvButton filteredCount={rows.length} totalCount={tokens.length} resourceLabel="magic tokens" adminOnly />
      </FilterRow>
      <TableShell>
        <SortableTHead<MTSortKey>
          cols={[
            { key: "individual_name", label: "Individual" },
            { key: "token_class", label: "Class ⓘ" },
            { key: "status", label: "Status" },
            { key: "created_at", label: "Created" },
            { key: "expires_at", label: "Expires" },
            { key: "use_count", label: "Uses" },
            { key: "last_used_at", label: "Last Used" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((t) => {
            const drift = isEffectivelyExpired(t);
            return (
              <TRow key={t.id} onClick={() => tokenDrawer.open(t)}>
                <TCell className="font-medium">
                  {t.individual_name}
                  {spouseTag(t.individual_id)}
                </TCell>
                <TCell>
                  <span title={t.token_class === "enrollment"
                    ? "Enrollment: used during enrollment window, expires at enrollment_close_date (max 45 days)."
                    : "Portal: used post-purchase for account access, rolling 12-month expiry."}>
                    <Pill tone={CLASS_TONE[t.token_class]}>{CLASS_LABEL[t.token_class]}</Pill>
                  </span>
                </TCell>
                <TCell><Pill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Pill></TCell>
                <TCell className="font-mono text-[11px]">{fmtDate(t.created_at)}</TCell>
                <TCell className="font-mono text-[11px]">
                  <div className="flex items-center gap-1">
                    {fmtDate(t.expires_at)}
                    {drift && (
                      <span title="Token has passed expires_at but status hasn't been updated yet. Sweep cron runs daily.">
                        <Pill tone="amber">Effectively expired (sweep pending)</Pill>
                      </span>
                    )}
                  </div>
                </TCell>
                <TCell>{t.use_count}</TCell>
                <TCell className="font-mono text-[11px]">{t.last_used_at ? fmtDate(t.last_used_at) : "—"}</TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  {t.status === "active" && can("magic_tokens", "revoke") ? (
                    <Btn variant="danger" onClick={() => openRevoke(t)}>Revoke</Btn>
                  ) : (
                    <span className="text-black/30">—</span>
                  )}
                </TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>

      {/* Token Audit Log */}
      <div className="mt-8">
        <PageHeader
          title="Token Audit Log"
          subtitle={
            <>
              <div>Append-only validation attempts · {auditFiltered.length} entries{tokenIdFilter ? ` · filtered to token ${tokenIdFilter}` : ""}</div>
              <div className="mt-0.5">This log records every token validation attempt. No raw token values or personal information stored; tokens are SHA-256 hashed at write time.</div>
            </>
          }
        />
        <FilterRow>
          <div className="flex items-center gap-1">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button key={r} onClick={() => { setAuditRange(r); setAuditPage(0); }}
                className={`px-2 py-1 text-xs rounded border ${auditRange === r ? "bg-[#0a3d3e] text-white border-[#0a3d3e]" : "bg-white border-black/15 text-black/70 hover:bg-black/5"}`}>
                Last {r}
              </button>
            ))}
          </div>
          <FilterSelect value={auditOutcome} onChange={(v) => { setAuditOutcome(v as TokenAuditOutcome | "all"); setAuditPage(0); }} allLabel="All outcomes" options={[
            { value: "success", label: "Success" },
            { value: "invalid_token", label: "Invalid token" },
            { value: "revoked", label: "Revoked" },
            { value: "expired", label: "Expired" },
            { value: "class_mismatch", label: "Class mismatch" },
            { value: "rate_limited", label: "Rate limited" },
          ]} />
          <FilterSelect value={auditClass} onChange={(v) => { setAuditClass(v as MagicTokenClass | "all"); setAuditPage(0); }} allLabel="All classes" options={[
            { value: "enrollment", label: "Enrollment" }, { value: "portal", label: "Portal" },
          ]} />
          {tokenIdFilter && (
            <button onClick={() => setTokenIdFilter(null)} className="text-xs text-[#0a3d3e] underline hover:no-underline">Clear token filter</button>
          )}
          <button onClick={() => setExportOpen(true)} className="ml-auto inline-flex items-center gap-1 rounded font-medium px-2 py-1 text-xs bg-white border border-black/15 text-black/80 hover:bg-black/5">
            Export CSV
          </button>
        </FilterRow>
        <TableShell>
          <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
            <tr>{["Timestamp", "Result", "Hashed Token", "IP", "Individual", "Class", "User Agent"].map((c) => (<th key={c} className="text-left font-medium px-3 py-2">{c}</th>))}</tr>
          </thead>
          <tbody>
            {auditPaged.map((l) => (
              <TRow key={l.id} onClick={() => auditDrawer.open(l)}>
                <TCell className="font-mono text-[11px]">{fmtDateTime(l.created_at)}</TCell>
                <TCell><Pill tone={OUTCOME_TONE[l.outcome]}>{OUTCOME_LABEL[l.outcome]}</Pill></TCell>
                <TCell className="font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    {shortHash(l.attempted_token_hash)}
                    <button onClick={(e) => { e.stopPropagation(); copy(l.attempted_token_hash, "Hash copied"); }} className="text-black/40 hover:text-black"><Copy className="h-3 w-3" /></button>
                  </span>
                </TCell>
                <TCell className="font-mono text-[11px]">{l.ip_address}</TCell>
                <TCell onClick={(e) => e.stopPropagation()}>
                  {l.individual_id ? (
                    <Link to="/individuals/$id" params={{ id: l.individual_id }} className="text-[#0a3d3e] underline hover:no-underline">
                      {l.individual_name}
                    </Link>
                  ) : <span className="text-black/30">—</span>}
                  {spouseTag(l.individual_id)}
                </TCell>
                <TCell>{l.token_class ? <Pill tone={CLASS_TONE[l.token_class]}>{CLASS_LABEL[l.token_class]}</Pill> : <span className="text-black/30">—</span>}</TCell>
                <TCell className="text-black/60 max-w-[260px] truncate"><span title={l.user_agent}>{l.user_agent.length > 40 ? l.user_agent.slice(0, 40) + "…" : l.user_agent}</span></TCell>
              </TRow>
            ))}
          </tbody>
        </TableShell>
        <div className="flex items-center justify-end gap-2 mt-2 text-[11px] text-black/60">
          <button disabled={auditPage === 0} onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
            className="px-2 py-0.5 border border-black/15 rounded disabled:opacity-40">‹ Prev</button>
          <span>Page {auditPage + 1} of {auditTotalPages}</span>
          <button disabled={auditPage + 1 >= auditTotalPages} onClick={() => setAuditPage((p) => p + 1)}
            className="px-2 py-0.5 border border-black/15 rounded disabled:opacity-40">Next ›</button>
        </div>
      </div>

      {/* Revoke modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeRevoke} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-md shadow-xl">
            <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between">
              <div className="font-medium text-sm">Revoke token for {revokeTarget.individual_name}?</div>
              <button onClick={closeRevoke} className="text-black/50 hover:text-black"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Pill tone={CLASS_TONE[revokeTarget.token_class]}>{CLASS_LABEL[revokeTarget.token_class]}</Pill>
                {spouseTag(revokeTarget.individual_id)}
                <span className="text-black/60">Expires {fmtDate(revokeTarget.expires_at)} · Used {revokeTarget.use_count}× · Last {revokeTarget.last_used_at ? fmtDate(revokeTarget.last_used_at) : "never"}</span>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/50 block mb-1">Reason (required, min 10 chars)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Enrollee reported unauthorized access at 3pm today"
                  className="w-full px-2 py-1 text-sm border border-black/15 rounded h-24"
                />
                <div className="text-[11px] text-black/40 mt-1">{revokeReason.trim().length}/10</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Revocation is permanent. Re-issuance happens on the Individual Detail screen.</span>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-black/10 flex justify-end gap-2">
              <Btn onClick={closeRevoke}>Cancel</Btn>
              <Btn variant="danger" disabled={revokeReason.trim().length < 10} onClick={confirmRevoke}>Revoke Token</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Export PHI gate */}
      {exportOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setExportOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-md shadow-xl">
            <div className="px-4 py-3 border-b border-black/10 font-medium text-sm">Export {auditFiltered.length} audit log entries?</div>
            <div className="p-4 space-y-3 text-sm">
              <p className="text-black/70">Token audit log entries contain no PII, but exports are themselves audit-logged for SOC 2 evidence.</p>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/50 block mb-1">Reason (required, min 10 chars)</label>
                <textarea value={exportReason} onChange={(e) => setExportReason(e.target.value)} className="w-full px-2 py-1 text-sm border border-black/15 rounded h-20" placeholder="e.g. Quarterly SOC 2 evidence pull" />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-black/10 flex justify-end gap-2">
              <Btn onClick={() => setExportOpen(false)}>Cancel</Btn>
              <Btn variant="primary" disabled={exportReason.trim().length < 10} onClick={confirmExport}>Confirm export</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Magic Token detail drawer */}
      <Drawer open={tokenDrawer.state.open} onClose={tokenDrawer.close} title="Magic Token Detail">
        {tokenDrawer.state.data && (() => {
          const t = tokenDrawer.state.data;
          const ind = INDIVIDUAL_BY_ID[t.individual_id];
          const org = ind ? ORG_BY_ID[ind.org_id] : null;
          const related = TOKEN_AUDIT_LOG.filter((e) => e.token_id === t.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
          return (
            <div>
              <SectionTitle>Header</SectionTitle>
              <Card className="p-3">
                <div className="font-medium">
                  {t.individual_name}
                  {spouseTag(t.individual_id)}
                </div>
                <div className="text-xs text-black/60">{ind?.email}</div>
                {org && (
                  <div className="text-xs mt-1">
                    <Link to="/organizations/$id" params={{ id: org.id }} className="text-[#0a3d3e] underline hover:no-underline">{org.name}</Link>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Pill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Pill>
                  <Pill tone={CLASS_TONE[t.token_class]}>{CLASS_LABEL[t.token_class]}</Pill>
                  {isEffectivelyExpired(t) && <Pill tone="amber">Effectively expired (sweep pending)</Pill>}
                </div>
              </Card>

              <SectionTitle>Token metadata</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Created"><span className="font-mono text-xs">{fmtDateTime(t.created_at)}</span></Field>
                <Field label="Expires"><span className="font-mono text-xs">{fmtDateTime(t.expires_at)}</span> <span className="text-[11px] text-black/50">({relTime(t.expires_at)})</span></Field>
                <Field label="Use count">{t.use_count}</Field>
                <Field label="Last used">{t.last_used_at ? <><span className="font-mono text-xs">{fmtDateTime(t.last_used_at)}</span> <span className="text-[11px] text-black/50">({relTime(t.last_used_at)})</span></> : "Never"}</Field>
                <Field label="Portal destination">
                  {t.portal_destination === "cca" ? <span title="Routes to CCA member portal (deferred to Phase D+)">cca</span>
                    : t.portal_destination ? t.portal_destination : "—"}
                </Field>
                <Field label="Token ID"><span className="font-mono text-[11px]">{t.id}</span></Field>
              </div>

              {t.status === "revoked" && (
                <>
                  <SectionTitle>Revocation details</SectionTitle>
                  <Card className="p-3 space-y-2 text-xs">
                    <div><span className="text-black/50">Revoked at:</span> <span className="font-mono">{t.revoked_at ? fmtDateTime(t.revoked_at) : "—"}</span></div>
                    <div><span className="text-black/50">Revoked by:</span> {t.revoked_by ?? "—"}</div>
                    <div><span className="text-black/50">Reason:</span> {t.revocation_reason ?? "—"}</div>
                  </Card>
                </>
              )}

              <SectionTitle>Recent validation attempts</SectionTitle>
              {related.length === 0 ? (
                <div className="text-xs text-black/50">No validation attempts recorded.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                    <tr><th className="text-left font-medium px-2 py-1">Timestamp</th><th className="text-left font-medium px-2 py-1">IP</th><th className="text-left font-medium px-2 py-1">Outcome</th></tr>
                  </thead>
                  <tbody>
                    {related.map((e) => (
                      <tr key={e.id} className="border-t border-black/5">
                        <td className="px-2 py-1 font-mono text-[11px]">{fmtDateTime(e.created_at)}</td>
                        <td className="px-2 py-1 font-mono text-[11px]">{e.ip_address}</td>
                        <td className="px-2 py-1"><Pill tone={OUTCOME_TONE[e.outcome]}>{OUTCOME_LABEL[e.outcome]}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                onClick={() => { setTokenIdFilter(t.id); setAuditPage(0); tokenDrawer.close(); }}
                className="mt-2 text-xs text-[#0a3d3e] underline hover:no-underline"
              >
                View all attempts →
              </button>
            </div>
          );
        })()}
      </Drawer>

      {/* Audit Log Entry detail drawer */}
      <Drawer open={auditDrawer.state.open} onClose={auditDrawer.close} title="Audit Log Entry">
        {auditDrawer.state.data && (() => {
          const e = auditDrawer.state.data;
          const tok = e.token_id ? tokens.find((t) => t.id === e.token_id) ?? null : null;
          const ind = e.individual_id ? INDIVIDUAL_BY_ID[e.individual_id] : null;
          const related = TOKEN_AUDIT_LOG.filter((r) => r.attempted_token_hash === e.attempted_token_hash && r.id !== e.id).slice(0, 5);
          return (
            <div>
              <SectionTitle>Header</SectionTitle>
              <Card className="p-3 flex items-center justify-between">
                <div className="font-mono text-xs">{fmtDateTime(e.created_at)}</div>
                <Pill tone={OUTCOME_TONE[e.outcome]}>{OUTCOME_LABEL[e.outcome]}</Pill>
              </Card>

              <SectionTitle>Token context</SectionTitle>
              <Field label="Hashed token (SHA-256)">
                <div className="flex items-center gap-1">
                  <code className="font-mono text-[11px] break-all">{e.attempted_token_hash}</code>
                  <button onClick={() => copy(e.attempted_token_hash, "Hash copied")} className="text-black/40 hover:text-black"><Copy className="h-3 w-3" /></button>
                </div>
              </Field>
              <Field label="Token ID">
                {tok ? (
                  <button onClick={() => { auditDrawer.close(); tokenDrawer.open(tok); }} className="text-[#0a3d3e] underline hover:no-underline text-xs font-mono">{tok.id}</button>
                ) : <span className="text-black/40">— (token not resolved)</span>}
              </Field>
              <Field label="Individual">
                {ind ? (
                  <span>
                    <Link to="/individuals/$id" params={{ id: ind.id }} className="text-[#0a3d3e] underline hover:no-underline">{ind.full_name}</Link>
                    <span className="text-black/50 text-xs ml-1">({ind.email})</span>
                    {spouseTag(ind.id)}
                  </span>
                ) : <span className="text-black/40">—</span>}
              </Field>
              <Field label="Class">{e.token_class ? <Pill tone={CLASS_TONE[e.token_class]}>{CLASS_LABEL[e.token_class]}</Pill> : <span className="text-black/40">—</span>}</Field>

              <SectionTitle>Request context</SectionTitle>
              <Field label="IP address"><span className="font-mono text-xs">{e.ip_address}</span> <span className="text-[11px] text-black/40">(GeoIP deferred)</span></Field>
              <Field label="User agent"><span className="text-xs break-all">{e.user_agent}</span></Field>
              <Field label="Created at"><span className="font-mono text-xs">{fmtDateTime(e.created_at)}</span></Field>

              <SectionTitle>Related attempts (same hash)</SectionTitle>
              {related.length === 0 ? (
                <div className="text-xs text-black/50">No other attempts recorded for this hash.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                    <tr><th className="text-left font-medium px-2 py-1">Timestamp</th><th className="text-left font-medium px-2 py-1">IP</th><th className="text-left font-medium px-2 py-1">Outcome</th></tr>
                  </thead>
                  <tbody>
                    {related.map((r) => (
                      <tr key={r.id} className="border-t border-black/5">
                        <td className="px-2 py-1 font-mono text-[11px]">{fmtDateTime(r.created_at)}</td>
                        <td className="px-2 py-1 font-mono text-[11px]">{r.ip_address}</td>
                        <td className="px-2 py-1"><Pill tone={OUTCOME_TONE[r.outcome]}>{OUTCOME_LABEL[r.outcome]}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
