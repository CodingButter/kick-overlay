---
stepsCompleted: ['discovery', 'requirements', 'scope']
inputDocuments:
  - docs/index.md
  - docs/architecture.md
  - docs/database-schema.md
workflowType: 'prd'
lastStep: 3
project_name: 'streaming-system'
user_name: 'Butters'
date: '2025-12-07'
feature_name: 'Multi-Platform Streaming System'
---

# Product Requirements Document - Streaming System

**Author:** Butters
**Date:** 2025-12-07
**Feature:** Multi-Platform Streaming System (Kick + Twitch)
**Status:** Draft
**Repository:** https://github.com/CodingButter/streaming-system

---

## Executive Summary

Build a multi-platform, multi-tenant SaaS streaming overlay system that supports both Kick.com and Twitch.tv. Streamers can connect one or both platforms and manage everything from a unified dashboard. Viewers on different platforms can interact through combined chat, shared drop game, and unified points economy.

### Key Transformation Points

| Aspect | Current State | Target State |
|--------|--------------|--------------|
| **Platforms** | Kick only | Kick + Twitch (extensible) |
| **Deployment** | Self-hosted | Public SaaS |
| **Users** | Single streamer | Any streamer on Kick or Twitch |
| **Authentication** | ENV-based | Platform OAuth (Kick/Twitch) |
| **Data** | Global data | Per-streamer, per-platform isolated |
| **Chat** | Kick only | Combined or platform-specific |
| **URLs** | Flat routes | `/<platform>/<channel>/*` or `/<streamer>/*` |

---

## Problem Statement

### Current Limitations

1. **Single Platform**: Only supports Kick.com, excluding the larger Twitch audience
2. **Single-Tenant**: Built for one streamer with global data
3. **No Platform Abstraction**: Kick-specific code throughout
4. **Limited Reach**: Can't serve multi-platform streamers (simulcasters)

### Target Users

**Primary User: Multi-Platform Streamers**
- Stream on Kick, Twitch, or both simultaneously
- Want unified overlay management
- Need combined chat for simulcasts
- Single dashboard for all platforms

**Secondary User: Single-Platform Streamers**
- Use Kick OR Twitch (not both)
- Same features, just one platform connected
- Simpler onboarding experience

**Tertiary User: Viewers**
- Interact via chat commands on their platform
- Earn points per channel they watch
- Play drop game
- Use TTS features

---

## Goals and Success Metrics

### Goals

1. **Platform Agnostic**: Same features work on Kick and Twitch
2. **Zero-Config Onboarding**: Connect with OAuth, ready to stream
3. **Combined Experience**: Optional merged chat for simulcasters
4. **Bank-Vault Isolation**: Per-streamer, per-platform data separation
5. **Extensible Architecture**: Easy to add YouTube, etc. later

### Success Metrics

| Metric | Target |
|--------|--------|
| Onboarding time | < 2 minutes per platform |
| Platform support | Kick + Twitch at launch |
| Data isolation | 100% - zero cross-tenant leakage |
| Chat latency | < 500ms from message to overlay |

---

## Functional Requirements

### FR-1: Multi-Platform Authentication

**FR-1.1: Platform OAuth**
- Streamers authenticate via Kick OAuth and/or Twitch OAuth
- Can connect one or both platforms
- Each platform connection stored separately
- OAuth tokens per platform with auto-refresh

**FR-1.2: Unified Streamer Identity**
- One streamer account can have multiple platform connections
- Dashboard shows all connected platforms
- Can add/remove platforms anytime

**FR-1.3: Viewer Authentication**
- Viewers authenticate via chat verification (platform-specific)
- Separate viewer profiles per platform: `viewer123@kick` vs `viewer123@twitch`
- Points and powerups are per-streamer, per-platform

### FR-2: URL Routing Structure

**Platform-Specific Routes:**
| Route Pattern | Description |
|--------------|-------------|
| `/kick/<channel>/overlay` | Kick overlay for OBS |
| `/kick/<channel>/profile/<username>` | Kick viewer profile |
| `/twitch/<channel>/overlay` | Twitch overlay for OBS |
| `/twitch/<channel>/profile/<username>` | Twitch viewer profile |

**Unified Streamer Routes:**
| Route Pattern | Description |
|--------------|-------------|
| `/<streamer>/admin` | Unified admin dashboard |
| `/<streamer>/admin/platforms` | Platform management |
| `/<streamer>/admin/layouts` | Layout editor |
| `/<streamer>/overlay/combined` | Combined multi-platform overlay |

