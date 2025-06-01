-- Migration: 20250422_auth_profiles_table.sql
-- Description: Creates profiles table with role-based access control (RBAC) support
-- Generated: 2025-04-22T02:15:00Z

BEGIN;

-- Create function to handle created_at timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
set search_path = '';

-- Create enum for user roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM (
      'admin',
      'trader',
      'analyst',
      'viewer',
      'unassigned'
    );
  END IF;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'unassigned'::public.user_role,
  timezone TEXT DEFAULT 'UTC',
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for created_at
DROP TRIGGER IF EXISTS profiles_created_at ON public.profiles;
CREATE TRIGGER profiles_created_at
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger function to create a profile after user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'unassigned'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
set search_path = '';

-- Create trigger on auth.users table for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create function to check user's permission
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_is_allowed BOOLEAN := FALSE;
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If user not found or has no role, return false
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions based on role and resource
  CASE 
    WHEN v_role = 'admin' THEN
      -- Admin has all permissions
      v_is_allowed := TRUE;
      
    WHEN v_role = 'trader' THEN
      -- Trader permissions
      IF p_resource = 'farm' AND p_action IN ('read', 'update') THEN
        v_is_allowed := TRUE;
      ELSIF p_resource IN ('agent', 'order', 'strategy') AND p_action IN ('create', 'read', 'update', 'execute') THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'analytics' AND p_action = 'read' THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'settings' AND p_action IN ('read', 'update') THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'report' AND p_action IN ('create', 'read') THEN
        v_is_allowed := TRUE;
      END IF;
      
    WHEN v_role = 'analyst' THEN
      -- Analyst permissions
      IF p_resource IN ('farm', 'agent', 'order') AND p_action = 'read' THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'strategy' AND p_action IN ('read', 'update') THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'analytics' AND p_action IN ('create', 'read', 'update') THEN
        v_is_allowed := TRUE;
      ELSIF p_resource = 'report' AND p_action IN ('create', 'read', 'update') THEN
        v_is_allowed := TRUE;
      END IF;
      
    WHEN v_role = 'viewer' THEN
      -- Viewer permissions (read-only on most resources)
      IF p_action = 'read' AND p_resource IN ('farm', 'agent', 'order', 'strategy', 'analytics', 'report') THEN
        v_is_allowed := TRUE;
      END IF;
      
    ELSE
      -- Unassigned or unknown roles have no permissions
      v_is_allowed := FALSE;
  END CASE;
  
  RETURN v_is_allowed;
END;
$$;

-- Create function for users table access
CREATE OR REPLACE FUNCTION public.get_user_by_id(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_data JSONB;
BEGIN
  -- Check if requesting user is admin or the user themselves
  IF NOT (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT 
    jsonb_build_object(
      'id', au.id,
      'email', au.email,
      'created_at', au.created_at,
      'last_sign_in_at', au.last_sign_in_at,
      'profile', jsonb_build_object(
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'timezone', p.timezone,
        'settings', p.settings,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
    ) INTO user_data
  FROM 
    auth.users au
  LEFT JOIN 
    public.profiles p ON au.id = p.id
  WHERE 
    au.id = user_id;

  RETURN user_data;
END;
$$;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profile information with RBAC support';
COMMENT ON FUNCTION public.handle_new_user IS 'Creates a profile entry when a new user is created';
COMMENT ON FUNCTION public.check_user_permission IS 'Checks if a user has permission to perform an action on a resource';
COMMENT ON FUNCTION public.get_user_by_id IS 'Securely retrieves user information with profile data';

-- Record this migration
INSERT INTO public._migrations (name)
VALUES ('20250422_auth_profiles_table.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;
