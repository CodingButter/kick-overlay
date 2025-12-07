# Epic 1.5: Platform Adapter Layer

**Epic ID:** EPIC-1.5
**Priority:** P0 - Critical (Foundation)
**Status:** Draft
**Estimated Effort:** Medium

---

## Epic Description

Create the platform abstraction layer that allows the system to work with multiple streaming platforms (Kick, Twitch, and future platforms) through a unified interface.

## Business Value

- Enables support for both Kick and Twitch users
- Dramatically increases total addressable market
- Makes adding future platforms (YouTube, etc.) trivial
- Single codebase serves all platforms

## Dependencies

- EPIC-1: Data Layer (platform_connections table)

## Acceptance Criteria

1. `PlatformAdapter` interface defined
2. `KickAdapter` implements interface (existing functionality)
3. `TwitchAdapter` implements interface
4. Platform factory creates correct adapter
5. Webhook handlers work for both platforms
6. Tests cover both adapters

---

## Stories

### Story 1.5.1: Define Platform Adapter Interface

**Story ID:** STORY-1.5.1
**Points:** 5
**Priority:** P0

#### Description
Define the `PlatformAdapter` interface that all platform implementations must follow.

#### Acceptance Criteria
- [ ] Interface defined in `server/platforms/interface.ts`
- [ ] All authentication methods defined
- [ ] All user/channel methods defined
- [ ] All chat methods defined
- [ ] All webhook methods defined
- [ ] TypeScript types for all inputs/outputs
- [ ] JSDoc comments for all methods

#### Technical Notes
```typescript
// server/platforms/interface.ts
export type Platform = 'kick' | 'twitch';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

export interface PlatformUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ChannelInfo {
  id: string;
  username: string;
  displayName: string;
  isLive: boolean;
  title?: string;
  viewerCount?: number;
}

export interface ChatMessage {
  id: string;
  platform: Platform;
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  badges?: string[];
  emotes?: Array<{ id: string; positions: [number, number][] }>;
}

export interface WebhookEvent {
  type: 'chat' | 'follow' | 'subscribe' | 'raid' | 'cheer';
  platform: Platform;
  data: ChatMessage | FollowEvent | SubscribeEvent | RaidEvent | CheerEvent;
}

export interface PlatformAdapter {
  readonly platform: Platform;

  // OAuth
  getAuthUrl(state: string, scopes?: string[]): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  // User/Channel
  getUserInfo(accessToken: string): Promise<PlatformUser>;
  getChannelInfo(accessToken: string): Promise<ChannelInfo>;

  // Chat
  sendMessage(channelId: string, message: string, accessToken: string): Promise<void>;

  // Webhooks
  registerWebhooks(channelId: string, callbackUrl: string, accessToken: string): Promise<void>;
  unregisterWebhooks(channelId: string, accessToken: string): Promise<void>;
  verifyWebhookSignature(headers: Headers, body: string): boolean;
  parseWebhookEvent(headers: Headers, body: unknown): WebhookEvent | null;
}
```

#### Files to Create
- `server/platforms/interface.ts`
- `server/platforms/types.ts`

---

### Story 1.5.2: Implement Kick Adapter

**Story ID:** STORY-1.5.2
**Points:** 8
**Priority:** P0

#### Description
Implement the `KickAdapter` class that wraps existing Kick integration.

#### Acceptance Criteria
- [ ] `KickAdapter` implements `PlatformAdapter`
- [ ] OAuth flow works (existing functionality)
- [ ] User info retrieval works
- [ ] Channel info retrieval works
- [ ] Chat message sending works
- [ ] Webhook registration works
- [ ] Webhook verification works
- [ ] Webhook parsing works
- [ ] All existing Kick tests pass

#### Technical Notes
```typescript
// server/platforms/kick.ts
export class KickAdapter implements PlatformAdapter {
  readonly platform = 'kick' as const;

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config: KickConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  getAuthUrl(state: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes?.join(' ') || 'user:read channel:read chat:write',
      state,
    });
    return `https://kick.com/oauth/authorize?${params}`;
  }

  // ... rest of implementation
}
```

#### Files to Create
- `server/platforms/kick.ts`
- `tests/platforms/kick.test.ts`

---

### Story 1.5.3: Implement Twitch Adapter

**Story ID:** STORY-1.5.3
**Points:** 13
**Priority:** P0

#### Description
Implement the `TwitchAdapter` class for Twitch integration.

#### Acceptance Criteria
- [ ] `TwitchAdapter` implements `PlatformAdapter`
- [ ] OAuth flow works with Twitch
- [ ] User info retrieval via Helix API
- [ ] Channel info retrieval via Helix API
- [ ] Chat message sending via Helix API
- [ ] EventSub webhook registration
- [ ] EventSub signature verification
- [ ] EventSub event parsing (chat, follow, sub)
- [ ] Tests for all methods

#### Technical Notes
```typescript
// server/platforms/twitch.ts
export class TwitchAdapter implements PlatformAdapter {
  readonly platform = 'twitch' as const;

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config: TwitchConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  getAuthUrl(state: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes?.join(' ') || 'user:read:email channel:read:subscriptions chat:read chat:edit',
      state,
    });
    return `https://id.twitch.tv/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  async getUserInfo(accessToken: string): Promise<PlatformUser> {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
    });
    const data = await res.json();
    const user = data.data[0];
    return {
      id: user.id,
      username: user.login,
      displayName: user.display_name,
      avatarUrl: user.profile_image_url,
    };
  }

  // ... EventSub implementation
}
```

