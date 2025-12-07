# Epic 2: Channel-Based URL Routing

**Epic ID:** EPIC-2
**Priority:** P0 - Critical
**Status:** Draft
**Estimated Effort:** Medium

---

## Epic Description

Implement the `/<channel>/<endpoint>` URL routing pattern across the entire application, including both backend API routes and frontend React routes.

## Business Value

- Clear URL structure makes channel context obvious
- Enables SEO-friendly URLs for public pages
- Allows streamers to share their channel URLs easily
- Foundation for marketing (each channel gets shareable links)

## Dependencies

- EPIC-1: Data Layer (streamer context required for routing)

## Acceptance Criteria

1. All routes follow `/<channel>/<endpoint>` pattern
2. Channel middleware extracts streamer context from URL
3. Invalid channels return proper 404 responses
4. Frontend React Router updated for new structure
5. All API endpoints validate channel context
6. Backward compatibility considered for migration period

---

## Stories

### Story 2.1: Channel Middleware

**Story ID:** STORY-2.1
**Points:** 5
**Priority:** P0

#### Description
Create middleware that extracts channel from URL and provides streamer context to all routes.

#### Acceptance Criteria
- [ ] `extractChannelContext()` function extracts channel from URL path
- [ ] Returns null for root routes (/, /login, /callback, /api/health)
- [ ] Looks up streamer by username
- [ ] Returns 404 for invalid channels
- [ ] Provides typed `ChannelContext` object

#### Technical Notes
```typescript
// server/middleware/channel.ts
export interface ChannelContext {
  channel: string;
  streamerId: number;
  streamer: Streamer;
}

export async function extractChannelContext(req: Request): Promise<ChannelContext | null> {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);

  // Root routes don't have channel
  if (parts.length === 0 || ROOT_ROUTES.includes(parts[0])) {
    return null;
  }

  const channel = parts[0].toLowerCase();
  const streamer = await dataStore.getStreamerByUsername(channel);

  if (!streamer) return null;

  return { channel, streamerId: streamer.id, streamer };
}
```

#### Files to Create
- `server/middleware/channel.ts`

---

### Story 2.2: Update Backend API Routes

**Story ID:** STORY-2.2
**Points:** 13
**Priority:** P0

#### Description
Update all API routes to use the `/<channel>/api/*` pattern and extract channel context.

#### Acceptance Criteria
- [ ] All API routes updated: `/api/chat` → `/<channel>/api/chat`
- [ ] All API routes extract channel context
- [ ] Invalid channel returns 404
- [ ] Error responses include proper status codes
- [ ] OpenAPI spec updated (if exists)

#### Routes to Update
| Old Route | New Route |
|-----------|-----------|
| `/api/chat` | `/<channel>/api/chat` |
| `/api/dropgame/*` | `/<channel>/api/dropgame/*` |
| `/api/tts/*` | `/<channel>/api/tts/*` |
| `/api/overlay/*` | `/<channel>/api/overlay/*` |
| `/api/admin/*` | `/<channel>/api/admin/*` |
| `/api/profile/*` | `/<channel>/api/profile/*` |
| `/api/powerups/*` | `/<channel>/api/powerups/*` |
| `/api/leaderboard` | `/<channel>/api/leaderboard` |
| `/api/commands` | `/<channel>/api/commands` |

#### Technical Notes
```typescript
// server/routes/api.ts
export function createChannelApiRoutes(context: ChannelContext) {
  return {
    [`/${context.channel}/api/chat`]: {
      GET: () => handleGetChat(context),
      POST: (req) => handlePostChat(context, req),
    },
    // ... more routes
  };
}
```

#### Files to Modify
- `server/routes/api.ts` (new or refactor)
- `server/routes/index.ts`
- `index.ts`

---

### Story 2.3: Update Frontend React Router

**Story ID:** STORY-2.3
**Points:** 8
**Priority:** P0

