import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createServerClient = () => {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string }) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The cookies API can only be used in a Server Action or Route Handler
            // We'll suppress the error here
          }
        },
        remove(name: string, options: { path: string; domain?: string }) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch (error) {
            // The cookies API can only be used in a Server Action or Route Handler
            // We'll suppress the error here
          }
        },
      },
    }
  )
}