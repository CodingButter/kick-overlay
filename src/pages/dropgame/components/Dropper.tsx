import type { Dropper as DropperType, DropConfig } from '../types';

interface DropperProps {
  dropper: DropperType;
  config: DropConfig;
}

export function Dropper({ dropper, config }: DropperProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: dropper.x,
        top: dropper.y,
        width: config.avatarSize,
        height: config.avatarSize,
        transition: dropper.landed ? "none" : undefined,
        zIndex: 20,
      }}
    >
      {/* Avatar/Emote */}
      <img
        src={dropper.emoteUrl || dropper.avatarUrl || "/public/default-avatar.png"}
        alt={dropper.username}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          border: dropper.hasShield ? "4px solid #ffd700" : "3px solid #53fc18",
          boxShadow: dropper.hasShield
            ? "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)"
            : dropper.isBoosted
              ? "0 0 15px rgba(255, 100, 0, 0.8)"
              : "0 0 10px rgba(83, 252, 24, 0.5)",
          opacity: dropper.isGhost ? 0.5 : 1,
          filter: dropper.isGhost ? "blur(1px)" : undefined,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
        }}
      />
      {/* Shield indicator */}
      {dropper.hasShield && (
        <div style={{
          position: "absolute",
          top: -5,
          right: -5,
          fontSize: "20px",
        }}>🛡️</div>
      )}
      {/* Ghost indicator */}
      {dropper.isGhost && (
        <div style={{
          position: "absolute",
          top: -5,
          left: -5,
          fontSize: "20px",
        }}>👻</div>
      )}
      {/* Power Drop indicator */}
      {dropper.isPowerDropping && (
        <div style={{
          position: "absolute",
          bottom: -5,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "20px",
        }}>⚡</div>
      )}
      {/* Boost trail */}
      {dropper.isBoosted && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: dropper.vx > 0 ? -20 : undefined,
          right: dropper.vx < 0 ? -20 : undefined,
          transform: "translateY(-50%)",
          fontSize: "16px",
        }}>🚀</div>
      )}
      {/* Username */}
      <div
        style={{
          position: "absolute",
          top: -(config.usernameFontSize + 10),
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          color: "#fff",
          fontSize: `${config.usernameFontSize}px`,
          fontWeight: "bold",
          textShadow: "0 0 6px #000, 0 0 6px #000, 2px 2px 4px #000",
        }}
      >
        {dropper.username}
      </div>
      {/* Score popup - shown above username when landed */}
      {dropper.showScore && dropper.score !== undefined && dropper.landed && (
        <div
          style={{
            position: "absolute",
            top: -(config.usernameFontSize + 50),
            left: "50%",
            transform: "translateX(-50%)",
            color: dropper.landedOnPlatform
              ? (dropper.score > config.basePoints + config.centerBonusPoints * 0.5 ? "#ffd700" : "#53fc18")
              : "#ff4444",
            fontSize: "28px",
            fontWeight: "bold",
            textShadow: "0 0 8px #000, 0 0 8px #000, 2px 2px 4px #000",
            animation: "scorePopup 2.5s ease-out forwards",
            zIndex: 100,
          }}
        >
          {dropper.landedOnPlatform ? `+${dropper.score}` : "MISS!"}
        </div>
      )}
    </div>
  );
}
