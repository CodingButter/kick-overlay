# Overlay Layout Editor - Implementation Plan

## Overview
Build a visual grid-based layout editor that allows users to dynamically position and resize overlay components through an admin interface.

---

## Phase 1: Data Model & Backend

### 1.1 Layout Configuration Schema
Store in `overlay_settings` table with key `overlay_layout_config`:

```typescript
interface OverlayLayoutConfig {
  // Canvas dimensions (fixed at 1920x1080 for OBS)
  width: 1920;
  height: 1080;

  // Grid configuration
  grid: {
    rows: number;      // e.g., 12
    columns: number;   // e.g., 16
    gap: number;       // px between cells, e.g., 16
    padding: number;   // px padding around entire grid, e.g., 16
  };

  // Placed components
  components: OverlayComponentPlacement[];
}

interface OverlayComponentPlacement {
  id: string;                    // Unique instance ID (uuid)
  type: OverlayComponentType;    // Component type
  gridPosition: {
    row: number;      // 0-indexed start row
    column: number;   // 0-indexed start column
    rowSpan: number;  // How many rows it spans
    colSpan: number;  // How many columns it spans
  };
  settings?: Record<string, any>; // Component-specific settings
}

type OverlayComponentType =
  | 'goals'           // Channel goals progress bars
  | 'chat'            // Live chat display
  | 'events'          // Latest event notifications
  | 'tips'            // Rotating tips carousel
  | 'chroma'          // Empty chroma key placeholder
  | 'empty'           // Empty with background color
  | 'camera'          // Camera frame placeholder (chroma)
  | 'vscode'          // VS Code window placeholder (chroma)
  | 'music';          // Music player placeholder (chroma)
```

### 1.2 Add Chroma Key Color to Theme
Extend `ThemeConfig` interface:

```typescript
interface ThemeConfig {
  // ... existing fields ...
  chromaKeyColor: string;  // Default: '#FF00FF' (magenta)
}
```

### 1.3 API Endpoints
Add to `index.ts`:

```
GET  /api/overlay/layout     - Get current layout config (public, for overlay page)
GET  /api/admin/overlay/layout - Get layout config (admin)
PUT  /api/admin/overlay/layout - Save layout config (admin)
```

---

## Phase 2: Overlay Component Library

### 2.1 Extract Components from OverlayPage
Create `src/components/overlay/` directory:

| File | Component | Purpose |
|------|-----------|---------|
| `GoalsWidget.tsx` | `<GoalsWidget />` | Channel goals with progress bars |
| `ChatWidget.tsx` | `<ChatWidget />` | Live chat messages display |
| `EventsWidget.tsx` | `<EventsWidget />` | Latest event notification |
| `TipsWidget.tsx` | `<TipsWidget />` | Rotating tips carousel |
| `ChromaPlaceholder.tsx` | `<ChromaPlaceholder />` | Chroma key colored box |
| `EmptyPlaceholder.tsx` | `<EmptyPlaceholder />` | Background-colored empty box |
| `index.ts` | Component registry | Export all + metadata |

### 2.2 Component Registry
```typescript
// src/components/overlay/index.ts
export const OVERLAY_COMPONENTS: Record<OverlayComponentType, {
  component: React.FC<OverlayWidgetProps>;
  label: string;
  icon: string;  // Emoji for UI
  description: string;
  defaultSize: { rowSpan: number; colSpan: number };
  minSize: { rowSpan: number; colSpan: number };
  isChroma: boolean;  // Uses chroma key color
}> = {
  goals: {
    component: GoalsWidget,
    label: 'Goals',
    icon: '🎯',
    description: 'Channel follower/subscriber goals',
    defaultSize: { rowSpan: 2, colSpan: 4 },
    minSize: { rowSpan: 1, colSpan: 2 },
    isChroma: false,
  },
  chat: {
    component: ChatWidget,
    label: 'Chat',
    icon: '💬',
    description: 'Live chat messages',
    defaultSize: { rowSpan: 6, colSpan: 4 },
    minSize: { rowSpan: 3, colSpan: 2 },
    isChroma: false,
  },
  events: {
    component: EventsWidget,
    label: 'Events',
    icon: '🔔',
    description: 'Latest follow/sub/gift events',
    defaultSize: { rowSpan: 1, colSpan: 4 },
    minSize: { rowSpan: 1, colSpan: 2 },
    isChroma: false,
  },
  tips: {
    component: TipsWidget,
    label: 'Tips',
    icon: '💡',
    description: 'Rotating tips carousel',
    defaultSize: { rowSpan: 1, colSpan: 16 },
    minSize: { rowSpan: 1, colSpan: 4 },
    isChroma: false,
  },
  chroma: {
    component: ChromaPlaceholder,
    label: 'Chroma Key',
    icon: '🟣',
    description: 'Transparent area for OBS',
    defaultSize: { rowSpan: 4, colSpan: 8 },
    minSize: { rowSpan: 1, colSpan: 1 },
    isChroma: true,
  },
  empty: {
    component: EmptyPlaceholder,
    label: 'Empty',
    icon: '⬛',
    description: 'Background-colored spacer',
    defaultSize: { rowSpan: 2, colSpan: 2 },
    minSize: { rowSpan: 1, colSpan: 1 },
    isChroma: false,
  },
  camera: {
    component: ChromaPlaceholder,
    label: 'Camera',
    icon: '📷',
    description: 'Camera frame placeholder',
    defaultSize: { rowSpan: 3, colSpan: 4 },
    minSize: { rowSpan: 2, colSpan: 2 },
    isChroma: true,
  },
  vscode: {
    component: ChromaPlaceholder,
    label: 'VS Code',
    icon: '💻',
    description: 'Code editor window',
    defaultSize: { rowSpan: 8, colSpan: 10 },
    minSize: { rowSpan: 4, colSpan: 6 },
    isChroma: true,
  },
  music: {
    component: ChromaPlaceholder,
    label: 'Music',
    icon: '🎵',
    description: 'Music player frame',
    defaultSize: { rowSpan: 3, colSpan: 3 },
    minSize: { rowSpan: 2, colSpan: 2 },
    isChroma: true,
  },
};
```

