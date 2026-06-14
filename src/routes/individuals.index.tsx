import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { INDIVIDUALS, ORGS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals/")({ component: IndividualsView });

type SortDir = "asc" | "desc" | null;
type SortKey = "full_name" | "org_name" | "coverage_status" | "stage" | "plan" | "monthly_premium_cents" | "billing_group_id" | "relationship_type";

const COVERAGE_OPTIONS = ["not_started", "in_progress", "purchased", "active", "suspended", "canceled", "lapsed"];

function IndividualsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const createDrawer = useDrawer();
  const isLTC = product === "LTC";
  const planLabel = isLTC ? "Purchased Plan" : "Coverage Plan";

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const productRows = INDIVIDUALS.filter((i) => i.product === product);
  const orgOptions = ORGS.filter((o) => o.product === product);
  const stageOptions = Array.from(new Set(productRows.map((r) => r.stage)));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = productRows.filter((i) => {
      if (s && !(i.full_name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s))) return false;
      if (orgFilter !== "all" && i.org_id !== orgFilter) return false;
      if (coverageFilter !== "all" && i.coverage_status !== coverageFilter) return false;
      if (stageFilter !== "all" && i.stage !== stageFilter) return false;
      if (isLTC && typeFilter !== "all") {
        const isSpouse = i.relationship_type === "spouse";
        if (typeFilter === "Spouse" && !isSpouse) return false;
        if (typeFilter === "Employee" && isSpouse) return false;
      }
      return true;
    });
    if (sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        if (sortKey === "plan") {
          av = isLTC ? a.purchased_plan : a.coverage_plan;
          bv = isLTC ? b.purchased_plan : b.coverage_plan;
        } else if (sortKey === "relationship_type") {
          av = a.relationship_type === "spouse" ? "Spouse" : "Employee";
          bv = b.relationship_type === "spouse" ? "Spouse" : "Employee";
        } else {
          av = (a as Record<SortKey, string | number>)[sortKey];
          bv = (b as Record<SortKey, string | number>)[sortKey];
        }
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return rows;
  }, [productRows, search, orgFilter, coverageFilter, stageFilter, typeFilter, sortKey, sortDir, isLTC]);

  const filtersActive = search !== "" || orgFilter !== "all" || coverageFilter !== "all" || stageFilter !== "all" || typeFilter !== "all" || sortKey !== "full_name" || sortDir !== "asc";

  const clearAll = () => {
    setSearch(""); setOrgFilter("all"); setCoverageFilter("all"); setStageFilter("all"); setTypeFilter("all");
    setSortKey("full_name"); setSortDir("asc");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") { setSortDir(null); }
    else { setSortDir("asc"); }
  };

  const subtitle = filtered.length === productRows.length
    ? `${productRows.length} enrollees in ${product}`
    : `${filtered.length} of ${productRows.length} enrollees in ${product}`;

  const selectClass = "px-2 py-1 text-xs border border-black/15 rounded bg-white";

  return (
    <div>
      <PageHeader
        title="Individuals"
        subtitle={subtitle}
        actions={<Btn variant="primary" disabled={!can("individuals", "create")} onClick={() => createDrawer.open()}>+ New Individual</Btn>}
      />

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
          placeholder="Search name or email…"
          className="px-2 py-1 text-xs border border-black/15 rounded bg-white w-56"
        />
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className={selectClass}>
          <option value="all">All orgs</option>
          {orgOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)} className={selectClass}>
          <option value="all">All coverage</option>
          {COVERAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectClass}>
          <option value="all">All stages</option>
          {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {isLTC && (
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option value="all">All types</option>
            <option value="Employee">Employee</option>
            <option value="Spouse">Spouse</option>
          </select>
        )}
        {filtersActive && (
          <button onClick={clearAll} className="text-xs text-[#0a3d3e] underline hover:no-underline">Clear filters</button>
        )}
      </div>

      <TableShell>
        <SortableHead
          cols={[
            { key: "full_name", label: "Name" },
            ...(isLTC ? [{ key: "relationship_type" as SortKey, label: "Type" }] : []),
            { key: "org_name", label: "Org" },
            { key: "coverage_status", label: "Coverage" },
            { key: "stage", label: "Stage" },
            { key: "plan", label: planLabel },
            { key: "monthly_premium_cents", label: "Monthly Premium" },
            { key: "billing_group_id", label: "Billing Group" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggle={toggleSort}
        />
        <tbody>
          {filtered.map((i) => {
            const isSpouse = i.relationship_type === "spouse";
            return (
              <TRow key={i.id} onClick={() => navigate({ to: "/individuals/$id", params: { id: i.id } })}>
                <TCell className="font-medium">
                  {i.full_name}
                  <div className="text-[10px] text-black/40">{i.email}</div>
                </TCell>
                {isLTC && (
                  <TCell>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${isSpouse ? "bg-violet-100 text-violet-800" : "bg-black/5 text-black/70"}`}>
                      {isSpouse ? "Spouse" : "Employee"}
                    </span>
                  </TCell>
                )}
                <TCell>{i.org_name}</TCell>
                <TCell><Pill tone={i.coverage_status === "active" ? "ok" : "neutral"}>{i.coverage_status}</Pill></TCell>
                <TCell><Pill>{i.stage}</Pill></TCell>
                <TCell>{isLTC ? i.purchased_plan : i.coverage_plan}</TCell>
                <TCell>{formatCents(i.monthly_premium_cents)}</TCell>
                <TCell className="text-black/60">{i.billing_group_id}</TCell>
              </TRow>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={isLTC ? 8 : 7} className="px-3 py-8 text-center text-black/40 text-xs">No individuals match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={createDrawer.state.open} onClose={createDrawer.close} title="New Individual">
        <div className="space-y-3">
          <Field label="Full Name"><Input placeholder="Test Person N" /></Field>
          <Field label="Email"><Input placeholder="person@example.com" /></Field>
          <Field label="Organization">
            <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
              <option value="">— none (affiliate-sponsored) —</option>
              {ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Coverage Status">
            <input disabled value="not_started" className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-black/[0.03] text-black/60" />
          </Field>
          <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
            <Btn onClick={createDrawer.close}>Cancel</Btn>
            <Btn variant="primary" onClick={createDrawer.close}>Create</Btn>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function SortableHead({ cols, sortKey, sortDir, onToggle }: {
  cols: { key: SortKey; label: string }[];
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
}) {
  return (
    <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
      <tr>
        {cols.map((c) => {
          const active = sortKey === c.key && sortDir !== null;
          const arrow = active ? (sortDir === "asc" ? "↑" : "↓") : "";
          return (
            <th
              key={c.key}
              onClick={() => onToggle(c.key)}
              className="text-left font-medium px-3 py-2 cursor-pointer hover:bg-black/5 select-none"
            >
              <span className="inline-flex items-center gap-1">
                {c.label}
                <span className={`text-[9px] ${active ? "text-[#0a3d3e]" : "text-black/20"}`}>{arrow || "↕"}</span>
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
