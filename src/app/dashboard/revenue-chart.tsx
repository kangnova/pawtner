"use client";

type Point = { label: string; value: number };

/** Dependency-free bar chart: max bar height 140px, scaled to the series max. */
export default function RevenueChart({ data }: { data: Point[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="border rounded p-4">
      <h2 className="text-lg font-medium mb-4">Omzet 7 hari terakhir</h2>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full"
          >
            <div
              className="w-full bg-neutral-900 rounded-t"
              style={{ height: `${Math.max(2, (d.value / max) * 140)}px` }}
              title={`Rp ${d.value.toLocaleString("id-ID")}`}
            />
            <span className="text-xs text-neutral-500 mt-1">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
