# Kick-Overlay Database Schema

## Overview

The application uses **SQLite** via Bun's native `bun:sqlite` driver. The database is stored at `data/kick-overlay.db`.

## Schema Diagram

```
┌─────────────────┐       ┌──────────────────┐
│     users       │       │   user_points    │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │───┐   │ id (PK)          │
│ username (UQ)   │   │   │ user_id (FK, UQ) │◄──┐
│ voice_id        │   └──►│ channel_points   │   │
│ drop_image      │       │ drop_points      │   │
│ country         │       │ total_drops      │   │
│ created_at      │       │ last_updated     │   │
│ updated_at      │       └──────────────────┘   │
└─────────────────┘                              │
        │                                        │
        │       ┌────────────────────┐           │
        │       │ powerup_inventory  │           │
        │       ├────────────────────┤           │
        └──────►│ id (PK)            │           │
                │ user_id (FK)       │───────────┤
                │ powerup_type       │           │
                │ quantity           │           │
                └────────────────────┘           │
                                                 │
        ┌────────────────────┐                   │
        │   user_sessions    │                   │
        ├────────────────────┤                   │
        │ id (PK)            │                   │
        │ user_id (FK)       │───────────────────┤
        │ session_token (UQ) │                   │
        │ created_at         │                   │
        │ expires_at         │                   │
        └────────────────────┘                   │
                                                 │
        ┌────────────────────┐                   │
        │    drop_history    │                   │
        ├────────────────────┤                   │
        │ id (PK)            │                   │
        │ user_id (FK)       │───────────────────┤
        │ score              │                   │
        │ is_perfect         │                   │
        │ powerup_used       │                   │
        │ created_at         │                   │
        └────────────────────┘                   │
                                                 │
        ┌────────────────────┐                   │
        │ powerup_purchases  │                   │
        ├────────────────────┤                   │
        │ id (PK)            │                   │
        │ user_id (FK)       │───────────────────┘
        │ powerup_type       │
        │ cost               │
        │ purchased_at       │
        └────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│  verification_codes │     │    api_tokens       │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ username            │     │ provider (UQ)       │
│ code                │     │ access_token        │
│ verified            │     │ refresh_token       │
│ created_at          │     │ expires_at          │
│ expires_at          │     │ scope               │
└─────────────────────┘     │ created_at          │
                            │ updated_at          │
                            └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   admin_sessions    │     │  overlay_settings   │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ key (PK)            │
│ session_token (UQ)  │     │ value               │
│ created_at          │     │ description         │
│ expires_at          │     │ updated_at          │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   powerup_config    │     │       tips          │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ name                │     │ content             │
│ description         │     │ enabled             │
│ cost                │     │ sort_order          │
│ emoji               │     │ created_at          │
│ effect              │     └─────────────────────┘
│ variables (JSON)    │
│ enabled             │     ┌─────────────────────┐
│ created_at          │     │       goals         │
│ updated_at          │     ├─────────────────────┤
└─────────────────────┘     │ id (PK)             │
                            │ label               │
                            │ current_value       │
                            │ target_value        │
                            │ enabled             │
                            │ updated_at          │
                            └─────────────────────┘
```

## Table Definitions

### users
Core user data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user ID |
| username | TEXT | NOT NULL, UNIQUE | Kick username |
| voice_id | TEXT | NULL | ElevenLabs voice ID |
| drop_image | TEXT | NULL | Custom drop avatar URL |
| country | TEXT | NULL | ISO 3166-1 alpha-2 code |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_users_username`

### user_points
Points tracking (separate table for high-frequency updates).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | UNIQUE, FK(users.id) ON DELETE CASCADE | |
| channel_points | INTEGER | DEFAULT 0 | Points from chat/watch |
| drop_points | INTEGER | DEFAULT 0 | Points from drop game |
| total_drops | INTEGER | DEFAULT 0 | Total drop attempts |
| last_updated | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_user_points_user_id`

### powerup_inventory
User-owned powerups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | FK(users.id) ON DELETE CASCADE | |
| powerup_type | TEXT | NOT NULL | Powerup ID (tnt, shield, etc.) |
| quantity | INTEGER | DEFAULT 0 | Number owned |

