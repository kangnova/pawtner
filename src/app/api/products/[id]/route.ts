import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  unit: z.enum(["PCS", "KG", "GRAM", "LITER", "RENTENG"]).optional(),
  price: z.coerce.number().positive().optional(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  minStockThreshold: z.coerce.number().int().nonnegative().optional(),
  categoryId: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);

  const existing = await prisma.product.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) return fail("Not found", 404);

  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  return ok(product);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.product.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) return fail("Not found", 404);

  await prisma.product.delete({ where: { id } });
  return ok({ deleted: true });
}
