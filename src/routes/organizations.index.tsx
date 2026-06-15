import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn, Drawer, useDrawer, Field, Input } from "@/components/wireframe/Bits";
import { ORGS, POLICIES, CARRIER_PRODUCTS, CARRIERS } from "@/lib/wireframe/data";
import { INDIVIDUALS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort, US_STATE_OPTIONS } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/organizations/")({ component: OrgsView });

type SortKey = "name" | "carrier" | "situs_state" | "status" | "individuals_count" | "window" | "payment_health" | "policy_owner_type";

// Derive carrier via the org's policy (prefer active). Per v13 schema the
// carrier link lives on POLICIES.carrier_product_id, not on the org row.
function carrierForOrg(orgId: string): string | null {
  const orgPolicies = POLICIES.filter((p) => p.org_id === orgId);
  if (orgPolicies.length === 0) return null;
  const pol = orgPolicies.find((p) => p.status === "active") ?? orgPolicies[0];
  const cp = CARRIER_PRODUCTS.find((c) => c.id === pol.carrier_product_id);
  if (!cp) return null;
  const car = CARRIERS.find((c) => c.id === cp.carrier_id);
  return car?.carrier_name ?? null;
}

const ACRONYMS = new Set(["cca", "di", "ltc", "std", "ltd"]);
function formatOwnerType(v: string): string {
  return v
    .split("_")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

// Per spec: one closing, one closed, one none, rest open.
function windowStatusFor(orgId: string): { label: string; tone: "ok" | "warn" | "bad" | "neutral"; variant: "filled" | "outline" } {
  if (orgId === "org_6") return { label: "Closing in 5 days", tone: "warn", variant: "filled" };
  if (orgId === "org_4") return { label: "Closed", tone: "neutral", variant: "filled" };
  if (orgId === "org_9") return { label: "None", tone: "neutral", variant: "outline" };
  return { label: "Open", tone: "ok", variant: "filled" };
}

// Wireframe-only payment-health overrides (demo orgs that should read "All current").
const ALL_CURRENT_OVERRIDE = new Set(["org_7", "org_8"]);


function OrgsView() {
  const { product } = useStore();
  const can = usePermission();
  const navigate = useNavigate();
  const d = useDrawer<typeof ORGS[number]>();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [situs, setSitus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const sort = useSort<SortKey>("name", "asc");

  const productRows = ORGS.filter((o) => o.product === product);

  const enriched = useMemo(() => productRows.map((o) => {
    const orgInds = INDIVIDUALS.filter((i) => i.org_id === o.id);
    const failed = ALL_CURRENT_OVERRIDE.has(o.id) ? 0 : orgInds.filter((i) => i.last_payment_status === "Failed").length;
    return {
      ...o,
      carrier: carrierForOrg(o.id),
      failed,
      window: windowStatusFor(o.id),
    };
  }), [productRows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = enriched.filter((o) => {
      if (s && !o.name.toLowerCase().includes(s)) return false;
      if (status !== "all" && o.status !== status) return false;
      if (situs !== "all" && o.situs_state !== situs) return false;
      if (owner !== "all" && o.policy_owner_type !== owner) return false;
      return true;
    });
    const sortable = rows.map((r) => ({
      ...r,
      carrier_sort: r.carrier ?? "\uffff", // nulls last
      window_sort: r.window.label,
      payment_health: r.failed,
    }));
    return sort.applySort(sortable, (r, k) => {
      if (k === "carrier") return r.carrier_sort;
      if (k === "window") return r.window_sort;
      if (k === "payment_health") return r.failed;
      return (r as unknown as Record<string, string | number>)[k] as string | number;
    });
  }, [enriched, search, status, situs, owner, sort]);

  const active = search !== "" || status !== "all" || situs !== "all" || owner !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setStatus("all"); setSitus("all"); setOwner("all"); sort.reset(); };

  const subtitle = filtered.length === productRows.length
    ? `${productRows.length} orgs in ${product}`
    : `${filtered.length} of ${productRows.length} orgs in ${product}`;

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle={subtitle}
        actions={<Btn variant="primary" disabled={!can("organizations", "create")} onClick={() => d.open(undefined, "create")}>+ New Organization</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search name or domain…" />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[
          { value: "not_started", label: "not_started" },
          { value: "onboarding", label: "onboarding" },
          { value: "active", label: "active" },
          { value: "closed", label: "closed" },
          { value: "suspended", label: "suspended" },
        ]} />
        <FilterCombobox value={situs} onChange={setSitus} placeholder="All states" options={US_STATE_OPTIONS()} />
        <FilterSelect value={owner} onChange={setOwner} allLabel="All owner types" options={[
          { value: "employer_group", label: "Employer Group" },
          { value: "individual", label: "Individual" },
          { value: "cca", label: "CCA" },
        ]} />
        <ClearFiltersLink show={active} onClick={clearAll} />
        <ExportCsvButton filteredCount={filtered.length} totalCount={productRows.length} resourceLabel="organizations" />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Name" },
            { key: "carrier", label: "Carrier" },
            { key: "situs_state", label: "Situs" },
            { key: "status", label: "Status" },
            { key: "individuals_count", label: "# Individuals" },
            { key: "window", label: "Window" },
            { key: "payment_health", label: "Payment Health" },
            { key: "policy_owner_type", label: "Owner Type" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {filtered.map((o) => {
            const healthTone: "ok" | "warn" | "bad" = o.failed >= 3 ? "bad" : o.failed >= 1 ? "warn" : "ok";
            const healthLabel = o.failed === 0 ? "All current" : `${o.failed} failed`;
            return (
              <TRow key={o.id} onClick={() => navigate({ to: "/organizations/$id", params: { id: o.id } })}>
                <TCell className="font-medium">{o.name}</TCell>
                <TCell>
                  {o.carrier
                    ? <span>{o.carrier}</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-black/50">Not set</span>}
                </TCell>
                <TCell>{o.situs_state}</TCell>
                <TCell><Pill tone={o.status === "active" ? "ok" : o.status === "closed" || o.status === "suspended" ? "bad" : "info"}>{o.status}</Pill></TCell>
                <TCell>{o.individuals_count}</TCell>
                <TCell>
                  {o.window.variant === "outline"
                    ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border border-black/20 text-black/50">{o.window.label}</span>
                    : <Pill tone={o.window.tone}>{o.window.label}</Pill>}
                </TCell>
                <TCell><Pill tone={healthTone}>{healthLabel}</Pill></TCell>
                <TCell>{formatOwnerType(o.policy_owner_type)}</TCell>
              </TRow>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-black/40 text-xs">No organizations match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>

      <Drawer open={d.state.open} onClose={d.close} title="New Organization">
        <div className="mb-3 text-[10px] uppercase tracking-wider text-black/50">
          Product: <span className="text-black/80 font-semibold">{product}</span>
        </div>
        <Field label="Name"><Input placeholder="Organization name" /></Field>
        <Field label="Situs State"><Input placeholder="TX" /></Field>
        <Field label="Situs City"><Input placeholder="Austin" /></Field>
        <Field label="Policy Owner Type">
          <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" defaultValue="employer_group">
            <option value="employer_group">Employer Group</option>
            <option value="cca">CCA</option>
            <option value="individual">Individual</option>
          </select>
        </Field>
        <Field label="Domain"><Input placeholder="acme.com" /></Field>
        <Field label="Eligible Lives">
          <input type="number" min={0} placeholder="50" className="w-full px-2 py-1 text-sm border border-black/15 rounded" />
        </Field>
        <Field label="Contribution Type">
          <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" defaultValue="voluntary">
            <option value="voluntary">Voluntary</option>
            <option value="buy_up">Buy-Up</option>
            <option value="employer_paid">Employer Paid</option>
          </select>
        </Field>
        {product === "DI" && (
          <Field label="DI Healthcare Type">
            <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" defaultValue="general">
              <option value="mso">MSO</option>
              <option value="healthcare_practice">Healthcare Practice</option>
              <option value="medical_group">Medical Group</option>
              <option value="dental">Dental</option>
              <option value="other">Other</option>
              <option value="general">General</option>
            </select>
          </Field>
        )}
        <Field label="Pay Mode">
          <select className="w-full px-2 py-1 text-sm border border-black/15 rounded bg-white" defaultValue="monthly">
            <option value="monthly">Monthly</option>
            <option value="10_pay">10-Pay</option>
          </select>
        </Field>
        <div className="flex gap-2 mt-4">
          <Btn variant="primary" disabled={!can("organizations", "create")}>Save</Btn>
          <Btn onClick={d.close}>Cancel</Btn>
        </div>
      </Drawer>
    </div>
  );
}
