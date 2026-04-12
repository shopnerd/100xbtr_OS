# 100xbtr_sound — Company OS + Canvas

## What This App Does

Two interconnected tools for a boutique horn loudspeaker startup, **100xbtr_sound**, co-founded by Will (design/CNC), Brendan (cabinetry), and Nishant (EE/horn design).

### `index.html` — Company OS
A real-time collaborative web app for the three founders. Tabs: Overview, Decisions, Team, First Build, Margins, Roadmap, Log, Canvas. Auth-gated to three specific Gmail addresses.

**Canvas is the single source of truth.** The Decisions tab reads/writes `canvas_nodes` (type='decision'). Overview metrics (open decisions, action progress, open questions) are derived from canvas data. The Log tab merges `log_entries` and `activity_log` into one unified feed. The Canvas tab shows a grouped summary of all canvas data with the AI-generated summary.

### `canvas.html` — Canvas
A shared visual thinking space: a Grasshopper-inspired node canvas where Claude lives inside it. You can ask Claude to build maps, analyze what's on the canvas, find gaps, suggest connections, and execute changes in real time while all three founders watch. Nodes, groups, and wires are stored in Supabase and sync live across all clients.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — single-file apps, no build step |
| Database | Supabase (Postgres + Realtime + Auth) |
| Auth | Google OAuth via Supabase, hardcoded allowed email list |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) via Netlify Function |
| Hosting | Netlify (static site + serverless function) |
| Domain | sound.100xbtr.com (GoDaddy → Netlify DNS) |
| Canvas rendering | HTML5 Canvas API (2D context), no libraries |
| Markup layer | HTML5 Canvas overlay, stored in localStorage |

No npm, no bundler, no framework. Both apps are single HTML files with all CSS and JS inlined.

---

## Live URLs

- **OS:** https://sound.100xbtr.com
- **Canvas:** https://sound.100xbtr.com/canvas.html
- **GitHub:** https://github.com/shopnerd/100xbtr_OS
- **Netlify:** https://100xbtr-os.netlify.app

---

## Credentials & Services

### Supabase
- **Project URL:** `https://uzhcjxolnfzcezbntzrz.supabase.co`
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6aGNqeG9sbmZ6Y2V6Ym50enJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzUzMDksImV4cCI6MjA5MDY1MTMwOX0.M92v-r1_hYvIj0FLNiXokWn-UFbH_HYK5UCNGuwhQNc`
- **Auth storageKey:** `100xbtr-auth`

### Google OAuth
- **Client ID:** `418198892807-u1jg55snhcpbh69vjvbt0no38scpfebp.apps.googleusercontent.com`
- Authorized redirect URI: `https://sound.100xbtr.com/canvas.html`
- Configured in Google Cloud Console

### Allowed users (hardcoded in both HTML files)
- `zolaray25@gmail.com` — Will
- `fraektaard@gmail.com` — Brendan
- `nishbphoto@gmail.com` — Nishant

### Anthropic API
- Set as Netlify environment variable: `ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-20250514`

---

## File Structure

```
100xbtr_OS/
├── index.html              # Company OS — all-in-one single file app
├── canvas.html             # Canvas — node graph with Claude integration
├── netlify.toml            # Netlify config: functions directory
├── netlify/
│   └── functions/
│       └── claude.js       # Serverless function: proxies Anthropic API calls
├── supabase_setup.sql      # Initial DB schema (OS tables)
├── supabase_update.sql     # Additional OS tables added later
├── SETUP.md                # Original deployment guide (for reference)
└── CLAUDE.md               # This file
```

### Missing files you should create
```
.env.example                # See section below
.gitignore                  # Exclude .env, node_modules, .DS_Store
```

---

## Database Schema

### OS tables (from `supabase_setup.sql` + `supabase_update.sql`)
- `decisions` — **DEPRECATED** — migrated to canvas_nodes (type='decision'). Table kept as backup.
- `log_entries` — legacy log entries (still read in merged Log view, new entries go to activity_log)
- `editable_fields` — team bios, build specs, mission/vision prose
- `collab_questions` / `collab_answers` — founder Q&A

