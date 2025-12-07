import type { FC } from 'react';
import type { OverlayComponentType, OverlayWidgetProps, OverlayComponentMeta } from './types';

// Widget components
import { GoalsWidget } from './GoalsWidget';
import { ChatWidget } from './ChatWidget';
import { EventsWidget } from './EventsWidget';
import { TipsWidget } from './TipsWidget';
import { ChromaPlaceholder } from './ChromaPlaceholder';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { OverlayRenderer } from './OverlayRenderer';

// Export all types
export * from './types';

// Export all widget components
export { GoalsWidget, ChatWidget, EventsWidget, TipsWidget, ChromaPlaceholder, EmptyPlaceholder, OverlayRenderer };

// Component registry with metadata
export const OVERLAY_COMPONENTS: Record<
  OverlayComponentType,
  {
    component: FC<OverlayWidgetProps>;
    meta: OverlayComponentMeta;
  }
> = {
  goals: {
    component: GoalsWidget,
    meta: {
      label: 'Goals',
      icon: '🎯',
      description: 'Channel follower/subscriber goals',
      defaultSize: { rowSpan: 2, colSpan: 4 },
      minSize: { rowSpan: 1, colSpan: 2 },
      isChroma: false,
    },
  },
  chat: {
    component: ChatWidget,
    meta: {
      label: 'Chat',
      icon: '💬',
      description: 'Live chat messages',
      defaultSize: { rowSpan: 6, colSpan: 4 },
      minSize: { rowSpan: 3, colSpan: 2 },
      isChroma: false,
    },
  },
  events: {
    component: EventsWidget,
    meta: {
      label: 'Events',
      icon: '🔔',
      description: 'Latest follow/sub/gift events',
      defaultSize: { rowSpan: 1, colSpan: 4 },
      minSize: { rowSpan: 1, colSpan: 2 },
      isChroma: false,
    },
  },
  tips: {
    component: TipsWidget,
    meta: {
      label: 'Tips',
      icon: '💡',
      description: 'Rotating tips carousel',
      defaultSize: { rowSpan: 1, colSpan: 16 },
      minSize: { rowSpan: 1, colSpan: 4 },
      isChroma: false,
    },
  },
  chroma: {
    component: ChromaPlaceholder,
    meta: {
      label: 'Chroma Key',
      icon: '🟣',
      description: 'Transparent chroma key area for OBS (set custom label in settings)',
      defaultSize: { rowSpan: 4, colSpan: 8 },
      minSize: { rowSpan: 1, colSpan: 1 },
      isChroma: true,
    },
  },
  empty: {
    component: EmptyPlaceholder,
    meta: {
      label: 'Spacer',
      icon: '⬛',
      description: 'Background-colored spacer',
      defaultSize: { rowSpan: 2, colSpan: 2 },
      minSize: { rowSpan: 1, colSpan: 1 },
      isChroma: false,
    },
  },
};

// Helper function to get all component types
export function getComponentTypes(): OverlayComponentType[] {
  return Object.keys(OVERLAY_COMPONENTS) as OverlayComponentType[];
}

// Helper function to get component by type
export function getComponent(type: OverlayComponentType) {
  return OVERLAY_COMPONENTS[type];
}
