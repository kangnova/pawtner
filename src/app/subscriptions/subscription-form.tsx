"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string };
type Product = { id: string; name: string; unit: string; price: number };

export default function SubscriptionForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [frequencyDays, setFrequencyDays] = useState("7");
  const [quantity, setQuantity] = useState("1");
  const [discountPct, setDiscountPct] = useState("0");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const ready = customers.length > 0 && products.length > 0;

  if (!ready) {
    return (
      <p className="mt-6 text-sm text-neutral-500">
        {customers.length === 0
          ? "Belum ada pelanggan. Tambah dulu di halaman Customers."
          : "Belum ada produk. Tambah dulu di halaman Products."}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        productId,
        frequencyDays: Number(frequencyDays),
        quantity: Number(quantity),
        discountPct: Number(discountPct),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Gagal membuat langganan");
      return;
    }
    setCustomerId("");
    setProductId("");
    setFrequencyDays("7");
    setQuantity("1");
    setDiscountPct("0");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 border rounded p-4"
    >
      <div className="col-span-2 md:col-span-1">
        <label className="block text-sm">Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        >
          <option value="">— pilih —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="block text-sm">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        >
          <option value="">— pilih —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm">Setiap (hari)</label>
        <input
          type="number"
          min={1}
          step={1}
          value={frequencyDays}
          onChange={(e) => setFrequencyDays(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm">Jumlah</label>
        <input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm">Diskon (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={discountPct}
          onChange={(e) => setDiscountPct(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      {error && <p className="col-span-2 md:col-span-5 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 md:col-span-5 bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Buat langganan"}
      </button>
    </form>
  );
}
