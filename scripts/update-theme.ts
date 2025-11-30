// Script to update the theme to a modern dark palette
import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.join(import.meta.dir, '../data/kick-overlay.db');
const db = new Database(DB_PATH);

// Layered Dark Theme - surfaces stack lighter on top of each other
// background (darkest) → card → secondary → muted (lightest surfaces)
const modernTheme = {
  siteName: 'Kick',
  siteNameAccent: 'Overlay',
  brandColor: '#53fc18',
  brandColorForeground: '#0f172a',
  fontFamily: 'Poppins',
  darkMode: {
    // Base layer - darkest
    background: '#0f172a',
    foreground: '#f1f5f9',
    // Card surfaces - lighter than background
    card: '#1e293b',
    cardForeground: '#f1f5f9',
    // Kick green stays as primary
    primary: '#53fc18',
    primaryForeground: '#0f172a',
    // Secondary surfaces (inside cards) - lighter than cards
    secondary: '#334155',
    secondaryForeground: '#f1f5f9',
    // Muted/tertiary surfaces - even lighter for nested elements
    muted: '#475569',
    mutedForeground: '#cbd5e1',
    // Accent color for highlights
    accent: '#0ea5e9',
    accentForeground: '#f0f9ff',
    // Borders - between card and secondary
    border: '#334155',
  },
  lightMode: {
    background: '#f8fafc',
    foreground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    primary: '#53fc18',
    primaryForeground: '#0f172a',
    secondary: '#f1f5f9',
    secondaryForeground: '#1e293b',
    muted: '#e2e8f0',
    mutedForeground: '#475569',
    accent: '#0ea5e9',
    accentForeground: '#0f172a',
    border: '#e2e8f0',
  },
  borderRadius: '0.75rem',
};

// Update the theme in the database
const stmt = db.prepare(`
  INSERT OR REPLACE INTO overlay_settings (key, value, description)
  VALUES ('theme_config', ?, 'Site theme and branding configuration')
`);

stmt.run(JSON.stringify(modernTheme));

console.log('Theme updated successfully!');
console.log('New theme:', JSON.stringify(modernTheme, null, 2));

db.close();
