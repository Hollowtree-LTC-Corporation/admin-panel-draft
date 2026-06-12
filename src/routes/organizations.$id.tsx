import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Field, Btn, Pill, TableShell, THead, TRow, TCell, SectionTitle, ProductBadge } from "@/components/wireframe/Bits";
import { ORGS, INDIVIDUALS, BENEFIT_CLASSES, ENROLLMENT_WINDOWS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/organizations/$id")({ component: OrgDetail });

function OrgDetail() {
  const { id } = Route.useParams();
  const { product } = useStore();
  const can = usePermission();
  const org = ORGS.find((o) => o.id === id);
  if (!org) return <div className="p-4">Org not found.</div>;
  const inds = INDIVIDUALS.filter((i) => i.org_id === id);
  const windows = ENROLLMENT_WINDOWS.filter((w) => w.org_id === id);
  const classes = BENEFIT_CLASSES.filter((b) => b.org_id === id);

  return (
    <div>
      <PageHeader
        title={org.name}
        subtitle={<><Link to="/organizations" className="hover:underline">Organizations</Link> · {org.id}</> as unknown as string}
        actions={<><ProductBadge product={org.product} /><Btn disabled={!can("organizations", "update")}>Edit</Btn></>}
      />

      <SectionTitle>Configuration</SectionTitle>
      <Card className="p-4 grid grid-cols-2 gap-x-6">
        <Field label="Situs State">{org.situs_state}</Field>
        <Field label="Owner Type">{org.policy_owner_type}</Field>
        <Field label="Pay Mode">monthly_ach</Field>
        <Field label="Contribution Type">{org.policy_owner_type === "employer" ? "employer_paid_tiered" : "individual_paid"}</Field>
        <Field label="Carrier">Northstar Mutual</Field>
        <Field label="Plan Details (JSONB)">
          <pre className="text-[11px] bg-[#f7f3eb] border border-black/10 rounded p-2 mt-1">{`{
  "elimination_period_days": 90,
  "benefit_period_months": 24,
  "ownership": "${org.policy_owner_type}"
}`}</pre>
        </Field>
      </Card>

      <SectionTitle>Fee Config</SectionTitle>
      <Card className="p-4 grid grid-cols-2 gap-x-6">
        <Field label="TPA Fee">$3.50 / enrollee / mo</Field>
        <Field label="Service Fee Retained (CCA)">$5.00 of $20 retained · $15 remitted</Field>
        <Field label="Worked Example">
          <span className="text-xs text-black/60">Per enrollee per cycle: $20.00 collected → $5.00 retained by Hollowtree → $15.00 remitted to CCA.</span>
        </Field>
      </Card>

      <SectionTitle>Enrollment Windows ({windows.length})</SectionTitle>
      <TableShell>
        <THead cols={["Type", "Start", "End", "Status", "Sponsor", "Carrier"]} />
        <tbody>
          {windows.map((w) => (
            <TRow key={w.id}>
              <TCell className="capitalize">{w.window_type}</TCell>
              <TCell>{w.start_date}</TCell>
              <TCell>{w.end_date}</TCell>
              <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
              <TCell>{w.sponsor_type}</TCell>
              <TCell>{w.carrier}</TCell>
            </TRow>
          ))}
          {windows.length === 0 ? (
            <TRow><TCell className="text-black/40">No windows configured.</TCell></TRow>
          ) : null}
        </tbody>
      </TableShell>

      {product === "LTC" ? (
        <>
          <SectionTitle>Benefit Classes (LTC)</SectionTitle>
          <TableShell>
            <THead cols={["Class", "GI Offer", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Default"]} />
            <tbody>
              {classes.map((c) => (
                <TRow key={c.id}>
                  <TCell className="font-medium">{c.name}</TCell>
                  <TCell>{formatCents(c.gi_offer_cents)}</TCell>
                  <TCell>{formatCents(c.bronze)}</TCell>
                  <TCell>{formatCents(c.silver)}</TCell>
                  <TCell>{formatCents(c.gold)}</TCell>
                  <TCell>{formatCents(c.platinum)}</TCell>
                  <TCell>{formatCents(c.diamond)}</TCell>
                  <TCell>{c.is_default ? <Pill tone="ok">default</Pill> : null}</TCell>
                </TRow>
              ))}
              {classes.length === 0 ? <TRow><TCell className="text-black/40">No benefit classes.</TCell></TRow> : null}
            </tbody>
          </TableShell>
        </>
      ) : null}

      <SectionTitle>Individuals ({inds.length})</SectionTitle>
      <TableShell>
        <THead cols={["Name", "Stage", "Plan", "Monthly Premium"]} />
        <tbody>
          {inds.slice(0, 10).map((i) => (
            <TRow key={i.id}>
              <TCell><Link to="/individuals/$id" params={{ id: i.id }} className="hover:underline font-medium">{i.full_name}</Link></TCell>
              <TCell><Pill>{i.stage}</Pill></TCell>
              <TCell>{i.plan}</TCell>
              <TCell>{formatCents(i.monthly_premium_cents)}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
