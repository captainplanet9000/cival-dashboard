"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Icons } from "@/components/ui/icons"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  // Close the mobile menu when clicking a link
  const closeMobileMenu = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Icons.menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <MobileLink
          href="/"
          className="flex items-center"
          onOpenChange={setOpen}
        >
          <Icons.logo className="mr-2 h-4 w-4" />
          <span className="font-bold">Trading Farm</span>
        </MobileLink>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            <MobileLink
              href="/dashboard"
              onOpenChange={setOpen}
              className={cn(
                pathname === "/dashboard" && "text-foreground font-medium"
              )}
            >
              Dashboard
            </MobileLink>
            <MobileLink
              href="/dashboard/agents"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/agents") && "text-foreground font-medium"
              )}
            >
              Trading Agents
            </MobileLink>
            <MobileLink
              href="/dashboard/strategies"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/strategies") && "text-foreground font-medium"
              )}
            >
              Strategies
            </MobileLink>
            <MobileLink
              href="/dashboard/positions"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/positions") && "text-foreground font-medium"
              )}
            >
              Positions
            </MobileLink>
            <MobileLink
              href="/dashboard/portfolio"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/portfolio") && "text-foreground font-medium"
              )}
            >
              Portfolio
            </MobileLink>
            <MobileLink
              href="/dashboard/defi"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/defi") && "text-foreground font-medium"
              )}
            >
              DeFi
            </MobileLink>
            <MobileLink
              href="/dashboard/settings"
              onOpenChange={setOpen}
              className={cn(
                pathname?.startsWith("/dashboard/settings") && "text-foreground font-medium"
              )}
            >
              Settings
            </MobileLink>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  href: string
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => onOpenChange?.(false)}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  )
}

export default MobileNav
