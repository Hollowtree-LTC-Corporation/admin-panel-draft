import * as React from "react";
import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Btn, ProductBadge } from "@/components/wireframe/Bits";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronDown, ChevronRight, Lock, Pencil, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { INDIVIDUALS, ORGS, BILLING_GROUPS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals/$id")({ component: IndividualDetail });

/* ---------- Enums ---------- */
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const GENDERS = ["male","female","non_binary","prefer_not_to_say"];
const EMPLOYMENT_REL = ["public_sector","private_salaried","private_hourly","self_employed_1099","retired_or_transitioning"];
const COVERAGE_STATUSES = ["not_started","in_progress","purchased","active","suspended","canceled","lapsed"] as const;
const TIERS = ["bronze","silver","gold","platinum","diamond"];
const UPGRADE_DECISIONS = ["pending","approved","denied"];

const VALID_TRANSITIONS: Record<string, string[]> = {
  not_started: ["in_progress","canceled"],
  in_progress: ["purchased","canceled"],
  purchased: ["active","canceled"],
  active: ["suspended","canceled","lapsed"],
  suspended: ["active","canceled","lapsed"],
  canceled: [],
  lapsed: [],
};

const COVERAGE_BADGE: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  purchased: { label: "Purchased", cls: "bg-teal-100 text-teal-700" },
  active: { label: "Active", cls: "bg-green-100 text-green-700" },
  suspended: { label: "Suspended", cls: "bg-amber-100 text-amber-700" },
  canceled: { label: "Canceled", cls: "bg-red-100 text-red-700" },
  lapsed: { label: "Lapsed", cls: "border border-red-300 text-red-600 bg-transparent" },
};
const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  invited: { label: "Invited", cls: "bg-purple-50 text-purple-600" },
  education: { label: "Education", cls: "bg-purple-100 text-purple-700" },
  selecting_plan: { label: "Selecting Plan", cls: "bg-purple-200 text-purple-800" },
  medical_questions: { label: "Medical Qs", cls: "bg-violet-200 text-violet-800" },
  checkout: { label: "Checkout", cls: "bg-violet-100 text-violet-700" },
  completed: { label: "Completed", cls: "bg-indigo-100 text-indigo-700" },
};

function Badge({ map, value }: { map: typeof COVERAGE_BADGE; value: string }) {
  const m = map[value] ?? { label: value, cls: "bg-black/5 text-black/70" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
];
function languageLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}

function IssueTypeBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-black/40">—</span>;
  const isGI = value === "GI";
  const cls = isGI
    ? "bg-emerald-100 text-emerald-800"
    : "bg-sky-100 text-sky-800";
  const tooltip = isGI
    ? "Guaranteed Issue: base coverage, no medical questions."
    : "Simplified Issue: buy-up coverage with medical underwriting.";
  return (
    <span title={tooltip} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{value}</span>
  );
}

