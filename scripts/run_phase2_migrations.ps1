# Execute Phase-2 Supabase migrations & regenerate types locally
# Uses npx so no global installation is required

npx supabase@latest migration up
npx supabase@latest gen types typescript --local > src/types/database.types.ts
