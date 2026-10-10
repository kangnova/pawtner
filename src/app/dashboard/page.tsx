import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockInfo, isExpiringSoon, EXPIRY_SOON_DAYS } from "@/lib/stock";
import { isDue } from "@/lib/subscription";
import {
  startOfDay,
  dailyRevenue,
  sumTotals,
  topProducts,
} from "@/lib/stats";
import RevenueChart from "./revenue-chart";
import SignOutButton from "../products/sign-out";

export const dynamic = "force-dynamic";

const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const toRp = (n: number) => n.toLocaleString("id-ID");

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const now = new Date();
  const startToday = startOfDay(now);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sales, topGroups, products, subscriptions] = await Promise.all([
    prisma.sale.findMany({
      where: { storeId, status: "PAID", createdAt: { gte: startMonth } },
      select: { createdAt: true, total: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { storeId, status: "PAID" } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { storeId },
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
    prisma.subscription.findMany({
      where: { storeId },
      select: { id: true, status: true, nextRunAt: true },
    }),
  ]);

  const totals = sales.map((s) => Number(s.total));
  const monthRevenue = sumTotals(totals);
  const todayRevenue = sumTotals(
    sales.filter((s) => s.createdAt >= startToday).map((s) => Number(s.total))
  );
  const todayOrders = sales.filter((s) => s.createdAt >= startToday).length;

  const chart = dailyRevenue(
    sales.map((s) => ({ createdAt: s.createdAt, total: Number(s.total) })),
    7,
    now
  ).map((b) => ({
    label: WEEKDAY_SHORT[b.date.getDay()],
    value: Math.round(b.revenue),
  }));

  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const top = topProducts(
    topGroups.map((g) => ({
      productId: g.productId,
      quantity: g._sum.quantity ?? 0,
    })),
    5
  ).map((t) => ({ name: nameById.get(t.productId) ?? "—", quantity: t.quantity }));

  const lowStock = products
    .map((p) => ({
      name: p.name,
      info: stockInfo(p.batches, p.minStockThreshold, now),
      threshold: p.minStockThreshold,
    }))
    .filter((p) => p.info.status !== "ok")
    .map((p) => ({ name: p.name, sellable: p.info.sellable, threshold: p.threshold }));

  const expiringSoon = products
    .flatMap((p) =>
      p.batches
        .filter((b) => isExpiringSoon(b, now))
        .map((b) => ({
          product: p.name,
          quantity: b.quantity,
          expiry: b.expiryDate!,
        }))
    )
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime());

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const dueSubs = subscriptions.filter((s) =>
    isDue(s.nextRunAt, s.status, now)
  ).length;

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
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
          <Link href="/sales" className="text-sm text-neutral-600 underline">
            Sales
          </Link>
          <Link href="/subscriptions" className="text-sm text-neutral-600 underline">
            Langganan
          </Link>
          <SignOutButton />
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded p-4">
          <p className="text-sm text-neutral-500">Omzet hari ini</p>
          <p className="text-2xl font-semibold mt-1">Rp {toRp(todayRevenue)}</p>
          <p className="text-xs text-neutral-400 mt-1">{todayOrders} penjualan</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-neutral-500">Omzet bulan ini</p>
          <p className="text-2xl font-semibold mt-1">Rp {toRp(monthRevenue)}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-neutral-500">Langganan aktif</p>
          <p className="text-2xl font-semibold mt-1">{activeSubs}</p>
          {dueSubs > 0 && (
            <p className="text-xs text-green-700 mt-1">{dueSubs} kirim hari ini</p>
          )}
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-neutral-500">Stok menipis</p>
          <p className="text-2xl font-semibold mt-1">{lowStock.length}</p>
        </div>
      </section>

      <section className="mt-6">
        <RevenueChart data={chart} />
      </section>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Produk terlaris</h2>
          {top.length === 0 ? (
            <p className="text-sm text-neutral-400">Belum ada penjualan.</p>
          ) : (
            <ul className="border rounded divide-y">
              {top.map((t, i) => (
                <li key={i} className="p-3 flex justify-between text-sm">
                  <span className="text-neutral-700">{t.name}</span>
                  <span className="font-medium">{t.quantity} terjual</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Stok menipis / habis</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-neutral-400">Semua stok aman.</p>
          ) : (
            <ul className="border rounded divide-y">
              {lowStock.map((p, i) => (
                <li key={i} className="p-3 flex justify-between text-sm">
                  <span className="text-neutral-700">{p.name}</span>
                  <span className={p.sellable <= 0 ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                    {p.sellable} / min {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-lg font-medium mt-6 mb-2">
            Kadaluarsa &le; {EXPIRY_SOON_DAYS} hari
          </h2>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-neutral-400">Tidak ada stok mau kadaluarsa.</p>
          ) : (
            <ul className="border rounded divide-y">
              {expiringSoon.map((b, i) => (
                <li key={i} className="p-3 flex justify-between text-sm">
                  <span className="text-neutral-700">{b.product}</span>
                  <span className="text-amber-600 font-medium">
                    {b.quantity} · {b.expiry.toLocaleDateString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
