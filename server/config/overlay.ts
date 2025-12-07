import { queries } from '../db';

export type OverlayComponentType = 'goals' | 'chat' | 'events' | 'tips' | 'chroma' | 'empty';

export interface OverlayComponentPlacement {
  id: string;
  type: OverlayComponentType;
  gridPosition: {
    row: number;
    column: number;
    rowSpan: number;
    colSpan: number;
  };
  settings?: Record<string, any>;
}

export interface OverlayLayoutConfig {
  width: number;
  height: number;
  grid: {
    rows: number;
    columns: number;
    gap: number;
    padding: number;
  };
  components: OverlayComponentPlacement[];
}

let overlayLayoutConfig: OverlayLayoutConfig | null = null;

export const DEFAULT_OVERLAY_LAYOUT: OverlayLayoutConfig = {
  width: 1920,
  height: 1080,
  grid: {
    rows: 12,
    columns: 16,
    gap: 16,
    padding: 16,
  },
  components: [
    {
      id: 'chroma-main',
      type: 'chroma',
      gridPosition: { row: 0, column: 0, rowSpan: 8, colSpan: 10 },
      settings: { label: 'VS Code' },
    },
    {
      id: 'goals-sidebar',
      type: 'goals',
      gridPosition: { row: 0, column: 10, rowSpan: 2, colSpan: 6 },
    },
    {
      id: 'events-sidebar',
      type: 'events',
      gridPosition: { row: 2, column: 10, rowSpan: 1, colSpan: 6 },
    },
    {
      id: 'chat-sidebar',
      type: 'chat',
      gridPosition: { row: 3, column: 10, rowSpan: 5, colSpan: 6 },
    },
    {
      id: 'chroma-camera',
      type: 'chroma',
      gridPosition: { row: 8, column: 12, rowSpan: 3, colSpan: 4 },
      settings: { label: 'Camera' },
    },
    {
      id: 'tips-bottom',
      type: 'tips',
      gridPosition: { row: 11, column: 0, rowSpan: 1, colSpan: 16 },
    },
  ],
};

export function loadOverlayLayout(): OverlayLayoutConfig {
  if (overlayLayoutConfig) return overlayLayoutConfig;
  try {
    const setting = queries.getOverlaySetting.get('overlay_layout_config');
    if (setting) {
      overlayLayoutConfig = JSON.parse(setting.value);
      console.log('Loaded overlay layout from database');
      return overlayLayoutConfig!;
    }
  } catch (error) {
    console.error('Error loading overlay layout:', error);
  }
  overlayLayoutConfig = { ...DEFAULT_OVERLAY_LAYOUT };
  queries.upsertOverlaySetting.run('overlay_layout_config', JSON.stringify(overlayLayoutConfig), 'Overlay visual layout configuration');
  console.log('Initialized default overlay layout in database');
  return overlayLayoutConfig;
}

export function saveOverlayLayout(config: OverlayLayoutConfig): void {
  try {
    queries.upsertOverlaySetting.run('overlay_layout_config', JSON.stringify(config), 'Overlay visual layout configuration');
    overlayLayoutConfig = config;
    console.log('Saved overlay layout to database');
  } catch (error) {
    console.error('Error saving overlay layout:', error);
  }
}

export function getOverlayLayoutConfig(): OverlayLayoutConfig | null {
  return overlayLayoutConfig;
}
