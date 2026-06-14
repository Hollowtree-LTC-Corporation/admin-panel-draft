import * as React from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  PageHeader, Card, Field, Btn, Pill, Drawer, useDrawer, Input, ProductBadge,
} from "@/components/wireframe/Bits";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { INDIVIDUALS, ORGS, BILLING_GROUPS, PAYMENT_LEDGER, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals/$id")({ component: IndividualDetail });

/* ---------- Enums (mirror prod CHECK constraints) ---------- */
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const GENDERS = ["male","female","non_binary","prefer_not_to_say"];
const EMPLOYMENT_REL = ["public_sector","private_salaried","private_hourly","self_employed_1099","retired_or_transitioning"];
const W2_1099 = ["W-2","1099"];
const TITLES = ["Mr","Mrs","Ms","Dr","other"];
const COVERAGE_STATUSES = ["not_started","in_progress","purchased","active","suspended","canceled","lapsed"];
const REL_TYPES = ["primary","spouse"];
const TIERS = ["bronze","silver","gold","platinum","diamond"];
const UPGRADE_DECISIONS = ["pending","approved","denied"];

/* ---------- Detail synthesis (additive over base INDIVIDUALS) ---------- */
type Detail = ReturnType<typeof synthesize>;
function synthesize(base: typeof INDIVIDUALS[number]) {
  const n = parseInt(base.id.replace("ind_",""), 10) || 1;
  const isLTC = base.product === "LTC";
  // Coverage status mapped onto the enum the spec wants (override stale "pending")
  const coverage = COVERAGE_STATUSES[n % COVERAGE_STATUSES.length];
  // Affiliate-sponsored (no org) for ind_3 & ind_17
  const noOrg = n === 3 || n === 17;
  // No employer contribution for ind_4 and ind_12
  const noContrib = n === 4 || n === 12;
  // Failed last payment for ind_2, ind_18
  const failedPay = n === 2 || n === 18;
  // LTC spouse linkage: only ind_7 (spouse of ind_6), ind_14 (spouse of ind_13) when LTC base
  const isLtcSpouse = isLTC && (n === 7 || n === 14);
  const relationship = isLTC ? (isLtcSpouse ? "spouse" : "primary") : "primary";
  const linkedId = isLtcSpouse ? `ind_${n - 1}` : (isLTC && (n === 6 || n === 13) ? `ind_${n + 1}` : null);

  return {
    ...base,
    // Identity
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
    // DI identity-only
    title_enum: TITLES[n % TITLES.length],
    w2_1099: W2_1099[n % 2],
    physician_type: n % 4 === 0 ? "Cardiology" : "",
    nurse_type: n % 5 === 0 ? "RN" : "",
    // LTC identity-only
    income: isLTC ? `$${60 + n}k` : "",
    height: isLTC ? `${64 + (n % 8)}in` : "",
    weight: isLTC ? `${150 + (n % 40)}lb` : "",
    tobacco_use: isLTC && n % 6 === 0,
    // Coverage
    coverage_status: coverage,
    effective_date: `2025-0${(n % 9) + 1}-01`,
    active_date: coverage === "active" ? `2025-0${(n % 9) + 1}-01` : null,
    canceled_date: coverage === "canceled" ? `2025-0${(n % 9) + 1}-15` : null,
    application_status: ["submitted","carrier_review","approved","issued"][n % 4],
    enrollment_cycle: "2025-Q3",
    persona: ["standard","high_value","new_hire"][n % 3],
    // DI coverage
    payment_plan: "monthly",
    ltd_premium_cents: 1800 + (n % 7) * 250,
    std_premium_cents: 700 + (n % 7) * 80,
    // LTC coverage
    employee_plan_selected: isLTC ? base.purchased_plan : "",
    employee_monthly_premium_cents: base.monthly_premium_cents,
    benefit_class_name: isLTC ? (n % 2 === 0 ? "All Employees" : "Management") : "",
    upgrade_carrier_decision: isLTC && base.upgrade_applied_for ? UPGRADE_DECISIONS[n % 3] : null,
    pre_upgrade_premium_cents: isLTC && base.upgrade_applied_for ? Math.round(base.monthly_premium_cents * 0.8) : null,
    // Spouse linkage
    relationship_type: relationship,
    linked_individual_id: linkedId,
    interested_spousal_text: isLTC && relationship === "primary" ? (base.interested_spousal ? "yes" : "no") : "",
    spouse_authorization: isLTC && relationship === "primary" ? (n % 2 === 0 ? "granted" : "pending") : "",
    clicked_spouse_link: isLTC && relationship === "primary" ? (n % 3 === 0 ? "yes" : "no") : "",
    sent_spouse_invite: isLTC && relationship === "primary" ? (n % 3 === 0 ? "2025-05-12" : "no") : "",
    why_no_spouse: isLTC && relationship === "primary" && !base.interested_spousal ? "unmarried" : null,
    // Employer contribution
    contribution_tier: noContrib ? null : TIERS[n % TIERS.length],
    contribution_duration_months: noContrib ? null : ([12, 24, null] as const)[n % 3],
    contribution_start_date: noContrib ? null : `2025-0${(n % 9) + 1}-01`,
    contribution_active: !noContrib && n % 5 !== 0,
    // Payment & billing
    should_be_charged: !isLTC,
    last_payment_status: failedPay ? "failed" : (n % 4 === 0 ? "pending" : "successful"),
    last_charge_date: `2025-06-0${(n % 9) + 1}`,
    next_charge_date: `2025-07-0${(n % 9) + 1}`,
    retry_count: failedPay ? (n % 3) + 1 : 0,
    next_retry_date: failedPay ? `2025-06-1${n % 9}` : null,
    failed_attempt_date: failedPay ? `2025-06-0${(n % 9) + 1}` : null,
    failed_payment_reason: failedPay ? "Insufficient funds" : null,
    // Enrollment window
    enrollment_deadline: n % 4 === 0 ? `2025-08-${10 + (n % 18)}` : null,
    // Affiliations
    affiliations: !isLTC && (n === 1 || n === 9)
      ? [{ id: "aff_cca", name: "CCA: Coastal Carriers Association" }]
      : isLTC && (n === 5 || n === 11)
        ? [{ id: "aff_trust_1", name: n === 5 ? "SEIU Trust" : "Teamsters Trust" }]
        : [],
    // System references
    klaviyo_main_id: `kl_${10000 + n}`,
    magic_link: `https://enroll.hollowtree.dev/m/${base.id}-resume-tok`,
    magic_link_portal: `https://portal.hollowtree.dev/m/${base.id}-portal-tok`,
    cca_portal_link: !isLTC ? `https://cca.example/portal/${base.id}` : "",
    signature_url: `https://sign.hollowtree.dev/s/${base.id}.pdf`,
  };
}

function IndividualDetail() {
  const { id } = Route.useParams();
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const editDrawer = useDrawer<Detail>();
  const [refsOpen, setRefsOpen] = useState(false);

  const base = INDIVIDUALS.find((i) => i.id === id);
  if (!base) return <div className="p-4">Individual not found.</div>;
  const i: Detail = synthesize(base);
  const isLTC = i.product === "LTC";
  const linked = i.linked_individual_id ? INDIVIDUALS.find((x) => x.id === i.linked_individual_id) : null;
  const linkedDetail = linked ? synthesize(linked) : null;
  const readOnly = !can("individuals", "update");
  const bg = BILLING_GROUPS.find((b) => b.id === i.billing_group_id);

  // Net balance: synth as outstanding when failed, small credit otherwise
  const balanceCents = i.last_payment_status === "failed" ? i.monthly_premium_cents : -250;

  return (
    <div>
      <Link to="/individuals" className="inline-flex items-center text-xs text-black/60 hover:text-black mb-2">
        <ChevronLeft className="h-3 w-3" /> Individuals
      </Link>
      <PageHeader
        title={i.full_name}
        subtitle={<>Individuals &rsaquo; {i.full_name} · <span className="text-black/40">{i.id}</span></>}
        actions={
          <>
            <Pill tone={i.coverage_status === "active" ? "ok" : i.coverage_status === "canceled" || i.coverage_status === "lapsed" ? "bad" : "info"}>{i.coverage_status}</Pill>
            <ProductBadge product={i.product} />
            <Btn onClick={() => editDrawer.open(i, "edit")} disabled={readOnly}>Edit</Btn>
            <Btn disabled={!can("individuals", "delete")}>Deactivate</Btn>
          </>
        }
      />

      {/* Summary chips */}
      <div className="grid grid-cols-6 gap-2 mb-5">
        <SummaryChip
          label="Org"
          value={i.org_name ?? <span className="italic text-black/50">Affiliate-sponsored</span>}
          onClick={i.org_id ? () => navigate({ to: "/organizations/$id", params: { id: i.org_id! } }) : undefined}
        />
        <SummaryChip label="Billing Group" value={bg?.name ?? i.billing_group_id} onClick={() => navigate({ to: "/billing-groups" })} />
        <SummaryChip label="Enrollment Window" value={i.org_id ? `annual · 2025-09` : "—"} onClick={i.org_id ? () => navigate({ to: "/organizations/$id", params: { id: i.org_id! } }) : undefined} />
        <SummaryChip label="Monthly Premium" value={formatCents(i.monthly_premium_cents)} />
        <SummaryChip
          label="Last Payment"
          value={<span className="inline-flex items-center gap-1">{i.last_charge_date} <Pill tone={i.last_payment_status === "successful" ? "ok" : i.last_payment_status === "failed" ? "bad" : "info"}>{i.last_payment_status}</Pill></span>}
          onClick={() => navigate({ to: "/payment-ledger" })}
        />
        <SummaryChip
          label="Balance"
          value={formatCents(balanceCents)}
          tone={balanceCents > 0 ? "warn" : "ok"}
          onClick={() => navigate({ to: "/enrollee-balance" })}
        />
      </div>

      {/* Section 1: Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-x-8">
          <div>
            <Field label="First Name"><Input defaultValue={i.first_name} /></Field>
            <Field label="Last Name"><Input defaultValue={i.last_name} /></Field>
            <Field label="Email"><Input defaultValue={i.email} /></Field>
            <Field label="Phone"><Input defaultValue={i.phone} /></Field>
            <Field label="Personal Email"><Input defaultValue={i.personal_email ?? ""} /></Field>
            <Field label="Secondary Phone"><Input defaultValue={i.secondary_phone ?? ""} /></Field>
            <Field label="Gender"><Select defaultValue={i.gender} options={GENDERS} /></Field>
            <Field label="Date of Birth"><input type="date" defaultValue={i.date_of_birth} className="w-full px-2 py-1 text-sm border border-black/15 rounded" /></Field>
            <Field label="SSN">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-black/5 text-black/70">
                <Lock className="h-3 w-3" /> {i.ssn_on_file ? "SSN on file" : "No SSN"}
              </span>
            </Field>
          </div>
          <div>
            <Field label="Address Line 1"><Input defaultValue={i.address_line_1} /></Field>
            <Field label="City"><Input defaultValue={i.city} /></Field>
            <Field label="State"><Select defaultValue={i.state} options={US_STATES} /></Field>
            <Field label="Zip Code"><Input defaultValue={i.zip_code} /></Field>
            <Field label="Hire Date"><input type="date" defaultValue={i.hire_date} className="w-full px-2 py-1 text-sm border border-black/15 rounded" /></Field>
            <Field label="Organization">
              {i.org_id ? (
                <Link to="/organizations/$id" params={{ id: i.org_id }} className="text-sm underline hover:text-[#0a3d3e]">{i.org_name}</Link>
              ) : (
                <span className="text-sm italic text-black/50">No employer (affiliate-sponsored)</span>
              )}
            </Field>
            <Field label="Employment Relationship"><Select defaultValue={i.employment_relationship} options={EMPLOYMENT_REL} /></Field>
            <Field label="Union Member">
              <Switch checked={i.union_member} />
            </Field>
            {i.union_member ? <Field label="Union Local Name"><Input defaultValue={i.union_local_name ?? ""} /></Field> : null}
          </div>
        </div>

        {/* Product-specific identity */}
        {!isLTC ? (
          <div className="mt-4 pt-4 border-t border-black/10">
            <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">DI Identity</div>
            <div className="grid grid-cols-3 gap-x-8">
              <Field label="Title"><Select defaultValue={i.title_enum} options={TITLES} /></Field>
              <Field label="Greeting"><Input defaultValue={i.greeting} /></Field>
              <Field label="W-2 or 1099"><Select defaultValue={i.w2_1099} options={W2_1099} /></Field>
              <Field label="Physician Type"><Input defaultValue={i.physician_type} placeholder="free text" /></Field>
              <Field label="Nurse Type"><Input defaultValue={i.nurse_type} placeholder="free text" /></Field>
              <Field label="Assigned Rep"><Input defaultValue={i.assigned_rep} /></Field>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-black/10">
            <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">LTC Identity</div>
            <div className="grid grid-cols-4 gap-x-8">
              <Field label="Income"><Input defaultValue={i.income} /></Field>
              <Field label="Height"><Input defaultValue={i.height} /></Field>
              <Field label="Weight"><Input defaultValue={i.weight} /></Field>
              <Field label="Tobacco Use"><Switch checked={i.tobacco_use} /></Field>
            </div>
          </div>
        )}
      </Section>

      {/* Section 2: Coverage & Plan */}
      <Section title={`Coverage & Plan · ${i.product}`}>
        <div className="grid grid-cols-3 gap-x-8">
          <Field label="Coverage Status"><Select defaultValue={i.coverage_status} options={COVERAGE_STATUSES} /></Field>
          <Field label="Current Stage"><span className="text-sm">{i.stage}</span></Field>
          <Field label="Effective Date"><input type="date" defaultValue={i.effective_date} className="w-full px-2 py-1 text-sm border border-black/15 rounded" /></Field>
          <Field label="Active Date"><span className="text-sm text-black/60">{i.active_date ?? "—"}</span></Field>
          <Field label="Canceled Date"><span className="text-sm text-black/60">{i.canceled_date ?? "—"}</span></Field>
          <Field label="Application Status"><Input defaultValue={i.application_status} /></Field>
          <Field label="Enrollment Cycle"><Input defaultValue={i.enrollment_cycle} /></Field>
          <Field label="Persona"><Input defaultValue={i.persona} /></Field>
        </div>

        <div className="mt-4 pt-4 border-t border-black/10">
          <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">{isLTC ? "LTC Plan" : "DI Plan"}</div>
          {!isLTC ? (
            <div className="grid grid-cols-3 gap-x-8">
              <Field label="Coverage Plan"><Input defaultValue={i.coverage_plan} /></Field>
              <Field label="Monthly Benefit">{formatCents(i.monthly_benefit_cents)}</Field>
              <Field label="Weekly Covered Benefit">{formatCents(i.weekly_covered_benefit_cents)}</Field>
              <Field label="Payment Plan"><Input defaultValue={i.payment_plan} /></Field>
              <Field label="Monthly Premium">{formatCents(i.monthly_premium_cents)}</Field>
              <Field label="LTD Premium">{formatCents(i.ltd_premium_cents)}</Field>
              <Field label="STD Premium">{formatCents(i.std_premium_cents)}</Field>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-8">
              <Field label="Purchased Plan"><Input defaultValue={i.purchased_plan} /></Field>
              <Field label="Employee Plan Selected"><Input defaultValue={i.employee_plan_selected} /></Field>
              <Field label="Employee Face Amount">{formatCents(i.employee_face_amount_cents)}</Field>
              <Field label="Employee Monthly Premium">{formatCents(i.employee_monthly_premium_cents)}</Field>
              <Field label="Benefit Class"><Select defaultValue={i.benefit_class_name} options={["All Employees","Management"]} /></Field>
              <Field label="Upgrade Applied For"><span className="text-sm">{i.upgrade_applied_for ? "yes" : "no"}</span></Field>
              <Field label="Interested in Upgrading"><span className="text-sm">{i.interested_upgrading ? "yes" : "no"}</span></Field>
              <Field label="Upgrade Carrier Decision">
                {i.upgrade_carrier_decision ? <Select defaultValue={i.upgrade_carrier_decision} options={UPGRADE_DECISIONS} /> : <span className="text-sm text-black/40">—</span>}
              </Field>
              <Field label="Pre-Upgrade Premium">{i.pre_upgrade_premium_cents != null ? formatCents(i.pre_upgrade_premium_cents) : "—"}</Field>
            </div>
          )}
        </div>
      </Section>

      {/* Section 3: Spouse & Linked Individual (LTC only) */}
      {isLTC ? (
        <Section title="Spouse & Linked Individual">
          <div className="grid grid-cols-3 gap-x-8">
            <Field label="Relationship Type"><Pill>{i.relationship_type}</Pill></Field>
            <Field label="Linked Individual">
              {linked ? (
                <Link to="/individuals/$id" params={{ id: linked.id }} className="text-sm underline hover:text-[#0a3d3e]">{linked.full_name}</Link>
              ) : <span className="text-sm text-black/50">None</span>}
            </Field>
            <div />
          </div>
          {i.relationship_type === "primary" ? (
            <div className="mt-4 pt-4 border-t border-black/10">
              <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Spouse Interest</div>
              <div className="grid grid-cols-3 gap-x-8">
                <Field label="Interested in Spousal Coverage"><Input defaultValue={i.interested_spousal_text} /></Field>
                <Field label="Spouse Authorization"><Input defaultValue={i.spouse_authorization} /></Field>
                <Field label="Clicked Spouse Link"><Input defaultValue={i.clicked_spouse_link} /></Field>
                <Field label="Sent Spouse Invite"><Input defaultValue={i.sent_spouse_invite} /></Field>
                <Field label="Why No Spouse"><Input defaultValue={i.why_no_spouse ?? ""} /></Field>
              </div>
            </div>
          ) : null}
          {linkedDetail ? (
            <div className="mt-4 pt-4 border-t border-black/10">
              <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Spouse Coverage (read-only)</div>
              <div className="grid grid-cols-3 gap-x-8">
                <Field label="Spouse Purchased Plan"><span className="text-sm">{linkedDetail.purchased_plan}</span></Field>
                <Field label="Spouse Face Amount"><span className="text-sm">{formatCents(linkedDetail.employee_face_amount_cents)}</span></Field>
                <Field label="Spouse Monthly Premium"><span className="text-sm">{formatCents(linkedDetail.monthly_premium_cents)}</span></Field>
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Section 4: Employer Contribution */}
      <Section title="Employer Contribution">
        <Card className="p-4 bg-[#fbf8f1] border-[#0a3d3e]/20">
          {i.contribution_tier ? (
            <>
              <div className="grid grid-cols-4 gap-x-6">
                <Field label="Contribution Tier"><Select defaultValue={i.contribution_tier} options={TIERS} /></Field>
                <Field label="Duration (months)"><Input defaultValue={i.contribution_duration_months?.toString() ?? ""} placeholder="leave empty for indefinite" /></Field>
                <Field label="Start Date"><input type="date" defaultValue={i.contribution_start_date ?? ""} className="w-full px-2 py-1 text-sm border border-black/15 rounded" /></Field>
                <Field label="End Date">
                  <span className="text-sm text-black/60">
                    {i.contribution_duration_months ? `${i.contribution_start_date} + ${i.contribution_duration_months}mo` : "Indefinite"}
                  </span>
                </Field>
                <Field label="Active">
                  {i.contribution_active ? <Pill tone="ok">active</Pill> : <Pill tone="bad">inactive</Pill>}
                </Field>
              </div>
              <div className="mt-3 p-3 rounded bg-white border border-black/10 text-[12px] text-black/70 leading-relaxed">
                The employer covers this enrollee's premium at the <b>{i.contribution_tier}</b> tier level
                {i.contribution_duration_months ? <> for <b>{i.contribution_duration_months} months</b></> : <> <b>indefinitely</b></>}
                {i.contribution_start_date ? <> starting <b>{i.contribution_start_date}</b></> : null}.
                The dollar amount is derived at billing time by looking up the {i.contribution_tier} tier premium for the enrollee's
                current age and smoker status in the rate table — no stored dollar amount.
                When the contribution ends, the enrollee pays the full premium and a Klaviyo notification fires
                when <code className="text-[11px]">employer_contribution_active</code> flips to false.
              </div>
            </>
          ) : (
            <div className="text-sm text-black/60 italic">No employer contribution. Enrollee pays full premium.</div>
          )}
        </Card>
      </Section>

      {/* Section 5: Payment & Billing */}
      <Section title="Payment & Billing">
        <div className="grid grid-cols-2 gap-x-8">
          <div>
            <Field label="Billing Group">
              <Link to="/billing-groups" className="text-sm underline hover:text-[#0a3d3e]">{bg?.name ?? i.billing_group_id}</Link>
            </Field>
            {!isLTC ? <Field label="Should Be Charged"><Pill tone={i.should_be_charged ? "ok" : "neutral"}>{i.should_be_charged ? "yes" : "no"}</Pill></Field> : null}
            <Field label="Last Payment Status">
              <Pill tone={i.last_payment_status === "successful" ? "ok" : i.last_payment_status === "failed" ? "bad" : "info"}>{i.last_payment_status}</Pill>
            </Field>
            <Field label="Last Charge Date"><span className="text-sm">{i.last_charge_date}</span></Field>
            <Field label="Next Charge Date"><span className="text-sm">{i.next_charge_date}</span></Field>
          </div>
          <div>
            <Field label="Retry Count"><span className="text-sm">{i.retry_count}</span></Field>
            <Field label="Next Retry Date"><span className="text-sm">{i.next_retry_date ?? "—"}</span></Field>
            <Field label="Failed Attempt Date"><span className="text-sm">{i.failed_attempt_date ?? "—"}</span></Field>
            <Field label="Failed Payment Reason">
              <span className="text-sm">{i.failed_payment_reason ?? <span className="text-black/40">None</span>}</span>
            </Field>
          </div>
        </div>
        <div className="mt-2">
          <Link to="/payment-ledger" className="text-xs text-[#0a3d3e] hover:underline inline-flex items-center gap-1">
            View full payment history <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </Section>

      {/* Section 6: Enrollment Window & Affiliations */}
      <Section title="Enrollment Window & Affiliations">
        <div className="grid grid-cols-2 gap-x-8">
          <div>
            <Field label="Enrollment Window">
              {i.org_id ? (
                <Link to="/organizations/$id" params={{ id: i.org_id }} className="text-sm underline hover:text-[#0a3d3e]">annual · 2025-09 (on org)</Link>
              ) : <span className="text-sm text-black/50">—</span>}
            </Field>
            <Field label="Enrollment Deadline"><span className="text-sm">{i.enrollment_deadline ?? "—"}</span></Field>
          </div>
          <div>
            <Field label="Affiliations">
              {i.affiliations.length === 0 ? (
                <span className="text-sm text-black/50">No affiliations</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {i.affiliations.map((a) => (
                    <span key={a.id} className="px-1.5 py-0.5 rounded text-[11px] bg-[#d4b87a]/40 text-[#0a3d3e]">{a.name}</span>
                  ))}
                </div>
              )}
            </Field>
          </div>
        </div>
      </Section>

      {/* Section 7: System References (collapsible) */}
      <div className="mt-6">
        <button
          onClick={() => setRefsOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-black/60 hover:text-black"
        >
          {refsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          System References
        </button>
        {refsOpen ? (
          <Card className="p-4 mt-2 bg-black/[0.02]">
            <div className="grid grid-cols-2 gap-x-8 font-mono text-[11px]">
              <Ref label="Individual ID" value={i.id} />
              <Ref label="Klaviyo Main ID" value={i.klaviyo_main_id} />
              <Ref label="Magic Link" value={i.magic_link} />
              <Ref label="Magic Link Portal" value={i.magic_link_portal} />
              {!isLTC ? <Ref label="CCA Portal Link" value={i.cca_portal_link} /> : null}
              <Ref label="Signature URL" value={i.signature_url} />
            </div>
          </Card>
        ) : null}
      </div>

      {/* Edit drawer */}
      <Drawer open={editDrawer.state.open} onClose={editDrawer.close} title={`Edit · ${i.full_name}`}>
        <div className="space-y-3">
          <DField label="First Name"><Input defaultValue={i.first_name} /></DField>
          <DField label="Last Name"><Input defaultValue={i.last_name} /></DField>
          <DField label="Email"><Input defaultValue={i.email} /></DField>
          <DField label="Phone"><Input defaultValue={i.phone} /></DField>
          <DField label="Coverage Status"><Select defaultValue={i.coverage_status} options={COVERAGE_STATUSES} /></DField>
          <DField label="Organization">
            <Select defaultValue={i.org_id ?? ""} options={["", ...ORGS.map((o) => o.id)]} />
          </DField>
          <DField label="Employment Relationship"><Select defaultValue={i.employment_relationship} options={EMPLOYMENT_REL} /></DField>
          <DField label="Gender"><Select defaultValue={i.gender} options={GENDERS} /></DField>
          <DField label="State"><Select defaultValue={i.state} options={US_STATES} /></DField>
          <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
            <Btn onClick={editDrawer.close}>Cancel</Btn>
            <Btn variant="primary" onClick={editDrawer.close}>Save</Btn>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

/* ---------- Local building blocks ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 pt-5 border-t border-black/10 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="text-sm font-semibold text-black/80 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Select({ defaultValue, options }: { defaultValue?: string; options: string[] }) {
  return (
    <select defaultValue={defaultValue} className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
      {options.map((o) => <option key={o} value={o}>{o === "" ? "— none —" : o}</option>)}
    </select>
  );
}

function SummaryChip({ label, value, onClick, tone, hint }: { label: string; value: React.ReactNode; onClick?: () => void; tone?: "ok" | "warn"; hint?: string }) {
  const valueColor = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-black/85";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={hint}
      className={`text-left bg-white border border-black/10 rounded-md p-2 ${onClick ? "hover:bg-[#f7f3eb] cursor-pointer" : "cursor-default"}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-black/50">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 truncate ${valueColor}`}>{value}</div>
    </button>
  );
}

function DField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">{label}</div>
      {children}
    </div>
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
