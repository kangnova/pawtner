"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Small delete control for either a customer or a pet. Deleting a customer
 * cascades to its pets (see schema). Confirm before firing.
 */
export default function DeleteButtons({
  customerId,
  petId,
}: {
  customerId?: string;
  petId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    const target = petId
      ? "this pet"
      : "this customer and all their pets";
    if (!window.confirm(`Delete ${target}?`)) return;
    setBusy(true);
    const url = petId ? `/api/pets/${petId}` : `/api/customers/${customerId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      {busy ? "Deleting..." : "Delete"}
    </button>
  );
}
