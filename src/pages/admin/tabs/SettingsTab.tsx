import { useState, useEffect } from 'react';
import { Settings, Save, FolderOpen, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OverlaySetting, SettingMeta } from '../types';

const SETTING_METADATA: Record<string, SettingMeta> = {
  // Boolean settings
  tts_enabled: { type: 'boolean' },
  drop_game_enabled: { type: 'boolean' },
  ai_chatbot_enabled: { type: 'boolean' },
  // Number settings
  notification_sound_threshold: { type: 'number', min: 0, max: 600000, step: 1000, unit: 'ms' },
  ai_cooldown_seconds: { type: 'number', min: 1, max: 300, step: 1, unit: 'seconds' },
  // Path/string settings
  ai_project_directory: { type: 'path', placeholder: '/path/to/your/project' },
};

interface SettingsTabProps {
  token: string;
}

export function SettingsTab({ token }: SettingsTabProps) {
  const [settings, setSettings] = useState<OverlaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedRecently, setSavedRecently] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // AI-related settings (group them together)
  const aiSettings = ['ai_chatbot_enabled', 'ai_cooldown_seconds', 'ai_project_directory'];

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s: OverlaySetting) => {
        values[s.key] = s.value;
      });
      setEditValues(values);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value?: string) => {
    setSaving(key);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value: value ?? editValues[key] }),
      });
      await fetchSettings();
      // Show saved indicator
      setSavedRecently({ ...savedRecently, [key]: true });
      setTimeout(() => {
        setSavedRecently(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSaving(null);
    }
  };

  const toggleBooleanSetting = async (key: string) => {
    const currentValue = editValues[key];
    const newValue = currentValue === 'true' ? 'false' : 'true';
    setEditValues({ ...editValues, [key]: newValue });
    await saveSetting(key, newValue);
  };

  const formatLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getSettingMeta = (key: string): SettingMeta => {
    return SETTING_METADATA[key] || { type: 'string' };
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading settings...</div>;
  }

  // Separate AI settings from other settings
  const generalSettings = settings.filter(s => !aiSettings.includes(s.key));
  const aiSettingsData = settings.filter(s => aiSettings.includes(s.key));

  const renderSetting = (setting: OverlaySetting) => {
    const meta = getSettingMeta(setting.key);
    const isEnabled = editValues[setting.key] === 'true';
    const numValue = parseInt(editValues[setting.key] || '0', 10);

    return (
      <Card key={setting.key} className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground">
                {formatLabel(setting.key)}
              </CardTitle>
              {setting.description && (
                <CardDescription className="text-muted-foreground">
                  {setting.description}
                </CardDescription>
              )}
            </div>
            {/* Boolean toggle switch */}
            {meta.type === 'boolean' && (
              <div className="flex items-center gap-3">
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-primary animate-pulse">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Saved</span>
                  </div>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleBooleanSetting(setting.key)}
                  disabled={saving === setting.key}
                />
              </div>
            )}
          </div>
        </CardHeader>

        {meta.type !== 'boolean' && (
          <CardContent className="pt-0">
            {/* Number input with slider */}
            {meta.type === 'number' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[numValue]}
                    min={meta.min ?? 0}
                    max={meta.max ?? 100}
                    step={meta.step ?? 1}
                    onValueChange={(value) => setEditValues({ ...editValues, [setting.key]: (value[0] ?? 0).toString() })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={editValues[setting.key] || ''}
                      onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                      className="w-24 text-right bg-secondary border-border"
                    />
                    {meta.unit && (
                      <span className="text-sm text-muted-foreground min-w-[60px]">{meta.unit}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{meta.min ?? 0}{meta.unit ? ` ${meta.unit}` : ''}</span>
                  <span>{meta.max ?? 100}{meta.unit ? ` ${meta.unit}` : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                  {savedRecently[setting.key] && (
                    <div className="flex items-center gap-1.5 text-primary animate-pulse">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Saved</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Path input */}
            {meta.type === 'path' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex flex-1">
                    <div className="flex items-center justify-center w-12 bg-muted rounded-l-md border border-r-0 border-border">
                      <FolderOpen className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <Input
                      type="text"
                      value={editValues[setting.key] || ''}
                      onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                      placeholder={meta.placeholder || ''}
                      className="flex-1 font-mono text-sm bg-secondary border-border rounded-l-none"
                    />
                  </div>
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-primary animate-pulse">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Saved</span>
                  </div>
                )}
              </div>
            )}

            {/* Default string input */}
            {meta.type === 'string' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={editValues[setting.key] || ''}
                    onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                    placeholder={meta.placeholder || ''}
                    className="flex-1 bg-secondary border-border"
                  />
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-primary animate-pulse">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Saved</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div>
      {/* AI Chatbot Settings Section */}
      {aiSettingsData.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
            >
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Chatbot</h2>
              <p className="text-sm text-muted-foreground">Configure the Claude AI assistant for chat</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiSettingsData.map(renderSetting)}
          </div>
        </section>
      )}

      {/* General Overlay Settings */}
      <section style={{ paddingTop: '32px', borderTop: '1px solid #475569' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          >
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Overlay Settings</h2>
            <p className="text-sm text-muted-foreground">General overlay configuration</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {generalSettings.map(renderSetting)}
        </div>
      </section>
    </div>
  );
}
