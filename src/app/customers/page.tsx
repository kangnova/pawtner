import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { petAgeLabel } from "@/lib/pet";
import CustomerForm from "./customer-form";
import PetForm from "./pet-form";
import DeleteButtons from "./delete-buttons";
import SignOutButton from "../products/sign-out";

export const dynamic = "force-dynamic";

const SPECIES_LABEL: Record<string, string> = {
  CAT: "Cat",
  DOG: "Dog",
  BIRD: "Bird",
  FISH: "Fish",
  OTHER: "Other",
};

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { storeId: session.user.storeId },
    include: { pets: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <div className="flex items-center gap-4">
          <Link href="/products" className="text-sm text-neutral-600 underline">
            Products
          </Link>
          <Link href="/stock" className="text-sm text-neutral-600 underline">
            Stock In
          </Link>
          <Link href="/sales" className="text-sm text-neutral-600 underline">
            Sales
          </Link>
          <Link href="/subscriptions" className="text-sm text-neutral-600 underline">
            Langganan
          </Link>
          <SignOutButton />
        </div>
      </div>

      <CustomerForm />

      <h2 className="mt-8 mb-2 text-lg font-medium">
        Customers ({customers.length})
      </h2>
      <div className="space-y-4">
        {customers.map((c) => (
          <section key={c.id} className="border rounded p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-neutral-500">
                  {c.phone || "no phone"} {c.email ? ` · ${c.email}` : ""}
                </p>
              </div>
              <DeleteButtons customerId={c.id} />
            </div>

            {c.pets.length > 0 ? (
              <table className="mt-3 w-full text-sm border">
                <thead>
                  <tr className="bg-neutral-100 text-left">
                    <th className="p-2">Pet</th>
                    <th className="p-2">Species</th>
                    <th className="p-2">Breed</th>
                    <th className="p-2">Age</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {c.pets.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{SPECIES_LABEL[p.species] ?? p.species}</td>
                      <td className="p-2">{p.breed || "—"}</td>
                      <td className="p-2">{petAgeLabel(p.birthDate)}</td>
                      <td className="p-2">
                        {p.weightKg ? `${Number(p.weightKg)} kg` : "—"}
                      </td>
                      <td className="p-2">
                        <DeleteButtons petId={p.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-neutral-400">No pets yet.</p>
            )}

            <PetForm customerId={c.id} customerName={c.name} />
          </section>
        ))}

        {customers.length === 0 && (
          <p className="text-sm text-neutral-400">
            No customers yet. Add your first customer above.
          </p>
        )}
      </div>
    </main>
  );
}
