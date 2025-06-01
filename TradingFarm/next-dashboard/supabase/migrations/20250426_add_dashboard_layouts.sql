-- Add dashboard_layouts table
CREATE TABLE IF NOT EXISTS "public"."dashboard_layouts" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "is_default" BOOLEAN DEFAULT false,
  "widgets" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "farm_id" UUID NOT NULL REFERENCES "public"."farms"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE "public"."dashboard_layouts" ENABLE ROW LEVEL SECURITY;

-- Create policies 
CREATE POLICY "Users can view their own dashboard layouts"
  ON "public"."dashboard_layouts"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard layouts"
  ON "public"."dashboard_layouts"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard layouts"
  ON "public"."dashboard_layouts"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard layouts"
  ON "public"."dashboard_layouts"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add timestamps triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."dashboard_layouts"
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
