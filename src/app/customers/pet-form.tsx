"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PetForm({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("CAT");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        name,
        species,
        breed: breed || null,
        birthDate: birthDate || null,
        weightKg: weightKg || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error || "Failed to add pet");
      return;
    }
    setName("");
    setBreed("");
    setBirthDate("");
    setWeightKg("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 border rounded p-3 bg-neutral-50"
    >
      <div>
        <label className="block text-xs text-neutral-500">Pet name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={`${customerName}'s pet`}
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500">Species</label>
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        >
          <option value="CAT">Cat</option>
          <option value="DOG">Dog</option>
          <option value="BIRD">Bird</option>
          <option value="FISH">Fish</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-500">Breed</label>
        <input
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500">Birth date</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500">Weight (kg)</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1 bg-white"
        />
      </div>
      {error && (
        <p className="col-span-2 sm:col-span-5 text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 sm:col-span-5 bg-neutral-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {saving ? "Adding..." : "Add pet"}
      </button>
    </form>
  );
}
