# Trading Farm: Onboarding Guide

Welcome to the Trading Farm project! Follow these steps to get started as a developer or operator.

---

## 1. Prerequisites
- Node.js (v18+)
- pnpm or npm
- Supabase CLI
- Environment variables for API keys and DB (see `.env.example`)

## 2. Setup
1. Clone the repo and install dependencies:
   ```sh
   git clone <your-repo-url>
   cd TradingFarm/next-dashboard
   pnpm install
   ```
2. Configure environment variables:
   - Copy `.env.example` to `.env.local` and fill in required values.
3. Start Supabase locally:
   ```sh
   supabase start
   ```
4. Run database migrations:
   ```sh
   npx supabase migration up
   npx supabase gen types typescript --local > src/types/database.types.ts
   ```
5. Start the dashboard:
   ```sh
   pnpm dev
   ```

---

## 3. Key Concepts
- **Agents:** Autonomous trading bots orchestrated via ElizaOS.
- **Strategies:** Algorithmic trading logic, can be backtested and deployed.
- **Manual Controls:** Emergency stop, manual trade, rebalancing from the UI.
- **Real-Time Monitoring:** Live dashboards for trades, positions, agent health, and alerts.

---

## 4. Useful Commands
- Run tests: `pnpm test`
- Lint code: `pnpm lint`
- Generate DB types: `npx supabase gen types typescript --local > src/types/database.types.ts`

---

## 5. Paper Trading Mode
- Enable paper trading in agent or strategy config for safe simulation.

---

For detailed API and operational docs, see `src/core/README.md` and `src/services/README.md`.
