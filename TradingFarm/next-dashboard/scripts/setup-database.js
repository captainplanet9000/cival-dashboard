node scripts/direct-migrations.js
npx supabase gen types typescript --local > src/types/database.types.ts
npx supabase start