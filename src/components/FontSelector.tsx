import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Check, Loader2 } from 'lucide-react';

// Popular Google Fonts - curated list
const POPULAR_FONTS = [
  'Poppins',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Nunito',
  'Ubuntu',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'PT Sans',
  'Noto Sans',
  'Fira Sans',
  'Work Sans',
  'Rubik',
  'Quicksand',
  'Mulish',
  'Barlow',
  'Karla',
  'Josefin Sans',
  'DM Sans',
  'Manrope',
  'Space Grotesk',
  'Outfit',
  'Lexend',
  'Sora',
  'Plus Jakarta Sans',
];

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
}

// Load a font for preview
function loadPreviewFont(fontFamily: string): Promise<void> {
  return new Promise((resolve) => {
    const fontId = `preview-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;

    // Check if already loaded
    if (document.getElementById(fontId)) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600&display=swap`;
    link.onload = () => resolve();
    link.onerror = () => resolve(); // Still resolve on error
    document.head.appendChild(link);
  });
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set());
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter fonts based on search
  const filteredFonts = POPULAR_FONTS.filter(font =>
    font.toLowerCase().includes(search.toLowerCase())
  );

  // Load fonts when dropdown opens
  useEffect(() => {
    if (isOpen) {
      filteredFonts.forEach(async (font) => {
        if (!loadedFonts.has(font) && !loadingFonts.has(font)) {
          setLoadingFonts(prev => new Set(prev).add(font));
          await loadPreviewFont(font);
          setLoadedFonts(prev => new Set(prev).add(font));
          setLoadingFonts(prev => {
            const next = new Set(prev);
            next.delete(font);
            return next;
          });
        }
      });
    }
  }, [isOpen, filteredFonts, loadedFonts, loadingFonts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load the current font on mount
  useEffect(() => {
    if (value) {
      loadPreviewFont(value).then(() => {
        setLoadedFonts(prev => new Set(prev).add(value));
      });
    }
  }, [value]);

  const handleSelect = (font: string) => {
    onChange(font);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected font display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 flex items-center justify-between bg-secondary/50 border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
      >
        <span
          className="text-foreground"
          style={{ fontFamily: loadedFonts.has(value) ? `'${value}', sans-serif` : 'inherit' }}
        >
          {value || 'Select a font...'}
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search fonts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-secondary/50"
                autoFocus
              />
            </div>
          </div>

          {/* Font list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredFonts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No fonts found
              </div>
            ) : (
              filteredFonts.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => handleSelect(font)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors ${
                    font === value ? 'bg-primary/10' : ''
                  }`}
                >
                  <span
                    className="text-lg text-foreground"
                    style={{
                      fontFamily: loadedFonts.has(font) ? `'${font}', sans-serif` : 'inherit',
                      opacity: loadedFonts.has(font) ? 1 : 0.5
                    }}
                  >
                    {font}
                  </span>
                  <div className="flex items-center gap-2">
                    {loadingFonts.has(font) && (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    )}
                    {font === value && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Custom font input */}
          <div className="p-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Or enter a custom Google Font name:
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Custom font name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 bg-secondary/50 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (search.trim()) {
                    handleSelect(search.trim());
                  }
                }}
                disabled={!search.trim()}
                className="h-9"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live preview */}
      {value && (
        <div className="mt-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <p
            className="text-lg text-foreground"
            style={{ fontFamily: loadedFonts.has(value) ? `'${value}', sans-serif` : 'inherit' }}
          >
            The quick brown fox jumps over the lazy dog
          </p>
          <p
            className="text-2xl font-bold text-foreground mt-1"
            style={{ fontFamily: loadedFonts.has(value) ? `'${value}', sans-serif` : 'inherit' }}
          >
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </p>
          <p
            className="text-sm text-muted-foreground mt-1"
            style={{ fontFamily: loadedFonts.has(value) ? `'${value}', sans-serif` : 'inherit' }}
          >
            0123456789 !@#$%^&*()
          </p>
        </div>
      )}
    </div>
  );
}
