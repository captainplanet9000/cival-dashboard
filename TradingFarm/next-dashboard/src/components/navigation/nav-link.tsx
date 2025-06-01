"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
  activeClassName?: string
  icon?: ReactNode
  exactMatch?: boolean
}

export function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
  icon,
  exactMatch = false,
}: NavLinkProps) {
  const pathname = usePathname()
  
  // Check if the current path matches the link
  const isActive = exactMatch 
    ? pathname === href 
    : pathname === href || pathname.startsWith(`${href}/`);
  
  const combinedClassName = isActive
    ? `${className} ${activeClassName}`.trim()
    : className;

  return (
    <Link href={href} className={combinedClassName} prefetch={false}>
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </Link>
  )
}
