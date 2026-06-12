import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Field, Btn, Pill, SectionTitle, ProductBadge } from "@/components/wireframe/Bits";
import { INDIVIDUALS, formatCents } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/individuals/$id")({ component: IndividualDetail });

function IndividualDetail() {
  const { id } = Route.useParams();
  const { product } = useStore();
  const can = usePermission();
  const i = INDIVIDUALS.find((x) => x.id === id);
  if (!i) return <div className="p-4">Individual not found.</div>;
  const linked = i.linked_individual_id ? INDIVIDUALS.find((x) => x.id === i.linked_individual_id) : null;

  return (
    <div>
      <PageHeader
        title={i.full_name}
        subtitle={`${i.email} · ${i.org_name}`}
        actions={<><ProductBadge product={i.product} /><Btn disabled={!can("individuals", "update")}>Edit</Btn><Btn disabled={!can("individuals", "delete")} title={!can("individuals", "delete") ? "Requires permission" : ""}>Deactivate</Btn></>}
      />

      <SectionTitle>Identity</SectionTitle>
      <Card className="p-4 grid grid-cols-3 gap-x-6">
        <Field label="Full Name">{i.full_name}</Field>
        <Field label="Email">{i.email}</Field>
        <Field label="Phone">{i.phone}</Field>
        <Field label="Stage"><Pill>{i.stage}</Pill></Field>
        <Field label="Coverage"><Pill tone={i.coverage_status === "active" ? "ok" : "neutral"}>{i.coverage_status}</Pill></Field>
        <Field label="Org"><Link to="/organizations/$id" params={{ id: i.org_id }} className="hover:underline">{i.org_name}</Link></Field>
      </Card>

      <SectionTitle>Coverage ({product})</SectionTitle>
      <Card className="p-4 grid grid-cols-3 gap-x-6">
        {product === "DI" ? (
          <>
            <Field label="Coverage Plan">{i.coverage_plan}</Field>
            <Field label="Monthly Benefit">{formatCents(i.monthly_benefit_cents)}</Field>
            <Field label="Weekly Covered Benefit">{formatCents(i.weekly_covered_benefit_cents)}</Field>
            <Field label="Assigned Rep">{i.assigned_rep}</Field>
            <Field label="Title">{i.title}</Field>
            <Field label="Greeting">{i.greeting}</Field>
          </>
        ) : (
          <>
            <Field label="Purchased Plan">{i.purchased_plan}</Field>
            <Field label="Employee Face Amount">{formatCents(i.employee_face_amount_cents)}</Field>
            <Field label="Upgrade Applied For">{i.upgrade_applied_for ? "Yes" : "No"}</Field>
            <Field label="Interested Upgrading">{i.interested_upgrading ? "Yes" : "No"}</Field>
            <Field label="Interested Spousal">{i.interested_spousal ? "Yes" : "No"}</Field>
            <Field label="Relationship">
              {i.relationship_type}
              {linked ? <> · <Link to="/individuals/$id" params={{ id: linked.id }} className="hover:underline">{linked.full_name}</Link></> : null}
            </Field>
          </>
        )}
      </Card>

      <SectionTitle>Employer Contribution</SectionTitle>
      <Card className="p-4 grid grid-cols-4 gap-x-6">
        <Field label="Tier">{i.contribution_tier}</Field>
        <Field label="Duration (months)">{i.contribution_duration_months}</Field>
        <Field label="Active">{i.contribution_active ? <Pill tone="ok">active</Pill> : <Pill tone="bad">inactive</Pill>}</Field>
        <Field label="Billing Group"><Link to="/billing-groups" className="hover:underline">{i.billing_group_id}</Link></Field>
      </Card>

      <SectionTitle>Affiliations</SectionTitle>
      <Card className="p-4">
        <ul className="text-sm">
          <li>· {product === "DI" ? "CCA: Coastal Carriers Association" : "Trust: Foxtail Education Trust"}</li>
        </ul>
      </Card>
    </div>
  );
}
