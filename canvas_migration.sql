-- 100xbtr_sound canvas migration: full feature parity with 100xbtr_think
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. Expand canvas_nodes with think-equivalent columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS assignee text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS resolved_by text;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS url_broken boolean;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS url_checked_at timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- 2. Expand canvas_links with typed connections
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE canvas_links ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE canvas_links ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'related';

-- ═══════════════════════════════════════════════════════════════
-- 3. Activity log table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  detail text,
  author text,
  node_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all activity_log" ON activity_log
  FOR ALL USING (auth.role()='authenticated');
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ═══════════════════════════════════════════════════════════════
-- 4. Config table (summary storage, etc.)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS canvas_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE canvas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all canvas_config" ON canvas_config
  FOR ALL USING (auth.role()='authenticated');

-- Allow anon reads on canvas_config for doc.html (public living document)
CREATE POLICY "anon read canvas_config" ON canvas_config
  FOR SELECT TO anon USING (true);

-- Allow anon reads on canvas tables for doc.html
CREATE POLICY "anon read canvas_nodes" ON canvas_nodes
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read canvas_groups" ON canvas_groups
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read canvas_links" ON canvas_links
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read activity_log" ON activity_log
  FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 8. Snapshot support — image_data column on activity_log
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS image_data text;
