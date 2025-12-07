# Multi-Tenant Architecture Document - KickOverlay SaaS

**Author:** Winston (Architect)
**Date:** 2025-12-07
**Version:** 1.0
**Status:** Draft

---

## Overview

This document describes the target architecture for transforming kick-overlay from a single-tenant self-hosted application into a multi-tenant SaaS platform serving multiple Kick.com streamers.

## Architecture Principles

1. **Tenant Isolation First**: Every piece of data belongs to exactly one streamer
2. **Abstraction for Flexibility**: Data layer abstracts storage backend for future migration
3. **Preserve Working Features**: Existing drop game, TTS, overlay code is kept with minimal changes
4. **URL-Driven Context**: Channel context derived from URL path, never from session alone

---

## System Architecture

### High-Level Overview

```
                              ┌─────────────────────────────────────┐
                              │           Load Balancer             │
                              │  (future: nginx/cloudflare)         │
                              └──────────────┬──────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│    kickoverlay.com      │  │ system.kickoverlay.com  │  │   Webhook Receiver      │
│   (Marketing Site)      │  │   (Application)         │  │   (Kick Events)         │
└─────────────────────────┘  └───────────┬─────────────┘  └───────────┬─────────────┘
                                         │                            │
                                         │                            │
                                         ▼                            ▼
                              ┌─────────────────────────────────────────────────────┐
                              │               Bun.serve() Application               │
                              │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
                              │  │ Channel │  │  API    │  │ Webhook │  │ Static  │ │
                              │  │ Router  │  │ Routes  │  │ Handler │  │ Assets  │ │
                              │  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘ │
                              │       │            │            │                   │
                              │       ▼            ▼            ▼                   │
                              │  ┌─────────────────────────────────────────────┐    │
                              │  │            Channel Context Middleware       │    │
                              │  │     (extracts streamer_id from URL)         │    │
                              │  └──────────────────────┬──────────────────────┘    │
                              │                         │                           │
                              │                         ▼                           │
                              │  ┌─────────────────────────────────────────────┐    │
                              │  │              Data Abstraction Layer          │    │
                              │  │    interface DataStore { ... }               │    │
                              │  └──────────────────────┬──────────────────────┘    │
                              └─────────────────────────┼───────────────────────────┘
                                                        │
                              ┌──────────────────────────┼──────────────────────────┐
                              │                         │                          │
                              ▼                         ▼                          ▼
                   ┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
                   │   SQLite Backend    │   │  Firebase Backend   │   │ Postgres Backend │
                   │   (Initial)         │   │  (Future Option)    │   │ (Future Option)  │
                   └─────────────────────┘   └─────────────────────┘   └──────────────────┘
```

### URL Routing Architecture

```
URL Pattern: /<channel>/<endpoint>[/<sub-path>]

Examples:
  /codingbutter/overlay          → Main overlay for OBS
  /codingbutter/overlay/dropgame → Drop game overlay
  /codingbutter/admin            → Streamer dashboard
  /codingbutter/api/chat         → Chat API endpoint
  /codingbutter/profile/viewer1  → Viewer profile page

Root Routes (no channel context):
  /                              → Marketing landing page
  /login                         → Kick OAuth initiation
  /callback                      → OAuth callback
  /api/health                    → Health check
```

---

## Component Architecture

### 1. Channel Router

Extracts channel context from URL and validates streamer exists.

```typescript
// server/middleware/channel.ts

export interface ChannelContext {
  channel: string;
  streamerId: number;
  streamer: Streamer;
}

export async function extractChannelContext(
  req: Request
): Promise<ChannelContext | null> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Skip root routes
  if (pathParts.length === 0 || ROOT_ROUTES.includes(pathParts[0])) {
    return null;
  }

  const channel = pathParts[0].toLowerCase();
  const streamer = await dataStore.getStreamerByUsername(channel);

  if (!streamer) {
    return null; // Will result in 404
  }

  return {
    channel,
    streamerId: streamer.id,
    streamer
  };
}

const ROOT_ROUTES = ['login', 'callback', 'api', 'public'];
```

### 2. Data Abstraction Layer

All database operations go through a unified interface.

