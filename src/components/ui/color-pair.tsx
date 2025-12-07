interface ColorPairProps {
  title: string;
  bgLabel: string;
  bgValue: string;
  onBgChange: (value: string) => void;
  fgLabel: string;
  fgValue: string;
  onFgChange: (value: string) => void;
}

export function ColorPair({
  title,
  bgLabel,
  bgValue,
  onBgChange,
  fgLabel,
  fgValue,
  onFgChange,
}: ColorPairProps) {
  return (
    <div className="bg-card/80 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 bg-secondary/50">
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            className="relative w-10 h-10 rounded-lg cursor-pointer overflow-hidden flex-shrink-0 shadow-md ring-1 ring-white/10"
            style={{ backgroundColor: bgValue }}
          >
            <input
              type="color"
              value={bgValue}
              onChange={(e) => onBgChange(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer border-none p-0 m-0"
              style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground block mb-1.5">{bgLabel}</span>
            <input
              type="text"
              value={bgValue}
              onChange={(e) => onBgChange(e.target.value)}
              className="w-full font-mono text-sm text-foreground bg-secondary/50 border-0 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative w-10 h-10 rounded-lg cursor-pointer overflow-hidden flex-shrink-0 shadow-md ring-1 ring-white/10"
            style={{ backgroundColor: fgValue }}
          >
            <input
              type="color"
              value={fgValue}
              onChange={(e) => onFgChange(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer border-none p-0 m-0"
              style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground block mb-1.5">{fgLabel}</span>
            <input
              type="text"
              value={fgValue}
              onChange={(e) => onFgChange(e.target.value)}
              className="w-full font-mono text-sm text-foreground bg-secondary/50 border-0 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
        </div>
        {/* Preview */}
        <div
          className="px-4 py-3 rounded-lg text-sm text-center font-medium"
          style={{ backgroundColor: bgValue, color: fgValue }}
        >
          Preview Text
        </div>
      </div>
    </div>
  );
}
