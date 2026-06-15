import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3, Users, HandCoins, Send, ShieldCheck, Activity,
} from "lucide-react";
import { PageHeader } from "@/components/wireframe/Bits";
import { useStore } from "@/lib/wireframe/store";
import { REPORTS, CATEGORY_LABEL, type ReportCategory } from "@/lib/wireframe/reports";

export const Route = createFileRoute("/reports/")({ component: View });

const CATEGORY_ICON: Record<ReportCategory, typeof BarChart3> = {
  financial: BarChart3,
  enrollment: Users,
  commission: HandCoins,
  carrier_handoff: Send,
  compliance: ShieldCheck,
  operational: Activity,
};

const CATEGORY_ORDER: ReportCategory[] = [
  "financial", "enrollment", "commission", "carrier_handoff", "compliance", "operational",
];

function View() {
  const { product, role } = useStore();

  const visible = REPORTS.filter((r) => {
    if (r.productOnly && r.productOnly !== product) return false;
    if (r.adminOnly && role !== "admin") return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Catalog of operational, financial, and compliance reports. Click a card to configure and preview."
      />

      {CATEGORY_ORDER.map((cat) => {
        const items = visible.filter((r) => r.category === cat);
        if (items.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <section key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-[#0a3d3e]" />
              <h2 className="text-sm font-semibold text-black/80">{CATEGORY_LABEL[cat]}</h2>
              <span className="text-[10px] text-black/40">{items.length} reports</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((r) => (
                <Link
                  key={r.slug}
                  to="/reports/$slug"
                  params={{ slug: r.slug }}
                  className="bg-white border border-black/10 rounded-md p-3 hover:border-[#0a3d3e]/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-[#0a3d3e]/70 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="text-sm font-medium text-black/90">{r.title}</div>
                        {r.productOnly ? (
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${r.productOnly === "DI" ? "bg-[#0a3d3e] text-white" : "bg-[#d4b87a] text-[#0a3d3e]"}`}>{r.productOnly}</span>
                        ) : null}
                        {r.adminOnly ? <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">admin</span> : null}
                        {r.scheduled ? <span className="text-[9px] px-1 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">scheduled</span> : null}
                      </div>
                      <div className="text-[11px] text-black/55 mt-1 leading-snug">{r.description}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
