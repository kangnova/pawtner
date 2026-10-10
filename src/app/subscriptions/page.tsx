import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDue, discountedUnitPrice } from "@/lib/subscription";
import SubscriptionForm from "./subscription-form";
import SubscriptionActions from "./subscription-actions";
import SignOutButton from "../products/sign-out";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  PAUSED: "Jeda",
  CANCELLED: "Batal",
};

export default async function SubscriptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");

  const [subs, products, customers] = await Promise.all([
    prisma.subscription.findMany({
      where: { storeId: session.user.storeId },
      include: {
        customer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, unit: true, price: true } },
      },
      orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
    }),
    prisma.product.findMany({
      where: { storeId: session.user.storeId },
      select: { id: true, name: true, unit: true, price: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { storeId: session.user.storeId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const rows = subs.map((s) => ({
    ...s,
    due: isDue(s.nextRunAt, s.status, now),
    discountedUnitPrice: discountedUnitPrice(
      Number(s.product.price),
      s.discountPct
    ),
  }));
  const due = rows.filter((r) => r.due);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Langganan</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-neutral-600 underline">
            Dashboard
          </Link>
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
          <SignOutButton />
        </div>
      </div>

      {due.length > 0 && (
        <section className="mt-6 border rounded p-4 bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-800">
            Harus dikirim hari ini ({due.length})
          </p>
          <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
            {due.map((r) => (
              <li key={r.id}>
                {r.customer.name} — {r.quantity}× {r.product.name} · Rp{" "}
                {(r.discountedUnitPrice * r.quantity).toLocaleString("id-ID")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SubscriptionForm
        customers={customers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          price: Number(p.price),
        }))}
      />

      <h2 className="mt-8 mb-2 text-lg font-medium">
        Langganan ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Belum ada langganan. Buat satu di form atas.
        </p>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="p-2">Customer</th>
              <th className="p-2">Produk</th>
              <th className="p-2">Siklus</th>
              <th className="p-2">Harga</th>
              <th className="p-2">Berikutnya</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={
                  "border-t " + (r.due ? "bg-green-50" : "")
                }
              >
                <td className="p-2">{r.customer.name}</td>
                <td className="p-2">
                  {r.quantity}× {r.product.name}
                  {r.discountPct > 0 && (
                    <span className="text-neutral-500">
                      {" "}
                      (diskon {r.discountPct}%)
                    </span>
                  )}
                </td>
                <td className="p-2">tiap {r.frequencyDays} hari</td>
                <td className="p-2">
                  Rp{" "}
                  {(r.discountedUnitPrice * r.quantity).toLocaleString("id-ID")}
                </td>
                <td className="p-2">
                  {r.nextRunAt.toLocaleDateString("id-ID")}
                </td>
                <td className="p-2">
                  <span
                    className={
                      r.status === "ACTIVE"
                        ? "text-green-700 font-medium"
                        : r.status === "PAUSED"
                        ? "text-amber-600 font-medium"
                        : "text-neutral-400"
                    }
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.due && (
                    <span className="ml-2 text-green-700 font-medium">
                      · kirim hari ini
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <SubscriptionActions
                    subscriptionId={r.id}
                    status={r.status}
                    due={r.due}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
