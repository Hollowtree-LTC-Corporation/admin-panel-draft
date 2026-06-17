import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, DollarSign, Percent, ChevronDown, ChevronRight } from "lucide-react";
import { Card, Stat, PageHeader, Pill, TableShell, THead, TRow, TCell } from "@/components/wireframe/Bits";
import { useStore } from "@/lib/wireframe/store";
import { INDIVIDUALS, ORGS, LTC_STAGES, COVERAGE_STATUSES, formatCents } from "@/lib/wireframe/data";

export const Route = createFileRoute("/")({ component: Dashboard });

// Synthesized for wireframe only — schema has organizations.eligible_lives but
// the dummy ORGS data does not populate it.
const eligibleLivesFor = (individuals_count: number) => individuals_count * 2 + 5;

const COVERAGE_COLOR: Record<(typeof COVERAGE_STATUSES)[number], string> = {
  active: "bg-emerald-500",
  in_progress: "bg-sky-500",
  purchased: "bg-teal-500",
  not_started: "bg-slate-400",
  suspended: "bg-amber-500",
  canceled: "bg-rose-500",
  lapsed: "bg-rose-800",
};

// Per spec: one closing, one closed, rest open.
const windowStatusFor = (orgId: string): { label: string; tone: "ok" | "warn" | "bad" | "neutral" } => {
  if (orgId === "org_6") return { label: "Closing in 5 days", tone: "warn" };
  if (orgId === "org_4") return { label: "Closed", tone: "bad" };
  return { label: "Open", tone: "ok" };
};

