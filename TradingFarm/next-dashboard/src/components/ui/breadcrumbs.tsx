'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const pathname = usePathname() || '/';
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="breadcrumb">
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </li>
        {segments.map((segment, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/');
          const label = segment.charAt(0).toUpperCase() + segment.slice(1);
          return (
            <li key={href} className="flex items-center">
              <span className="mx-1">/</span>
              <Link href={href} className="hover:underline">
                {label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
