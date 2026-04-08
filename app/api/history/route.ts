import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { foodLogs } from '@/lib/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

  const logs = await db.query.foodLogs.findMany({
    where: and(eq(foodLogs.userId, userId), gte(foodLogs.logDate, fromDate)),
    orderBy: (foodLogs, { asc }) => [asc(foodLogs.logDate), asc(foodLogs.loggedAt)],
  });

  // Group by date and compute daily summaries
  const byDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const existing = byDate.get(log.logDate) || [];
    existing.push(log);
    byDate.set(log.logDate, existing);
  }

  const summaries = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    calories: entries.reduce((s, e) => s + Number(e.calories), 0),
    protein_g: entries.reduce((s, e) => s + Number(e.proteinG), 0),
    carbs_g: entries.reduce((s, e) => s + Number(e.carbsG), 0),
    fat_g: entries.reduce((s, e) => s + Number(e.fatG), 0),
    entry_count: entries.length,
  }));

  return NextResponse.json({ summaries });
}