**Constraints:** UNIQUE(user_id, powerup_type)
**Indexes:** `idx_powerup_inventory_user_id`

### powerup_config
Admin-configurable powerup definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Powerup ID |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | NOT NULL | User-facing description |
| cost | INTEGER | NOT NULL, DEFAULT 500 | Point cost |
| emoji | TEXT | NOT NULL | Display emoji |
| effect | TEXT | NOT NULL | Effect description |
| variables | TEXT | DEFAULT '{}' | JSON config (radius, duration, etc.) |
| enabled | INTEGER | DEFAULT 1 | 0=disabled, 1=enabled |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

### user_sessions
User authentication sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | FK(users.id) ON DELETE CASCADE | |
| session_token | TEXT | NOT NULL, UNIQUE | Random token |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| expires_at | TEXT | NOT NULL | Expiration timestamp |

**Indexes:** `idx_user_sessions_token`, `idx_user_sessions_expires`

### admin_sessions
Admin dashboard sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| session_token | TEXT | NOT NULL, UNIQUE | Random token |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| expires_at | TEXT | NOT NULL | Expiration timestamp |

**Indexes:** `idx_admin_sessions_token`

### verification_codes
Chat-based user verification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| username | TEXT | NOT NULL | Kick username |
| code | TEXT | NOT NULL | 6-char verification code |
| verified | INTEGER | DEFAULT 0 | 0=pending, 1=verified |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| expires_at | TEXT | NOT NULL | Code expiration |

**Constraints:** UNIQUE(username, code)
**Indexes:** `idx_verification_codes_username`

### api_tokens
OAuth tokens for external services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| provider | TEXT | NOT NULL, DEFAULT 'kick' | Service name |
| access_token | TEXT | NOT NULL | OAuth access token |
| refresh_token | TEXT | NULL | OAuth refresh token |
| expires_at | TEXT | NOT NULL | Token expiration |
| scope | TEXT | NULL | OAuth scopes |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

### drop_history
Drop game analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | FK(users.id) ON DELETE CASCADE | |
| score | INTEGER | NOT NULL | Points earned |
| is_perfect | INTEGER | DEFAULT 0 | 1=perfect center drop |
| powerup_used | TEXT | NULL | Powerup ID if used |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_drop_history_user_id`

### powerup_purchases
Purchase audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | FK(users.id) ON DELETE CASCADE | |
| powerup_type | TEXT | NOT NULL | Powerup ID |
| cost | INTEGER | NOT NULL | Points spent |
| purchased_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

### overlay_settings
Key-value configuration store.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | TEXT | PRIMARY KEY | Setting key |
| value | TEXT | NOT NULL | Setting value |
| description | TEXT | NULL | Admin description |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Default Settings:**
- `notification_sound_threshold` - Silence time before notification (ms)
- `tts_enabled` - TTS feature toggle
- `drop_game_enabled` - Drop game toggle
- `ai_chatbot_enabled` - AI responses toggle
- `ai_cooldown_seconds` - AI response cooldown
- `ai_project_directory` - Claude project context path

### tips
Rotating tips for overlay.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | |
| content | TEXT | NOT NULL | Tip text |
| enabled | INTEGER | DEFAULT 1 | 0=hidden, 1=shown |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

### goals
Channel goals tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Goal ID (followers, subscribers) |
| label | TEXT | NOT NULL | Display label |
| current_value | INTEGER | DEFAULT 0 | Current progress |
| target_value | INTEGER | NOT NULL | Goal target |
| enabled | INTEGER | DEFAULT 1 | 0=hidden, 1=shown |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

## Database Initialization

The database is initialized on server start:
1. Creates `data/` directory if needed
2. Sets WAL journal mode for better concurrency
3. Enables foreign keys
4. Runs `schema.sql` to create tables
5. Seeds default powerups, settings, tips, and goals

## Migration from JSON

Legacy `user_data.json` is automatically migrated to SQLite on first run if:
- The file exists
- No users exist in the database

## Prepared Statements

All queries use prepared statements (`db.prepare()`) for security and performance. See `server/db/index.ts` for the full query list.
