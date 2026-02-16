'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  links: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  /** 'dark' = black background (homepage/pillars), 'light' = white background (pricing/governance) */
  theme?: 'dark' | 'light';
}

export default function MobileNav({
  links,
  ctaHref = '/login',
  ctaLabel = 'Try Free',
  theme = 'dark',
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const isDark = theme === 'dark';

  return (
    <>
      {/* Desktop nav — hidden on mobile */}
      <div className="hidden md:flex items-center gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isDark
                ? 'text-xs font-bold text-steel-400 uppercase tracking-wider hover:text-white transition-colors'
                : 'text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors'
            }
          >
            {link.label}
          </Link>
        ))}
        <Link
          href={ctaHref}
          className={
            isDark
              ? 'px-4 py-2 text-white text-xs font-bold uppercase tracking-wider transition-colors btn-gradient-border'
              : 'px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors'
          }
        >
          {ctaLabel}
        </Link>
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 text-steel-400 hover:text-white transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className={`fixed top-0 right-0 h-full w-64 z-50 md:hidden flex flex-col border-l transition-transform duration-200 ${
              isDark
                ? 'bg-black border-steel-700/50'
                : 'bg-white dark:bg-slate-950 border-gray-200 dark:border-gray-800'
            }`}
          >
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setOpen(false)}
                className={`p-2 transition-colors ${
                  isDark
                    ? 'text-steel-400 hover:text-white'
                    : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 px-6 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-sm font-medium border-b transition-colors ${
                    isDark
                      ? 'text-steel-300 border-steel-800 hover:text-white'
                      : 'text-slate-600 dark:text-slate-400 border-gray-100 dark:border-gray-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="p-6">
              <Link
                href={ctaHref}
                onClick={() => setOpen(false)}
                className={`block w-full py-3 text-center font-medium transition-colors ${
                  isDark
                    ? 'text-white btn-gradient-border text-sm uppercase tracking-wider'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100'
                }`}
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
