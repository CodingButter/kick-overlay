import type { ConfettiParticle, ExplosionParticle } from '../types';

interface ConfettiProps {
  particles: ConfettiParticle[];
}

export function Confetti({ particles }: ConfettiProps) {
  return (
    <>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: "absolute",
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size * 0.6,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: "2px",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      ))}
    </>
  );
}

interface ExplosionsProps {
  particles: ExplosionParticle[];
}

export function Explosions({ particles }: ExplosionsProps) {
  return (
    <>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: "absolute",
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,200,0,${particle.opacity}) 0%, rgba(255,100,0,${particle.opacity * 0.8}) 50%, rgba(255,0,0,${particle.opacity * 0.5}) 100%)`,
            boxShadow: `0 0 ${particle.size}px rgba(255,100,0,${particle.opacity})`,
            pointerEvents: "none",
            zIndex: 60,
          }}
        />
      ))}
    </>
  );
}
