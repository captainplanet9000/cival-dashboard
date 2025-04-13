# Trading Farm Platform: Final Implementation Plan

**Version:** 2.0 (Incorporates Farm, Vault, Brain, ElizaOS & User-Provided Base Documents)

## 1. Core Architecture Overview

This plan outlines the implementation of the **Trading Farm Platform**, a multi-agent, multi-asset automated trading system based on the requirements and architecture defined in the project documentation (`Project Requirements`, `Tech Stack & APIs`, `App Flow`, `Backend Structure`).

The architecture centers around the **Farm** as the primary organizational unit, managed via a **`next-dashboard`** based UI. Each Farm encapsulates:

1.  **Agents:** ElizaOS-powered autonomous units executing tasks based on `eliza_config`.
2.  **Workflows:** Sequences of operations orchestrating agent actions and tool usage (building upon existing implementations).
3.  **Vault:** A secure, farm-specific ledger for financial management, interacting with **Linked Accounts** (external wallets/exchange connections).
4.  **Brain:** A farm-specific knowledge repository combining **structured Strategies** and ingested **Knowledge Documents** (SOPs, research) via an autonomous pipeline, accessible via vector search.
5.  **Goals:** Trackable objectives guiding agent and strategy behaviour.
6.  **ElizaOS Integration:** Natural language command, control, and information retrieval via integrated chat/voice interfaces.

**Project Goal:** Achieve 100% functionality as defined in the requirements, including connectivity to all specified CEX/DeFi/APIs, autonomous agent operation, robust data handling, secure vault management, intelligent Brain capabilities, and a comprehensive real-time UI.

## 2. Database Migration Implementation Sequence (Neon PostgreSQL / TimescaleDB)

*(Based on the conceptual schema in the "Backend Structure Document", refined with details from previous designs)*

**Note:** Execute these using Supabase migrations (`npx supabase migration new <name>`). Enable `uuid-ossp` and `pgvector` extensions.

### 2.1 Core User & Farm Tables

```sql
-- Ensure auth.users table exists (provided by Supabase Auth)

CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- e.g., 'active', 'inactive', 'archived'
    configuration JSONB DEFAULT '{}', -- Farm-level settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_farms_user_id ON farms(user_id);

-- RLS Policies for farms (Owner access)
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own farms" ON farms
    FOR ALL USING (auth.uid() = user_id);

-- updated_at Trigger
CREATE TRIGGER handle_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

### 2.2 Vault System Tables

```sql
CREATE TABLE vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(farm_id) -- Enforce 1:1 Farm-Vault relationship
);
CREATE INDEX idx_vaults_farm_id ON vaults(farm_id);

CREATE TABLE vault_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    asset_symbol TEXT NOT NULL, -- e.g., BTC, ETH, USDC
    balance DECIMAL NOT NULL DEFAULT 0 CHECK (balance >= 0), -- Ensure non-negative ledger balance
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vault_id, asset_symbol)
);
CREATE INDEX idx_vault_balances_vault_id ON vault_balances(vault_id);
CREATE INDEX idx_vault_balances_asset_symbol ON vault_balances(asset_symbol);

CREATE TABLE linked_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Link to user for RLS consistency
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('exchange_api', 'defi_wallet', 'other')),
    identifier TEXT NOT NULL, -- e.g., API Key public part, Wallet Address
    encrypted_credentials TEXT NOT NULL, -- Store encrypted secrets/keys securely
    metadata JSONB DEFAULT '{}', -- e.g., { exchangeName: 'binance', defaultChain: 'arbitrum' }
    is_default_funding_source BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_linked_accounts_farm_id ON linked_accounts(farm_id);
CREATE INDEX idx_linked_accounts_user_id ON linked_accounts(user_id);

