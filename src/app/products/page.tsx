import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockInfo } from "@/lib/stock";
import ProductForm from "./product-form";
import SignOutButton from "./sign-out";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");

  const products = await prisma.product.findMany({
    where: { storeId: session.user.storeId },
    include: { batches: true },
    orderBy: { name: "asc" },
  });

  const rows = products.map((p) => ({
    ...p,
    stock: stockInfo(p.batches, p.minStockThreshold),
  }));

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex items-center gap-4">
          <Link href="/stock" className="text-sm text-neutral-600 underline">
            Stock In
          </Link>
          <Link href="/customers" className="text-sm text-neutral-600 underline">
            Customers
          </Link>
          <Link href="/sales" className="text-sm text-neutral-600 underline">
            Sales
          </Link>
          <Link href="/subscriptions" className="text-sm text-neutral-600 underline">
            Langganan
          </Link>
          <SignOutButton />
        </div>
      </div>
      <ProductForm />
      <h2 className="mt-8 mb-2 text-lg font-medium">Catalog ({rows.length})</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Unit</th>
            <th className="p-2">Price</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const s = p.stock;
            return (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.unit}</td>
                <td className="p-2">Rp {Number(p.price).toLocaleString()}</td>
                <td className="p-2">
                  {s.sellable}
                  {s.expired > 0 && (
                    <span className="text-red-600"> (+{s.expired} expired)</span>
                  )}
                </td>
                <td className="p-2">
                  {s.status === "out" && (
                    <span className="text-red-600 font-medium">Out of stock</span>
                  )}
                  {s.status === "low" && (
                    <span className="text-amber-600 font-medium">Low stock</span>
                  )}
                  {s.status === "ok" && s.expiringSoon > 0 && (
                    <span className="text-orange-600 font-medium">Expiring soon</span>
                  )}
                  {s.status === "ok" && s.expiringSoon === 0 && (
                    <span className="text-neutral-500">OK</span>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="p-2 text-neutral-400" colSpan={5}>No products yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
