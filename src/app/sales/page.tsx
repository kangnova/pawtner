import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockInfo } from "@/lib/stock";
import PosForm from "./pos-form";
import SignOutButton from "../products/sign-out";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  EWALLET: "E-Wallet",
  COD: "COD",
};

export default async function SalesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");

  const [products, customers, sales] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.user.storeId },
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { storeId: session.user.storeId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.sale.findMany({
      where: { storeId: session.user.storeId },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    price: Number(p.price),
    sellable: stockInfo(p.batches, p.minStockThreshold).sellable,
  }));

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales (Kasir)</h1>
        <div className="flex items-center gap-4">
          <Link href="/products" className="text-sm text-neutral-600 underline">
            Products
          </Link>
          <Link href="/stock" className="text-sm text-neutral-600 underline">
            Stock In
          </Link>
          <Link href="/customers" className="text-sm text-neutral-600 underline">
            Customers
          </Link>
          <Link href="/subscriptions" className="text-sm text-neutral-600 underline">
            Langganan
          </Link>
          <SignOutButton />
        </div>
      </div>

      <PosForm products={productOptions} customers={customers} />

      <h2 className="mt-8 mb-2 text-lg font-medium">
        History ({sales.length})
      </h2>
      {sales.length === 0 ? (
        <p className="text-sm text-neutral-400">Belum ada penjualan.</p>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="p-2">Invoice</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Items</th>
              <th className="p-2">Payment</th>
              <th className="p-2">Total</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-2 font-mono text-xs">{s.invoiceNumber}</td>
                <td className="p-2">{s.customer?.name ?? "—"}</td>
                <td className="p-2">
                  {s.items
                    .map((it) => `${it.quantity}× ${it.product.name}`)
                    .join(", ")}
                </td>
                <td className="p-2">
                  {PAYMENT_LABEL[s.paymentMethod ?? ""] ?? s.paymentMethod}
                </td>
                <td className="p-2">
                  Rp {Number(s.total).toLocaleString("id-ID")}
                </td>
                <td className="p-2">
                  <Link
                    href={`/sales/${s.id}`}
                    className="text-neutral-600 underline"
                  >
                    Struk
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
