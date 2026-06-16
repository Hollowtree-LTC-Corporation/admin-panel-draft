import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, ShieldAlert, ChevronDown, ChevronRight, X } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Pill, Btn, Card, Field, Drawer,
} from "@/components/wireframe/Bits";
import {
  FilterRow, FilterSearch, FilterCombobox, ClearFiltersLink, SortableTHead, useSort,
} from "@/components/wireframe/Filters";
import { CARRIERS, ORGS, formatCents } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import {
  SI_APPLICATIONS, daysBetween, formatDateLong, formatDateTime,
  type SiApplication, type CarrierDecision, type SiResponse, type SiResponseCategory,
} from "@/lib/wireframe/si-applications";
import { writePhiAudit, usePhiAuditLog, type PhiAuditEntry } from "@/lib/wireframe/phi-audit";

export const Route = createFileRoute("/si-applications")({ component: View });

type SortKey =
  | "individual_name" | "org_name" | "plan_applied_for" | "face_amount_cents"
  | "carrier_name" | "upgrade_submitted_at" | "days_in_review" | "upgrade_carrier_decision" | "assigned_rep";

const SESSION_MS = 5 * 60 * 1000;

function decisionPill(d: CarrierDecision | "withdrawn") {
  if (d === "pending") return <Pill tone="warn">Pending</Pill>;
  if (d === "approved") return <Pill tone="ok">Approved</Pill>;
  if (d === "denied") return <Pill tone="bad">Denied</Pill>;
  return <Pill tone="neutral">Withdrawn</Pill>;
}

