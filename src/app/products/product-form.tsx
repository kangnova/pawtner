"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [minStockThreshold, setMinStockThreshold] = useState("0");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sku: sku || null,
        unit,
        price: Number(price),
        costPrice: costPrice ? Number(costPrice) : null,
        minStockThreshold: Number(minStockThreshold) || 0,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Failed to create product");
      return;
    }
    setName("");
    setSku("");
    setPrice("");
    setCostPrice("");
    setMinStockThreshold("0");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid grid-cols-2 gap-3 border rounded p-4">
      <div>
        <label className="block text-sm">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">SKU</label>
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">Unit</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 w-full border rounded px-2 py-1">
          <option value="PCS">PCS</option>
          <option value="KG">KG</option>
          <option value="GRAM">GRAM</option>
          <option value="LITER">LITER</option>
          <option value="RENTENG">RENTENG</option>
        </select>
      </div>
      <div>
        <label className="block text-sm">Price (Rp)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">Cost price (Rp)</label>
        <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm">Min stock alert</label>
        <input type="number" value={minStockThreshold} onChange={(e) => setMinStockThreshold(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="col-span-2 bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50">
        {saving ? "Saving..." : "Add product"}
      </button>
    </form>
  );
}
