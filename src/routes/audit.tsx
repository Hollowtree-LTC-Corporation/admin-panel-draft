import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ChevronDown, Copy, ExternalLink, ShieldAlert, Lock, Shield, Eye, EyeOff, FileSearch, Download, X } from "lucide-react";
import { PageHeader, Pill, Btn } from "@/components/wireframe/Bits";
import { AUDIT_LOG, type AuditEntry, type AuditAction } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterCombobox, FilterDate, ClearFiltersLink } from "@/components/wireframe/Filters";
import { toast } from "sonner";

export const Route = createFileRoute("/audit")({ component: View });

// ---------- helpers ----------
const ACTION_META: Record<AuditAction, { label: string; chip: string; border: string; dot: string; isPhi: boolean }> = {
  create:      { label: "create",      chip: "bg-emerald-100 text-emerald-800", border: "",                          dot: "bg-emerald-500", isPhi: false },
  update:      { label: "update",      chip: "bg-sky-100 text-sky-800",         border: "",                          dot: "bg-sky-500",     isPhi: false },
  soft_delete: { label: "soft_delete", chip: "bg-rose-100 text-rose-800",       border: "",                          dot: "bg-rose-500",    isPhi: false },
  view_phi:    { label: "view_phi",    chip: "bg-orange-100 text-orange-800",   border: "border-l-[3px] border-l-orange-500", dot: "bg-orange-500", isPhi: true },
  export_phi:  { label: "export_phi",  chip: "bg-red-100 text-red-900",         border: "border-l-[3px] border-l-red-700",    dot: "bg-red-700",    isPhi: true },
};
const ALL_ACTIONS: AuditAction[] = ["create", "update", "soft_delete", "view_phi", "export_phi"];

const PHI_TABLES = new Set(["individuals", "enrollment_responses", "spouses"]);
const PHI_FIELDS = new Set([
  "ssn_encrypted", "date_of_birth", "address_line_1", "city", "state",
  "zip_code", "phone", "personal_email", "secondary_phone", "income",
]);

const NAVIGABLE: Record<string, (id: string) => string> = {
  organizations: (id) => `/organizations/${id}`,
  individuals: (id) => `/individuals/${id}`,
  policies: () => `/policies`,
  enrollment_windows: () => `/enrollment-windows`,
  benefit_classes: () => `/organizations`,
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function monthStartISO() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

type Preset = "today" | "7d" | "30d" | "month" | "all" | "custom";
function presetRange(p: Preset): { from: string; to: string } {
  switch (p) {
    case "today": return { from: todayISO(), to: todayISO() };
    case "7d": return { from: daysAgoISO(6), to: todayISO() };
    case "30d": return { from: daysAgoISO(29), to: todayISO() };
    case "month": return { from: monthStartISO(), to: todayISO() };
    case "all": return { from: "", to: "" };
    default: return { from: "", to: "" };
  }
}
function describeRange(p: Preset, from: string, to: string): string {
  if (p === "today") return "today";
  if (p === "7d") return "last 7 days";
  if (p === "30d") return "last 30 days";
  if (p === "month") return "this month";
  if (p === "all") return "all time";
  if (from && to) return `${from} to ${to}`;
  if (from) return `from ${from}`;
  if (to) return `through ${to}`;
  return "all time";
}

function copy(text: string, label = "Copied") {
  navigator.clipboard?.writeText(text).then(() => toast.success(label));
}

// ---------- access denied ----------
function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <Lock className="h-10 w-10 text-black/30 mb-3" />
      <div className="text-sm font-medium text-black/80">You do not have permission to view the audit log.</div>
      <div className="text-xs text-black/50 mt-1">Contact your administrator for access.</div>
    </div>
  );
}

