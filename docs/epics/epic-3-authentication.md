# Epic 3: Streamer Authentication (Kick OAuth)

**Epic ID:** EPIC-3
**Priority:** P0 - Critical
**Status:** Draft
**Estimated Effort:** Medium

---

## Epic Description

Implement Kick OAuth authentication for streamers. Successful OAuth grants full admin access to that streamer's dashboard. No password-based authentication.

## Business Value

- Zero-friction signup (one-click with existing Kick account)
- No password management or reset flows needed
- Verified identity (we know they own the Kick channel)
- Automatic streamer creation on first login

## Dependencies

- EPIC-1: Data Layer (need streamers table)
- EPIC-2: Routing (need OAuth callback route)

## Acceptance Criteria

1. Streamers can log in via Kick OAuth
2. First-time login creates streamer record
3. Returning login creates session
4. Session cookie used for admin access
5. Token refresh handled automatically
6. Logout clears session
7. ENV-based admin access removed

---

## Stories

### Story 3.1: OAuth Flow Implementation

**Story ID:** STORY-3.1
**Points:** 8
**Priority:** P0

#### Description
Implement the complete Kick OAuth flow: authorize → callback → session creation.

#### Acceptance Criteria
- [ ] `/login` redirects to Kick OAuth
- [ ] `/callback` receives authorization code
- [ ] Code exchanged for access token
- [ ] Token stored in database
- [ ] Session created for streamer
- [ ] Redirect to `/<channel>/admin` on success

#### Technical Notes
```typescript
// OAuth flow
// 1. User clicks "Login with Kick"
// 2. Redirect to: https://kick.com/oauth/authorize?
//    client_id=xxx&
//    redirect_uri=https://system.kickoverlay.com/callback&
//    response_type=code&
//    scope=user:read channel:read

// 3. Kick redirects to /callback?code=xxx
// 4. Exchange code for token:
POST https://kick.com/api/v2/oauth/token
{
  grant_type: "authorization_code",
  client_id: "xxx",
  client_secret: "xxx",
  code: "xxx",
  redirect_uri: "xxx"
}

// 5. Get user info with token:
GET https://kick.com/api/v2/user
Authorization: Bearer xxx
```

#### Files to Create/Modify
- `server/routes/oauth.ts` (new)
- `server/services/kick-oauth.ts` (new)
- `index.ts` (add routes)

---

### Story 3.2: Streamer Session Management

**Story ID:** STORY-3.2
**Points:** 5
**Priority:** P0

#### Description
Implement session creation, validation, and expiration for streamer admin access.

#### Acceptance Criteria
- [ ] Session tokens are cryptographically secure
- [ ] Sessions stored in `streamer_sessions` table
- [ ] Session cookie set with HttpOnly, Secure, SameSite
- [ ] Session expiration (default 7 days)
- [ ] Session validation middleware
- [ ] Logout endpoint clears session

#### Technical Notes
```typescript
// server/services/session.ts
export async function createStreamerSession(streamerId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await dataStore.createStreamerSession(streamerId, token, expiresAt);
  return token;
}

export async function validateStreamerSession(
  token: string,
  channelUsername: string
): Promise<Streamer | null> {
  const session = await dataStore.getStreamerSession(token);
  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const streamer = await dataStore.getStreamer(session.streamer_id);
  if (!streamer || streamer.username !== channelUsername) {
    return null; // Can only access own channel
  }

  return streamer;
}
```

#### Files to Create
- `server/services/session.ts`
- `server/middleware/auth.ts`

---

### Story 3.3: First-Time Setup Wizard

**Story ID:** STORY-3.3
**Points:** 8
**Priority:** P1

#### Description
Create the onboarding wizard for first-time streamers.

#### Acceptance Criteria
- [ ] Detect first-time login (no prior sessions)
- [ ] Show welcome wizard with 3 steps
- [ ] Step 1: Webhook URL copy
- [ ] Step 2: OBS URL copy
- [ ] Step 3: Optional theme selection
- [ ] "Go Live" button completes wizard
- [ ] Mark setup complete in database
- [ ] Skip wizard for returning users

#### Technical Notes
```typescript
// Add to streamers table
ALTER TABLE streamers ADD COLUMN setup_completed INTEGER DEFAULT 0;

// After OAuth callback
if (!streamer.setup_completed) {
  redirect(`/${channel}/setup`);
} else {
  redirect(`/${channel}/admin`);
}
```

#### Files to Create
- `src/pages/SetupWizardPage.tsx`

---

### Story 3.4: Token Refresh

**Story ID:** STORY-3.4
**Points:** 5
**Priority:** P1

#### Description
Implement automatic token refresh when access token expires.

#### Acceptance Criteria
- [ ] Check token expiration before API calls
- [ ] Refresh token if within 5 minutes of expiration
- [ ] Handle refresh failure gracefully
- [ ] Update stored tokens after refresh
- [ ] Retry original request after refresh

#### Technical Notes
```typescript
// Token refresh flow
POST https://kick.com/api/v2/oauth/token
{
  grant_type: "refresh_token",
  client_id: "xxx",
  client_secret: "xxx",
  refresh_token: "xxx"
}
```

#### Files to Modify
- `server/services/kick-oauth.ts`

---

### Story 3.5: Remove ENV-Based Admin Access

**Story ID:** STORY-3.5
**Points:** 3
**Priority:** P0

#### Description
Remove the current ENV-based admin access (ADMIN_USERS array) and replace with OAuth-based access.

#### Acceptance Criteria
- [ ] Remove ADMIN_USERS from code
- [ ] Remove admin session token generation
- [ ] Update all admin endpoints to use OAuth sessions
- [ ] Document migration for existing deployment
- [ ] Keep ElevenLabs API key in ENV (external service)
- [ ] Keep Kick OAuth credentials in ENV (external service)

#### Files to Modify
- `index.ts`
- `server/routes/admin.ts`
- `.env.example`

---

### Story 3.6: Admin Auth Guard

**Story ID:** STORY-3.6
**Points:** 5
**Priority:** P0

#### Description
Create authentication guard for admin routes that validates streamer session matches channel.

#### Acceptance Criteria
- [ ] `requireStreamerAuth()` middleware
- [ ] Validates session exists
- [ ] Validates session not expired
- [ ] Validates streamer owns the channel in URL
- [ ] Returns 401 for invalid/missing session
- [ ] Returns 403 for wrong channel

#### Technical Notes
```typescript
// server/middleware/auth.ts
export async function requireStreamerAuth(
  req: Request,
  context: ChannelContext
): Promise<Streamer> {
  const sessionToken = getCookie(req, 'streamer_session');
  if (!sessionToken) {
    throw new UnauthorizedError('Not logged in');
  }

  const streamer = await validateStreamerSession(sessionToken);
  if (!streamer) {
    throw new UnauthorizedError('Invalid session');
  }

  if (streamer.id !== context.streamerId) {
    throw new ForbiddenError('Cannot access other channels');
  }

  return streamer;
}
```

#### Files to Create/Modify
- `server/middleware/auth.ts`
- `server/routes/admin.ts`

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] OAuth flow works end-to-end
- [ ] Sessions properly created and validated
- [ ] ENV-based admin removed
- [ ] Setup wizard functional
- [ ] All admin endpoints protected
- [ ] Security review completed
