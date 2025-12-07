export type PowerupType = 'tnt' | 'powerdrop' | 'shield' | 'magnet' | 'ghost' | 'boost';

export interface DropConfig {
  platformWidthRatio: number;
  avatarSize: number;
  cleanupDelay: number;
  gravity: number;
  bounceDamping: number;
  minHorizontalVelocity: number;
  maxHorizontalVelocity: number;
  horizontalDrift: number;
  centerBonusPoints: number;
  basePoints: number;
  usernameFontSize: number;
}

export interface PowerupEvent {
  username: string;
  powerupId: PowerupType;
  timestamp: number;
}

export interface Dropper {
  id: string;
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  landed: boolean;
  score?: number;
  showScore: boolean;
  landedAt?: number;
  landedOnPlatform?: boolean;
  // Powerup states
  hasShield?: boolean;
  isGhost?: boolean;
  ghostEndTime?: number;
  isBoosted?: boolean;
  boostEndTime?: number;
  isPowerDropping?: boolean;
  activePowerup?: PowerupType;
}

export interface ConfettiParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  size: number;
}

export interface ExplosionParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export interface DropEvent {
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
  activePowerup?: PowerupType;
}

export const DEFAULT_CONFIG: DropConfig = {
  platformWidthRatio: 0.125,
  avatarSize: 60,
  cleanupDelay: 10000,
  gravity: 5,
  bounceDamping: 0.85,
  minHorizontalVelocity: 100,
  maxHorizontalVelocity: 500,
  horizontalDrift: 100,
  centerBonusPoints: 100,
  basePoints: 10,
  usernameFontSize: 24,
};

export const CONFETTI_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700', '#ff6b6b', '#53fc18'];

export const POWERUP_EMOJIS: Record<PowerupType, string> = {
  tnt: '💣',
  powerdrop: '⚡',
  shield: '🛡️',
  magnet: '🧲',
  ghost: '👻',
  boost: '🚀'
};

export const POWERUP_NAMES: Record<PowerupType, string> = {
  tnt: 'TNT',
  powerdrop: 'POWER DROP',
  shield: 'SHIELD',
  magnet: 'MAGNET',
  ghost: 'GHOST',
  boost: 'SPEED BOOST'
};
