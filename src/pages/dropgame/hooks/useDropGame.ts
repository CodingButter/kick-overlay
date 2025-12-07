import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dropper, DropConfig, DropEvent } from '../types';
import { DEFAULT_CONFIG } from '../types';

interface UseDropGameProps {
  spawnConfetti: (x: number, y: number, count?: number) => void;
}

export function useDropGame({ spawnConfetti }: UseDropGameProps) {
  const [droppers, setDroppers] = useState<Dropper[]>([]);
  const [config, setConfig] = useState<DropConfig>(DEFAULT_CONFIG);
  const [platformX, setPlatformX] = useState<number | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch("/api/dropgame/config")
      .then((res) => res.json())
      .then((data) => setConfig({ ...DEFAULT_CONFIG, ...data }))
      .catch(() => console.log("Using default config"));
  }, []);

  // Poll for new drops
  useEffect(() => {
    const pollDrops = async () => {
      try {
        const res = await fetch("/api/dropgame/queue");
        const data = await res.json();
        const drops: DropEvent[] = data.drops || [];

        // Always update config from server (ensures admin changes take effect immediately)
        if (data.config) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }

        if (drops.length > 0 && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          // Use the latest config from the response
          const currentConfig = data.config ? { ...config, ...data.config } : config;

          // Show platform if not visible
          if (platformX === null) {
            const platformWidth = rect.width * currentConfig.platformWidthRatio;
            const newPlatformX = Math.random() * (rect.width - platformWidth);
            setPlatformX(newPlatformX);
          }

          // Add new droppers
          const newDroppers: Dropper[] = drops.map((drop) => {
            // Start with a random velocity between min and max
            const speed = currentConfig.minHorizontalVelocity + Math.random() * (currentConfig.maxHorizontalVelocity - currentConfig.minHorizontalVelocity);
            const direction = Math.random() > 0.5 ? 1 : -1;
            return {
              id: `${drop.username}-${Date.now()}-${Math.random()}`,
              username: drop.username,
              avatarUrl: drop.avatarUrl,
              emoteUrl: drop.emoteUrl,
              x: Math.random() * (rect.width - currentConfig.avatarSize),
              y: -currentConfig.avatarSize,
              vx: speed * direction,
              vy: 0,
              landed: false,
              showScore: false,
            };
          });

          setDroppers((prev) => [...prev, ...newDroppers]);
        }
      } catch (error) {
        // Silently fail
      }
    };

    const interval = setInterval(pollDrops, 500);
    return () => clearInterval(interval);
  }, [config, platformX]);

  // Physics loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const update = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!containerRef.current) {
        animationId = requestAnimationFrame(update);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const platformWidth = rect.width * config.platformWidthRatio;
      const platformHeight = 80; // Approximate platform image height
      const platformY = rect.height - platformHeight;

      setDroppers((prev) => {
        let newWinner: string | null = null;

        const updated = prev.map((dropper) => {
          if (dropper.landed) {
            // Remove this dropper after cleanup delay has passed since landing
            if (dropper.landedAt && Date.now() - dropper.landedAt > config.cleanupDelay) {
              return null;
            }
            return dropper;
          }

          // Apply gravity with multipliers
          let gravityMultiplier = 1;
          if (dropper.isPowerDropping) {
            gravityMultiplier = 3;
          } else if (dropper.y < -config.avatarSize * 2) {
            gravityMultiplier = 20;
          } else if (dropper.y < 0) {
            gravityMultiplier = 15;
          } else if (dropper.vy < -300) {
            gravityMultiplier = 12;
          } else if (dropper.vy < -100) {
            gravityMultiplier = 8;
          } else if (dropper.vy < 0) {
            gravityMultiplier = 5;
          }
          let newVy = dropper.vy + config.gravity * gravityMultiplier * deltaTime;

          // Apply random horizontal drift (wind effect) - skip if power dropping
          let newVx = dropper.isPowerDropping ? 0 : dropper.vx + (Math.random() - 0.5) * config.horizontalDrift * deltaTime;

          // Skip velocity clamping and minimum enforcement for power dropping
          if (!dropper.isPowerDropping) {
            const direction = newVx >= 0 ? 1 : -1;
            const absVx = Math.abs(newVx);
            newVx = direction * Math.min(absVx, config.maxHorizontalVelocity);

            if (Math.abs(newVx) < config.minHorizontalVelocity) {
              newVx = direction * config.minHorizontalVelocity;
            }
          }

          let newX = dropper.x + newVx * deltaTime;
          let newY = dropper.y + newVy * deltaTime;

          // Check if ghost mode is still active
          const now = Date.now();
          let isGhost = dropper.isGhost && dropper.ghostEndTime && now < dropper.ghostEndTime;
          let isBoosted = dropper.isBoosted && dropper.boostEndTime && now < dropper.boostEndTime;

          // Handle wall collisions based on ghost mode
          if (isGhost) {
            // Ghost mode: wrap around screen
            if (newX < -config.avatarSize) {
              newX = rect.width;
            } else if (newX > rect.width) {
              newX = -config.avatarSize;
            }
          } else {
            // Normal bounce off walls
            if (newX < 0) {
              newX = 0;
              newVx = Math.abs(newVx) * config.bounceDamping;
              if (newVx < config.minHorizontalVelocity) {
                newVx = config.minHorizontalVelocity;
              }
              newVy = newVy * 0.8;
            } else if (newX > rect.width - config.avatarSize) {
              newX = rect.width - config.avatarSize;
              newVx = -Math.abs(newVx) * config.bounceDamping;
              if (Math.abs(newVx) < config.minHorizontalVelocity) {
                newVx = -config.minHorizontalVelocity;
              }
              newVy = newVy * 0.8;
            }
          }

          // Check collisions with other droppers
          const dropperCenterX = newX + config.avatarSize / 2;
          const dropperCenterY = newY + config.avatarSize / 2;
          const collisionRadius = config.avatarSize / 2;

          for (const other of prev) {
            if (other.id === dropper.id || other.landed) continue;
            if (isGhost || (other.isGhost && other.ghostEndTime && Date.now() < other.ghostEndTime)) continue;

            const otherCenterX = other.x + config.avatarSize / 2;
            const otherCenterY = other.y + config.avatarSize / 2;

            const dx = dropperCenterX - otherCenterX;
            const dy = dropperCenterY - otherCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = collisionRadius * 2;

            if (distance < minDistance && distance > 0) {
              const overlap = minDistance - distance;
              const normalX = dx / distance;
              const normalY = dy / distance;

              newX += normalX * overlap * 0.5;
              newY += normalY * overlap * 0.5;

              const relVx = newVx - other.vx;
              const relVy = newVy - other.vy;
              const relVelAlongNormal = relVx * normalX + relVy * normalY;

              if (relVelAlongNormal < 0) {
                const bounceFactor = 0.8;
                newVx -= relVelAlongNormal * normalX * bounceFactor;
                newVy -= relVelAlongNormal * normalY * bounceFactor;
              }
            }
          }

          // Check collisions - bottom of circle is the collision point
          const avatarBottom = newY + config.avatarSize;
          const avatarCenterX = newX + config.avatarSize / 2;
          const platformTopY = rect.height - platformHeight;

          // Check if over platform and hit platform top
          if (
            platformX !== null &&
            avatarBottom >= platformTopY &&
            avatarCenterX >= platformX &&
            avatarCenterX <= platformX + platformWidth
          ) {
            // Landed on platform!
            const platformCenterX = platformX + platformWidth / 2;
            const distanceFromCenter = Math.abs(avatarCenterX - platformCenterX);
            const maxDistance = platformWidth / 2;
            const accuracy = 1 - distanceFromCenter / maxDistance;

            const score = Math.round(
              config.basePoints + accuracy * config.centerBonusPoints
            );

            const isPerfect = accuracy > 0.9;
            if (isPerfect) {
              newWinner = dropper.username;
            }

            // Report score to server
            fetch("/api/dropgame/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: dropper.username,
                score,
                isPerfect,
              }),
            }).catch(() => {});

            fetch("/api/dropgame/landed", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: dropper.username }),
            }).catch(() => {});

            const confettiCount = isPerfect ? 60 : Math.round(20 + accuracy * 30);
            spawnConfetti(avatarCenterX, platformTopY, confettiCount);

            return {
              ...dropper,
              x: newX,
              y: platformTopY - config.avatarSize,
              vx: 0,
              vy: 0,
              landed: true,
              landedOnPlatform: true,
              score,
              showScore: true,
              landedAt: Date.now(),
            };
          }

          // Check if fell off bottom (missed platform)
          if (avatarBottom >= rect.height) {
            fetch("/api/dropgame/landed", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: dropper.username }),
            }).catch(() => {});

            return {
              ...dropper,
              x: newX,
              y: rect.height - config.avatarSize,
              vx: 0,
              vy: 0,
              landed: true,
              score: 0,
              showScore: true,
              landedAt: Date.now(),
            };
          }

          return {
            ...dropper,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            isGhost: isGhost,
            isBoosted: isBoosted,
          };
        });

        const filtered = updated.filter((d): d is Dropper => d !== null);

        if (newWinner) {
          setWinnerName(newWinner);
          setTimeout(() => setWinnerName(null), 3000);
        }

        const allLanded = filtered.every(d => d.landed);
        if (filtered.length === 0 || (filtered.length > 0 && allLanded && filtered.every(d => d.landedAt && Date.now() - d.landedAt > config.cleanupDelay - 100))) {
          if (filtered.length === 0) {
            setPlatformX(null);
          }
        }

        return filtered;
      });

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [config, platformX, spawnConfetti]);

  return {
    droppers,
    setDroppers,
    config,
    platformX,
    winnerName,
    containerRef,
  };
}
