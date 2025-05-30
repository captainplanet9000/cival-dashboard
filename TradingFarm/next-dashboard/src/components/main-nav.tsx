import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function MainNav() {
  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <span className="font-bold">TradingFarm</span>
      </Link>
      <nav className="flex gap-6">
        <Link
          href="/elizaos/agents"
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'text-sm font-medium transition-colors hover:text-primary'
          )}
        >
          ElizaOS Agents
        </Link>
      </nav>
    </div>
  );
}
