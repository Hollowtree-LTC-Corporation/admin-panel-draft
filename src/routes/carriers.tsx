import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  PageHeader, TableShell, TRow, TCell, Btn, SectionTitle, ProductBadge, Pill,
  Drawer, Field,
} from "@/components/wireframe/Bits";
import {
  CARRIERS, CARRIER_PRODUCTS, CARRIER_COMMISSION_SCHEDULES, COMMISSION_RATE_TIERS,
  formatCents,
  type Carrier, type CarrierProduct, type CarrierCommissionSchedule, type ScheduleType,
} from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";
import { FilterRow, FilterSearch, ClearFiltersLink, SortableTHead, useSort } from "@/components/wireframe/Filters";

export const Route = createFileRoute("/carriers")({ component: View });

type SortKey = "name" | "carrier_code" | "status" | "carrier_products_count";
type ProdSortKey = "name" | "product_code" | "carrier_name" | "schedules_count" | "default_schedule";

const FIELD_INPUT = "w-full px-2 py-1 text-sm border border-black/15 rounded";

function StatusPill({ status }: { status: "active" | "inactive" }) {
  return <Pill tone={status === "active" ? "ok" : "neutral"}>{status}</Pill>;
}

function TypePill({ type }: { type: ScheduleType }) {
  const tone = type === "heaped" ? "info" : type === "flat" ? "ok" : "neutral";
  return <Pill tone={tone}>{type}</Pill>;
}

