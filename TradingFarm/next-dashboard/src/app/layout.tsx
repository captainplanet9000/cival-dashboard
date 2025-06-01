import '@/styles/globals.css'
import '@/styles/dashboard-theme.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SocketProvider } from '@/providers/socket-provider'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trading Farm Dashboard',
  description: 'AI-powered Trading Farm with MetaMask wallet integration, goal-based trading, and ElizaOS agent coordination.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <SocketProvider enableLogging={process.env.NODE_ENV === 'development'}>
              {children}
              <Toaster />
            </SocketProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
