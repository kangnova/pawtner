import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  species: z.enum(["CAT", "DOG", "BIRD", "FISH", "OTHER"]).optional(),
  breed: z.preprocess(emptyToNull, z.string().optional().nullable()),
  birthDate: z.preprocess(emptyToNull, z.string().optional().nullable()),
  weightKg: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().optional().nullable()
  ),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.pet.findFirst({
    where: { id, customer: { storeId: session.user.storeId } },
  });
  if (!existing) return fail("Not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const data: {
    name?: string;
    species?: "CAT" | "DOG" | "BIRD" | "FISH" | "OTHER";
    breed?: string | null;
    birthDate?: Date | null;
    weightKg?: number | null;
  } = {};

  if (d.name !== undefined) data.name = d.name;
  if (d.species !== undefined) data.species = d.species;
  if (d.breed !== undefined) data.breed = d.breed ?? null;
  if (d.weightKg !== undefined) data.weightKg = d.weightKg ?? null;
  if (d.birthDate !== undefined) {
    if (d.birthDate === null) {
      data.birthDate = null;
    } else {
      const parsedDate = new Date(d.birthDate);
      if (Number.isNaN(parsedDate.getTime())) return fail("Invalid birthDate");
      data.birthDate = parsedDate;
    }
  }

  const pet = await prisma.pet.update({ where: { id }, data });
  return ok(pet);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.pet.findFirst({
    where: { id, customer: { storeId: session.user.storeId } },
  });
  if (!existing) return fail("Not found", 404);

  await prisma.pet.delete({ where: { id } });
  return ok({ deleted: true });
}
