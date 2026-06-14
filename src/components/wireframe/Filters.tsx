import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const filterInputClass =
  "px-2 py-1 text-xs border border-black/15 rounded bg-white";

export function FilterSearch({
  value,
  onChange,
  placeholder = "Search…",
  width = "w-56",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${filterInputClass} ${width}`}
    />
  );
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: { value: T; label?: string }[];
  allLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | "all")}
      className={filterInputClass}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label ?? o.value}
        </option>
      ))}
    </select>
  );
}

export function FilterDate({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={filterInputClass}
    />
  );
}

export function FilterCombobox({
  value,
  onChange,
  options,
  placeholder = "All",
  width = "w-44",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={ref} className={`relative ${width}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${filterInputClass} w-full flex items-center justify-between text-left`}
      >
        <span className={selected ? "" : "text-black/50"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-3 w-3 text-black/40" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-black/15 rounded shadow-lg max-h-64 overflow-hidden flex flex-col">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search…"
            className="px-2 py-1 text-xs border-b border-black/10 focus:outline-none"
          />
          <div className="overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
                setQuery("");
              }}
              className={`w-full text-left px-2 py-1 text-xs hover:bg-[#f7f3eb] ${
                value === "all" ? "bg-[#f7f3eb] font-medium" : ""
              }`}
            >
              {placeholder}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-2 py-1 text-xs hover:bg-[#f7f3eb] ${
                  value === o.value ? "bg-[#f7f3eb] font-medium" : ""
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-[11px] text-black/40">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ClearFiltersLink({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-[#0a3d3e] underline hover:no-underline ml-1"
    >
      Clear filters
    </button>
  );
}

export type SortDir = "asc" | "desc" | null;

export function useSort<K extends string>(defaultKey: K, defaultDir: SortDir = "asc") {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  function toggle(key: K) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") setSortDir(null);
    else setSortDir("asc");
  }
  function reset() {
    setSortKey(defaultKey);
    setSortDir(defaultDir);
  }
  function applySort<T>(rows: T[], getter: (r: T, k: K) => string | number | null | undefined): T[] {
    if (!sortDir) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getter(a, sortKey);
      const bv = getter(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  const isDefault = sortKey === defaultKey && sortDir === defaultDir;
  return { sortKey, sortDir, toggle, reset, applySort, isDefault };
}

export function SortableTHead<K extends string>({
  cols,
  sortKey,
  sortDir,
  onToggle,
}: {
  cols: { key: K | null; label: string }[];
  sortKey: K;
  sortDir: SortDir;
  onToggle: (k: K) => void;
}) {
  return (
    <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
      <tr>
        {cols.map((c, idx) => {
          const sortable = c.key !== null;
          const active = sortable && sortKey === c.key && sortDir !== null;
          const arrow = active ? (sortDir === "asc" ? "↑" : "↓") : "";
          return (
            <th
              key={String(c.key ?? `__${idx}`)}
              onClick={sortable ? () => onToggle(c.key as K) : undefined}
              className={`text-left font-medium px-3 py-2 select-none ${
                sortable ? "cursor-pointer hover:bg-black/5" : ""
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {c.label}
                {sortable && (
                  <span className={`text-[9px] ${active ? "text-[#0a3d3e]" : "text-black/20"}`}>
                    {arrow || "↕"}
                  </span>
                )}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export function FilterRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 mb-2 flex-wrap">{children}</div>;
}

export function US_STATE_OPTIONS() {
  const list = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
    "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
    "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];
  return list.map((s) => ({ value: s, label: s }));
}
