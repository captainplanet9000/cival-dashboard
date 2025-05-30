# Trading Farm Platform - Simplified Functional Plan (Solo Developer Focus - Hole Fixing)

**Revised Goal:** Build and deploy a functional, persistent Trading Farm system usable by a solo developer to autonomously manage a small amount of capital ($50) using 1-2 defined agent strategies executing basic DeFi actions, *handling basic economic constraints and operational realities*.

**Underlying Principles (Revised):**

1.  **Functionality First:** Achieve the core loop (Configure -> Decide -> Check -> Execute -> Persist) reliably, including basic economic checks.
2.  **Solo Developer Ergonomics:** Build the minimum necessary tools (simple dashboard, clear logs, essential config) for *you* to operate the system.
3.  **Core Autonomy & Persistence:** Agents must run 24/7, make decisions based on their logic *and defined limits*, execute actions, handle basic failures, and maintain their state across restarts.
4.  **Simplicity & Focus:** Implement the minimum required features and infrastructure to achieve the goal, deferring complexity. Assume DeFi-first (Plan A).

---

## Phase 0: Setup, Verification & **Enhanced** Core Definition

*   **Objective:** Verify essential code, consolidate workspace, define the *minimum viable agent* with **economic awareness and a clear goal**, decide on key handling, and set up the environment.
*   **Subtasks:**
    1.  **Codebase Consolidation:** *(Action: Merge/organize, remove unused files. Verification: Clean tree, code runs.)*
    2.  **Core Technology Verification:** *(Action: Test ethers, OpenAI client, FastAPI, Supabase client locally. Verification: Test scripts succeed.)*
    3.  **Define Minimum Viable Agent (MVA) - Enhanced:**
        *   *Action:* Define the MVA with added rigor:
            *   **Objective Function:** Define *explicitly* (e.g., "Maximize USDC balance", "Maintain 50/50 ETH/USDC balance", "Execute configured swap periodically"). Document this.
            *   **Strategy:** Choose *one* simple strategy aligned with the objective (e.g., "If ETH balance > 0.01, swap 0.005 ETH to USDC hourly").
            *   **Execution:** Target *one* specific DeFi action (e.g., Uniswap V3 swap ETH <-> USDC).
            *   **Configuration:** Minimum params: swap amount/logic trigger, RPC URL, wallet key, **Max Slippage Tolerance** (e.g., 0.5%), **Max Gas Price** (e.g., 50 Gwei).
            *   **Persistence:** State needed: last execution time, status, last known balances (ETH/USDC), last error message, cumulative gas used (basic).
            *   **Autonomy:** Runs strategy loop, basic error logging, **pre-execution checks (gas, slippage)**.
            *   **Data Source:** Define primary data source (e.g., RPC node for balances, potentially a reliable price feed API for strategy decisions if needed).
        *   *Verification:* Definition documented, includes objective, economic limits, and data source.
    4.  **Define Minimum Viable Dashboard (MVD) - Enhanced:**
        *   *Action:* Define minimum UI:
            *   Configure MVA (form including **Max Slippage**, **Max Gas Price**).
            *   Securely input/manage wallet private key (reconfirm chosen method).
            *   Start/Stop MVA button.
            *   Display status, last execution, balances, **cumulative gas used**, last error.
            *   Display agent logs.
        *   *Verification:* UI requirements documented.
    5.  **Decide Wallet Key Handling Strategy:**
        *   *Action:* Make an explicit decision: store encrypted in DB (simpler, higher risk), use environment variables on Railway (better, key exposed to process), or research Railway's secrets/vault features (best, potentially more setup). Document the choice and rationale.
        *   *Verification:* Decision documented.
    6.  **Setup Local Environment:** *(Action: Ensure tools work, setup `.env`. Verification: Tools functional.)*

---

## Phase 1: Backend - **Aware** Agent Loop & Robust Persistence

