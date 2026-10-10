import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { fifoConsume } from "@/lib/stock";
import { formatInvoiceNumber } from "@/lib/sale";
import { addDays, discountedUnitPriceCents } from "@/lib/subscription";

/**
 * Fulfil a due subscription: record the delivery as a paid sale (decrementing
 * stock FIFO) and advance the schedule by `frequencyDays`. Anchored to the
 * scheduled date so a late fulfilment does not drift the cadence.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const storeId = session.user.storeId;
  const { id } = await params;

  const sub = await prisma.subscription.findFirst({
    where: { id, storeId },
    include: { product: { include: { batches: true } } },
  });
  if (!sub) return fail("Not found", 404);
  if (sub.status !== "ACTIVE") return fail("Subscription is not active", 400);

  const decrements = fifoConsume(sub.product.batches, sub.quantity, new Date());
  if (decrements === null) {
    return fail(`Insufficient stock for "${sub.product.name}"`, 409);
  }

  const unitPriceCents = discountedUnitPriceCents(
    Number(sub.product.price),
    sub.discountPct
  );
  const subtotalCents = unitPriceCents * sub.quantity;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.sale.count({
    where: { storeId, createdAt: { gte: startOfDay } },
  });
  const invoiceNumber = formatInvoiceNumber(now, todayCount + 1);
  const money = (cents: number) => new Prisma.Decimal(cents).div(100);

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        status: "PAID",
        paymentMethod: "CASH",
        total: money(subtotalCents),
        storeId,
        customerId: sub.customerId,
        items: {
          create: [
            {
              productId: sub.productId,
              quantity: sub.quantity,
              unitPrice: money(unitPriceCents),
              subtotal: money(subtotalCents),
            },
          ],
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
    });

    for (const dec of decrements) {
      await tx.batch.update({
        where: { id: dec.batchId },
        data: { quantity: { decrement: dec.quantity } },
      });
    }

    const updated = await tx.subscription.update({
      where: { id },
      data: {
        lastRunAt: sub.nextRunAt,
        nextRunAt: addDays(sub.nextRunAt, sub.frequencyDays),
      },
    });

    return { sale, subscription: updated };
  });

  return ok(result, 201);
}
