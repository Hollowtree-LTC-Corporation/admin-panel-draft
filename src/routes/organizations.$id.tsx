import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageHeader, Card, Field, Btn, Pill, TableShell, THead, TRow, TCell, ProductBadge,
  Drawer, useDrawer, Input,
} from "@/components/wireframe/Bits";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ORGS, BENEFIT_CLASSES, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/organizations/$id")({ component: OrgDetail });

// Dummy enrollment windows scoped per org for this iteration
const DUMMY_WINDOWS = [
  { id: "ew_a", org_id: "org_1", window_type: "initial", sponsor_type: "employer", affiliate: null, start: "2025-01-01", end: "2025-01-31", effective: "2025-02-01", status: "closed", gi_eligible: true, carrier: "Northstar Mutual", notes: "Launch window" },
  { id: "ew_b", org_id: "org_1", window_type: "annual", sponsor_type: "employer", affiliate: null, start: "2025-09-01", end: "2025-09-30", effective: "2025-10-01", status: "upcoming", gi_eligible: false, carrier: "Northstar Mutual", notes: "" },
  { id: "ew_c", org_id: "org_1", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: true, carrier: "Northstar Mutual", notes: "Always-on" },
  { id: "ew_d", org_id: "org_2", window_type: "initial", sponsor_type: "employer", affiliate: null, start: "2025-02-01", end: "2025-02-28", effective: "2025-03-01", status: "closed", gi_eligible: true, carrier: "Pacific Reserve Life", notes: "" },
  { id: "ew_e", org_id: "org_2", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: true, carrier: "Pacific Reserve Life", notes: "" },
  { id: "ew_f", org_id: "org_3", window_type: "annual", sponsor_type: "employer", affiliate: "CCA", start: "2025-08-01", end: "2025-08-31", effective: "2025-09-01", status: "open", gi_eligible: true, carrier: "Heritage LTC Group", notes: "Co-sponsored" },
  { id: "ew_g", org_id: "org_3", window_type: "new_joiner", sponsor_type: "employer", affiliate: null, start: null, end: null, effective: "first_of_next_month", status: "open", gi_eligible: false, carrier: "Heritage LTC Group", notes: "" },
  { id: "ew_h", org_id: "org_5", window_type: "annual", sponsor_type: "employer", affiliate: null, start: "2025-07-01", end: "2025-07-31", effective: "2025-08-01", status: "closed", gi_eligible: true, carrier: "Heritage LTC Group", notes: "" },
  { id: "ew_i", org_id: "org_6", window_type: "special", sponsor_type: "affiliate", affiliate: "Foxtail Alumni Assoc", start: "2025-07-15", end: "2025-08-15", effective: "2025-09-01", status: "open", gi_eligible: false, carrier: "Sequoia Care Partners", notes: "Affiliate-sponsored" },
];

const PLAN_DETAILS_DUMMY: Record<string, string> = {
  "Benefit Period": "24 months",
  "Elimination Period": "90 days",
  "Monthly Benefit": "Up to 60% of base salary, capped at $10,000/mo",
  "Definition of Disability": "Own occupation for first 24 months, then any occupation",
  "Pre-existing Conditions": "12/12 look-back; excluded if treated in prior 12 months",
};

function isCCA(orgId: string) {
  return orgId === "org_3"; // Coastal Credit Union as the CCA example
}

