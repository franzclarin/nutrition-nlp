export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { foodLogs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const db = getDb();
  const logs = await db.query.foodLogs.findMany({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, date)),
    orderBy: (foodLogs, { asc }) => [asc(foodLogs.loggedAt)],
  });

  return NextResponse.json({ logs });
}
