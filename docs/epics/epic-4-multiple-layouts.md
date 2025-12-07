# Epic 4: Multiple Overlay Layouts

**Epic ID:** EPIC-4
**Priority:** P1 - High
**Status:** Draft
**Estimated Effort:** Medium

---

## Epic Description

Enable streamers to create multiple overlay layouts, each with a unique URL that can be used in different OBS scenes. This was the original feature request that triggered the SaaS pivot.

## Business Value

- Streamers can have different layouts for different scenes (gaming, chatting, BRB)
- Each layout gets a shareable URL
- Reduces need to manually switch overlay elements in OBS
- Professional-level overlay customization

## Dependencies

- EPIC-1: Data Layer (overlay_layouts table)
- EPIC-2: Routing (layout URLs)
- EPIC-3: Authentication (admin access for layout editing)

## Acceptance Criteria

1. Streamers can create multiple named layouts
2. Each layout has unique URL: `/<channel>/overlay/<layout-id>`
3. One layout marked as default (served at `/<channel>/overlay`)
4. Layout editor allows widget arrangement
5. Layouts can be duplicated, renamed, deleted
6. Preview mode before publishing

---

## Stories

### Story 4.1: Overlay Layouts Table

**Story ID:** STORY-4.1
**Points:** 3
**Priority:** P0

#### Description
Create database table and DataStore methods for overlay layouts.

#### Acceptance Criteria
- [ ] `overlay_layouts` table created
- [ ] Fields: id, streamer_id, name, layout_data (JSON), is_default, created_at, updated_at
- [ ] Composite primary key (id, streamer_id)
- [ ] DataStore methods for CRUD operations
- [ ] Default layout created for new streamers

#### Technical Notes
```sql
CREATE TABLE overlay_layouts (
  id TEXT NOT NULL,
  streamer_id INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_data TEXT NOT NULL, -- JSON grid configuration
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id, streamer_id)
);
```

#### Files to Modify
- `server/db/schema.sql`
- `server/data/interface.ts`
- `server/data/sqlite.ts`

---

### Story 4.2: Layout API Endpoints

**Story ID:** STORY-4.2
**Points:** 5
**Priority:** P0

#### Description
Create API endpoints for layout management.

#### Acceptance Criteria
- [ ] `GET /<channel>/api/layouts` - List all layouts
- [ ] `GET /<channel>/api/layouts/:id` - Get specific layout
- [ ] `POST /<channel>/api/admin/layouts` - Create layout (auth required)
- [ ] `PUT /<channel>/api/admin/layouts/:id` - Update layout (auth required)
- [ ] `DELETE /<channel>/api/admin/layouts/:id` - Delete layout (auth required)
- [ ] `POST /<channel>/api/admin/layouts/:id/default` - Set as default (auth required)

#### Technical Notes
```typescript
// Public endpoint - anyone can fetch layout for display
GET /<channel>/api/layouts/main
Response: { id: "main", name: "Main Layout", layout_data: {...} }

// Admin endpoint - requires auth
POST /<channel>/api/admin/layouts
Body: { name: "Compact", layout_data: {...} }
Response: { id: "compact", ... }
```

#### Files to Create
- `server/routes/layouts.ts`

---

### Story 4.3: Layout-Specific Overlay Routes

**Story ID:** STORY-4.3
**Points:** 5
**Priority:** P0

#### Description
Update overlay page to support layout-specific URLs.

#### Acceptance Criteria
- [ ] `/<channel>/overlay` serves default layout
- [ ] `/<channel>/overlay/<layout-id>` serves specific layout
- [ ] Invalid layout ID returns 404
- [ ] Layout data fetched based on URL
- [ ] OverlayRenderer receives correct layout config

#### Technical Notes
```typescript
// React Router
<Route path="overlay" element={<OverlayPage />} />
<Route path="overlay/:layoutId" element={<OverlayPage />} />

// OverlayPage component
function OverlayPage() {
  const { layoutId } = useParams();
  const { channel } = useChannelContext();

  // Fetch layout
  const layout = useQuery(['layout', channel, layoutId || 'default'], () =>
    layoutId
      ? api.getLayout(layoutId)
      : api.getDefaultLayout()
  );

  return <OverlayRenderer layout={layout.data} />;
}
```