### 2.3 Widget Props Interface
```typescript
interface OverlayWidgetProps {
  width: number;   // Calculated pixel width
  height: number;  // Calculated pixel height
  settings?: Record<string, any>;
}
```

---

## Phase 3: Admin Layout Editor

### 3.1 Add "Overlay" Tab to Admin
Update `AdminPage.tsx` tabs array:
```typescript
{ id: 'overlay' as const, label: 'Overlay', icon: Layout }
```

### 3.2 OverlayTab Component Structure
Create `src/pages/admin/OverlayTab.tsx`:

```
OverlayTab
├── Header (Grid Settings + Save button)
├── GridSettingsPanel
│   ├── Rows input (1-20)
│   ├── Columns input (1-24)
│   ├── Gap slider (0-32px)
│   └── Padding slider (0-32px)
├── ComponentPalette
│   └── Draggable component buttons
├── LayoutPreview (scaled 1920x1080 canvas)
│   ├── Grid overlay
│   └── Placed components (draggable/resizable)
└── ComponentInspector (selected component settings)
```

### 3.3 Grid Editor Features

#### Component Palette
- List of available components with icons
- Click to add to first available grid position
- Drag onto grid preview to place

#### Grid Preview (scaled)
- Show 1920x1080 canvas scaled to fit (e.g., 50% = 960x540)
- Draw grid lines
- Render placed components at their positions
- Visual feedback for valid/invalid placements

#### Component Interaction
- **Click**: Select component, show inspector
- **Drag**: Move to new grid position
- **Resize handles**: Drag corners to change span
- **Delete**: Button in inspector or press Delete key

#### Collision Detection
- Prevent overlapping components
- Highlight invalid positions in red

### 3.4 State Management
```typescript
interface LayoutEditorState {
  config: OverlayLayoutConfig;
  selectedComponentId: string | null;
  isDragging: boolean;
  draggedType: OverlayComponentType | null;
  previewScale: number;
}
```

---

## Phase 4: Dynamic Overlay Renderer

### 4.1 Refactor OverlayPage
Replace hardcoded layout with dynamic renderer:

```typescript
export function OverlayPage() {
  const [layout, setLayout] = useState<OverlayLayoutConfig | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetch('/api/overlay/layout')
      .then(res => res.json())
      .then(setLayout);
  }, []);

  if (!layout) return <LoadingScreen />;

  return (
    <OverlayRenderer layout={layout} theme={theme} />
  );
}
```