```typescript
// server/data/interface.ts

export interface DataStore {
  // ============ Streamers ============
  getStreamer(id: number): Promise<Streamer | null>;
  getStreamerByUsername(username: string): Promise<Streamer | null>;
  getStreamerByKickId(kickUserId: string): Promise<Streamer | null>;
  createStreamer(data: CreateStreamerInput): Promise<Streamer>;
  updateStreamer(id: number, data: UpdateStreamerInput): Promise<Streamer>;

  // ============ Users (Viewers) ============
  // ALL user operations are scoped to a streamer
  getUser(streamerId: number, userId: number): Promise<User | null>;
  getUserByUsername(streamerId: number, username: string): Promise<User | null>;
  createUser(streamerId: number, data: CreateUserInput): Promise<User>;
  updateUser(streamerId: number, userId: number, data: UpdateUserInput): Promise<User>;

  // ============ Points ============
  getUserPoints(streamerId: number, userId: number): Promise<UserPoints>;
  updateUserPoints(streamerId: number, userId: number, delta: PointsDelta): Promise<UserPoints>;
  getLeaderboard(streamerId: number, limit: number): Promise<LeaderboardEntry[]>;

  // ============ Powerups ============
  getPowerupConfig(streamerId: number): Promise<PowerupConfig[]>;
  updatePowerupConfig(streamerId: number, powerupId: string, data: UpdatePowerupInput): Promise<void>;
  getUserInventory(streamerId: number, userId: number): Promise<PowerupInventory[]>;
  addToInventory(streamerId: number, userId: number, powerupId: string, quantity: number): Promise<void>;
  useFromInventory(streamerId: number, userId: number, powerupId: string): Promise<boolean>;

  // ============ Overlay Settings ============
  getOverlaySettings(streamerId: number): Promise<OverlaySettings>;
  updateOverlaySetting(streamerId: number, key: string, value: string): Promise<void>;

  // ============ Overlay Layouts ============
  getOverlayLayouts(streamerId: number): Promise<OverlayLayout[]>;
  getOverlayLayout(streamerId: number, layoutId: string): Promise<OverlayLayout | null>;
  createOverlayLayout(streamerId: number, data: CreateLayoutInput): Promise<OverlayLayout>;
  updateOverlayLayout(streamerId: number, layoutId: string, data: UpdateLayoutInput): Promise<void>;
  deleteOverlayLayout(streamerId: number, layoutId: string): Promise<void>;

  // ============ Tips ============
  getTips(streamerId: number): Promise<Tip[]>;
  createTip(streamerId: number, content: string): Promise<Tip>;
  updateTip(streamerId: number, tipId: number, data: UpdateTipInput): Promise<void>;
  deleteTip(streamerId: number, tipId: number): Promise<void>;

  // ============ Goals ============
  getGoals(streamerId: number): Promise<Goal[]>;
  updateGoal(streamerId: number, goalId: string, data: UpdateGoalInput): Promise<void>;

  // ============ Theme ============
  getTheme(streamerId: number): Promise<ThemeSettings>;
  updateTheme(streamerId: number, data: UpdateThemeInput): Promise<void>;

  // ============ API Tokens ============
  getApiToken(streamerId: number, provider: string): Promise<ApiToken | null>;
  saveApiToken(streamerId: number, token: SaveTokenInput): Promise<void>;

  // ============ Sessions ============
  createUserSession(streamerId: number, userId: number): Promise<string>;
  validateUserSession(streamerId: number, token: string): Promise<User | null>;
  createStreamerSession(streamerId: number): Promise<string>;
  validateStreamerSession(token: string): Promise<Streamer | null>;

  // ============ Verification ============
  createVerificationCode(streamerId: number, username: string): Promise<string>;
  verifyCode(streamerId: number, username: string, code: string): Promise<boolean>;

  // ============ Analytics ============
  recordDrop(streamerId: number, userId: number, data: DropRecord): Promise<void>;
  getDropHistory(streamerId: number, userId: number, limit: number): Promise<DropHistory[]>;
  recordPurchase(streamerId: number, userId: number, data: PurchaseRecord): Promise<void>;
}
```

### 3. SQLite Implementation

```typescript
// server/data/sqlite.ts

import { Database } from 'bun:sqlite';

export class SQLiteDataStore implements DataStore {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  // All queries include streamer_id in WHERE clause
  async getUser(streamerId: number, userId: number): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users
      WHERE id = ? AND streamer_id = ?
    `);
    return stmt.get(userId, streamerId) as User | null;
  }

  async getUserByUsername(streamerId: number, username: string): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users
      WHERE username = ? AND streamer_id = ?
    `);
    return stmt.get(username, streamerId) as User | null;
  }

  // ... all other methods follow same pattern
}
```