CREATE TABLE transaction_logs ( -- Renamed from conceptual 'transactions' for clarity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, -- e.g., 'deposit', 'withdrawal', 'trade_fee', 'trade_pnl', 'internal_transfer', 'gas_fee'
    status TEXT NOT NULL, -- e.g., 'pending', 'completed', 'failed', 'cancelled'
    asset_symbol TEXT NOT NULL,
    amount DECIMAL NOT NULL, -- Can be positive or negative
    ending_vault_balance DECIMAL, -- Optional: snapshot of vault balance after tx
    description TEXT,
    related_workflow_step_id UUID, -- FK added later if workflow_steps exists
    related_agent_id UUID, -- FK added later if agents exists
    related_linked_account_id UUID REFERENCES linked_accounts(id) ON DELETE SET NULL,
    external_tx_id TEXT, -- Exchange order ID, blockchain tx hash
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_transaction_logs_farm_id_timestamp ON transaction_logs(farm_id, timestamp DESC);
CREATE INDEX idx_transaction_logs_type ON transaction_logs(type);
CREATE INDEX idx_transaction_logs_asset_symbol ON transaction_logs(asset_symbol);

-- RLS Policies for Vault System (Owner Access based on Farm ownership)
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage vaults of their farms" ON vaults
    FOR ALL USING (exists (select 1 from farms where farms.id = vaults.farm_id and farms.user_id = auth.uid()));

ALTER TABLE vault_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage balances of their farm vaults" ON vault_balances
    FOR ALL USING (exists (select 1 from vaults join farms on vaults.farm_id = farms.id where vaults.id = vault_balances.vault_id and farms.user_id = auth.uid()));

ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage linked accounts for their farms" ON linked_accounts
    FOR ALL USING (auth.uid() = user_id AND exists (select 1 from farms where farms.id = linked_accounts.farm_id and farms.user_id = auth.uid()));
-- **TODO:** Add stricter policy for selecting encrypted_credentials (allow only specific service roles?)

ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view transaction logs for their farms" ON transaction_logs
    FOR SELECT USING (exists (select 1 from farms where farms.id = transaction_logs.farm_id and farms.user_id = auth.uid()));
-- **TODO:** Add policies for INSERT (allow services/agents?).

-- updated_at Triggers
CREATE TRIGGER handle_vaults_updated_at BEFORE UPDATE ON vaults FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_vault_balances_updated_at BEFORE UPDATE ON vault_balances FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_linked_accounts_updated_at BEFORE UPDATE ON linked_accounts FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

### 2.3 Enhanced Agent Table (Integrating ElizaOS)

```sql
-- Assume 'agents' table exists from previous workflow setup or create it
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id), -- For RLS
    name TEXT NOT NULL,
    role TEXT, -- Derived from eliza_config
    description TEXT, -- Derived from eliza_config
    eliza_config JSONB NOT NULL, -- Store ElizaOS character config
    eliza_memory_config JSONB, -- Optional separate memory config
    status TEXT NOT NULL DEFAULT 'idle', -- e.g., 'initializing', 'running', 'stopped', 'error', 'idle'
    eliza_runtime_id TEXT, -- Identifier for runtime instance, if managed externally
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_agents_farm_id ON agents(farm_id);
CREATE INDEX idx_agents_user_id ON agents(user_id);

-- RLS Policies for Agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agents in their farms" ON agents
    FOR ALL USING (auth.uid() = user_id AND exists (select 1 from farms where farms.id = agents.farm_id and farms.user_id = auth.uid()));

-- updated_at Trigger
CREATE TRIGGER handle_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

### 2.4 Farm Brain Tables

```sql
-- Enable pgvector if not already done
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE brains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    configuration JSONB DEFAULT '{}', -- e.g., { embedding_model: 'text-embedding-ada-002' }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(farm_id) -- Enforce 1:1 Farm-Brain relationship
);
CREATE INDEX idx_brains_farm_id ON brains(farm_id);

CREATE TABLE brain_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brain_id UUID NOT NULL REFERENCES brains(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id), -- For RLS
    original_filename TEXT,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
    file_type TEXT, -- e.g., pdf, md, docx, txt
    file_size_bytes BIGINT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    error_message TEXT,
    metadata JSONB DEFAULT '{}', -- User tags, source URL etc.
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_brain_documents_brain_id ON brain_documents(brain_id);
CREATE INDEX idx_brain_documents_status ON brain_documents(status);
CREATE INDEX idx_brain_documents_user_id ON brain_documents(user_id); -- If needed

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES brain_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Dimension depends on embedding model
    metadata JSONB DEFAULT '{}', -- e.g., { page_number: 5 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
-- Create vector index AFTER enabling pgvector and populating data, e.g.,
-- CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100); -- Choose index type based on data size/query patterns

-- RLS Policies for Brain
ALTER TABLE brains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage brains of their farms" ON brains
    FOR ALL USING (exists (select 1 from farms where farms.id = brains.farm_id and farms.user_id = auth.uid()));

ALTER TABLE brain_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage documents in their farm brains" ON brain_documents
    FOR ALL USING (auth.uid() = user_id AND exists (select 1 from brains join farms on brains.farm_id = farms.id where brains.id = brain_documents.brain_id and farms.user_id = auth.uid()));

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
-- Allow read access based on document ownership, restrict modification
CREATE POLICY "Users can view chunks of documents in their farm brains" ON document_chunks
    FOR SELECT USING (exists (select 1 from brain_documents bd join brains b on bd.brain_id = b.id join farms f on b.farm_id = f.id where bd.id = document_chunks.document_id and f.user_id = auth.uid()));

