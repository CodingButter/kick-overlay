interface PowerupAnnouncementProps {
  text: string;
  emoji: string;
}

export function PowerupAnnouncement({ text, emoji }: PowerupAnnouncementProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        fontSize: "36px",
        fontWeight: "bold",
        textShadow: "0 0 10px #000, 0 0 20px #ff6600",
        textAlign: "center",
        zIndex: 150,
        animation: "powerupPop 0.5s ease-out",
      }}
    >
      <span style={{ fontSize: "48px" }}>{emoji}</span>
      <div>{text}</div>
    </div>
  );
}

interface WinnerAnnouncementProps {
  name: string;
}

export function WinnerAnnouncement({ name }: WinnerAnnouncementProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "#ffd700",
        fontSize: "48px",
        fontWeight: "bold",
        textShadow: "0 0 10px #000, 0 0 20px #ffd700",
        animation: "pulse 0.5s ease-in-out infinite",
        textAlign: "center",
        zIndex: 200,
      }}
    >
      {name}
      <div style={{ fontSize: "24px" }}>PERFECT!</div>
    </div>
  );
}

export function GameStyles() {
  return (
    <style>{`
      @keyframes scorePopup {
        0% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(0.5);
        }
        20% {
          opacity: 1;
          transform: translateX(-50%) translateY(-10px) scale(1.2);
        }
        40% {
          opacity: 1;
          transform: translateX(-50%) translateY(-5px) scale(1);
        }
        80% {
          opacity: 1;
          transform: translateX(-50%) translateY(-20px) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) translateY(-40px) scale(0.8);
        }
      }
      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
      }
      @keyframes powerupPop {
        0% {
          opacity: 0;
          transform: translateX(-50%) scale(0.5);
        }
        50% {
          transform: translateX(-50%) scale(1.2);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
      }
    `}</style>
  );
}
