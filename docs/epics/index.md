# Streaming System - Epics Overview

**Project:** Multi-Platform Streaming System (Kick + Twitch)
**Date:** 2025-12-07
**Repository:** https://github.com/CodingButter/streaming-system
**Total Story Points:** ~183 points

---

## Epic Summary

| Epic | Name | Priority | Points | Dependencies |
|------|------|----------|--------|--------------|
| EPIC-1 | Multi-Tenant Data Layer | P0 | 52 | None |
| **EPIC-1.5** | **Platform Adapter Layer** | **P0** | **47** | **EPIC-1** |
| EPIC-2 | Channel-Based URL Routing | P0 | 44 | EPIC-1, EPIC-1.5 |
| EPIC-3 | Multi-Platform Authentication | P0 | 34 | EPIC-1, EPIC-1.5, EPIC-2 |
| EPIC-4 | Multiple Overlay Layouts | P1 | 34 | EPIC-1, EPIC-2, EPIC-3 |
| EPIC-5 | Marketing Site | P2 | 13 | EPIC-3 |

---

## Dependency Graph

```
EPIC-1: Data Layer
    │
    └──► EPIC-1.5: Platform Adapter Layer
              │
              └──► EPIC-2: Routing (platform-aware)
                        │
                        └──► EPIC-3: Authentication (multi-platform)
                                  │
                                  ├──► EPIC-4: Multiple Layouts
                                  │
                                  └──► EPIC-5: Marketing Site
```

---

## Recommended Sprint Order

### Sprint 1: Data Foundation (EPIC-1)
**Goal:** Multi-tenant data layer complete and tested

| Story | Description | Points |
|-------|-------------|--------|
| 1.1 | Create Streamers Table & Interface | 5 |
| 1.2 | Add streamer_id to All Tables | 8 |
| 1.3 | Implement SQLiteDataStore | 13 |
| 1.4 | Data Migration Script | 5 |
| 1.5 | Refactor Existing Queries | 13 |
| 1.6 | Tenant Isolation Tests | 8 |

**Sprint Total:** 52 points

### Sprint 2: Platform Abstraction (EPIC-1.5)
**Goal:** Platform adapter layer with Kick and Twitch support

| Story | Description | Points |
|-------|-------------|--------|
| 1.5.1 | Define Platform Adapter Interface | 5 |
| 1.5.2 | Implement Kick Adapter | 8 |
| 1.5.3 | Implement Twitch Adapter | 13 |
| 1.5.4 | Platform Factory & Registry | 3 |
| 1.5.5 | Platform Connections Table | 5 |
| 1.5.6 | Unified Webhook Handler | 8 |
| 1.5.7 | Platform Adapter Tests | 5 |

**Sprint Total:** 47 points

### Sprint 3: Routing & Auth (EPIC-2 + EPIC-3)
**Goal:** Platform-aware URLs and multi-platform OAuth

| Story | Description | Points |
|-------|-------------|--------|
| 2.1 | Channel Middleware (platform-aware) | 5 |
| 2.2 | Update Backend API Routes | 13 |
| 2.3 | Update Frontend React Router | 8 |
| 2.4 | Update API Client | 5 |
| 2.5 | Update All Page Components | 8 |
| 2.6 | Root Routes (Marketing & Auth) | 5 |
| 3.1 | OAuth Flow (both platforms) | 8 |
| 3.2 | Streamer Session Management | 5 |
| 3.5 | Remove ENV-Based Admin Access | 3 |
| 3.6 | Admin Auth Guard | 5 |

**Sprint Total:** 65 points (may split into 2 sprints)

### Sprint 4: Features (EPIC-3 continued + EPIC-4)
**Goal:** Setup wizard and multiple layouts

| Story | Description | Points |
|-------|-------------|--------|
| 3.3 | First-Time Setup Wizard | 8 |
| 3.4 | Token Refresh | 5 |
| 4.1 | Overlay Layouts Table | 3 |
| 4.2 | Layout API Endpoints | 5 |
| 4.3 | Layout-Specific Overlay Routes | 5 |
| 4.4 | Layout Editor UI | 13 |
| 4.5 | Layout List Management | 5 |
| 4.6 | Seed Default Layout | 3 |

**Sprint Total:** 47 points

### Sprint 5: Polish (EPIC-5 + Combined Features)
**Goal:** Marketing ready, combined chat feature

| Story | Description | Points |
|-------|-------------|--------|
| 5.1 | Landing Page (multi-platform) | 8 |
| 5.2 | SEO & Meta Tags | 3 |
| 5.3 | Domain Configuration | 2 |
| NEW | Combined Chat Widget | 8 |
| NEW | Platform Selection UI | 5 |

**Sprint Total:** 26 points

---

## Story Status Key

| Status | Meaning |
|--------|---------|
| Draft | Story defined but not ready |
| Ready | Story ready for development |
| In Progress | Currently being worked on |
| Review | Code complete, in review |
| Done | Merged and tested |

---

## Files

- [Epic 1: Data Layer](./epic-1-data-layer.md)
- [Epic 1.5: Platform Adapter Layer](./epic-1.5-platform-adapter.md) ⭐ NEW
- [Epic 2: Routing](./epic-2-routing.md)
- [Epic 3: Authentication](./epic-3-authentication.md)
- [Epic 4: Multiple Layouts](./epic-4-multiple-layouts.md)
- [Epic 5: Marketing](./epic-5-marketing.md)

---

## Key Decisions

1. **Multi-Platform Support**: Kick + Twitch at launch, extensible for more

2. **Platform Adapter Pattern**: Interface-based abstraction for all platform operations

3. **URL Structure**:
   - Platform-specific: `/<platform>/<channel>/<endpoint>`
   - Unified admin: `/<streamer>/admin`

4. **Viewer Identity**: Separate per platform (`viewer@kick` vs `viewer@twitch`)

5. **Combined Features**: Optional merged chat for simulcasters

6. **Single Database**: One SQLite database with `streamer_id` + `platform` isolation

7. **Auth Strategy**: Platform OAuth only (Kick or Twitch), no passwords

8. **Security Level**: Bank-vault tenant isolation + platform isolation

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Streaming System Architecture                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Kick.com  │    │  Twitch.tv  │    │  YouTube    │          │
│  │   Webhooks  │    │  EventSub   │    │  (future)   │          │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘          │
│         │                  │                                     │
│         ▼                  ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Platform Adapter Layer                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │ KickAdapter │  │TwitchAdapter│  │ YTAdapter   │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Data Store Layer                       │    │
│  │  (Multi-tenant: streamer_id + platform isolation)        │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      SQLite DB                           │    │
│  │  streamers | platform_connections | viewers | points     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration failure | High | Backup before migration, rollback script |
| Twitch API complexity | Medium | Well-documented API, follow best practices |
| Platform rate limits | Medium | Implement per-platform rate limiting |
| Security breach | Critical | Multi-layer isolation tests, code review |
| Scope creep | Medium | Strict acceptance criteria, defer nice-to-haves |

---

## Platform Comparison

| Feature | Kick | Twitch |
|---------|------|--------|
| OAuth | OAuth 2.0 | OAuth 2.0 |
| Chat Events | Webhooks | EventSub / IRC |
| Follow Events | Webhooks | EventSub |
| Sub Events | Webhooks | EventSub |
| API Documentation | Limited | Extensive |
| Developer Portal | Basic | Comprehensive |
| Rate Limits | Unclear | Well documented |

---

*Generated for BMAD workflow*
*Last updated: 2025-12-07*
*Project pivoted to multi-platform support*