### Canvas tables (created manually in Supabase SQL editor during development)
These were NOT in the SQL files — you need to create them:

```sql
create table if not exists canvas_nodes (
  id text primary key,
  label text default '',
  type text default 'idea',
  description text,
  url text default '',
  img_url text default '',
  thumbnail_url text,
  favicon_url text,
  author text default '',
  assignee text,
  status text,
  priority text,
  due_date date,
  sort_order integer default 0,
  resolved_at timestamptz,
  resolved_by text,
  url_broken boolean,
  url_checked_at timestamptz,
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
  link_type text default 'related',
  label text,
  claude boolean default false,
  sport integer default 0,
  tport integer default 0,
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text,
  author text,
  node_id text,
  image_data text,
  created_at timestamptz default now()
);

create table if not exists canvas_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
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

-- Enable RLS (currently open to authenticated users)
alter table canvas_nodes enable row level security;
alter table canvas_groups enable row level security;
alter table canvas_links enable row level security;
alter table saved_canvases enable row level security;

create policy "auth all canvas_nodes" on canvas_nodes for all using (auth.role()='authenticated');
create policy "auth all canvas_groups" on canvas_groups for all using (auth.role()='authenticated');
create policy "auth all canvas_links" on canvas_links for all using (auth.role()='authenticated');
create policy "auth all saved_canvases" on saved_canvases for all using (auth.role()='authenticated');

-- Realtime
alter publication supabase_realtime add table canvas_nodes;
alter publication supabase_realtime add table canvas_groups;
alter publication supabase_realtime add table canvas_links;
```

---

## How to Run Locally

There is no local dev server required — these are static HTML files. But Claude calls go through a Netlify function, so for local AI features you need Netlify CLI.

### Option A — Static only (no Claude features)
```bash
# Just open the files directly in a browser
open canvas.html
# Auth won't work on file:// — use a local server:
npx serve .
# Then visit http://localhost:3000/canvas.html
```

### Option B — Full local dev with Claude features
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create .env file (see .env.example)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run locally
netlify dev
# Visit http://localhost:8888/canvas.html
```

Note: Google OAuth redirect URL must include `http://localhost:8888` in Google Cloud Console authorized redirect URIs, and Supabase Auth must allow `http://localhost:8888` as a redirect URL.

### Deploy
```bash
# Push to GitHub — Netlify auto-deploys on push
git add -A
git commit -m "your message"
git push origin main
# Netlify deploys in ~30 seconds
```

---

## Conventions Established

### Canvas coordinate system
- Origin (0,0) is the center of the viewport
- Camera state: `cam = {x, y, z}` — pan offset in screen pixels, z is zoom scale
- World coordinates: `wx = (screenX - W/2 - cam.x) / cam.z`
- All DB positions stored as integer world coordinates

### Node types and colors
```js
const TC = {
  idea: '#378ADD',
  reference: '#1D9E75',
  material: '#BA7517',
  decision: '#D85A30',
  image: '#7F77DD',
  question: '#E8820C',
  anchor: '#666660'
}
```

### Group header height
`const GH = 24` — group header bar height in canvas units (not screen pixels). Nodes must always be placed at `g.y + GH + padding` to clear the header.

### Realtime write tracking
All DB writes register their ID in `_mw` (myWrites) to suppress the local client's own realtime echoes. Pattern: `_tw(table, id)` before every `sb.from().update/insert/delete`. Suppression window is 3 seconds.

### Claude JSON protocol
Canvas ↔ Claude communication uses structured JSON. `extractJSON(text)` handles markdown-fenced responses. Action types: `create_group`, `create_node`, `create_link`.

### Realtime channel
Canvas uses channel `canvas-rt8`. If you need to reset realtime (e.g. schema changes), bump this suffix.

### Markup layer
Stored only in `localStorage` under key `100xbtr_markup` as a PNG data URL. Not synced across clients. Stroke history in `mkStrokes[]` for redraw.

