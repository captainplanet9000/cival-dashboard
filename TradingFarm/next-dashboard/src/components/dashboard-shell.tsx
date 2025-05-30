"use client"

import React from 'react'

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`grid items-start gap-8 ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export default DashboardShell
