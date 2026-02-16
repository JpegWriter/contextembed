'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase-provider';
import { Logo } from '@/components/Logo';
import {
  Sparkles,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import SupportDrawer from './SupportDrawer';

interface DashboardShellProps {
  children: React.ReactNode;
  user: User;
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase } = useSupabase();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserCircle,
      active: pathname === '/dashboard/profile',
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname === '/dashboard/settings',
    },
  ];

  return (
    <div className="min-h-screen flex bg-black">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-black border-b border-steel-700/50 flex items-center justify-between px-4 z-30 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo variant="full" size="sm" dark />
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-steel-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Sharp black tech panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-56 bg-black border-r border-steel-700/50 flex flex-col z-40
          transform transition-transform duration-200 md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="h-16 px-4 flex items-center border-b border-steel-700/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo variant="full" size="lg" dark />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navigation.map(item => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                item.active
                  ? 'bg-brand-900/30 text-brand-400 border-l-2 border-brand-500'
                  : 'text-steel-400 hover:bg-steel-800/60 hover:text-steel-200 border-l-2 border-transparent'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User menu */}
        <div className="px-2 py-3 border-t border-steel-700/50" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-steel-800/60 transition-colors"
          >
            <div className="w-7 h-7 bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 text-left truncate">
              <p className="text-xs font-medium text-steel-300 truncate">{user.email}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-steel-500" />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-16 left-2 right-2 bg-steel-800 border border-steel-600 py-1 shadow-xl z-50">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-steel-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-black pt-14 md:pt-0">
        {children}
      </main>

      {/* Support Operator Drawer */}
      <SupportDrawer currentRoute={pathname} />
    </div>
  );
}
