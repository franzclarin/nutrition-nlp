import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { usersProfile } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import OnboardingForm from '@/components/OnboardingForm';

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Already has profile — skip
  const profile = await db.query.usersProfile.findFirst({
    where: eq(usersProfile.clerkUserId, userId),
  });
  if (profile) redirect('/dashboard');

  return <OnboardingForm />;
}