#### Description
Update React Router configuration to support `/<channel>/*` routes with channel context provider.

#### Acceptance Criteria
- [ ] `/:channel` route parameter in React Router
- [ ] `ChannelProvider` context created
- [ ] All child routes receive channel context
- [ ] Loading state while fetching streamer info
- [ ] Error state for invalid channels
- [ ] 404 page for unknown channels

#### Technical Notes
```typescript
// src/App.tsx
<Routes>
  {/* Root routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/callback" element={<CallbackPage />} />

  {/* Channel routes */}
  <Route path="/:channel" element={<ChannelLayout />}>
    <Route index element={<ChannelHome />} />
    <Route path="overlay" element={<OverlayPage />} />
    <Route path="overlay/dropgame" element={<DropGamePage />} />
    <Route path="overlay/:layoutId" element={<OverlayPage />} />
    <Route path="admin/*" element={<AdminPage />} />
    <Route path="commands" element={<CommandsPage />} />
    <Route path="voicelist" element={<VoiceListPage />} />
    <Route path="profile-login" element={<ProfileLoginPage />} />
    <Route path="profile/:username" element={<ProfilePage />} />
  </Route>
</Routes>
```

#### Files to Create/Modify
- `src/App.tsx` (modify)
- `src/context/ChannelContext.tsx` (new)
- `src/components/layout/ChannelLayout.tsx` (new)

---

### Story 2.4: Update API Client

**Story ID:** STORY-2.4
**Points:** 5
**Priority:** P0

#### Description
Update the frontend API client to include channel in all API calls.

#### Acceptance Criteria
- [ ] API client accepts channel parameter
- [ ] All fetch calls include channel prefix
- [ ] Channel can be set globally or per-request
- [ ] TypeScript types updated
- [ ] Error handling for channel-related errors

#### Technical Notes
```typescript
// src/lib/api.ts
class ApiClient {
  private channel: string = '';

  setChannel(channel: string) {
    this.channel = channel;
  }

  private url(path: string): string {
    if (!this.channel) throw new Error('Channel not set');
    return `/${this.channel}/api${path}`;
  }

  async getChat(): Promise<ChatMessage[]> {
    const res = await fetch(this.url('/chat'));
    return res.json();
  }
}
```

#### Files to Modify
- `src/lib/api.ts`

---

### Story 2.5: Update All Page Components

**Story ID:** STORY-2.5
**Points:** 8
**Priority:** P0

#### Description
Update all page components to use the channel context and new API client.

#### Acceptance Criteria
- [ ] All pages use `useChannelContext()` hook
- [ ] All API calls go through channel-aware client
- [ ] No hardcoded API URLs
- [ ] Links include channel prefix
- [ ] Navigation works correctly

#### Pages to Update
- `OverlayPage.tsx`
- `DropGamePage.tsx`
- `AdminPage.tsx`
- `CommandsPage.tsx`
- `VoiceListPage.tsx`
- `ProfileLoginPage.tsx`
- `ProfilePage.tsx`
- `WikiPage.tsx`

#### Files to Modify
- All files in `src/pages/`

---

### Story 2.6: Root Routes (Marketing & Auth)

**Story ID:** STORY-2.6
**Points:** 5
**Priority:** P1

#### Description
Implement root-level routes that don't require channel context.

#### Acceptance Criteria
- [ ] `/` - Landing/marketing page
- [ ] `/login` - Initiates Kick OAuth
- [ ] `/callback` - OAuth callback handler
- [ ] `/api/health` - Health check endpoint
- [ ] Marketing page has "Get Started" CTA

#### Technical Notes
These routes don't have channel context because:
- Landing page is for all potential users
- OAuth flow happens before channel is known
- Health check is for infrastructure monitoring

#### Files to Create
- `src/pages/LandingPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/CallbackPage.tsx`

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] All routes follow new pattern
- [ ] Old routes return 301 redirects (or removed)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Manual testing of all user flows
