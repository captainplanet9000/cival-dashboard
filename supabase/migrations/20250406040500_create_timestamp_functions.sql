-- Function to handle automatic created_at timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the functions to the authenticated role
-- Adjust roles as necessary for your security model
GRANT EXECUTE ON FUNCTION public.handle_created_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
-- Grant to service_role as well if backend functions/triggers need it
GRANT EXECUTE ON FUNCTION public.handle_created_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;
