"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ProductOption = { id: string; name: string; unit: string };

export default function StockInForm({
  products,
}: {
  products: ProductOption[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (products.length === 0) {
    return (
      <p className="mt-6 text-sm text-neutral-500">
        Belum ada produk. Tambah produk dulu di halaman Products.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity: Number(quantity),
        expiryDate: expiryDate || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Failed to add stock");
      return;
    }
    setQuantity("");
    setExpiryDate("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-2 gap-3 border rounded p-4"
    >
      <div className="col-span-2">
        <label className="block text-sm">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm">Quantity</label>
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
        <label className="block text-sm">Expiry date (optional)</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add stock"}
      </button>
    </form>
  );
}
