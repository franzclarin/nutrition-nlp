export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { foodLogs } from '@/lib/schema';
import { parseFoodMacros } from '@/lib/openai';

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
    parsed = await parseFoodMacros(rawInput, timeOfDay);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[log-food] parseFoodMacros error:', msg);

    if (msg.includes('OPENAI_API_KEY')) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
    }
    if (msg.includes('non-JSON')) {
      return NextResponse.json(
        { error: 'Could not parse food entry. Please try rephrasing.' },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }

  // Validate required fields before attempting DB insert
  const required = ['food_name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type'] as const;
  const missing = required.filter((k) => parsed[k] === undefined || parsed[k] === null);
  if (missing.length > 0) {
    console.error('[log-food] Missing fields:', missing, 'Parsed object:', parsed);
    return NextResponse.json(
      { error: `Parsed response missing fields: ${missing.join(', ')}` },
      { status: 422 }
    );
  }

  if (mealType) parsed.meal_type = mealType;

  const logDate = now.toISOString().split('T')[0];
  const db = getDb();

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
      fiberG: String(parsed.fiber_g ?? 0),
      mealType: parsed.meal_type,
      notes: parsed.notes ?? null,
    })
    .returning();

  return NextResponse.json({ entry, parsed });
}
