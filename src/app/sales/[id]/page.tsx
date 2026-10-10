import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  EWALLET: "E-Wallet",
  COD: "COD",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, storeId: session.user.storeId },
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        include: { product: { select: { name: true, unit: true } } },
      },
    },
  });

  if (!sale) {
    return (
      <main className="max-w-md mx-auto p-8">
        <h1 className="text-xl font-semibold">Struk tidak ditemukan</h1>
        <Link href="/sales" className="text-sm underline">
          ← Kembali ke Sales
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <div className="border rounded p-6">
        <h1 className="text-xl font-semibold text-center">Pawtner</h1>
        <p className="text-center text-sm text-neutral-500 mb-4">
          Struk Penjualan
        </p>

        <div className="text-sm space-y-1 border-y py-3">
          <div className="flex justify-between">
            <span className="text-neutral-500">No. Invoice</span>
            <span className="font-mono">{sale.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Tanggal</span>
            <span>{sale.createdAt.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Customer</span>
            <span>{sale.customer?.name ?? "Umum"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Bayar</span>
            <span>{PAYMENT_LABEL[sale.paymentMethod ?? ""] ?? sale.paymentMethod}</span>
          </div>
        </div>

        <table className="w-full text-sm mt-3">
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">
                  {it.product.name}{" "}
                  <span className="text-neutral-400">
                    ×{it.quantity} {it.product.unit}
                  </span>
                </td>
                <td className="py-2 text-right">
                  Rp {Number(it.subtotal).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>Rp {Number(sale.total).toLocaleString("id-ID")}</span>
        </div>
      </div>

      <Link
        href="/sales"
        className="block mt-4 text-sm text-center underline"
      >
        ← Kembali ke Sales
      </Link>
    </main>
  );
}
