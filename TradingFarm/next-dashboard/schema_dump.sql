

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_transaction_approval_requirements"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_vault_id BIGINT;
  v_requires_approval BOOLEAN;
BEGIN
  -- Get the vault ID for this account
  SELECT vault_id INTO v_vault_id
  FROM public.vault_accounts
  WHERE id = NEW.account_id;
  
  -- Check if this vault requires approval
  SELECT requires_approval INTO v_requires_approval
  FROM public.vault_master
  WHERE id = v_vault_id;
  
  -- Set approval status based on vault settings
  IF v_requires_approval THEN
    NEW.approval_status := 'pending';
  ELSE
    NEW.approval_status := 'not_required';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_transaction_approval_requirements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_transaction_when_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If approvals_current >= approvals_required and status is pending, set to completed
  IF NEW.approvals_current >= NEW.approvals_required AND NEW.status = 'pending' THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."complete_transaction_when_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_command"("agent_id_param" integer, "order_id_param" bigint, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  command_id UUID;
BEGIN
  INSERT INTO public.agent_commands (
    agent_id,
    order_id,
    command_type,
    command_content,
    status,
    context
  ) VALUES (
    agent_id_param,
    order_id_param,
    command_type_param,
    command_content_param,
    'pending',
    context_param
  )
  RETURNING id INTO command_id;
  
  RETURN command_id;
END;
$$;


ALTER FUNCTION "public"."create_order_command"("agent_id_param" integer, "order_id_param" bigint, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  command_id UUID;
BEGIN
  INSERT INTO public.agent_commands (
    agent_id,
    order_id,
    command_type,
    command_content,
    status,
    context
  ) VALUES (
    agent_id_param,
    order_id_param,
    command_type_param,
    command_content_param,
    'pending',
    context_param
  )
  RETURNING id INTO command_id;
  
  RETURN command_id;
END;
$$;


ALTER FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") IS 'Creates a command for an agent to execute an order';



CREATE OR REPLACE FUNCTION "public"."create_order_command_v2"("p_order_id" bigint, "p_agent_id" bigint, "p_symbol" "text", "p_exchange" "text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  -- Get the order details
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  -- Only proceed if the order exists
  IF FOUND THEN
    -- Insert a command for the agent to execute
    INSERT INTO public.agent_commands (
      agent_id,
      order_id,
      command_type,
      command_content,
      status,
      context
    ) VALUES (
      p_agent_id,
      p_order_id,
      'execute_order',
      format('Execute %s order for %s %s of %s on %s', 
             v_order.order_type, 
             v_order.side, 
             v_order.quantity, 
             v_order.symbol, 
             v_order.exchange),
      'pending',
      jsonb_build_object(
        'order_id', v_order.id,
        'order_type', v_order.order_type,
        'side', v_order.side,
        'quantity', v_order.quantity,
        'symbol', v_order.symbol,
        'exchange', v_order.exchange,
        'price', v_order.price,
        'status', v_order.status,
        'metadata', COALESCE(p_metadata, v_order.metadata)
      )
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."create_order_command_v2"("p_order_id" bigint, "p_agent_id" bigint, "p_symbol" "text", "p_exchange" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_value DECIMAL;
  new_value DECIMAL;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = %L', column_name, table_name, row_id)
  INTO current_value;
  
  new_value := current_value - increment_amount;
  
  -- Don't allow negative values
  IF new_value < 0 THEN
    RAISE EXCEPTION 'Cannot decrement below zero';
  END IF;
  
  EXECUTE format('UPDATE %I SET %I = %L WHERE id = %L', 
                table_name, column_name, new_value, row_id);
  
  RETURN new_value;
END;
$$;


ALTER FUNCTION "public"."decrement"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_reserved"("account_id_param" bigint, "amount_param" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  current_reserved NUMERIC;
BEGIN
  SELECT reserved_balance INTO current_reserved
  FROM public.vault_accounts
  WHERE id = account_id_param;
  
  -- Ensure we don't go negative
  IF current_reserved < amount_param THEN
    RETURN 0;
  ELSE
    RETURN current_reserved - amount_param;
  END IF;
END;
$$;


ALTER FUNCTION "public"."decrement_reserved"("account_id_param" bigint, "amount_param" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_agent_command_on_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    INSERT INTO public.agent_commands (
      agent_id,
      order_id,
      command_type,
      command_content,
      status,
      context
    ) VALUES (
      NEW.agent_id,
      NEW.id,
      CASE 
        WHEN NEW.order_type = 'market' THEN 'execute_market_order'
        WHEN NEW.order_type = 'limit' THEN 'execute_limit_order'
        ELSE 'execute_order'
      END,
      'Execute ' || NEW.order_type || ' order for ' || NEW.symbol || ' on ' || NEW.exchange || ' (' || NEW.side || ')',
      'pending',
      json_build_object(
        'order_id', NEW.id,
        'symbol', NEW.symbol,
        'exchange', NEW.exchange,
        'order_type', NEW.order_type,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'price', NEW.price
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_agent_command_on_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_portfolio_value"("user_id_param" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(va.balance * 
      CASE
        WHEN va.currency = 'USD' THEN 1
        WHEN va.currency = 'BTC' THEN 65000
        WHEN va.currency = 'ETH' THEN 3000
        WHEN va.currency = 'USDT' THEN 1
        WHEN va.currency = 'USDC' THEN 1
        ELSE 1
      END
    ), 0) INTO total_value
  FROM 
    public.vault_accounts va
    JOIN public.vault_master vm ON va.vault_id = vm.id
  WHERE 
    vm.owner_id = user_id_param;
    
  RETURN total_value;
END;
$$;


ALTER FUNCTION "public"."get_total_portfolio_value"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vault_balance_summary"("user_id_param" "uuid") RETURNS TABLE("total_balance" numeric, "available_balance" numeric, "reserved_balance" numeric, "currency" character varying, "usd_value" numeric, "account_count" integer, "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(va.balance) AS total_balance,
    SUM(va.balance - va.reserved_balance) AS available_balance,
    SUM(va.reserved_balance) AS reserved_balance,
    va.currency,
    SUM(COALESCE(va.balance * vc.usd_rate, 0)) AS usd_value,
    COUNT(va.id) AS account_count,
    MAX(va.last_updated) AS last_updated
  FROM public.vault_accounts va
  JOIN public.vault_master vm ON va.vault_id = vm.id
  LEFT JOIN (
    -- Subquery to calculate USD exchange rates - in a real system this would be updated regularly
    SELECT
      id AS currency_id,
      CASE
        WHEN id = 'USD' THEN 1
        WHEN id = 'BTC' THEN 65000
        WHEN id = 'ETH' THEN 3000
        WHEN id = 'USDT' THEN 1
        WHEN id = 'USDC' THEN 1
        ELSE 1
      END AS usd_rate
    FROM public.vault_currencies
  ) vc ON va.currency = vc.currency_id
  WHERE vm.owner_id = user_id_param
  GROUP BY va.currency
  ORDER BY usd_value DESC;
END;
$$;


ALTER FUNCTION "public"."get_vault_balance_summary"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vault_balance_summary_by_vault"("user_id_param" "uuid", "vault_id_param" bigint) RETURNS TABLE("total_balance" numeric, "available_balance" numeric, "reserved_balance" numeric, "currency" character varying, "usd_value" numeric, "account_count" integer, "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verify ownership first
  PERFORM 1 FROM public.vault_master
  WHERE id = vault_id_param AND owner_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault not found or access denied';
  END IF;
  
  RETURN QUERY
  SELECT
    SUM(va.balance) AS total_balance,
    SUM(va.balance - va.reserved_balance) AS available_balance,
    SUM(va.reserved_balance) AS reserved_balance,
    va.currency,
    SUM(COALESCE(va.balance * vc.usd_rate, 0)) AS usd_value,
    COUNT(va.id) AS account_count,
    MAX(va.last_updated) AS last_updated
  FROM public.vault_accounts va
  LEFT JOIN (
    -- Subquery to calculate USD exchange rates
    SELECT
      id AS currency_id,
      CASE
        WHEN id = 'USD' THEN 1
        WHEN id = 'BTC' THEN 65000
        WHEN id = 'ETH' THEN 3000
        WHEN id = 'USDT' THEN 1
        WHEN id = 'USDC' THEN 1
        ELSE 1
      END AS usd_rate
    FROM public.vault_currencies
  ) vc ON va.currency = vc.currency_id
  WHERE va.vault_id = vault_id_param
  GROUP BY va.currency
  ORDER BY usd_value DESC;
END;
$$;


ALTER FUNCTION "public"."get_vault_balance_summary_by_vault"("user_id_param" "uuid", "vault_id_param" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wallet_with_details"("p_wallet_id" bigint) RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN (
    SELECT 
      jsonb_build_object(
        'wallet', row_to_json(w),
        'transactions', (
          SELECT jsonb_agg(row_to_json(t)) 
          FROM public.wallet_transactions t 
          WHERE t.wallet_id = w.id
          ORDER BY t.timestamp DESC
          LIMIT 100
        ),
        'alerts', (
          SELECT jsonb_agg(row_to_json(a)) 
          FROM public.wallet_alerts a 
          WHERE a.wallet_id = w.id
          ORDER BY a.timestamp DESC
        ),
        'settings', (
          SELECT row_to_json(s) 
          FROM public.wallet_settings s 
          WHERE s.wallet_id = w.id
        ),
        'balance_history', (
          SELECT jsonb_agg(row_to_json(h)) 
          FROM public.wallet_balance_history h 
          WHERE h.wallet_id = w.id
          ORDER BY h.timestamp DESC
          LIMIT 365
        )
      )
    FROM public.wallets w
    WHERE w.id = p_wallet_id
  );
END;
$$;


ALTER FUNCTION "public"."get_wallet_with_details"("p_wallet_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_created_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_created_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_order_command"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    -- Get the actual column name for order type from the database
    PERFORM public.create_order_command_v2(
      NEW.agent_id,
      NEW.id,
      'execute_order',
      format('Execute order for %s %s of %s on %s', 
             NEW.side, 
             NEW.quantity, 
             NEW.symbol, 
             NEW.exchange),
      jsonb_build_object(
        'order_id', NEW.id,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'symbol', NEW.symbol,
        'exchange', NEW.exchange
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_order_command"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_value DECIMAL;
  new_value DECIMAL;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = %L', column_name, table_name, row_id)
  INTO current_value;
  
  new_value := current_value + increment_amount;
  
  EXECUTE format('UPDATE %I SET %I = %L WHERE id = %L', 
                table_name, column_name, new_value, row_id);
  
  RETURN new_value;
END;
$$;


ALTER FUNCTION "public"."increment"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer DEFAULT NULL::integer, "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_eliza_transaction_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_owner_id UUID;
  v_vault_name TEXT;
  v_account_name TEXT;
  v_event_type TEXT;
  v_notification_data JSONB;
BEGIN
  -- Get the vault owner and relevant information
  SELECT 
    vm.owner_id, 
    vm.name,
    va.name
  INTO 
    v_owner_id, 
    v_vault_name,
    v_account_name
  FROM 
    public.vault_accounts va
    JOIN public.vault_master vm ON va.vault_id = vm.id
  WHERE 
    va.id = NEW.account_id;

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'new_transaction';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      v_event_type := 'status_changed';
    ELSIF OLD.approval_status != NEW.approval_status THEN
      v_event_type := 'approval_changed';
    ELSE
      v_event_type := 'transaction_updated';
    END IF;
  END IF;

  -- Prepare notification data
  v_notification_data := jsonb_build_object(
    'event_type', v_event_type,
    'transaction_id', NEW.id,
    'user_id', v_owner_id,
    'vault_name', v_vault_name,
    'account_name', v_account_name,
    'transaction_type', NEW.type,
    'amount', NEW.amount,
    'currency', NEW.currency,
    'status', NEW.status,
    'approval_status', NEW.approval_status,
    'timestamp', NEW.timestamp
  );

  -- Send notification to ElizaOS channel
  PERFORM pg_notify('eliza_vault_events', v_notification_data::text);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_eliza_transaction_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_command_trigger_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    -- Call the function to create the command
    PERFORM public.create_order_command_v2(
      NEW.id,
      NEW.agent_id,
      NEW.symbol,
      NEW.exchange,
      NEW.metadata
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."order_command_trigger_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_balance_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO balance_history (account_id, balance)
  VALUES (NEW.id, NEW.balance);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_balance_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_vault_balance_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.vault_balance_history
    (account_id, balance, reserved_balance, currency, timestamp)
  VALUES
    (NEW.id, NEW.balance, NEW.reserved_balance, NEW.currency, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_vault_balance_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_agent_response_insert"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    response_id UUID;
    test_agent_id BIGINT;
    test_command_id UUID;
BEGIN
    -- Get test data
    SELECT id INTO test_agent_id FROM public.agents LIMIT 1;
    SELECT id INTO test_command_id FROM public.agent_commands LIMIT 1;
    
    -- Exit early if no test data
    IF test_agent_id IS NULL OR test_command_id IS NULL THEN
        RETURN 'No test data available - need at least one agent and one command';
    END IF;
    
    -- Insert test response
    INSERT INTO public.agent_responses (
        agent_id,
        command_id,
        response_type,
        response_content,
        status,
        context,
        metadata
    ) VALUES (
        test_agent_id,
        test_command_id,
        'test_response',
        'This is a test response',
        'completed',
        '{"test": "value"}'::jsonb,
        '{"test_metadata": "value"}'::jsonb
    )
    RETURNING id INTO response_id;
    
    RETURN 'Test response created with ID: ' || response_id;
END;
$$;


ALTER FUNCTION "public"."test_agent_response_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Logs" OWNER TO "postgres";


ALTER TABLE "public"."Logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."documents_id_seq" OWNED BY "public"."documents"."id";



CREATE TABLE IF NOT EXISTS "public"."Trading_strategies_algo" (
    "id" bigint DEFAULT "nextval"('"public"."documents_id_seq"'::"regclass") NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."Trading_strategies_algo" OWNER TO "postgres";


COMMENT ON TABLE "public"."Trading_strategies_algo" IS 'This is a database of algorithmic trading strategies';



CREATE TABLE IF NOT EXISTS "public"."agent_commands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_id" integer NOT NULL,
    "command_type" "text" NOT NULL,
    "command_content" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "response_id" "uuid",
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "order_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_commands" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_commands" IS 'Table storing commands for agents to execute';



COMMENT ON COLUMN "public"."agent_commands"."command_type" IS 'Type of command (e.g. execute_order, analyze_market)';



COMMENT ON COLUMN "public"."agent_commands"."status" IS 'Status of the command (pending, completed, failed)';



COMMENT ON COLUMN "public"."agent_commands"."context" IS 'JSON context and details for the command';



CREATE TABLE IF NOT EXISTS "public"."agent_messages" (
    "id" bigint NOT NULL,
    "agent_id" bigint,
    "direction" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "agent_messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


ALTER TABLE "public"."agent_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agent_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."agent_messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agent_messages_id_seq" OWNED BY "public"."agent_messages"."id";



CREATE TABLE IF NOT EXISTS "public"."agent_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_id" integer NOT NULL,
    "command_id" "uuid",
    "response_type" "text" NOT NULL,
    "response_content" "text" NOT NULL,
    "source" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."agent_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_responses" IS 'Table storing responses from agents to commands';



COMMENT ON COLUMN "public"."agent_responses"."response_type" IS 'Type of response (e.g. order_execution, analysis)';



COMMENT ON COLUMN "public"."agent_responses"."metadata" IS 'Additional metadata for the response';



COMMENT ON COLUMN "public"."agent_responses"."context" IS 'JSON context and details for the response';



COMMENT ON COLUMN "public"."agent_responses"."status" IS 'Status of the response (pending, completed, failed)';



CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "name" "text" NOT NULL,
    "model_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tools_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "capabilities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "performance_metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "memory_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."agents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agents_id_seq" OWNED BY "public"."agents"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "action" "text" NOT NULL,
    "user_id" "text",
    "account_id" "text",
    "transaction_id" "text",
    "ip_address" "text",
    "user_agent" "text",
    "details" "jsonb",
    "severity" "text" DEFAULT 'info'::"text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "balance" numeric(18,6) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "transaction_id" "uuid"
);


ALTER TABLE "public"."balance_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brain_documents" (
    "id" bigint NOT NULL,
    "brain_id" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "filetype" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brain_documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."brain_documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."brain_documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."brain_documents_id_seq" OWNED BY "public"."brain_documents"."id";



CREATE TABLE IF NOT EXISTS "public"."brains" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "model_config" "jsonb",
    "memory_config" "jsonb",
    "capabilities" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "performance_metrics" "jsonb",
    "memory_context" "jsonb",
    "config" "jsonb",
    "embedding_model" "text"
);


ALTER TABLE "public"."brains" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."brains_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."brains_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."brains_id_seq" OWNED BY "public"."brains"."id";



CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "id" bigint NOT NULL,
    "document_id" bigint NOT NULL,
    "brain_id" bigint NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."document_chunks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."document_chunks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."document_chunks_id_seq" OWNED BY "public"."document_chunks"."id";



CREATE TABLE IF NOT EXISTS "public"."eliza_agents" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "capabilities" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "config" "jsonb",
    "brain_id" bigint
);


ALTER TABLE "public"."eliza_agents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."eliza_agents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."eliza_agents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."eliza_agents_id_seq" OWNED BY "public"."eliza_agents"."id";



CREATE TABLE IF NOT EXISTS "public"."eliza_commands" (
    "id" bigint NOT NULL,
    "command" "text" NOT NULL,
    "source" "text" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "response" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "processing_time_ms" integer
);


ALTER TABLE "public"."eliza_commands" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."eliza_commands_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."eliza_commands_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."eliza_commands_id_seq" OWNED BY "public"."eliza_commands"."id";



CREATE TABLE IF NOT EXISTS "public"."exchange_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credentials_id" "uuid" NOT NULL,
    "exchange_id" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'disconnected'::"text",
    "last_connected" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exchange_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_connections" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "exchange_type" "text" NOT NULL,
    "credentials" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."exchange_connections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exchange_connections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."exchange_connections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exchange_connections_id_seq" OWNED BY "public"."exchange_connections"."id";



CREATE TABLE IF NOT EXISTS "public"."exchange_credentials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exchange_id" "text" NOT NULL,
    "exchange_name" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "api_secret" "text" NOT NULL,
    "passphrase" "text",
    "testnet" boolean DEFAULT false,
    "description" "text",
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exchange_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "account_id" "uuid",
    "master_id" "uuid",
    "credentials" "jsonb",
    "is_active" boolean DEFAULT true,
    "last_sync" timestamp with time zone,
    "settings" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."external_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farm_brains" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "brain_id" bigint,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "config" "jsonb"
);


ALTER TABLE "public"."farm_brains" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."farm_brains_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."farm_brains_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."farm_brains_id_seq" OWNED BY "public"."farm_brains"."id";



CREATE TABLE IF NOT EXISTS "public"."farm_exchanges" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "exchange_id" bigint,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."farm_exchanges" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."farm_exchanges_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."farm_exchanges_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."farm_exchanges_id_seq" OWNED BY "public"."farm_exchanges"."id";



CREATE TABLE IF NOT EXISTS "public"."farm_strategies" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "strategy_id" bigint,
    "weight" numeric(5,2) DEFAULT 1.0 NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."farm_strategies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."farm_strategies_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."farm_strategies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."farm_strategies_id_seq" OWNED BY "public"."farm_strategies"."id";



CREATE TABLE IF NOT EXISTS "public"."farm_vaults" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "vault_id" bigint,
    "allocation_percentage" numeric DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "config" "jsonb"
);


ALTER TABLE "public"."farm_vaults" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."farm_vaults_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."farm_vaults_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."farm_vaults_id_seq" OWNED BY "public"."farm_vaults"."id";



CREATE TABLE IF NOT EXISTS "public"."farms" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "risk_profile" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "performance_metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "goal_name" "text",
    "goal_description" "text",
    "goal_target_assets" "text"[],
    "goal_target_amount" numeric,
    "goal_current_progress" "jsonb" DEFAULT '{}'::"jsonb",
    "goal_status" "text" DEFAULT 'inactive'::"text",
    "goal_completion_action" "jsonb",
    "goal_deadline" timestamp with time zone,
    CONSTRAINT "check_goal_status" CHECK (("goal_status" = ANY (ARRAY['inactive'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."farms" OWNER TO "postgres";


COMMENT ON COLUMN "public"."farms"."goal_name" IS 'User-defined name for the current farm goal.';



COMMENT ON COLUMN "public"."farms"."goal_description" IS 'Detailed description of the farm goal.';



COMMENT ON COLUMN "public"."farms"."goal_target_assets" IS 'Array of asset symbols the goal aims to accumulate (e.g., [''SUI'', ''SONIC'']).';



COMMENT ON COLUMN "public"."farms"."goal_target_amount" IS 'The target amount for one of the specified assets.';



COMMENT ON COLUMN "public"."farms"."goal_current_progress" IS 'JSONB object tracking progress for each target asset, e.g., {"SUI": 5000, "SONIC": 1000}.';



COMMENT ON COLUMN "public"."farms"."goal_status" IS 'Current status of the farm goal (e.g., inactive, active, paused, completed, failed).';



COMMENT ON COLUMN "public"."farms"."goal_completion_action" IS 'JSONB object defining actions upon goal completion (e.g., { "transferToBank": true, "percentage": 100 }).';



COMMENT ON COLUMN "public"."farms"."goal_deadline" IS 'Optional deadline for achieving the goal.';



CREATE SEQUENCE IF NOT EXISTS "public"."farms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."farms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."farms_id_seq" OWNED BY "public"."farms"."id";



CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "name" "text" NOT NULL,
    "description" "text",
    "target_type" "text" NOT NULL,
    "target_value" numeric(24,8) NOT NULL,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone,
    "current_value" numeric(24,8) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."goals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."goals_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."goals_id_seq" OWNED BY "public"."goals"."id";



CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "topic" "text" NOT NULL,
    "content" "text" NOT NULL,
    "source" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."knowledge_base" IS 'Table storing knowledge for agents like trading strategies';



CREATE TABLE IF NOT EXISTS "public"."market_data" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "timeframe" "text" NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "open" numeric(24,8),
    "high" numeric(24,8),
    "low" numeric(24,8),
    "close" numeric(24,8),
    "volume" numeric(24,8),
    "source" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."market_data" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."market_data_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."market_data_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."market_data_id_seq" OWNED BY "public"."market_data"."id";



CREATE TABLE IF NOT EXISTS "public"."order_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exchange_id" "text" NOT NULL,
    "order_id" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "side" "text" NOT NULL,
    "order_type" "text" NOT NULL,
    "price" numeric,
    "qty" numeric NOT NULL,
    "status" "text" NOT NULL,
    "filled_qty" numeric DEFAULT 0,
    "avg_price" numeric,
    "order_time" timestamp with time zone,
    "update_time" timestamp with time zone,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "farm_id" bigint,
    "agent_id" bigint,
    "strategy_id" bigint,
    "symbol" "text" NOT NULL,
    "order_type" "text" NOT NULL,
    "side" "text" NOT NULL,
    "quantity" numeric(24,8) NOT NULL,
    "price" numeric(24,8),
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "exchange" "text" NOT NULL,
    "exchange_order_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "executed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."orders_id_seq" OWNED BY "public"."orders"."id";



CREATE TABLE IF NOT EXISTS "public"."schema_migrations" (
    "id" integer NOT NULL,
    "version" "text" NOT NULL,
    "description" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."schema_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schema_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."schema_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schema_migrations_id_seq" OWNED BY "public"."schema_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."security_policies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "withdrawal_rules" "jsonb",
    "access_rules" "jsonb",
    "alert_rules" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."security_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "symbol" "text" NOT NULL,
    "side" "text" NOT NULL,
    "quantity" numeric(24,8) NOT NULL,
    "price" numeric(24,8) NOT NULL,
    "cost" numeric(24,8) NOT NULL,
    "fee" numeric(24,8) DEFAULT 0 NOT NULL,
    "exchange" "text" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."trades" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."trades_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."trades_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."trades_id_seq" OWNED BY "public"."trades"."id";



CREATE TABLE IF NOT EXISTS "public"."trading_strategies" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text"
);


ALTER TABLE "public"."trading_strategies" OWNER TO "postgres";


ALTER TABLE "public"."trading_strategies" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."trading_strategies_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" bigint NOT NULL,
    "source_wallet_id" bigint,
    "destination_wallet_id" bigint,
    "amount" numeric(24,8) NOT NULL,
    "currency" "text" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."transactions_id_seq" OWNED BY "public"."transactions"."id";



CREATE TABLE IF NOT EXISTS "public"."vault_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "master_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "farm_id" bigint,
    "agent_id" bigint,
    "address" "text",
    "balance" numeric DEFAULT 0 NOT NULL,
    "locked_amount" numeric DEFAULT 0 NOT NULL,
    "currency" character varying(10) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "risk_level" "text",
    "security_level" "text",
    "settings" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vault_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vault_approval_logs" (
    "id" bigint NOT NULL,
    "transaction_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_approval_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_approval_logs" IS 'Audit trail for transaction approvals';



ALTER TABLE "public"."vault_approval_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vault_approval_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vault_approvers" (
    "id" bigint NOT NULL,
    "vault_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'approver'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_approvers" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_approvers" IS 'Users with approval authority for a vault';



ALTER TABLE "public"."vault_approvers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vault_approvers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vault_balance_history" (
    "id" bigint NOT NULL,
    "account_id" bigint NOT NULL,
    "balance" numeric(20,8) NOT NULL,
    "reserved_balance" numeric(20,8) DEFAULT 0,
    "available_balance" numeric(20,8) GENERATED ALWAYS AS (("balance" - "reserved_balance")) STORED,
    "currency" character varying(20) NOT NULL,
    "usd_value" numeric(20,2),
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_balance_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_balance_history" IS 'Historical record of account balances';



ALTER TABLE "public"."vault_balance_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vault_balance_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vault_currencies" (
    "id" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "symbol" character varying(10) NOT NULL,
    "type" character varying(20) NOT NULL,
    "decimals" integer DEFAULT 8,
    "logo_url" character varying(255),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_currencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_currencies" IS 'Supported currencies with metadata';



CREATE TABLE IF NOT EXISTS "public"."vault_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "total_balance" numeric(18,6) DEFAULT 0,
    "allocated_balance" numeric(18,6) DEFAULT 0,
    "reserve_balance" numeric(18,6) DEFAULT 0,
    "high_risk_exposure" numeric(18,6) DEFAULT 0,
    "security_score" integer DEFAULT 80,
    "status" "text" DEFAULT 'active'::"text",
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."vault_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vault_settings" (
    "vault_id" bigint NOT NULL,
    "require_2fa" boolean DEFAULT true,
    "withdrawal_limit" numeric(20,8),
    "withdrawal_limit_period" character varying(20) DEFAULT 'daily'::character varying,
    "alerts_enabled" boolean DEFAULT true,
    "auto_balance_tracking" boolean DEFAULT true,
    "balance_tracking_interval" integer DEFAULT 60,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vault_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_settings" IS 'Configuration settings for vaults';



CREATE TABLE IF NOT EXISTS "public"."vault_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" character varying(10) NOT NULL,
    "source_id" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "destination_id" "text" NOT NULL,
    "destination_type" "text" NOT NULL,
    "initiated_by" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vault_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vaults" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "security_level" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "balance" numeric DEFAULT 0,
    "currency" "text",
    "config" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "public"."vaults" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."vaults_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."vaults_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."vaults_id_seq" OWNED BY "public"."vaults"."id";



CREATE TABLE IF NOT EXISTS "public"."wallet_alerts" (
    "id" bigint NOT NULL,
    "wallet_id" bigint NOT NULL,
    "type" character varying(50) NOT NULL,
    "message" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_alerts" OWNER TO "postgres";


ALTER TABLE "public"."wallet_alerts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wallet_alerts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."wallet_balance_history" (
    "id" bigint NOT NULL,
    "wallet_id" bigint NOT NULL,
    "balance" numeric(20,8) NOT NULL,
    "currency" character varying(20) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_balance_history" OWNER TO "postgres";


ALTER TABLE "public"."wallet_balance_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wallet_balance_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."wallet_migration_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "legacy_wallet_id" "text" NOT NULL,
    "vault_account_id" "uuid" NOT NULL,
    "migration_date" timestamp with time zone DEFAULT "now"(),
    "original_balance" numeric(18,6),
    "notes" "text"
);


ALTER TABLE "public"."wallet_migration_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_settings" (
    "wallet_id" bigint NOT NULL,
    "low_balance_threshold" numeric(20,8),
    "alerts_enabled" boolean DEFAULT true,
    "auto_refresh" boolean DEFAULT true,
    "refresh_interval" integer DEFAULT 15,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" bigint NOT NULL,
    "wallet_id" bigint NOT NULL,
    "type" character varying(50) NOT NULL,
    "amount" numeric(20,8) NOT NULL,
    "currency" character varying(20) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "tx_hash" character varying(255),
    "destination" character varying(255),
    "source" character varying(255),
    "fee" numeric(20,8),
    "fee_currency" character varying(20),
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


ALTER TABLE "public"."wallet_transactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wallet_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" bigint NOT NULL,
    "owner_id" bigint,
    "owner_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "balance" numeric(24,8) DEFAULT 0 NOT NULL,
    "currency" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "wallets_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['farm'::"text", 'agent'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."wallets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."wallets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."wallets_id_seq" OWNED BY "public"."wallets"."id";



ALTER TABLE ONLY "public"."agent_messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agent_messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."brain_documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."brain_documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."brains" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."brains_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."document_chunks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."document_chunks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."eliza_agents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."eliza_agents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."eliza_commands" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."eliza_commands_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exchange_connections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exchange_connections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."farm_brains" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."farm_brains_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."farm_exchanges" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."farm_exchanges_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."farm_strategies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."farm_strategies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."farm_vaults" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."farm_vaults_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."farms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."farms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."goals" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."goals_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."market_data" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."market_data_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schema_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schema_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."trades" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."trades_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."vaults" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."vaults_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."wallets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."wallets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Logs"
    ADD CONSTRAINT "Logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Trading_strategies_algo"
    ADD CONSTRAINT "Trading_strategies_algo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_commands"
    ADD CONSTRAINT "agent_commands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_responses"
    ADD CONSTRAINT "agent_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_history"
    ADD CONSTRAINT "balance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brain_documents"
    ADD CONSTRAINT "brain_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brains"
    ADD CONSTRAINT "brains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eliza_agents"
    ADD CONSTRAINT "eliza_agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eliza_commands"
    ADD CONSTRAINT "eliza_commands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_configs"
    ADD CONSTRAINT "exchange_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_configs"
    ADD CONSTRAINT "exchange_configs_user_id_exchange_id_key" UNIQUE ("user_id", "exchange_id");



ALTER TABLE ONLY "public"."exchange_connections"
    ADD CONSTRAINT "exchange_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_credentials"
    ADD CONSTRAINT "exchange_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_credentials"
    ADD CONSTRAINT "exchange_credentials_user_id_exchange_id_key" UNIQUE ("user_id", "exchange_id");



ALTER TABLE ONLY "public"."external_connections"
    ADD CONSTRAINT "external_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_brains"
    ADD CONSTRAINT "farm_brains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_exchanges"
    ADD CONSTRAINT "farm_exchanges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_strategies"
    ADD CONSTRAINT "farm_strategies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_vaults"
    ADD CONSTRAINT "farm_vaults_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farms"
    ADD CONSTRAINT "farms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_data"
    ADD CONSTRAINT "market_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_exchange_id_order_id_key" UNIQUE ("exchange_id", "order_id");



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_policies"
    ADD CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trading_strategies"
    ADD CONSTRAINT "trading_strategies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_accounts"
    ADD CONSTRAINT "vault_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_approval_logs"
    ADD CONSTRAINT "vault_approval_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_approvers"
    ADD CONSTRAINT "vault_approvers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_approvers"
    ADD CONSTRAINT "vault_approvers_vault_id_user_id_key" UNIQUE ("vault_id", "user_id");



ALTER TABLE ONLY "public"."vault_balance_history"
    ADD CONSTRAINT "vault_balance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_currencies"
    ADD CONSTRAINT "vault_currencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_master"
    ADD CONSTRAINT "vault_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_settings"
    ADD CONSTRAINT "vault_settings_pkey" PRIMARY KEY ("vault_id");



ALTER TABLE ONLY "public"."vault_transactions"
    ADD CONSTRAINT "vault_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaults"
    ADD CONSTRAINT "vaults_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_alerts"
    ADD CONSTRAINT "wallet_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_balance_history"
    ADD CONSTRAINT "wallet_balance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_migration_history"
    ADD CONSTRAINT "wallet_migration_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_settings"
    ADD CONSTRAINT "wallet_settings_pkey" PRIMARY KEY ("wallet_id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



CREATE INDEX "document_chunks_embedding_idx" ON "public"."document_chunks" USING "hnsw" ("embedding" "public"."vector_l2_ops");



CREATE INDEX "idx_agent_commands_agent_id" ON "public"."agent_commands" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_commands_order_id" ON "public"."agent_commands" USING "btree" ("order_id");



CREATE INDEX "idx_agent_messages_agent_id" ON "public"."agent_messages" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_messages_created_at" ON "public"."agent_messages" USING "btree" ("created_at");



CREATE INDEX "idx_agent_responses_agent_id" ON "public"."agent_responses" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_responses_command_id" ON "public"."agent_responses" USING "btree" ("command_id");



CREATE INDEX "idx_agents_farm_id" ON "public"."agents" USING "btree" ("farm_id");



CREATE INDEX "idx_agents_is_active" ON "public"."agents" USING "btree" ("is_active");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_balance_history_account_id" ON "public"."balance_history" USING "btree" ("account_id");



CREATE INDEX "idx_balance_history_timestamp" ON "public"."balance_history" USING "btree" ("timestamp");



CREATE INDEX "idx_eliza_commands_source" ON "public"."eliza_commands" USING "btree" ("source");



CREATE INDEX "idx_eliza_commands_status" ON "public"."eliza_commands" USING "btree" ("status");



CREATE INDEX "idx_exchange_connections_is_active" ON "public"."exchange_connections" USING "btree" ("is_active");



CREATE INDEX "idx_farm_exchanges_exchange_id" ON "public"."farm_exchanges" USING "btree" ("exchange_id");



CREATE INDEX "idx_farm_exchanges_farm_id" ON "public"."farm_exchanges" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_strategies_farm_id" ON "public"."farm_strategies" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_strategies_strategy_id" ON "public"."farm_strategies" USING "btree" ("strategy_id");



CREATE INDEX "idx_farms_is_active" ON "public"."farms" USING "btree" ("is_active");



CREATE INDEX "idx_goals_farm_id" ON "public"."goals" USING "btree" ("farm_id");



CREATE INDEX "idx_goals_status" ON "public"."goals" USING "btree" ("status");



CREATE INDEX "idx_market_data_symbol_timeframe_timestamp" ON "public"."market_data" USING "btree" ("symbol", "timeframe", "timestamp");



CREATE INDEX "idx_orders_agent_id" ON "public"."orders" USING "btree" ("agent_id");



CREATE INDEX "idx_orders_farm_id" ON "public"."orders" USING "btree" ("farm_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_strategy_id" ON "public"."orders" USING "btree" ("strategy_id");



CREATE INDEX "idx_orders_symbol" ON "public"."orders" USING "btree" ("symbol");



CREATE INDEX "idx_security_policies_account_id" ON "public"."security_policies" USING "btree" ("account_id");



CREATE INDEX "idx_trades_executed_at" ON "public"."trades" USING "btree" ("executed_at");



CREATE INDEX "idx_trades_order_id" ON "public"."trades" USING "btree" ("order_id");



CREATE INDEX "idx_trades_symbol" ON "public"."trades" USING "btree" ("symbol");



CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_destination_wallet_id" ON "public"."transactions" USING "btree" ("destination_wallet_id");



CREATE INDEX "idx_transactions_source_wallet_id" ON "public"."transactions" USING "btree" ("source_wallet_id");



CREATE INDEX "idx_vault_approval_logs_transaction_id" ON "public"."vault_approval_logs" USING "btree" ("transaction_id");



CREATE INDEX "idx_vault_approvers_user_id" ON "public"."vault_approvers" USING "btree" ("user_id");



CREATE INDEX "idx_vault_approvers_vault_id" ON "public"."vault_approvers" USING "btree" ("vault_id");



CREATE INDEX "idx_vault_balance_history_account_id" ON "public"."vault_balance_history" USING "btree" ("account_id");



CREATE INDEX "idx_vault_balance_history_timestamp" ON "public"."vault_balance_history" USING "btree" ("timestamp");



CREATE INDEX "idx_wallets_owner_id_owner_type" ON "public"."wallets" USING "btree" ("owner_id", "owner_type");



CREATE OR REPLACE TRIGGER "agent_commands_updated_at" BEFORE UPDATE ON "public"."agent_commands" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "agent_responses_updated_at" BEFORE UPDATE ON "public"."agent_responses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."vault_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."vault_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_vault_approval_logs_created_at" BEFORE INSERT ON "public"."vault_approval_logs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_vault_approvers_created_at" BEFORE INSERT ON "public"."vault_approvers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_vault_approvers_updated_at" BEFORE UPDATE ON "public"."vault_approvers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_vault_balance_history_created_at" BEFORE INSERT ON "public"."vault_balance_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_vault_currencies_created_at" BEFORE INSERT ON "public"."vault_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_vault_currencies_updated_at" BEFORE UPDATE ON "public"."vault_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_vault_settings_created_at" BEFORE INSERT ON "public"."vault_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_vault_settings_updated_at" BEFORE UPDATE ON "public"."vault_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_alert_created_at" BEFORE INSERT ON "public"."wallet_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_alert_updated_at" BEFORE UPDATE ON "public"."wallet_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_balance_history_created_at" BEFORE INSERT ON "public"."wallet_balance_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_created_at" BEFORE INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_settings_created_at" BEFORE INSERT ON "public"."wallet_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_settings_updated_at" BEFORE UPDATE ON "public"."wallet_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_transaction_created_at" BEFORE INSERT ON "public"."wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_transaction_updated_at" BEFORE UPDATE ON "public"."wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_wallet_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "knowledge_base_updated_at" BEFORE UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "orders_create_command" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_order_command"();



CREATE OR REPLACE TRIGGER "orders_create_command_v2" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."order_command_trigger_v2"();



CREATE OR REPLACE TRIGGER "set_agent_commands_created_at" BEFORE INSERT ON "public"."agent_commands" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_agent_commands_updated_at" BEFORE UPDATE ON "public"."agent_commands" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_agent_responses_created_at" BEFORE INSERT ON "public"."agent_responses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_agent_responses_updated_at" BEFORE UPDATE ON "public"."agent_responses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."brain_documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."document_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."vault_balance_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_created_at" BEFORE INSERT ON "public"."vaults" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_exchange_configs_created_at" BEFORE INSERT ON "public"."exchange_configs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_exchange_configs_updated_at" BEFORE UPDATE ON "public"."exchange_configs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_exchange_credentials_created_at" BEFORE INSERT ON "public"."exchange_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_exchange_credentials_updated_at" BEFORE UPDATE ON "public"."exchange_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_external_connections_created_at" BEFORE INSERT ON "public"."external_connections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_external_connections_updated_at" BEFORE UPDATE ON "public"."external_connections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_knowledge_base_created_at" BEFORE INSERT ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_knowledge_base_updated_at" BEFORE UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_order_history_created_at" BEFORE INSERT ON "public"."order_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_order_history_updated_at" BEFORE UPDATE ON "public"."order_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_security_policies_created_at" BEFORE INSERT ON "public"."security_policies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_security_policies_updated_at" BEFORE UPDATE ON "public"."security_policies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."brain_documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."vaults" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_vault_master_created_at" BEFORE INSERT ON "public"."vault_master" FOR EACH ROW EXECUTE FUNCTION "public"."handle_created_at"();



CREATE OR REPLACE TRIGGER "set_vault_master_updated_at" BEFORE UPDATE ON "public"."vault_master" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_generate_agent_command_on_order" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."generate_agent_command_on_order"();



CREATE OR REPLACE TRIGGER "update_agents_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_exchange_connections_updated_at" BEFORE UPDATE ON "public"."exchange_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_farm_exchanges_updated_at" BEFORE UPDATE ON "public"."farm_exchanges" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_farm_strategies_updated_at" BEFORE UPDATE ON "public"."farm_strategies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_farms_updated_at" BEFORE UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goals_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_wallets_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_commands"
    ADD CONSTRAINT "agent_commands_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_commands"
    ADD CONSTRAINT "agent_commands_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_responses"
    ADD CONSTRAINT "agent_responses_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_responses"
    ADD CONSTRAINT "agent_responses_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."agent_commands"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brain_documents"
    ADD CONSTRAINT "brain_documents_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "public"."brains"("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "public"."brains"("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."brain_documents"("id");



ALTER TABLE ONLY "public"."eliza_agents"
    ADD CONSTRAINT "eliza_agents_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "public"."brains"("id");



ALTER TABLE ONLY "public"."exchange_configs"
    ADD CONSTRAINT "exchange_configs_credentials_id_fkey" FOREIGN KEY ("credentials_id") REFERENCES "public"."exchange_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exchange_configs"
    ADD CONSTRAINT "exchange_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exchange_credentials"
    ADD CONSTRAINT "exchange_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_connections"
    ADD CONSTRAINT "external_connections_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "public"."vault_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."farm_brains"
    ADD CONSTRAINT "farm_brains_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "public"."brains"("id");



ALTER TABLE ONLY "public"."farm_brains"
    ADD CONSTRAINT "farm_brains_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id");



ALTER TABLE ONLY "public"."farm_exchanges"
    ADD CONSTRAINT "farm_exchanges_exchange_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchange_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_exchanges"
    ADD CONSTRAINT "farm_exchanges_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_strategies"
    ADD CONSTRAINT "farm_strategies_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_strategies"
    ADD CONSTRAINT "farm_strategies_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "public"."trading_strategies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_vaults"
    ADD CONSTRAINT "farm_vaults_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id");



ALTER TABLE ONLY "public"."farm_vaults"
    ADD CONSTRAINT "farm_vaults_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id");



ALTER TABLE ONLY "public"."vault_accounts"
    ADD CONSTRAINT "fk_agent" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vault_accounts"
    ADD CONSTRAINT "fk_farm" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "public"."trading_strategies"("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_destination_wallet_id_fkey" FOREIGN KEY ("destination_wallet_id") REFERENCES "public"."wallets"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_source_wallet_id_fkey" FOREIGN KEY ("source_wallet_id") REFERENCES "public"."wallets"("id");



ALTER TABLE ONLY "public"."vault_approval_logs"
    ADD CONSTRAINT "vault_approval_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_approvers"
    ADD CONSTRAINT "vault_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_alerts"
    ADD CONSTRAINT "wallet_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wallet_alerts"
    ADD CONSTRAINT "wallet_alerts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_balance_history"
    ADD CONSTRAINT "wallet_balance_history_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_settings"
    ADD CONSTRAINT "wallet_settings_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



CREATE POLICY "Allow full access to authenticated users for agent_commands" ON "public"."agent_commands" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access to authenticated users for agent_responses" ON "public"."agent_responses" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access to authenticated users for knowledge_base" ON "public"."knowledge_base" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for all users" ON "public"."agent_commands" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."agent_responses" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."knowledge_base" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."agent_commands" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."agent_responses" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."knowledge_base" FOR SELECT USING (true);



CREATE POLICY "Enable update for all users" ON "public"."agent_commands" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."agent_responses" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."knowledge_base" FOR UPDATE USING (true);



ALTER TABLE "public"."Logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can access their own wallets" ON "public"."wallets" TO "authenticated" USING ((("owner_id")::"text" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can access wallet alerts for their wallets" ON "public"."wallet_alerts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."wallets"
  WHERE (("wallets"."id" = "wallet_alerts"."wallet_id") AND (("wallets"."owner_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can access wallet balance history for their wallets" ON "public"."wallet_balance_history" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."wallets"
  WHERE (("wallets"."id" = "wallet_balance_history"."wallet_id") AND (("wallets"."owner_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can access wallet settings for their wallets" ON "public"."wallet_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."wallets"
  WHERE (("wallets"."id" = "wallet_settings"."wallet_id") AND (("wallets"."owner_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can access wallet transactions for their wallets" ON "public"."wallet_transactions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."wallets"
  WHERE (("wallets"."id" = "wallet_transactions"."wallet_id") AND (("wallets"."owner_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can delete their own exchange configs" ON "public"."exchange_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own exchange credentials" ON "public"."exchange_credentials" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own order history" ON "public"."order_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own exchange configs" ON "public"."exchange_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own exchange credentials" ON "public"."exchange_credentials" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own order history" ON "public"."order_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own exchange configs" ON "public"."exchange_configs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own exchange credentials" ON "public"."exchange_credentials" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own order history" ON "public"."order_history" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own exchange configs" ON "public"."exchange_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own exchange credentials" ON "public"."exchange_credentials" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own order history" ON "public"."order_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agent_commands" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_commands_admin_all" ON "public"."agent_commands" USING (true);



ALTER TABLE "public"."agent_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_responses_admin_all" ON "public"."agent_responses" USING (true);



ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brain_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_base_admin_all" ON "public"."knowledge_base" USING (true);



ALTER TABLE "public"."order_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trading_strategies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_approval_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_approvers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_balance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_master" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vault_master_user_policy" ON "public"."vault_master" TO "authenticated" USING (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."vault_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vaults" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_balance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_migration_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."Logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."Trading_strategies_algo";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";






























































































































































































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_transaction_approval_requirements"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_transaction_approval_requirements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_transaction_approval_requirements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_transaction_when_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."complete_transaction_when_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_transaction_when_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_command"("agent_id_param" integer, "order_id_param" bigint, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_command"("agent_id_param" integer, "order_id_param" bigint, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_command"("agent_id_param" integer, "order_id_param" bigint, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_command_v2"("agent_id_param" integer, "order_id_param" integer, "command_type_param" "text", "command_content_param" "text", "context_param" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_command_v2"("p_order_id" bigint, "p_agent_id" bigint, "p_symbol" "text", "p_exchange" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_command_v2"("p_order_id" bigint, "p_agent_id" bigint, "p_symbol" "text", "p_exchange" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_command_v2"("p_order_id" bigint, "p_agent_id" bigint, "p_symbol" "text", "p_exchange" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_reserved"("account_id_param" bigint, "amount_param" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_reserved"("account_id_param" bigint, "amount_param" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_reserved"("account_id_param" bigint, "amount_param" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_agent_command_on_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_agent_command_on_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_agent_command_on_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_portfolio_value"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_portfolio_value"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_portfolio_value"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vault_balance_summary"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_vault_balance_summary"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vault_balance_summary"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vault_balance_summary_by_vault"("user_id_param" "uuid", "vault_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_vault_balance_summary_by_vault"("user_id_param" "uuid", "vault_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vault_balance_summary_by_vault"("user_id_param" "uuid", "vault_id_param" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wallet_with_details"("p_wallet_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_wallet_with_details"("p_wallet_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wallet_with_details"("p_wallet_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_created_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_created_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_created_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_order_command"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_order_command"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_order_command"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment"("row_id" "text", "table_name" "text", "column_name" "text", "increment_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_eliza_transaction_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_eliza_transaction_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_eliza_transaction_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."order_command_trigger_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_command_trigger_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_command_trigger_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_balance_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_balance_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_balance_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_vault_balance_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_vault_balance_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_vault_balance_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_agent_response_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_agent_response_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_agent_response_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";



























GRANT ALL ON TABLE "public"."Logs" TO "anon";
GRANT ALL ON TABLE "public"."Logs" TO "authenticated";
GRANT ALL ON TABLE "public"."Logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Trading_strategies_algo" TO "anon";
GRANT ALL ON TABLE "public"."Trading_strategies_algo" TO "authenticated";
GRANT ALL ON TABLE "public"."Trading_strategies_algo" TO "service_role";



GRANT ALL ON TABLE "public"."agent_commands" TO "anon";
GRANT ALL ON TABLE "public"."agent_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_commands" TO "service_role";



GRANT ALL ON TABLE "public"."agent_messages" TO "anon";
GRANT ALL ON TABLE "public"."agent_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agent_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agent_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agent_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."agent_responses" TO "anon";
GRANT ALL ON TABLE "public"."agent_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_responses" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."balance_history" TO "anon";
GRANT ALL ON TABLE "public"."balance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_history" TO "service_role";



GRANT ALL ON TABLE "public"."brain_documents" TO "anon";
GRANT ALL ON TABLE "public"."brain_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."brain_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."brain_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."brain_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."brain_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."brains" TO "anon";
GRANT ALL ON TABLE "public"."brains" TO "authenticated";
GRANT ALL ON TABLE "public"."brains" TO "service_role";



GRANT ALL ON SEQUENCE "public"."brains_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."brains_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."brains_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."document_chunks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."document_chunks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."document_chunks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."eliza_agents" TO "anon";
GRANT ALL ON TABLE "public"."eliza_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."eliza_agents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."eliza_agents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."eliza_agents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."eliza_agents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."eliza_commands" TO "anon";
GRANT ALL ON TABLE "public"."eliza_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."eliza_commands" TO "service_role";



GRANT ALL ON SEQUENCE "public"."eliza_commands_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."eliza_commands_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."eliza_commands_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_configs" TO "anon";
GRANT ALL ON TABLE "public"."exchange_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_configs" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_connections" TO "anon";
GRANT ALL ON TABLE "public"."exchange_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_connections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exchange_connections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exchange_connections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exchange_connections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_credentials" TO "anon";
GRANT ALL ON TABLE "public"."exchange_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."external_connections" TO "anon";
GRANT ALL ON TABLE "public"."external_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."external_connections" TO "service_role";



GRANT ALL ON TABLE "public"."farm_brains" TO "anon";
GRANT ALL ON TABLE "public"."farm_brains" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_brains" TO "service_role";



GRANT ALL ON SEQUENCE "public"."farm_brains_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."farm_brains_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."farm_brains_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."farm_exchanges" TO "anon";
GRANT ALL ON TABLE "public"."farm_exchanges" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_exchanges" TO "service_role";



GRANT ALL ON SEQUENCE "public"."farm_exchanges_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."farm_exchanges_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."farm_exchanges_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."farm_strategies" TO "anon";
GRANT ALL ON TABLE "public"."farm_strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_strategies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."farm_strategies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."farm_strategies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."farm_strategies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."farm_vaults" TO "anon";
GRANT ALL ON TABLE "public"."farm_vaults" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_vaults" TO "service_role";



GRANT ALL ON SEQUENCE "public"."farm_vaults_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."farm_vaults_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."farm_vaults_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."farms" TO "anon";
GRANT ALL ON TABLE "public"."farms" TO "authenticated";
GRANT ALL ON TABLE "public"."farms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."farms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."farms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."farms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."market_data" TO "anon";
GRANT ALL ON TABLE "public"."market_data" TO "authenticated";
GRANT ALL ON TABLE "public"."market_data" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_data_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_data_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_data_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_history" TO "anon";
GRANT ALL ON TABLE "public"."order_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schema_migrations" TO "anon";
GRANT ALL ON TABLE "public"."schema_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schema_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."schema_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."schema_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."security_policies" TO "anon";
GRANT ALL ON TABLE "public"."security_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."security_policies" TO "service_role";



GRANT ALL ON TABLE "public"."trades" TO "anon";
GRANT ALL ON TABLE "public"."trades" TO "authenticated";
GRANT ALL ON TABLE "public"."trades" TO "service_role";



GRANT ALL ON SEQUENCE "public"."trades_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."trades_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."trades_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."trading_strategies" TO "anon";
GRANT ALL ON TABLE "public"."trading_strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."trading_strategies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."trading_strategies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."trading_strategies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."trading_strategies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vault_accounts" TO "anon";
GRANT ALL ON TABLE "public"."vault_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."vault_approval_logs" TO "anon";
GRANT ALL ON TABLE "public"."vault_approval_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_approval_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vault_approval_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vault_approval_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vault_approval_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vault_approvers" TO "anon";
GRANT ALL ON TABLE "public"."vault_approvers" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_approvers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vault_approvers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vault_approvers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vault_approvers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vault_balance_history" TO "anon";
GRANT ALL ON TABLE "public"."vault_balance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_balance_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vault_balance_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vault_balance_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vault_balance_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vault_currencies" TO "anon";
GRANT ALL ON TABLE "public"."vault_currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_currencies" TO "service_role";



GRANT ALL ON TABLE "public"."vault_master" TO "anon";
GRANT ALL ON TABLE "public"."vault_master" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_master" TO "service_role";



GRANT ALL ON TABLE "public"."vault_settings" TO "anon";
GRANT ALL ON TABLE "public"."vault_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_settings" TO "service_role";



GRANT ALL ON TABLE "public"."vault_transactions" TO "anon";
GRANT ALL ON TABLE "public"."vault_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."vaults" TO "anon";
GRANT ALL ON TABLE "public"."vaults" TO "authenticated";
GRANT ALL ON TABLE "public"."vaults" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_alerts" TO "anon";
GRANT ALL ON TABLE "public"."wallet_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_alerts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wallet_alerts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallet_alerts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallet_alerts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_balance_history" TO "anon";
GRANT ALL ON TABLE "public"."wallet_balance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_balance_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wallet_balance_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallet_balance_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallet_balance_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_migration_history" TO "anon";
GRANT ALL ON TABLE "public"."wallet_migration_history" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_migration_history" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_settings" TO "anon";
GRANT ALL ON TABLE "public"."wallet_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_settings" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wallet_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallet_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallet_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