---

## Database Schema (Multi-Tenant)

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STREAMERS (Tenants)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK) │ kick_user_id (UQ) │ username (UQ) │ display_name │ avatar_url    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────────────────┐
       │                         │                                     │
       ▼                         ▼                                     ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│     users       │    │   overlay_layouts   │    │    powerup_config       │
├─────────────────┤    ├─────────────────────┤    ├─────────────────────────┤
│ id (PK)         │    │ id (PK)             │    │ id (PK)                 │
│ streamer_id(FK) │◄───┤ streamer_id (FK)    │    │ streamer_id (FK)        │
│ username        │    │ name                │    │ name, cost, emoji       │
│ voice_id        │    │ layout_data (JSON)  │    │ variables (JSON)        │
│ drop_image      │    │ is_default          │    └─────────────────────────┘
│ country         │    └─────────────────────┘
└────────┬────────┘
         │
         │    ┌─────────────────────┐    ┌─────────────────────────┐
         ├───►│    user_points      │    │   powerup_inventory     │
         │    ├─────────────────────┤    ├─────────────────────────┤
         │    │ user_id (FK)        │    │ user_id (FK)            │
         │    │ channel_points      │    │ powerup_type            │
         │    │ drop_points         │    │ quantity                │
         │    │ total_drops         │    └─────────────────────────┘
         │    └─────────────────────┘
         │
         │    ┌─────────────────────┐    ┌─────────────────────────┐
         ├───►│    drop_history     │    │  powerup_purchases      │
         │    ├─────────────────────┤    ├─────────────────────────┤
         │    │ user_id (FK)        │    │ user_id (FK)            │
         │    │ score, is_perfect   │    │ powerup_type, cost      │
         │    │ powerup_used        │    └─────────────────────────┘
         │    └─────────────────────┘
         │
         └───►┌─────────────────────┐
              │   user_sessions     │
              ├─────────────────────┤
              │ user_id (FK)        │
              │ session_token       │
              └─────────────────────┘

OTHER STREAMER-SCOPED TABLES:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      tips       │  │     goals       │  │ overlay_settings│  │   api_tokens    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ streamer_id(FK) │  │ streamer_id(FK) │  │ streamer_id(FK) │  │ streamer_id(FK) │
│ content         │  │ label, target   │  │ key, value      │  │ provider, token │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Schema SQL

```sql
-- Streamers (Tenants)
CREATE TABLE streamers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kick_user_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users (Viewers) - scoped to streamer
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  voice_id TEXT,
  drop_image TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(streamer_id, username)
);
CREATE INDEX idx_users_streamer_username ON users(streamer_id, username);

-- User Points
CREATE TABLE user_points (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_points INTEGER DEFAULT 0,
  drop_points INTEGER DEFAULT 0,
  total_drops INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Powerup Inventory
CREATE TABLE powerup_inventory (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  powerup_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  UNIQUE(user_id, powerup_type)
);

-- Powerup Config (per streamer)
CREATE TABLE powerup_config (
  id TEXT NOT NULL,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 500,
  emoji TEXT NOT NULL,
  effect TEXT NOT NULL,
  variables TEXT DEFAULT '{}',
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id, streamer_id)
);

-- Overlay Layouts (per streamer)
CREATE TABLE overlay_layouts (
  id TEXT NOT NULL,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_data TEXT NOT NULL, -- JSON
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id, streamer_id)
);

-- Overlay Settings (per streamer)
CREATE TABLE overlay_settings (
  key TEXT NOT NULL,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(key, streamer_id)
);

-- Tips (per streamer)
CREATE TABLE tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Goals (per streamer)
CREATE TABLE goals (
  id TEXT NOT NULL,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id, streamer_id)
);

-- Theme Settings (per streamer)
CREATE TABLE theme_settings (
  streamer_id INTEGER PRIMARY KEY REFERENCES streamers(id) ON DELETE CASCADE,
  theme_data TEXT NOT NULL DEFAULT '{}', -- JSON with all theme colors
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API Tokens (per streamer)
CREATE TABLE api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'kick',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  scope TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(streamer_id, provider)
);

-- Streamer Sessions (admin access)
CREATE TABLE streamer_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- User Sessions (viewer access)
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- Verification Codes (per streamer)
CREATE TABLE verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  code TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  UNIQUE(streamer_id, username, code)
);

-- Drop History
CREATE TABLE drop_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  is_perfect INTEGER DEFAULT 0,
  powerup_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Powerup Purchases
CREATE TABLE powerup_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  powerup_type TEXT NOT NULL,
  cost INTEGER NOT NULL,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Authentication Architecture

### Streamer Authentication (OAuth)

```
┌──────────────┐    1. Click "Login with Kick"    ┌──────────────────┐
│   Streamer   │─────────────────────────────────►│  /login route    │
│   Browser    │                                   └────────┬─────────┘
└──────────────┘                                            │
       ▲                                                    │ 2. Redirect to Kick
       │                                                    ▼
       │                                           ┌──────────────────┐
       │                                           │  Kick OAuth      │
       │                                           │  Authorization   │
       │                                           └────────┬─────────┘
       │                                                    │
       │        5. Set session cookie                       │ 3. User authorizes
       │           Redirect to /<channel>/admin             │
       │                                                    ▼
       │                                           ┌──────────────────┐
       └───────────────────────────────────────────│  /callback route │
                                                   │  - Get token     │
                                                   │  - Find/create   │
                                                   │    streamer      │
                                                   │  - Create session│
                                                   └──────────────────┘
