import { queries } from '../db';

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

let dropGameConfig: DropGameConfig | null = null;

export const DEFAULT_DROPGAME_CONFIG: DropGameConfig = {
  game: {
    platformWidthRatio: 0.125,
    avatarSize: 60,
    cleanupDelay: 10000,
    gravity: 5,
    bounceDamping: 0.85,
    minHorizontalVelocity: 100,
    maxHorizontalVelocity: 500,
    horizontalDrift: 100,
    usernameFontSize: 24,
  },
  scoring: {
    basePoints: 10,
    centerBonusPoints: 100,
  },
  physics: {
    explosionRadius: 2000,
    explosionForce: 1500,
    explosionUpwardBoost: 400,
    ghostDuration: 5000,
    boostDuration: 3000,
    powerDropGravityMultiplier: 3,
  },
  powerups: {},
};

export async function loadDropGameConfig(): Promise<DropGameConfig> {
  if (dropGameConfig) return dropGameConfig;
  try {
    const setting = queries.getOverlaySetting.get('dropgame_config');
    if (setting) {
      dropGameConfig = JSON.parse(setting.value);
      console.log('Loaded drop game config from database');
      return dropGameConfig!;
    }
  } catch (error) {
    console.error('Error loading drop game config:', error);
  }
  dropGameConfig = { ...DEFAULT_DROPGAME_CONFIG };
  queries.upsertOverlaySetting.run('dropgame_config', JSON.stringify(dropGameConfig), 'Drop game physics and scoring configuration');
  console.log('Initialized default drop game config in database');
  return dropGameConfig;
}

export function saveDropGameConfig(config: DropGameConfig): void {
  try {
    queries.upsertOverlaySetting.run('dropgame_config', JSON.stringify(config), 'Drop game physics and scoring configuration');
    dropGameConfig = config;
    console.log('Saved drop game config to database');
  } catch (error) {
    console.error('Error saving drop game config:', error);
  }
}

export function getDropGameConfig(): DropGameConfig | null {
  return dropGameConfig;
}
