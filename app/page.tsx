import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { usersProfile } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export default async function RootPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const profile = await getDb().query.usersProfile.findFirst({
    where: eq(usersProfile.clerkUserId, userId),
  });

  if (!profile) redirect('/onboarding');
  redirect('/dashboard');
}
