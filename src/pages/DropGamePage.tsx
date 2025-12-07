import { useTransparentBackground } from './dropgame/hooks/useTransparentBackground';
import { useParticles } from './dropgame/hooks/useParticles';
import { useDropGame } from './dropgame/hooks/useDropGame';
import { usePowerups } from './dropgame/hooks/usePowerups';
import { Dropper } from './dropgame/components/Dropper';
import { Platform } from './dropgame/components/Platform';
import { Confetti, Explosions } from './dropgame/components/Particles';
import { PowerupAnnouncement, WinnerAnnouncement, GameStyles } from './dropgame/components/Announcements';

export function DropGamePage() {
  // Force transparent background for OBS
  useTransparentBackground();

  // Particle systems
  const { confetti, explosions, spawnConfetti, spawnExplosion } = useParticles();

  // Main game state and physics
  const {
    droppers,
    setDroppers,
    config,
    platformX,
    winnerName,
    containerRef,
  } = useDropGame({ spawnConfetti });

  // Get container width for powerups
  const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1920;

  // Powerup system
  const { powerupAnnouncement } = usePowerups({
    droppers,
    setDroppers,
    config,
    platformX,
    containerWidth,
    spawnExplosion,
  });

  return (
    <div
      ref={containerRef}
      style={{
        width: "1920px",
        height: "1080px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Droppers */}
      {droppers.map((dropper) => (
        <Dropper key={dropper.id} dropper={dropper} config={config} />
      ))}

      {/* Platform */}
      {platformX !== null && (
        <Platform x={platformX} widthRatio={config.platformWidthRatio} />
      )}

      {/* Confetti particles */}
      <Confetti particles={confetti} />

      {/* Explosion particles */}
      <Explosions particles={explosions} />

      {/* Powerup announcement */}
      {powerupAnnouncement && (
        <PowerupAnnouncement
          text={powerupAnnouncement.text}
          emoji={powerupAnnouncement.emoji}
        />
      )}

      {/* Winner announcement */}
      {winnerName && <WinnerAnnouncement name={winnerName} />}

      {/* CSS animations */}
      <GameStyles />
    </div>
  );
}
