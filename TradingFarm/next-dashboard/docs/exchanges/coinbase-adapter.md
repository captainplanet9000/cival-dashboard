# Coinbase Adapter Usage & Security

## Usage

- Import `CoinbaseAdapter` from `src/utils/exchanges/coinbase-adapter.ts`.
- Use `connect(credentials)` to establish a connection (vault-backed).
- Use `placeOrder`, `cancelOrder`, `getBalances`, `getPositions`, etc.

## Error Handling

- All methods throw on API/network error.
- Never log or expose credentials in errors.

## Security

- API keys are loaded from vault via secure backend endpoints only.
- Supabase RLS enforced on all credential tables.
- No secrets are ever sent to the frontend or logs.

## Testing

- See `src/tests/exchanges/coinbase-adapter.test.ts` for unit/integration test coverage.
- Use MSW for mocking REST/WebSocket APIs.
