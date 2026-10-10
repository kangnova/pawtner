import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const patchSchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  expiryDate: z.string().nullable().optional(),
});

const productSelect = { id: true, name: true, unit: true };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.batch.findFirst({
    where: { id, product: { storeId: session.user.storeId } },
  });
  if (!existing) return fail("Not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);

  const data: { quantity?: number; expiryDate?: Date | null } = {};
  if (parsed.data.quantity !== undefined) data.quantity = parsed.data.quantity;
  if (parsed.data.expiryDate !== undefined) {
    if (parsed.data.expiryDate === null) {
      data.expiryDate = null;
    } else {
      const d = new Date(parsed.data.expiryDate);
      if (Number.isNaN(d.getTime())) return fail("Invalid expiryDate");
      data.expiryDate = d;
    }
  }

  const batch = await prisma.batch.update({
    where: { id },
    data,
    include: { product: { select: productSelect } },
  });

  return ok(batch);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.batch.findFirst({
    where: { id, product: { storeId: session.user.storeId } },
  });
  if (!existing) return fail("Not found", 404);

  await prisma.batch.delete({ where: { id } });
  return ok({ deleted: true });
}
