import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { foodLogs } from '@/lib/schema';
import { parseFoodEntry } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rawInput, mealType } = await req.json();
  if (!rawInput?.trim()) {
    return NextResponse.json({ error: 'No food input provided' }, { status: 400 });
  }

  const now = new Date();
  const hours = now.getHours();
  let timeOfDay = 'morning';
  if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
  else if (hours >= 17 && hours < 21) timeOfDay = 'evening';
  else if (hours >= 21 || hours < 5) timeOfDay = 'night';

  let parsed;
  try {
    parsed = await parseFoodEntry(rawInput, timeOfDay);
  } catch {
    return NextResponse.json(
      { error: 'Could not parse food entry. Please try rephrasing.' },
      { status: 422 }
    );
  }

  // Override meal_type if user explicitly selected one
  if (mealType) parsed.meal_type = mealType;

  const logDate = now.toISOString().split('T')[0];

  const [entry] = await db
    .insert(foodLogs)
    .values({
      userId,
      logDate,
      loggedAt: now,
      rawInput,
      foodName: parsed.food_name,
      calories: String(parsed.calories),
      proteinG: String(parsed.protein_g),
      carbsG: String(parsed.carbs_g),
      fatG: String(parsed.fat_g),
      fiberG: String(parsed.fiber_g),
      mealType: parsed.meal_type,
      notes: parsed.notes,
    })
    .returning();

  return NextResponse.json({ entry, parsed });
}
