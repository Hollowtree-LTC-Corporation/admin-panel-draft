import { useMemo, useState, useEffect, Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, ChevronDown, ChevronRight, Plus, Trash2, Check } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Btn, SectionTitle, ProductBadge, Pill,
  Drawer, Field,
} from "@/components/wireframe/Bits";
import {
  CARRIERS, CARRIER_PRODUCTS, CARRIER_COMMISSION_SCHEDULES, COMMISSION_RATE_TIERS,
  CARRIER_CONSTRAINTS, CARRIER_RIDER_AVAILABILITY,
  formatCents,
  type Carrier, type CarrierType, type CarrierProduct, type CarrierCommissionSchedule,
  type ScheduleType, type CarrierConstraint, type CarrierRiderAvailability,
  type RiderAvailability,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";
import { ExportCsvButton } from "@/components/wireframe/ExportCsvButton";

export const Route = createFileRoute("/carriers")({ component: View });

type SortKey = "carrier_name" | "carrier_type" | "am_best_rating" | "carrier_products_count";
type ProdSortKey = "product_name" | "product_type" | "cca_product" | "carrier_name" | "schedules_count" | "default_schedule" | "constraints_count" | "riders_count" | "active";

const FIELD_INPUT = "w-full px-2 py-1 text-sm border border-black/15 rounded";

const CARRIER_TYPES: CarrierType[] = ["Group DI Carrier", "Group LTC Carrier", "Lloyds MGU", "Domestic Carrier"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function TypePill({ type }: { type: ScheduleType }) {
  const tone = type === "heaped" ? "info" : type === "flat" ? "ok" : "neutral";
  return <Pill tone={tone}>{type}</Pill>;
}

function AvailabilityPill({ value }: { value: RiderAvailability }) {
  if (value === "available") return <Pill tone="ok">Available</Pill>;
  if (value === "not_available") return <Pill tone="neutral">Not Available</Pill>;
  return <Pill tone="warn">Requires State Proposal</Pill>;
}

function fmtSync(iso: string | null): string {
  if (!iso) return "Not yet synced from Attio";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function View() {
  const { product } = useStore();
  const can = usePermission();

  // Local state — all mutations are in-memory only.
  const [carriers, setCarriers] = useState<Carrier[]>(() => CARRIERS);
  const [products, setProducts] = useState<CarrierProduct[]>(() => CARRIER_PRODUCTS);
  const [schedules, setSchedules] = useState<CarrierCommissionSchedule[]>(() => CARRIER_COMMISSION_SCHEDULES);
  const [tiers, setTiers] = useState(() => COMMISSION_RATE_TIERS);
  const [constraints, setConstraints] = useState<CarrierConstraint[]>(() => CARRIER_CONSTRAINTS);
  const [riders, setRiders] = useState<CarrierRiderAvailability[]>(() => CARRIER_RIDER_AVAILABILITY);

  const [search, setSearch] = useState("");
  const sort = useSort<SortKey>("carrier_name", "asc");
  const prodSort = useSort<ProdSortKey>("product_name", "asc");

  const visibleCarriers = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = carriers
      .filter((c) => c.product === product)
      .map((c) => ({
        ...c,
        carrier_products_count: products.filter((p) => p.carrier_id === c.id && p.active).length,
      }))
      .filter((c) => !s || c.carrier_name.toLowerCase().includes(s));
    return sort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [carriers, products, search, product, sort]);

  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  useEffect(() => {
    if (visibleCarriers.length === 0) {
      setSelectedCarrierId(null);
      return;
    }
    if (!selectedCarrierId || !visibleCarriers.find((c) => c.id === selectedCarrierId)) {
      setSelectedCarrierId(visibleCarriers[0].id);
    }
  }, [visibleCarriers, selectedCarrierId]);

  const selectedCarrier = carriers.find((c) => c.id === selectedCarrierId) ?? null;

  const visibleProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    const carrierIds = new Set(carriers.filter((c) => c.product === product).map((c) => c.id));
    const rows = products
      .filter((p) => carrierIds.has(p.carrier_id))
      .filter((p) => (selectedCarrierId ? p.carrier_id === selectedCarrierId : true))
      .map((p) => {
        const car = carriers.find((c) => c.id === p.carrier_id);
        const prodSchedules = schedules.filter((s2) => s2.carrier_product_id === p.id);
        const def = prodSchedules.find((s2) => s2.is_default);
        return {
          ...p,
          carrier_name: car?.carrier_name ?? "",
          schedules_count: prodSchedules.length,
          default_schedule: def?.schedule_name ?? "",
          constraints_count: constraints.filter((c) => c.carrier_product_id === p.id).length,
          riders_count: riders.filter((r) => r.carrier_product_id === p.id).length,
        };
      })
      .filter((p) => !s || p.product_name.toLowerCase().includes(s) || p.carrier_name.toLowerCase().includes(s));
    return prodSort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number | boolean>)[k] as string | number);
  }, [products, carriers, schedules, constraints, riders, selectedCarrierId, search, product, prodSort]);

  const activeFilters = search !== "" || !sort.isDefault || !prodSort.isDefault;
  const clearAll = () => { setSearch(""); sort.reset(); prodSort.reset(); };

  // Carrier inline edit/create state
  const [editingCarrier, setEditingCarrier] = useState(false);
  const [carrierDraft, setCarrierDraft] = useState<Carrier | null>(null);
  const [showNewCarrier, setShowNewCarrier] = useState(false);
  const [newCarrierDraft, setNewCarrierDraft] = useState<Carrier | null>(null);

  function startEditCarrier() {
    if (!selectedCarrier) return;
    setCarrierDraft({ ...selectedCarrier });
    setEditingCarrier(true);
  }
  function saveCarrier() {
    if (!carrierDraft) return;
    setCarriers((cs) => cs.map((c) => (c.id === carrierDraft.id ? carrierDraft : c)));
    setEditingCarrier(false);
    setCarrierDraft(null);
  }
  function cancelEditCarrier() {
    setEditingCarrier(false);
    setCarrierDraft(null);
  }

  function startNewCarrier() {
    const id = `car_new_${Date.now()}`;
    setNewCarrierDraft({
      id, product,
      attio_carrier_id: null,
      carrier_name: "",
      carrier_type: product === "DI" ? "Group DI Carrier" : "Group LTC Carrier",
      am_best_rating: "",
      cca_carrier: false,
      billing_email: "",
      primary_contact_name: "",
      primary_contact_email: "",
      attio_last_synced_at: null,
    });
    setShowNewCarrier(true);
  }
  function saveNewCarrier() {
    if (!newCarrierDraft || !newCarrierDraft.carrier_name.trim()) return;
    setCarriers((cs) => [...cs, newCarrierDraft]);
    setSelectedCarrierId(newCarrierDraft.id);
    setShowNewCarrier(false);
    setNewCarrierDraft(null);
  }

  // Product drawer state
  type DrawerMode = "view" | "create";
  const [drawerProduct, setDrawerProduct] = useState<CarrierProduct | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [productDraft, setProductDraft] = useState<CarrierProduct | null>(null);
  const [productEditing, setProductEditing] = useState(false);

  function openProduct(p: CarrierProduct) {
    setDrawerProduct(p);
    setProductDraft({ ...p });
    setDrawerMode("view");
    setProductEditing(false);
  }
  function openNewProduct() {
    if (!selectedCarrier) return;
    const id = `cp_new_${Date.now()}`;
    const fresh: CarrierProduct = {
      id,
      attio_product_id: null,
      carrier_id: selectedCarrier.id,
      product_name: "",
      product_type: product === "DI" ? "Disability" : "Universal Life",
      line_of_business: product,
      cca_product: false,
      payment_methods_allowed: "ACH",
      active: true,
      attio_last_synced_at: null,
    };
    setDrawerProduct(fresh);
    setProductDraft(fresh);
    setDrawerMode("create");
    setProductEditing(true);
  }
  function closeProductDrawer() {
    setDrawerProduct(null);
    setProductDraft(null);
    setProductEditing(false);
  }
  function saveProductDrawer() {
    if (!productDraft || !productDraft.product_name.trim()) return;
    if (drawerMode === "create") {
      setProducts((ps) => [...ps, productDraft]);
    } else {
      setProducts((ps) => ps.map((p) => (p.id === productDraft.id ? productDraft : p)));
    }
    setDrawerProduct(productDraft);
    setDrawerMode("view");
    setProductEditing(false);
  }

  return (
    <div>
      <PageHeader
        title="Carriers & Products"
        subtitle={`${visibleCarriers.length} carriers · ${visibleProducts.length} ${selectedCarrier ? "products for " + selectedCarrier.carrier_name : "products shown"}`}
        actions={
          <Btn variant="primary" disabled={!can("carriers", "create")} onClick={startNewCarrier}>
            + New Carrier
          </Btn>
        }
      />

      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search carrier or product…" />
        <ClearFiltersLink show={activeFilters} onClick={clearAll} />
        <ExportCsvButton filteredCount={visibleCarriers.length} totalCount={carriers.length} resourceLabel="carriers" />
      </FilterRow>

      {showNewCarrier && newCarrierDraft ? (
        <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
          <div className="text-xs font-semibold mb-2">New Carrier</div>
          <CarrierFormFields value={newCarrierDraft} onChange={(v) => setNewCarrierDraft(v)} />
          <div className="flex gap-2 mt-3">
            <Btn variant="primary" onClick={saveNewCarrier}>Save Carrier</Btn>
            <Btn variant="ghost" onClick={() => { setShowNewCarrier(false); setNewCarrierDraft(null); }}>Cancel</Btn>
          </div>
        </div>
      ) : null}

      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "carrier_name", label: "Carrier" },
            { key: "carrier_type", label: "Type" },
            { key: "am_best_rating", label: "AM Best" },
            { key: "carrier_products_count", label: "# Products" },
          ]}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onToggle={sort.toggle}
        />
        <tbody>
          {visibleCarriers.map((c) => {
            const selected = c.id === selectedCarrierId;
            return (
              <tr
                key={c.id}
                onClick={() => setSelectedCarrierId(selected ? null : c.id)}
                className={`border-t border-black/5 cursor-pointer ${selected ? "bg-emerald-50 border-l-2 border-l-[#0a3d3e]" : "hover:bg-[#f7f3eb]/60"}`}
              >
                <TCell className="font-medium">
                  <span className="inline-flex items-center gap-1">
                    {selected ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 text-black/30" />}
                    {c.carrier_name}
                    {c.cca_carrier ? <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-700"><Check className="h-3 w-3" />CCA Eligible</span> : null}
                  </span>
                </TCell>
                <TCell className="text-black/70 text-xs">{c.carrier_type}</TCell>
                <TCell className="text-black/70 text-xs">{c.am_best_rating || "—"}</TCell>
                <TCell>{c.carrier_products_count}</TCell>
              </tr>
            );
          })}
          {visibleCarriers.length === 0 ? (
            <TRow><TCell className="text-black/50 italic">No carriers for {product}.</TCell></TRow>
          ) : null}
        </tbody>
      </TableShell>

      {/* Carrier detail panel */}
      {selectedCarrier ? (
        <div className="mt-3 bg-white border border-black/10 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{selectedCarrier.carrier_name}</h3>
              <ProductBadge product={selectedCarrier.product} />
              {selectedCarrier.cca_carrier ? <Pill tone="ok">CCA Carrier</Pill> : null}
            </div>
            <div className="flex gap-2">
              {editingCarrier ? (
                <>
                  <Btn variant="primary" onClick={saveCarrier}>Save</Btn>
                  <Btn variant="ghost" onClick={cancelEditCarrier}>Cancel</Btn>
                </>
              ) : (
                <Btn variant="secondary" onClick={startEditCarrier} disabled={!can("carriers", "create")}>Edit</Btn>
              )}
            </div>
          </div>

          {editingCarrier && carrierDraft ? (
            <CarrierFormFields value={carrierDraft} onChange={setCarrierDraft} />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Carrier Name">{selectedCarrier.carrier_name}</Field>
              <Field label="Carrier Type">{selectedCarrier.carrier_type}</Field>
              <Field label="AM Best Rating">{selectedCarrier.am_best_rating || "—"}</Field>
              <Field label="CCA Carrier">{selectedCarrier.cca_carrier ? "Yes" : "No"}</Field>
              <Field label="Primary Contact Name">{selectedCarrier.primary_contact_name || "—"}</Field>
              <Field label="Primary Contact Email">{selectedCarrier.primary_contact_email || "—"}</Field>
              <Field label="Billing Email">{selectedCarrier.billing_email || "—"}</Field>
              <div />
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-black/5 text-[11px] text-black/50">
            Attio ID: {selectedCarrier.attio_carrier_id ?? "Not yet synced from Attio"}
            {selectedCarrier.attio_carrier_id ? ` · Last synced from Attio: ${fmtSync(selectedCarrier.attio_last_synced_at)}` : ""}
          </div>
        </div>
      ) : null}

      <SectionTitle>
        {selectedCarrier ? `Carrier Products for ${selectedCarrier.carrier_name}` : "Carrier Products"}
      </SectionTitle>
      <div className="flex justify-end mb-2">
        <Btn
          variant="primary"
          disabled={!can("carrier_products", "create") || !selectedCarrier}
          onClick={openNewProduct}
          title={!selectedCarrier ? "Select a carrier first" : undefined}
        >
          + New Carrier Product
        </Btn>
      </div>
      <TableShell>
        <SortableTHead<ProdSortKey>
          cols={[
            { key: "product_name", label: "Product Name" },
            { key: "product_type", label: "Product Type" },
            { key: "cca_product" as ProdSortKey, label: "CCA" },
            ...(selectedCarrier ? [] : [{ key: "carrier_name" as ProdSortKey, label: "Carrier" }]),
            { key: "active" as ProdSortKey, label: "Active" },
            ...(product === "LTC"
              ? [
                  { key: "schedules_count" as ProdSortKey, label: "# Schedules" },
                  { key: "default_schedule" as ProdSortKey, label: "Default Schedule" },
                  { key: "constraints_count" as ProdSortKey, label: "# Constraints" },
                  { key: "riders_count" as ProdSortKey, label: "# Riders" },
                ]
              : []),
          ]}
          sortKey={prodSort.sortKey}
          sortDir={prodSort.sortDir}
          onToggle={prodSort.toggle}
        />
        <tbody>
          {visibleProducts.map((p) => (
            <TRow key={p.id} onClick={() => openProduct(p)}>
              <TCell className="font-medium">
                <span className="inline-flex items-center gap-1">
                  {p.product_name}
                  {p.cca_product ? <Check className="h-3 w-3 text-emerald-600" aria-label="CCA Product" /> : null}
                </span>
              </TCell>
              <TCell className="text-black/70 text-xs">{p.product_type}</TCell>
              <TCell>{p.cca_product ? <Pill tone="ok">CCA</Pill> : <span className="text-black/40">—</span>}</TCell>
              {!selectedCarrier ? <TCell>{p.carrier_name}</TCell> : null}
              <TCell>{p.active ? <Pill tone="ok">Active</Pill> : <Pill tone="neutral">Inactive</Pill>}</TCell>
              {product === "LTC" ? (
                <>
                  <TCell>{p.schedules_count}</TCell>
                  <TCell className="text-black/70">{p.default_schedule || "—"}</TCell>
                  <TCell>{p.constraints_count}</TCell>
                  <TCell>{p.riders_count}</TCell>
                </>
              ) : null}
            </TRow>
          ))}
          {visibleProducts.length === 0 ? (
            <TRow><TCell className="text-black/50 italic">No products.</TCell></TRow>
          ) : null}
        </tbody>
      </TableShell>

      {/* Product drawer */}
      <Drawer
        open={!!drawerProduct}
        onClose={closeProductDrawer}
        title={drawerMode === "create" ? "New Carrier Product" : (drawerProduct?.product_name ?? "")}
      >
        {drawerProduct && productDraft ? (
          <ProductDrawerBody
            product={drawerProduct}
            draft={productDraft}
            onDraftChange={setProductDraft}
            editing={productEditing}
            onEdit={() => setProductEditing(true)}
            onSave={saveProductDrawer}
            onCancel={() => {
              if (drawerMode === "create") closeProductDrawer();
              else {
                setProductDraft({ ...drawerProduct });
                setProductEditing(false);
              }
            }}
            productMode={product}
            carriers={carriers}
            schedules={schedules.filter((s) => s.carrier_product_id === drawerProduct.id)}
            tiers={tiers}
            constraints={constraints.filter((c) => c.carrier_product_id === drawerProduct.id)}
            riders={riders.filter((r) => r.carrier_product_id === drawerProduct.id)}
            onAddSchedule={(s, newTiers) => {
              setSchedules((all) => [...all, s]);
              setTiers((all) => [...all, ...newTiers]);
            }}
            onAddConstraint={(c) => setConstraints((all) => [...all, c])}
            onAddRider={(r) => setRiders((all) => [...all, r])}
            mode={drawerMode}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

function CarrierFormFields({
  value, onChange,
}: {
  value: Carrier;
  onChange: (v: Carrier) => void;
}) {
  function set<K extends keyof Carrier>(k: K, v: Carrier[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <Field label="Carrier Name">
        <input className={FIELD_INPUT} value={value.carrier_name} onChange={(e) => set("carrier_name", e.target.value)} />
      </Field>
      <Field label="Carrier Type">
        <select className={FIELD_INPUT} value={value.carrier_type} onChange={(e) => set("carrier_type", e.target.value as CarrierType)}>
          {CARRIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="AM Best Rating">
        <input className={FIELD_INPUT} value={value.am_best_rating} onChange={(e) => set("am_best_rating", e.target.value)} placeholder="e.g., A+" />
      </Field>
      <Field label="CCA Carrier">
        <label className="inline-flex items-center gap-2 text-xs h-7">
          <input type="checkbox" checked={value.cca_carrier} onChange={(e) => set("cca_carrier", e.target.checked)} />
          {value.cca_carrier ? "Yes" : "No"}
        </label>
      </Field>
      <Field label="Primary Contact Name">
        <input className={FIELD_INPUT} value={value.primary_contact_name} onChange={(e) => set("primary_contact_name", e.target.value)} />
      </Field>
      <Field label="Primary Contact Email">
        <input className={FIELD_INPUT} value={value.primary_contact_email} onChange={(e) => set("primary_contact_email", e.target.value)} />
      </Field>
      <Field label="Billing Email">
        <input className={FIELD_INPUT} value={value.billing_email} onChange={(e) => set("billing_email", e.target.value)} />
      </Field>
      <div />
    </div>
  );
}

function ProductDrawerBody({
  product, draft, onDraftChange, editing, onEdit, onSave, onCancel, productMode,
  carriers, schedules, tiers, constraints, riders,
  onAddSchedule, onAddConstraint, onAddRider, mode,
}: {
  product: CarrierProduct;
  draft: CarrierProduct;
  onDraftChange: (v: CarrierProduct) => void;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  productMode: "DI" | "LTC";
  carriers: Carrier[];
  schedules: CarrierCommissionSchedule[];
  tiers: typeof COMMISSION_RATE_TIERS;
  constraints: CarrierConstraint[];
  riders: CarrierRiderAvailability[];
  onAddSchedule: (s: CarrierCommissionSchedule, tiers: typeof COMMISSION_RATE_TIERS) => void;
  onAddConstraint: (c: CarrierConstraint) => void;
  onAddRider: (r: CarrierRiderAvailability) => void;
  mode: "view" | "create";
}) {
  const car = carriers.find((c) => c.id === draft.carrier_id);
  function set<K extends keyof CarrierProduct>(k: K, v: CarrierProduct[K]) {
    onDraftChange({ ...draft, [k]: v });
  }

  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [expandedConstraintId, setExpandedConstraintId] = useState<string | null>(null);
  const [showNewConstraint, setShowNewConstraint] = useState(false);
  const [showNewRider, setShowNewRider] = useState(false);
  const [riderStateFilter, setRiderStateFilter] = useState<string>("all");
  const [riderAvailFilter, setRiderAvailFilter] = useState<RiderAvailability | "all">("all");

  const stateOptions = useMemo(() => {
    const set = new Set(riders.map((r) => r.state));
    return Array.from(set).sort();
  }, [riders]);

  const filteredRiders = riders.filter((r) =>
    (riderStateFilter === "all" || r.state === riderStateFilter) &&
    (riderAvailFilter === "all" || r.available === riderAvailFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between -mt-1">
        <div className="text-xs text-black/60">
          {car?.carrier_name} · <ProductBadge product={productMode} />
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Btn variant="primary" onClick={onSave}>Save</Btn>
              <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
            </>
          ) : (
            <Btn variant="secondary" onClick={onEdit}>Edit</Btn>
          )}
        </div>
      </div>

      {/* Section 1: Product Metadata */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Product Metadata</div>
        {editing ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Product Name">
              <input className={FIELD_INPUT} value={draft.product_name} onChange={(e) => set("product_name", e.target.value)} />
            </Field>
            <Field label="Product Type">
              <input className={FIELD_INPUT} value={draft.product_type} onChange={(e) => set("product_type", e.target.value)} />
            </Field>
            <Field label="Line of Business">
              <span className="text-xs text-black/60">{productMode}</span>
            </Field>
            <Field label="CCA Product">
              <label className="inline-flex items-center gap-2 text-xs h-7">
                <input type="checkbox" checked={draft.cca_product} onChange={(e) => set("cca_product", e.target.checked)} />
                {draft.cca_product ? "Yes" : "No"}
              </label>
            </Field>
            <Field label="Payment Methods">
              <input className={FIELD_INPUT} value={draft.payment_methods_allowed} onChange={(e) => set("payment_methods_allowed", e.target.value)} placeholder="e.g., ACH, Credit Card" />
            </Field>
            <Field label="Active">
              <label className="inline-flex items-center gap-2 text-xs h-7">
                <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
                {draft.active ? "Active" : "Inactive"}
              </label>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Product Name">{product.product_name}</Field>
            <Field label="Product Type">{product.product_type}</Field>
            <Field label="Line of Business"><Pill tone="info">{productMode}</Pill></Field>
            <Field label="CCA Product">{product.cca_product ? "Yes" : "No"}</Field>
            <Field label="Payment Methods">{product.payment_methods_allowed || "—"}</Field>
            <Field label="Active">{product.active ? "Active" : "Inactive"}</Field>
          </div>
        )}
      </div>

      {/* Section 2: Sync — moved below schedules/constraints/riders to keep it last per spec; shown here as a small footer */}

      {/* Section 3: Commission Schedules — LTC only */}
      {productMode === "LTC" && mode === "view" ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-black/50">Commission Schedules</div>
            <Btn variant="secondary" onClick={() => setShowNewSchedule((v) => !v)}>
              <Plus className="h-3 w-3" /> New Schedule
            </Btn>
          </div>

          {showNewSchedule ? (
            <NewScheduleForm
              productId={product.id}
              productName={product.product_name}
              onCancel={() => setShowNewSchedule(false)}
              onSave={(s, t) => { onAddSchedule(s, t); setShowNewSchedule(false); }}
            />
          ) : null}

          <div className="bg-white border border-black/10 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Schedule Name</th>
                  <th className="text-left font-medium px-3 py-2">Type</th>
                  <th className="text-left font-medium px-3 py-2">State</th>
                  <th className="text-left font-medium px-3 py-2">Default</th>
                  <th className="text-left font-medium px-3 py-2">Effective From</th>
                  <th className="text-left font-medium px-3 py-2">Effective To</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-3 text-black/50 italic">No schedules yet.</td></tr>
                ) : null}
                {schedules.map((s) => {
                  const expanded = expandedScheduleId === s.id;
                  const sTiers = tiers.filter((t) => t.schedule_id === s.id).sort((a, b) => a.from_year - b.from_year);
                  return (
                    <Fragment key={s.id}>
                      <tr
                        onClick={() => setExpandedScheduleId(expanded ? null : s.id)}
                        className="border-t border-black/5 cursor-pointer hover:bg-[#f7f3eb]/60"
                      >
                        <td className="px-3 py-2 font-medium">
                          <span className="inline-flex items-center gap-1">
                            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 text-black/40" />}
                            {s.schedule_name}
                          </span>
                        </td>
                        <td className="px-3 py-2"><TypePill type={s.schedule_type} /></td>
                        <td className="px-3 py-2">{s.state_code ?? "Standard"}</td>
                        <td className="px-3 py-2">{s.is_default ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> : null}</td>
                        <td className="px-3 py-2 text-black/70">{s.effective_from}</td>
                        <td className="px-3 py-2 text-black/70">{s.effective_to ?? "Current"}</td>
                        <td className="px-3 py-2">{s.effective_to ? <Pill tone="neutral">Expired</Pill> : <Pill tone="ok">Current</Pill>}</td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-[#f7f3eb]/40">
                          <td colSpan={7} className="px-3 py-3">
                            <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Rate Tiers</div>
                            <table className="text-xs">
                              <thead>
                                <tr className="text-black/50">
                                  <th className="text-left font-medium pr-8 pb-1">From Year</th>
                                  <th className="text-left font-medium pr-8 pb-1">To Year</th>
                                  <th className="text-left font-medium pb-1">Rate %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sTiers.map((t) => (
                                  <tr key={t.id}>
                                    <td className="pr-8 py-0.5">{t.from_year}</td>
                                    <td className="pr-8 py-0.5">{t.to_year >= 99 ? "—" : t.to_year}</td>
                                    <td className="py-0.5 font-mono">{t.rate_pct.toFixed(2)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Section 4: Constraints — LTC only */}
      {productMode === "LTC" && mode === "view" ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-black/50">Constraints</div>
            <Btn variant="secondary" onClick={() => setShowNewConstraint((v) => !v)}>
              <Plus className="h-3 w-3" /> New Constraint
            </Btn>
          </div>
          <div className="text-[11px] text-black/50 mb-2">
            Add a new constraint when carrier rules change. Set effective to on the prior row to today.
          </div>

          {showNewConstraint ? (
            <NewConstraintForm
              productId={product.id}
              onCancel={() => setShowNewConstraint(false)}
              onSave={(c) => { onAddConstraint(c); setShowNewConstraint(false); }}
            />
          ) : null}

          <div className="bg-white border border-black/10 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>
                  <th className="text-left font-medium px-3 py-2">SI Max</th>
                  <th className="text-left font-medium px-3 py-2">Increment</th>
                  <th className="text-left font-medium px-3 py-2">Tier Floor</th>
                  <th className="text-left font-medium px-3 py-2">Round Threshold</th>
                  <th className="text-left font-medium px-3 py-2">Effective</th>
                  <th className="text-left font-medium px-3 py-2">Last Verified</th>
                </tr>
              </thead>
              <tbody>
                {constraints.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-3 text-black/50 italic">No constraints recorded.</td></tr>
                ) : null}
                {constraints.map((c) => {
                  const expanded = expandedConstraintId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        onClick={() => setExpandedConstraintId(expanded ? null : c.id)}
                        className="border-t border-black/5 cursor-pointer hover:bg-[#f7f3eb]/60"
                      >
                        <td className="px-3 py-2 font-medium" title="Stored as integer cents per schema">
                          <span className="inline-flex items-center gap-1">
                            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 text-black/40" />}
                            {formatCents(c.si_max_cents)}
                          </span>
                        </td>
                        <td className="px-3 py-2" title="Stored as integer cents per schema">{formatCents(c.increment)}</td>
                        <td className="px-3 py-2" title="Stored as integer cents per schema">{formatCents(c.tier_floor_cents)}</td>
                        <td className="px-3 py-2" title="Stored as integer cents per schema">{formatCents(c.round_preference_threshold_cents)}</td>
                        <td className="px-3 py-2 text-black/70">{c.effective_from} → {c.effective_to ?? "Current"}</td>
                        <td className="px-3 py-2 text-black/70">{c.last_verified}</td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-[#f7f3eb]/40">
                          <td colSpan={6} className="px-3 py-3 space-y-1 text-xs">
                            <div><span className="text-black/50">Verified by:</span> {c.verified_by}</div>
                            <div><span className="text-black/50">Source:</span> {c.source}</div>
                            <div><span className="text-black/50">Notes:</span> {c.notes || "—"}</div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Section 5: Rider Availability — LTC only */}
      {productMode === "LTC" && mode === "view" ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-black/50">Rider Availability</div>
            <Btn variant="secondary" onClick={() => setShowNewRider((v) => !v)}>
              <Plus className="h-3 w-3" /> New Rider Row
            </Btn>
          </div>
          <div className="text-[11px] text-black/50 mb-2">One row per rider per state.</div>

          <div className="flex gap-2 mb-2">
            <select className={`${FIELD_INPUT} w-28`} value={riderStateFilter} onChange={(e) => setRiderStateFilter(e.target.value)}>
              <option value="all">All states</option>
              {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={`${FIELD_INPUT} w-56`} value={riderAvailFilter} onChange={(e) => setRiderAvailFilter(e.target.value as RiderAvailability | "all")}>
              <option value="all">All availability</option>
              <option value="available">Available</option>
              <option value="not_available">Not Available</option>
              <option value="requires_state_proposal">Requires State Proposal</option>
            </select>
          </div>

          {showNewRider ? (
            <NewRiderForm
              productId={product.id}
              onCancel={() => setShowNewRider(false)}
              onSave={(r) => { onAddRider(r); setShowNewRider(false); }}
            />
          ) : null}

          <div className="bg-white border border-black/10 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Rider Code</th>
                  <th className="text-left font-medium px-3 py-2">Rider Name</th>
                  <th className="text-left font-medium px-3 py-2">State</th>
                  <th className="text-left font-medium px-3 py-2">Availability</th>
                  <th className="text-left font-medium px-3 py-2">Effective</th>
                  <th className="text-left font-medium px-3 py-2">Last Verified</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiders.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-3 text-black/50 italic">No rider rows match.</td></tr>
                ) : null}
                {filteredRiders.map((r) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="px-3 py-2 font-mono text-[11px]">{r.rider_code}</td>
                    <td className="px-3 py-2">{r.rider_full_name}</td>
                    <td className="px-3 py-2">{r.state}</td>
                    <td className="px-3 py-2"><AvailabilityPill value={r.available} /></td>
                    <td className="px-3 py-2 text-black/70">{r.effective_from ?? "—"} → {r.effective_to ?? "Current"}</td>
                    <td className="px-3 py-2 text-black/70">{r.last_verified ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Section 2 (footer): Sync */}
      <div className="pt-3 border-t border-black/5 text-[11px] text-black/50">
        Attio ID: {product.attio_product_id ?? "Not yet synced from Attio"}
        {product.attio_product_id ? ` · Last synced: ${fmtSync(product.attio_last_synced_at)}` : ""}
      </div>
    </div>
  );
}

function NewScheduleForm({
  productId, productName, onCancel, onSave,
}: {
  productId: string;
  productName: string;
  onCancel: () => void;
  onSave: (s: CarrierCommissionSchedule, tiers: typeof COMMISSION_RATE_TIERS) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ScheduleType>("heaped");
  const [stateCode, setStateCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effTo, setEffTo] = useState("");
  const [notes, setNotes] = useState("");
  const [tierRows, setTierRows] = useState<Array<{ from: number; to: number; rate_pct: number }>>([
    { from: 1, to: 1, rate_pct: 100 },
    { from: 2, to: 10, rate_pct: 5 },
  ]);

  function addTier() { setTierRows((r) => [...r, { from: 1, to: 1, rate_pct: 0 }]); }
  function rmTier(i: number) { setTierRows((r) => r.filter((_, idx) => idx !== i)); }
  function updTier(i: number, patch: Partial<{ from: number; to: number; rate_pct: number }>) {
    setTierRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit() {
    if (!name.trim()) return;
    const id = `ccs_new_${Date.now()}`;
    const sched: CarrierCommissionSchedule = {
      id, carrier_product_id: productId, carrier_product_name: productName,
      state_code: stateCode.trim() || null, schedule_name: name.trim(),
      schedule_type: type, is_default: isDefault,
      effective_from: effFrom, effective_to: effTo || null,
    };
    void notes; // notes not on existing schedule type; would be added in production schema
    const newTiers = tierRows.map((t, i) => ({
      id: `${id}_t${i}`, schedule_id: id,
      from_year: Number(t.from), to_year: Number(t.to), rate_pct: Number(t.rate_pct),
    }));
    onSave(sched, newTiers);
  }

  return (
    <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
      <div className="text-xs font-semibold mb-2">New Schedule</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="Schedule Name">
          <input className={FIELD_INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Heaped Standard" />
        </Field>
        <Field label="Type">
          <select className={FIELD_INPUT} value={type} onChange={(e) => setType(e.target.value as ScheduleType)}>
            <option value="heaped">heaped</option>
            <option value="flat">flat</option>
            <option value="level">level</option>
          </select>
        </Field>
        <Field label="State (blank for standard)">
          <input className={FIELD_INPUT} value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} placeholder="e.g., NY" />
        </Field>
        <Field label="Effective From">
          <input type="date" className={FIELD_INPUT} value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
        </Field>
        <Field label="Effective To (blank for current)">
          <input type="date" className={FIELD_INPUT} value={effTo} onChange={(e) => setEffTo(e.target.value)} />
        </Field>
        <Field label="Default">
          <label className="inline-flex items-center gap-2 text-xs h-7">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default schedule for this product
          </label>
        </Field>
        <div className="col-span-2">
          <Field label="Notes">
            <input className={FIELD_INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-black/50 mb-1">Rate Tiers</div>
        <table className="w-full text-xs">
          <thead className="text-black/50">
            <tr>
              <th className="text-left font-medium pb-1 pr-2">From Year</th>
              <th className="text-left font-medium pb-1 pr-2">To Year</th>
              <th className="text-left font-medium pb-1 pr-2">Rate %</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tierRows.map((t, i) => (
              <tr key={i}>
                <td className="pr-2 py-1"><input type="number" className={`${FIELD_INPUT} w-20`} value={t.from} onChange={(e) => updTier(i, { from: Number(e.target.value) })} /></td>
                <td className="pr-2 py-1"><input type="number" className={`${FIELD_INPUT} w-20`} value={t.to} onChange={(e) => updTier(i, { to: Number(e.target.value) })} /></td>
                <td className="pr-2 py-1"><input type="number" step="0.01" className={`${FIELD_INPUT} w-24`} value={t.rate_pct} onChange={(e) => updTier(i, { rate_pct: Number(e.target.value) })} /></td>
                <td className="py-1"><button onClick={() => rmTier(i)} className="text-black/40 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addTier} className="mt-1 text-[11px] text-[#0a3d3e] underline hover:no-underline">+ Add Tier</button>
      </div>

      <div className="flex gap-2 mt-3">
        <Btn variant="primary" onClick={submit}>Save Schedule</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function NewConstraintForm({
  productId, onCancel, onSave,
}: {
  productId: string;
  onCancel: () => void;
  onSave: (c: CarrierConstraint) => void;
}) {
  const [siMax, setSiMax] = useState("500000");
  const [increment, setIncrement] = useState("25000");
  const [tierFloor, setTierFloor] = useState("100000");
  const [roundThreshold, setRoundThreshold] = useState("10000");
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effTo, setEffTo] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [lastVerified, setLastVerified] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    const id = `cc_new_${Date.now()}`;
    onSave({
      id, carrier_product_id: productId,
      si_max_cents: Math.round(Number(siMax) * 100),
      increment: Math.round(Number(increment) * 100),
      tier_floor_cents: Math.round(Number(tierFloor) * 100),
      round_preference_threshold_cents: Math.round(Number(roundThreshold) * 100),
      spouse_max_face_cents: null,
      child_max_face_cents: null,
      effective_from: effFrom,
      effective_to: effTo || null,
      verified_by: verifiedBy,
      last_verified: lastVerified,
      source, notes,
    });
  }

  const dollarHint = "Enter in dollars; stored as integer cents per schema.";

  return (
    <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
      <div className="text-xs font-semibold mb-2">New Constraint</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="SI Maximum ($)">
          <input type="number" className={FIELD_INPUT} value={siMax} onChange={(e) => setSiMax(e.target.value)} title={dollarHint} />
        </Field>
        <Field label="Increment ($)">
          <input type="number" className={FIELD_INPUT} value={increment} onChange={(e) => setIncrement(e.target.value)} title={dollarHint} />
        </Field>
        <Field label="Tier Floor ($)">
          <input type="number" className={FIELD_INPUT} value={tierFloor} onChange={(e) => setTierFloor(e.target.value)} title={dollarHint} />
        </Field>
        <Field label="Round Preference Threshold ($)">
          <input type="number" className={FIELD_INPUT} value={roundThreshold} onChange={(e) => setRoundThreshold(e.target.value)} title={dollarHint} />
        </Field>
        <Field label="Effective From">
          <input type="date" className={FIELD_INPUT} value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
        </Field>
        <Field label="Effective To">
          <input type="date" className={FIELD_INPUT} value={effTo} onChange={(e) => setEffTo(e.target.value)} />
        </Field>
        <Field label="Verified By">
          <input className={FIELD_INPUT} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
        </Field>
        <Field label="Last Verified">
          <input type="date" className={FIELD_INPUT} value={lastVerified} onChange={(e) => setLastVerified(e.target.value)} />
        </Field>
        <Field label="Source">
          <input className={FIELD_INPUT} value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input className={FIELD_INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        <Btn variant="primary" onClick={submit}>Save Constraint</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function NewRiderForm({
  productId, onCancel, onSave,
}: {
  productId: string;
  onCancel: () => void;
  onSave: (r: CarrierRiderAvailability) => void;
}) {
  const [state, setState] = useState("NY");
  const [riderCode, setRiderCode] = useState("");
  const [riderFullName, setRiderFullName] = useState("");
  const [available, setAvailable] = useState<RiderAvailability>("available");
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effTo, setEffTo] = useState("");
  const [lastVerified, setLastVerified] = useState(new Date().toISOString().slice(0, 10));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [sourceDoc, setSourceDoc] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!riderCode.trim()) return;
    const id = `cra_new_${Date.now()}`;
    onSave({
      id, carrier_product_id: productId,
      state, rider_code: riderCode.trim(), rider_full_name: riderFullName,
      available,
      effective_from: effFrom, effective_to: effTo || null,
      last_verified: lastVerified, verified_by: verifiedBy,
      source_document: sourceDoc, notes,
    });
  }

  return (
    <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
      <div className="text-xs font-semibold mb-2">New Rider Row</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="State">
          <select className={FIELD_INPUT} value={state} onChange={(e) => setState(e.target.value)}>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Rider Code">
          <input className={FIELD_INPUT} value={riderCode} onChange={(e) => setRiderCode(e.target.value)} placeholder="e.g., LTC" />
        </Field>
        <Field label="Rider Name">
          <input className={FIELD_INPUT} value={riderFullName} onChange={(e) => setRiderFullName(e.target.value)} placeholder="e.g., Long-Term Care Rider" />
        </Field>
        <Field label="Availability">
          <select className={FIELD_INPUT} value={available} onChange={(e) => setAvailable(e.target.value as RiderAvailability)}>
            <option value="available">available</option>
            <option value="not_available">not_available</option>
            <option value="requires_state_proposal">requires_state_proposal</option>
          </select>
        </Field>
        <Field label="Effective From">
          <input type="date" className={FIELD_INPUT} value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
        </Field>
        <Field label="Effective To">
          <input type="date" className={FIELD_INPUT} value={effTo} onChange={(e) => setEffTo(e.target.value)} />
        </Field>
        <Field label="Last Verified">
          <input type="date" className={FIELD_INPUT} value={lastVerified} onChange={(e) => setLastVerified(e.target.value)} />
        </Field>
        <Field label="Verified By">
          <input className={FIELD_INPUT} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
        </Field>
        <Field label="Source Document">
          <input className={FIELD_INPUT} value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input className={FIELD_INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        <Btn variant="primary" onClick={submit}>Save Rider Row</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}
