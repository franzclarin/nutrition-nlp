import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { foodLogs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db
    .delete(foodLogs)
    .where(and(eq(foodLogs.id, params.id), eq(foodLogs.userId, userId)));

  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { food_name, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, notes } = body;

  const [updated] = await db
    .update(foodLogs)
    .set({
      foodName: food_name,
      calories: String(calories),
      proteinG: String(protein_g),
      carbsG: String(carbs_g),
      fatG: String(fat_g),
      fiberG: String(fiber_g),
      mealType: meal_type,
      notes: notes || null,
    })
    .where(and(eq(foodLogs.id, params.id), eq(foodLogs.userId, userId)))
    .returning();

  return NextResponse.json({ entry: updated });
}
