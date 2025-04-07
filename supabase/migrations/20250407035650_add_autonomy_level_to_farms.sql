-- Add autonomy_level column to farms table
ALTER TABLE public.farms
ADD COLUMN autonomy_level VARCHAR(20)
CHECK (autonomy_level IN ('manual', 'supervised', 'full'))
DEFAULT 'manual';

-- Add comment
COMMENT ON COLUMN public.farms.autonomy_level IS 'The level of autonomy enabled for the farm (manual, supervised, full).';

-- Update RLS policies if necessary to account for autonomy_level
-- Example: Maybe only fully autonomous farms can be managed by certain system roles.
-- This depends on your existing policies for the 'farms' table.
