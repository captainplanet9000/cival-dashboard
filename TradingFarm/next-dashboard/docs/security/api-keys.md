# API Key Management Security

## Principles
- All API keys are stored in the database with RLS and never exposed to the frontend.
- All CRUD operations are performed via secure backend endpoints using `createServerClient()`.
- Only hashed or masked representations are shown in UI.
- No API key or secret is ever logged or sent to the client.

## UI/UX
- API key add/edit/delete is done via a secure modal or page (see `ApiKeyForm`).
- Test connection before saving keys.
- Show warnings for trading-enabled keys.

## Backend
- Supabase RLS enabled for all API key tables.
- Triggers for `created_at` and `updated_at`.
- Policies restrict access to owner only.

## Testing
- E2E tests simulate add/edit/delete, ensuring no secrets leak to frontend or logs.
