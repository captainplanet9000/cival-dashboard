@echo off
set NEXT_PUBLIC_USE_MOCK_DATA=false
set NEXT_PUBLIC_MOCK_API_ENABLED=false
set NEXT_PUBLIC_FORCE_MOCK_MODE=false

echo Starting Trading Farm Dashboard with live Supabase backend...
npm run dev