function View() {
  const { product, role } = useStore();
  const [tab, setTab] = useState<"queue" | "log">("queue");

  if (product !== "LTC") {
    return (
      <div>
        <PageHeader title="SI Applications" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          SI Applications is LTC-only. DI is a pure GI product with no SI flow.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="SI Applications (LTC)"
        subtitle={`${SI_APPLICATIONS.length} applications · ${SI_APPLICATIONS.filter((a) => a.upgrade_carrier_decision === "pending").length} pending carrier decision`}
      />
      <div className="flex items-center gap-1 border-b border-black/10 mb-4 -mt-2">
        <TabBtn active={tab === "queue"} onClick={() => setTab("queue")}>Queue ({SI_APPLICATIONS.length})</TabBtn>
        <TabBtn active={tab === "log"} onClick={() => setTab("log")}>Access Log</TabBtn>
      </div>
      {tab === "queue" ? <QueueTab /> : <AccessLogTab canView={role === "admin"} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-[12px] border-b-2 -mb-px ${active ? "border-[#0a3d3e] text-[#0a3d3e] font-medium" : "border-transparent text-black/60 hover:text-black"}`}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Queue tab

function QueueTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [carrier, setCarrier] = useState("all");
  const [org, setOrg] = useState("all");
  const [resp, setResp] = useState("all");
  const [dir, setDir] = useState("all");
  const [tier, setTier] = useState("all");
  const [rep, setRep] = useState("all");
  const sort = useSort<SortKey>("upgrade_submitted_at", "asc");

  const carrierOptions = CARRIERS.filter((c) => c.product === "LTC").map((c) => ({ value: c.id, label: c.carrier_name }));
  const orgOptions = ORGS.filter((o) => o.product === "LTC").map((o) => ({ value: o.id, label: o.name }));
  const repOptions = Array.from(new Set(SI_APPLICATIONS.map((a) => a.assigned_rep).filter(Boolean))) as string[];

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = SI_APPLICATIONS.filter((a) => {
      if (s && !a.individual_name.toLowerCase().includes(s) && !a.org_name.toLowerCase().includes(s)) return false;
      if (status !== "all" && a.upgrade_carrier_decision !== status) return false;
      if (carrier !== "all" && a.carrier_id !== carrier) return false;
      if (org !== "all" && a.org_id !== org) return false;
      if (resp !== "all" && a.respondent_type !== resp) return false;
      if (tier !== "all" && a.plan_tier !== tier) return false;
      if (rep !== "all") {
        if (rep === "__unassigned__") { if (a.assigned_rep) return false; }
        else if (a.assigned_rep !== rep) return false;
      }
      if (dir !== "all") {
        const d = daysBetween(a.upgrade_submitted_at, a.upgrade_carrier_decision_at ?? undefined);
        if (dir === "lt7" && !(d < 7)) return false;
        if (dir === "7-14" && !(d >= 7 && d <= 14)) return false;
        if (dir === "15-30" && !(d >= 15 && d <= 30)) return false;
        if (dir === "gt30" && !(d > 30)) return false;
      }
      return true;
    });
    // Default sort: pending first, then by submitted_at desc; decided by decision_at desc.
    const def = sort.isDefault;
    if (def) {
      return [...filtered].sort((a, b) => {
        const aPending = a.upgrade_carrier_decision === "pending" ? 0 : 1;
        const bPending = b.upgrade_carrier_decision === "pending" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        if (aPending === 0) {
          return new Date(b.upgrade_submitted_at).getTime() - new Date(a.upgrade_submitted_at).getTime();
        }
        const ad = a.upgrade_carrier_decision_at ? new Date(a.upgrade_carrier_decision_at).getTime() : 0;
        const bd = b.upgrade_carrier_decision_at ? new Date(b.upgrade_carrier_decision_at).getTime() : 0;
        return bd - ad;
      });
    }
    return sort.applySort(filtered, (a, k) => {
      if (k === "days_in_review") return daysBetween(a.upgrade_submitted_at, a.upgrade_carrier_decision_at ?? undefined);
      return (a as unknown as Record<string, string | number>)[k];
    });
  }, [search, status, carrier, org, resp, dir, tier, rep, sort]);

  const active = search !== "" || status !== "all" || carrier !== "all" || org !== "all" || resp !== "all" || dir !== "all" || tier !== "all" || rep !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setStatus("all"); setCarrier("all"); setOrg("all"); setResp("all"); setDir("all"); setTier("all"); setRep("all"); sort.reset(); };

  const counts = useMemo(() => {
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    let pending = 0, approved30 = 0, denied30 = 0;
    for (const a of SI_APPLICATIONS) {
      if (a.upgrade_carrier_decision === "pending") pending++;
      else if (a.upgrade_carrier_decision_at) {
        const dt = new Date(a.upgrade_carrier_decision_at).getTime();
        if (now - dt <= days30) {
          if (a.upgrade_carrier_decision === "approved") approved30++;
          else if (a.upgrade_carrier_decision === "denied") denied30++;
        }
      }
    }
    return { pending, approved30, denied30 };
  }, []);

  const [gate, setGate] = useState<SiApplication | null>(null);
  const [drawerApp, setDrawerApp] = useState<{ app: SiApplication; openedAt: number } | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => setStatus("pending")}
          className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200"
        >
          🟡 {counts.pending} pending
        </button>
        <button
          onClick={() => setStatus("approved")}
          className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200"
        >
          🟢 {counts.approved30} approved (last 30 days)
        </button>
        <button
          onClick={() => setStatus("denied")}
          className="text-[11px] px-2 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-200 hover:bg-rose-200"
        >
          🔴 {counts.denied30} denied (last 30 days)
        </button>
      </div>
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual or org…" />
        <FilterCombobox value={status} onChange={setStatus} placeholder="All statuses" options={[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "denied", label: "Denied" },
        ]} />
        <FilterCombobox value={carrier} onChange={setCarrier} placeholder="All carriers" options={carrierOptions} />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All organizations" options={orgOptions} />
        <FilterCombobox value={resp} onChange={setResp} placeholder="All respondents" options={[
          { value: "employee", label: "Employee" },
          { value: "spouse", label: "Spouse" },
        ]} />
        <FilterCombobox value={dir} onChange={setDir} placeholder="Days in review" options={[
          { value: "lt7", label: "<7 days" },
          { value: "7-14", label: "7–14 days" },
          { value: "15-30", label: "15–30 days" },
          { value: "gt30", label: ">30 days" },
        ]} />
        <FilterCombobox value={tier} onChange={setTier} placeholder="All plan tiers" options={[
          { value: "Bronze", label: "Bronze" },
          { value: "Silver", label: "Silver" },
          { value: "Gold", label: "Gold" },
          { value: "Platinum", label: "Platinum" },
          { value: "Diamond", label: "Diamond" },
        ]} />
        <FilterCombobox value={rep} onChange={setRep} placeholder="All reps" options={[
          ...repOptions.map((v) => ({ value: v, label: v })),
          { value: "__unassigned__", label: "Unassigned" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <div className="ml-auto flex items-center gap-2 text-[11px] text-black/50">
          <button disabled className="px-2 py-1 rounded border border-black/15 bg-stone-100 text-black/40 cursor-not-allowed">
            Export CSV
          </button>
          <span>Export of PHI is being redesigned with required controls.</span>
        </div>
      </FilterRow>

      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "individual_name", label: "Individual" },
            { key: "org_name", label: "Org" },
            { key: "plan_applied_for", label: "Plan Applied For" },
            { key: "face_amount_cents", label: "Face Amount" },
            { key: "carrier_name", label: "Carrier" },
            { key: "upgrade_submitted_at", label: "Submitted" },
            { key: "days_in_review", label: "Days in Review" },
            { key: "upgrade_carrier_decision", label: "Status" },
            { key: "assigned_rep", label: "Assigned Rep" },
            { key: null, label: "Action" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.length === 0 ? (
            <TRow>
              <TCell className="text-black/50 italic" >
                No SI applications match the current filters. Try clearing filters or check the GI enrollees on the Individuals page.
              </TCell>
              <TCell><span /></TCell><TCell><span /></TCell><TCell><span /></TCell>
              <TCell><span /></TCell><TCell><span /></TCell><TCell><span /></TCell>
              <TCell><span /></TCell><TCell><span /></TCell><TCell><span /></TCell>
            </TRow>
          ) : rows.map((a) => {
            const d = daysBetween(a.upgrade_submitted_at, a.upgrade_carrier_decision_at ?? undefined);
            return (
              <TRow key={a.individual_id}>
                <TCell className="font-medium">
                  {a.individual_name}{" "}
                  <span className="text-[10px] px-1 py-0.5 rounded bg-black/5 text-black/60 ml-1 align-middle">
                    {a.respondent_type === "spouse" ? "Spouse" : "Employee"}
                  </span>
                </TCell>
                <TCell>{a.org_name}</TCell>
                <TCell>{a.plan_applied_for}</TCell>
                <TCell>{formatCents(a.face_amount_cents)}</TCell>
                <TCell>{a.carrier_name}</TCell>
                <TCell className="font-mono text-[11px]">{formatDateLong(a.upgrade_submitted_at)}</TCell>
                <TCell className={d > 30 && a.upgrade_carrier_decision === "pending" ? "text-rose-700 font-medium" : ""}>
                  {d} days
                </TCell>
                <TCell>{decisionPill(a.upgrade_carrier_decision)}</TCell>
                <TCell>{a.assigned_rep ?? <span className="text-black/40">—</span>}</TCell>
                <TCell>
                  <Btn variant="secondary" size="sm" onClick={() => setGate(a)}>
                    <Lock className="inline h-3 w-3 mr-1" /> Review
                  </Btn>
                </TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>

      {gate ? (
        <PhiGateModal
          app={gate}
          onCancel={() => setGate(null)}
          onConfirm={(reason) => {
            try {
              writePhiAudit({
                table_name: "enrollment_responses",
                record_id: gate.individual_id,
                action: "view_phi",
                actor_id: "user_guy",
                actor_name: "Guy (admin)",
                new_values: {
                  individual_id: gate.individual_id,
                  individual_name: gate.individual_name,
                  reason,
                  fields_viewed: ["enrollment_responses", "height", "weight", "tobacco_use"],
                },
              });
            } catch (e) {
              toast.error("PHI audit log write failed. Access denied.");
              setGate(null);
              return;
            }
            setDrawerApp({ app: gate, openedAt: Date.now() });
            setGate(null);
          }}
        />
      ) : null}

      {drawerApp ? (
        <ApplicationDrawer
          key={drawerApp.app.individual_id + drawerApp.openedAt}
          app={drawerApp.app}
          openedAt={drawerApp.openedAt}
          onClose={() => setDrawerApp(null)}
          onExpire={() => {
            setDrawerApp(null);
            toast("PHI access session expired. Re-authenticate to continue viewing.");
          }}
        />
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PHI access gate modal

function PhiGateModal({ app, onCancel, onConfirm }: { app: SiApplication; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const ok = reason.trim().length >= 10 && ack;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-md shadow-xl w-full max-w-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-amber-700" />
          <div className="font-medium text-sm">Protected Health Information</div>
        </div>
        <p className="text-sm text-black/70 mb-3">
          You are about to view medical underwriting responses for{" "}
          <span className="font-medium">
            {app.individual_name}
            {app.respondent_type === "spouse" && app.linked_individual_name
              ? ` (Spouse of ${app.linked_individual_name} · ${app.org_name})`
              : ` (${app.org_name})`}
          </span>.
        </p>
        <p className="text-xs text-black/60 mb-3">
          This access will be logged in the audit trail with your name, timestamp, and the reason you provide below.
        </p>
        <label className="block text-[11px] uppercase tracking-wider text-black/50 mb-1">Reason for access (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full text-sm border border-black/15 rounded p-2 mb-1"
          placeholder="e.g., Reviewing carrier decision pending more than 14 days."
        />
        <div className="text-[11px] text-black/50 mb-3">
          Minimum 10 characters. {reason.trim().length}/10
        </div>
        <label className="flex items-start gap-2 text-xs text-black/70 mb-4">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
          <span>I acknowledge this access is logged in the audit trail.</span>
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={!ok} onClick={() => onConfirm(reason.trim())}>Access PHI</Btn>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Drawer

function useCountdown(deadline: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(deadline - Date.now());
  const expiredRef = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      const r = deadline - Date.now();
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, onExpire]);
  return Math.max(0, remaining);
}

const CATEGORY_ORDER: SiResponseCategory[] = ["lifestyle", "biometrics", "family_history", "current_conditions", "prescriptions", "other"];
const CATEGORY_LABEL: Record<SiResponseCategory, string> = {
  lifestyle: "Lifestyle",
  biometrics: "Biometrics",
  family_history: "Family History",
  current_conditions: "Current Conditions",
  prescriptions: "Prescriptions",
  other: "Other",
};

function ApplicationDrawer({ app, openedAt, onClose, onExpire }: { app: SiApplication; openedAt: number; onClose: () => void; onExpire: () => void }) {
  const deadline = openedAt + SESSION_MS;
  const remaining = useCountdown(deadline, onExpire);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");
  const accessTime = new Date(openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [localApp, setLocalApp] = useState<SiApplication>(app);
  const submittedDays = daysBetween(localApp.upgrade_submitted_at, localApp.upgrade_carrier_decision_at ?? undefined);

  const grouped: Record<SiResponseCategory, SiResponse[]> = {
    lifestyle: [], biometrics: [], family_history: [], current_conditions: [], prescriptions: [], other: [],
  };
  for (const r of localApp.responses) {
    if (!r.answer || (r.answer === "No" && r.category === "current_conditions")) {
      // Skip current_conditions where answer is No — they're not interesting.
      if (r.category === "current_conditions" && r.answer === "No") continue;
    }
    grouped[r.category].push(r);
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title=""
      >
        <div className="-mt-2">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <div className="text-base font-semibold">
                {localApp.individual_name}{" "}
                <span className="text-[10px] px-1 py-0.5 rounded bg-black/5 text-black/60 align-middle">
                  {localApp.respondent_type === "spouse" ? "Spouse" : "Employee"}
                </span>
              </div>
              <div className="text-[11px] text-black/55">
                {localApp.org_name} · {localApp.individual_id}
              </div>
              <div className="text-[11px] text-black/55">
                Application submitted {formatDateLong(localApp.upgrade_submitted_at)} · {submittedDays} days in review
              </div>
            </div>
          </div>

          <Card className="p-3 mt-4">
            <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Application Context</div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Plan applied for">{localApp.plan_applied_for}</Field>
              <Field label="Face amount">{formatCents(localApp.face_amount_cents)}</Field>
              <Field label="Carrier">{localApp.carrier_name}</Field>
              <Field label="Issue type">SI</Field>
              {localApp.pre_buyup_premium_cents != null ? (
                <Field label="Pre-buy-up premium">{formatCents(localApp.pre_buyup_premium_cents)}</Field>
              ) : null}
              {localApp.respondent_type === "spouse" && localApp.linked_individual_name ? (
                <Field label="Linked employee">
                  <a href={`/individuals/${localApp.linked_individual_id}`} className="text-[#0a3d3e] underline">
                    {localApp.linked_individual_name} →
                  </a>
                </Field>
              ) : null}
            </div>
          </Card>

          <Card className="p-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-black/50">Carrier Decision</div>
              {decisionPill(localApp.upgrade_carrier_decision)}
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Submitted at">{formatDateTime(localApp.upgrade_submitted_at)} ET</Field>
              <Field label="Decision at">{localApp.upgrade_carrier_decision_at ? `${formatDateTime(localApp.upgrade_carrier_decision_at)} ET` : "—"}</Field>
              <Field label="Decision reason">{localApp.decision_reason ?? "—"}</Field>
            </div>
            {localApp.upgrade_carrier_decision === "pending" ? (
              <div className="mt-1">
                <Btn variant="secondary" size="sm" onClick={() => setDecisionOpen(true)}>Record carrier decision</Btn>
              </div>
            ) : null}
          </Card>

          <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>
              Protected Health Information below. Access logged at {accessTime} ET. Session expires in {mm}:{ss}.
            </span>
          </div>

          <div className="mt-3">
            {CATEGORY_ORDER.map((cat) => {
              const list = grouped[cat];
              if (list.length === 0) return null;
              return (
                <CategorySection key={cat} label={CATEGORY_LABEL[cat]} responses={list} defaultOpen={cat === "lifestyle"} />
              );
            })}
            {(() => {
              const h = localApp.responses.find((r) => r.question_code === "height")?.answer;
              const w = localApp.responses.find((r) => r.question_code === "weight")?.answer;
              const hIn = h ? parseHeightInches(h) : null;
              const wLb = w ? parseInt(w.replace(/[^0-9]/g, ""), 10) : null;
              if (hIn && wLb) {
                const bmi = (wLb / (hIn * hIn)) * 703;
                return (
                  <div className="text-[11px] text-black/55 mt-1 pl-1">
                    BMI: {bmi.toFixed(1)} (computed)
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-black/10 pt-3">
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
            {localApp.upgrade_carrier_decision === "pending" ? (
              <Btn variant="primary" size="sm" onClick={() => setDecisionOpen(true)}>Record carrier decision</Btn>
            ) : null}
          </div>
        </div>
      </Drawer>

      {decisionOpen ? (
        <DecisionModal
          app={localApp}
          onCancel={() => setDecisionOpen(false)}
          onSave={(d) => {
            setLocalApp({
              ...localApp,
              upgrade_carrier_decision: d.decision,
              upgrade_carrier_decision_at: new Date(d.date + "T12:00:00Z").toISOString(),
              decision_reason: d.reason || localApp.decision_reason,
            });
            setDecisionOpen(false);
            toast.success(`Carrier decision recorded: ${d.decision}`);
          }}
        />
      ) : null}
    </>
  );
}

function parseHeightInches(s: string): number | null {
  const m = s.match(/(\d+)'(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
}

function CategorySection({ label, responses, defaultOpen }: { label: string; responses: SiResponse[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-black/10 rounded mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-3 py-2 flex items-center justify-between text-left text-sm font-medium hover:bg-black/5">
        <span className="flex items-center gap-1">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className="text-[11px] text-black/50">{responses.length}</span>
      </button>
      {open ? (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {responses.map((r) => (
            <div key={r.id} className="text-sm border-t border-black/5 pt-2">
              <div className="text-[11px] text-black/55">{r.question}</div>
              <div className="font-medium">{r.answer}</div>
              {r.detail ? <div className="text-[11px] text-black/60 mt-0.5">{r.detail}</div> : null}
              <div className="text-[10px] text-black/45 mt-0.5 flex gap-3">
                {r.condition_date ? <span>Date: {r.condition_date}</span> : null}
                {r.provider_name ? <span>Provider: {r.provider_name}</span> : null}
                {r.amount ? <span>Amount: {r.amount}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DecisionModal({ app, onCancel, onSave }: { app: SiApplication; onCancel: () => void; onSave: (d: { decision: CarrierDecision; date: string; reason: string }) => void }) {
  const [decision, setDecision] = useState<CarrierDecision>("approved");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const needReason = decision === "denied";
  const ok = !needReason || reason.trim().length >= 5;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-md shadow-xl w-full max-w-md p-5">
        <div className="font-medium text-sm mb-3">Record carrier decision · {app.individual_name}</div>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            {(["approved", "denied"] as CarrierDecision[]).map((d) => (
              <label key={d} className="flex items-center gap-1">
                <input type="radio" checked={decision === d} onChange={() => setDecision(d)} />
                <span className="capitalize">{d}</span>
              </label>
            ))}
            <label className="flex items-center gap-1">
              <input type="radio" checked={decision === ("pending" as CarrierDecision)} onChange={() => setDecision("pending")} />
              <span>Withdrawn</span>
            </label>
          </div>
          <Field label="Decision date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1 text-sm border border-black/15 rounded" />
          </Field>
          <Field label={`Decision reason${needReason ? " (required)" : ""}`}>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full text-sm border border-black/15 rounded p-2" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={!ok} onClick={() => onSave({ decision, date, reason })}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Access Log tab

function AccessLogTab({ canView }: { canView: boolean }) {
  const log = usePhiAuditLog();
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [range, setRange] = useState("30");

  if (!canView) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
        Access Log is restricted to roles with the "audit reviewer" permission (admin in Phase A).
      </div>
    );
  }

  const cutoff = Date.now() - parseInt(range, 10) * 24 * 60 * 60 * 1000;
  const rows = log.filter((e) => {
    if (new Date(e.ts).getTime() < cutoff) return false;
    if (search && !e.new_values.individual_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (actor !== "all" && e.actor_id !== actor) return false;
    if (action !== "all" && e.action !== action) return false;
    return true;
  });
  const actors = Array.from(new Map(log.map((e) => [e.actor_id, e.actor_name])).entries())
    .map(([value, label]) => ({ value, label }));

  return (
    <div>
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual…" />
        <FilterCombobox value={range} onChange={setRange} placeholder="Last 30 days" options={[
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 90 days" },
          { value: "3650", label: "All time" },
        ]} />
        <FilterCombobox value={actor} onChange={setActor} placeholder="All admins" options={actors} />
        <FilterCombobox value={action} onChange={setAction} placeholder="All actions" options={[
          { value: "view_phi", label: "Viewed PHI" },
          { value: "export_phi", label: "Exported PHI" },
        ]} />
      </FilterRow>
      {rows.length === 0 ? (
        <div className="bg-white border border-black/10 rounded p-4 text-sm text-black/55 italic">
          No PHI access events match the current filters. PHI views from this session will appear here.
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr className="text-left text-[11px] text-black/55">
              <th className="px-2 py-1 font-medium">Timestamp</th>
              <th className="px-2 py-1 font-medium">Admin</th>
              <th className="px-2 py-1 font-medium">Action</th>
              <th className="px-2 py-1 font-medium">Individual</th>
              <th className="px-2 py-1 font-medium">Reason</th>
              <th className="px-2 py-1 font-medium">Fields</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => <LogRow key={e.id} e={e} />)}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

function LogRow({ e }: { e: PhiAuditEntry }) {
  const short = e.new_values.reason.length > 80 ? e.new_values.reason.slice(0, 80) + "…" : e.new_values.reason;
  return (
    <TRow>
      <TCell className="font-mono text-[11px]">{formatDateTime(e.ts)}</TCell>
      <TCell>{e.actor_name}</TCell>
      <TCell>{e.action === "view_phi" ? "Viewed PHI" : "Exported PHI"}</TCell>
      <TCell>{e.new_values.individual_name}</TCell>
      <TCell><span title={e.new_values.reason}>{short}</span></TCell>
      <TCell className="text-[11px] text-black/60">{e.new_values.fields_viewed.join(", ")}</TCell>
    </TRow>
  );
}
