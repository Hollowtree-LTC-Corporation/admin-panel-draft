import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/wireframe/store";
import type { Product, Role } from "@/lib/wireframe/data";
import logoAsset from "@/assets/hollowtree-logo.png.asset.json";
import {
  LayoutDashboard, Building2, Users, CalendarRange, Wallet, Receipt,
  Scale, Calculator, HandCoins, Briefcase, FileText, KeyRound, ShieldAlert,
  ListTodo, Layers, FileBarChart, Handshake,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; product?: Product };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "OPERATIONS",
    items: [
      { to: "/organizations", label: "Organizations", icon: Building2 },
      { to: "/individuals", label: "Individuals", icon: Users },
      { to: "/enrollment-windows", label: "Enrollment Windows", icon: CalendarRange },
      { to: "/enrollment-responses", label: "Enrollment Responses", icon: Layers, product: "LTC" },
      { to: "/policies", label: "Policies", icon: FileText },
    ],
  },
  {
    label: "FINANCIAL",
    items: [
      { to: "/payment-ledger", label: "Payment Ledger", icon: Receipt },
      { to: "/account-adjustments", label: "Account Adjustments", icon: Scale },
      { to: "/enrollee-balance", label: "Enrollee Balance", icon: Calculator },
      { to: "/billing-groups", label: "Billing Groups", icon: Wallet },
      { to: "/commission", label: "Commission", icon: HandCoins },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { to: "/carriers", label: "Carriers & Products", icon: Briefcase },
      { to: "/affiliates", label: "Affiliates", icon: Handshake },
      { to: "/rate-config", label: "Rate Config", icon: FileBarChart, product: "DI" },
      { to: "/rate-cells", label: "Rate Cells", icon: FileBarChart, product: "LTC" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { to: "/missing-submissions", label: "Missing Submissions", icon: ListTodo, product: "DI" },
      { to: "/tokens", label: "Magic Tokens", icon: KeyRound },
      { to: "/audit", label: "Audit Logs", icon: ShieldAlert },
    ],
  },
];

export function Shell() {
  const { product, setProduct, role, setRole } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((n) => !n.product || n.product === product),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen flex bg-[#f7f3eb] text-[#1a2424]">
      <aside className="w-56 shrink-0 bg-[#0a3d3e] text-white flex flex-col">
        <div className="px-3 py-3 border-b border-white/10">
          <img src={logoAsset.url} alt="Hollowtree" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.label ?? `group-${groupIdx}`} className={groupIdx > 0 ? "mt-3" : ""}>
              {group.label ? (
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-white/40 font-medium select-none">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-4 py-1.5 text-[13px] hover:bg-white/5 ${
                      active ? "bg-white/10 border-l-2 border-[#d4b87a]" : "border-l-2 border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-70" />
                    <span>{item.label}</span>
                    {item.product ? (
                      <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-white/10">{item.product}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="px-4 py-2 text-[10px] text-white/40 border-t border-white/10">
          Throwaway prototype · No backend
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white border-b border-black/10 flex items-center px-4 gap-4">
          <div className="text-sm font-medium">Hollowtree</div>
          <div className="inline-flex rounded-md border border-black/15 overflow-hidden text-xs">
            {(["DI", "LTC"] as Product[]).map((p) => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={`px-3 py-1 ${product === p ? "bg-[#0a3d3e] text-white" : "bg-white text-[#0a3d3e] hover:bg-black/5"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Global search (orgs, individuals, policies)…"
            className="flex-1 max-w-md px-2 py-1 text-xs border border-black/15 rounded bg-[#f7f3eb]"
          />
          <div className="ml-auto flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <span className="text-black/50">Role:</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="border border-black/15 rounded px-1 py-0.5 bg-white"
              >
                <option value="admin">admin</option>
                <option value="ops">ops</option>
                <option value="read-only">read-only</option>
              </select>
            </label>
            <div className="px-2 py-1 rounded bg-[#f7f3eb] border border-black/10">
              Signed in as <span className="font-medium">Guy</span> ({role})
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
