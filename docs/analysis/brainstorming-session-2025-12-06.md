---
stepsCompleted: [1]
inputDocuments: ['docs/architecture.md']
session_topic: 'Code reorganization - splitting monolithic files into smaller modules'
session_goals: 'AI-friendly file sizes, better maintainability, easier issue targeting'
selected_approach: 'comprehensive-analysis'
techniques_used: []
ideas_generated: []
context_file: 'docs/architecture.md'
---

# Brainstorming Session Results

**Facilitator:** Butters
**Date:** 2025-12-06

## Session Overview

**Topic:** Code reorganization - splitting monolithic files into smaller, focused modules
**Goals:**
- Reduce file sizes (no 1000+ line files)
- AI-friendly structure (preserves context tokens)
- Better issue targeting and debugging
- Improved maintainability

### Context Guidance

Based on architecture analysis, the following files need attention:
- `index.ts` (~2,300 lines) - Server monolith
- `AdminPage.tsx` (~2,774 lines) - Massive component
- `DropGamePage.tsx` (~992 lines) - Physics + rendering mixed
- `ProfilePage.tsx` (~810 lines) - Multiple concerns
- `VoiceListPage.tsx` (~519 lines) - Has extractable hook
- `server/db/index.ts` (~677 lines) - Database queries
- `server/commands.ts` (~757 lines) - All chat commands

---

## Page Analysis Results

### File Size Summary (Lines of Code)

| File | Lines | Status | Action Needed |
|------|-------|--------|---------------|
| `AdminPage.tsx` | 2,774 | 🔴 Critical | Split into 8+ components |
| `DropGamePage.tsx` | 992 | 🔴 Critical | Extract physics, powerups |
| `ProfilePage.tsx` | 810 | 🟡 Warning | Extract sections, hooks |
| `VoiceListPage.tsx` | 519 | 🟡 Warning | Extract hook, VoiceCard |
| `ProfileLoginPage.tsx` | 265 | ✅ OK | Minor extractions |
| `OverlayPage.tsx` | 239 | ✅ OK | Clean |
| `CommandsPage.tsx` | 219 | ✅ OK | Clean |
| `DropGameRulesPage.tsx` | 211 | ✅ OK | Clean |
| `GoalsPage.tsx` | 48 | ✅ Good | No changes |
| `ChatPage.tsx` | 43 | ✅ Good | No changes |
| `HomePage.tsx` | 31 | ✅ Good | No changes |
| `NotFoundPage.tsx` | 16 | ✅ Good | No changes |

---

## Detailed Separation Recommendations

### 1. AdminPage.tsx (2,774 lines → ~8-10 files)

**Current Concerns Mixed:**
- Login form
- Settings management
- User management
- Drop game config
- Powerup config
- Theme customization
- Overlay layout editor
- Tips management
- Goals management

**Recommended Split:**

```
src/pages/admin/
├── AdminPage.tsx           # Main shell (~100 lines)
├── AdminLoginForm.tsx      # Login component (~80 lines)
├── tabs/
│   ├── SettingsTab.tsx     # General settings (~200 lines)
│   ├── UsersTab.tsx        # User management (~200 lines)
│   ├── DropGameTab.tsx     # Drop game config (~300 lines)
│   ├── PowerupsTab.tsx     # Powerup config (~200 lines)
│   ├── ThemeTab.tsx        # Theme customization (~300 lines)
│   ├── OverlayTab.tsx      # Layout editor (~400 lines)
│   ├── TipsTab.tsx         # Tips management (~150 lines)
│   └── GoalsTab.tsx        # Goals management (~150 lines)
├── hooks/
│   ├── useAdminAuth.ts     # Auth logic (~50 lines)
│   └── useAdminSettings.ts # Settings CRUD (~80 lines)
└── types.ts                # Admin-specific types (~50 lines)
```

### 2. DropGamePage.tsx (992 lines → ~5-6 files)

**Current Concerns Mixed:**
- Physics simulation (gravity, collision, bounce)
- Powerup logic (TNT, shield, magnet, ghost, boost)
- Confetti/explosion particle systems
- Dropper rendering
- Platform rendering
- Game state management
- API polling

**Recommended Split:**

