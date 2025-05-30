-- Create dashboard layouts table for customizable user dashboards
-- This migration adds support for saving, loading, and managing dashboard layouts

-- Dashboard Layouts Table
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    widgets JSONB NOT NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on table
COMMENT ON TABLE public.dashboard_layouts IS 'User-customizable dashboard layouts';

-- Comments on columns
COMMENT ON COLUMN public.dashboard_layouts.id IS 'Unique identifier for the dashboard layout';
COMMENT ON COLUMN public.dashboard_layouts.name IS 'User-friendly name for the dashboard layout';
COMMENT ON COLUMN public.dashboard_layouts.is_default IS 'Whether this is the default layout for the user';
COMMENT ON COLUMN public.dashboard_layouts.widgets IS 'JSON configuration of dashboard widgets and their settings';
COMMENT ON COLUMN public.dashboard_layouts.farm_id IS 'Optional farm ID if the layout is specific to a farm';
COMMENT ON COLUMN public.dashboard_layouts.user_id IS 'User who owns this dashboard layout';
COMMENT ON COLUMN public.dashboard_layouts.created_at IS 'Timestamp when the layout was created';
COMMENT ON COLUMN public.dashboard_layouts.updated_at IS 'Timestamp when the layout was last updated';

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_dashboard_layouts_created_at
BEFORE INSERT ON public.dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_dashboard_layouts_updated_at
BEFORE UPDATE ON public.dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON public.dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_farm_id ON public.dashboard_layouts(farm_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_is_default ON public.dashboard_layouts(is_default);

-- Enable Row Level Security
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own dashboard layouts
CREATE POLICY "Users can view their own dashboard layouts"
ON public.dashboard_layouts FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own dashboard layouts
CREATE POLICY "Users can create their own dashboard layouts"
ON public.dashboard_layouts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own dashboard layouts
CREATE POLICY "Users can update their own dashboard layouts"
ON public.dashboard_layouts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own dashboard layouts
CREATE POLICY "Users can delete their own dashboard layouts"
ON public.dashboard_layouts FOR DELETE
USING (user_id = auth.uid());

-- Add a default limit of one default dashboard per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_layouts_user_default 
ON public.dashboard_layouts (user_id) 
WHERE is_default = true;

-- Add user preferences table for dashboard and UI settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system',
    dashboard_preferences JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Comment on table
COMMENT ON TABLE public.user_preferences IS 'User preferences for UI customization';

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_user_preferences_created_at
BEFORE INSERT ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own preferences
CREATE POLICY "Users can create their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences FOR DELETE
USING (user_id = auth.uid());
