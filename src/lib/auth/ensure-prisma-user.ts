import { db } from "@/server/db";

export async function ensurePrismaUser(opts: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  const { id, email, name, image } = opts;
  if (!email || !id) {
    console.log("[ensurePrismaUser] Missing required fields:", { id, email });
    return null;
  }

  // Try find by ID first (most accurate)
  let existing = await db.user.findUnique({ where: { id } });
  if (existing) {
    console.log("[ensurePrismaUser] User found by ID:", id);
    return existing;
  }

  // Try find by email
  existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("[ensurePrismaUser] User found by email but different ID. Existing:", existing.id, "Requested:", id);
    // User exists with different ID - this is a problem, return the existing user
    return existing;
  }

  // Create a new Prisma user row with the provided Supabase ID
  console.log("[ensurePrismaUser] Creating new user:", { id, email, name });
  try {
    const newUser = await db.user.create({
      data: {
        id,
        email,
        name: name ?? undefined,
        image: image ?? undefined,
      },
    });
    console.log("[ensurePrismaUser] User created successfully:", newUser.id);
    return newUser;
  } catch (error) {
    console.error("[ensurePrismaUser] Error creating user:", error);
    return null;
  }
}
