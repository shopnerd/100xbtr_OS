-- Run this entire script in the Supabase SQL Editor (one paste, one click)

-- DECISIONS TABLE
create table if not exists decisions (
  id text primary key,
  text text not null,
  owner text,
  done boolean default false,
  badge text default 'open',
  created_at timestamptz default now()
);

-- LOG ENTRIES TABLE
create table if not exists log_entries (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text,
  color text default '#378ADD',
  created_at timestamptz default now()
);

-- ENABLE ROW LEVEL SECURITY
alter table decisions enable row level security;
alter table log_entries enable row level security;

-- ALLOW ALL OPERATIONS FOR AUTHENTICATED USERS ONLY
create policy "authenticated users can read decisions"
  on decisions for select using (auth.role() = 'authenticated');

create policy "authenticated users can update decisions"
  on decisions for update using (auth.role() = 'authenticated');

create policy "authenticated users can insert decisions"
  on decisions for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can read log"
  on log_entries for select using (auth.role() = 'authenticated');

create policy "authenticated users can insert log"
  on log_entries for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can delete log"
  on log_entries for delete using (auth.role() = 'authenticated');

-- ENABLE REALTIME ON BOTH TABLES
alter publication supabase_realtime add table decisions;
alter publication supabase_realtime add table log_entries;
