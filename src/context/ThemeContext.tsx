import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface ThemeConfig {
  siteName: string;
  siteNameAccent: string;
  brandColor: string;
  brandColorForeground: string;
  fontFamily: string;
  darkMode: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
  };
  lightMode: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
  };
  borderRadius: string;
}

const DEFAULT_THEME: ThemeConfig = {
  siteName: 'Kick',
  siteNameAccent: 'Overlay',
  brandColor: '#53fc18',
  brandColorForeground: '#ffffff',
  fontFamily: 'Poppins',
  darkMode: {
    background: '#0a0a0b',
    foreground: '#fafafa',
    card: '#141416',
    cardForeground: '#fafafa',
    primary: '#53fc18',
    primaryForeground: '#0a0a0b',
    secondary: '#1f1f23',
    secondaryForeground: '#fafafa',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    accent: '#1f1f23',
    accentForeground: '#fafafa',
    border: '#27272a',
  },
  lightMode: {
    background: '#fafafa',
    foreground: '#18181b',
    card: '#ffffff',
    cardForeground: '#18181b',
    primary: '#16a34a',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    accent: '#f4f4f5',
    accentForeground: '#18181b',
    border: '#e4e4e7',
  },
  borderRadius: '0.75rem',
};

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Load a Google Font dynamically
function loadGoogleFont(fontFamily: string) {
  const fontId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;

  // Remove any existing font link with this ID
  const existing = document.getElementById(fontId);
  if (existing) existing.remove();

  // Create new link element
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// Apply theme CSS variables to the document
function applyThemeToDocument(theme: ThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  const mode = isDark ? theme.darkMode : theme.lightMode;

  // Load and apply font
  if (theme.fontFamily) {
    loadGoogleFont(theme.fontFamily);
    const fontStack = `'${theme.fontFamily}', ui-sans-serif, system-ui, sans-serif`;
    root.style.setProperty('--theme-font-family', fontStack);
    document.body.style.fontFamily = fontStack;
  }

  // Apply mode-specific colors
  root.style.setProperty('--theme-background', mode.background);
  root.style.setProperty('--theme-foreground', mode.foreground);
  root.style.setProperty('--theme-card', mode.card);
  root.style.setProperty('--theme-card-foreground', mode.cardForeground);
  root.style.setProperty('--theme-primary', mode.primary);
  root.style.setProperty('--theme-primary-foreground', mode.primaryForeground);
  root.style.setProperty('--theme-secondary', mode.secondary);
  root.style.setProperty('--theme-secondary-foreground', mode.secondaryForeground);
  root.style.setProperty('--theme-muted', mode.muted);
  root.style.setProperty('--theme-muted-foreground', mode.mutedForeground);
  root.style.setProperty('--theme-accent', mode.accent);
  root.style.setProperty('--theme-accent-foreground', mode.accentForeground);
  root.style.setProperty('--theme-border', mode.border);
  root.style.setProperty('--theme-input', mode.border);
  root.style.setProperty('--theme-ring', mode.foreground);

  // Apply brand color
  root.style.setProperty('--theme-brand', theme.brandColor);
  root.style.setProperty('--theme-brand-foreground', theme.brandColorForeground);

  // Apply border radius
  root.style.setProperty('--theme-radius', theme.borderRadius);

  // Also set destructive colors (not customizable for now)
  if (isDark) {
    root.style.setProperty('--theme-destructive', '#7f1d1d');
    root.style.setProperty('--theme-destructive-foreground', '#f8fafc');
  } else {
    root.style.setProperty('--theme-destructive', '#ef4444');
    root.style.setProperty('--theme-destructive-foreground', '#f8fafc');
  }

  // Toggle dark class
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [loaded, setLoaded] = useState(false);

  // Load theme from API on mount
  useEffect(() => {
    fetch('/api/theme')
      .then(res => res.json())
      .then((data: ThemeConfig) => {
        setThemeState(data);
        setLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load theme:', err);
        setLoaded(true);
      });

    // Load dark mode preference from localStorage
    const savedDark = localStorage.getItem('darkMode');
    if (savedDark !== null) {
      setIsDark(savedDark === 'true');
    }
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (loaded) {
      applyThemeToDocument(theme, isDark);
    }
  }, [theme, isDark, loaded]);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  };

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('darkMode', String(newDark));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
