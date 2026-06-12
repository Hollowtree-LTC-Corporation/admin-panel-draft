import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, FilterBar } from "@/components/wireframe/Bits";
import { ENROLLMENT_RESPONSES_LTC } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/enrollment-responses")({ component: View });

function View() {
  const { product } = useStore();
  if (product !== "LTC") {
    return (
      <div>
        <PageHeader title="Enrollment Responses" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Enrollment Responses is LTC-only.
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Enrollment Responses (LTC)" subtitle="Read-only health & demographic questionnaire responses" />
      <FilterBar />
      <TableShell>
        <THead cols={["Individual", "Question", "Answer", "Submitted"]} />
        <tbody>
          {ENROLLMENT_RESPONSES_LTC.map((r) => (
            <TRow key={r.id}>
              <TCell className="font-medium">{r.individual_name}</TCell>
              <TCell>{r.question}</TCell>
              <TCell>{r.answer}</TCell>
              <TCell className="font-mono text-[11px]">{r.submitted_at}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
