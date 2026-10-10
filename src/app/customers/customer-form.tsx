"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: phone || null,
        email: email || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Failed to create customer");
      return;
    }
    setName("");
    setPhone("");
    setEmail("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-2 gap-3 border rounded p-4"
    >
      <div className="col-span-2">
        <label className="block text-sm">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </div>
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 bg-neutral-900 text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add customer"}
      </button>
    </form>
  );
}
