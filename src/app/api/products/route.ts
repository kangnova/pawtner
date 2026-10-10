import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { stockInfo } from "@/lib/stock";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  unit: z.enum(["PCS", "KG", "GRAM", "LITER", "RENTENG"]).default("PCS"),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  minStockThreshold: z.coerce.number().int().nonnegative().default(0),
  categoryId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const products = await prisma.product.findMany({
    where: { storeId: session.user.storeId },
    include: { batches: true, category: true },
    orderBy: { name: "asc" },
  });

  const data = products.map((p) => {
    const { batches, ...rest } = p;
    const stock = stockInfo(batches, p.minStockThreshold);
    return { ...rest, ...stock };
  });

  return ok(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  if (d.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: d.categoryId, storeId: session.user.storeId },
    });
    if (!cat) return fail("Category not found", 400);
  }

  const product = await prisma.product.create({
    data: {
      name: d.name,
      sku: d.sku ?? null,
      barcode: d.barcode ?? null,
      unit: d.unit,
      price: d.price,
      costPrice: d.costPrice ?? null,
      minStockThreshold: d.minStockThreshold,
      categoryId: d.categoryId ?? null,
      storeId: session.user.storeId,
    },
  });

  return ok(product, 201);
}
