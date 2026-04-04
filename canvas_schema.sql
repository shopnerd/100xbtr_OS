-- Canvas tables — run in Supabase SQL Editor
-- These were created manually during development and are not in supabase_setup.sql

create table if not exists canvas_nodes (
  id text primary key,
  label text default '',
  type text default 'idea',
  url text default '',
  img_url text default '',
  author text default '',
  x integer default 0,
  y integer default 0,
  w integer default 180,
  h integer default 54,
  group_id text default null,
  created_at timestamptz default now()
);

create table if not exists canvas_groups (
  id text primary key,
  label text default 'Group',
  color text default '#378ADD',
  x integer default 0,
  y integer default 0,
  w integer default 260,
  h integer default 180,
  created_at timestamptz default now()
);

create table if not exists canvas_links (
  id text primary key,
  source text references canvas_nodes(id) on delete cascade,
  target text references canvas_nodes(id) on delete cascade,
  claude boolean default false,
  sport integer default 0,
  tport integer default 0,
  created_at timestamptz default now()
);

create table if not exists saved_canvases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  snapshot jsonb,
  node_count integer default 0,
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row level security
alter table canvas_nodes enable row level security;
alter table canvas_groups enable row level security;
alter table canvas_links enable row level security;
alter table saved_canvases enable row level security;

-- Policies: full access for authenticated users
create policy "auth all canvas_nodes" on canvas_nodes
  for all using (auth.role() = 'authenticated');

create policy "auth all canvas_groups" on canvas_groups
  for all using (auth.role() = 'authenticated');

create policy "auth all canvas_links" on canvas_links
  for all using (auth.role() = 'authenticated');

create policy "auth all saved_canvases" on saved_canvases
  for all using (auth.role() = 'authenticated');

-- Enable realtime
alter publication supabase_realtime add table canvas_nodes;
alter publication supabase_realtime add table canvas_groups;
alter publication supabase_realtime add table canvas_links;
