import { queries } from '../db';

export interface ThemeConfig {
  siteName: string;
  siteNameAccent: string;
  brandColor: string;
  brandColorForeground: string;
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
  chromaKeyColor: string;
}

let themeConfig: ThemeConfig | null = null;

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  siteName: 'Kick',
  siteNameAccent: 'Overlay',
  brandColor: '#00ff00',
  brandColorForeground: '#000000',
  darkMode: {
    background: '#0f172a',
    foreground: '#f8fafc',
    card: '#0f172a',
    cardForeground: '#f8fafc',
    primary: '#f8fafc',
    primaryForeground: '#1e293b',
    secondary: '#1e293b',
    secondaryForeground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    accent: '#1e293b',
    accentForeground: '#f8fafc',
    border: '#1e293b',
  },
  lightMode: {
    background: '#ffffff',
    foreground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    primary: '#1e293b',
    primaryForeground: '#f8fafc',
    secondary: '#f1f5f9',
    secondaryForeground: '#1e293b',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#f1f5f9',
    accentForeground: '#1e293b',
    border: '#e2e8f0',
  },
  borderRadius: '0.5rem',
  chromaKeyColor: '#FF00FF',
};

export function loadThemeConfig(): ThemeConfig {
  if (themeConfig) return themeConfig;
  try {
    const setting = queries.getOverlaySetting.get('theme_config');
    if (setting) {
      themeConfig = JSON.parse(setting.value);
      console.log('Loaded theme config from database');
      return themeConfig!;
    }
  } catch (error) {
    console.error('Error loading theme config:', error);
  }
  themeConfig = { ...DEFAULT_THEME_CONFIG };
  queries.upsertOverlaySetting.run('theme_config', JSON.stringify(themeConfig), 'Site theme and branding configuration');
  console.log('Initialized default theme config in database');
  return themeConfig;
}

export function saveThemeConfig(config: ThemeConfig): void {
  try {
    queries.upsertOverlaySetting.run('theme_config', JSON.stringify(config), 'Site theme and branding configuration');
    themeConfig = config;
    console.log('Saved theme config to database');
  } catch (error) {
    console.error('Error saving theme config:', error);
  }
}

export function getThemeConfig(): ThemeConfig | null {
  return themeConfig;
}
