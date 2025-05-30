-- Create tables for ElizaOS Strategy Integration

-- Strategy analyses table - stores AI-generated analyses of strategies
CREATE TABLE IF NOT EXISTS "public"."strategy_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "strategy_id" UUID NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE CASCADE
);

-- Create timestamps trigger for strategy_analyses
CREATE TRIGGER "handle_updated_at_strategy_analyses"
BEFORE UPDATE ON "public"."strategy_analyses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on strategy_analyses
ALTER TABLE "public"."strategy_analyses" ENABLE ROW LEVEL SECURITY;

-- Strategy analyses policies
CREATE POLICY "Users can view their own strategy analyses"
ON "public"."strategy_analyses"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own strategy analyses"
ON "public"."strategy_analyses"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own strategy analyses"
ON "public"."strategy_analyses"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own strategy analyses"
ON "public"."strategy_analyses"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

-- Strategy optimizations table - tracks parameter optimization requests and results
CREATE TABLE IF NOT EXISTS "public"."strategy_optimizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "strategy_id" UUID NOT NULL,
    "optimization_goal" TEXT NOT NULL,
    "constraints" JSONB,
    "original_parameters" JSONB,
    "optimized_parameters" JSONB,
    "performance_improvement" FLOAT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE CASCADE
);

-- Create timestamps trigger for strategy_optimizations
CREATE TRIGGER "handle_updated_at_strategy_optimizations"
BEFORE UPDATE ON "public"."strategy_optimizations"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on strategy_optimizations
ALTER TABLE "public"."strategy_optimizations" ENABLE ROW LEVEL SECURITY;

-- Strategy optimizations policies
CREATE POLICY "Users can view their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

-- Extend the existing agents table with ElizaOS specific fields if not already present
ALTER TABLE "public"."agents" 
ADD COLUMN IF NOT EXISTS "ai_config" JSONB,
ADD COLUMN IF NOT EXISTS "knowledge_base_enabled" BOOLEAN DEFAULT TRUE;

-- ElizaOS command history table - stores user commands and responses
CREATE TABLE IF NOT EXISTS "public"."eliza_command_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "agent_id" UUID,
    "strategy_id" UUID,
    "command" TEXT NOT NULL,
    "response" TEXT,
    "command_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE SET NULL,
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE SET NULL
);

-- Enable RLS on eliza_command_history
ALTER TABLE "public"."eliza_command_history" ENABLE ROW LEVEL SECURITY;

-- ElizaOS command history policies
CREATE POLICY "Users can view their own command history"
ON "public"."eliza_command_history"
FOR SELECT
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can insert their own command history"
ON "public"."eliza_command_history"
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can update their own command history"
ON "public"."eliza_command_history"
FOR UPDATE
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can delete their own command history"
ON "public"."eliza_command_history"
FOR DELETE
USING (
    user_id = auth.uid()
);

-- Add ElizaOS knowledge connection to strategies
ALTER TABLE "public"."strategies"
ADD COLUMN IF NOT EXISTS "eliza_enabled" BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "eliza_instructions" TEXT;
