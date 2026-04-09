import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

function isNextInternalError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest: unknown }).digest === 'string'
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error('[AppLayout] Auth error:', err);
    throw err;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        <div className="max-w-content mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