```

### Viewer Authentication (Chat Verification)

```
┌──────────────┐    1. Visit /<channel>/profile-login     ┌──────────────────┐
│    Viewer    │─────────────────────────────────────────►│  Request code    │
│   Browser    │                                           └────────┬─────────┘
└──────────────┘                                                    │
       │                                                            │ 2. Generate code
       │                                                            │    Store in DB
       │ 4. Type !verify CODE in chat                               │
       │                                                            ▼
       │                                                   ┌──────────────────┐
       │                                                   │  Show code to    │
       │                                                   │  viewer          │
       │                                                   └──────────────────┘
       ▼
┌──────────────┐    5. Kick sends chat message    ┌──────────────────┐
│  Kick Chat   │─────────────────────────────────►│  Webhook Handler │
│              │                                   │  - Parse !verify │
└──────────────┘                                   │  - Check code    │
                                                   │  - Mark verified │
       ┌───────────────────────────────────────────│  - Create session│
       │        6. Return session token            └──────────────────┘
       ▼
┌──────────────┐
│  Viewer now  │
│  has access  │
└──────────────┘
```

---

## API Architecture

### Route Structure

```
/<channel>/api/...    → Streamer-scoped API endpoints

All routes extract channel from URL path:
  - /<channel>/api/chat            → Chat messages for channel
  - /<channel>/api/dropgame/queue  → Drop queue for channel
  - /<channel>/api/overlay/layout  → Layout for channel
  - /<channel>/api/admin/settings  → Admin settings (requires auth)
```

### Request Flow

```typescript
// Example API handler with channel context

export async function handleChatRequest(req: Request): Promise<Response> {
  // 1. Extract channel from URL
  const context = await extractChannelContext(req);
  if (!context) {
    return new Response('Channel not found', { status: 404 });
  }

  // 2. All operations use streamerId
  const messages = await dataStore.getChatMessages(context.streamerId);

  // 3. Return response
  return Response.json(messages);
}

// Protected admin endpoint
export async function handleAdminSettingsRequest(req: Request): Promise<Response> {
  // 1. Extract channel context
  const context = await extractChannelContext(req);
  if (!context) {
    return new Response('Channel not found', { status: 404 });
  }

  // 2. Validate streamer session
  const session = await validateStreamerSession(req, context.streamerId);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 3. Perform operation
  const settings = await dataStore.getOverlaySettings(context.streamerId);

  return Response.json(settings);
}
```

---

## Frontend Architecture

### React Router Structure

```typescript
// src/App.tsx

