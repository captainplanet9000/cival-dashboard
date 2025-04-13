-- Create collaborative insights table
CREATE TABLE collaborative_insights (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  votes INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('market', 'strategy', 'risk', 'technology')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'implemented', 'archived')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE
);

-- Create shared resources table
CREATE TABLE shared_resources (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'strategy', 'dataset', 'analysis')),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  owner_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_level TEXT NOT NULL DEFAULT 'team' CHECK (access_level IN ('public', 'team', 'private')),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  file_path TEXT,
  url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'
);

-- Create collaboration tasks table
CREATE TABLE collaboration_tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'under_review', 'complete')),
  assignees TEXT[] NOT NULL DEFAULT '{}',
  due_date TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  team_id UUID,
  tags TEXT[] NOT NULL DEFAULT '{}'
);

-- Create collaborative agent teams table
CREATE TABLE collaborative_agent_teams (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active_task UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE
);

-- Create collaborative team members table
CREATE TABLE collaborative_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES collaborative_agent_teams(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('leader', 'analyst', 'executor', 'observer')),
  type TEXT NOT NULL CHECK (type IN ('human', 'agent')),
  avatar TEXT,
  UNIQUE (team_id, member_id)
);

-- Create triggers to handle created_at and updated_at
CREATE TRIGGER handle_updated_at_collaborative_insights
BEFORE UPDATE ON collaborative_insights
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_shared_resources
BEFORE UPDATE ON shared_resources
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_collaboration_tasks
BEFORE UPDATE ON collaboration_tasks
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_collaborative_agent_teams
BEFORE UPDATE ON collaborative_agent_teams
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_collaborative_team_members
BEFORE UPDATE ON collaborative_team_members
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add Row Level Security (RLS)
ALTER TABLE collaborative_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for collaborative insights
CREATE POLICY "Users can view all insights" ON collaborative_insights
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own insights" ON collaborative_insights
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own insights" ON collaborative_insights
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own insights" ON collaborative_insights
  FOR DELETE USING (auth.uid() = author_id);

-- Create RLS policies for shared resources
CREATE POLICY "Users can view shared resources" ON shared_resources
  FOR SELECT USING (
    access_level = 'public' OR 
    auth.uid() = owner_id OR
    access_level = 'team' -- In a real app, add team membership check
  );

CREATE POLICY "Users can insert their own resources" ON shared_resources
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own resources" ON shared_resources
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own resources" ON shared_resources
  FOR DELETE USING (auth.uid() = owner_id);

-- Create RLS policies for collaboration tasks
CREATE POLICY "Users can view all tasks" ON collaboration_tasks
  FOR SELECT USING (true);

CREATE POLICY "Users can insert tasks" ON collaboration_tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tasks" ON collaboration_tasks
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete tasks" ON collaboration_tasks
  FOR DELETE USING (true);

-- Create RLS policies for collaborative agent teams
CREATE POLICY "Users can view agent teams" ON collaborative_agent_teams
  FOR SELECT USING (true);

CREATE POLICY "Users can insert agent teams" ON collaborative_agent_teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agent teams" ON collaborative_agent_teams
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete agent teams" ON collaborative_agent_teams
  FOR DELETE USING (true);

-- Create RLS policies for collaborative team members
CREATE POLICY "Users can view team members" ON collaborative_team_members
  FOR SELECT USING (true);

CREATE POLICY "Users can insert team members" ON collaborative_team_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update team members" ON collaborative_team_members
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete team members" ON collaborative_team_members
  FOR DELETE USING (true); 