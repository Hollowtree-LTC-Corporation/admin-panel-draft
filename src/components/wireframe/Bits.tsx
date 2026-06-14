import * as React from "react";
import { useState, type ReactNode } from "react";
import { X } from "lucide-react";


export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <div className="text-xs text-black/50 mt-0.5">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}


export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-black/10 rounded-md ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="bg-white border border-black/10 rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-black/50">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-[11px] text-black/40 mt-1">{hint}</div> : null}
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "bad" | "info"; children: ReactNode }) {
  const toneClass = {
    neutral: "bg-black/5 text-black/70",
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-rose-100 text-rose-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${toneClass}`}>{children}</span>;
}

export function statusTone(status: string): "neutral" | "ok" | "warn" | "bad" | "info" {
  if (["active", "successful", "open", "accepted", "purchased", "resolved"].includes(status)) return "ok";
  if (["pending", "in_progress", "reviewing", "upcoming", "new"].includes(status)) return "info";
  if (["suspended", "failed", "rejected"].includes(status)) return "warn";
  if (["canceled", "lapsed", "expired", "closed"].includes(status)) return "bad";
  return "neutral";
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
};
export function Btn({ children, onClick, variant = "secondary", size = "sm", disabled, title }: BtnProps) {
  const base = "inline-flex items-center gap-1 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-3 py-1.5 text-sm" }[size];
  const variants = {
    primary: "bg-[#0a3d3e] text-white hover:bg-[#0a3d3e]/90",
    secondary: "bg-white border border-black/15 text-black/80 hover:bg-black/5",
    ghost: "text-black/70 hover:bg-black/5",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${sizes} ${variants}`}>
      {children}
    </button>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-black/10 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">{children}</table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-black/10 text-[11px] text-black/50">
        <div>Showing all rows (dummy data)</div>
        <div className="flex gap-2">
          <button className="px-2 py-0.5 border border-black/15 rounded">‹</button>
          <span>Page 1 of 1</span>
          <button className="px-2 py-0.5 border border-black/15 rounded">›</button>
        </div>
      </div>
    </div>
  );
}

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
      <tr>
        {cols.map((c) => (
          <th key={c} className="text-left font-medium px-3 py-2 cursor-pointer hover:bg-black/5">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

export function TRow({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={`border-t border-black/5 ${onClick ? "cursor-pointer hover:bg-[#f7f3eb]/60" : ""}`}>
      {children}
    </tr>
  );
}

export function TCell({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return <td onClick={onClick} className={`px-3 py-2 ${className}`}>{children}</td>;
}


export function FilterBar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <input
        type="text"
        placeholder="Filter…"
        className="px-2 py-1 text-xs border border-black/15 rounded bg-white w-64"
      />
      {children}
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/10">
          <div className="font-medium text-sm">{title}</div>
          <button onClick={onClose} className="text-black/50 hover:text-black"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">{children}</div>
      </div>
    </div>
  );
}

export function useDrawer<T = unknown>() {
  const [state, setState] = useState<{ open: boolean; data?: T; mode?: string }>({ open: false });
  return {
    state,
    open: (data?: T, mode?: string) => setState({ open: true, data, mode }),
    close: () => setState({ open: false }),
  };
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Input({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return <input defaultValue={defaultValue} placeholder={placeholder} className="w-full px-2 py-1 text-sm border border-black/15 rounded" />;
}

export function ProductBadge({ product }: { product: string }) {
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${product === "DI" ? "bg-[#0a3d3e] text-white" : "bg-[#d4b87a] text-[#0a3d3e]"}`}>{product}</span>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold text-black/80 mt-6 mb-2">{children}</h2>;
}