// ---------- main view ----------
function View() {
  const { role, product } = useStore();

  // filters
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const [table, setTable] = useState<string>("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [actor, setActor] = useState("all");

  const [preset, setPreset] = useState<Preset>("7d");
  const initial = presetRange("7d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  // pagination
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  // expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // revealed PHI fields per row
  const [revealed, setRevealed] = useState<Record<string, Set<string>>>({});

  // export modal
  const [exportOpen, setExportOpen] = useState(false);

  if (role !== "admin") {
    return (
      <div>
        <PageHeader title="Audit Log" />
        <AccessDenied />
      </div>
    );
  }

  const tableOptions = useMemo(
    () => Array.from(new Set(AUDIT_LOG.map((l) => l.table))).sort().map((v) => ({ value: v, label: v })),
    [],
  );
  const actorOptions = useMemo(
    () => Array.from(new Set(AUDIT_LOG.map((l) => l.actor_name))).sort().map((v) => ({ value: v, label: v })),
    [],
  );

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    return AUDIT_LOG.filter((l) => {
      if (s && !l.record_id.toLowerCase().includes(s)) return false;
      if (table !== "all" && l.table !== table) return false;
      if (action !== "all" && l.action !== action) return false;
      if (actor !== "all" && l.actor_name !== actor) return false;
      const day = l.ts.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    }).sort((a, b) => b.ts.localeCompare(a.ts));
  }, [debounced, table, action, actor, from, to]);

  // reset page on filter changes
  useEffect(() => { setPage(1); }, [debounced, table, action, actor, from, to, pageSize]);

  const filtersActive = debounced !== "" || table !== "all" || action !== "all" || actor !== "all" || preset !== "7d";
  const clearAll = () => {
    setSearch(""); setTable("all"); setAction("all"); setActor("all");
    setPreset("7d"); const r = presetRange("7d"); setFrom(r.from); setTo(r.to);
  };

  const counts = useMemo(() => {
    const c: Record<AuditAction, number> = { create: 0, update: 0, soft_delete: 0, view_phi: 0, export_phi: 0 };
    for (const r of filtered) c[r.action]++;
    return c;
  }, [filtered]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const subtitle = `${total.toLocaleString()} ${total === 1 ? "entry" : "entries"} · ${describeRange(preset, from, to)}${filtersActive ? " · filtered" : ""}`;

  function setPresetAndDates(p: Preset) {
    setPreset(p);
    const r = presetRange(p);
    setFrom(r.from); setTo(r.to);
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={subtitle}
        actions={
          <Btn variant="secondary" onClick={() => setExportOpen(true)}>
            <Download className="h-3 w-3" /> Export CSV
          </Btn>
        }
      />

      {/* Preset row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {([
          ["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"], ["all", "All time"],
        ] as Array<[Preset, string]>).map(([k, label]) => {
          const active = preset === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPresetAndDates(k)}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                active ? "bg-[#0a3d3e] text-white border-[#0a3d3e]" : "bg-white text-black/70 border-black/15 hover:bg-black/5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Filter by record ID…" />
        <FilterCombobox
          value={table}
          onChange={(v) => setTable(v)}
          options={tableOptions}
          placeholder="All tables"
        />
        <ActionDropdown value={action} onChange={setAction} />
        <FilterCombobox value={actor} onChange={setActor} options={actorOptions} placeholder="All users" />
        <FilterDate value={from} onChange={(v) => { setFrom(v); setPreset("custom"); }} />
        <span className="text-[11px] text-black/40">to</span>
        <FilterDate value={to} onChange={(v) => { setTo(v); setPreset("custom"); }} />
        <ClearFiltersLink show={filtersActive} onClick={clearAll} />
      </FilterRow>

      {/* Summary bar */}
      <div className="bg-white border border-black/10 rounded-md px-3 py-2 mb-2 flex items-center gap-4 flex-wrap text-[11px]">
        {ALL_ACTIONS.map((a) => {
          const meta = ACTION_META[a];
          const n = counts[a];
          const zero = n === 0;
          return (
            <div key={a} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${zero ? "bg-black/15" : meta.dot}`} />
              <span className={`font-mono ${zero ? "text-black/30" : "text-black/70"}`}>{a}:</span>
              <span className={`font-medium ${zero ? "text-black/30" : "text-black/80"}`}>{n}</span>
              {meta.isPhi && !zero ? <ShieldAlert className="h-3 w-3 text-amber-600" /> : null}
            </div>
          );
        })}
      </div>

      {pageRows.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-md py-16 flex flex-col items-center text-center">
          <FileSearch className="h-8 w-8 text-black/25 mb-2" />
          <div className="text-sm text-black/70">No audit log entries match the current filters.</div>
          <button onClick={clearAll} className="text-xs text-[#0a3d3e] underline mt-2">Clear filters</button>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-44">Timestamp ↓</th>
                  <th className="text-left font-medium px-3 py-2">Table</th>
                  <th className="text-left font-medium px-3 py-2">Record ID</th>
                  <th className="text-left font-medium px-3 py-2">Action</th>
                  <th className="text-left font-medium px-3 py-2">Actor</th>
                  <th className="text-right font-medium px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const meta = ACTION_META[row.action];
                  const isOpen = expandedId === row.id;
                  return (
                    <RowAndDiff
                      key={row.id}
                      row={row}
                      meta={meta}
                      isOpen={isOpen}
                      onToggle={() => setExpandedId(isOpen ? null : row.id)}
                      revealed={revealed[row.id] ?? new Set()}
                      onReveal={(field) => {
                        setRevealed((prev) => {
                          const next = { ...prev };
                          const s = new Set(next[row.id] ?? []);
                          s.add(field);
                          next[row.id] = s;
                          // Simulated audit write (no recursion — would set guard server-side)
                          toast.success("PHI reveal logged", { description: `field: ${field}` });
                          return next;
                        });
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-black/10 text-[11px] text-black/60">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-1.5 py-0.5 border border-black/15 rounded bg-white text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>Showing {total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} of {total.toLocaleString()}</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2 py-0.5 border border-black/15 rounded disabled:opacity-30"
              >‹ Prev</button>
              <span>Page {safePage} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2 py-0.5 border border-black/15 rounded disabled:opacity-30"
              >Next ›</button>
            </div>
          </div>
        </div>
      )}

      {exportOpen ? (
        <ExportModal
          onClose={() => setExportOpen(false)}
          filtered={filtered}
          product={product}
          rangeDesc={describeRange(preset, from, to)}
          filterSummary={{
            table: table === "all" ? null : table,
            action: action === "all" ? null : action,
            actor: actor === "all" ? null : actor,
            from, to, record_id: debounced || null,
          }}
        />
      ) : null}
    </div>
  );
}

// ---------- Action dropdown (custom with divider + icons) ----------
function ActionDropdown({ value, onChange }: { value: AuditAction | "all"; onChange: (v: AuditAction | "all") => void }) {
  const [open, setOpen] = useState(false);
  const label = value === "all" ? "All actions" : value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 text-xs border border-black/15 rounded bg-white inline-flex items-center gap-2 min-w-[8.5rem] justify-between"
      >
        <span className="inline-flex items-center gap-1.5">
          {value !== "all" ? <span className={`h-1.5 w-1.5 rounded-full ${ACTION_META[value].dot}`} /> : null}
          {label}
        </span>
        <ChevronDown className="h-3 w-3 text-black/40" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-48 bg-white border border-black/15 rounded shadow-lg py-1 text-xs">
            <button
              onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full text-left px-2 py-1 hover:bg-[#f7f3eb] ${value === "all" ? "bg-[#f7f3eb] font-medium" : ""}`}
            >All actions</button>
            {(["create", "update", "soft_delete"] as AuditAction[]).map((a) => (
              <button
                key={a}
                onClick={() => { onChange(a); setOpen(false); }}
                className={`w-full text-left px-2 py-1 hover:bg-[#f7f3eb] inline-flex items-center gap-2 ${value === a ? "bg-[#f7f3eb] font-medium" : ""}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ACTION_META[a].dot}`} />
                {a}
              </button>
            ))}
            <div className="my-1 border-t border-black/10" />
            <div className="px-2 pb-0.5 text-[9px] uppercase tracking-wider text-black/40">PHI Access</div>
            {(["view_phi", "export_phi"] as AuditAction[]).map((a) => (
              <button
                key={a}
                onClick={() => { onChange(a); setOpen(false); }}
                className={`w-full text-left px-2 py-1 hover:bg-[#f7f3eb] inline-flex items-center gap-2 ${value === a ? "bg-[#f7f3eb] font-medium" : ""}`}
              >
                <Shield className="h-3 w-3 text-amber-600" />
                {a}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------- Row + diff panel ----------
function RowAndDiff({
  row, meta, isOpen, onToggle, revealed, onReveal,
}: {
  row: AuditEntry;
  meta: typeof ACTION_META[AuditAction];
  isOpen: boolean;
  onToggle: () => void;
  revealed: Set<string>;
  onReveal: (field: string) => void;
}) {
  const truncatedId = row.record_id.length > 11 ? `${row.record_id.slice(0, 8)}…` : row.record_id;
  const navHref = NAVIGABLE[row.table]?.(row.record_id);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-t border-black/5 cursor-pointer hover:bg-[#f7f3eb]/60 ${meta.border}`}
      >
        <td className="px-3 py-2 whitespace-nowrap" title={`${row.ts} (UTC)`}>
          <button
            onClick={(e) => { e.stopPropagation(); copy(row.ts, "ISO timestamp copied"); }}
            className="hover:underline"
          >
            {fmtDate(row.ts)}
          </button>
        </td>
        <td className="px-3 py-2 font-mono text-[11px]">{row.table}</td>
        <td className="px-3 py-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1">
            {navHref ? (
              <Link
                to={navHref}
                onClick={(e) => e.stopPropagation()}
                className="text-[#0a3d3e] hover:underline inline-flex items-center gap-0.5"
                title={row.record_id}
              >
                {truncatedId}
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            ) : (
              <span title={row.record_id}>{truncatedId}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); copy(row.record_id, "Record ID copied"); }}
              className="text-black/30 hover:text-black/70"
              title="Copy full ID"
            >
              <Copy className="h-3 w-3" />
            </button>
          </span>
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.chip}`}>
            {meta.isPhi ? <Shield className="h-2.5 w-2.5" /> : null}
            {meta.label}
          </span>
        </td>
        <td className="px-3 py-2" title={`User ID: ${row.actor_id}`}>{row.actor_name}</td>
        <td className="px-3 py-2 text-right text-black/40">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
        </td>
      </tr>
      {isOpen ? (
        <tr className={`bg-stone-50/60 ${meta.border}`}>
          <td colSpan={6} className="px-3 py-3">
            <DiffPanel row={row} revealed={revealed} onReveal={onReveal} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ---------- Diff panel ----------
function DiffPanel({ row, revealed, onReveal }: { row: AuditEntry; revealed: Set<string>; onReveal: (field: string) => void }) {
  const isPhiTable = PHI_TABLES.has(row.table);

  if (row.action === "view_phi" || row.action === "export_phi") {
    const after = row.after ?? {};
    const reason = (after as Record<string, unknown>)["reason"] as string | undefined;
    const tone = row.action === "view_phi" ? "text-orange-800" : "text-red-900";
    return (
      <div className="bg-white border border-black/10 rounded p-3">
        <div className={`flex items-center gap-1.5 font-medium text-xs mb-2 ${tone}`}>
          <Shield className="h-3.5 w-3.5" />
          PHI Access Event
        </div>
        {reason ? (
          <div className="text-xs mb-2"><span className="text-black/50">Reason:</span> {reason}</div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {Object.entries(after).filter(([k]) => k !== "reason").map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] uppercase text-black/40">{k}</div>
              <div className="font-mono">{Array.isArray(v) ? v.join(", ") : String(v)}</div>
            </div>
          ))}
        </div>
        <DiffFooter row={row} />
      </div>
    );
  }

  if (row.action === "create") {
    return (
      <div>
        <div className="text-[10px] uppercase text-emerald-700 font-medium mb-1">Created values</div>
        <JsonBlock obj={row.after} table={row.table} isPhiTable={isPhiTable} revealed={revealed} onReveal={onReveal} tint="emerald" />
        <DiffFooter row={row} />
      </div>
    );
  }
  if (row.action === "soft_delete") {
    return (
      <div>
        <div className="text-[10px] uppercase text-rose-700 font-medium mb-1">Deleted record state</div>
        <JsonBlock obj={row.before} table={row.table} isPhiTable={isPhiTable} revealed={revealed} onReveal={onReveal} tint="rose" />
        {row.after && Object.keys(row.after).length > 0 ? (
          <div className="mt-2">
            <div className="text-[10px] uppercase text-black/40 mb-1">Soft-delete metadata</div>
            <JsonBlock obj={row.after} table={row.table} isPhiTable={false} revealed={revealed} onReveal={onReveal} tint="neutral" />
          </div>
        ) : null}
        <DiffFooter row={row} />
      </div>
    );
  }
  // update
  const before = (row.before ?? {}) as Record<string, unknown>;
  const after = (row.after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase text-rose-700 font-medium mb-1">Before</div>
          <DiffSide side="before" keys={keys} before={before} after={after} table={row.table} isPhiTable={isPhiTable} revealed={revealed} onReveal={onReveal} />
        </div>
        <div>
          <div className="text-[10px] uppercase text-emerald-700 font-medium mb-1">After</div>
          <DiffSide side="after" keys={keys} before={before} after={after} table={row.table} isPhiTable={isPhiTable} revealed={revealed} onReveal={onReveal} />
        </div>
      </div>
      <DiffFooter row={row} />
    </div>
  );
}

function DiffSide({ side, keys, before, after, table, isPhiTable, revealed, onReveal }: {
  side: "before" | "after";
  keys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  table: string;
  isPhiTable: boolean;
  revealed: Set<string>;
  onReveal: (f: string) => void;
}) {
  const src = side === "before" ? before : after;
  return (
    <pre className="bg-stone-50 border border-black/10 rounded p-2 text-[11px] font-mono overflow-auto">
{"{"}{keys.map((k) => {
  const v = src[k];
  if (v === undefined) return null;
  const changed = before[k] !== after[k];
  const bg = changed ? (side === "before" ? "bg-rose-100" : "bg-emerald-100") : "";
  const muted = !changed ? "text-black/40" : "";
  const phi = isPhiTable && PHI_FIELDS.has(k);
  const isRevealed = revealed.has(`${side}:${k}`);
  return (
    <div key={k} className={`px-1 rounded ${bg} ${muted}`}>
      {"  "}<span className="text-purple-700">{JSON.stringify(k)}</span>: {phi && !isRevealed ? (
        <>
          <span className="select-none">"●●●●●●"</span>
          <button
            onClick={() => onReveal(`${side}:${k}`)}
            className="ml-1 text-[10px] text-[#0a3d3e] underline inline-flex items-center gap-0.5"
          ><Eye className="h-2.5 w-2.5" /> reveal</button>
        </>
      ) : (
        <>
          <span>{JSON.stringify(v)}</span>
          {phi && isRevealed ? <EyeOff className="h-2.5 w-2.5 inline ml-1 text-black/30" /> : null}
        </>
      )},
    </div>
  );
})}{"}"}
    </pre>
  );
}

function JsonBlock({ obj, table, isPhiTable, revealed, onReveal, tint }: {
  obj: Record<string, unknown> | null;
  table: string;
  isPhiTable: boolean;
  revealed: Set<string>;
  onReveal: (f: string) => void;
  tint: "emerald" | "rose" | "neutral";
}) {
  if (!obj) return <div className="text-[11px] text-black/40 italic">No values.</div>;
  const tintBg = tint === "emerald" ? "bg-emerald-50/40" : tint === "rose" ? "bg-rose-50/40" : "bg-stone-50";
  return (
    <pre className={`${tintBg} border border-black/10 rounded p-2 text-[11px] font-mono overflow-auto`}>
{"{"}{Object.entries(obj).map(([k, v]) => {
  const phi = isPhiTable && PHI_FIELDS.has(k);
  const isRevealed = revealed.has(`v:${k}`);
  return (
    <div key={k} className="px-1">
      {"  "}<span className="text-purple-700">{JSON.stringify(k)}</span>: {phi && !isRevealed ? (
        <>
          <span className="select-none">"●●●●●●"</span>
          <button onClick={() => onReveal(`v:${k}`)} className="ml-1 text-[10px] text-[#0a3d3e] underline inline-flex items-center gap-0.5">
            <Eye className="h-2.5 w-2.5" /> reveal
          </button>
        </>
      ) : (
        <span>{JSON.stringify(v)}</span>
      )},
    </div>
  );
})}{"}"}
    </pre>
  );
}

function DiffFooter({ row }: { row: AuditEntry }) {
  return (
    <div className="mt-2 text-[10px] text-black/40 flex items-center gap-2">
      <button onClick={() => copy(row.id, "Entry ID copied")} className="hover:underline inline-flex items-center gap-1">
        Entry ID: <span className="font-mono">{row.id}</span>
        <Copy className="h-2.5 w-2.5" />
      </button>
      <span>·</span>
      <span>Logged: {fmtDate(row.ts)}</span>
    </div>
  );
}

// ---------- Export modal ----------
function ExportModal({ onClose, filtered, product, rangeDesc, filterSummary }: {
  onClose: () => void;
  filtered: AuditEntry[];
  product: string;
  rangeDesc: string;
  filterSummary: { table: string | null; action: string | null; actor: string | null; from: string; to: string; record_id: string | null };
}) {
  const [mode, setMode] = useState<"metadata_only" | "full">("metadata_only");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [working, setWorking] = useState(false);

  const n = filtered.length;
  const isLarge = n > 10000;
  const gateOk = mode === "metadata_only" || (reason.trim().length >= 10 && ack);

  function summarizeFilters() {
    const parts: string[] = [];
    if (filterSummary.table) parts.push(`table=${filterSummary.table}`);
    if (filterSummary.action) parts.push(`action=${filterSummary.action}`);
    if (filterSummary.actor) parts.push(`actor=${filterSummary.actor}`);
    if (filterSummary.record_id) parts.push(`record_id~${filterSummary.record_id}`);
    if (filterSummary.from || filterSummary.to) parts.push(`${filterSummary.from || "…"}→${filterSummary.to || "…"}`);
    return parts.length ? parts.join(" · ") : "none";
  }

  function buildCsv(): string {
    const header = mode === "metadata_only"
      ? ["timestamp", "table_name", "record_id", "action", "actor_id", "actor_name"]
      : ["timestamp", "table_name", "record_id", "action", "actor_id", "actor_name", "old_values", "new_values"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const base = [r.ts, r.table, r.record_id, r.action, r.actor_id, r.actor_name].map(csvEscape);
      if (mode === "full") {
        base.push(csvEscape(r.before ? JSON.stringify(r.before) : ""));
        base.push(csvEscape(r.after ? JSON.stringify(r.after) : ""));
      }
      lines.push(base.join(","));
    }
    return lines.join("\n");
  }

  function handleExport() {
    if (!gateOk || working) return;
    setWorking(true);
    // Simulate fail-closed audit write
    try {
      // (would INSERT into audit_log here)
      toast.success("Audit entry written", { description: `export_phi · ${mode} · ${n} rows` });
    } catch {
      toast.error("Audit write failed. Export aborted.");
      setWorking(false);
      return;
    }
    setTimeout(() => {
      const csv = buildCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const range = filterSummary.from && filterSummary.to ? `${filterSummary.from}-to-${filterSummary.to}` : "all";
      const ts = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
      a.href = url;
      a.download = `audit-log-${product.toLowerCase()}-${range}-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export complete");
      setWorking(false);
      onClose();
    }, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/10">
          <div className="font-medium text-sm">Export Audit Log</div>
          <button onClick={onClose} className="text-black/50 hover:text-black"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 text-sm space-y-3">
          <div className="text-xs text-black/60">
            Exporting <span className="font-medium text-black/80">{n.toLocaleString()}</span> {n === 1 ? "entry" : "entries"} · {rangeDesc}
            <div className="mt-0.5">Filters: <span className="font-mono text-[11px]">{summarizeFilters()}</span></div>
            {isLarge ? <div className="text-amber-700 mt-1">Large export ({n.toLocaleString()} entries). This may take a moment.</div> : null}
          </div>

          <label className="flex items-start gap-2 cursor-pointer border border-black/15 rounded p-2.5 hover:bg-stone-50">
            <input type="radio" checked={mode === "metadata_only"} onChange={() => setMode("metadata_only")} className="mt-0.5" />
            <div>
              <div className="text-xs font-medium">Metadata only</div>
              <div className="text-[11px] text-black/55">Exports event metadata without record contents. Does not contain PHI.</div>
            </div>
          </label>

          <label className={`flex items-start gap-2 cursor-pointer border rounded p-2.5 ${mode === "full" ? "border-amber-300 bg-amber-50/60" : "border-black/15 hover:bg-stone-50"}`}>
            <input type="radio" checked={mode === "full"} onChange={() => setMode("full")} className="mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium inline-flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-700" />
                Full export (includes record diffs)
              </div>
              <div className="text-[11px] text-black/55">Includes before/after record contents. May contain PHI. Requires access authorization.</div>
            </div>
          </label>

          {mode === "full" ? (
            <div className="border-t border-black/10 pt-3 space-y-2">
              <div>
                <div className="text-[10px] uppercase text-black/50 mb-1">Reason for export</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Minimum 10 characters…"
                  className="w-full px-2 py-1.5 text-xs border border-black/15 rounded"
                />
                <div className="text-[10px] text-black/40 mt-0.5">{reason.trim().length}/10</div>
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                <span>I acknowledge this export may contain PHI and will be handled in accordance with data protection policies.</span>
              </label>
            </div>
          ) : null}
        </div>
        <div className="px-4 py-3 border-t border-black/10 flex items-center justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!gateOk || working} onClick={handleExport}>
            <Download className="h-3 w-3" />
            {working ? "Exporting…" : "Export"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function csvEscape(v: string): string {
  if (v == null) return "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
