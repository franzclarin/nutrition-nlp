import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { usersProfile } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Next.js internal errors (redirect, not-found, dynamic usage) carry a
// `digest` property and must be re-thrown as-is without logging.
function isNextInternalError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest: unknown }).digest === 'string'
  );
}

export default async function RootPage() {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const profile = await getDb().query.usersProfile.findFirst({
      where: eq(usersProfile.clerkUserId, userId!),
    });

    if (!profile) redirect('/onboarding');
    redirect('/dashboard');
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error('[RootPage] Runtime error:', err);
    throw err;
  }
}