function View() {
  const { product } = useStore();
  const can = usePermission();

  // Local state — all mutations are in-memory only.
  const [carriers, setCarriers] = useState<Carrier[]>(() => CARRIERS);
  const [products, setProducts] = useState<CarrierProduct[]>(() => CARRIER_PRODUCTS);
  const [schedules, setSchedules] = useState<CarrierCommissionSchedule[]>(() => CARRIER_COMMISSION_SCHEDULES);
  const [tiers, setTiers] = useState(() => COMMISSION_RATE_TIERS);

  const [search, setSearch] = useState("");
  const sort = useSort<SortKey>("name", "asc");
  const prodSort = useSort<ProdSortKey>("name", "asc");

  // Carriers shown in the list view: only active for the current product mode.
  const visibleCarriers = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = carriers
      .filter((c) => c.product === product && c.status === "active")
      .map((c) => ({
        ...c,
        carrier_products_count: products.filter((p) => p.carrier_id === c.id && p.status === "active").length,
      }))
      .filter((c) => !s || c.name.toLowerCase().includes(s) || c.carrier_code.toLowerCase().includes(s));
    return sort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [carriers, products, search, product, sort]);

  // Master-detail: selected carrier (auto-select first when list changes).
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

  // Products filtered by selected carrier; if none selected, show all active products for this product mode.
  const visibleProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    const carrierIds = new Set(
      carriers.filter((c) => c.product === product && c.status === "active").map((c) => c.id)
    );
    const rows = products
      .filter((p) => carrierIds.has(p.carrier_id) && p.status === "active")
      .filter((p) => (selectedCarrierId ? p.carrier_id === selectedCarrierId : true))
      .map((p) => {
        const car = carriers.find((c) => c.id === p.carrier_id);
        const prodSchedules = schedules.filter((s2) => s2.carrier_product_id === p.id);
        const def = prodSchedules.find((s2) => s2.is_default);
        return {
          ...p,
          carrier_name: car?.name ?? "",
          schedules_count: prodSchedules.length,
          default_schedule: def?.schedule_name ?? "",
        };
      })
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.product_code.toLowerCase().includes(s) || p.carrier_name.toLowerCase().includes(s));
    return prodSort.applySort(rows, (r, k) => (r as unknown as Record<string, string | number>)[k]);
  }, [products, carriers, schedules, selectedCarrierId, search, product, prodSort]);

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
      id, name: "", product, carrier_code: "", contact_name: "", contact_email: "",
      contact_phone: "", website: "", status: "active", notes: "",
    });
    setShowNewCarrier(true);
  }
  function saveNewCarrier() {
    if (!newCarrierDraft || !newCarrierDraft.name.trim()) return;
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
      id, carrier_id: selectedCarrier.id, name: "", product_code: "",
      product_type: product === "DI" ? "disability" : "universal_life",
      state_availability: "All states",
      si_max_cents: product === "LTC" ? 25000000 : null,
      si_increment_cents: product === "LTC" ? 250000 : null,
      status: "active",
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
    if (!productDraft || !productDraft.name.trim()) return;
    if (drawerMode === "create") {
      setProducts((ps) => [...ps, productDraft]);
    } else {
      setProducts((ps) => ps.map((p) => (p.id === productDraft.id ? productDraft : p)));
    }
    setDrawerProduct(productDraft);
    setDrawerMode("view");
    setProductEditing(false);
  }

  const newCarrierLabel = product === "DI" ? "+ New Carrier" : "+ New Carrier";

  return (
    <div>
      <PageHeader
        title="Carriers & Products"
        subtitle={`${visibleCarriers.length} active carriers · ${visibleProducts.length} ${selectedCarrier ? "products for " + selectedCarrier.name : "products shown"}`}
        actions={
          <Btn variant="primary" disabled={!can("carriers", "create")} onClick={startNewCarrier}>
            {newCarrierLabel}
          </Btn>
        }
      />

      <FilterRow>
        <FilterSearch value={search} onChange={setSearch} placeholder="Search carrier, code, or product…" />
        <ClearFiltersLink show={activeFilters} onClick={clearAll} />
      </FilterRow>

      {/* New carrier inline form */}
      {showNewCarrier && newCarrierDraft ? (
        <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
          <div className="text-xs font-semibold mb-2">New Carrier</div>
          <CarrierFormFields
            value={newCarrierDraft}
            onChange={(v) => setNewCarrierDraft(v)}
            productLocked={product}
          />
          <div className="flex gap-2 mt-3">
            <Btn variant="primary" onClick={saveNewCarrier}>Save Carrier</Btn>
            <Btn variant="ghost" onClick={() => { setShowNewCarrier(false); setNewCarrierDraft(null); }}>Cancel</Btn>
          </div>
        </div>
      ) : null}

      <TableShell>
        <SortableTHead<SortKey>
          cols={[
            { key: "name", label: "Carrier" },
            { key: "carrier_code", label: "Code" },
            { key: "status", label: "Status" },
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
                    {c.name}
                  </span>
                </TCell>
                <TCell className="text-black/60 text-[11px] font-mono">{c.carrier_code}</TCell>
                <TCell><StatusPill status={c.status} /></TCell>
                <TCell>{c.carrier_products_count}</TCell>
              </tr>
            );
          })}
          {visibleCarriers.length === 0 ? (
            <TRow><TCell className="text-black/50 italic" >No active carriers for {product}.</TCell></TRow>
          ) : null}
        </tbody>
      </TableShell>

      {/* Carrier detail panel */}
      {selectedCarrier ? (
        <div className="mt-3 bg-white border border-black/10 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{selectedCarrier.name}</h3>
              <ProductBadge product={selectedCarrier.product} />
              <StatusPill status={selectedCarrier.status} />
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
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Field label="Code"><span className="font-mono text-xs">{selectedCarrier.carrier_code}</span></Field>
              <Field label="Status">{selectedCarrier.status}</Field>
              <Field label="Website">{selectedCarrier.website || "—"}</Field>
              <Field label="Contact">{selectedCarrier.contact_name || "—"}</Field>
              <Field label="Email">{selectedCarrier.contact_email || "—"}</Field>
              <Field label="Phone">{selectedCarrier.contact_phone || "—"}</Field>
              <div className="col-span-3">
                <Field label="Notes">{selectedCarrier.notes || "—"}</Field>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <SectionTitle>
        {selectedCarrier ? `Carrier Products for ${selectedCarrier.name}` : "Carrier Products"}
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
            { key: "name", label: "Product Name" },
            { key: "product_code", label: "Code" },
            ...(selectedCarrier ? [] : [{ key: "carrier_name" as ProdSortKey, label: "Carrier" }]),
            ...(product === "LTC"
              ? [
                  { key: "schedules_count" as ProdSortKey, label: "# Schedules" },
                  { key: "default_schedule" as ProdSortKey, label: "Default Schedule" },
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
              <TCell className="font-medium">{p.name}</TCell>
              <TCell className="font-mono text-[11px] text-black/60">{p.product_code}</TCell>
              {!selectedCarrier ? <TCell>{p.carrier_name}</TCell> : null}
              {product === "LTC" ? (
                <>
                  <TCell>{p.schedules_count}</TCell>
                  <TCell className="text-black/70">{p.default_schedule || "—"}</TCell>
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
        title={drawerMode === "create" ? "New Carrier Product" : (drawerProduct?.name ?? "")}
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
            onAddSchedule={(s, newTiers) => {
              setSchedules((all) => [...all, s]);
              setTiers((all) => [...all, ...newTiers]);
            }}
            mode={drawerMode}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

function CarrierFormFields({
  value, onChange, productLocked,
}: {
  value: Carrier;
  onChange: (v: Carrier) => void;
  productLocked?: "DI" | "LTC";
}) {
  function set<K extends keyof Carrier>(k: K, v: Carrier[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
      <Field label="Carrier Name">
        <input className={FIELD_INPUT} value={value.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Code">
        <input className={FIELD_INPUT} value={value.carrier_code} onChange={(e) => set("carrier_code", e.target.value)} />
      </Field>
      <Field label="Status">
        <select className={FIELD_INPUT} value={value.status} onChange={(e) => set("status", e.target.value as Carrier["status"])}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </Field>
      <Field label="Contact">
        <input className={FIELD_INPUT} value={value.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={FIELD_INPUT} value={value.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
      </Field>
      <Field label="Phone">
        <input className={FIELD_INPUT} value={value.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
      </Field>
      <Field label="Website">
        <input className={FIELD_INPUT} value={value.website} onChange={(e) => set("website", e.target.value)} />
      </Field>
      {productLocked ? (
        <Field label="Product"><span className="text-xs text-black/60">{productLocked} (current view)</span></Field>
      ) : (
        <Field label="Product"><span className="text-xs text-black/60">{value.product}</span></Field>
      )}
      <div />
      <div className="col-span-3">
        <Field label="Notes">
          <textarea
            className={`${FIELD_INPUT} min-h-[60px]`}
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function ProductDrawerBody({
  product, draft, onDraftChange, editing, onEdit, onSave, onCancel, productMode,
  carriers, schedules, tiers, onAddSchedule, mode,
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
  onAddSchedule: (s: CarrierCommissionSchedule, tiers: typeof COMMISSION_RATE_TIERS) => void;
  mode: "view" | "create";
}) {
  const car = carriers.find((c) => c.id === draft.carrier_id);
  function set<K extends keyof CarrierProduct>(k: K, v: CarrierProduct[K]) {
    onDraftChange({ ...draft, [k]: v });
  }

  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showNewSchedule, setShowNewSchedule] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between -mt-1">
        <div className="text-xs text-black/60">
          {car?.name} · <ProductBadge product={productMode} />
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
              <input className={FIELD_INPUT} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Code">
              <input className={FIELD_INPUT} value={draft.product_code} onChange={(e) => set("product_code", e.target.value)} />
            </Field>
            <Field label="Type">
              <select className={FIELD_INPUT} value={draft.product_type} onChange={(e) => set("product_type", e.target.value as CarrierProduct["product_type"])}>
                <option value="universal_life">universal_life</option>
                <option value="group_life">group_life</option>
                <option value="term_life">term_life</option>
                <option value="disability">disability</option>
                <option value="other">other</option>
              </select>
            </Field>
            <Field label="Line of Business">
              <span className="text-xs text-black/60">{productMode}</span>
            </Field>
            <Field label="State Availability">
              <input className={FIELD_INPUT} value={draft.state_availability} onChange={(e) => set("state_availability", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={FIELD_INPUT} value={draft.status} onChange={(e) => set("status", e.target.value as CarrierProduct["status"])}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </Field>
            {productMode === "LTC" ? (
              <>
                <Field label="SI Maximum">
                  <input
                    type="number"
                    className={FIELD_INPUT}
                    value={draft.si_max_cents ? draft.si_max_cents / 100 : ""}
                    onChange={(e) => set("si_max_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)}
                  />
                </Field>
                <Field label="SI Increment">
                  <input
                    type="number"
                    className={FIELD_INPUT}
                    value={draft.si_increment_cents ? draft.si_increment_cents / 100 : ""}
                    onChange={(e) => set("si_increment_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)}
                  />
                </Field>
              </>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Product Name">{product.name}</Field>
            <Field label="Code"><span className="font-mono text-xs">{product.product_code}</span></Field>
            <Field label="Type">{product.product_type}</Field>
            <Field label="Line of Business">{productMode}</Field>
            <Field label="State Availability">{product.state_availability}</Field>
            <Field label="Status">{product.status}</Field>
            {productMode === "LTC" ? (
              <>
                <Field label="SI Maximum">{product.si_max_cents != null ? formatCents(product.si_max_cents) : "—"}</Field>
                <Field label="SI Increment">{product.si_increment_cents != null ? formatCents(product.si_increment_cents) : "—"}</Field>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Section 2: Commission Schedules — LTC only, not while creating */}
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
              productName={product.name}
              onCancel={() => setShowNewSchedule(false)}
              onSave={(s, t) => { onAddSchedule(s, t); setShowNewSchedule(false); }}
            />
          ) : null}

          <div className="bg-white border border-black/10 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#f7f3eb] text-[10px] uppercase tracking-wider text-black/60">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Schedule</th>
                  <th className="text-left font-medium px-3 py-2">Type</th>
                  <th className="text-left font-medium px-3 py-2">State</th>
                  <th className="text-left font-medium px-3 py-2">Default</th>
                  <th className="text-left font-medium px-3 py-2">Effective From</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-3 text-black/50 italic">No schedules yet.</td></tr>
                ) : null}
                {schedules.map((s) => {
                  const expanded = expandedScheduleId === s.id;
                  const sTiers = tiers.filter((t) => t.schedule_id === s.id).sort((a, b) => a.year_from - b.year_from);
                  return (
                    <>
                      <tr
                        key={s.id}
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
                        <td className="px-3 py-2">{s.effective_to ? <Pill tone="neutral">Expired</Pill> : <Pill tone="ok">Current</Pill>}</td>
                      </tr>
                      {expanded ? (
                        <tr key={s.id + "_exp"} className="bg-[#f7f3eb]/40">
                          <td colSpan={6} className="px-3 py-3">
                            <div className="text-[10px] uppercase tracking-wider text-black/50 mb-2">Rate Tiers</div>
                            <table className="text-xs">
                              <thead>
                                <tr className="text-black/50">
                                  <th className="text-left font-medium pr-8 pb-1">Year Band</th>
                                  <th className="text-left font-medium pb-1">Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sTiers.map((t) => (
                                  <tr key={t.id}>
                                    <td className="pr-8 py-0.5">
                                      {t.year_from === t.year_to
                                        ? `Year ${t.year_from}`
                                        : t.year_to >= 99
                                          ? `Year ${t.year_from}+`
                                          : `Year ${t.year_from}-${t.year_to}`}
                                    </td>
                                    <td className="py-0.5 font-mono">{t.pct.toFixed(2)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
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
  const [tierRows, setTierRows] = useState<Array<{ from: number; to: number; pct: number }>>([
    { from: 1, to: 1, pct: 100 },
    { from: 2, to: 10, pct: 5 },
  ]);

  function addTier() { setTierRows((r) => [...r, { from: 1, to: 1, pct: 0 }]); }
  function rmTier(i: number) { setTierRows((r) => r.filter((_, idx) => idx !== i)); }
  function updTier(i: number, patch: Partial<{ from: number; to: number; pct: number }>) {
    setTierRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit() {
    if (!name.trim()) return;
    const id = `ccs_new_${Date.now()}`;
    const sched: CarrierCommissionSchedule = {
      id, carrier_product_id: productId, carrier_product_name: productName,
      state_code: stateCode.trim() || null, schedule_name: name.trim(),
      schedule_type: type, is_default: isDefault, effective_from: effFrom, effective_to: null,
    };
    const newTiers = tierRows.map((t, i) => ({
      id: `${id}_t${i}`, schedule_id: id, year_from: Number(t.from), year_to: Number(t.to), pct: Number(t.pct),
    }));
    onSave(sched, newTiers);
  }

  return (
    <div className="mb-3 bg-[#f7f3eb] border border-black/10 rounded-md p-3">
      <div className="text-xs font-semibold mb-2">New Schedule</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="Schedule Name">
          <input className={FIELD_INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Heaped, Flat, Level" />
        </Field>
        <Field label="Type">
          <select className={FIELD_INPUT} value={type} onChange={(e) => setType(e.target.value as ScheduleType)}>
            <option value="heaped">heaped</option>
            <option value="flat">flat</option>
            <option value="level">level</option>
          </select>
        </Field>
        <Field label="State Code (blank for standard)">
          <input className={FIELD_INPUT} value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} placeholder="e.g., NY" />
        </Field>
        <Field label="Effective From">
          <input type="date" className={FIELD_INPUT} value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default schedule for this product
          </label>
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
                <td className="pr-2 py-1"><input type="number" step="0.01" className={`${FIELD_INPUT} w-24`} value={t.pct} onChange={(e) => updTier(i, { pct: Number(e.target.value) })} /></td>
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
