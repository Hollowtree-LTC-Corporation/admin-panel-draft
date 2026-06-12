import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, Card, SectionTitle, FilterBar } from "@/components/wireframe/Bits";
import {
  CHANNEL_PARTNERS, COMMISSION_SPLIT_DEFAULTS, POLICY_SPLITS, COMMISSION_STATEMENTS,
  CARRIER_COMMISSION_SCHEDULES, COMMISSION_RATE_TIERS, POLICIES, formatCents,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/commission")({ component: View });

function View() {
  const { product } = useStore();
  const can = usePermission();
  const splitTotal = POLICY_SPLITS.reduce((s, p) => s + p.pct, 0);
  const totalOk = splitTotal === 100;

  return (
    <div>
      <PageHeader title="Commission" subtitle={`${product} commission configuration · waterfall must sum to 100%`} />

      <SectionTitle>Channel Partners</SectionTitle>
      <div className="flex justify-end mb-2"><Btn variant="primary" disabled={!can("channel_partners", "create")}>+ New Channel Partner</Btn></div>
      <TableShell>
        <THead cols={["Name", "Type", "Default Split %", "Payment Method"]} />
        <tbody>
          {CHANNEL_PARTNERS.map((p) => (
            <TRow key={p.id}>
              <TCell className="font-medium">{p.name}</TCell>
              <TCell><Pill tone={p.partner_type === "House" ? "info" : p.partner_type === "Internal" ? "ok" : "neutral"}>{p.partner_type}</Pill></TCell>
              <TCell>{p.default_split_pct}%</TCell>
              <TCell className="capitalize">{p.payment_method.replace(/_/g, " ")}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Commission Split Defaults</SectionTitle>
      <TableShell>
        <THead cols={["Channel Partner", "Payee Type", "Default %", "Payment Method"]} />
        <tbody>
          {COMMISSION_SPLIT_DEFAULTS.map((d) => (
            <TRow key={d.id}>
              <TCell>{d.channel_partner_name}</TCell>
              <TCell className="capitalize">{d.payee_type.replace(/_/g, " ")}</TCell>
              <TCell>{d.default_split_pct}%</TCell>
              <TCell className="capitalize">{d.payment_method.replace(/_/g, " ")}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Per-Policy Splits — Policy pol_1 (Acme Widgets Co)</SectionTitle>
      <Card className="p-3">
        <table className="w-full text-xs">
          <THead cols={["Payee", "% Split"]} />
          <tbody>
            {POLICY_SPLITS.map((s) => (
              <TRow key={s.id}>
                <TCell>{s.channel_partner_name}</TCell>
                <TCell>{s.pct}%</TCell>
              </TRow>
            ))}
            <tr className={`border-t ${totalOk ? "bg-emerald-50" : "bg-rose-50"}`}>
              <TCell className="font-semibold">Total</TCell>
              <TCell className={`font-semibold ${totalOk ? "text-emerald-700" : "text-rose-700"}`}>{splitTotal}% {totalOk ? "✓" : "≠ 100"}</TCell>
            </tr>
          </tbody>
        </table>
      </Card>

      <SectionTitle>Commission Statements (read-only)</SectionTitle>
      <TableShell>
        <THead cols={["Payee", "Period", "Amount", "Payable"]} />
        <tbody>
          {COMMISSION_STATEMENTS.map((s) => (
            <TRow key={s.id}>
              <TCell className="font-medium">{s.payee}</TCell>
              <TCell>{s.period}</TCell>
              <TCell>{formatCents(s.amount_cents)}</TCell>
              <TCell>{s.payable ? <Pill tone="ok">payable</Pill> : <Pill tone="neutral">carrier_direct</Pill>}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      {product === "LTC" ? (
        <>
          <SectionTitle>Carrier Commission Schedules (LTC)</SectionTitle>
          <FilterBar />
          <TableShell>
            <THead cols={["Carrier Product", "State", "Tier Bands"]} />
            <tbody>
              {CARRIER_COMMISSION_SCHEDULES.map((s) => {
                const tiers = COMMISSION_RATE_TIERS.filter((t) => t.schedule_id === s.id);
                return (
                  <TRow key={s.id}>
                    <TCell className="font-medium">{s.carrier_product_name}</TCell>
                    <TCell>{s.state_code ?? "—"}</TCell>
                    <TCell>
                      <div className="flex flex-wrap gap-1">
                        {tiers.map((t) => (
                          <span key={t.id} className="px-1.5 py-0.5 rounded bg-[#f7f3eb] border border-black/10 text-[11px]">
                            Y{t.year_from}{t.year_to !== t.year_from ? `-${t.year_to}` : ""}: {t.pct}%
                          </span>
                        ))}
                      </div>
                    </TCell>
                  </TRow>
                );
              })}
            </tbody>
          </TableShell>
        </>
      ) : (
        <>
          <SectionTitle>Per-Policy Commission Rates (DI)</SectionTitle>
          <TableShell>
            <THead cols={["Policy", "Org", "Carrier Commission %", "Override %"]} />
            <tbody>
              {POLICIES.filter((p) => p.product === "DI").map((p) => (
                <TRow key={p.id}>
                  <TCell className="font-mono text-[11px]">{p.id}</TCell>
                  <TCell>{p.org_name}</TCell>
                  <TCell>{p.carrier_commission_pct}%</TCell>
                  <TCell>{p.override_pct}%</TCell>
                </TRow>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  );
}
