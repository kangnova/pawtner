import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const batchSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  expiryDate: z.string().optional().nullable(),
});

const productSelect = { id: true, name: true, unit: true };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const batches = await prisma.batch.findMany({
    where: { product: { storeId: session.user.storeId } },
    include: { product: { select: productSelect } },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
  });

  return ok(batches);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: d.productId, storeId: session.user.storeId },
  });
  if (!product) return fail("Product not found", 404);

  let expiryDate: Date | null = null;
  if (d.expiryDate) {
    expiryDate = new Date(d.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) return fail("Invalid expiryDate");
  }

  const batch = await prisma.batch.create({
    data: { productId: d.productId, quantity: d.quantity, expiryDate },
    include: { product: { select: productSelect } },
  });

  return ok(batch, 201);
}