#### Files to Create
- `server/platforms/twitch.ts`
- `tests/platforms/twitch.test.ts`

---

### Story 1.5.4: Platform Factory & Registry

**Story ID:** STORY-1.5.4
**Points:** 3
**Priority:** P0

#### Description
Create factory function and registry for platform adapters.

#### Acceptance Criteria
- [ ] `getPlatformAdapter(platform)` factory function
- [ ] Platform config loaded from environment/database
- [ ] Singleton instances for each platform
- [ ] Error for unknown platform
- [ ] Type-safe platform selection

#### Technical Notes
```typescript
// server/platforms/index.ts
import { KickAdapter } from './kick';
import { TwitchAdapter } from './twitch';
import type { Platform, PlatformAdapter } from './interface';

const adapters: Map<Platform, PlatformAdapter> = new Map();

export function initializePlatforms(config: PlatformsConfig): void {
  if (config.kick) {
    adapters.set('kick', new KickAdapter(config.kick));
  }
  if (config.twitch) {
    adapters.set('twitch', new TwitchAdapter(config.twitch));
  }
}

export function getPlatformAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) {
    throw new Error(`Platform not configured: ${platform}`);
  }
  return adapter;
}

export function getAvailablePlatforms(): Platform[] {
  return Array.from(adapters.keys());
}
```

#### Files to Create
- `server/platforms/index.ts`

---

### Story 1.5.5: Platform Connections Table

**Story ID:** STORY-1.5.5
**Points:** 5
**Priority:** P0

#### Description
Add `platform_connections` table to link streamers with their platform accounts.

#### Acceptance Criteria
- [ ] `platform_connections` table created
- [ ] Foreign key to streamers table
- [ ] Unique constraint on (platform, platform_user_id)
- [ ] DataStore methods for connections CRUD
- [ ] Migration script for existing Kick data

#### Technical Notes
```sql
CREATE TABLE platform_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('kick', 'twitch')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  platform_display_name TEXT,
  platform_avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  webhook_secret TEXT,
  connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, platform_user_id)
);

CREATE INDEX idx_platform_connections_streamer ON platform_connections(streamer_id);
CREATE INDEX idx_platform_connections_platform ON platform_connections(platform, platform_username);
```

#### Files to Modify
- `server/db/schema.sql`
- `server/data/interface.ts`
- `server/data/sqlite.ts`

---

### Story 1.5.6: Unified Webhook Handler

**Story ID:** STORY-1.5.6
**Points:** 8
**Priority:** P0

#### Description
Create unified webhook handler that routes to correct platform adapter.

#### Acceptance Criteria
- [ ] Single webhook endpoint per platform: `/webhook/kick`, `/webhook/twitch`
- [ ] Signature verification before processing
- [ ] Route to correct adapter for parsing
- [ ] Unified event type emitted to system
- [ ] Error handling and logging
- [ ] Tests for both platforms

#### Technical Notes
```typescript
// server/routes/webhooks.ts
export async function handleKickWebhook(req: Request): Promise<Response> {
  const adapter = getPlatformAdapter('kick');
  const body = await req.text();

  if (!adapter.verifyWebhookSignature(req.headers, body)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = adapter.parseWebhookEvent(req.headers, JSON.parse(body));
  if (event) {
    await processWebhookEvent(event);
  }

  return new Response('OK');
}

export async function handleTwitchWebhook(req: Request): Promise<Response> {
  const adapter = getPlatformAdapter('twitch');
  const body = await req.text();

  // Handle EventSub verification challenge
  const messageType = req.headers.get('Twitch-Eventsub-Message-Type');
  if (messageType === 'webhook_callback_verification') {
    const data = JSON.parse(body);
    return new Response(data.challenge);
  }

  if (!adapter.verifyWebhookSignature(req.headers, body)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = adapter.parseWebhookEvent(req.headers, JSON.parse(body));
  if (event) {
    await processWebhookEvent(event);
  }

  return new Response('OK');
}
```

#### Files to Create
- `server/routes/webhooks.ts`
- `tests/routes/webhooks.test.ts`

---

### Story 1.5.7: Platform Adapter Tests

**Story ID:** STORY-1.5.7
**Points:** 5
**Priority:** P0

#### Description
Comprehensive tests for platform adapters including mocked API responses.

#### Acceptance Criteria
- [ ] Mock Kick API responses
- [ ] Mock Twitch API responses
- [ ] Test OAuth flows for both
- [ ] Test user info retrieval for both
- [ ] Test webhook verification for both
- [ ] Test webhook parsing for both
- [ ] Integration tests with test accounts (optional)

#### Files to Create
- `tests/platforms/kick.test.ts`
- `tests/platforms/twitch.test.ts`
- `tests/platforms/mocks.ts`

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] Both platform adapters implement full interface
- [ ] Webhook handlers work for both platforms
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Platform connections migrated

---

## Notes

- Twitch EventSub requires HTTPS callback URL (use ngrok for dev)
- Kick API documentation is limited - may need to reverse engineer
- Consider rate limiting per platform
- OAuth tokens should be encrypted at rest
