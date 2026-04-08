export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { foodLogs, usersProfile } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { calculateMacroTargets, GOAL_LABELS } from '@/lib/macros';
import { getMealRecommendations } from '@/lib/claude';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const profile = await db.query.usersProfile.findFirst({
    where: eq(usersProfile.clerkUserId, userId),
  });
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  const logs = await db.query.foodLogs.findMany({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, today)),
  });

  const targets = calculateMacroTargets(
    Number(profile.weightKg),
    profile.heightCm,
    profile.age,
    profile.goal,
    profile.activityLevel
  );

  const consumed = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + Number(log.calories),
      protein_g: acc.protein_g + Number(log.proteinG),
      carbs_g: acc.carbs_g + Number(log.carbsG),
      fat_g: acc.fat_g + Number(log.fatG),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const remaining = {
    calories: Math.max(0, targets.calories - consumed.calories),
    protein_g: Math.max(0, targets.protein_g - consumed.protein_g),
    carbs_g: Math.max(0, targets.carbs_g - consumed.carbs_g),
    fat_g: Math.max(0, targets.fat_g - consumed.fat_g),
  };

  const hours = new Date().getHours();
  let timeOfDay = 'morning';
  if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
  else if (hours >= 17 && hours < 21) timeOfDay = 'evening';
  else if (hours >= 21 || hours < 5) timeOfDay = 'night';

  const suggestions = await getMealRecommendations({
    remaining,
    goal: GOAL_LABELS[profile.goal],
    eatenToday: logs.map((l) => l.foodName),
    timeOfDay,
  });

  return NextResponse.json({ suggestions });
}