-- updated_at Triggers
CREATE TRIGGER handle_brains_updated_at BEFORE UPDATE ON brains FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_brain_documents_updated_at BEFORE UPDATE ON brain_documents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

```

### 2.5 Strategy & Goal Tables (Linked to Farm/Brain)

```sql
-- Assume 'strategies' table exists, add brain_id FK
ALTER TABLE strategies ADD COLUMN brain_id UUID REFERENCES brains(id) ON DELETE SET NULL; -- Or CASCADE
CREATE INDEX idx_strategies_brain_id ON strategies(brain_id);
-- Update RLS policies for strategies to check brain/farm ownership

-- Assume 'goals' table exists, add farm_id FK
ALTER TABLE goals ADD COLUMN farm_id UUID REFERENCES farms(id) ON DELETE CASCADE;
CREATE INDEX idx_goals_farm_id ON goals(farm_id);
-- Update RLS policies for goals to check farm ownership
```

### 2.6 Link Workflows & Other Existing Tables to Farms

```sql
-- Assume 'workflows' table exists
ALTER TABLE workflows ADD COLUMN farm_id UUID REFERENCES farms(id) ON DELETE CASCADE;
CREATE INDEX idx_workflows_farm_id ON workflows(farm_id);
-- Update RLS policies for workflows

