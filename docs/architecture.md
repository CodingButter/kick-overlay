# Kick-Overlay Architecture Documentation

## Overview

**kick-overlay** is a full-stack streaming overlay system built with Bun and React. It provides real-time stream overlays, a drop game, TTS integration, and chat interaction for the Kick.com streaming platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              OBS Browser Source                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  /overlay   │  │ /overlay/   │  │ /overlay/   │  │ /overlay/       │ │
│  │  (main)     │  │ dropgame    │  │ chat        │  │ goals           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Bun.serve() Server (index.ts)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ HTML Routes  │  │ API Routes   │  │ Webhook      │  │ Static      │  │
│  │ (React SPA)  │  │ /api/*       │  │ Handler      │  │ Assets      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ SQLite DB    │  │ In-Memory    │  │ ElevenLabs   │                   │
│  │ (bun:sqlite) │  │ State        │  │ TTS API      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         External Services                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Kick.com API │  │ ngrok        │  │ Claude AI    │                   │
│  │ (OAuth/Chat) │  │ (tunneling)  │  │ (optional)   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun 1.x | Server runtime, bundler, test runner |
| **Frontend** | React 19 | UI components |
| **Routing** | React Router DOM 7 | Client-side routing |
| **State** | Zustand | Global state management |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **UI Components** | Radix UI + shadcn/ui | Accessible component library |
| **Database** | SQLite (bun:sqlite) | Persistent data storage |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **TTS** | ElevenLabs API | Text-to-speech voices |
| **External API** | Kick.com OAuth | Chat integration |

## Project Structure

```
kick-redirect/
├── index.ts              # Main server entry (2300+ lines) - MONOLITH
├── index.html            # HTML entry point
├── frontend.tsx          # React app bootstrap
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── tailwind.config.js    # Tailwind configuration
│
├── server/               # Backend modules
│   ├── commands.ts       # Chat command handlers (757 lines)
│   └── db/
│       ├── index.ts      # Database queries & helpers (677 lines)
│       ├── schema.sql    # Raw SQL schema
│       └── drizzle-schema.ts  # Drizzle ORM schema
│
├── src/                  # Frontend source
│   ├── App.tsx           # Router configuration
│   ├── lib/
│   │   └── api.ts        # API client
│   ├── stores/           # Zustand stores
│   │   ├── index.ts
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   ├── dropGameStore.ts
│   │   ├── goalsStore.ts
│   │   └── profileStore.ts
│   ├── pages/            # Route components
│   │   ├── HomePage.tsx
│   │   ├── OverlayPage.tsx     # Main overlay (240 lines)
│   │   ├── DropGamePage.tsx    # Drop game (993 lines)
│   │   ├── AdminPage.tsx       # Admin dashboard (1400+ lines)
│   │   ├── ProfilePage.tsx
│   │   ├── ProfileLoginPage.tsx
│   │   ├── CommandsPage.tsx
│   │   ├── VoiceListPage.tsx
│   │   └── ...
│   ├── components/
│   │   ├── layout/       # Layout components
│   │   ├── overlay/      # Overlay widgets
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── OverlayRenderer.tsx
│   │   │   ├── ChatWidget.tsx
│   │   │   ├── GoalsWidget.tsx
│   │   │   ├── TipsWidget.tsx
│   │   │   ├── EventsWidget.tsx
│   │   │   └── ...
│   │   └── ui/           # shadcn/ui components
│   ├── context/
│   │   └── ThemeContext.tsx  # Dynamic theming
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
│
├── data/                 # SQLite database location
│   └── kick-overlay.db
│
└── public/               # Static assets
    ├── new_message.mp3
    ├── dropgame-platform.png
    └── default-avatar.png
```

## Core Components

### 1. Server (index.ts)

The main server file is a **monolith** containing:

- **Bun.serve()** HTTP server with routes
- **API endpoints** for all features
- **Kick OAuth** authentication flow
- **Webhook handlers** for Kick events
- **TTS queue** management with ElevenLabs
- **Drop game** queue management
- **In-memory state** (chat messages, drop queue, TTS queue)

**Key Routes:**
- `/` - React SPA (all frontend routes)
- `/api/chat` - Chat messages
- `/api/dropgame/*` - Drop game endpoints
- `/api/tts/*` - TTS queue/playback
- `/api/profile/*` - User profiles
- `/api/admin/*` - Admin endpoints
- `/api/overlay/*` - Overlay configuration
- `/api/webhooks/kick` - Kick webhook receiver

### 2. Database (server/db/)

SQLite database with the following tables:

| Table | Purpose |
|-------|---------|
| `users` | User profiles (username, voice_id, drop_image, country) |
| `user_points` | Points tracking (channel_points, drop_points, total_drops) |
| `powerup_inventory` | User powerup ownership |
| `powerup_config` | Powerup definitions (admin-editable) |
| `api_tokens` | OAuth tokens (Kick) |
| `user_sessions` | User authentication sessions |
| `admin_sessions` | Admin dashboard sessions |
| `verification_codes` | Chat verification codes |
| `drop_history` | Drop game analytics |
| `powerup_purchases` | Purchase audit trail |
| `overlay_settings` | Key-value overlay config |
| `tips` | Rotating tips content |
| `goals` | Channel goals (followers, subs) |

### 3. Chat Commands (server/commands.ts)

All chat commands with cooldowns:

| Command | Cooldown | Description |
|---------|----------|-------------|
| `!help` | 5s | Show commands link |
| `!say` | 5s | TTS message (costs points) |
| `!drop` | 10s | Play drop game |
| `!points` | 5s | Check balance |
| `!profile` | 30s | Profile link |
| `!tnt`, `!shield`, etc. | 1s | Powerup activation |
| Social links | 30s | Various social media |

### 4. Drop Game (DropGamePage.tsx)

Physics-based mini-game:

- **Gravity simulation** with bounce physics
- **Powerups**: TNT, Shield, Magnet, Ghost, Boost, PowerDrop
- **Confetti effects** for landings
- **Explosion particles** for TNT
- **Score calculation** based on landing accuracy
- **Transparent background** for OBS overlay

### 5. Overlay System (src/components/overlay/)

Configurable overlay widgets:

| Widget | Description |
|--------|-------------|
| `ChatWidget` | Live chat display |
| `GoalsWidget` | Follower/sub goals |
| `TipsWidget` | Rotating tips carousel |
| `EventsWidget` | Follow/sub events |
| `ChromaPlaceholder` | Transparent area |
| `EmptyPlaceholder` | Background spacer |

Layout is configured via `/api/overlay/layout` and stored in the database.

## Data Flow

### Chat Message Flow
```
Kick.com → Webhook → index.ts → In-memory array → /api/chat → React poll → ChatWidget
```

### TTS Flow
```
User !say → commands.ts → ElevenLabs API → Audio queue → /api/tts/next → OverlayPage audio player
```

### Drop Game Flow
```
User !drop → commands.ts → Drop queue → /api/dropgame/queue → DropGamePage poll → Physics simulation → /api/dropgame/score → Database
```

## State Management

### Server-Side State (In-Memory)
- `recentMessages[]` - Last 100 chat messages
- `dropQueue[]` - Pending drops
- `activeDroppers Set` - Currently dropping users
- `ttsQueue[]` - Audio playback queue
- `pendingPowerups[]` - Powerup activations

### Client-Side State (Zustand)
- `chatStore` - Chat messages, user countries
- `dropGameStore` - Droppers, config, confetti
- `goalsStore` - Follower/sub goals
- `profileStore` - User profile data
- `authStore` - Authentication state

## External Integrations

### Kick.com
- **OAuth 2.0** authentication
- **Webhook events**: chat messages, follows, subscriptions
- **Chat API**: Send messages from bot account

### ElevenLabs
- **TTS API** for voice synthesis
- **100+ voices** available
- **Voice preview** functionality

### Claude AI (Optional)
- **AI chatbot** responses
- **Project context** integration
- Configurable via admin settings

## Known Architecture Issues

### Identified for Refactoring

1. **Monolithic Server** (`index.ts` - 2300+ lines)
   - All routes, handlers, and state in one file
   - Should be split into modules

2. **Mixed Concerns**
   - Server file handles HTTP, WebSocket, OAuth, TTS, and game logic
   - No clear separation of concerns

3. **In-Memory State**
   - Chat messages, queues stored in memory
   - Lost on server restart

4. **Large Page Components**
   - `AdminPage.tsx` (1400+ lines)
   - `DropGamePage.tsx` (993 lines)
   - Should be split into smaller components

5. **Polling Architecture**
   - All real-time features use HTTP polling
   - Could use WebSockets for efficiency

6. **Duplicate Type Definitions**
   - Types defined in multiple places
   - Should be centralized

## Security Considerations

- Admin authentication via session tokens
- User verification via chat codes
- OAuth tokens stored in database
- ADMIN_USERS array for privilege checks
- No rate limiting on most endpoints

## Development Notes

- Uses Bun's HTML imports for bundling
- Hot Module Replacement (HMR) enabled
- Tailwind CSS 4 with @tailwindcss/vite plugin
- TypeScript strict mode
