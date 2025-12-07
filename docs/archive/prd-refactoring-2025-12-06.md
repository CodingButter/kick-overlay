---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - docs/index.md
  - docs/analysis/brainstorming-session-2025-12-06.md
  - docs/architecture.md
  - docs/api-reference.md
  - docs/database-schema.md
workflowType: 'prd'
lastStep: 3
project_name: 'kick-overlay'
user_name: 'Butters'
date: '2025-12-06'
project_type: 'web_app'
domain_complexity: 'low'
party_mode_used: true
---

# Product Requirements Document - kick-overlay

**Author:** Butters
**Date:** 2025-12-06
**Version:** 1.0

---

## 1. Executive Summary

### 1.1 Vision Statement
Transform the kick-overlay codebase from a collection of large monolithic files into a well-organized, modular architecture that enables efficient AI-assisted development and straightforward maintenance.

### 1.2 Problem Statement
The current kick-overlay codebase contains several files exceeding 1,000+ lines of code, mixing multiple concerns (UI, state, physics, API calls) in single files. This creates:
- **Context exhaustion** for AI coding agents working with large files
- **Debugging difficulty** when issues span multiple concerns
- **Maintenance burden** as changes ripple through unrelated code
- **Onboarding friction** for understanding system architecture

### 1.3 Target Users
| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Developer (Primary) | Butters - sole developer | AI-friendly file structure |
| AI Agents | BMAD agents, Claude | Focused modules under 300 lines |
| Future Contributors | Potential collaborators | Clear code organization |

### 1.4 Unique Value Proposition
An AI-optimized codebase structure where every module has a single responsibility, enabling AI agents to fully understand context without token exhaustion, and allowing precise issue targeting for debugging and feature development.

### 1.5 Project Classification
- **Type:** Web Application (Full-stack React + Bun)
- **Domain:** Internal Refactoring (Low Complexity)
- **Scope:** Codebase Reorganization (No new features)

---

## 2. Success Criteria

### 2.1 Primary Goal: Functionality Preservation
**All existing functionality must work identically after refactoring.**

| Verification | Criteria | Gate |
|--------------|----------|------|
| Build | `bun run build` passes with zero errors | ✅ Required |
| Server | All API routes respond correctly | ✅ Required |
| UI | All pages render and interact properly | ✅ Required |
| WebSocket | Real-time features work (chat, drops) | ✅ Required |

### 2.2 User Success (Developer Experience)
| Metric | Target | Measurement |
|--------|--------|-------------|
| File comprehension | Any file readable in single AI context | No file exceeds 300 lines |
| Bug isolation | Trace any bug to single module | Under 5 minutes to locate |
| Wayfinding | Find any feature by folder structure | 4 clicks max (src → domain → feature → file) |
| AI collaboration | Agents fully understand modules | Complete context in one read |

### 2.3 Technical Success
| Metric | Target | Measurement |
|--------|--------|-------------|
| File size | Max 300 lines per file | Enforced via review |
| Single responsibility | One concern per module | Hooks, components, types separated |
| Import depth | Clean dependency graph | Max 3 levels, no circular deps |
| Incremental commits | Each extraction is atomic | Verify after each commit |

### 2.4 Validation Test Case
**The Overlay Editor Refresh Bug** serves as proof-of-concept:
- Currently impossible to debug in 2,774-line AdminPage.tsx
- After refactoring: bug should be isolatable to specific module
- Success = can identify root cause within 5 minutes

### 2.5 Measurable Outcomes (Files to Refactor)

| File | Current | Target | Priority |
|------|---------|--------|----------|
| AdminPage.tsx | 2,774 lines | 8+ modules (<200 lines each) | 🔴 P1 |
| DropGamePage.tsx | 992 lines | 6 modules | 🔴 P1 |
| index.ts (server) | ~2,300 lines | routes/services/middleware | 🟡 P2 |
| ProfilePage.tsx | 810 lines | 5 modules | 🟡 P2 |
| commands.ts | 757 lines | command modules | 🟡 P2 |
| db/index.ts | 677 lines | query modules | 🟢 P3 |
| VoiceListPage.tsx | 519 lines | 3 modules | 🟢 P3 |

---

## 3. Product Scope

### 3.1 MVP - Phase 1 (Functionality Preservation)
**Goal:** Split files while ensuring nothing breaks.

**Frontend Priority:**
1. AdminPage.tsx → `src/pages/admin/` folder structure
   - AdminPage.tsx (shell, ~100 lines)
   - tabs/SettingsTab.tsx
   - tabs/UsersTab.tsx
   - tabs/DropGameTab.tsx
   - tabs/PowerupsTab.tsx
   - tabs/ThemeTab.tsx
   - tabs/OverlayTab.tsx (with hooks/useOverlayState.ts)
   - tabs/TipsTab.tsx
   - tabs/GoalsTab.tsx

2. DropGamePage.tsx → `src/pages/dropgame/` folder structure
   - DropGamePage.tsx (container)
   - hooks/useDropGamePhysics.ts
   - hooks/useDropGamePowerups.ts
   - hooks/useParticles.ts
   - components/Dropper.tsx
   - components/Platform.tsx

**Shared Extractions:**
- `src/types/` - Centralized type definitions
- `src/hooks/` - Shared hooks (usePolling, useSessionCookie)

### 3.2 Phase 2 (Server Refactoring)
- index.ts → routes/, services/, middleware/
- commands.ts → commands/ folder by category
- db/index.ts → db/queries/ by domain

### 3.3 Phase 3 (Remaining Pages)
- ProfilePage.tsx modularization
- VoiceListPage.tsx extraction

### 3.4 Phase 4 (Future Consideration)
- **Bun Workspace Migration** - Separate frontend/backend into packages with shared types
  - Evaluate after Phase 1-3 complete and stable
  - Higher complexity change, requires stable foundation first

### 3.5 Out of Scope (Post-Refactor)
- Bug fixes (including overlay refresh bug)
- Performance optimization
- New features
- Test coverage improvements

---

## 4. Refactoring Protocol

### 4.1 Per-File Checklist
For each file extraction:
- [ ] Extract module to new file
- [ ] Update imports in original file
- [ ] Verify build passes (`bun run build`)
- [ ] Test affected functionality manually
- [ ] Commit with descriptive message
- [ ] Move to next extraction

### 4.2 Verification Commands
```bash
# After each extraction
bun run build          # Must pass
bun run dev            # Start server, test manually
```

### 4.3 Commit Strategy
- One commit per logical extraction
- Message format: `refactor(scope): extract ComponentName to own file`
- Never commit broken state