-- Add farm_id FKs and update RLS for other relevant existing tables
-- (e.g., schedules, collaborations, monitor_conditions, portfolio_snapshots)
```

## 3. Service Layer Implementation (Microservices Architecture)

Implement backend logic within distinct services, communicating via REST/GraphQL and Kafka/Redis as appropriate.

1.  **FarmService:**
    *   Manages `farms` CRUD.
    *   Handles creation of associated `vaults` and `brains`.
    *   Orchestrates deposit monitoring for `linked_accounts`.
    *   Handles withdrawal requests (potentially involving user confirmation workflow).
2.  **AgentService:**
    *   Manages `agents` CRUD, focusing on `eliza_config` validation and storage.
    *   Interacts with `ElizaExecutionService` to manage agent runtime lifecycle (`start`, `stop`, `status`).
3.  **VaultService:**
    *   Manages `vaults`, `vault_balances` CRUD.
    *   Provides atomic balance update methods.
4.  **LinkedAccountService:**
    *   Manages `linked_accounts` CRUD.
    *   Implements **secure encryption/decryption** for `encrypted_credentials` (using robust methods and secure key management). Provides restricted access `getDecryptedCredentials`.
5.  **TransactionLogService:**
    *   Manages `transaction_logs` creation and querying.
6.  **BrainService:**
    *   Manages `brains`, `brain_documents`, `document_chunks` CRUD.
    *   Implements the core `queryBrain` logic involving embedding generation and `pgvector` similarity search.
    *   May interact with `StrategyService` for combined searches.
7.  **IngestionService (or Supabase Function):**
    *   Handles the autonomous document processing pipeline: triggered by Storage, parses files, chunks text, generates embeddings (calls embedding API), stores chunks in `document_chunks`. Updates `brain_documents.status`.
8.  **StrategyService:**
    *   Manages `strategies` CRUD, ensuring linkage to `brain_id`.
9.  **GoalService:**
    *   Manages `goals` CRUD, ensuring linkage to `farm_id`.
    *   Implements goal progress tracking logic.
10. **ElizaExecutionService (Bridge to ElizaOS):**
    *   Receives requests from `WorkflowExecutionService`.
    *   Loads agent config (`eliza_config`).
    *   Fetches decrypted credentials via `LinkedAccountService` when needed.
    *   Interacts with the actual ElizaOS runtime/library to `invokeAction` or `generateLlmResponse`, passing credentials and context securely.
    *   Returns structured results (including transaction details for vault updates).
11. **WorkflowExecutionService (Updates):**
    *   Operates within `farmId` context.
    *   Uses `VaultService` to check balances before financial actions.
    *   Calls `ElizaExecutionService` for `tool_execution` (ElizaOS actions) and `llm_analysis` steps.
    *   Includes `update_vault_from_result` step type, calling `VaultService` and `TransactionLogService` based on structured results from transaction actions.
12. **Other Services (As per Backend Structure Doc):** Data Pipeline, Connectors, Execution Engine/SOR, Portfolio Management, Auth, Reporting, Notification services need implementation or updates to be farm-aware.

## 4. UI Implementation (`next-dashboard`)

Develop the frontend using React, TypeScript, Shadcn/ui, Tailwind CSS, integrated within the `next-dashboard` structure.

1.  **Core Layout:** Use `next-dashboard` `Sidebar`, `Header`, `ContentArea`. Sidebar navigates between Farms, main dashboard, settings. Header shows user info, wallet connection, notifications.
2.  **Farm Views:** Create dynamic routes (e.g., `/dashboard/farms/[farmId]`) displaying farm-specific content.
3.  **Integrated Tabs/Sections:** Implement the UI features within logical sections of the Farm detail view as outlined previously:
    *   **Overview:** Summaries using `Card`s.
    *   **Workflows:** List/manage workflows (reuse/adapt existing UI).
    *   **Agents:** `Table` for agent list, `Modal`/`Form` for create/edit (with `eliza_config` editor), start/stop actions.
    *   **Vault:** `Card`s/`Table` for balances, `Modal` for deposit/withdrawal, `Table` for linked accounts (with CRUD modals), `Table` for transaction logs.
    *   **Brain:**
        *   Knowledge Base/Documents: `Table` for `brain_documents`, integrated Supabase Dropzone for uploads, `Modal` for details/delete.
        *   Strategies: `Table`/`Card`s for strategy list, integrated editor.
        *   Query Interface: Search input calling backend query endpoint, results display.
4.  **Real-time Updates:** Implement WebSocket connections or polling via SWR/React Query to update UI elements (balances, statuses, logs) live.
5.  **State Management:** Use Zustand/Jotai/Context API for managing frontend state.
6.  **Charting/Visualization:** Use Chart.js/D3.js for portfolio performance, goal tracking, analytics.

## 5. Phasing Strategy

1.  **Phase 1: Foundational Farm & Agent Integration**
    *   Implement Farm DB tables & `FarmService` CRUD.
    *   Update Agent DB table & `AgentService` (with `eliza_config`).
    *   Basic Farm/Agent list & create/edit UI in `next-dashboard`.
    *   Update `WorkflowService` & `WorkflowExecutionService` to be farm-aware (link workflows, pass `farmId` context). Link existing workflow UI.
    *   Basic `ElizaExecutionService` bridge (mocking runtime).
2.  **Phase 2: Vault & Financial Operations**
    *   Implement Vault DB tables & `VaultService`, `LinkedAccountService` (with **real encryption**), `TransactionLogService`.
    *   Implement Vault UI sections in `next-dashboard`.
    *   Implement deposit monitoring in `FarmService`.
    *   Implement `update_vault_from_result` logic in `WorkflowExecutionService`.
    *   Update `ElizaExecutionService` to handle credential passing.
    *   Implement/test actual financial plugin actions (e.g., basic exchange trade).
3.  **Phase 3: Brain & Knowledge Management**
    *   Implement Brain DB tables & `BrainService` (core CRUD). Enable `pgvector`.
    *   Implement `StrategyService` linkage to Brain.
    *   Build the autonomous ingestion pipeline (Supabase Function/Service) with parsing, chunking, and **real embedding API calls**.
    *   Implement `BrainService.queryBrain` with **real vector search**.
    *   Build Brain UI sections in `next-dashboard` (document list, upload, strategy list, query interface).
    *   Integrate `@brain/query` action via `ElizaExecutionService`.
4.  **Phase 4: Advanced Features & Refinement**
    *   Implement Goal Management service & UI integration.
    *   Implement ElizaOS runtime management (`start/stopAgentRuntime`).
    *   Integrate remaining APIs/Protocols (DeFi, specialized services).
    *   Refine SOR, MEV protection, TCA.
    *   Implement advanced analytics, reporting, notifications.
    *   Comprehensive testing (unit, integration, E2E, security, performance).

## 6. Migration Strategy for Existing Code

1.  **Add `farm_id`:** Execute migrations to add the `farm_id` foreign key column to `workflows` and any other relevant existing tables (agents, strategies if they exist pre-farm).
2.  **Data Population:** Develop a script or manual process to associate existing records with a default Farm or allow users to assign them post-migration.
3.  **Service Refactoring:** Update existing service methods (e.g., `WorkflowService.getWorkflows`) to accept and filter by `farm_id`.
4.  **UI Adaptation:** Modify existing UI components (e.g., workflow list/detail pages) to operate within the new Farm-scoped navigation structure of `next-dashboard`.

## 7. Conclusion

This updated plan provides a comprehensive roadmap for building the Trading Farm platform, integrating the core concepts of Farms, Vaults, Brains, and ElizaOS Agents into the architecture outlined in the user-provided base documents. It leverages the chosen tech stack (Neon, Supabase, `next-dashboard`, Kafka, Redis, etc.) and provides a phased approach for development, starting with foundational elements and incrementally adding financial operations and knowledge management capabilities. Careful attention to security (esp. credential handling), database design (RLS, indexing), and the details of service interactions will be crucial for successful implementation.