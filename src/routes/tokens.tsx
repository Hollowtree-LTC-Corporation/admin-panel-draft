import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Pill, Btn, FilterBar } from "@/components/wireframe/Bits";
import { MAGIC_TOKENS, TOKEN_AUDIT_LOG } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/tokens")({ component: View });

function View() {
  const { role } = useStore();
  const can = usePermission();

  if (role !== "admin") {
    return (
      <div>
        <PageHeader title="Magic Tokens" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Magic tokens are admin-only. Switch the role to <span className="font-mono">admin</span> in the top bar to view.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Magic Tokens" subtitle="View & revoke only · no create / edit · admin-only" />
      <FilterBar />
      <TableShell>
        <THead cols={["Individual", "Class", "Status", "Expires", "Uses", "Last Used", ""]} />
        <tbody>
          {MAGIC_TOKENS.map((t) => (
            <TRow key={t.id}>
              <TCell className="font-medium">{t.individual_name}</TCell>
              <TCell><Pill tone="info">{t.token_class}</Pill></TCell>
              <TCell><Pill tone={t.status === "active" ? "ok" : "bad"}>{t.status}</Pill></TCell>
              <TCell className="font-mono text-[11px]">{t.expires_at}</TCell>
              <TCell>{t.use_count}</TCell>
              <TCell className="font-mono text-[11px]">{t.last_used_at ?? "—"}</TCell>
              <TCell>
                <Btn variant="danger" disabled={!can("magic_tokens", "revoke") || t.status !== "active"}>Revoke</Btn>
              </TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <div className="mt-6">
        <PageHeader title="Token Audit Log" subtitle="Append-only validation attempts" />
        <TableShell>
          <THead cols={["Timestamp", "Hashed Token", "IP", "User Agent", "Result"]} />
          <tbody>
            {TOKEN_AUDIT_LOG.map((l) => (
              <TRow key={l.id}>
                <TCell className="font-mono text-[11px]">{l.ts}</TCell>
                <TCell className="font-mono text-[11px]">{l.token_hash}</TCell>
                <TCell className="font-mono text-[11px]">{l.ip}</TCell>
                <TCell className="text-black/60">{l.user_agent}</TCell>
                <TCell><Pill tone={l.result === "accepted" ? "ok" : "bad"}>{l.result}</Pill></TCell>
              </TRow>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
