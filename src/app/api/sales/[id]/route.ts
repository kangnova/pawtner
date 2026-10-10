import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.storeId) return fail("Unauthorized", 401);
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, storeId: session.user.storeId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
  });
  if (!sale) return fail("Not found", 404);

  return ok(sale);
}