### ID generation
All IDs are client-generated: `'n-' + Date.now()` for nodes, `'g-' + Date.now()` for groups, `'l-' + Date.now()` for links. This works fine for 3 users but would have collision risk at scale.

---

## Current State / Known Issues

### Working well
- Real-time sync across all three clients
- Google OAuth login/logout
- Node creation, editing, deletion
- Group creation, header drag, bottom-edge resize
- Wire connections from either port (left or right)
- Alt+drag window selection, Ctrl+A select all
- Layout engine: grid arrangement, group repulsion, node repulsion
- Spread slider (live), node width slider (live)
- Auto-associate via Claude
- Saved canvases (save/load/delete)
- Markup layer: pen, line, rect, text, erase, layer lock, visibility toggle
- Touch/pinch zoom on iPhone

### Known bugs / incomplete

1. **Claude JSON output** — The Netlify function returns raw Anthropic API JSON (`{content: [{type: "text", text: "..."}]}`). The canvas `callClaude()` now handles this correctly, but the old behavior (browser treating response as a file download) may persist in cached deployments. Hard-refresh after deploy.

2. **Markup not synced** — Markup strokes are localStorage only. Each client has independent markup. For a true shared layer, strokes would need to go to Supabase.

3. **Markup pen tool default** — When the Markup tab is opened, the pen tool is shown as active in CSS but `mkCanvas.style.pointerEvents` starts as `none` (set in HTML). The user must click a tool button to activate drawing. Fix: call `setMkTool('pen', ...)` in `initMarkup()`.

4. **`alignNodesInGroups` duplicate** — The function is defined twice (lines ~1017 and ~1085 in canvas.html). The second definition shadows the first. Remove the first occurrence.

5. **`repelGroupsOnly` is async but called synchronously from slider** — The spread slider calls `repelGroupsOnly()` on every input event without awaiting. This causes parallel DB writes. Should debounce (300ms) before saving, but can update visuals immediately.

6. **Group resize only changes height** — The bottom-edge drag (`hGBottom`) only adjusts `g.h`. The right-edge `hGR` adjusts both `g.w` and `g.h`. There's no left-edge resize.

7. **Image nodes store base64 in DB** — Large images bloat the `canvas_nodes` table. Should use Supabase Storage for images and store URLs instead.

8. **No undo** — There's no undo/redo stack. Every action is immediately committed to Supabase.

9. **Canvas SQL not in repo** — The canvas table schema was created manually in Supabase during development sessions. It's documented above in CLAUDE.md but not in a `.sql` file in the repo. Add `canvas_schema.sql`.

10. **Hardcoded Supabase credentials** — `SURL` and `SKEY` are inlined in both HTML files. Should be moved to environment variables injected at build time, or fetched from a `/config` endpoint.

11. **Hardcoded allowed emails** — The `ALLOWED` array is inlined in HTML. Should be a Supabase table or env var.

12. **`fetchTitle` uses allorigins.win** — A third-party CORS proxy for URL title fetching. Unreliable. Should use a proper Netlify function for this.

13. **No `package.json`** — The project has no `package.json`. The Netlify function uses native `fetch` (Node 18+), which is fine. But if you add npm dependencies, you'll need to initialize one.

14. **`SETUP.md` references email/magic-link auth** — The original OS used email magic links, later switched to Google OAuth. SETUP.md is outdated and confusing.

---

## Recommended First Steps in Claude Code

1. **Add `canvas_schema.sql`** — Extract the canvas table SQL from CLAUDE.md into a proper file in the repo.
2. **Fix the duplicate `alignNodesInGroups`** — Remove the first definition around line 1017.
3. **Fix markup pen default** — Add `mkCanvas.style.pointerEvents = 'auto'` in `initMarkup()` so pen is immediately active.
4. **Add `.gitignore`** — `node_modules/`, `.env`, `.DS_Store`, `.netlify/`
5. **Debounce the spread slider** — Prevent parallel DB writes on fast slider movement.
6. **Consider extracting constants** — `SURL`, `SKEY`, `ALLOWED` emails into a config approach rather than inlined in HTML.
