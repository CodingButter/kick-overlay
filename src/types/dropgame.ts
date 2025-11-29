export type PowerupType = 'tnt' | 'powerdrop' | 'shield' | 'magnet' | 'ghost' | 'boost';

export interface Dropper {
  id: string;
  username: string;
  avatarUrl: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  landed: boolean;
  score?: number;
  hasShield?: boolean;
  isGhost?: boolean;
  isBoosted?: boolean;
  activePowerup?: PowerupType;
}

export interface GameConfig {
  platformWidthRatio: number;
  avatarSize: number;
  cleanupDelay: number;
  gravity: number;
  bounceDamping: number;
  minHorizontalVelocity: number;
  maxHorizontalVelocity: number;
  horizontalDrift: number;
  usernameFontSize: number;
}

export interface ScoringConfig {
  basePoints: number;
  centerBonusPoints: number;
}

export interface PhysicsConfig {
  explosionRadius: number;
  explosionForce: number;
  explosionUpwardBoost: number;
  ghostDuration: number;
  boostDuration: number;
  powerDropGravityMultiplier: number;
}

export interface PowerupConfig {
  cost: number;
  description: string;
}

export interface DropConfig {
  game: GameConfig;
  scoring: ScoringConfig;
  physics: PhysicsConfig;
  powerups: Record<PowerupType, PowerupConfig>;
}

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export interface DropEvent {
  username: string;
  avatarUrl: string;
  powerup?: PowerupType;
}
