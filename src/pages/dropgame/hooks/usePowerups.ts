import { useEffect, useCallback, useState } from 'react';
import type { Dropper, DropConfig, PowerupType, PowerupEvent } from '../types';
import { POWERUP_EMOJIS, POWERUP_NAMES } from '../types';

interface UsePowerupsProps {
  droppers: Dropper[];
  setDroppers: React.Dispatch<React.SetStateAction<Dropper[]>>;
  config: DropConfig;
  platformX: number | null;
  containerWidth: number;
  spawnExplosion: (x: number, y: number) => void;
}

export function usePowerups({
  droppers,
  setDroppers,
  config,
  platformX,
  containerWidth,
  spawnExplosion,
}: UsePowerupsProps) {
  const [powerupAnnouncement, setPowerupAnnouncement] = useState<{ text: string; emoji: string } | null>(null);

  // Apply powerup effect to dropper
  const applyPowerup = useCallback((username: string, powerupId: PowerupType) => {
    const now = Date.now();

    setPowerupAnnouncement({ text: `${username}: ${POWERUP_NAMES[powerupId]}!`, emoji: POWERUP_EMOJIS[powerupId] });
    setTimeout(() => setPowerupAnnouncement(null), 2000);

    setDroppers(prev => prev.map(d => {
      if (d.username.toLowerCase() !== username.toLowerCase() || d.landed) return d;

      switch (powerupId) {
        case 'tnt':
          // TNT: MEGA explosion that affects almost all droppers on screen
          const tntX = d.x + config.avatarSize / 2;
          const tntY = d.y + config.avatarSize / 2;
          spawnExplosion(tntX, tntY);

          // Super powerful explosion - affects droppers across the entire screen
          const EXPLOSION_RADIUS = 2000; // Huge radius to hit almost everyone
          const EXPLOSION_FORCE = 1500; // Much stronger force
          const UPWARD_BOOST = 400; // Strong upward push

          setDroppers(prevDroppers => prevDroppers.map(other => {
            // Skip self, landed droppers, shielded droppers, and ghost droppers
            const otherIsGhost = other.isGhost && other.ghostEndTime && Date.now() < other.ghostEndTime;
            if (other.id === d.id || other.landed || other.hasShield || otherIsGhost) return other;
            const otherX = other.x + config.avatarSize / 2;
            const otherY = other.y + config.avatarSize / 2;
            const dx = otherX - tntX;
            const dy = otherY - tntY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Always affect other droppers, with force decreasing slightly by distance
            const distanceFactor = Math.max(0.3, 1 - (distance / EXPLOSION_RADIUS));
            const force = EXPLOSION_FORCE * distanceFactor;
            const angle = Math.atan2(dy, dx);

            return {
              ...other,
              vx: other.vx + Math.cos(angle) * force,
              vy: other.vy + Math.sin(angle) * force - UPWARD_BOOST * distanceFactor,
            };
          }));
          return d;

        case 'powerdrop':
          // Power Drop: Stop horizontal movement permanently and increase gravity
          return { ...d, vx: 0, isPowerDropping: true };

        case 'shield':
          // Shield: Mark as protected
          return { ...d, hasShield: true };

        case 'magnet':
          // Magnet: Pull towards platform center
          if (platformX !== null && containerWidth > 0) {
            const platformCenterX = platformX + (containerWidth * config.platformWidthRatio) / 2;
            const dropperCenterX = d.x + config.avatarSize / 2;
            const pullDirection = platformCenterX > dropperCenterX ? 1 : -1;
            return { ...d, vx: pullDirection * 400 }; // Strong pull towards center
          }
          return d;

        case 'ghost':
          // Ghost: Enable wall wrapping for 5 seconds
          return { ...d, isGhost: true, ghostEndTime: now + 5000 };

        case 'boost':
          // Boost: Double horizontal speed for 3 seconds
          return { ...d, isBoosted: true, boostEndTime: now + 3000, vx: d.vx * 2 };

        default:
          return d;
      }
    }));
  }, [config.avatarSize, config.platformWidthRatio, platformX, containerWidth, spawnExplosion, setDroppers]);

  // Poll for powerup activations
  useEffect(() => {
    const pollPowerups = async () => {
      try {
        const res = await fetch("/api/dropgame/powerups");
        const powerups: PowerupEvent[] = await res.json();

        for (const powerup of powerups) {
          applyPowerup(powerup.username, powerup.powerupId);
        }
      } catch (error) {
        // Silently fail
      }
    };

    const interval = setInterval(pollPowerups, 300);
    return () => clearInterval(interval);
  }, [applyPowerup]);

  return {
    powerupAnnouncement,
  };
}
