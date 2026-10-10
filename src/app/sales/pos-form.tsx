"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  sellable: number;
};
type Customer = { id: string; name: string };
type CartLine = {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

const PAYMENTS = ["CASH", "QRIS", "TRANSFER", "EWALLET", "COD"] as const;

const toCents = (n: number) => Math.round(n * 100);

export default function PosForm({
  products,
  customers,
}: {
  products: Product[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{
    id: string;
    invoiceNumber: string;
    total: number;
  } | null>(null);

  const total = cart.reduce((s, l) => s + toCents(l.price) * l.quantity, 0) / 100;

  function addToCart() {
    if (!productId) return;
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + q } : l
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, unit: p.unit, price: p.price, quantity: q },
      ];
    });
    setQuantity("1");
    setProductId("");
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  async function checkout() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId || null,
        paymentMethod,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Gagal menyimpan penjualan");
      return;
    }
    setReceipt({
      id: json.data.id,
      invoiceNumber: json.data.invoiceNumber,
      total: Number(json.data.total),
    });
    setCart([]);
    setCustomerId("");
    router.refresh();
  }

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cart + checkout */}
      <div className="border rounded p-4">
        <h2 className="font-medium mb-3">Keranjang</h2>
        {cart.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Belum ada item. Tambah dari panel kanan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {cart.map((l) => (
                <tr key={l.productId} className="border-t">
                  <td className="py-2">{l.name}</td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => changeQty(l.productId, -1)}
                      className="px-2 border rounded"
                    >
                      −
                    </button>
                    <span className="mx-2">{l.quantity}</span>
                    <button
                      onClick={() => changeQty(l.productId, 1)}
                      className="px-2 border rounded"
                    >
                      +
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    Rp{" "}
                    {((toCents(l.price) * l.quantity) / 100).toLocaleString(
                      "id-ID"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-3 border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>Rp {total.toLocaleString("id-ID")}</span>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm">Customer (opsional)</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1 bg-white"
            >
              <option value="">— Umum (tanpa nama) —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Metode bayar</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1 bg-white"
            >
              {PAYMENTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {receipt && (
          <p className="mt-3 text-sm text-green-700">
            Berhasil! {receipt.invoiceNumber} — Rp{" "}
            {receipt.total.toLocaleString("id-ID")}.{" "}
            <a href={`/sales/${receipt.id}`} className="underline">
              Lihat struk
            </a>
          </p>
        )}

        <button
          onClick={checkout}
          disabled={saving || cart.length === 0}
          className="mt-4 w-full bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {saving ? "Memproses..." : "Bayar & simpan"}
        </button>
      </div>

      {/* Product picker */}
      <div className="border rounded p-4">
        <h2 className="font-medium mb-3">Tambah produk</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1 bg-white"
            >
              <option value="">— pilih —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.sellable <= 0}>
                  {p.name} · {p.sellable} {p.unit} · Rp{" "}
                  {p.price.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Qty</label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addToCart}
              disabled={!productId}
              className="w-full bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50"
            >
              Tambah
            </button>
          </div>
        </div>
        {products.every((p) => p.sellable <= 0) && (
          <p className="mt-3 text-sm text-amber-700">
            Semua produk stoknya 0. Masuk stok dulu di halaman Stock In.
          </p>
        )}
      </div>
    </div>
  );
}
