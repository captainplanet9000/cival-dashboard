"use client"

import React from 'react'
import { Brain, Briefcase, Goal, Target, LineChart, Settings } from 'lucide-react'

interface DashboardHeaderProps {
  heading: string
  subheading?: string
  icon?: 'ai' | 'farm' | 'strategy' | 'goal' | 'analytics' | 'settings'
  children?: React.ReactNode
}

export function DashboardHeader({ 
  heading, 
  subheading, 
  icon, 
  children 
}: DashboardHeaderProps) {
  const getIcon = () => {
    switch (icon) {
      case 'ai':
        return <Brain className="h-6 w-6" />
      case 'farm':
        return <Briefcase className="h-6 w-6" />
      case 'strategy':
        return <Target className="h-6 w-6" />
      case 'goal':
        return <Goal className="h-6 w-6" />
      case 'analytics':
        return <LineChart className="h-6 w-6" />
      case 'settings':
        return <Settings className="h-6 w-6" />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between px-2 pb-4">
      <div className="grid gap-1">
        {icon && (
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="text-muted-foreground text-sm">
              {icon.charAt(0).toUpperCase() + icon.slice(1)}
            </span>
          </div>
        )}
        <h1 className="font-heading text-3xl font-bold md:text-4xl">{heading}</h1>
        {subheading && <p className="text-muted-foreground">{subheading}</p>}
      </div>
      {children}
    </div>
  )
}

// For backward compatibility, also export as default
export default DashboardHeader
