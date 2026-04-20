Command Center — Build Spec
Overview
Build a personal life command center as a local desktop web application. The user accesses it via localhost:3000 on their Mac. It is a single-screen sci-fi HUD interface — all 7 modules visible simultaneously on one screen with no navigation or page switching. Think dark cyberpunk game UI: dark backgrounds, neon accent colors, glowing panel borders, modular HUD panels.
Visual Direction
Dark theme: near-black backgrounds (#0a0a0f base)
Neon accent palette: cyan (#00f5ff), magenta (#ff00aa), amber (#ffaa00), purple (#9b59ff), green (#00ff88)
Panel borders: thin glowing lines, subtle box-shadow glow effects
Typography: monospace or near-monospace for data readouts, clean sans for body
Each module is a distinct HUD panel with a colored header accent
Overall aesthetic: a mix of a sci-fi game UI and an analyst's operations dashboard
Reference aesthetic: Cyberpunk 2077 UI meets a Bloomberg terminal
Tech Stack
Frontend: React + Vite (already scaffolded at ~/command-center/client)
Backend: Node.js + Express (already scaffolded at ~/command-center/server)
Database: SQLite via better-sqlite3 (local, no cloud)
Map: Leaflet.js (free, no API key required)
Calendar: Google OAuth 2.0 API (read-only)
Journal: Node.js fs module reading/writing markdown files to a local Obsidian vault path
RSS: rss-parser npm package
Backend dependencies already installed: express, cors, better-sqlite3, chokidar, rss-parser
Architecture
command-center/

├── client/                  # React + Vite frontend

│   ├── src/

│   │   ├── App.jsx          # Root single-screen HUD layout

│   │   ├── components/

│   │   │   ├── CharacterSheet.jsx

│   │   │   ├── QuestLog.jsx

│   │   │   ├── Journal.jsx

│   │   │   ├── Inventory.jsx

│   │   │   ├── Calendar.jsx

│   │   │   ├── Fitness.jsx

│   │   │   └── TravelMap.jsx

│   │   ├── styles/

│   │   │   └── hud.css      # Global sci-fi design system

│   │   └── main.jsx

└── server/

    ├── index.js             # Express entry point

    ├── database.js          # SQLite setup + schema init

    └── routes/

        ├── character.js

        ├── quests.js

        ├── inventory.js

        ├── fitness.js

        ├── journal.js

        ├── travel.js

        ├── calendar.js

        └── intel.js
Database Schema
Initialize all tables on server start via better-sqlite3. Use SQLite for all structured data.

-- Character

CREATE TABLE IF NOT EXISTS character (

  id INTEGER PRIMARY KEY,

  name TEXT,

  title TEXT,

  nickname TEXT,

  archetype TEXT,

  level INTEGER DEFAULT 1,

  xp INTEGER DEFAULT 0,

  bio TEXT,

  avatar_path TEXT,

  custom_stats TEXT  -- JSON blob for freeform stats

);

-- Quests

CREATE TABLE IF NOT EXISTS quests (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  title TEXT NOT NULL,

  description TEXT,

  category TEXT,

  status TEXT DEFAULT 'active',  -- active | complete | abandoned

  tier TEXT DEFAULT 'side',      -- main | side

  progress INTEGER DEFAULT 0,    -- 0-100

  target_date TEXT,

  created_at TEXT DEFAULT (datetime('now'))

);

CREATE TABLE IF NOT EXISTS quest_objectives (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  quest_id INTEGER REFERENCES quests(id),

  label TEXT,

  completed INTEGER DEFAULT 0

);

-- Inventory

CREATE TABLE IF NOT EXISTS assets (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,

  category TEXT,   -- property | vehicle | tech | other

  value_estimate REAL,

  notes TEXT,

  image_path TEXT

);

CREATE TABLE IF NOT EXISTS accounts (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,

  institution TEXT,

  type TEXT,       -- brokerage | retirement | crypto | bank

  balance REAL,

  notes TEXT

);

CREATE TABLE IF NOT EXISTS watchlist (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  ticker TEXT,

  name TEXT,

  current_price REAL,

  target_price REAL,

  status TEXT DEFAULT 'watching',  -- watching | prospective | owned

  notes TEXT,

  updated_at TEXT DEFAULT (datetime('now'))

);

-- Fitness

CREATE TABLE IF NOT EXISTS workout_templates (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,

  exercises TEXT  -- JSON array of {name, sets, reps, weight}

);

CREATE TABLE IF NOT EXISTS workout_logs (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  template_id INTEGER REFERENCES workout_templates(id),

  date TEXT NOT NULL,

  status TEXT DEFAULT 'hit',  -- hit | missed

  notes TEXT

);

CREATE TABLE IF NOT EXISTS fitness_goals (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  title TEXT,

  progress INTEGER DEFAULT 0,

  target_date TEXT

);

CREATE TABLE IF NOT EXISTS supplements (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT,

  dose TEXT,

  timing TEXT,

  active INTEGER DEFAULT 1

);

CREATE TABLE IF NOT EXISTS body_stats (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  date TEXT NOT NULL,

  weight REAL,

  notes TEXT

);

-- Travel

CREATE TABLE IF NOT EXISTS travel_pins (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,

  lat REAL NOT NULL,

  lng REAL NOT NULL,

  country TEXT,

  status TEXT DEFAULT 'radar',  -- conquered | radar | dreaming

  notes TEXT,

  image_path TEXT,

  target_date TEXT

);

-- Intel Feed

CREATE TABLE IF NOT EXISTS rss_feeds (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT,

  url TEXT NOT NULL,

  tag TEXT,

  active INTEGER DEFAULT 1

);
Module Specs
01 — Character Sheet
HUD panel top-left. Dark panel with purple accent border.

Fields:

Player name (large, prominent)
Title / nickname (subtitle, editable)
Archetype / class descriptor
Avatar image (upload, displayed as portrait with hex-clip or circle crop)
Level + XP (purely cosmetic, manually set)
Short bio / lore blurb
Custom stats: user-defined label + value pairs (e.g. "Discipline: 87", "Wealth: 62"). Stored as JSON. Displayed as a mini stat grid with progress bar style readouts.

Interactions:

Click any field to edit inline
Save on blur or Enter


02 — Quest Log
HUD panel. Cyan accent border.

Features:

List of quests with title, progress bar (0–100%), status badge, tier badge (Main Quest / Side Quest)
Click quest to expand: shows description, target date, objectives checklist
Add new quest via inline form
Filter by status (Active / Complete / Abandoned)
Manual progress slider on each quest
Objectives are checkboxes; checking all auto-prompts to mark complete


03 — Journal
HUD panel. Amber accent border.

Features:

Configurable vault path (stored in a local config.json file at the server root)
Reads all .md files from the vault root and one level deep
Displays 5 most recent entries as cards (filename as title, first 100 chars as preview)
"New Entry" button: creates a new .md file in the vault with today's date as filename, then opens it in Obsidian via open obsidian:// URI
"Open in Obsidian" link on each card
No markdown editor inside the app — Obsidian handles all editing


04 — Inventory + Financial
HUD panel. Green accent border. Two sub-tabs: Assets and Financial.

Assets tab:

Grid of asset cards: name, category icon, value estimate, notes
Add / edit / delete assets
Categories: Property, Vehicle, Tech, Other

Financial tab:

Investment accounts list with balances → auto-calculates total net tracked value
Donut chart showing allocation across accounts (use Chart.js or Recharts)
Watchlist table: ticker, name, price, target price, status badge, notes
Status options: Watching / Prospective / Owned
Add / edit / delete entries throughout


05 — Calendar + Intel Feed
HUD panel. Blue accent border. Two sub-sections stacked.

Calendar (top half):

Google OAuth 2.0 integration (read-only access to primary calendar)
Shows today's date prominently
Lists events for today + next 7 days
Each event shows: time, title, location if present
OAuth credentials loaded from server/.env file (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
Token stored locally in server/google-token.json
If not authenticated, show a "Connect Google Calendar" button that initiates OAuth flow

Intel Feed (bottom half):

Fetches and displays latest articles from configured RSS feeds
Shows: title, source name, published date, link (opens in browser)
Feeds managed via settings: add/remove RSS URLs with a tag
Refreshes on panel load, manual refresh button
Filter by tag


06 — Fitness
HUD panel. Pink/magenta accent border.

Features:

Saved workout templates: name, list of exercises with sets/reps/weight
Daily log: select a template, mark as Hit or Missed, add notes
Weekly heatmap calendar showing hit/missed streak (last 30 days)
Fitness goals with manual progress bars
Supplement stack: name, dose, timing — toggleable active/inactive
Body stats log: date, weight, optional notes — displayed as a simple line chart (last 30 entries)


07 — Travel / Exploration Map
HUD panel. Orange accent border. Full-width panel at bottom or right column.

Features:

Interactive world map using Leaflet.js with a dark tile layer (use CartoDB Dark Matter: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png)
Custom pin markers colored by status:
Conquered: cyan/teal
On Radar: amber
Dreaming: purple
Click map to add new pin: opens a form for name, country, status, notes, target date
Click existing pin to view/edit detail card
Countries visited counter displayed on panel
Pins persist in SQLite


HUD Layout
Single screen, no scrolling (or minimal). Suggested CSS grid layout:

┌─────────────┬──────────────────┬─────────────┐

│  CHARACTER  │    QUEST LOG     │   CALENDAR  │

│   SHEET     │                  │  + INTEL    │

├─────────────┼──────────────────┤             │

│  INVENTORY  │    FITNESS       │             │

│  FINANCIAL  │                  ├─────────────┤

├─────────────┴──────────────────┴─────────────┤

│              TRAVEL MAP (full width)          │

│         JOURNAL (sidebar or overlay)          │

└───────────────────────────────────────────────┘

Use CSS Grid on the root App.jsx. The entire viewport is the HUD — height: 100vh, overflow: hidden on body. Individual panels can have internal scroll where needed (quest list, intel feed, etc.) but the outer shell never scrolls.

Panel style template:

.hud-panel {

  background: rgba(10, 10, 20, 0.92);

  border: 1px solid var(--panel-accent);

  box-shadow: 0 0 12px rgba(var(--panel-accent-rgb), 0.15);

  border-radius: 4px;

  display: flex;

  flex-direction: column;

  overflow: hidden;

}

.hud-panel-header {

  padding: 6px 12px;

  border-bottom: 1px solid var(--panel-accent);

  font-size: 11px;

  font-weight: 600;

  letter-spacing: 0.12em;

  text-transform: uppercase;

  color: var(--panel-accent);

}


Configuration
Create server/config.json on first run if it doesn't exist:

{

  "obsidian_vault_path": "",

  "rss_feeds": []

}

Create server/.env.example:

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/oauth/callback


Startup
Create a root-level start.sh script:

#!/bin/bash

cd server && node index.js &

cd client && npm run dev

And a root package.json with:

{

  "scripts": {

    "start": "concurrently \"cd server && node index.js\" \"cd client && npm run dev\""

  }

}


Implementation Notes
All data is local. No cloud sync, no external database.
The app should work fully offline except for Google Calendar sync and RSS feed fetching.
Use React hooks (useState, useEffect, useCallback) throughout — no Redux needed.
Fetch all API calls to http://localhost:3001/api/...
Error states should display gracefully inside each panel (don't crash the whole HUD)
The Journal panel degrades gracefully if no vault path is configured — shows a "Configure vault path" prompt
Google Calendar degrades gracefully if not authenticated — shows connect button
Use better-sqlite3 synchronously on the server — it's a local app, sync is fine
No authentication layer needed — this is a local personal tool

