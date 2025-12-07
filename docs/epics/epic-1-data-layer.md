# Epic 1: Multi-Tenant Data Layer

**Epic ID:** EPIC-1
**Priority:** P0 - Critical (Foundation)
**Status:** Draft
**Estimated Effort:** Large

---

## Epic Description

Implement the multi-tenant data abstraction layer that enables complete data isolation between streamers. This is the foundational epic that all other features depend on.

## Business Value

- Enables multiple streamers to use the platform simultaneously
- Ensures bank-vault level data isolation (zero cross-tenant data leakage)
- Provides flexibility to migrate to different database backends in the future

## Dependencies

- None (this is the foundation)

## Acceptance Criteria

1. All database tables have `streamer_id` foreign key (except `streamers` table)
2. `DataStore` interface abstracts all database operations
3. `SQLiteDataStore` implements the interface with tenant isolation
4. All existing data is migrated with default streamer (Butters)
5. Automated tests verify no cross-tenant data access is possible
6. Zero regressions in existing functionality

---

## Stories

### Story 1.1: Create Streamers Table and Data Store Interface

**Story ID:** STORY-1.1
**Points:** 5
**Priority:** P0

#### Description
Create the `streamers` table and define the `DataStore` interface that will abstract all database operations.

#### Acceptance Criteria
- [ ] `streamers` table created with fields: id, kick_user_id, username, display_name, avatar_url, created_at, updated_at
- [ ] `DataStore` interface defined with all required methods
- [ ] Interface includes JSDoc comments for all methods
- [ ] Unit tests for interface type safety

#### Technical Notes
```typescript
// server/data/interface.ts
export interface DataStore {
  // Streamers
  getStreamer(id: number): Promise<Streamer | null>;
  getStreamerByUsername(username: string): Promise<Streamer | null>;
  getStreamerByKickId(kickUserId: string): Promise<Streamer | null>;
  createStreamer(data: CreateStreamerInput): Promise<Streamer>;
  // ... see architecture doc for full interface
}
```

#### Files to Create/Modify
- `server/data/interface.ts` (new)
- `server/data/types.ts` (new)
- `server/db/schema.sql` (modify)

---

### Story 1.2: Add streamer_id to All Tables

**Story ID:** STORY-1.2
**Points:** 8
**Priority:** P0

#### Description
Add `streamer_id` column to all existing tables and create appropriate indexes and foreign keys.

#### Acceptance Criteria
- [ ] `users` table has `streamer_id` NOT NULL with FK to streamers
- [ ] `powerup_config` table has `streamer_id` in composite primary key
- [ ] `overlay_settings` table has `streamer_id` in composite primary key
- [ ] `tips` table has `streamer_id` with FK
- [ ] `goals` table has `streamer_id` in composite primary key
- [ ] `api_tokens` table has `streamer_id` with unique constraint (streamer_id, provider)
- [ ] `verification_codes` table has `streamer_id` with FK
- [ ] All foreign keys have ON DELETE CASCADE
- [ ] Appropriate indexes created for common queries

#### Technical Notes
User-related tables (user_points, powerup_inventory, drop_history, powerup_purchases, user_sessions) don't need streamer_id directly as they reference users which already has it.

#### Files to Modify
- `server/db/schema.sql`
- `server/db/migrations/001-multi-tenant.sql` (new)

---

### Story 1.3: Implement SQLiteDataStore

**Story ID:** STORY-1.3
**Points:** 13
**Priority:** P0

#### Description
Implement the `SQLiteDataStore` class that implements the `DataStore` interface with proper tenant isolation.

#### Acceptance Criteria
- [ ] All `DataStore` methods implemented
- [ ] Every query includes `streamer_id` WHERE clause
- [ ] Prepared statements used for all queries
- [ ] Error handling for constraint violations
- [ ] Transaction support where needed
- [ ] Connection pooling considerations documented

#### Technical Notes
```typescript
// server/data/sqlite.ts
export class SQLiteDataStore implements DataStore {
  constructor(dbPath: string) { ... }

  async getUser(streamerId: number, userId: number): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users
      WHERE id = ? AND streamer_id = ?
    `);
    return stmt.get(userId, streamerId) as User | null;
  }
  // ... all methods
}
```

#### Files to Create
- `server/data/sqlite.ts`

---

### Story 1.4: Data Migration Script

**Story ID:** STORY-1.4
**Points:** 5
**Priority:** P0

#### Description
Create migration script that:
1. Creates new schema with multi-tenant support
2. Migrates existing data to new schema
3. Creates default "codingbutter" streamer for existing data

#### Acceptance Criteria
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Existing data preserved with correct streamer_id
- [ ] Backup created before migration
- [ ] Rollback script provided
- [ ] Migration logged for audit

#### Technical Notes
```typescript
// server/db/migrations/migrate-to-multi-tenant.ts
export async function migrateToMultiTenant() {
  // 1. Backup existing database
  // 2. Create streamers table
  // 3. Insert default streamer (codingbutter)
  // 4. Add streamer_id columns
  // 5. Update all existing rows
  // 6. Add foreign key constraints
}
```

#### Files to Create
- `server/db/migrations/migrate-to-multi-tenant.ts`

---

### Story 1.5: Refactor Existing Queries

**Story ID:** STORY-1.5
**Points:** 13
**Priority:** P0

#### Description
Refactor all existing database queries in `server/db/index.ts` to go through the DataStore interface.

#### Acceptance Criteria
- [ ] All queries in `server/db/index.ts` refactored
- [ ] Direct database access removed from route handlers
- [ ] DataStore instance exported and used everywhere
- [ ] No direct SQL queries outside DataStore
- [ ] All existing tests pass

#### Technical Notes
Current pattern:
```typescript
// OLD - direct queries
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// NEW - through DataStore
const user = await dataStore.getUser(streamerId, userId);
```

#### Files to Modify
- `server/db/index.ts` (major refactor)
- `server/routes/*.ts` (update to use dataStore)
- `server/commands.ts` (update to use dataStore)

---

### Story 1.6: Tenant Isolation Tests

**Story ID:** STORY-1.6
**Points:** 8
**Priority:** P0

#### Description
Create comprehensive tests that verify tenant isolation. These tests should FAIL if any data leakage is possible.

#### Acceptance Criteria
- [ ] Test: Cannot get user from another streamer
- [ ] Test: Cannot update user from another streamer
- [ ] Test: Cannot view points from another streamer's user
- [ ] Test: Cannot access overlay settings from another streamer
- [ ] Test: Cannot access tips from another streamer
- [ ] Test: Cannot access goals from another streamer
- [ ] Test: API endpoints return 404 for other streamers' resources
- [ ] All tests run in CI/CD pipeline

#### Technical Notes
```typescript
// tests/tenant-isolation.test.ts
test('cannot access other streamer user via API', async () => {
  const streamer1 = await createTestStreamer('s1');
  const streamer2 = await createTestStreamer('s2');
  const user = await dataStore.createUser(streamer1.id, { username: 'testuser' });

  // Attempt to access via streamer2's API
  const res = await fetch(`/s2/api/users/${user.id}`);
  expect(res.status).toBe(404);
});
```

#### Files to Create
- `tests/tenant-isolation.test.ts`

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] All tests passing (100% for isolation tests)
- [ ] Code reviewed by team
- [ ] Documentation updated
- [ ] No regressions in existing functionality
- [ ] Existing data migrated successfully
