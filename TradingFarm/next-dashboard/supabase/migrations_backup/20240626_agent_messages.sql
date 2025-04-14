-- Create agent messages table for agent-to-agent communication
create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.agents(id) on delete cascade,
  sender_name text not null,
  sender_role text not null,
  recipient_id uuid references public.agents(id) on delete cascade,
  recipient_role text,
  content text not null,
  type text not null,
  priority text not null,
  metadata jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now(),
  requires_acknowledgment boolean not null default false,
  requires_response boolean not null default false,
  parent_message_id uuid references public.agent_messages(id) on delete set null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indexes for faster queries
create index if not exists agent_messages_sender_id_idx on public.agent_messages(sender_id);
create index if not exists agent_messages_recipient_id_idx on public.agent_messages(recipient_id);
create index if not exists agent_messages_timestamp_idx on public.agent_messages(timestamp);
create index if not exists agent_messages_status_idx on public.agent_messages(status);

-- Set up RLS policies
alter table public.agent_messages enable row level security;

-- Setup timestamp triggers
create trigger handle_agent_messages_created_at before insert on public.agent_messages
  for each row execute function public.handle_created_at();

create trigger handle_agent_messages_updated_at before update on public.agent_messages
  for each row execute function public.handle_updated_at();

-- Policy: Allow users to view messages for their agents
create policy "Users can view messages for their agents"
  on public.agent_messages
  for select
  using (
    exists (
      select 1 from public.agents a
      where (a.id = agent_messages.sender_id or a.id = agent_messages.recipient_id)
        and a.user_id = auth.uid()
    )
  );

-- Policy: Allow users to create messages for their agents
create policy "Users can send messages from their agents"
  on public.agent_messages
  for insert
  with check (
    exists (
      select 1 from public.agents a
      where a.id = agent_messages.sender_id
        and a.user_id = auth.uid()
    )
  );

-- Policy: Allow users to update messages for their agents
create policy "Users can update messages for their agents"
  on public.agent_messages
  for update
  using (
    exists (
      select 1 from public.agents a
      where (a.id = agent_messages.sender_id or a.id = agent_messages.recipient_id)
        and a.user_id = auth.uid()
    )
  );

-- Policy: Allow users to delete messages for their agents
create policy "Users can delete messages for their agents"
  on public.agent_messages
  for delete
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_messages.sender_id
        and a.user_id = auth.uid()
    )
  );

-- Add a function to get messages for a user
create or replace function public.get_user_agent_messages(user_id_param uuid, limit_param int default 100)
returns setof public.agent_messages
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select m.*
  from public.agent_messages m
  join public.agents a on (m.sender_id = a.id or m.recipient_id = a.id)
  where a.user_id = user_id_param
  order by m.timestamp desc
  limit limit_param;
end;
$$;
