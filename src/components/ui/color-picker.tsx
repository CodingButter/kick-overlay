interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-4 p-5 bg-card/80 rounded-2xl">
      <div
        className="relative w-12 h-12 rounded-lg cursor-pointer overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer border-none p-0 m-0"
          style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block mb-2">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-full font-mono text-sm text-foreground bg-secondary/50 border-0 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        />
      </div>
    </div>
  );
}
