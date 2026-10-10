import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const petSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  species: z.enum(["CAT", "DOG", "BIRD", "FISH", "OTHER"]).default("CAT"),
  breed: z.preprocess(emptyToNull, z.string().optional().nullable()),
  birthDate: z.preprocess(emptyToNull, z.string().optional().nullable()),
  weightKg: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().optional().nullable()
  ),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = petSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: d.customerId, storeId: session.user.storeId },
  });
  if (!customer) return fail("Customer not found", 404);

  let birthDate: Date | null = null;
  if (d.birthDate) {
    birthDate = new Date(d.birthDate);
    if (Number.isNaN(birthDate.getTime())) return fail("Invalid birthDate");
  }

  const pet = await prisma.pet.create({
    data: {
      customerId: d.customerId,
      name: d.name,
      species: d.species,
      breed: d.breed ?? null,
      birthDate,
      weightKg: d.weightKg ?? null,
    },
  });

  return ok(pet, 201);
}
