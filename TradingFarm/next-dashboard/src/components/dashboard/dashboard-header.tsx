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
        return <Brain className="h-8 w-8 text-primary" />
      case 'farm':
        return <Briefcase className="h-8 w-8 text-primary" />
      case 'strategy':
        return <LineChart className="h-8 w-8 text-primary" />
      case 'goal':
        return <Goal className="h-8 w-8 text-primary" />
      case 'analytics':
        return <Target className="h-8 w-8 text-primary" />
      case 'settings':
        return <Settings className="h-8 w-8 text-primary" />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {icon && getIcon()}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
          {subheading && (
            <p className="text-muted-foreground">{subheading}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