function paymentBadge(status: string | null | undefined, retry: number) {
  if (!status) return <span className="text-black/40">—</span>;
  const s = status.toLowerCase();
  if (s === "successful") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Paid</span>;
  if (s === "pending") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Pending</span>;
  if (s === "failed") {
    const escalated = retry >= 3;
    const cls = escalated ? "bg-red-200 text-red-800 font-medium" : "bg-red-100 text-red-700";
    const label = retry > 0 ? `Failed (${retry})` : "Failed";
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${cls}`}>{label}</span>;
  }
  return <span className="text-black/40">—</span>;
}

/* ---------- Detail synthesis ---------- */
type Detail = ReturnType<typeof synthesize>;
function synthesize(base: typeof INDIVIDUALS[number]) {
  const n = parseInt(base.id.replace("ind_",""), 10) || 1;
  const isLTC = base.product === "LTC";
  const noOrg = n === 3 || n === 17;
  const isLtcSpouse = isLTC && (n === 7 || n === 14);
  const relationship = isLTC ? (isLtcSpouse ? "spouse" : "primary") : "primary";
  const linkedId = isLtcSpouse ? `ind_${n - 1}` : (isLTC && (n === 6 || n === 13) ? `ind_${n + 1}` : null);
  const org = ORGS.find((o) => o.id === base.org_id);

  return {
    ...base,
    first_name: `Test`,
    last_name: `Person ${n}`,
    personal_email: n % 3 === 0 ? `personal${n}@example.net` : null,
    secondary_phone: n % 5 === 0 ? `555-0${200 + n}` : null,
    gender: GENDERS[n % GENDERS.length],
    date_of_birth: `19${60 + (n % 40)}-0${(n % 9) + 1}-1${n % 9}`,
    address_line_1: `${100 + n} Maple St`,
    city: ["Austin","Portland","Boston","Miami","Seattle"][n % 5],
    state: US_STATES[n % US_STATES.length],
    zip_code: `7${1000 + n}`,
    hire_date: `202${(n % 4) + 1}-0${(n % 9) + 1}-15`,
    org_id: noOrg ? null : base.org_id,
    org_name: noOrg ? null : base.org_name,
    employment_relationship: EMPLOYMENT_REL[n % EMPLOYMENT_REL.length],
    union_member: n % 6 === 0,
    union_local_name: n % 6 === 0 ? `Local ${100 + n}` : null,
    ssn_on_file: n % 3 !== 0,
    ssn_last4: String(1000 + n).slice(-4),
    income: isLTC ? `$${60 + n}k` : "",
    height: isLTC ? `${64 + (n % 8)}in` : "",
    weight: isLTC ? `${150 + (n % 40)}lb` : "",
    tobacco_use: isLTC && n % 6 === 0,
    active_date: base.coverage_status === "active" ? base.effective_date : null,
    canceled_date: base.coverage_status === "canceled" ? `2025-0${(n % 9) + 1}-15` : null,
    application_status: ["submitted","carrier_review","approved","issued"][n % 4],
    enrollment_cycle: "2025-Q3",
    persona: ["standard","high_value","new_hire"][n % 3],
    employee_plan_selected: isLTC ? base.purchased_plan : "",
    benefit_class_name: isLTC ? (n % 2 === 0 ? "All Employees" : "Management") : "",
    upgrade_carrier_decision: isLTC && base.upgrade_applied_for ? UPGRADE_DECISIONS[n % 3] : null,
    pre_upgrade_premium_cents: isLTC && base.upgrade_applied_for ? Math.round(base.monthly_premium_cents * 0.8) : null,
    upgrade_submitted_at: isLTC && base.upgrade_applied_for ? `2025-05-1${n % 9}` : null,
    upgrade_carrier_decision_at: isLTC && base.upgrade_applied_for ? `2025-06-0${(n % 9) + 1}` : null,
    relationship_type: relationship,
    linked_individual_id: linkedId,
    interested_spousal_text: isLTC && relationship === "primary" ? (base.interested_spousal ? "yes" : "no") : "",
    spouse_authorization: isLTC && relationship === "primary" ? (n % 2 === 0 ? "granted" : "pending") : "",
    clicked_spouse_link: isLTC && relationship === "primary" ? (n % 3 === 0 ? "yes" : "no") : "",
    sent_spouse_invite: isLTC && relationship === "primary" ? (n % 3 === 0 ? "2025-05-12" : "no") : "",
    why_no_spouse: isLTC && relationship === "primary" && !base.interested_spousal ? "unmarried" : null,
    contribution_start_date: `2025-0${(n % 9) + 1}-01`,
    last_charge_date: base.last_payment_status ? `2025-06-0${(n % 9) + 1}` : null,
    next_charge_date: `2025-07-0${(n % 9) + 1}`,
    next_retry_date: base.last_payment_status === "Failed" ? `2025-06-1${n % 9}` : null,
    failed_attempt_date: base.last_payment_status === "Failed" ? `2025-06-0${(n % 9) + 1}` : null,
    failed_payment_reason: base.last_payment_status === "Failed" ? "Insufficient funds" : null,
    enrollment_deadline: n % 4 === 0 ? `2025-08-${10 + (n % 18)}` : null,
    affiliations: !isLTC && org?.cca_group
      ? [{ id: "aff_cca", name: "CCA: Coastal Carriers Association" }]
      : isLTC && (n === 5 || n === 11)
        ? [{ id: "aff_trust_1", name: n === 5 ? "SEIU Trust" : "Teamsters Trust" }]
        : [],
    klaviyo_main_id: `kl_${10000 + n}`,
    magic_link: `https://enroll.hollowtree.dev/m/${base.id}-resume-tok`,
    magic_link_portal: `https://portal.hollowtree.dev/m/${base.id}-portal-tok`,
    signature_url: `https://sign.hollowtree.dev/s/${base.id}.pdf`,
    // DI-only fields
    w2_or_1099: !isLTC ? (n % 2 === 0 ? "1099" : "W2") : null,
    physician_type: !isLTC && n % 2 === 0 ? ["MD","DO","Resident"][n % 3] : null,
    nurse_type: !isLTC && n % 2 === 1 ? ["RN","NP","CRNA"][n % 3] : null,
    were_they_client: !isLTC ? n % 3 === 0 : null,
    std_premium_cents: !isLTC && org?.type_of_rate === "STD+LTD" ? Math.round(base.monthly_premium_cents * 0.4) : 0,
    ltd_premium_cents: !isLTC ? (org?.type_of_rate === "STD+LTD" ? Math.round(base.monthly_premium_cents * 0.6) : base.monthly_premium_cents) : 0,
    // LTC-only extras
    employee_upgrade_option: isLTC && base.upgrade_applied_for ? ["Silver→Gold","Gold→Platinum","Platinum→Diamond"][n % 3] : null,
    applied_for_upgrade: isLTC ? base.upgrade_applied_for : null,
    _org: org,
    _riders: org ? [org.extension_of_benefits_rider && "EOB", org.benefit_restoration_rider && "BR"].filter(Boolean).join(" + ") || "—" : "—",
  };
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return "—";
  return `${MONTH_ABBR[m - 1]} ${day}, ${y}`;
}

