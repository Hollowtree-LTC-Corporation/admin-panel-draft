import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell, Pill, Btn } from "@/components/wireframe/Bits";
import { ENROLLMENT_WINDOWS, ORGS, CARRIERS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterSelect, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/enrollment-windows")({ component: View });

type SortKey = "window_type" | "org_name" | "start_date" | "end_date" | "status" | "sponsor_type" | "carrier";

function View() {
  const can = usePermission();
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [wtype, setWtype] = useState("all");
  const [status, setStatus] = useState("all");
  const [sponsor, setSponsor] = useState("all");
  const [carrier, setCarrier] = useState("all");
  const sort = useSort<SortKey>("start_date", "desc");

  const productOrgs = ORGS.filter((o) => o.product === product);
  const orgOptions = productOrgs.map((o) => ({ value: o.name, label: o.name }));
  const carrierOptions = CARRIERS.map((c) => ({ value: c.name, label: c.name }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = ENROLLMENT_WINDOWS.filter((w) => {
      if (s && !((w.org_name?.toLowerCase().includes(s)) || (w.affiliate_org?.toLowerCase().includes(s)))) return false;
      if (org !== "all" && w.org_name !== org) return false;
      if (wtype !== "all" && w.window_type !== wtype) return false;
      if (status !== "all" && w.status !== status) return false;
      if (sponsor !== "all" && !w.sponsor_type.includes(sponsor)) return false;
      if (carrier !== "all" && w.carrier !== carrier) return false;
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, org, wtype, status, sponsor, carrier, sort]);

  const active = search !== "" || org !== "all" || wtype !== "all" || status !== "all" || sponsor !== "all" || carrier !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setOrg("all"); setWtype("all"); setStatus("all"); setSponsor("all"); setCarrier("all"); sort.reset(); };

  return (
    <div>
      <PageHeader
        title="Enrollment Windows"
        subtitle={`${rows.length} of ${ENROLLMENT_WINDOWS.length} windows`}
        actions={<Btn variant="primary" disabled={!can("enrollment_windows", "create")}>+ New Window</Btn>}
      />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search org or affiliate…" />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All orgs" options={orgOptions} />
        <FilterSelect value={wtype} onChange={setWtype} allLabel="All types" options={[
          { value: "initial" }, { value: "annual" }, { value: "new_joiner" }, { value: "special" },
        ]} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={[
          { value: "upcoming" }, { value: "open" }, { value: "closed" },
        ]} />
        <FilterSelect value={sponsor} onChange={setSponsor} allLabel="All sponsors" options={[
          { value: "employer" }, { value: "affiliate" },
        ]} />
        <FilterCombobox value={carrier} onChange={setCarrier} placeholder="All carriers" options={carrierOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "org_name", label: "Sponsor (Org / Affiliate)" },
            { key: "window_type", label: "Type" },
            { key: "start_date", label: "Start" },
            { key: "end_date", label: "End" },
            { key: "status", label: "Status" },
            { key: "sponsor_type", label: "Sponsor Shape" },
            { key: "carrier", label: "Carrier" },
            { key: null, label: "" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((w) => (
            <TRow key={w.id}>
              <TCell className="font-medium">
                {w.org_name}
                {w.affiliate_org ? <div className="text-[10px] text-black/50">+ {w.affiliate_org}</div> : null}
              </TCell>
              <TCell className="capitalize">{w.window_type}</TCell>
              <TCell>{w.start_date}</TCell>
              <TCell>{w.end_date}</TCell>
              <TCell><Pill tone={w.status === "open" ? "ok" : w.status === "upcoming" ? "info" : "bad"}>{w.status}</Pill></TCell>
              <TCell>{w.sponsor_type}</TCell>
              <TCell>{w.carrier}</TCell>
              <TCell><Btn disabled={!can("enrollment_windows", "update")}>Edit</Btn></TCell>
            </TRow>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-black/40 text-xs">No enrollment windows match the current filters.</td></tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