**Root Routes:**
| Route Pattern | Description |
|--------------|-------------|
| `/` | Marketing landing page |
| `/login` | Platform selection for OAuth |
| `/callback/kick` | Kick OAuth callback |
| `/callback/twitch` | Twitch OAuth callback |

### FR-3: Platform Adapter Layer

**FR-3.1: Platform Interface**
```typescript
interface PlatformAdapter {
  platform: 'kick' | 'twitch';

  // Authentication
  getAuthUrl(redirectUri: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  // User/Channel Info
  getUserInfo(accessToken: string): Promise<PlatformUser>;
  getChannelInfo(accessToken: string): Promise<ChannelInfo>;

  // Chat
  sendMessage(channelId: string, message: string): Promise<void>;

  // Webhooks/Events
  registerWebhooks(channelId: string, callbackUrl: string): Promise<void>;
  handleWebhook(payload: unknown): ChatMessage | FollowEvent | SubEvent;
}
```

**FR-3.2: Kick Adapter**
- Kick OAuth 2.0
- Kick webhook events (chat, follow, sub)
- Kick chat API

**FR-3.3: Twitch Adapter**
- Twitch OAuth 2.0
- Twitch EventSub for events
- Twitch IRC for chat (or Helix API)

### FR-4: Data Isolation (Multi-Tenancy)

**FR-4.1: Database Schema**
```sql
-- Streamers (main account)
CREATE TABLE streamers (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL, -- chosen username for URLs
  display_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Platform connections (one streamer can have many)
CREATE TABLE platform_connections (
  id INTEGER PRIMARY KEY,
  streamer_id INTEGER REFERENCES streamers(id),
  platform TEXT NOT NULL, -- 'kick' | 'twitch'
  platform_user_id TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, platform_user_id)
);

-- Viewers (per-streamer, per-platform)
CREATE TABLE viewers (
  id INTEGER PRIMARY KEY,
  streamer_id INTEGER REFERENCES streamers(id),
  platform TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  voice_id TEXT,
  drop_image TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(streamer_id, platform, platform_username)
);

-- Viewer points (per viewer)
CREATE TABLE viewer_points (
  viewer_id INTEGER PRIMARY KEY REFERENCES viewers(id),
  channel_points INTEGER DEFAULT 0,
  drop_points INTEGER DEFAULT 0,
  total_drops INTEGER DEFAULT 0
);
```

**FR-4.2: Query Isolation**
All queries include `streamer_id` AND `platform` where applicable.

### FR-5: Chat Integration

**FR-5.1: Platform-Specific Chat**
- `/kick/<channel>/overlay` shows only Kick chat
- `/twitch/<channel>/overlay` shows only Twitch chat
- Platform badge (icon) shown with each message

**FR-5.2: Combined Chat**
- `/<streamer>/overlay/combined` shows both platforms
- Messages tagged with platform icon (🟢 Kick, 🟣 Twitch)
- Commands work from both platforms
- Configurable in admin panel

**FR-5.3: Chat Commands**
- `!drop`, `!points`, `!say`, etc. work on both platforms
- Platform-aware responses
- Unified leaderboard or per-platform (configurable)

### FR-6: Overlay System

**FR-6.1: Platform-Specific Overlays**
- Each platform gets its own overlay URL
- Same layout system, different data source

**FR-6.2: Combined Overlay**
- Single overlay showing data from all connected platforms
- Combined chat widget
- Unified goals (optional)

**FR-6.3: Multiple Layouts**
- Each streamer can create multiple layouts
- Layouts work with any platform

### FR-7: Admin Dashboard

**FR-7.1: Platform Management**
- Connect/disconnect platforms
- View connection status
- Re-authorize if token expired

**FR-7.2: Unified Settings**
- Single place to manage all overlay settings
- Platform-specific toggles where needed
- Combined chat enable/disable

---

## Non-Functional Requirements

### NFR-1: Security