*   **Objective:** Implement the backend service capable of running the MVA, executing its DeFi action *while respecting gas/slippage limits*, handling basic transaction failures, and persisting necessary state reliably.
*   **Subtasks (Iterative):**
    1.  **Basic FastAPI Setup:** *(Action: Setup FastAPI, Supabase client, basic structured logging, env var validation. Verification: Service runs, connects, logs.)*
    2.  **Enhanced Agent DB Schema:**
        *   *Action:* Create/update Supabase migration for `agents` table to include fields for `objective`, `max_slippage`, `max_gas_price`, `cumulative_gas_usd` (approximate), `last_error_details`. Handle `private_key` storage according to Phase 0 decision.
        *   *Verification:* Migration applies, table structure matches requirements.
    3.  **Core Agent Logic - Enhanced:**
        *   *Action:* Implement MVA strategy logic. **Enhancement:** Before execution, implement checks:
            *   Fetch current network gas price. Proceed only if `< max_gas_price`.
            *   (If possible) Estimate transaction gas cost. Log warning/skip if excessive relative to value/balance.
            *   Pass `max_slippage` to the execution service.
        *   *Action:* Implement basic handling for transaction *results*: log success/failure distinctly. Update persisted state based on outcome (e.g., update balances on success, log error details on failure). Implement core run loop.
        *   *Verification:* Logic runs locally. Pre-execution checks function correctly. State updates based on transaction outcome.
    4.  **DeFi Execution Service - Enhanced:**
        *   *Action:* Implement the specific DeFi action. **Enhancement:** Modify function to accept `max_slippage` parameter and use it in the transaction call. Return detailed result object: `{ success: bool, gas_used: number, transaction_hash: string | null, error_message: string | null }`. Securely load/use private key per Phase 0 decision.
        *   *Verification:* Can execute swap respecting slippage on testnet. Returns correct result object, including `gas_used`. Handles RPC errors gracefully.
    5.  **Persistence Implementation - Enhanced:**
        *   *Action:* Implement load/save functions for *all* required config and state from Phase 0 MVA definition (including objective, limits, cumulative gas). Ensure state is saved reliably after critical operations or shutdown.
        *   *Verification:* All defined state is correctly loaded/saved/persisted across restarts. Cumulative gas tracking updates.
    6.  **Minimal Agent Management Logic:** *(Action: Track running agent instance(s), functions to start/stop loop. Verification: Can start/stop agent loop.)*
    7.  **Dockerize Backend:** *(Action: Create Dockerfile, build/run locally. Verification: Runs correctly in Docker.)*

---

## Phase 2: Enhanced API & Functional Dashboard

*   **Objective:** Create the necessary API endpoints and a functional dashboard for the solo developer to configure economic limits, monitor key metrics (gas usage, errors), and manage the MVA.
*   **Subtasks (Iterative):**
    1.  **Enhanced Agent API Endpoints (FastAPI):**
        *   *Action:* Implement/update FastAPI endpoints:
            *   `POST /agent`: Accept `objective`, `max_slippage`, `max_gas_price` in config.
            *   `GET /agent/status`: Return current status, state, objective, limits, **cumulative gas used**, **last error details**.
            *   Other endpoints (`start`, `stop`, `logs`) as before.
        *   *Action:* Implement basic API key auth.
        *   *Verification:* Endpoints work via `curl`/Postman. Correct data (including new fields) is accepted/returned. Auth works.
    2.  **Basic Next.js Setup:** *(Action: Setup Next.js, Tailwind. Verification: Site runs locally.)*
    3.  **Implement Enhanced MVD UI:**
        *   *Action:* Create React components for: Agent config form (with **slippage/gas fields**), start/stop button, status display (including **cumulative gas, last error**), log display.
        *   *Verification:* Components render, include new fields.
    4.  **API Integration (Frontend):**
        *   *Action:* Connect UI components to enhanced backend API endpoints.
        *   *Verification:* UI can configure agent with limits, start/stop, display enhanced status/metrics fetched from backend.
    5.  **Basic Testing:** *(Action: Simple frontend/backend tests. Verification: Tests pass.)*

---

## Phase 3: Deployment & Functional Verification

