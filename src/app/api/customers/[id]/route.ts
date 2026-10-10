import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.preprocess(emptyToNull, z.string().optional().nullable()),
  email: z.preprocess(emptyToNull, z.string().email().optional().nullable()),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, storeId: session.user.storeId },
    include: { pets: { orderBy: { createdAt: "asc" } } },
  });
  if (!customer) return fail("Not found", 404);

  return ok(customer);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) return fail("Not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);

  const customer = await prisma.customer.update({
    where: { id },
    data: parsed.data,
    include: { pets: true },
  });

  return ok(customer);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, storeId: session.user.storeId },
  });
  if (!existing) return fail("Not found", 404);

  await prisma.customer.delete({ where: { id } });
  return ok({ deleted: true });
}
