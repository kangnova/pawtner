"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionActions({
  subscriptionId,
  status,
  due,
}: {
  subscriptionId: string;
  status: string;
  due: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<
    "" | "fulfill" | "pause" | "resume" | "cancel"
  >("");

  async function patch(nextStatus: "ACTIVE" | "PAUSED" | "CANCELLED") {
    setBusy(nextStatus === "ACTIVE" ? "resume" : nextStatus === "PAUSED" ? "pause" : "cancel");
    const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy("");
    if (!res.ok) {
      window.alert("Gagal mengubah status langganan");
      return;
    }
    router.refresh();
  }

  async function fulfill() {
    setBusy("fulfill");
    const res = await fetch(`/api/subscriptions/${subscriptionId}/fulfill`, {
      method: "POST",
    });
    setBusy("");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      window.alert(json?.error || "Gagal memproses langganan");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {status === "ACTIVE" && due && (
        <button
          onClick={fulfill}
          disabled={busy !== ""}
          className="text-xs bg-green-700 text-white rounded px-2 py-1 disabled:opacity-50"
        >
          {busy === "fulfill" ? "..." : "Terpenuhi"}
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          onClick={() => patch("PAUSED")}
          disabled={busy !== ""}
          className="text-xs border rounded px-2 py-1 disabled:opacity-50"
        >
          {busy === "pause" ? "..." : "Jeda"}
        </button>
      )}
      {status === "PAUSED" && (
        <button
          onClick={() => patch("ACTIVE")}
          disabled={busy !== ""}
          className="text-xs border rounded px-2 py-1 disabled:opacity-50"
        >
          {busy === "resume" ? "..." : "Aktifkan"}
        </button>
      )}
      {status !== "CANCELLED" && (
        <button
          onClick={() => patch("CANCELLED")}
          disabled={busy !== ""}
          className="text-xs text-red-600 underline disabled:opacity-50"
        >
          {busy === "cancel" ? "..." : "Batalkan"}
        </button>
      )}
    </div>
  );
}
