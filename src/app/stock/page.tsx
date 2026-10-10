import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isExpired, isExpiringSoon, stockInfo } from "@/lib/stock";
import StockInForm from "./stock-in-form";
import SignOutButton from "../products/sign-out";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const MSG_DAYS = 30;

export default async function StockPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");

  const now = new Date();

  const [products, batches] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.user.storeId },
      select: { id: true, name: true, unit: true, minStockThreshold: true, batches: { select: { quantity: true, expiryDate: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { product: { storeId: session.user.storeId } },
      include: { product: { select: { id: true, name: true, unit: true } } },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const lowOrOut = products
    .map((p) => ({ p, info: stockInfo(p.batches, p.minStockThreshold, now) }))
    .filter(({ info }) => info.status !== "ok")
    .sort((a, b) => a.p.name.localeCompare(b.p.name));

  const expiring = batches
    .filter((b) => isExpiringSoon(b, now, MSG_DAYS))
    .map((b) => ({ b, daysLeft: Math.ceil((b.expiryDate!.getTime() - now.getTime()) / DAY_MS) }));

  const expired = batches.filter((b) => isExpired(b, now));

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock In</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-neutral-600 underline">
            Dashboard
          </Link>
          <Link href="/products" className="text-sm text-neutral-600 underline">
            Products
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

      <StockInForm
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
      />

      {(lowOrOut.length > 0 || expiring.length > 0 || expired.length > 0) && (
        <section className="mt-8 space-y-3">
          {lowOrOut.length > 0 && (
            <div className="border rounded p-3 bg-amber-50 border-amber-200">
              <p className="text-sm font-medium text-amber-800">
                Stok menipis / habis ({lowOrOut.length})
              </p>
              <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                {lowOrOut.map(({ p, info }) => (
                  <li key={p.id}>
                    {p.name} — {info.sellable} tersedia (min {p.minStockThreshold})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="border rounded p-3 bg-orange-50 border-orange-200">
              <p className="text-sm font-medium text-orange-800">
                Segera kadaluarsa (&le; {MSG_DAYS} hari)
              </p>
              <ul className="mt-1 text-sm text-orange-700 list-disc list-inside">
                {expiring.map(({ b, daysLeft }) => (
                  <li key={b.id}>
                    {b.product.name} — {b.quantity} {b.product.unit} · {daysLeft} hari lagi
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expired.length > 0 && (
            <div className="border rounded p-3 bg-red-50 border-red-200">
              <p className="text-sm font-medium text-red-800">
                Sudah kadaluarsa (buang / tulis-off)
              </p>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {expired.map((b) => (
                  <li key={b.id}>
                    {b.product.name} — {b.quantity} {b.product.unit} · exp {b.expiryDate!.toLocaleDateString("id-ID")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <h2 className="mt-8 mb-2 text-lg font-medium">Batches ({batches.length})</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="p-2">Product</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Expiry</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const expiredBatch = isExpired(b, now);
            const soon = !expiredBatch && isExpiringSoon(b, now, MSG_DAYS);
            return (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.product.name}</td>
                <td className="p-2">
                  {b.quantity} {b.product.unit}
                </td>
                <td className="p-2">
                  {b.expiryDate ? b.expiryDate.toLocaleDateString("id-ID") : "—"}
                </td>
                <td className="p-2">
                  {expiredBatch ? (
                    <span className="text-red-600 font-medium">Expired</span>
                  ) : soon ? (
                    <span className="text-orange-600 font-medium">Expiring soon</span>
                  ) : (
                    <span className="text-neutral-500">OK</span>
                  )}
                </td>
              </tr>
            );
          })}
          {batches.length === 0 && (
            <tr>
              <td className="p-2 text-neutral-400" colSpan={4}>
                Belum ada stok masuk. Isi form di atas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
