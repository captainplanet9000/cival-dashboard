"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

/**
 * Enhanced ThemeProvider for Trading Farm Dashboard
 * Provides theme context for all shadcn/ui components with proper dark mode support
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // After mounting, we have access to the theme
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // During server-side rendering or before mounting, render with a default theme
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    )
  }
  
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange 
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
