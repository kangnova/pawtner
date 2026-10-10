import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.preprocess(emptyToNull, z.string().optional().nullable()),
  email: z.preprocess(emptyToNull, z.string().email().optional().nullable()),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const customers = await prisma.customer.findMany({
    where: { storeId: session.user.storeId },
    include: { pets: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  return ok(customers);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);
  const d = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      name: d.name,
      phone: d.phone ?? null,
      email: d.email ?? null,
      storeId: session.user.storeId,
    },
    include: { pets: true },
  });

  return ok(customer, 201);
}
