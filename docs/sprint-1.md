# Sprint 1: Multi-Tenant Data Layer Foundation

**Sprint Number:** 1
**Start Date:** 2025-12-07
**Epic:** EPIC-1 - Multi-Tenant Data Layer
**Sprint Goal:** All data operations go through tenant-isolated DataStore with complete migration

---

## Sprint Backlog

| Story ID | Story Title | Points | Status | Assignee |
|----------|-------------|--------|--------|----------|
| 1.1 | Create Streamers Table & DataStore Interface | 5 | Ready | - |
| 1.2 | Add streamer_id to All Tables | 8 | Ready | - |
| 1.3 | Implement SQLiteDataStore | 13 | Ready | - |
| 1.4 | Data Migration Script | 5 | Ready | - |
| 1.5 | Refactor Existing Queries | 13 | Ready | - |
| 1.6 | Tenant Isolation Tests | 8 | Ready | - |

**Total Points:** 52

---

## Story Details

### STORY-1.1: Create Streamers Table & DataStore Interface
**Status:** Ready

#### Tasks
- [ ] Create `streamers` table in schema.sql
- [ ] Define `Streamer` type in server/data/types.ts
- [ ] Define `DataStore` interface in server/data/interface.ts
- [ ] Add JSDoc comments for all interface methods
- [ ] Write type tests for interface

#### Acceptance Criteria
- Streamers table exists with: id, kick_user_id, username, display_name, avatar_url, created_at, updated_at
- DataStore interface defines all required methods
- All methods have proper TypeScript types

#### Files
- `server/data/types.ts` (create)
- `server/data/interface.ts` (create)
- `server/db/schema.sql` (modify)

---

### STORY-1.2: Add streamer_id to All Tables
**Status:** Ready

#### Tasks
- [ ] Add streamer_id to `users` table
- [ ] Add streamer_id to `powerup_config` table
- [ ] Add streamer_id to `overlay_settings` table
- [ ] Add streamer_id to `tips` table
- [ ] Add streamer_id to `goals` table
- [ ] Add streamer_id to `api_tokens` table
- [ ] Add streamer_id to `verification_codes` table
- [ ] Add theme_settings table with streamer_id
- [ ] Add overlay_layouts table with streamer_id
- [ ] Create migration SQL file
- [ ] Add appropriate indexes

#### Acceptance Criteria
- All tables have streamer_id column (except user_* tables which reference users)
- Foreign keys reference streamers(id) with ON DELETE CASCADE
- Indexes exist for streamer_id columns
- Migration SQL is idempotent

#### Files
- `server/db/schema.sql` (modify)
- `server/db/migrations/001-multi-tenant-schema.sql` (create)

---

### STORY-1.3: Implement SQLiteDataStore
**Status:** Ready

#### Tasks
- [ ] Create SQLiteDataStore class
- [ ] Implement streamer methods (get, create, update)
- [ ] Implement user methods with streamer_id
- [ ] Implement points methods
- [ ] Implement powerup methods
- [ ] Implement overlay settings methods
- [ ] Implement overlay layouts methods
- [ ] Implement tips methods
- [ ] Implement goals methods
- [ ] Implement theme methods
- [ ] Implement token methods
- [ ] Implement session methods
- [ ] Implement verification methods
- [ ] Implement analytics methods

#### Acceptance Criteria
- All DataStore interface methods implemented
- Every query includes WHERE streamer_id = ?
- Prepared statements used for all queries
- Error handling for constraint violations
- Unit tests for each method

#### Files
- `server/data/sqlite.ts` (create)
- `tests/data/sqlite.test.ts` (create)

---

### STORY-1.4: Data Migration Script
**Status:** Ready

#### Tasks
- [ ] Create backup of existing database
- [ ] Create default streamer (codingbutter)
- [ ] Update all existing rows with default streamer_id
- [ ] Verify data integrity after migration
- [ ] Create rollback script
- [ ] Add migration logging

#### Acceptance Criteria
- Migration is idempotent (safe to run multiple times)
- Existing data preserved with correct streamer_id
- Backup created in data/backups/
- Rollback script tested
- Migration logs to console

#### Files
- `server/db/migrations/migrate-to-multi-tenant.ts` (create)
- `server/db/migrations/rollback-multi-tenant.ts` (create)

---

### STORY-1.5: Refactor Existing Queries
**Status:** Ready

#### Tasks
- [ ] Create dataStore singleton instance
- [ ] Refactor server/db/index.ts exports
- [ ] Update all route handlers to use dataStore
- [ ] Update server/commands.ts to use dataStore
- [ ] Update server/services/*.ts to use dataStore
- [ ] Remove direct db.prepare() calls
- [ ] Update API response types

#### Acceptance Criteria
- All database access goes through DataStore
- No direct SQL queries outside DataStore
- All existing functionality works
- All existing tests pass

#### Files
- `server/db/index.ts` (major refactor)
- `server/routes/*.ts` (modify)
- `server/commands.ts` (modify)
- `server/services/*.ts` (modify)
- `index.ts` (modify)

---

### STORY-1.6: Tenant Isolation Tests
**Status:** Ready

#### Tasks
- [ ] Create test helper for creating test streamers
- [ ] Create test helper for creating test users
- [ ] Write test: cannot get user from another streamer
- [ ] Write test: cannot update user from another streamer
- [ ] Write test: cannot view points from another streamer
- [ ] Write test: cannot access overlay settings from another streamer
- [ ] Write test: cannot access tips from another streamer
- [ ] Write test: cannot access goals from another streamer
- [ ] Write test: all queries include streamer_id
- [ ] Add tests to CI pipeline

#### Acceptance Criteria
- All tenant isolation tests pass
- Tests cover all DataStore methods
- Tests fail if isolation is broken
- CI runs tests on every commit

#### Files
- `tests/tenant-isolation.test.ts` (create)
- `tests/helpers/test-data.ts` (create)

---

## Definition of Done

### Code Quality
- [ ] All code follows TypeScript strict mode
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Code reviewed by at least one team member

### Testing
- [ ] All new code has unit tests
- [ ] All tenant isolation tests pass
- [ ] All existing tests pass
- [ ] Manual testing of key flows completed

### Documentation
- [ ] Code has JSDoc comments
- [ ] README updated if needed
- [ ] Architecture docs updated if needed

### Deployment
- [ ] Works on local development
- [ ] Migration tested on copy of production data
- [ ] No breaking changes to existing API

---

## Sprint Ceremonies

### Daily Standup
- What did you complete?
- What will you work on?
- Any blockers?

### Sprint Review
- Demo working tenant isolation
- Show all tests passing
- Review migration results

### Sprint Retrospective
- What went well?
- What could improve?
- Action items for next sprint

---

## Risk Log

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Migration corrupts data | Low | High | Backup before migration | Open |
| Breaking existing features | Medium | High | Comprehensive testing | Open |
| Story scope creep | Medium | Medium | Strict acceptance criteria | Open |

---

## Notes

- This is the foundation sprint - take extra care with data integrity
- All other epics depend on this work
- Focus on correctness over speed
- When in doubt, add more tests

---

*Sprint 1 - KickOverlay SaaS Transformation*
*Generated: 2025-12-07*
