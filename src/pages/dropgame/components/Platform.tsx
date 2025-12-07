interface PlatformProps {
  x: number;
  widthRatio: number;
}

export function Platform({ x, widthRatio }: PlatformProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        bottom: 0,
        width: `${widthRatio * 100}%`,
        zIndex: 10,
      }}
    >
      <img
        src="/public/dropgame-platform.png"
        alt="Platform"
        style={{
          width: "100%",
          height: "auto",
        }}
      />
    </div>
  );
}
