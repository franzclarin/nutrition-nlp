import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersProfile } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await db.query.usersProfile.findFirst({
    where: eq(usersProfile.clerkUserId, userId),
  });

  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, age, height_cm, weight_kg, goal, activity_level } = body;

  const existing = await db.query.usersProfile.findFirst({
    where: eq(usersProfile.clerkUserId, userId),
  });

  if (existing) {
    const [updated] = await db
      .update(usersProfile)
      .set({
        name,
        age,
        heightCm: height_cm,
        weightKg: String(weight_kg),
        goal,
        activityLevel: activity_level,
        updatedAt: new Date(),
      })
      .where(eq(usersProfile.clerkUserId, userId))
      .returning();
    return NextResponse.json({ profile: updated });
  }

  const [created] = await db
    .insert(usersProfile)
    .values({
      clerkUserId: userId,
      name,
      age,
      heightCm: height_cm,
      weightKg: String(weight_kg),
      goal,
      activityLevel: activity_level,
    })
    .returning();

  return NextResponse.json({ profile: created });
}