**NFR-1.1: Multi-Layer Isolation**
- Tenant isolation (streamer A can't see streamer B)
- Platform isolation (Kick data separate from Twitch data)
- Automated tests for both layers

**NFR-1.2: Token Security**
- OAuth tokens encrypted at rest
- Separate tokens per platform
- Auto-refresh before expiration

### NFR-2: Extensibility

**NFR-2.1: Platform Adapter Pattern**
- New platforms added by implementing interface
- No changes to core system
- YouTube Gaming ready architecture

### NFR-3: Performance

**NFR-3.1: Response Times**
- API responses: < 100ms p95
- Chat message to overlay: < 500ms
- OAuth flow: < 3s total

---

## Technical Approach

### Platform Adapter Implementation

```typescript
// server/platforms/interface.ts
export interface PlatformAdapter {
  readonly platform: Platform;

  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refreshToken(token: string): Promise<OAuthTokens>;
  getUserInfo(token: string): Promise<PlatformUser>;
  getChannelInfo(token: string): Promise<ChannelInfo>;
  sendMessage(channelId: string, message: string, token: string): Promise<void>;
  registerWebhooks(channelId: string, callbackUrl: string, token: string): Promise<void>;
  parseWebhookEvent(headers: Headers, body: unknown): WebhookEvent | null;
}

// server/platforms/kick.ts
export class KickAdapter implements PlatformAdapter {
  readonly platform = 'kick' as const;
  // ... implementation
}

// server/platforms/twitch.ts
export class TwitchAdapter implements PlatformAdapter {
  readonly platform = 'twitch' as const;
  // ... implementation
}

// Factory
export function getPlatformAdapter(platform: Platform): PlatformAdapter {
  switch (platform) {
    case 'kick': return new KickAdapter();
    case 'twitch': return new TwitchAdapter();
    default: throw new Error(`Unknown platform: ${platform}`);
  }
}
```

### URL Routing

```typescript
// Platform-specific routes
// /kick/codingbutter/overlay → KickOverlay for codingbutter
// /twitch/codingbutter/overlay → TwitchOverlay for codingbutter

// Unified routes
// /codingbutter/admin → Admin for streamer codingbutter
// /codingbutter/overlay/combined → Combined overlay
```

---

## Migration Strategy

### Phase 1: Data Layer + Platform Abstraction
1. Multi-tenant data layer (existing EPIC-1)
2. Add platform_connections table
3. Create PlatformAdapter interface
4. Implement KickAdapter (existing functionality)

### Phase 2: Twitch Integration
1. Implement TwitchAdapter
2. Add Twitch OAuth flow
3. Add Twitch EventSub integration
4. Update webhook handlers

### Phase 3: Combined Features
1. Combined chat widget
2. Platform selection in admin
3. Unified overlay option

### Phase 4: Marketing & Launch
1. Update branding to multi-platform
2. Landing page with both platforms
3. Documentation for both

---

## Out of Scope (Future Phases)

1. **YouTube Gaming**: Can be added later with adapter
2. **Facebook Gaming**: Same pattern
3. **Cross-Platform Viewer Identity**: Linking same viewer across platforms
4. **Monetization**: No payments in v1
5. **Mobile App**: Web only

---

## Open Questions

1. **Viewer Identity**: Keep separate (`viewer@kick`, `viewer@twitch`) or allow linking?
   - **Decision**: Separate for v1, linking as future feature

2. **Leaderboards**: Combined or per-platform?
   - **Decision**: Per-platform default, combined optional

3. **TTS Queue**: One queue or per-platform?
   - **Decision**: Single queue, marked with platform

---

## Appendix

### A. Team Discussion Summary (2025-12-07)

The team agreed on:
- Platform Adapter pattern for abstraction
- URL structure: `/<platform>/<channel>/*` for platform-specific, `/<streamer>/*` for unified
- Separate viewer identities per platform
- Combined chat as optional feature for simulcasters
- Add new epic for Platform Adapter layer
- Fork to `streaming-system` repo

### B. Existing Features to Preserve

- Drop game physics and powerups
- TTS integration with ElevenLabs
- Overlay widget system
- Chat command system
- Theme customization
- Points economy

### C. Platform Comparison

| Feature | Kick | Twitch |
|---------|------|--------|
| OAuth | OAuth 2.0 | OAuth 2.0 |
| Chat Events | Webhooks | EventSub / IRC |
| Follow Events | Webhooks | EventSub |
| Sub Events | Webhooks | EventSub |
| Rate Limits | TBD | Well documented |
| API Docs | Limited | Extensive |

### D. Related Documents

- [Architecture Document](./architecture-multi-tenant.md)
- [Database Schema](./database-schema.md)
- [Epics Index](./epics/index.md)