#### Files to Modify
- `src/pages/OverlayPage.tsx`
- `src/App.tsx`

---

### Story 4.4: Layout Editor UI

**Story ID:** STORY-4.4
**Points:** 13
**Priority:** P1

#### Description
Create the layout editor interface in the admin dashboard.

#### Acceptance Criteria
- [ ] Grid-based layout preview
- [ ] Drag-and-drop widget placement
- [ ] Widget palette (Chat, Goals, Tips, Events, Chroma, Empty)
- [ ] Grid size configuration (rows x columns)
- [ ] Dimension configuration (width x height)
- [ ] Save/cancel buttons
- [ ] Preview in new tab button
- [ ] Unsaved changes warning

#### Technical Notes
```typescript
// Layout data structure
interface LayoutData {
  dimensions: { width: number; height: number };
  grid: { rows: number; columns: number };
  widgets: Array<{
    type: 'chat' | 'goals' | 'tips' | 'events' | 'chroma' | 'empty';
    gridArea: { row: number; col: number; rowSpan: number; colSpan: number };
    config?: Record<string, any>;
  }>;
}
```

#### Files to Create/Modify
- `src/pages/AdminPage.tsx` (add layouts section)
- `src/components/admin/LayoutEditor.tsx` (new)
- `src/components/admin/WidgetPalette.tsx` (new)
- `src/components/admin/LayoutPreview.tsx` (new)

---

### Story 4.5: Layout List Management

**Story ID:** STORY-4.5
**Points:** 5
**Priority:** P1

#### Description
Create UI for listing, creating, and managing layouts.

#### Acceptance Criteria
- [ ] List all layouts with name and URL
- [ ] Create new layout button
- [ ] Duplicate layout action
- [ ] Rename layout action
- [ ] Delete layout (with confirmation)
- [ ] Set as default action
- [ ] Copy URL to clipboard button
- [ ] Visual indicator for default layout

#### Technical Notes
```
┌─────────────────────────────────────────────────────────────────────┐
│ ★ Main Layout (default)                                             │
│   URL: /codingbutter/overlay                                        │
│   [Edit] [Duplicate] [Copy URL]                                     │
├─────────────────────────────────────────────────────────────────────┤
│   Compact Layout                                                    │
│   URL: /codingbutter/overlay/compact                                │
│   [Edit] [Duplicate] [Set Default] [Copy URL] [Delete]              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Files to Create
- `src/components/admin/LayoutList.tsx`

---

### Story 4.6: Seed Default Layout

**Story ID:** STORY-4.6
**Points:** 3
**Priority:** P0

#### Description
Create default layout for new streamers and migrate existing layout data.

#### Acceptance Criteria
- [ ] Default layout seeded when streamer created
- [ ] Existing overlay_settings layout data migrated
- [ ] Default matches current production layout
- [ ] Migration script handles existing streamers

#### Technical Notes
```typescript
// Default layout for new streamers
const DEFAULT_LAYOUT: LayoutData = {
  dimensions: { width: 1920, height: 1080 },
  grid: { rows: 3, columns: 4 },
  widgets: [
    { type: 'chat', gridArea: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
    { type: 'goals', gridArea: { row: 0, col: 2, rowSpan: 1, colSpan: 1 } },
    { type: 'tips', gridArea: { row: 1, col: 2, rowSpan: 1, colSpan: 1 } },
    { type: 'events', gridArea: { row: 2, col: 3, rowSpan: 1, colSpan: 1 } },
    { type: 'chroma', gridArea: { row: 2, col: 0, rowSpan: 1, colSpan: 3 } },
    { type: 'empty', gridArea: { row: 0, col: 3, rowSpan: 2, colSpan: 1 } },
  ],
};
```

#### Files to Modify
- `server/db/index.ts` (seed function)
- `server/data/sqlite.ts` (createStreamer includes layout)

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] Multiple layouts can be created and edited
- [ ] Layout URLs work correctly
- [ ] Default layout serves at base URL
- [ ] Existing layouts migrated
- [ ] All tests passing
- [ ] Documentation updated