export function App() {
  return (
    <Routes>
      {/* Root routes (no channel) */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Channel-scoped routes */}
      <Route path="/:channel" element={<ChannelLayout />}>
        <Route index element={<ChannelHomePage />} />
        <Route path="overlay" element={<OverlayPage />} />
        <Route path="overlay/dropgame" element={<DropGamePage />} />
        <Route path="overlay/chat" element={<ChatOverlayPage />} />
        <Route path="overlay/:layoutId" element={<OverlayPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="commands" element={<CommandsPage />} />
        <Route path="voicelist" element={<VoiceListPage />} />
        <Route path="profile-login" element={<ProfileLoginPage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

### Channel Context Provider

```typescript
// src/context/ChannelContext.tsx

interface ChannelContextValue {
  channel: string;
  streamer: Streamer | null;
  loading: boolean;
  error: Error | null;
}

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const { channel } = useParams<{ channel: string }>();
  const [state, setState] = useState<ChannelContextValue>({
    channel: channel || '',
    streamer: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!channel) return;

    api.getStreamer(channel)
      .then(streamer => setState(s => ({ ...s, streamer, loading: false })))
      .catch(error => setState(s => ({ ...s, error, loading: false })));
  }, [channel]);

  return (
    <ChannelContext.Provider value={state}>
      {children}
    </ChannelContext.Provider>
  );
}
```

### API Client

```typescript
// src/lib/api.ts

class ApiClient {
  private channel: string = '';

  setChannel(channel: string) {
    this.channel = channel;
  }

  private url(path: string): string {
    return `/${this.channel}/api${path}`;
  }

  async getChat(): Promise<ChatMessage[]> {
    const res = await fetch(this.url('/chat'));
    return res.json();
  }

  async getDropQueue(): Promise<DropQueueEntry[]> {
    const res = await fetch(this.url('/dropgame/queue'));
    return res.json();
  }

  async getOverlaySettings(): Promise<OverlaySettings> {
    const res = await fetch(this.url('/overlay/settings'));
    return res.json();
  }

  // ... all API methods use channel prefix
}
```

---

## Security Architecture

### Tenant Isolation Enforcement

```typescript
// Every database query MUST include streamer_id

// BAD - Will fail code review
function getUser(userId: number) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// GOOD - Enforced pattern
function getUser(streamerId: number, userId: number) {
  return db.prepare('SELECT * FROM users WHERE id = ? AND streamer_id = ?')
    .get(userId, streamerId);
}
```

### Automated Security Tests

```typescript
// tests/tenant-isolation.test.ts

import { test, expect } from 'bun:test';

test('cannot access other streamer data via API', async () => {
  // Setup: Create two streamers with users
  const streamer1 = await createTestStreamer('streamer1');
  const streamer2 = await createTestStreamer('streamer2');
  const user1 = await createTestUser(streamer1.id, 'user1');

  // Test: API calls to streamer2's endpoints cannot see streamer1's data
  const response = await fetch(`/streamer2/api/users/${user1.id}`);
  expect(response.status).toBe(404);
});

test('database queries require streamer_id', async () => {
  // This test ensures ALL queries include streamer_id
  // Implementation: Analyze SQL queries at runtime
});
```

---

## Deployment Architecture

### Initial Deployment (Single Instance)

```
┌─────────────────────────────────────────────────┐
│                   VPS / Cloud VM                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Bun Application               │    │
│  │  - Serves marketing site                │    │
│  │  - Serves app (all channels)            │    │
│  │  - Handles webhooks                     │    │
│  └───────────────────┬─────────────────────┘    │
│                      │                          │
│  ┌───────────────────┴─────────────────────┐    │
│  │              SQLite Database             │    │
│  │              data/kick-overlay.db        │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │        Reverse Proxy (nginx/caddy)       │    │
│  │  - SSL termination                       │    │
│  │  - kickoverlay.com                       │    │
│  │  - system.kickoverlay.com                │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Future Scalability Path

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   App Node   │    │   App Node   │    │   App Node   │
│      1       │    │      2       │    │      3       │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Cloud Database │
                    │  (Postgres/     │
                    │   Supabase/     │
                    │   Firebase)     │
                    └─────────────────┘
```

---

## Migration Plan

### Phase 1: Schema Migration
1. Add `streamers` table
2. Add `streamer_id` to all tables
3. Create migration script for existing data
4. Add foreign key constraints

### Phase 2: Data Layer
1. Create `DataStore` interface
2. Implement `SQLiteDataStore`
3. Refactor all DB access to use interface
4. Add comprehensive tests

### Phase 3: Routing
1. Implement channel router middleware
2. Update all API routes
3. Update frontend routing
4. Update API client

### Phase 4: Authentication
1. Implement Kick OAuth for streamers
2. Update session management
3. Create onboarding flow
4. Remove ENV-based auth

---

## Appendix: Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite → Cloud (future) | Start simple, migrate when needed |
| Multi-tenancy | Single DB, streamer_id | Simpler than separate DBs |
| Auth | Kick OAuth only | No password management |
| URLs | /<channel>/... | Clear tenant context |
| Abstraction | DataStore interface | Enables backend swap |
