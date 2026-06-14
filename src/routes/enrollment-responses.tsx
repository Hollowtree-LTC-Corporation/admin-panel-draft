import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, TRow, TCell } from "@/components/wireframe/Bits";
import { ENROLLMENT_RESPONSES_LTC, INDIVIDUALS, ORGS } from "@/lib/wireframe/data";
import { useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, FilterCombobox, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/enrollment-responses")({ component: View });

type SortKey = "individual_name" | "question" | "answer" | "submitted_at";

function View() {
  const { product } = useStore();
  const [search, setSearch] = useState("");
  const [ind, setInd] = useState("all");
  const [org, setOrg] = useState("all");
  const sort = useSort<SortKey>("individual_name", "asc");

  if (product !== "LTC") {
    return (
      <div>
        <PageHeader title="Enrollment Responses" />
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">Enrollment Responses is LTC-only.</div>
      </div>
    );
  }

  const ltcInds = INDIVIDUALS.filter((i) => i.product === "LTC");
  const indOptions = ltcInds.map((i) => ({ value: i.full_name, label: i.full_name }));
  const orgOptions = ORGS.filter((o) => o.product === "LTC").map((o) => ({ value: o.id, label: o.name }));

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = ENROLLMENT_RESPONSES_LTC.filter((r) => {
      if (s && !r.individual_name.toLowerCase().includes(s)) return false;
      if (ind !== "all" && r.individual_name !== ind) return false;
      if (org !== "all") {
        const indRec = ltcInds.find((i) => i.full_name === r.individual_name);
        if (!indRec || indRec.org_id !== org) return false;
      }
      return true;
    });
    return sort.applySort(filtered, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [search, ind, org, sort, ltcInds]);

  const active = search !== "" || ind !== "all" || org !== "all" || !sort.isDefault;
  const clearAll = () => { setSearch(""); setInd("all"); setOrg("all"); sort.reset(); };

  return (
    <div>
      <PageHeader title="Enrollment Responses (LTC)" subtitle={`${rows.length} of ${ENROLLMENT_RESPONSES_LTC.length} responses · read-only`} />
      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search individual…" />
        <FilterCombobox value={ind} onChange={setInd} placeholder="All individuals" options={indOptions} />
        <FilterCombobox value={org} onChange={setOrg} placeholder="All LTC orgs" options={orgOptions} />
        <ClearFiltersLink show={active} onClick={clearAll} />
      </FilterRow>
      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "individual_name", label: "Individual" },
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer" },
            { key: "submitted_at", label: "Submitted" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {rows.map((r) => (
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