*   **Objective:** Deploy the improved backend/frontend and verify the MVA operates autonomously on testnet according to its goal and economic limits, persisting state correctly.
*   **Subtasks:**
    1.  **Prepare Deployment Config:** *(Action: Setup env vars on Railway/Vercel, including new limits/keys. Verification: Variables correctly set.)*
    2.  **CI/CD Setup (Simplified):** *(Action: Configure basic CI/CD pipeline including migration step. Verification: Pipeline deploys successfully.)*
    3.  **Deploy Services:** *(Action: Trigger deployment. Verification: Services run, connect, communicate.)*
    4.  **End-to-End Functional Test (Manual):**
        *   *Action:* Use deployed dashboard:
            *   Configure MVA with objective, limits, wallet key ($50 testnet funds).
            *   Start agent.
            *   Monitor: Verify autonomous execution aligned with objective/strategy. Verify trades *only* happen if gas < max price. Verify slippage setting is respected (check transaction details on Etherscan). Verify status/gas used updates on dashboard. Verify errors are logged.
            *   Test persistence: Stop agent, check persisted state in Supabase (esp. cumulative gas, last status). Restart backend service. Restart agent via dashboard. Verify it loads correct state and continues.
            *   Test failure case: Set gas limit artificially low; verify agent logs "gas too high" errors and doesn't transact.
        *   *Verification:* Agent demonstrates core autonomous loop, respects defined economic limits, handles basic errors, and persists state correctly in deployed environment.
    5.  **Basic Monitoring/Alerting - Enhanced:**
        *   *Action:* Setup uptime monitoring. Configure crash alerts. **Enhancement:** Manually check logs periodically for excessive transaction failures or unexpected errors.
        *   *Verification:* Uptime checks pass. Crash alerts configured. Manual log review process defined.

---

## Phase 4: Intelligence, Reliability & Cost Tuning

*   **Objective:** Enhance the agent's intelligence, improve reliability through better error handling, and add basic cost tracking. (This replaces the previous "Refinement" phase, focusing on immediate needs).
*   **Subtasks (Select based on observed issues/needs):**
    1.  **Implement Basic Market Awareness:**
        *   *Action:* If strategy requires it, add logic to fetch necessary data (e.g., current ETH price via price feed API) within the agent `tick`. Modify strategy logic to use this data (e.g., "only swap if ETH > $X"). Add necessary config (API key?).
        *   *Verification:* Agent correctly fetches data and incorporates it into decision logic.
    2.  **Implement Dynamic Gas Price Strategy:**
        *   *Action:* Instead of just a max gas price, implement logic to only transact if current gas price is below a moving average or within a desired percentile (requires fetching gas price oracle data).
        *   *Verification:* Agent demonstrably waits for lower gas prices before executing trades.
    3.  **Enhance Transaction Failure Handling:**
        *   *Action:* Parse common transaction revert reasons (e.g., 'UniswapV3Router: INSUFFICIENT_OUTPUT_AMOUNT', 'out of gas'). Implement specific logic (e.g., increase slippage slightly on slippage revert, pause and alert on 'out of gas', retry on temporary network errors). Persist 'paused' state. Add UI button/API to resume paused agents.
        *   *Verification:* Agent correctly handles specific revert reasons and enters/exits 'paused' state appropriately.
    4.  **Implement Cost Tracking & Display:**
        *   *Action:* Refine `cumulative_gas_usd` tracking. Add logic to estimate P&L based on initial balance vs current (using fetched prices). Display Cost & basic P&L estimate on the dashboard.
        *   *Verification:* Gas/P&L display updates reasonably accurately.
    5.  **Refine State Persistence:** Ensure *all* necessary state for the enhanced logic (e.g., dynamic parameters, retry counts) is reliably persisted.

---

**Final Reflection Step (Explicit - Focused on Holes):**

*   **Assumptions:** Have we chosen the *right* economic limits (gas/slippage) for typical testnet conditions? Is the chosen data feed reliable? Is the strategy's objective function *actually achievable* with the simple logic and $50 capital (likely not profitable, but functionally achievable)? Is the wallet key handling method secure *enough* for this solo-dev, small-value context?
*   **Alternative Paths:** Could more sophisticated error handling/retries be implemented using a dedicated library (`tenacity` in Python)? Yes, deferring for simplicity initially. Could state be managed more robustly (event sourcing)? Yes, but overkill for this goal.
*   **Potential Gaps:** Backtesting is still absent – strategy effectiveness is unknown. Advanced risk management (beyond simple gas/slippage checks) is missing. Security is minimal. Multi-agent coordination isn't addressed. LLM reliability issues (if used) are only superficially handled by basic error checks.
*   **Confidence Level:** High confidence this revised plan addresses the major functional holes for the solo-dev goal (economics, persistence, basic awareness, error handling). Medium confidence the agent will operate *reliably* without further tuning in Phase 4. Low confidence the agent will be *profitable* (which wasn't the explicit goal, but is often implied). 