'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Zap, LayoutDashboard, BookOpen, ListChecks, ScrollText } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scenarios', label: 'Scenarios', icon: BookOpen },
  { href: '/rules', label: 'Rules', icon: ListChecks },
  { href: '/logs', label: 'Logs', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 shrink-0 min-h-screen bg-card border-r border-border px-3 py-5">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-7">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-sm text-foreground">Triggrr</p>
          <p className="text-xs text-muted-foreground">Producer Demo</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border px-2">
        <p className="text-[11px] text-muted-foreground">
          API:{' '}
          <span className="font-mono text-foreground/70">
            {process.env.NEXT_PUBLIC_TRIGGRR_URL ?? 'localhost:3000'}
          </span>
        </p>
      </div>
    </aside>
  );
}
