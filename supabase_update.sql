-- Run this in Supabase SQL Editor

-- EDITABLE FIELDS (team bios, build specs, etc.)
create table if not exists editable_fields (
  id text primary key,
  label text,
  value text,
  section text,
  updated_by text,
  updated_at timestamptz,
  created_at timestamptz default now()
);

-- COLLABORATION QUESTIONS
create table if not exists collab_questions (
  id text primary key,
  question text not null,
  category text,
  created_at timestamptz default now()
);

-- COLLABORATION ANSWERS (one per founder per question)
create table if not exists collab_answers (
  id uuid primary key default gen_random_uuid(),
  question_id text references collab_questions(id),
  text text not null,
  author text,
  created_at timestamptz default now()
);

-- ENABLE RLS
alter table editable_fields enable row level security;
alter table collab_questions enable row level security;
alter table collab_answers enable row level security;

-- POLICIES
create policy "auth read editable_fields" on editable_fields for select using (auth.role()='authenticated');
create policy "auth update editable_fields" on editable_fields for update using (auth.role()='authenticated');
create policy "auth insert editable_fields" on editable_fields for insert with check (auth.role()='authenticated');

create policy "auth read collab_questions" on collab_questions for select using (auth.role()='authenticated');
create policy "auth insert collab_questions" on collab_questions for insert with check (auth.role()='authenticated');

create policy "auth read collab_answers" on collab_answers for select using (auth.role()='authenticated');
create policy "auth insert collab_answers" on collab_answers for insert with check (auth.role()='authenticated');
create policy "auth delete collab_answers" on collab_answers for delete using (auth.role()='authenticated');

-- REALTIME
alter publication supabase_realtime add table editable_fields;
alter publication supabase_realtime add table collab_questions;
alter publication supabase_realtime add table collab_answers;