```
src/pages/dropgame/
├── DropGamePage.tsx        # Main container (~150 lines)
├── components/
│   ├── Dropper.tsx         # Single dropper component (~100 lines)
│   ├── Platform.tsx        # Platform component (~50 lines)
│   ├── Confetti.tsx        # Confetti particles (~80 lines)
│   ├── Explosion.tsx       # Explosion particles (~80 lines)
│   └── PowerupAnnouncement.tsx  # Powerup UI (~50 lines)
├── hooks/
│   ├── useDropGamePhysics.ts    # Physics engine (~250 lines)
│   ├── useDropGamePowerups.ts   # Powerup logic (~150 lines)
│   ├── useDropGamePolling.ts    # API polling (~80 lines)
│   └── useParticles.ts          # Confetti/explosion (~100 lines)
├── types.ts                     # Game types (~50 lines)
└── constants.ts                 # Config defaults (~30 lines)
```

### 3. ProfilePage.tsx (810 lines → ~4-5 files)

**Current Concerns Mixed:**
- Verification flow UI
- Profile settings form
- Powerup shop
- Stats display
- Help section
- Country list data

**Recommended Split:**

```
src/pages/profile/
├── ProfilePage.tsx         # Main container (~100 lines)
├── components/
│   ├── VerificationFlow.tsx    # Verify UI (~150 lines)
│   ├── ProfileStats.tsx        # Stats cards (~80 lines)
│   ├── PowerupShop.tsx         # Shop UI (~200 lines)
│   ├── ProfileSettings.tsx     # Settings form (~200 lines)
│   └── ProfileHelp.tsx         # Help section (~80 lines)
├── hooks/
│   ├── useProfileVerification.ts  # Verify logic (~100 lines)
│   └── useProfileData.ts          # Data fetching (~80 lines)
└── data/
    └── countries.ts           # Country list (~60 lines)
```

### 4. VoiceListPage.tsx (519 lines → ~3 files)

**Current Concerns Mixed:**
- Voice card component
- Rate limiting hook
- Audio context primer
- Voice filtering/search

**Recommended Split:**

```
src/pages/voicelist/
├── VoiceListPage.tsx       # Main page (~200 lines)
├── components/
│   └── VoiceCard.tsx       # Voice card (~200 lines)
└── hooks/
    └── usePreviewRateLimit.ts  # Rate limiting (~80 lines)
```

Also move audio context primer to:
```
src/lib/audioContext.ts     # Shared audio utility (~30 lines)
```

---

## Shared Extractions (Cross-Page)

### Types to Centralize

```
src/types/
├── index.ts               # Re-exports
├── user.ts                # UserData, Voice, Powerup
├── dropgame.ts            # Dropper, DropConfig, etc.
├── overlay.ts             # OverlaySetting, LayoutConfig
└── api.ts                 # API response types
```

### Hooks to Extract

```
src/hooks/
├── usePolling.ts          # Generic polling hook
├── useSessionCookie.ts    # Cookie management
├── useCopyToClipboard.ts  # Copy functionality
└── useAudioContext.ts     # Audio primer
```

### Data Constants to Extract

```
src/data/
├── countries.ts           # Country list (from ProfilePage)
├── powerupEmojis.ts       # Powerup emoji map
└── defaultConfigs.ts      # Default configurations
```

---

## Server Files Analysis (Next Phase)

### index.ts (~2,300 lines)
**Should be split into:**
- `server/index.ts` - Entry point, server setup (~100 lines)
- `server/routes/` - Route handlers by domain
- `server/middleware/` - Auth, error handling
- `server/services/` - Business logic
- `server/state/` - In-memory state management

### server/commands.ts (~757 lines)
**Should be split into:**
- `server/commands/index.ts` - Registry
- `server/commands/tts.ts` - !say commands
- `server/commands/dropgame.ts` - !drop commands
- `server/commands/social.ts` - Social links
- `server/commands/utility.ts` - !help, !points, etc.

### server/db/index.ts (~677 lines)
**Should be split into:**
- `server/db/index.ts` - Connection setup
- `server/db/queries/users.ts`
- `server/db/queries/points.ts`
- `server/db/queries/powerups.ts`
- `server/db/queries/settings.ts`
- `server/db/queries/sessions.ts`

---

## Priority Order for Refactoring

1. **AdminPage.tsx** - Largest file, most concerns mixed
2. **DropGamePage.tsx** - Complex logic, physics engine
3. **index.ts (server)** - Backend monolith
4. **ProfilePage.tsx** - Multiple sections
5. **server/commands.ts** - Command handlers
6. **server/db/index.ts** - Database queries
7. **VoiceListPage.tsx** - Extractable hook
