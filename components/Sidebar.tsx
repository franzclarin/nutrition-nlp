'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, User, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: CalendarDays },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 p-6 fixed left-0 top-0 bottom-0">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="font-heading text-2xl font-semibold text-primary">NutriLog</h1>
        <p className="text-xs text-muted mt-0.5">Smart Macro Tracker</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-muted hover:text-danger hover:bg-danger-light transition-all duration-150 w-full"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  );
}