export default function OrgDetail() {
  const { id } = Route.useParams();
  const { product } = useStore();
  const can = usePermission();
  const org = ORGS.find((o) => o.id === id);
  const editDrawer = useDrawer<typeof org>();
  if (!org) return <div className="p-4">Org not found.</div>;

  const readOnly = !can("organizations", "update");
  const windows = DUMMY_WINDOWS.filter((w) => w.org_id === id);
  const windowDrawer = useDrawer<typeof windows[number]>();
  const bcDrawer = useDrawer<typeof BENEFIT_CLASSES[number]>();

  // Per-org benefit classes; synthesize a default for orgs with none
  let classes = BENEFIT_CLASSES.filter((b) => b.org_id === id);
  if (product === "LTC" && classes.length === 0) {
    classes = [{ id: `bc_synth_${id}`, org_id: id, name: "All Employees", gi_offer_cents: 15000000, bronze: 0, silver: 7500000, gold: 15000000, platinum: 20000000, diamond: 25000000, is_default: true }];
  }

  return (
    <div>
      <Link to="/organizations" className="inline-flex items-center text-xs text-black/60 hover:text-black mb-2">
        <ChevronLeft className="h-3 w-3" /> Organizations
      </Link>
      <PageHeader
        title={org.name}
        subtitle={<>Organizations &rsaquo; {org.name} · <span className="text-black/40">{org.id}</span></>}
        actions={
          <>
            <ProductBadge product={org.product} />
            <Btn onClick={() => editDrawer.open(org, "edit")} disabled={readOnly}>Edit</Btn>
            <Btn disabled={!can("organizations", "delete")}>Deactivate</Btn>
          </>
        }
      />

      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="windows">Enrollment Windows</TabsTrigger>
          {product === "LTC" ? <TabsTrigger value="bc">Benefit Classes</TabsTrigger> : null}
          <TabsTrigger value="newjoiner">New Joiner Config</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigTab org={org} product={product} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab org={org} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="windows">
          <WindowsTab
            windows={windows}
            orgName={org.name}
            onNew={() => windowDrawer.open(undefined, "create")}
            onEdit={(w) => windowDrawer.open(w, "edit")}
            canEdit={can("enrollment_windows", "update")}
            canCreate={can("enrollment_windows", "create")}
          />
        </TabsContent>
        {product === "LTC" ? (
          <TabsContent value="bc">
            <BenefitClassesTab
              classes={classes}
              onNew={() => bcDrawer.open(undefined, "create")}
              onEdit={(c) => bcDrawer.open(c, "edit")}
              canEdit={can("benefit_classes", "update")}
              canCreate={can("benefit_classes", "create")}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="newjoiner">
          <NewJoinerTab readOnly={readOnly} />
        </TabsContent>
      </Tabs>

      {/* Edit drawer (reuses create form shape) */}
      <Drawer open={editDrawer.state.open} onClose={editDrawer.close} title={`Edit · ${org.name}`}>
        <Field label="Name"><Input defaultValue={org.name} /></Field>
        <Field label="Product"><Input defaultValue={org.product} /></Field>
        <Field label="Situs State"><Input defaultValue={org.situs_state} /></Field>
        <Field label="Policy Owner Type"><Input defaultValue={org.policy_owner_type} /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={readOnly}>Save</Btn>
          <Btn onClick={editDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>

      <Drawer open={windowDrawer.state.open} onClose={windowDrawer.close} title={windowDrawer.state.mode === "create" ? "New Enrollment Window" : "Edit Window"}>
        <Field label="Window Type"><Input defaultValue={windowDrawer.state.data?.window_type ?? "initial"} /></Field>
        <Field label="Sponsor Type"><Input defaultValue={windowDrawer.state.data?.sponsor_type ?? "employer"} /></Field>
        <Field label="Affiliate Org (if any)"><Input defaultValue={windowDrawer.state.data?.affiliate ?? ""} placeholder="e.g. CCA Member Foundation" /></Field>
        <Field label="Start Date"><Input defaultValue={windowDrawer.state.data?.start ?? ""} placeholder="YYYY-MM-DD (blank for new_joiner)" /></Field>
        <Field label="End Date"><Input defaultValue={windowDrawer.state.data?.end ?? ""} placeholder="YYYY-MM-DD (blank for new_joiner)" /></Field>
        <Field label="Default Effective Date"><Input defaultValue={windowDrawer.state.data?.effective ?? ""} /></Field>
        <Field label="Carrier"><Input defaultValue={windowDrawer.state.data?.carrier ?? ""} /></Field>
        <Field label="Notes"><Input defaultValue={windowDrawer.state.data?.notes ?? ""} /></Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("enrollment_windows", "update")}>Save</Btn>
          <Btn onClick={windowDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>

      <Drawer open={bcDrawer.state.open} onClose={bcDrawer.close} title={bcDrawer.state.mode === "create" ? "New Benefit Class" : "Edit Benefit Class"}>
        <Field label="Name"><Input defaultValue={bcDrawer.state.data?.name ?? ""} /></Field>
        <Field label="GI Offer (cents)"><Input defaultValue={String(bcDrawer.state.data?.gi_offer_cents ?? "")} /></Field>
        <Field label="Bronze (cents)"><Input defaultValue={String(bcDrawer.state.data?.bronze ?? "")} /></Field>
        <Field label="Silver (cents)"><Input defaultValue={String(bcDrawer.state.data?.silver ?? "")} /></Field>
        <Field label="Gold (cents) — must equal GI Offer"><Input defaultValue={String(bcDrawer.state.data?.gold ?? "")} /></Field>
        <Field label="Platinum (cents)"><Input defaultValue={String(bcDrawer.state.data?.platinum ?? "")} /></Field>
        <Field label="Diamond (cents)"><Input defaultValue={String(bcDrawer.state.data?.diamond ?? "")} /></Field>
        <div className="flex items-center gap-2 mb-3">
          <Switch defaultChecked={bcDrawer.state.data?.is_default} /> <span className="text-xs text-black/70">Default for org</span>
        </div>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("benefit_classes", "update")}>Save</Btn>
          <Btn onClick={bcDrawer.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}

/* ---------- Tabs ---------- */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3 py-1.5 border-b border-black/5">
      <div className="text-[11px] uppercase tracking-wider text-black/50">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-black/60 mt-4 mb-1">{children}</div>;
}

function RO({ value, readOnly, placeholder }: { value?: string | number; readOnly: boolean; placeholder?: string }) {
  if (readOnly) return <span className="text-black/80">{value || <span className="text-black/30">—</span>}</span>;
  return <Input defaultValue={value === undefined || value === null ? "" : String(value)} placeholder={placeholder} />;
}

function Select({ value, options, readOnly }: { value: string; options: string[]; readOnly: boolean }) {
  if (readOnly) return <span className="text-black/80">{value}</span>;
  return (
    <select defaultValue={value} className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ checked, readOnly }: { checked: boolean; readOnly: boolean }) {
  return <Switch defaultChecked={checked} disabled={readOnly} />;
}

function ConfigTab({ org, product, readOnly }: { org: typeof ORGS[number]; product: "DI" | "LTC"; readOnly: boolean }) {
  const cca = isCCA(org.id);
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-x-8">
        <div>
          <SubHead>Identity</SubHead>
          <Row label="Name"><RO value={org.name} readOnly={readOnly} /></Row>
          <Row label="Domain"><RO value={`${org.name.toLowerCase().replace(/[^a-z]/g, "")}.example.com`} readOnly={readOnly} /></Row>
          <Row label="Industry"><Select value={["professional_services", "healthcare", "manufacturing", "transportation"][["org_1","org_3","org_4","org_8"].indexOf(org.id) % 4] || "other"} options={["education","healthcare","government","manufacturing","professional_services","transportation","hospitality","other"]} readOnly={readOnly} /></Row>
          <Row label="Org Type"><RO value={cca ? "CPA Firm" : "Employer Group"} readOnly={readOnly} /></Row>
          <Row label="Status"><Pill tone={org.enrollment_status === "active" ? "ok" : org.enrollment_status === "closed" ? "bad" : "info"}>{org.enrollment_status}</Pill></Row>
          <Row label="Situs State"><RO value={org.situs_state} readOnly={readOnly} /></Row>
          <Row label="Situs City"><RO value="Austin" readOnly={readOnly} /></Row>
          <Row label="Eligible Lives"><RO value={org.individuals_count * 3} readOnly={readOnly} /></Row>
          <Row label="Policy Owner Type"><Select value={org.policy_owner_type === "employer" ? "employer_group" : "cca"} options={["employer_group","cca"]} readOnly={readOnly} /></Row>
          <Row label="CCA Group"><Toggle checked={cca} readOnly={readOnly} /></Row>
        </div>

        <div>
          {product === "DI" ? (
            <>
              <SubHead>DI Settings</SubHead>
              <Row label="DI Healthcare Type"><Select value="Healthcare Practice" options={["MSO","Healthcare Practice","Medical Group","Dental","Other"]} readOnly={readOnly} /></Row>
              <Row label="Inbound Type"><RO value="Broker Referral" readOnly={readOnly} /></Row>
              <Row label="Type of Rate"><RO value="Issue Age" readOnly={readOnly} /></Row>
              <Row label="LTD Benefit %"><RO value="60.0" readOnly={readOnly} /></Row>
              <Row label="STD Benefit %"><RO value="66.7" readOnly={readOnly} /></Row>
            </>
          ) : (
            <>
              <SubHead>LTC Settings</SubHead>
              <Row label="Company Years in Existence"><RO value={28} readOnly={readOnly} /></Row>
              <Row label="Product Template Variant"><Select value="eob_and_restoration" options={["base","eob_only","restoration_only","eob_and_restoration"]} readOnly={readOnly} /></Row>
              <Row label="Extension of Benefits Rider"><Toggle checked={true} readOnly={readOnly} /></Row>
              <Row label="Benefit Restoration Rider"><Toggle checked={true} readOnly={readOnly} /></Row>
              <Row label="Benefit Duration"><RO value={6} readOnly={readOnly} /></Row>
              <Row label="Min Age"><RO value={18} readOnly={readOnly} /></Row>
              <Row label="Max Age"><RO value={75} readOnly={readOnly} /></Row>
              <Row label="NAIC Code"><RO value="61425" readOnly={readOnly} /></Row>
            </>
          )}

          <SubHead>Coverage / Billing</SubHead>
          <Row label="Contribution Type"><Select value={cca ? "voluntary" : "employer_paid"} options={["voluntary","buy_up","employer_paid"]} readOnly={readOnly} /></Row>
          <Row label="Pay Mode"><Select value="Monthly" options={["Monthly","10-Pay"]} readOnly={readOnly} /></Row>
          <Row label="Microsite URL"><a className="text-sky-700 hover:underline" href="#">https://enroll.hollowtree.app/{org.id}</a></Row>

          <SubHead>Broker</SubHead>
          <Row label="Primary Broker"><Select value="Westfield Brokers" options={["Westfield Brokers","Hollowtree House","Override Group LLC"]} readOnly={readOnly} /></Row>
          <Row label="Primary Override %"><RO value="Default" readOnly={readOnly} /></Row>
          <Row label="Secondary Broker"><RO value="" readOnly={readOnly} placeholder="None" /></Row>
          <Row label="Secondary Override %"><RO value="" readOnly={readOnly} placeholder="Default" /></Row>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 mt-2">
        <div>
          <SubHead>Signatory</SubHead>
          <Row label="Name"><RO value="Test Signatory" readOnly={readOnly} /></Row>
          <Row label="Title"><RO value="VP HR" readOnly={readOnly} /></Row>
          <Row label="Email"><RO value={`signatory@${org.name.toLowerCase().replace(/[^a-z]/g,"")}.example.com`} readOnly={readOnly} /></Row>
        </div>
        <div>
          <SubHead>Links</SubHead>
          <Row label="Google Drive Folder"><a className="text-sky-700 hover:underline" href="#">drive.google.com/.../{org.id}</a></Row>
          <Row label="Meeting Link"><a className="text-sky-700 hover:underline" href="#">meet.google.com/abc-defg-hij</a></Row>
          <Row label="Assigned Gmail Person"><RO value="ops@hollowtree.example.com" readOnly={readOnly} /></Row>
        </div>
      </div>

      <SubHead>Plan Details (JSONB)</SubHead>
      <Card className="p-3">
        <div className="space-y-2">
          {Object.entries(PLAN_DETAILS_DUMMY).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[200px_1fr] gap-3 items-start">
              <div className="text-xs font-semibold text-black/70 pt-2">{k}</div>
              <Textarea defaultValue={v} disabled={readOnly} placeholder="Enter plan detail..." className="text-sm min-h-[44px]" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FeesTab({ org, readOnly }: { org: typeof ORGS[number]; readOnly: boolean }) {
  const cca = isCCA(org.id);
  const tpa = cca ? 2000 : 800;
  const retained = cca ? 500 : null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-8">
      <Card className="p-4 col-span-1">
        <SubHead>Fee Schedule</SubHead>
        <Row label="TPA Fee"><RO value={formatCents(tpa) + " / mo"} readOnly={readOnly} /></Row>
        <Row label="TPA Fee Name"><RO value={cca ? "CCA Membership Fee" : "Processing Fee"} readOnly={readOnly} /></Row>
        <Row label="Service Fee Retained">{retained === null ? <span className="text-black/60">Full Retention</span> : <RO value={formatCents(retained)} readOnly={readOnly} />}</Row>
        <Row label="Card Percentage"><RO value="3.7%" readOnly={readOnly} /></Row>
        <Row label="ACH First Fee"><RO value="$1.00" readOnly={readOnly} /></Row>
        <Row label="ACH Subsequent Fee"><RO value="$0.50" readOnly={readOnly} /></Row>
        <Row label="Failed ACH Penalty"><RO value="$15.00" readOnly={readOnly} /></Row>
        <Row label="Failed Card Penalty Mode"><Select value="flat" options={["flat","percentage"]} readOnly={readOnly} /></Row>
        <Row label="Failed Card Penalty Value"><RO value="$10.00" readOnly={readOnly} /></Row>
        <Row label="Free Retry Count"><RO value={2} readOnly={readOnly} /></Row>
        <Row label="Effective From"><RO value="2025-01-01" readOnly={readOnly} /></Row>
        <Row label="Effective To"><RO value="" readOnly={readOnly} placeholder="(open-ended)" /></Row>
      </Card>

      <div className="col-span-1">
        <Card className="p-4 bg-[#fefaf2] border-amber-200">
          <div className="text-xs font-semibold text-amber-900 mb-2">How CCA fee splitting works</div>
          <p className="text-xs text-black/70 leading-relaxed mb-2">
            CCA orgs charge a <b>$20/month</b> membership fee (not the standard $8 TPA fee). Of the $20:
          </p>
          <ul className="text-xs text-black/70 list-disc pl-5 space-y-1 mb-3">
            <li><b>$5.00</b> retained by Hollowtree (<code>service_fee_retained_cents = 500</code>)</li>
            <li><b>$15.00</b> remitted to CCA</li>
          </ul>
          <p className="text-xs text-black/70 leading-relaxed mb-2">
            <b>Non-CCA orgs:</b> <code>service_fee_retained_cents = NULL</code> means full retention of the TPA fee.
          </p>
          <p className="text-xs text-black/60 italic">
            This split is for reporting only. The <code>tpa_fee_cents</code> value is what the enrollee is charged regardless.
          </p>
        </Card>
        <Card className="p-4 mt-3">
          <SubHead>Worked example for this org</SubHead>
          <div className="text-xs text-black/70 space-y-1">
            <div>Enrollee charged: <b>{formatCents(tpa)}</b> / mo</div>
            <div>Retained by Hollowtree: <b>{retained === null ? formatCents(tpa) + " (full)" : formatCents(retained)}</b></div>
            <div>Remitted to {cca ? "CCA" : "—"}: <b>{retained === null ? formatCents(0) : formatCents(tpa - retained)}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function WindowsTab({ windows, orgName, onNew, onEdit, canEdit, canCreate }: {
  windows: typeof DUMMY_WINDOWS; orgName: string; onNew: () => void; onEdit: (w: typeof DUMMY_WINDOWS[number]) => void; canEdit: boolean; canCreate: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-end mb-2">
        <Btn variant="primary" disabled={!canCreate} onClick={onNew}>+ New Window</Btn>
      </div>
      <TableShell>
        <THead cols={["Type", "Sponsor", "Start", "End", "Default Effective", "Status", "GI", "Carrier", "Notes"]} />
        <tbody>
          {windows.map((w) => {
            const isAlwaysOpen = w.window_type === "new_joiner";
            const sponsor = w.sponsor_type === "affiliate"
              ? <span><span className="text-black/40">—</span> <span className="text-[11px] text-black/50">(affiliate-sponsored: {w.affiliate})</span></span>
              : w.affiliate
                ? <span>{orgName} <span className="text-black/40">+</span> {w.affiliate}</span>
                : <span>{orgName}</span>;
            return (
              <TRow key={w.id} onClick={canEdit ? () => onEdit(w) : undefined}>
                <TCell className="capitalize font-medium">{w.window_type.replace("_", " ")}</TCell>
                <TCell>{sponsor}</TCell>
                <TCell>{isAlwaysOpen ? <span className="text-black/40 italic">Always Open</span> : w.start}</TCell>
                <TCell>{isAlwaysOpen ? <span className="text-black/40 italic">Always Open</span> : w.end}</TCell>
                <TCell>{w.effective}</TCell>
                <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
                <TCell>{w.gi_eligible ? <Pill tone="ok">GI</Pill> : <span className="text-black/30">—</span>}</TCell>
                <TCell>{w.carrier}</TCell>
                <TCell className="text-black/60">{w.notes}</TCell>
              </TRow>
            );
          })}
          {windows.length === 0 ? <TRow><TCell className="text-black/40">No enrollment windows.</TCell></TRow> : null}
        </tbody>
      </TableShell>
    </div>
  );
}

function BenefitClassesTab({ classes, onNew, onEdit, canEdit, canCreate }: {
  classes: typeof BENEFIT_CLASSES; onNew: () => void; onEdit: (c: typeof BENEFIT_CLASSES[number]) => void; canEdit: boolean; canCreate: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-end mb-2">
        <Btn variant="primary" disabled={!canCreate} onClick={onNew}>+ New Benefit Class</Btn>
      </div>
      <TableShell>
        <THead cols={["Name", "GI Offer", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Default"]} />
        <tbody>
          {classes.map((c) => {
            const bronzeAbsent = c.gi_offer_cents <= 5000000;
            return (
              <TRow key={c.id} onClick={canEdit ? () => onEdit(c) : undefined}>
                <TCell className="font-medium">{c.name}</TCell>
                <TCell>{formatCents(c.gi_offer_cents)}</TCell>
                <TCell>
                  {bronzeAbsent
                    ? <span className="text-black/30" title="Bronze tier absent because GI offer is $50K or below">—</span>
                    : formatCents(c.bronze)}
                </TCell>
                <TCell>{formatCents(c.silver)}</TCell>
                <TCell>{formatCents(c.gold)} <span className="text-[10px] text-black/40">(= GI)</span></TCell>
                <TCell>{formatCents(c.platinum)}</TCell>
                <TCell>{formatCents(c.diamond)}</TCell>
                <TCell>{c.is_default ? <Pill tone="ok">Default</Pill> : null}</TCell>
              </TRow>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}

function NewJoinerTab({ readOnly }: { readOnly: boolean }) {
  const [period, setPeriod] = useState(30);
  const [waiting, setWaiting] = useState(90);
  const [rule, setRule] = useState("first_of_next_month");
  return (
    <div className="mt-3 max-w-2xl">
      <Card className="p-4">
        <div className="grid grid-cols-[220px_1fr] gap-3 items-center">
          <div className="text-xs uppercase tracking-wider text-black/60">Enrollment Period (days)</div>
          <input type="number" defaultValue={period} disabled={readOnly} onChange={(e) => setPeriod(Number(e.target.value))} className="w-32 px-2 py-1 text-sm border border-black/15 rounded" />
          <div className="text-xs uppercase tracking-wider text-black/60">Waiting Period (days)</div>
          <input type="number" defaultValue={waiting} disabled={readOnly} onChange={(e) => setWaiting(Number(e.target.value))} className="w-32 px-2 py-1 text-sm border border-black/15 rounded" />
          <div className="text-xs uppercase tracking-wider text-black/60">Effective Date Rule</div>
          <select defaultValue={rule} disabled={readOnly} onChange={(e) => setRule(e.target.value)} className="w-64 px-2 py-1 text-sm border border-black/15 rounded bg-white">
            <option value="first_of_next_month">first_of_next_month</option>
            <option value="hire_date">hire_date</option>
            <option value="first_of_month_after_waiting">first_of_month_after_waiting</option>
          </select>
        </div>
      </Card>
      <Card className="p-3 mt-3 bg-[#f7f3eb] border-black/10">
        <div className="text-xs text-black/70">
          New hires get <b>{period}</b> days to enroll after completing a <b>{waiting}</b> day waiting period. Coverage effective date follows the <b>{rule}</b> rule.
        </div>
      </Card>
    </div>
  );
}
