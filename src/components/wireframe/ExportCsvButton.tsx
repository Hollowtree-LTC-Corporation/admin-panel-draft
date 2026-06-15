import { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/wireframe/store";

/**
 * Universal "Export CSV" button rendered in list/table toolbars.
 *
 * Behavior:
 *  - read-only role: disabled with tooltip.
 *  - ops role: hidden on admin-only tables (audit_log, token_audit_log).
 *  - admin role: enabled everywhere.
 *  - Click runs a 500ms spinner → 1s checkmark; surfaces filter-aware toasts.
 *  - "Exports are logged to audit trail" is shown as the toast description
 *    (in production this writes to audit_log).
 *  - When totalCount > 50, a row-cap notice previews the production 10k cap.
 *
 * The button auto-aligns to the right end of a `FilterRow` via `ml-auto`.
 */
export function ExportCsvButton({
  filteredCount,
  totalCount,
  adminOnly = false,
  resourceLabel = "rows",
}: {
  filteredCount: number;
  totalCount: number;
  adminOnly?: boolean;
  resourceLabel?: string;
}) {
  const { role } = useStore();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  // ops users do not see the export on admin-only surfaces at all
  if (role === "ops" && adminOnly) return null;

  const isReadOnly = role === "read-only";
  const disabled = isReadOnly || state !== "idle";
  const tooltip = isReadOnly
    ? "Export requires ops or admin role"
    : "Export the current view to CSV";

  function downloadPlaceholder() {
    const blob = new Blob([`# placeholder export\n# ${resourceLabel}\n`], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resourceLabel.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handle() {
    if (disabled) return;
    setState("loading");

    const isFiltered = filteredCount !== totalCount;
    const isCapped = totalCount > 50;

    const startMsg = isCapped
      ? `Exporting first 10,000 ${resourceLabel}. For larger exports, contact admin.`
      : isFiltered
        ? `Exporting ${filteredCount} of ${totalCount} ${resourceLabel} to CSV…`
        : `Exporting ${filteredCount} ${resourceLabel} to CSV…`;

    toast(startMsg, { description: "Exports are logged to audit trail" });

    window.setTimeout(() => {
      setState("done");
      window.setTimeout(() => {
        setState("idle");
        toast.success(`Export complete. ${filteredCount} ${resourceLabel} exported.`, {
          description: "Exports are logged to audit trail",
          action: { label: "Download", onClick: downloadPlaceholder },
        });
      }, 1000);
    }, 500);
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      title={tooltip}
      className="ml-auto inline-flex items-center gap-1 rounded font-medium px-2 py-1 text-xs bg-white border border-black/15 text-black/80 hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-3 w-3 text-emerald-600" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      Export CSV
    </button>
  );
}
