import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { fifoConsume } from "@/lib/stock";
import {
  toCents,
  lineSubtotalCents,
  formatInvoiceNumber,
} from "@/lib/sale";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

const saleSchema = z.object({
  customerId: z.string().nullable().optional(),
  paymentMethod: z
    .enum(["CASH", "QRIS", "TRANSFER", "EWALLET", "COD"])
    .default("CASH"),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const sales = await prisma.sale.findMany({
    where: { storeId: session.user.storeId },
    include: {
      customer: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(sales);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const storeId = session.user.storeId;

  const body = await req.json().catch(() => null);
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  // Merge duplicate product lines so FIFO never over-consumes a batch.
  const merged = new Map<string, number>();
  for (const item of d.items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  const items = [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, storeId },
    include: { batches: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const id of items.map((i) => i.productId)) {
    if (!productById.has(id)) return fail("Product not found", 404);
  }

  if (d.customerId) {
    const cust = await prisma.customer.findFirst({
      where: { id: d.customerId, storeId },
    });
    if (!cust) return fail("Customer not found", 400);
  }

  // FIFO decrements + line totals at full (integer-cent) precision.
  const now = new Date();
  const lines = items.map((item) => {
    const product = productById.get(item.productId)!;
    const decrements = fifoConsume(product.batches, item.quantity, now);
    const unitPrice = Number(product.price);
    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotalCents: lineSubtotalCents(unitPrice, item.quantity),
      decrements,
    };
  });

  const short = lines.find((l) => l.decrements === null);
  if (short) return fail(`Insufficient stock for "${short.name}"`, 409);

  const totalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);

  // Invoice number: daily sequence for this store.
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.sale.count({
    where: { storeId, createdAt: { gte: startOfDay } },
  });
  const invoiceNumber = formatInvoiceNumber(now, todayCount + 1);

  // Exact 2dp Decimal via integer-cent division (no float rounding drift).
  const money = (cents: number) => new Prisma.Decimal(cents).div(100);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        invoiceNumber,
        status: "PAID",
        paymentMethod: d.paymentMethod,
        total: money(totalCents),
        storeId,
        customerId: d.customerId ?? null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: money(toCents(l.unitPrice)),
            subtotal: money(l.subtotalCents),
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
    });

    for (const l of lines) {
      for (const dec of l.decrements!) {
        await tx.batch.update({
          where: { id: dec.batchId },
          data: { quantity: { decrement: dec.quantity } },
        });
      }
    }

    return created;
  });

  return ok(sale, 201);
}
