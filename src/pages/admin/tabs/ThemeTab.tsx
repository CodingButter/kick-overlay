import { useState, useEffect } from 'react';
import { Palette, Type, Save, CheckCircle } from 'lucide-react';
import { FontSelector } from '@/components/FontSelector';
import { useTheme, type ThemeConfig } from '@/context/ThemeContext';
import { ColorPicker } from '@/components/ui/color-picker';
import { ColorPair } from '@/components/ui/color-pair';

interface ThemeTabProps {
  token: string;
}

export function ThemeTab({ token }: ThemeTabProps) {
  const { theme: currentTheme, setTheme: setContextTheme } = useTheme();
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [activeMode, setActiveMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetchTheme();
  }, [token]);

  const fetchTheme = async () => {
    try {
      const res = await fetch('/api/admin/theme', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setThemeConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error('Failed to fetch theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTheme = async () => {
    if (!themeConfig) return;
    setSaving(true);
    try {
      await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(themeConfig),
      });
      setOriginalConfig(JSON.parse(JSON.stringify(themeConfig)));
      setContextTheme(themeConfig); // Update the live theme
      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 2000);
    } catch (err) {
      console.error('Failed to save theme:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (): boolean => {
    if (!themeConfig || !originalConfig) return false;
    return JSON.stringify(themeConfig) !== JSON.stringify(originalConfig);
  };

  const updateField = (field: keyof ThemeConfig, value: string) => {
    if (!themeConfig) return;
    setThemeConfig({ ...themeConfig, [field]: value });
  };

  const updateModeColor = (mode: 'darkMode' | 'lightMode', field: string, value: string) => {
    if (!themeConfig) return;
    setThemeConfig({
      ...themeConfig,
      [mode]: { ...themeConfig[mode], [field]: value },
    });
  };

  if (loading || !themeConfig) {
    return <div className="text-center py-8 text-muted-foreground">Loading theme...</div>;
  }

  const modeColors = activeMode === 'dark' ? themeConfig.darkMode : themeConfig.lightMode;
  const modeKey = activeMode === 'dark' ? 'darkMode' : 'lightMode';

  return (
    <div className="flex flex-col" style={{ gap: '32px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Theme Configuration</h2>
            <p className="text-sm text-muted-foreground">Customize colors and branding</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {savedRecently && (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Saved!</span>
            </div>
          )}
          <button
            onClick={saveTheme}
            disabled={saving || !hasChanges()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              saving || !hasChanges()
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/25'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>

      {/* Site Name Section */}
      <section className="bg-card/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📝</span>
          <h3 className="text-lg font-semibold text-foreground">Site Identity</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium text-secondary-foreground block mb-2">Site Name</label>
            <input
              type="text"
              value={themeConfig.siteName}
              onChange={(e) => updateField('siteName', e.target.value)}
              placeholder="Kick"
              className="w-full text-foreground bg-secondary/50 border-0 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-foreground block mb-2">Accent Text</label>
            <input
              type="text"
              value={themeConfig.siteNameAccent}
              onChange={(e) => updateField('siteNameAccent', e.target.value)}
              placeholder="Overlay"
              className="w-full text-foreground bg-secondary/50 border-0 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
        </div>
        <div className="p-6 bg-background/50 rounded-xl">
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-4">Header Preview</span>
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {themeConfig.siteName}<span style={{ color: themeConfig.brandColor }}>{themeConfig.siteNameAccent}</span>
          </span>
        </div>
      </section>

      {/* Typography Section */}
      <section className="bg-card/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
            <Type className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Typography</h3>
            <p className="text-sm text-muted-foreground">Select a font for your site</p>
          </div>
        </div>
        <div className="max-w-md">
          <FontSelector
            value={themeConfig.fontFamily || 'Poppins'}
            onChange={(font) => updateField('fontFamily', font)}
          />
        </div>
      </section>

      {/* Brand Colors Section */}
      <section className="bg-card/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎨</span>
          <h3 className="text-lg font-semibold text-foreground">Brand & Style</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ColorPicker
            label="Brand Color"
            value={themeConfig.brandColor}
            onChange={(v) => updateField('brandColor', v)}
          />
          <ColorPicker
            label="Brand Foreground"
            value={themeConfig.brandColorForeground}
            onChange={(v) => updateField('brandColorForeground', v)}
          />
          <div className="p-5 bg-card/80 rounded-2xl">
            <span className="text-sm font-medium text-foreground block mb-2">Border Radius</span>
            <input
              type="text"
              value={themeConfig.borderRadius}
              onChange={(e) => updateField('borderRadius', e.target.value)}
              placeholder="0.75rem"
              className="w-full font-mono text-sm text-foreground bg-secondary/50 border-0 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
        </div>
        <div className="p-6 bg-background/50 rounded-xl">
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-4">Brand Preview</span>
          <div className="flex items-center gap-6 flex-wrap">
            <button
              className="px-6 py-3 rounded-lg text-sm font-semibold shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: themeConfig.brandColor, color: themeConfig.brandColorForeground }}
            >
              Primary Button
            </button>
            <button
              className="px-6 py-3 rounded-lg text-sm font-semibold border-2 transition-colors"
              style={{ borderColor: themeConfig.brandColor, color: themeConfig.brandColor, backgroundColor: 'transparent' }}
            >
              Outline Button
            </button>
            <span className="text-sm font-medium underline underline-offset-4 cursor-pointer" style={{ color: themeConfig.brandColor }}>
              Brand Link
            </span>
          </div>
        </div>
      </section>

      {/* Theme Mode Colors Section */}
      <section className="bg-card/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeMode === 'dark' ? '🌙' : '☀️'}</span>
            <h3 className="text-lg font-semibold text-foreground">
              {activeMode === 'dark' ? 'Dark' : 'Light'} Mode Colors
            </h3>
          </div>
          <div className="flex gap-1 p-2 bg-secondary/50 rounded-xl">
            <button
              onClick={() => setActiveMode('dark')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                activeMode === 'dark'
                  ? 'bg-muted text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => setActiveMode('light')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                activeMode === 'light'
                  ? 'bg-muted text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ☀️ Light
            </button>
          </div>
        </div>

        {/* Color pairs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <ColorPair
            title="Page"
            bgLabel="Background"
            bgValue={modeColors.background}
            onBgChange={(v) => updateModeColor(modeKey, 'background', v)}
            fgLabel="Text"
            fgValue={modeColors.foreground}
            onFgChange={(v) => updateModeColor(modeKey, 'foreground', v)}
          />
          <ColorPair
            title="Card"
            bgLabel="Background"
            bgValue={modeColors.card}
            onBgChange={(v) => updateModeColor(modeKey, 'card', v)}
            fgLabel="Text"
            fgValue={modeColors.cardForeground}
            onFgChange={(v) => updateModeColor(modeKey, 'cardForeground', v)}
          />
          <ColorPair
            title="Primary"
            bgLabel="Background"
            bgValue={modeColors.primary}
            onBgChange={(v) => updateModeColor(modeKey, 'primary', v)}
            fgLabel="Text"
            fgValue={modeColors.primaryForeground}
            onFgChange={(v) => updateModeColor(modeKey, 'primaryForeground', v)}
          />
          <ColorPair
            title="Secondary"
            bgLabel="Background"
            bgValue={modeColors.secondary}
            onBgChange={(v) => updateModeColor(modeKey, 'secondary', v)}
            fgLabel="Text"
            fgValue={modeColors.secondaryForeground}
            onFgChange={(v) => updateModeColor(modeKey, 'secondaryForeground', v)}
          />
          <ColorPair
            title="Muted"
            bgLabel="Background"
            bgValue={modeColors.muted}
            onBgChange={(v) => updateModeColor(modeKey, 'muted', v)}
            fgLabel="Text"
            fgValue={modeColors.mutedForeground}
            onFgChange={(v) => updateModeColor(modeKey, 'mutedForeground', v)}
          />
          <ColorPair
            title="Accent"
            bgLabel="Background"
            bgValue={modeColors.accent}
            onBgChange={(v) => updateModeColor(modeKey, 'accent', v)}
            fgLabel="Text"
            fgValue={modeColors.accentForeground}
            onFgChange={(v) => updateModeColor(modeKey, 'accentForeground', v)}
          />
        </div>

        {/* Border color */}
        <ColorPicker
          label="Border Color"
          value={modeColors.border}
          onChange={(v) => updateModeColor(modeKey, 'border', v)}
        />
      </section>
    </div>
  );
}
