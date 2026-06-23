import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft, FileText, CalendarClock, CheckCircle2 } from "lucide-react";
import { PageHeader, Btn, TableShell, THead, TRow, TCell, Pill } from "@/components/wireframe/Bits";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";
import { useStore } from "@/lib/wireframe/store";
import { ORGS } from "@/lib/wireframe/data";
import { findReport, buildPreview, CATEGORY_LABEL } from "@/lib/wireframe/reports";
import { CarrierRemittanceReport, MonthlyBalancesReport } from "@/components/wireframe/CustomReports";

export const Route = createFileRoute("/reports/$slug")({
  component: View,
  notFoundComponent: () => (
    <div>
      <PageHeader title="Report not found" />
      <Link to="/reports" className="text-xs text-[#0a3d3e] underline">Back to Reports</Link>
    </div>
  ),
});

function View() {
  const { slug } = Route.useParams();
  const { product, role } = useStore();
  const report = findReport(slug);
  if (!report) throw notFound();

  // Admin-only gating
  if (report.adminOnly && role !== "admin") {
    return (
      <div>
        <PageHeader title={report.title} />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          This report is restricted to admins.
        </div>
      </div>
    );
  }
  // Product gating: redirect-like notice
  if (report.productOnly && report.productOnly !== product) {
    return (
      <div>
        <PageHeader title={report.title} />
        <div className="bg-sky-50 border border-sky-200 rounded p-4 text-sm text-sky-900">
          This report is only available when the {report.productOnly} product toggle is active.
        </div>
      </div>
    );
  }

  const [startMonth, setStartMonth] = useState("2025-01");
  const [endMonth, setEndMonth] = useState("2025-06");
  const [orgFilter, setOrgFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("active");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [payeeFilter, setPayeeFilter] = useState("all");
  const [stageDays, setStageDays] = useState(14);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const preview = useMemo(() => buildPreview(slug, product), [slug, product]);

  const canExport = role !== "read-only";
  const canSchedule = role === "admin";
  const canMarkSubmitted = role !== "read-only" && report.carrierAction;

  const handleExport = (type: "CSV" | "PDF") => toast.success(`${type} export started`, { description: `${report.title} preview` });
  const handleMarkSubmitted = () => toast.success("Submission marked", { description: "Carrier handoff recorded for selected individuals." });

  return (
    <div>
      <div className="mb-2">
        <Link to="/reports" className="inline-flex items-center gap-1 text-[11px] text-black/50 hover:text-[#0a3d3e]">
          <ChevronLeft className="h-3 w-3" /> All reports
        </Link>
      </div>
      <PageHeader
        title={report.title}
        subtitle={
          <span>
            <span className="text-black/60">{CATEGORY_LABEL[report.category]}</span> · {report.description}
          </span>
        }
      />

      {/* Parameter form */}
      <div className="bg-white border border-black/10 rounded-md p-3 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Parameters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Start Month">
            <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
          </Field>
          <Field label="End Month">
            <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
          </Field>
          <Field label="Organization">
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
              <option value="all">All organizations</option>
              {ORGS.filter((o) => o.product === product).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          {report.category === "enrollment" || report.category === "financial" ? (
            <Field label="Coverage Status">
              <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="purchased">Purchased</option>
                <option value="in_progress">In Progress</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
          ) : null}
          {report.extraParams?.includes("carrier") ? (
            <Field label="Carrier">
              <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
                <option value="all">All carriers</option>
                <option value="northstar">Northstar Mutual</option>
                <option value="heritage">Heritage LTC Group</option>
                <option value="sequoia">Sequoia Care Partners</option>
              </select>
            </Field>
          ) : null}
          {report.extraParams?.includes("payee") ? (
            <Field label="Payee">
              <select value={payeeFilter} onChange={(e) => setPayeeFilter(e.target.value)} className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
                <option value="all">All payees</option>
                <option value="wtc">WTC Benefits</option>
                <option value="westfield">Westfield Brokers</option>
                <option value="house">Hollowtree House</option>
                <option value="gallagher">Gallagher</option>
              </select>
            </Field>
          ) : null}
          {report.extraParams?.includes("stage_threshold") ? (
            <Field label="Days stuck (min)">
              <input type="number" value={stageDays} min={1} onChange={(e) => setStageDays(Number(e.target.value))} className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
            </Field>
          ) : null}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-2 relative">
        <div className="text-[11px] text-black/50">Preview · first {preview.rows.length} rows</div>
        <div className="ml-auto flex items-center gap-2">
          {canMarkSubmitted ? (
            <Btn variant="primary" onClick={handleMarkSubmitted}>
              <CheckCircle2 className="h-3 w-3" /> Mark as Submitted
            </Btn>
          ) : null}
          <ExportCsvButton filteredCount={preview.rows.length} totalCount={preview.rows.length} resourceLabel="report rows" adminOnly={report.adminOnly} />
          <Btn onClick={() => handleExport("PDF")} disabled={!canExport}>
            <FileText className="h-3 w-3" /> Export PDF
          </Btn>
          {canSchedule ? (
            <Btn onClick={() => setScheduleOpen((s) => !s)}>
              <CalendarClock className="h-3 w-3" /> Schedule
            </Btn>
          ) : null}
          {scheduleOpen ? <SchedulePopover onSave={() => { setScheduleOpen(false); toast.success("Schedule saved"); }} onClose={() => setScheduleOpen(false)} /> : null}
        </div>
      </div>

      {/* Preview table */}
      <div className={preview.monthlyPivot ? "overflow-x-auto" : ""}>
        <TableShell>
          <THead cols={preview.columns.map((c) => c.label)} />
          <tbody>
            {preview.rows.map((row, i) => (
              <TRow key={i}>
                {preview.columns.map((c) => (
                  <TCell key={c.key} className={c.key === "issue" || c.key === "anomaly" || c.key === "tier" || c.key === "indicator" ? "" : "text-black/80"}>
                    {c.key === "tier" || c.key === "issue" || c.key === "anomaly" || c.key === "indicator" ? (
                      row[c.key] ? <Pill tone={toneFor(String(row[c.key]))}>{String(row[c.key])}</Pill> : ""
                    ) : c.key === "payable" ? (
                      <Pill tone={row[c.key] === "Yes" ? "ok" : "warn"}>{String(row[c.key])}</Pill>
                    ) : (
                      String(row[c.key] ?? "")
                    )}
                  </TCell>
                ))}
              </TRow>
            ))}
            {preview.rows.length === 0 ? (
              <TRow>
                <TCell className="text-black/40 italic">No rows match the current parameters.</TCell>
              </TRow>
            ) : null}
          </tbody>
        </TableShell>
      </div>

      <div className="mt-3 text-[11px] text-black/40 italic">
        Report data is illustrative. Production reports query live Supabase data with role-based row filtering.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">{label}</div>
      {children}
    </div>
  );
}

function toneFor(s: string): "ok" | "warn" | "bad" | "info" | "neutral" {
  const v = s.toLowerCase();
  if (v.includes("suspension")) return "bad";
  if (v.includes("penalty")) return "warn";
  if (v.includes("grace")) return "info";
  if (v.includes("closing")) return "warn";
  if (v.includes("recently closed")) return "neutral";
  if (v.includes("not sum")) return "bad";
  if (v.includes("override")) return "warn";
  if (v.includes("mixed") || v.includes("orphan") || v.includes("without")) return "warn";
  return "neutral";
}

function SchedulePopover({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-8 z-30 w-72 bg-white border border-black/15 rounded-md shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold">Schedule delivery</div>
        <button onClick={onClose} className="text-[10px] text-black/40 hover:text-black">close</button>
      </div>
      <Field label="Frequency">
        <select className="w-full px-2 py-1 text-xs border border-black/15 rounded bg-white">
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Quarterly</option>
        </select>
      </Field>
      <Field label="Email recipients">
        <input type="text" placeholder="ops@hollowtree.example, …" className="w-full px-2 py-1 text-xs border border-black/15 rounded" />
      </Field>
      <div className="flex justify-end">
        <Btn variant="primary" onClick={onSave}>Save Schedule</Btn>
      </div>
    </div>
  );
}
