alter table canvas_nodes add column if not exists w float default 180;
alter table canvas_nodes add column if not exists h float default 60;

create table if not exists canvas_groups (
  id text primary key,
  label text default 'Group',
  type text default 'idea',
  x float default 0,
  y float default 0,
  w float default 240,
  h float default 160,
  created_at timestamptz default now()
);
alter table canvas_groups enable row level security;
create policy "auth all canvas_groups" on canvas_groups for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
alter publication supabase_realtime add table canvas_groups;
