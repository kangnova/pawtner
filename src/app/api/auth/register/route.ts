import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  storeName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid input: " + parsed.error.message);

  const { name, email, password, storeName } = parsed.data;
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return fail("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const base =
    storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "store";

  try {
    const { store, user } = await prisma.$transaction(async (tx) => {
      let slug = base;
      const taken = await tx.store.findUnique({ where: { slug } });
      if (taken) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

      const store = await tx.store.create({ data: { name: storeName, slug } });
      const user = await tx.user.create({
        data: { name, email: normalized, passwordHash, role: "OWNER", storeId: store.id },
      });
      return { store, user };
    });

    return ok({ userId: user.id, storeId: store.id, storeSlug: store.slug }, 201);
  } catch {
    return fail("Could not create account", 500);
  }
}
