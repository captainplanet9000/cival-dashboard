# Bybit Adapter Usage & Security

## Usage

- Import `BybitAdapter` from `src/utils/exchanges/bybit-adapter.ts`.
- Use `connect(credentials)` to establish a connection (vault-backed, never expose secrets to frontend).
- Use `placeOrder`, `cancelOrder`, `getBalances`, `getPositions`, `subscribeTicker`, etc.

## Error Handling

- All methods throw on API/network error.
- WebSocket methods auto-reconnect and emit errors to agent core.
- Never log or expose credentials in errors.

## Security

- API keys are loaded from vault via secure backend endpoints only.
- Supabase RLS enforced on all credential tables.
- No secrets are ever sent to the frontend or logs.

## Testing

- See `src/tests/exchanges/bybit-adapter.test.ts` for unit/integration test coverage.
- Use MSW for mocking REST/WebSocket APIs.
