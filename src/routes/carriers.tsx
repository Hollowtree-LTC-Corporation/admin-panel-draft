import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, TableShell, THead, TRow, TCell, Btn, SectionTitle, ProductBadge } from "@/components/wireframe/Bits";
import { CARRIERS, CARRIER_PRODUCTS } from "@/lib/wireframe/data";
import { usePermission, useStore } from "@/lib/wireframe/store";

export const Route = createFileRoute("/carriers")({ component: View });

function View() {
  const { product } = useStore();
  const can = usePermission();
  const carriers = CARRIERS.filter((c) => c.product === product);

  return (
    <div>
      <PageHeader
        title="Carriers & Products"
        subtitle="Reference data for carrier + carrier_product"
        actions={<Btn variant="primary" disabled={!can("carriers", "create")}>+ New Carrier</Btn>}
      />
      <TableShell>
        <THead cols={["Carrier", "Product", "# Carrier Products"]} />
        <tbody>
          {carriers.map((c) => (
            <TRow key={c.id}>
              <TCell className="font-medium">{c.name}</TCell>
              <TCell><ProductBadge product={c.product} /></TCell>
              <TCell>{CARRIER_PRODUCTS.filter((p) => p.carrier_id === c.id).length}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>

      <SectionTitle>Carrier Products</SectionTitle>
      <div className="flex justify-end mb-2"><Btn variant="primary" disabled={!can("carrier_products", "create")}>+ New Carrier Product</Btn></div>
      <TableShell>
        <THead cols={["Product Name", "Carrier"]} />
        <tbody>
          {CARRIER_PRODUCTS.filter((p) => carriers.some((c) => c.id === p.carrier_id)).map((p) => (
            <TRow key={p.id}>
              <TCell className="font-medium">{p.name}</TCell>
              <TCell>{CARRIERS.find((c) => c.id === p.carrier_id)?.name}</TCell>
            </TRow>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