function IndividualDetail() {
  const { id } = Route.useParams();
  const { product: _product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();

  const base = INDIVIDUALS.find((i) => i.id === id);
  if (!base) return <div className="p-4">Individual not found.</div>;
  const i: Detail = synthesize(base);
  const isLTC = _product === "LTC";
  const linked = i.linked_individual_id ? INDIVIDUALS.find((x) => x.id === i.linked_individual_id) : null;
  const linkedDetail = linked ? synthesize(linked) : null;
  const readOnly = !can("individuals", "update");
  const bg = BILLING_GROUPS.find((b) => b.id === i.billing_group_id);

  const balanceCents = i.last_payment_status === "Failed" ? i.monthly_premium_cents : -250;
  const balanceNeg = balanceCents > 0;

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactReason, setDeactReason] = useState("");
  const [deactDate, setDeactDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirm, setConfirm] = useState<null | { title: string; message: string; onConfirm: () => void }>(null);

  return (
    <div className="pb-10">
      <Link to="/individuals" className="inline-flex items-center text-xs text-black/60 hover:text-black mb-2">
        <ChevronLeft className="h-3 w-3" /> Individuals
      </Link>

      {/* Sticky summary header */}
      <div className="sticky top-0 z-20 bg-[#f7f3eb] -mx-4 px-4 pt-2 pb-3 mb-4 border-b border-black/10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              {i.full_name}
              <ProductBadge product={i.product} />
              {!isLTC && i._org?.cca_group && (
                <span
                  className="border border-indigo-400 text-indigo-700 bg-indigo-50 rounded px-2 py-0.5 text-xs font-medium"
                  title="CCA-affiliated organization. Uses CCA portal link and CCA-specific policy emails."
                >
                  CCA
                </span>
              )}
            </h1>
            <div className="text-xs text-black/50 mt-0.5">Individuals &rsaquo; {i.full_name} · <span className="text-black/40">{i.id}</span></div>
          </div>
          <div className="flex gap-2">
            <Btn disabled={readOnly} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Edit</Btn>
            <Btn variant="danger" disabled={!can("individuals", "delete")} onClick={() => setDeactivateOpen(true)}>Deactivate</Btn>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-2">
          <SummaryChip label="Organization"
            value={i.org_name ?? <span className="italic text-black/50">Affiliate</span>}
            onClick={i.org_id ? () => navigate({ to: "/organizations/$id", params: { id: i.org_id! } }) : undefined} />
          <SummaryChip label="Coverage Status" value={<Badge map={COVERAGE_BADGE} value={i.coverage_status} />} />
          <SummaryChip label="Current Stage" value={<Badge map={STAGE_BADGE} value={i.stage} />} />
          <SummaryChip label="Last Payment"
            value={<span className="inline-flex items-center gap-1">{paymentBadge(i.last_payment_status, i.retry_count)}<span className="text-[11px] text-black/50">{fmtDate(i.last_charge_date)}</span></span>}
            onClick={() => navigate({ to: "/payment-ledger" })} />
          <SummaryChip label="Monthly Premium" value={formatCents(i.monthly_premium_cents)} />
          <SummaryChip label="Balance" value={formatCents(balanceCents)} tone={balanceNeg ? "bad" : "ok"}
            onClick={() => navigate({ to: "/enrollee-balance" })} />
          <SummaryChip label="Enrollment Window" value={i.org_id ? "annual · 2025-09" : "—"}
            onClick={i.org_id ? () => navigate({ to: "/organizations/$id", params: { id: i.org_id! } }) : undefined} />
          <SummaryChip label="Billing Group" value={bg?.name ?? i.billing_group_id}
            onClick={() => navigate({ to: "/billing-groups" })} />
        </div>
      </div>

      <div className="space-y-4">
        {isLTC ? (
          <>
            <LTCCoverageSection i={i} readOnly={readOnly} setConfirm={setConfirm} />
            <PaymentSection i={i} bg={bg} readOnly={readOnly} />
            <ContributionSection i={i} readOnly={readOnly} />
            <IdentitySection i={i} readOnly={readOnly} setConfirm={setConfirm} />
            <UnderwritingSection i={i} readOnly={readOnly} />
            <SpouseSection i={i} linked={linked ?? undefined} linkedDetail={linkedDetail} readOnly={readOnly} />
            <UpgradeSection i={i} readOnly={readOnly} />
            <EnrollmentSection i={i} />
            <SystemRefsSection i={i} />
          </>
        ) : (
          <>
            <DICoverageSection i={i} readOnly={readOnly} setConfirm={setConfirm} />
            <PaymentSection i={i} bg={bg} readOnly={readOnly} />
            <ContributionSection i={i} readOnly={readOnly} />
            <IdentitySection i={i} readOnly={readOnly} setConfirm={setConfirm} />
            <ProfessionalClassificationSection i={i} readOnly={readOnly} />
            <EnrollmentSection i={i} />
            <SystemRefsSection i={i} />
          </>
        )}
      </div>



      {/* Deactivate confirmation */}
      {deactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactivateOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">Deactivate Enrollment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will set the coverage status to <b>canceled</b> for {i.full_name}. This action can be reversed by an admin.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/50">Reason <span className="text-red-600">*</span></label>
                <input
                  value={deactReason}
                  onChange={(e) => setDeactReason(e.target.value)}
                  className={`${inputCls} mt-1`}
                  placeholder="e.g. employee left the organization"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/50">Canceled Date</label>
                <input
                  type="date"
                  value={deactDate}
                  onChange={(e) => setDeactDate(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Btn onClick={() => setDeactivateOpen(false)}>Cancel</Btn>
              <Btn variant="danger" disabled={!deactReason.trim()} onClick={() => { setDeactivateOpen(false); setDeactReason(""); }}>
                Confirm Deactivation
              </Btn>
            </div>
          </div>
        </div>
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Confirm"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </div>
  );
}

/* =============================================================
   SECTIONS
============================================================= */

function useCoverageEditing(i: Detail, setConfirm: (c: { title: string; message: string; onConfirm: () => void } | null) => void) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(i.coverage_status);
  const [error, setError] = useState<string | null>(null);
  const allowed = useMemo(() => [i.coverage_status, ...(VALID_TRANSITIONS[i.coverage_status] ?? [])], [i.coverage_status]);
  const onSave = () => {
    setError(null);
    if (status !== i.coverage_status) {
      if (!(VALID_TRANSITIONS[i.coverage_status] ?? []).includes(status)) {
        setError(`Invalid transition: ${i.coverage_status} → ${status}`);
        return;
      }
      setConfirm({
        title: "Change coverage status?",
        message: `Change coverage status from ${i.coverage_status} to ${status}? This affects token invalidation, Klaviyo sync, and billing.`,
        onConfirm: () => setEditing(false),
      });
      return;
    }
    setEditing(false);
  };
  const onCancel = () => { setEditing(false); setStatus(i.coverage_status); setError(null); };
  return { editing, setEditing, status, setStatus, error, allowed, onSave, onCancel };
}

function CoverageStatusField({ editing, status, setStatus, allowed, current }: { editing: boolean; status: string; setStatus: (s: any) => void; allowed: string[]; current: string }) {
  return (
    <RField label="Coverage Status">
      {editing ? (
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {COVERAGE_STATUSES.map((s) => (
            <option key={s} value={s} disabled={!allowed.includes(s)}>{s}{allowed.includes(s) ? "" : " (invalid)"}</option>
          ))}
        </select>
      ) : <Badge map={COVERAGE_BADGE} value={current} />}
    </RField>
  );
}

function DICoverageSection({ i, readOnly, setConfirm }: { i: Detail; readOnly: boolean; setConfirm: (c: { title: string; message: string; onConfirm: () => void } | null) => void }) {
  const { editing, setEditing, status, setStatus, error, allowed, onSave, onCancel } = useCoverageEditing(i, setConfirm);
  const unfunded = i.coverage_status === "not_started" || i.coverage_status === "in_progress";
  const premiumSum = i.std_premium_cents + i.ltd_premium_cents;
  const mismatch = !unfunded && premiumSum !== i.monthly_premium_cents;
  const DI_PLANS = ["Bronze DI", "Silver DI", "Gold DI"];
  const DI_STAGES = ["not_started","quote_generated","link_sent","app_started","app_completed","payment_pending","enrolled","active"];
  return (
    <SectionCard title="Coverage & Plan · DI" defaultOpen editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <CoverageStatusField editing={editing} status={status} setStatus={setStatus} allowed={allowed} current={i.coverage_status} />
        <RField label="Coverage Plan" value={unfunded ? "—" : i.coverage_plan} editing={editing}>
          <select defaultValue={i.coverage_plan} className={inputCls}>{DI_PLANS.map((p) => <option key={p}>{p}</option>)}</select>
        </RField>
        <RField label="Monthly Premium">
          {unfunded ? <span className="text-gray-400">—</span> : (
            <span className="inline-flex items-center gap-1">
              {formatCents(i.monthly_premium_cents)}
              {mismatch && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-label="STD+LTD sum mismatch" />}
            </span>
          )}
        </RField>
        <RField label="Weekly Covered Benefit" value={unfunded ? "—" : formatCents(i.weekly_covered_benefit_cents)} />
        <RField label="Monthly Benefit" value={i.monthly_benefit_cents != null ? formatCents(i.monthly_benefit_cents) : "—"} />
        <RField label="Current Stage" editing={editing}>
          {editing
            ? <select defaultValue={i.stage} className={inputCls}>{DI_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            : <Badge map={STAGE_BADGE} value={i.stage} />}
        </RField>
        <RField label="Application Status">
          {i.application_status
            ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700">{i.application_status}</span>
            : <span className="text-gray-400">—</span>}
        </RField>
        {i.canceled_date && <RField label="Canceled Date" value={fmtDate(i.canceled_date)} />}
      </Grid>
      {error && <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {mismatch && !editing && (
        <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> STD + LTD does not equal Monthly Premium ({formatCents(premiumSum)} vs {formatCents(i.monthly_premium_cents)})
        </div>
      )}
      {editing && <SectionActions onCancel={onCancel} onSave={onSave} />}
    </SectionCard>
  );
}

function LTCCoverageSection({ i, readOnly, setConfirm }: { i: Detail; readOnly: boolean; setConfirm: (c: { title: string; message: string; onConfirm: () => void } | null) => void }) {
  const { editing, setEditing, status, setStatus, error, allowed, onSave, onCancel } = useCoverageEditing(i, setConfirm);
  const unfunded = i.coverage_status === "not_started" || i.coverage_status === "in_progress";
  const LTC_PLANS = ["Bronze LTC", "Silver LTC", "Gold LTC", "Platinum LTC", "Diamond LTC"];
  return (
    <SectionCard title="Coverage & Plan · LTC" defaultOpen editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <CoverageStatusField editing={editing} status={status} setStatus={setStatus} allowed={allowed} current={i.coverage_status} />
        <RField label="Current Stage"><Badge map={STAGE_BADGE} value={i.stage} /></RField>
        <RField label="Benefit Class" value={i.benefit_class_name} editing={editing}>
          <select defaultValue={i.benefit_class_name} className={inputCls}>{["All Employees","Management"].map((o) => <option key={o}>{o}</option>)}</select>
        </RField>
        <RField label="Riders" value={i._riders} />

        <RField label="Purchased Plan" value={unfunded ? "—" : i.purchased_plan} editing={editing}>
          <select defaultValue={i.purchased_plan} className={inputCls}>{LTC_PLANS.map((p) => <option key={p}>{p}</option>)}</select>
        </RField>
        <RField label="Issue Type" editing={editing}>
          {editing
            ? <select defaultValue={i.issue_type ?? "GI"} className={inputCls}>{["GI","SI"].map((o) => <option key={o}>{o}</option>)}</select>
            : <IssueTypeBadge value={i.issue_type} />}
        </RField>
        <RField label="Employee Plan Selected" value={i.employee_plan_selected || "—"} />
        <RField label="Face Amount" value={unfunded ? "—" : formatCents(i.face_amount_cents)} />
        <RField label="Monthly Premium" value={unfunded ? "—" : formatCents(i.monthly_premium_cents)} />

        <RField label="Tobacco Use">
          {i.tobacco_use
            ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Yes</span>
            : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">No</span>}
        </RField>
        <RField label="Effective Date" value={fmtDate(i.effective_date)} editing={editing}>
          <input type="date" defaultValue={i.effective_date ?? ""} className={inputCls} />
        </RField>
        <RField label="Active Date" value={fmtDate(i.active_date)} />
        <RField label="Canceled Date" value={fmtDate(i.canceled_date)} />
      </Grid>
      {error && <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {editing && <SectionActions onCancel={onCancel} onSave={onSave} />}
    </SectionCard>
  );
}


function paymentMethodLabel(bg: ReturnType<typeof BILLING_GROUPS.find>): React.ReactNode {
  const t = bg?.payment_method_type;
  if (!t) return <span className="text-black/40">No method on file</span>;
  if (t === "ach") return bg?.plaid_institution ? `ACH · ${bg.plaid_institution}` : "ACH (Bank Account)";
  if (t === "card-payment") return bg?.card_last4 ? `Card ending ${bg.card_last4}` : "Credit Card";
  if (t === "apple-pay") return "Apple Pay";
  return String(t);
}

function PaymentSection({ i, bg, readOnly }: { i: Detail; bg: ReturnType<typeof BILLING_GROUPS.find>; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title="Payment & Billing" defaultOpen editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <RField label="Payment Method">
          <span className="inline-flex items-center gap-1">
            {paymentMethodLabel(bg)}
            <Lock className="h-3 w-3 text-black/30" aria-label="Managed on billing group" />
          </span>
        </RField>
        <RField label="Billing Group">
          <Link to="/billing-groups" className="text-sm underline hover:text-[#0a3d3e]">{bg?.name ?? i.billing_group_id}</Link>
        </RField>
        <RField label="Balance">
          <span className={i.last_payment_status === "Failed" ? "text-red-700 font-medium" : "text-emerald-700"}>
            {formatCents(i.last_payment_status === "Failed" ? i.monthly_premium_cents : -250)}
          </span>
        </RField>
        <div />

        <RField label="Last Payment Status">{paymentBadge(i.last_payment_status, i.retry_count)}</RField>
        <RField label="Retry Count" value={String(i.retry_count)} locked={editing} />
        <RField label="Failed Payment Reason" value={i.failed_payment_reason ?? "—"} locked={editing} />
        <div />

        <RField label="Last Charge Date" value={fmtDate(i.last_charge_date)} locked={editing} />
        <RField label="Next Charge Date" value={fmtDate(i.next_charge_date)} editing={editing}>
          <input type="date" defaultValue={i.next_charge_date ?? ""} className={inputCls} />
        </RField>
        <RField label="Failed Attempt Date" value={fmtDate(i.failed_attempt_date)} locked={editing} />
        <RField label="Next Retry Date" value={fmtDate(i.next_retry_date)} locked={editing} />

        <RField label="Active Date" value={fmtDate(i.active_date)} locked={editing} />
        <RField label="Canceled Date">
          {i.canceled_date ? <span className="text-red-700">{fmtDate(i.canceled_date)}</span> : <span className="text-gray-400">—</span>}
        </RField>
        <div />
        <div />
      </Grid>
      <div className="mt-3">
        <Link to="/payment-ledger" className="text-xs text-[#0a3d3e] hover:underline inline-flex items-center gap-1">
          View full payment history <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}

function ContributionSection({ i, readOnly }: { i: Detail; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const active = i.contribution_active;
  const hasHistory = !active && !!i.contribution_start_date && !!i.contribution_duration_months;
  const endDate = i.contribution_duration_months ? `${i.contribution_start_date} + ${i.contribution_duration_months}mo` : "Indefinite";
  return (
    <SectionCard title="Employer Contribution" defaultOpen={active} editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <RField label="Contribution Tier" value={i.contribution_tier ?? "—"} editing={editing && active}>
          <select defaultValue={i.contribution_tier ?? ""} className={inputCls}>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
        </RField>
        <RField label="Active">
          {active ? <Badge map={COVERAGE_BADGE} value="active" /> : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">Inactive</span>}
        </RField>
        {active && (
          <RField label="Duration (months)" value={i.contribution_duration_months ? String(i.contribution_duration_months) : "Indefinite"} editing={editing}>
            <input defaultValue={i.contribution_duration_months?.toString() ?? ""} placeholder="Indefinite" className={inputCls} />
          </RField>
        )}
        {active && <div />}
        {(active || hasHistory) && (
          <>
            <RField label="Start Date" value={fmtDate(i.contribution_start_date)} editing={editing && active}>
              <input type="date" defaultValue={i.contribution_start_date ?? ""} className={inputCls} />
            </RField>
            <RField label="End Date" value={endDate} />
          </>
        )}
      </Grid>
      {active && i.contribution_tier && (
        <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 text-sm text-black/75 p-3 rounded-r leading-relaxed">
          The employer covers this enrollee's premium at the <b>{i.contribution_tier}</b> tier
          {i.contribution_duration_months ? <> for <b>{i.contribution_duration_months} months</b></> : <> <b>indefinitely</b></>}
          {i.contribution_start_date ? <> starting <b>{fmtDate(i.contribution_start_date)}</b></> : null}.
          The dollar amount is derived at billing time from the rate table based on age and smoker status.
        </div>
      )}
      {!active && hasHistory && (
        <div className="mt-4 text-sm text-black/60 leading-relaxed">
          Employer covered this enrollee's premium at the <b>{i.contribution_tier}</b> tier from <b>{fmtDate(i.contribution_start_date)}</b> to <b>{endDate}</b>. The enrollee now pays the full premium.
        </div>
      )}
      {!active && !hasHistory && (
        <div className="mt-4 text-sm text-black/50">Employer contribution is not currently active for this enrollee.</div>
      )}
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}

function IdentitySection({ i, readOnly, setConfirm }: { i: Detail; readOnly: boolean; setConfirm: (c: { title: string; message: string; onConfirm: () => void } | null) => void }) {
  const [editing, setEditing] = useState(false);
  const summary = `${i.full_name} · ${i.email} · ${i.org_name ?? "Affiliate-sponsored"} · Hired ${fmtDate(i.hire_date)}`;
  const onSave = () => {
    setConfirm({
      title: "Confirm identity changes",
      message: "If you changed the organization, this will cascade to billing group, benefit class, and enrollment window.",
      onConfirm: () => setEditing(false),
    });
  };
  return (
    <SectionCard title="Identity" summary={summary} editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <RField label="First Name" value={i.first_name} editing={editing}><input defaultValue={i.first_name} className={inputCls} /></RField>
        <RField label="Last Name" value={i.last_name} editing={editing}><input defaultValue={i.last_name} className={inputCls} /></RField>
        <RField label="Email" value={i.email} editing={editing}><input type="email" defaultValue={i.email} className={inputCls} /></RField>
        <div />
        <RField label="Phone" value={i.phone} editing={editing}><input defaultValue={i.phone} className={inputCls} /></RField>
        <RField label="Secondary Phone" value={i.secondary_phone ?? "—"} editing={editing}><input defaultValue={i.secondary_phone ?? ""} className={inputCls} /></RField>
        <RField label="Language" editing={editing}>
          {editing
            ? (
              <div>
                <select defaultValue={i.preferred_language ?? "en"} className={inputCls}>
                  {LANGUAGE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <div className="text-[11px] text-stone-500 mt-1">Overrides org default for this individual's communications.</div>
              </div>
            )
            : languageLabel(i.preferred_language)}
        </RField>
        <RField label="Personal Email" value={i.personal_email ?? "—"} editing={editing}><input type="email" defaultValue={i.personal_email ?? ""} className={inputCls} /></RField>
        <RField label="Date of Birth" value={fmtDate(i.date_of_birth)} editing={editing}><input type="date" defaultValue={i.date_of_birth} className={inputCls} /></RField>
        <RField label="Organization">
          {editing ? (
            <select defaultValue={i.org_id ?? ""} className={inputCls}>
              <option value="">— Affiliate-sponsored —</option>
              {ORGS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          ) : i.org_id ? (
            <Link to="/organizations/$id" params={{ id: i.org_id }} className="text-sm underline hover:text-[#0a3d3e]">{i.org_name}</Link>
          ) : <span className="text-sm italic text-black/50">Affiliate-sponsored</span>}
        </RField>
        <RField label="Employment Relationship" value={i.employment_relationship} editing={editing}>
          <select defaultValue={i.employment_relationship} className={inputCls}>{EMPLOYMENT_REL.map((o) => <option key={o}>{o}</option>)}</select>
        </RField>
        <RField label="Title" value={i.title ?? "—"} editing={editing}><input defaultValue={i.title ?? ""} className={inputCls} /></RField>
        <RField label="Hire Date" value={fmtDate(i.hire_date)} editing={editing}><input type="date" defaultValue={i.hire_date} className={inputCls} /></RField>
        <RField label="Gender" value={i.gender} editing={editing}>
          <select defaultValue={i.gender} className={inputCls}>{GENDERS.map((o) => <option key={o}>{o}</option>)}</select>
        </RField>
        <RField label="Union Member"><Switch checked={i.union_member} disabled={!editing} /></RField>
        <RField label="Union Local Name" value={i.union_local_name ?? "—"} editing={editing}><input defaultValue={i.union_local_name ?? ""} className={inputCls} /></RField>
      </Grid>

      <div className="mt-4 pt-4 border-t border-black/10">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Address</div>
        {editing ? (
          <Grid cols={4}>
            <RField label="Line 1" value={i.address_line_1} editing><input defaultValue={i.address_line_1} className={inputCls} /></RField>
            <RField label="City" value={i.city} editing><input defaultValue={i.city} className={inputCls} /></RField>
            <RField label="State" value={i.state} editing>
              <select defaultValue={i.state} className={inputCls}>{US_STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </RField>
            <RField label="Zip" value={i.zip_code} editing><input defaultValue={i.zip_code} className={inputCls} /></RField>
          </Grid>
        ) : (
          <div className="text-sm text-gray-900">{i.address_line_1}, {i.city}, {i.state} {i.zip_code}</div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-black/10">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">SSN</div>
        {editing ? (
          <input placeholder={i.ssn_on_file ? `•••-••-${i.ssn_last4}` : "9 digits"} className={`${inputCls} max-w-xs`} />
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-black/5 text-black/70">
            <Lock className="h-3 w-3" /> {i.ssn_on_file ? `SSN on file (••• •• ${i.ssn_last4})` : "No SSN"}
          </span>
        )}
      </div>

      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={onSave} />}
    </SectionCard>
  );
}

function UnderwritingSection({ i, readOnly }: { i: Detail; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title="Underwriting" editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <RField label="Income" value={i.income || "—"} editing={editing}><input defaultValue={i.income} className={inputCls} /></RField>
        <RField label="Height" value={i.height || "—"} editing={editing}><input defaultValue={i.height} className={inputCls} /></RField>
        <RField label="Weight" value={i.weight || "—"} editing={editing}><input defaultValue={i.weight} className={inputCls} /></RField>
        <RField label="Tobacco Use">
          {i.tobacco_use
            ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Yes</span>
            : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">No</span>}
        </RField>
      </Grid>
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}

function ProfessionalClassificationSection({ i, readOnly }: { i: Detail; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title="Professional Classification" editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={4}>
        <RField label="Physician Type" value={i.physician_type ?? "—"} editing={editing}>
          <select defaultValue={i.physician_type ?? ""} className={inputCls}>{["","MD","DO","Resident"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
        </RField>
        <RField label="Nurse Type" value={i.nurse_type ?? "—"} editing={editing}>
          <select defaultValue={i.nurse_type ?? ""} className={inputCls}>{["","RN","NP","CRNA"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
        </RField>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">W2 / 1099</div>
          <div>
            {i.w2_or_1099 ? (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-[#0a3d3e] text-white">{i.w2_or_1099}</span>
            ) : <span className="text-gray-400 text-sm">—</span>}
          </div>
        </div>
        <RField label="Assigned Rep" value={i.assigned_rep ?? "—"} editing={editing}>
          <input defaultValue={i.assigned_rep ?? ""} className={inputCls} />
        </RField>
        <RField label="Were They a Client">
          {i.were_they_client
            ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Yes</span>
            : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">No</span>}
        </RField>
      </Grid>
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}

function SpouseSection({ i, linked, linkedDetail, readOnly }: { i: Detail; linked: ReturnType<typeof INDIVIDUALS.find>; linkedDetail: Detail | null; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  let summary = "No spouse";
  if (linked && linkedDetail) summary = `Spouse: ${linked.full_name} (${linkedDetail.coverage_status}, ${linkedDetail.purchased_plan || linkedDetail.coverage_plan})`;
  else if (i.interested_spousal_text === "yes") summary = "Interested in spousal coverage";
  return (
    <SectionCard title="Spouse & Linked Individual" summary={summary} editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={3}>
        <RField label="Relationship Type" value={i.relationship_type} />
        <RField label="Linked Individual">
          {editing ? (
            <input placeholder="Search individual…" className={inputCls} />
          ) : linked ? (
            <Link to="/individuals/$id" params={{ id: linked.id }} className="text-sm underline hover:text-[#0a3d3e]">{linked.full_name}</Link>
          ) : <span className="text-sm text-black/50">—</span>}
        </RField>
        <div />
        {i.relationship_type === "primary" && (
          <>
            <RField label="Interested in Spousal Coverage" value={i.interested_spousal_text} editing={editing}>
              <select defaultValue={i.interested_spousal_text} className={inputCls}>{["yes","no",""].map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
            </RField>
            <RField label="Sent Spouse Invite" value={i.sent_spouse_invite || "—"} />
            <RField label="Spouse Authorization" value={i.spouse_authorization || "—"} />
            <RField label="Clicked Spouse Link" value={i.clicked_spouse_link || "—"} />
            <RField label="Why No Spouse" value={i.why_no_spouse ?? "—"} editing={editing}>
              <input defaultValue={i.why_no_spouse ?? ""} className={inputCls} />
            </RField>
          </>
        )}
      </Grid>
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}

function UpgradeSection({ i, readOnly }: { i: Detail; readOnly: boolean }) {
  const hasActivity = i.interested_upgrading || i.applied_for_upgrade;
  if (!hasActivity) return null;
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title="Upgrade" editing={editing} canEdit={!readOnly} onEdit={() => setEditing(true)}>
      <Grid cols={3}>
        <RField label="Interested in Upgrading" value={i.interested_upgrading ? "yes" : "no"} />
        <RField label="Applied for Upgrade" value={i.applied_for_upgrade ? "yes" : "no"} />
        <RField label="Employee Upgrade Option" value={i.employee_upgrade_option ?? "—"} />
        <RField label="Pre-Upgrade Premium" value={i.pre_upgrade_premium_cents != null ? formatCents(i.pre_upgrade_premium_cents) : "—"} />
        <RField label="Upgrade Submitted At" value={fmtDate(i.upgrade_submitted_at)} />
        <RField label="Upgrade Carrier Decision" value={i.upgrade_carrier_decision ?? "—"} />
        <RField label="Upgrade Carrier Decision At" value={fmtDate(i.upgrade_carrier_decision_at)} />
      </Grid>
      {editing && <SectionActions onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />}
    </SectionCard>
  );
}



function EnrollmentSection({ i }: { i: Detail }) {
  return (
    <SectionCard title="Enrollment Window & Affiliations">
      <Grid cols={2}>
        <RField label="Enrollment Window">
          {i.org_id ? (
            <Link to="/organizations/$id" params={{ id: i.org_id }} className="text-sm underline hover:text-[#0a3d3e]">annual · 2025-09</Link>
          ) : <span className="text-sm text-black/50">—</span>}
        </RField>
        <RField label="Enrollment Deadline" value={fmtDate(i.enrollment_deadline)} />
        <RField label="Affiliations">
          {i.affiliations.length === 0 ? <span className="text-sm text-black/50">None</span> : (
            <div className="flex flex-wrap gap-1">
              {i.affiliations.map((a) => (
                <span key={a.id} className="px-1.5 py-0.5 rounded text-[11px] bg-[#d4b87a]/40 text-[#0a3d3e]">{a.name}</span>
              ))}
            </div>
          )}
        </RField>
      </Grid>
    </SectionCard>
  );
}

type MagicToken = { id: string; type: "enrollment" | "portal"; status: "active" | "revoked" | "expired"; created: string; expires: string; url: string };

function SystemRefsSection({ i }: { i: Detail }) {
  const n = parseInt(i.id.replace("ind_", ""), 10) || 1;
  const initialTokens = useMemo<MagicToken[]>(() => {
    const expiresEnrollment = n % 7 === 0 ? "2025-06-25" : n % 5 === 0 ? "2025-07-10" : "2026-03-01";
    return [
      { id: "tok_enr", type: "enrollment", status: "active", created: "2025-01-15", expires: expiresEnrollment, url: `https://enroll.hollowtree.dev/m/${i.id}-resume-tok` },
      { id: "tok_por", type: "portal", status: "active", created: "2025-02-10", expires: "2026-02-10", url: `https://portal.hollowtree.dev/m/${i.id}-portal-tok` },
    ];
  }, [i.id, n]);
  const [tokens, setTokens] = useState<MagicToken[]>(initialTokens);
  const [revokeTarget, setRevokeTarget] = useState<MagicToken | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const today = new Date("2025-06-15");
  const expiryTone = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    const days = Math.floor((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "text-red-700 font-medium";
    if (days <= 30) return "text-amber-700";
    return "text-black/70";
  };

  return (
    <SectionCard title="System References">
      <div className="grid grid-cols-2 gap-x-8 font-mono text-[11px]">
        <Ref label="Individual ID" value={i.id} />
        <Ref label="Klaviyo Main ID" value={i.klaviyo_main_id} />
        <Ref label="Signature URL" value={i.signature_url} />
        {i.active_date && (
          <div className="mb-2">
            <div className="text-[9px] uppercase tracking-wider text-black/40 mb-0.5 font-sans">Active Date <span className="text-black/30">(system)</span></div>
            <div className="text-black/50 break-all">{fmtDate(i.active_date)}</div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-black/10">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2 font-sans">Magic Tokens</div>
        <table className="w-full text-[11px] font-sans">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-wider text-black/50 border-b border-black/10">
              <th className="py-1.5 pr-2 font-medium">Token Type</th>
              <th className="py-1.5 pr-2 font-medium">Status</th>
              <th className="py-1.5 pr-2 font-medium">Created</th>
              <th className="py-1.5 pr-2 font-medium">Expires</th>
              <th className="py-1.5 pr-2 font-medium">Token URL</th>
              <th className="py-1.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => {
              const typeCls = t.type === "enrollment" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
              const statusCls = t.status === "active" ? "bg-green-100 text-green-700" : t.status === "revoked" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
              return (
                <tr key={t.id} className="border-b border-black/5 last:border-b-0">
                  <td className="py-2 pr-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCls}`}>{t.type}</span></td>
                  <td className="py-2 pr-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCls}`}>{t.status}</span></td>
                  <td className="py-2 pr-2 text-black/70">{fmtDate(t.created)}</td>
                  <td className={`py-2 pr-2 ${expiryTone(t.expires)}`}>{fmtDate(t.expires)}</td>
                  <td className="py-2 pr-2">
                    <span className="inline-flex items-center gap-1 max-w-[260px]">
                      <span className="font-mono text-[10px] text-black/60 truncate">{t.url}</span>
                      <button onClick={() => navigator.clipboard?.writeText(t.url)} title="Copy" className="text-black/40 hover:text-[#0a3d3e] shrink-0">
                        <Copy className="h-3 w-3" />
                      </button>
                      <a href={t.url} target="_blank" rel="noreferrer" className="text-black/40 hover:text-[#0a3d3e] shrink-0">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {t.status === "active" && (
                      <button
                        onClick={() => { setRevokeTarget(t); setRevokeReason(""); }}
                        className="text-[10px] px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRevokeTarget(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5">
            <h3 className="text-base font-semibold text-gray-900">Revoke this {revokeTarget.type} token?</h3>
            <p className="text-sm text-gray-600 mt-1">This will invalidate the enrollee's link immediately.</p>
            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-wider text-black/50">Reason <span className="text-red-600">*</span></label>
              <input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className={`${inputCls} mt-1`}
                placeholder="e.g. enrollee requested a fresh link"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Btn onClick={() => setRevokeTarget(null)}>Cancel</Btn>
              <Btn
                variant="danger"
                disabled={!revokeReason.trim()}
                onClick={() => {
                  setTokens((prev) => prev.map((p) => p.id === revokeTarget.id ? { ...p, status: "revoked" } : p));
                  setRevokeTarget(null);
                }}
              >
                Revoke
              </Btn>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* =============================================================
   BUILDING BLOCKS
============================================================= */

const inputCls = "w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";

function SectionCard({
  title, children, defaultOpen = false, summary, editing = false, canEdit = false, onEdit,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  editing?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen || editing);
  const isOpen = open || editing;
  return (
    <div className={`bg-white border rounded-lg p-5 ${editing ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left flex-1 min-w-0">
          {isOpen ? <ChevronDown className="h-4 w-4 text-black/40 shrink-0" /> : <ChevronRight className="h-4 w-4 text-black/40 shrink-0" />}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!isOpen && summary && <span className="text-xs text-black/50 truncate">· {summary}</span>}
        </button>
        {canEdit && !editing && isOpen && onEdit && (
          <button onClick={onEdit} className="text-black/40 hover:text-[#0a3d3e] p-1" title="Edit section">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

function SectionActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-4 pt-4 border-t border-black/10 flex justify-end gap-2">
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn variant="primary" onClick={onSave}>Save</Btn>
    </div>
  );
}

function Grid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const cls = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  return <div className={`grid ${cls} gap-x-6 gap-y-4`}>{children}</div>;
}

function RField({ label, value, children, editing, locked }: { label: string; value?: React.ReactNode; children?: React.ReactNode; editing?: boolean; locked?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
        {label}
        {locked && <Lock className="h-3 w-3 text-black/30" />}
      </div>
      <div className="text-sm text-gray-900">
        {editing && children && !locked
          ? children
          : (value !== undefined ? (value === null || value === "" ? <span className="text-gray-400">—</span> : value) : children)}
      </div>
    </div>
  );
}

function SummaryChip({ label, value, onClick, tone }: { label: string; value: React.ReactNode; onClick?: () => void; tone?: "ok" | "bad" | "warn" }) {
  const valueColor = tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-black/85";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white border border-black/10 rounded-md px-2.5 py-1.5 ${onClick ? "hover:bg-[#f7f3eb] cursor-pointer" : "cursor-default"}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-black/50">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 truncate ${valueColor}`}>{value}</div>
    </button>
  );
}

function Ref({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-[9px] uppercase tracking-wider text-black/40 mb-0.5 font-sans">{label}</div>
      <div className="text-black/70 break-all">{value || "—"}</div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, onCancel, onConfirm }: { title: string; message: string; confirmLabel?: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}