function Dashboard() {
  const { product } = useStore();
  const navigate = useNavigate();
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [upgradeOpen, setUpgradeOpen] = useState<boolean>(true);
  const [spousalOpen, setSpousalOpen] = useState<boolean>(true);

  const productOrgs = ORGS.filter((o) => o.product === product);
  const allInds = INDIVIDUALS.filter((i) => i.product === product);
  const inds = orgFilter === "all" ? allInds : allInds.filter((i) => i.organization_id === orgFilter);

  const coverageCounts = COVERAGE_STATUSES.map((s) => ({
    status: s,
    n: inds.filter((i) => i.coverage_status === s).length,
  }));

  const enrolledLives = inds.filter((i) => ["active", "purchased", "in_progress"].includes(i.coverage_status)).length;
  const activePremium = inds.filter((i) => i.coverage_status === "active").reduce((sum, i) => sum + i.monthly_premium_cents, 0);
  const numOrgs = new Set(inds.map((i) => i.organization_id)).size;

  // DI funnel stages (Airtable-aligned). LTC keeps the legacy microsite stages.
  const DI_FUNNEL_STAGES = [
    "Choosing a Plan",
    "Plan Selected - Confirming Information",
    "At Checkout",
    "Adding Payment Method",
    "Payment Method Added - Purchase Completed",
  ] as const;
  type DiBucket = (typeof DI_FUNNEL_STAGES)[number] | "canceled" | "test" | "transitioning";
  const diBucketFor = (ind: (typeof inds)[number], idx: number): DiBucket => {
    if (ind.coverage_status === "canceled") return "canceled";
    if (idx % 17 === 3) return "test";
    if (idx % 19 === 5) return "transitioning";
    switch (ind.current_stage) {
      case "choosing_plan":
        return "Choosing a Plan";
      case "confirming_info":
        return "Plan Selected - Confirming Information";
      case "at_checkout":
        return "At Checkout";
      case "adding_payment":
        return "Adding Payment Method";
      case "purchased":
        return "Payment Method Added - Purchase Completed";
      default:
        return "Choosing a Plan";
    }
  };

  const isDI = product === "DI";
  const diBuckets = isDI ? inds.map((ind, idx) => diBucketFor(ind, idx)) : [];
  const diExcluded = {
    canceled: diBuckets.filter((b) => b === "canceled").length,
    test: diBuckets.filter((b) => b === "test").length,
    transitioning: diBuckets.filter((b) => b === "transitioning").length,
  };
  const stageCounts: Array<{ stage: string; n: number }> = isDI
    ? DI_FUNNEL_STAGES.map((s) => ({ stage: s, n: diBuckets.filter((b) => b === s).length }))
    : LTC_STAGES.map((s) => ({ stage: s, n: inds.filter((i) => i.current_stage === s).length }));
  const maxStage = Math.max(...stageCounts.map((c) => c.n), 1);

  // ===== LTC three-funnel buckets =====
  const isLTC = product === "LTC";
  const LTC_MAIN_STAGES = [
    "Starting",
    "Selecting Plan",
    "Beneficiary",
    "Checkout",
    "Post-Purchase",
    "Spousal Flow",
    "SI Buy-up",
  ] as const;
  const LTC_UPGRADE_STAGES = [
    "Upsell Survey",
    "Interested in Personal Upgrade",
    "At More Coverage",
    "Choosing Upgrade Option",
    "Answering Medical Questions For Upgrade",
    "Upgrade Checkout",
    "Applied For Upgrade",
  ] as const;
  const LTC_SPOUSAL_STAGES = [
    "Interested in Spouse Coverage",
    "Choosing Spousal Pricing",
    "Spousal Coverage - Eligibility Questions",
    "Spousal Coverage - Confirming Details, Health Questions",
    "Spousal Coverage - Designee, Ben and other info",
    "Spousal Coverage - Checkout",
  ] as const;

  const mapMainStage = (s: string): (typeof LTC_MAIN_STAGES)[number] => {
    switch (s) {
      case "starting_application":
        return "Starting";
      case "selecting_plan":
        return "Selecting Plan";
      case "beneficiary_form":
        return "Beneficiary";
      case "at_checkout":
      case "adding_payment":
        return "Checkout";
      case "upsell_survey":
      case "interested_spouse":
      case "interested_upgrade":
      case "interested_both":
      case "at_more_coverage":
        return "Post-Purchase";
      case "choosing_spousal_pricing":
      case "spouse_eligibility":
      case "spouse_confirming_details":
      case "spouse_designee":
      case "spouse_checkout":
        return "Spousal Flow";
      case "choosing_upgrade":
      case "upgrade_medical":
      case "upgrade_checkout":
      case "upgrade_applied":
      case "upgrade_approved":
      case "upgrade_denied":
        return "SI Buy-up";
      default:
        return "Starting";
    }
  };

  const ltcSpouseInds = isLTC ? inds.filter((i) => i.relationship_type === "spouse") : [];
  const ltcBuyupInds = isLTC ? inds.filter((i) => i.issue_type === "SI" && i.relationship_type !== "spouse") : [];
  const ltcMainInds = isLTC
    ? inds.filter((i) => i.relationship_type !== "spouse" && i.issue_type !== "SI")
    : [];

  const ltcMainCounts = LTC_MAIN_STAGES.map((s) => ({
    stage: s,
    n: ltcMainInds.filter((ind, idx) => mapMainStage(ind.current_stage, idx) === s).length,
  }));
  const ltcUpgradeCounts = LTC_UPGRADE_STAGES.map((s, sIdx) => ({
    stage: s,
    n: ltcBuyupInds.filter((_, idx) => idx % LTC_UPGRADE_STAGES.length === sIdx).length,
  }));
  const ltcSpousalCounts = LTC_SPOUSAL_STAGES.map((s, sIdx) => ({
    stage: s,
    n: ltcSpouseInds.filter((_, idx) => idx % LTC_SPOUSAL_STAGES.length === sIdx).length,
  }));
  const upsellNotInterested = Math.max(1, Math.floor(ltcBuyupInds.length * 0.3));
  const multiInterest = Math.min(ltcSpouseInds.length, Math.max(1, Math.floor(ltcBuyupInds.length * 0.25)));

  const ltcMaxMain = Math.max(...ltcMainCounts.map((c) => c.n), 1);
  const ltcMaxUpgrade = Math.max(...ltcUpgradeCounts.map((c) => c.n), 1);
  const ltcMaxSpousal = Math.max(...ltcSpousalCounts.map((c) => c.n), 1);

  // Enrolled Lives breakdown (LTC)
  const enrolledForBreakdown = inds.filter((i) => ["active", "purchased", "in_progress"].includes(i.coverage_status));
  const ltcEmployees = enrolledForBreakdown.filter((i) => i.relationship_type !== "spouse").length;
  const ltcSpouses = enrolledForBreakdown.filter((i) => i.relationship_type === "spouse").length;
  const ltcGI = enrolledForBreakdown.filter((i) => i.issue_type === "GI").length;
  const ltcSI = enrolledForBreakdown.filter((i) => i.issue_type === "SI").length;

  const collected = inds.reduce((sum, i) => sum + i.monthly_premium_cents, 0);
  const expected = Math.round(collected * 1.08);
  const delta = collected - expected;
  const outstanding = Math.round(collected * 0.07);
  const outstandingEnrollees = inds.filter((i) => i.last_payment_status === "failed" || i.last_payment_status === "pending").length;

  const failedInds = inds.filter((i) => i.last_payment_status === "failed");
  const grace = failedInds.filter((i) => i.retry_count <= 2).length;
  const penalty = failedInds.filter((i) => i.retry_count >= 3 && i.retry_count <= 4).length;
  const suspensionRisk = failedInds.filter((i) => i.retry_count >= 5).length;

  const orgRows = useMemo(() => productOrgs.map((o) => {
    const orgInds = allInds.filter((i) => i.organization_id === o.id);
    const failed = orgInds.filter((i) => i.last_payment_status === "failed").length;
    let healthTone: "ok" | "warn" | "bad" = "ok";
    if (failed >= 3) healthTone = "bad";
    else if (failed >= 1) healthTone = "warn";
    return {
      ...o,
      individuals_count: orgInds.length,
      eligible_lives: eligibleLivesFor(orgInds.length),
      failed,
      healthTone,
      window: windowStatusFor(o.id),
    };
  }), [productOrgs, allInds]);

  const stalled = allInds.filter((i) => i.coverage_status === "in_progress").length;
  const onboardingOrgs = productOrgs.filter((o) => o.status === "onboarding").length;

  const notify = (where: string) => toast(`Navigate to ${where}`, { description: "Wireframe only" });

  return (
    <div>
      <PageHeader
        title={`${product} Dashboard`}
        subtitle="Per-product overview · all numbers are dummy"
      />

      <div className="flex items-center gap-2 mb-4">
        <label className="text-[11px] uppercase tracking-wider text-black/50">Organization</label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="px-2 py-1 text-xs border border-black/15 rounded bg-white min-w-[220px]"
        >
          <option value="all">All Organizations</option>
          {productOrgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {orgFilter !== "all" ? (
          <button
            onClick={() => setOrgFilter("all")}
            className="text-[11px] text-[#0a3d3e] underline hover:no-underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Coverage Status */}
      <div className="text-[11px] uppercase tracking-wider text-black/55 font-semibold mb-2">Coverage Status</div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="col-span-2 space-y-3">
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#0a3d3e]/10 flex items-center justify-center text-[#0a3d3e]">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Enrolled Lives</div>
              <div className="text-2xl font-semibold">{enrolledLives}</div>
              <div className="text-[11px] text-black/40">across {numOrgs} organizations</div>
              {isLTC ? (
                <>
                  <div className="text-[11px] text-black/55 mt-0.5">{ltcEmployees} employees · {ltcSpouses} spouses</div>
                  <div className="text-[11px] text-black/55">{ltcGI} GI · {ltcSI} SI</div>
                </>
              ) : null}
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Monthly Premium</div>
              <div className="text-2xl font-semibold">{formatCents(activePremium)}</div>
              <div className="text-[11px] text-black/40">active enrollees only</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700">
              <Percent size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-black/50">Monthly Net Commission</div>
              <div className="text-2xl font-semibold">$4,812.00</div>
              <div className="text-[11px] text-black/40">estimated, all payees</div>
            </div>
          </Card>
        </div>
        <Card>
          <TableShell>
            <THead cols={["Status", "Count"]} />
            <tbody>
              {coverageCounts.map((c) => (
                <TRow key={c.status}>
                  <TCell>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-sm ${COVERAGE_COLOR[c.status]}`} />
                      {c.status.replace("_", " ")}
                    </span>
                  </TCell>
                  <TCell className="font-medium">{c.n}</TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </div>

      {/* Enrollment Progress / Funnel */}
      <div className="text-[11px] uppercase tracking-wider text-black/55 font-semibold mb-2">
        {isLTC ? "Enrollment Progress (stage)" : "Enrollment Funnel (stage)"}
      </div>
      {isLTC ? (
        <Card className="p-3 mb-5">
          {/* Section A — Main funnel */}
          <div className="text-[11px] font-semibold text-black/70 mb-1.5">Main enrollment funnel</div>
          <div className="space-y-1.5">
            {ltcMainCounts.map((c) => {
              const pct = (c.n / ltcMaxMain) * 100;
              return (
                <div
                  key={c.stage}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[#f7f3eb]/60 rounded px-1 -mx-1"
                  onClick={() => navigate({ to: "/individuals" })}
                >
                  <div className="w-64 text-black/70">{c.stage}</div>
                  <div className="flex-1 h-5 bg-black/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#0a3d3e] flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                      style={{ width: `${Math.max(pct, c.n > 0 ? 6 : 0)}%` }}
                    >
                      {c.n > 0 ? c.n : ""}
                    </div>
                  </div>
                  <div className="w-10 text-right text-black/60 tabular-nums">{c.n}</div>
                </div>
              );
            })}
          </div>

          {/* Section B — Upgrade sub-funnel */}
          <div className="mt-4 pt-3 border-t border-black/10 pl-2 border-l-2 border-l-[#0a3d3e]/20">
            <button
              type="button"
              onClick={() => setUpgradeOpen((v) => !v)}
              className="w-full flex items-center gap-1 text-[11px] font-semibold text-black/70 mb-1.5"
            >
              {upgradeOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Upgrade sub-funnel (SI buy-up)
            </button>
            {upgradeOpen ? (
              <>
                <div className="space-y-1">
                  {ltcUpgradeCounts.map((c) => {
                    const pct = (c.n / ltcMaxUpgrade) * 100;
                    return (
                      <div
                        key={c.stage}
                        className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-[#f7f3eb]/60 rounded px-1 -mx-1"
                        onClick={() => navigate({ to: "/individuals" })}
                      >
                        <div className="w-64 text-black/65">{c.stage}</div>
                        <div className="flex-1 h-4 bg-black/5 rounded overflow-hidden">
                          <div
                            className="h-full bg-[#0a3d3e]/80 flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                            style={{ width: `${Math.max(pct, c.n > 0 ? 6 : 0)}%` }}
                          >
                            {c.n > 0 ? c.n : ""}
                          </div>
                        </div>
                        <div className="w-10 text-right text-black/55 tabular-nums">{c.n}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-black/55 mt-1.5">
                  Upsell Survey Completed - Not Interested: {upsellNotInterested}
                </div>
              </>
            ) : null}
          </div>

          {/* Section C — Spousal sub-funnel */}
          <div className="mt-3 pt-3 border-t border-black/10 pl-2 border-l-2 border-l-[#0a3d3e]/20">
            <button
              type="button"
              onClick={() => setSpousalOpen((v) => !v)}
              className="w-full flex items-center gap-1 text-[11px] font-semibold text-black/70 mb-1.5"
            >
              {spousalOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Spousal coverage sub-funnel
            </button>
            {spousalOpen ? (
              <div className="space-y-1">
                {ltcSpousalCounts.map((c) => {
                  const pct = (c.n / ltcMaxSpousal) * 100;
                  return (
                    <div
                      key={c.stage}
                      className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-[#f7f3eb]/60 rounded px-1 -mx-1"
                      onClick={() => navigate({ to: "/individuals" })}
                    >
                      <div className="w-64 text-black/65">{c.stage}</div>
                      <div className="flex-1 h-4 bg-black/5 rounded overflow-hidden">
                        <div
                          className="h-full bg-[#0a3d3e]/80 flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                          style={{ width: `${Math.max(pct, c.n > 0 ? 6 : 0)}%` }}
                        >
                          {c.n > 0 ? c.n : ""}
                        </div>
                      </div>
                      <div className="w-10 text-right text-black/55 tabular-nums">{c.n}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="text-[10px] text-black/55 mt-3">
            Multi-interest: {multiInterest} interested in both spouse + upgrade
          </div>
          <div className="text-[10px] text-black/40 mt-1">
            LTC tracks three enrollment paths. Main funnel is GI base coverage. Upgrade and spousal are SI sub-funnels.
          </div>
        </Card>
      ) : (
        <Card className="p-3 mb-5">
          <div className="space-y-1.5">
            {stageCounts.map((c) => {
              const pct = (c.n / maxStage) * 100;
              return (
                <div
                  key={c.stage}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[#f7f3eb]/60 rounded px-1 -mx-1"
                  onClick={() => navigate({ to: "/individuals" })}
                >
                  <div className="w-56 text-black/70">{isDI ? c.stage : c.stage.replace(/_/g, " ")}</div>
                  <div className="flex-1 h-5 bg-black/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#0a3d3e] flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                      style={{ width: `${Math.max(pct, c.n > 0 ? 6 : 0)}%` }}
                    >
                      {c.n > 0 ? c.n : ""}
                    </div>
                  </div>
                  <div className="w-10 text-right text-black/60 tabular-nums">{c.n}</div>
                </div>
              );
            })}
          </div>
          {isDI ? (
            <div className="text-[10px] text-black/55 mt-2">
              Excluded from funnel: {diExcluded.canceled} canceled · {diExcluded.test} test leads · {diExcluded.transitioning} transitioning
            </div>
          ) : null}
          <div className="text-[10px] text-black/40 mt-1">
            {isDI
              ? "Funnel reflects DI enrollment stages. Canceled, test, and transitioning records excluded."
              : "Funnel reflects the enrollment microsite stages, distinct from coverage lifecycle."}
          </div>
        </Card>
      )}

      {/* Payment Health */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-black/10 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50">Collected This Cycle</div>
          <div className="text-[10px] text-black/40 mt-0.5">June 2026</div>
          <div className="text-xl font-semibold mt-1">{formatCents(collected)}</div>
          <div className="text-[11px] text-black/50 mt-1">Expected: {formatCents(expected)}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {delta >= 0 ? "+" : ""}{formatCents(delta)} vs expected
          </div>
        </div>
        <Stat
          label="Outstanding Balance"
          value={formatCents(outstanding)}
          hint={`across ${outstandingEnrollees} enrollees`}
        />
        <Stat
          label="Suspended / Lapsed"
          value={inds.filter((i) => ["suspended", "lapsed"].includes(i.coverage_status)).length}
          hint="needs ops review"
        />
        <div className="bg-white border border-black/10 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-black/50">Failed Payments (Last 30d)</div>
          <div className="text-xl font-semibold mt-1">{failedInds.length}</div>
          <div className="text-[10px] text-black/55 mt-1 leading-snug">
            Grace (1-2): <span className="font-medium">{grace}</span>
            <span className="mx-1 text-black/30">|</span>
            Penalty (3-4): <span className="font-medium">{penalty}</span>
            <span className="mx-1 text-black/30">|</span>
            Suspension risk (5+): <span className="font-medium text-rose-700">{suspensionRisk}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="px-3 py-2 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-black/60">
            Top organizations
          </div>
          <TableShell>
            <THead cols={["Org", "State", "Status", "Enrolled / Eligible", "Payment Health", "Window"]} />
            <tbody>
              {orgRows.map((o) => (
                <TRow key={o.id} onClick={() => setOrgFilter(o.id)}>
                  <TCell className="font-medium">{o.name}</TCell>
                  <TCell>{o.situs_state}</TCell>
                  <TCell><Pill tone={o.status === "active" ? "ok" : o.status === "onboarding" ? "info" : "neutral"}>{o.status}</Pill></TCell>
                  <TCell className="tabular-nums">{o.individuals_count} / {o.eligible_lives}</TCell>
                  <TCell>
                    <Pill tone={o.healthTone === "ok" ? "ok" : o.healthTone === "warn" ? "warn" : "bad"}>
                      {o.healthTone === "ok" ? "All current" : `${o.failed} failed`}
                    </Pill>
                  </TCell>
                  <TCell><Pill tone={o.window.tone}>{o.window.label}</Pill></TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </Card>

        <Card>
          <div className="px-3 py-2 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-black/60">
            Needs attention
          </div>
          <ul className="text-sm">
            {product === "DI" ? (
              <>
                <li onClick={() => navigate({ to: "/missing-submissions" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>4 missing submissions awaiting review</span>
                  <Pill tone="warn">DI</Pill>
                </li>
                <li onClick={() => navigate({ to: "/policies" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                  <span>2 policies missing carrier commission %</span>
                  <Pill tone="warn">DI</Pill>
                </li>
              </>
            ) : (
            <>
              <li onClick={() => navigate({ to: "/enrollment-windows" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                <span>1 enrollment window closes in 5 days</span>
                <Pill tone="warn">LTC</Pill>
              </li>
              <li onClick={() => navigate({ to: "/individuals" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                <span>3 individuals interested in spousal coverage</span>
                <Pill tone="info">LTC</Pill>
              </li>
              <li onClick={() => navigate({ to: "/individuals" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                <span>2 individuals interested in upgrading</span>
                <Pill tone="purple">upgrade</Pill>
              </li>
              <li onClick={() => navigate({ to: "/individuals" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
                <span>1 SI application awaiting carrier decision</span>
                <Pill tone="amber">carrier</Pill>
              </li>
            </>
            )}
            <li onClick={() => navigate({ to: "/payment-ledger" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>2 failed payments in last 7 days</span>
              <Pill tone="bad">payments</Pill>
            </li>
            <li onClick={() => navigate({ to: "/tokens" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>5 magic tokens expire within 30 days</span>
              <Pill tone="info">tokens</Pill>
            </li>
            <li onClick={() => navigate({ to: "/enrollment-windows" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>1 enrollment window closing in 5 days</span>
              <Pill tone="warn">windows</Pill>
            </li>
            <li onClick={() => navigate({ to: "/organizations", search: { status: "onboarding" } as never })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>{onboardingOrgs > 0 ? onboardingOrgs : 3} orgs still in onboarding</span>
              <Pill tone="info">onboarding</Pill>
            </li>
            <li onClick={() => navigate({ to: "/account-adjustments" })} className="px-3 py-2 border-b border-black/5 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>2 unapplied account adjustments</span>
              <Pill tone="warn">billing</Pill>
            </li>
            <li onClick={() => notify("individuals (in_progress, stale)")} className="px-3 py-2 flex justify-between cursor-pointer hover:bg-[#f7f3eb]/60">
              <span>{stalled > 0 ? stalled : 4} individuals in progress for 30+ days</span>
              <Pill tone="neutral">stale</Pill>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
