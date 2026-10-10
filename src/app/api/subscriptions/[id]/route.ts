import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  frequencyDays: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  discountPct: z.coerce.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.subscription.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) return fail("Not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const data: {
    status?: "ACTIVE" | "PAUSED" | "CANCELLED";
    frequencyDays?: number;
    quantity?: number;
    discountPct?: number;
    nextRunAt?: Date;
  } = {};

  if (d.status !== undefined) data.status = d.status;
  if (d.frequencyDays !== undefined) data.frequencyDays = d.frequencyDays;
  if (d.quantity !== undefined) data.quantity = d.quantity;
  if (d.discountPct !== undefined) data.discountPct = d.discountPct;

  // Resuming (or newly activating) a subscription whose nextRunAt is already
  // in the past brings it due immediately instead of leaving it overdue.
  if (d.status === "ACTIVE" && existing.nextRunAt.getTime() < Date.now()) {
    data.nextRunAt = new Date();
  }

  const sub = await prisma.subscription.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true, price: true } },
    },
  });

  return ok(sub);
}
