import { useState, useEffect, useCallback } from 'react';
import type { ConfettiParticle, ExplosionParticle } from '../types';
import { CONFETTI_COLORS } from '../types';

export function useParticles() {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [explosions, setExplosions] = useState<ExplosionParticle[]>([]);

  // Spawn confetti at a position
  const spawnConfetti = useCallback((x: number, y: number, count: number = 30) => {
    const particles: ConfettiParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 200 + Math.random() * 300;
      particles.push({
        id: `confetti-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 200, // Initial upward boost
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#ff0000',
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 720,
        size: 8 + Math.random() * 8,
      });
    }
    setConfetti(prev => [...prev, ...particles]);

    // Clean up confetti after animation
    setTimeout(() => {
      setConfetti(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
    }, 3000);
  }, []);

  // Spawn explosion at a position
  const spawnExplosion = useCallback((x: number, y: number) => {
    const particles: ExplosionParticle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 300 + Math.random() * 200;
      particles.push({
        id: `explosion-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20 + Math.random() * 20,
        opacity: 1,
      });
    }
    setExplosions(prev => [...prev, ...particles]);

    // Clean up explosion after animation
    setTimeout(() => {
      setExplosions(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
    }, 1000);
  }, []);

  // Explosion physics
  const hasExplosions = explosions.length > 0;
  useEffect(() => {
    if (!hasExplosions) return;

    let animationId: number;
    let lastTime = performance.now();

    const updateExplosions = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setExplosions(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * deltaTime,
        y: p.y + p.vy * deltaTime,
        vx: p.vx * 0.95,
        vy: p.vy * 0.95,
        opacity: Math.max(0, p.opacity - deltaTime * 2),
        size: p.size * (1 - deltaTime * 0.5),
      })).filter(p => p.opacity > 0));

      animationId = requestAnimationFrame(updateExplosions);
    };

    animationId = requestAnimationFrame(updateExplosions);
    return () => cancelAnimationFrame(animationId);
  }, [hasExplosions]);

  // Confetti physics
  const hasConfetti = confetti.length > 0;
  useEffect(() => {
    if (!hasConfetti) return;

    let animationId: number;
    let lastTime = performance.now();

    const updateConfetti = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setConfetti(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * deltaTime,
        y: p.y + p.vy * deltaTime,
        vy: p.vy + 500 * deltaTime, // Gravity
        vx: p.vx * 0.99, // Air resistance
        rotation: p.rotation + p.rotationSpeed * deltaTime,
      })).filter(p => p.y < window.innerHeight + 100));

      animationId = requestAnimationFrame(updateConfetti);
    };

    animationId = requestAnimationFrame(updateConfetti);
    return () => cancelAnimationFrame(animationId);
  }, [hasConfetti]);

  return {
    confetti,
    explosions,
    spawnConfetti,
    spawnExplosion,
  };
}
