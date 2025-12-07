export interface OverlaySetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface PowerupConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
  variables: Record<string, any>;
  enabled: number;
}

export interface DropGameConfig {
  game: {
    platformWidthRatio: number;
    avatarSize: number;
    cleanupDelay: number;
    gravity: number;
    bounceDamping: number;
    minHorizontalVelocity: number;
    maxHorizontalVelocity: number;
    horizontalDrift: number;
    usernameFontSize: number;
  };
  scoring: {
    basePoints: number;
    centerBonusPoints: number;
  };
  physics: {
    explosionRadius: number;
    explosionForce: number;
    explosionUpwardBoost: number;
    ghostDuration: number;
    boostDuration: number;
    powerDropGravityMultiplier: number;
  };
  powerups: Record<string, { cost: number; description: string }>;
}

export interface SettingMeta {
  type: 'boolean' | 'number' | 'string' | 'path';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export type AdminTab = 'settings' | 'powerups' | 'dropgame' | 'users' | 'theme' | 'overlay';

export interface UserData {
  id: number;
  username: string;
  voice_id: string | null;
  drop_image: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  channel_points: number;
  drop_points: number;
  total_drops: number;
}

export interface DropGameFieldMeta {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  useSlider?: boolean;
}

export const GAME_FIELDS: DropGameFieldMeta[] = [
  { key: 'gravity', label: 'Gravity', description: 'Fall speed multiplier', min: 1, max: 20, step: 0.5, useSlider: true },
  { key: 'bounceDamping', label: 'Bounce Damping', description: 'Energy retained on bounce', min: 0, max: 1, step: 0.05, useSlider: true },
  { key: 'platformWidthRatio', label: 'Platform Width', description: 'Platform width as screen ratio', min: 0.05, max: 0.5, step: 0.01, useSlider: true },
  { key: 'avatarSize', label: 'Avatar Size', description: 'Size of player avatars', min: 30, max: 120, step: 5, unit: 'px', useSlider: true },
  { key: 'usernameFontSize', label: 'Username Font Size', description: 'Font size for usernames', min: 12, max: 36, step: 1, unit: 'px', useSlider: true },
  { key: 'minHorizontalVelocity', label: 'Min Horizontal Speed', description: 'Minimum horizontal movement', min: 0, max: 500, step: 10, unit: 'px/s' },
  { key: 'maxHorizontalVelocity', label: 'Max Horizontal Speed', description: 'Maximum horizontal movement', min: 100, max: 1000, step: 25, unit: 'px/s' },
  { key: 'horizontalDrift', label: 'Horizontal Drift', description: 'Random drift during fall', min: 0, max: 300, step: 10, unit: 'px' },
  { key: 'cleanupDelay', label: 'Cleanup Delay', description: 'Time before removing landed players', min: 1000, max: 30000, step: 1000, unit: 'ms' },
];

export const SCORING_FIELDS: DropGameFieldMeta[] = [
  { key: 'basePoints', label: 'Base Points', description: 'Minimum points for landing', min: 1, max: 100, step: 5, unit: 'pts', useSlider: true },
  { key: 'centerBonusPoints', label: 'Center Bonus', description: 'Extra points for perfect landing', min: 0, max: 500, step: 10, unit: 'pts', useSlider: true },
];

export const PHYSICS_FIELDS: DropGameFieldMeta[] = [
  { key: 'explosionRadius', label: 'TNT Explosion Radius', description: 'Range of explosion effect', min: 500, max: 5000, step: 100, unit: 'px', useSlider: true },
  { key: 'explosionForce', label: 'TNT Explosion Force', description: 'Push strength of explosion', min: 500, max: 3000, step: 100, useSlider: true },
  { key: 'explosionUpwardBoost', label: 'TNT Upward Boost', description: 'Upward force from explosion', min: 0, max: 1000, step: 50, useSlider: true },
  { key: 'ghostDuration', label: 'Ghost Duration', description: 'How long ghost mode lasts', min: 1000, max: 15000, step: 500, unit: 'ms', useSlider: true },
  { key: 'boostDuration', label: 'Speed Boost Duration', description: 'How long speed boost lasts', min: 1000, max: 10000, step: 500, unit: 'ms', useSlider: true },
  { key: 'powerDropGravityMultiplier', label: 'Power Drop Gravity', description: 'Gravity multiplier for power drop', min: 1, max: 10, step: 0.5, unit: 'x', useSlider: true },
];