### 4.2 OverlayRenderer Component
```typescript
function OverlayRenderer({ layout, theme }: { layout: OverlayLayoutConfig; theme: ThemeConfig }) {
  const { grid, components } = layout;

  // Calculate cell dimensions
  const cellWidth = (layout.width - grid.padding * 2 - grid.gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (layout.height - grid.padding * 2 - grid.gap * (grid.rows - 1)) / grid.rows;

  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        backgroundColor: theme.darkMode.background,
        position: 'relative',
        padding: grid.padding,
      }}
    >
      {components.map(placement => {
        const ComponentDef = OVERLAY_COMPONENTS[placement.type];
        const Component = ComponentDef.component;

        const x = grid.padding + placement.gridPosition.column * (cellWidth + grid.gap);
        const y = grid.padding + placement.gridPosition.row * (cellHeight + grid.gap);
        const width = placement.gridPosition.colSpan * cellWidth + (placement.gridPosition.colSpan - 1) * grid.gap;
        const height = placement.gridPosition.rowSpan * cellHeight + (placement.gridPosition.rowSpan - 1) * grid.gap;

        return (
          <div
            key={placement.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width,
              height,
            }}
          >
            <Component
              width={width}
              height={height}
              settings={placement.settings}
            />
          </div>
        );
      })}
    </div>
  );
}
```

---

## Phase 5: Theme Integration

### 5.1 Update ThemeConfig
Add to `src/context/ThemeContext.tsx`:
```typescript
interface ThemeConfig {
  // ... existing ...
  chromaKeyColor: string;
}

const DEFAULT_THEME: ThemeConfig = {
  // ... existing ...
  chromaKeyColor: '#FF00FF',
};
```

### 5.2 Update Theme API
Modify `index.ts` theme handlers to include new field.

### 5.3 Update ThemeTab
Add chroma key color picker to admin theme settings.

---

## Implementation Order

### Step 1: Backend Setup
1. Add `chromaKeyColor` to ThemeConfig
2. Create default layout config
3. Add layout API endpoints

### Step 2: Component Extraction
1. Create `src/components/overlay/` directory
2. Extract GoalsWidget from OverlayPage
3. Extract ChatWidget from OverlayPage
4. Extract EventsWidget from OverlayPage
5. Extract TipsWidget from OverlayPage
6. Create ChromaPlaceholder component
7. Create EmptyPlaceholder component
8. Create component registry

### Step 3: Admin Editor (Basic)
1. Add Overlay tab to AdminPage
2. Create GridSettingsPanel
3. Create scaled LayoutPreview (display only)
4. Add component placement via click

### Step 4: Admin Editor (Interactive)
1. Add drag-to-place from palette
2. Add drag-to-move placed components
3. Add resize handles
4. Add collision detection
5. Add delete functionality
6. Add component inspector

### Step 5: Dynamic Renderer
1. Create OverlayRenderer component
2. Refactor OverlayPage to use renderer
3. Test with saved layouts

### Step 6: Polish
1. Add preset layouts (default, minimal, expanded)
2. Add reset to default button
3. Add live preview toggle
4. Test in OBS

---

## File Changes Summary

### New Files
- `src/components/overlay/GoalsWidget.tsx`
- `src/components/overlay/ChatWidget.tsx`
- `src/components/overlay/EventsWidget.tsx`
- `src/components/overlay/TipsWidget.tsx`
- `src/components/overlay/ChromaPlaceholder.tsx`
- `src/components/overlay/EmptyPlaceholder.tsx`
- `src/components/overlay/index.ts`
- `src/components/overlay/OverlayRenderer.tsx`
- `src/pages/admin/OverlayTab.tsx` (or inline in AdminPage)

### Modified Files
- `src/context/ThemeContext.tsx` - Add chromaKeyColor
- `src/pages/AdminPage.tsx` - Add Overlay tab
- `src/pages/OverlayPage.tsx` - Use dynamic renderer
- `index.ts` - Add layout API endpoints

---

## Default Layout Config
```json
{
  "width": 1920,
  "height": 1080,
  "grid": {
    "rows": 12,
    "columns": 16,
    "gap": 16,
    "padding": 16
  },
  "components": [
    {
      "id": "vscode-main",
      "type": "vscode",
      "gridPosition": { "row": 0, "column": 0, "rowSpan": 8, "colSpan": 10 }
    },
    {
      "id": "goals-sidebar",
      "type": "goals",
      "gridPosition": { "row": 0, "column": 10, "rowSpan": 2, "colSpan": 6 }
    },
    {
      "id": "events-sidebar",
      "type": "events",
      "gridPosition": { "row": 2, "column": 10, "rowSpan": 1, "colSpan": 6 }
    },
    {
      "id": "chat-sidebar",
      "type": "chat",
      "gridPosition": { "row": 3, "column": 10, "rowSpan": 5, "colSpan": 6 }
    },
    {
      "id": "camera-bottom",
      "type": "camera",
      "gridPosition": { "row": 8, "column": 12, "rowSpan": 3, "colSpan": 4 }
    },
    {
      "id": "tips-bottom",
      "type": "tips",
      "gridPosition": { "row": 11, "column": 0, "rowSpan": 1, "colSpan": 16 }
    }
  ]
}
```
