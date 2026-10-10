import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isDue, discountedUnitPrice, subscriptionTotalCents } from "@/lib/subscription";

const subscriptionSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  frequencyDays: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
  discountPct: z.coerce.number().int().min(0).max(100).default(0),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const subs = await prisma.subscription.findMany({
    where: { storeId: session.user.storeId },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true, price: true } },
    },
    orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
  });

  const now = new Date();
  const data = subs.map((s) => ({
    ...s,
    due: isDue(s.nextRunAt, s.status, now),
    discountedUnitPrice: discountedUnitPrice(Number(s.product.price), s.discountPct),
    total: subscriptionTotalCents(Number(s.product.price), s.discountPct, s.quantity) / 100,
  }));

  return ok(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const storeId = session.user.storeId;

  const body = await req.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const [customer, product] = await Promise.all([
    prisma.customer.findFirst({ where: { id: d.customerId, storeId } }),
    prisma.product.findFirst({ where: { id: d.productId, storeId } }),
  ]);
  if (!customer) return fail("Customer not found", 404);
  if (!product) return fail("Product not found", 404);

  // First delivery is due immediately; the schedule then advances by frequencyDays.
  const sub = await prisma.subscription.create({
    data: {
      customerId: d.customerId,
      productId: d.productId,
      storeId,
      frequencyDays: d.frequencyDays,
      quantity: d.quantity,
      discountPct: d.discountPct,
      status: "ACTIVE",
      nextRunAt: new Date(),
    },
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true, price: true } },
    },
  });

  return ok(sub, 201);
}
