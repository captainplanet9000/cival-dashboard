'use client';
import Link from 'next/link';
import { useNavigation, UserRole } from '@/utils/NavigationService';
import { NavigationItem } from '@/config/navigation';

export function Navbar({ userRole = 'user' }: { userRole?: UserRole }) {
  const { allItems, isActive } = useNavigation(userRole);

  return (
    <nav className="flex items-center gap-6 lg:gap-8 overflow-x-auto pb-2" aria-label="Dashboard Navigation">
      {allItems.map((item: NavigationItem) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70 ${
            isActive(item.href) ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
          }`}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          <span>{item.name}</span>
          {item.badge && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground animate-bounce">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}