import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Lock, Settings, Zap, Gamepad2, LogOut, Save, RefreshCw, FolderOpen, Users, Trash2, Search, X, Check, CheckCircle, Palette, Type } from 'lucide-react';
import { FontSelector } from '@/components/FontSelector';
import { useTheme, type ThemeConfig } from '@/context/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OverlaySetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface PowerupConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
  variables: Record<string, any>;
  enabled: number;
}

interface DropGameConfig {
  game: {
    platformWidthRatio: number;
    avatarSize: number;
    cleanupDelay: number;
    gravity: number;
    bounceDamping: number;
    minHorizontalVelocity: number;
    maxHorizontalVelocity: number;
    horizontalDrift: number;
    usernameFontSize: number;
  };
  scoring: {
    basePoints: number;
    centerBonusPoints: number;
  };
  physics: {
    explosionRadius: number;
    explosionForce: number;
    explosionUpwardBoost: number;
    ghostDuration: number;
    boostDuration: number;
    powerDropGravityMultiplier: number;
  };
  powerups: Record<string, { cost: number; description: string }>;
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-8 w-full max-w-md border border-border">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Lock className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-primary hover:bg-primary/80 disabled:bg-muted disabled:cursor-not-allowed text-foreground font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Setting type metadata for proper input rendering
interface SettingMeta {
  type: 'boolean' | 'number' | 'string' | 'path';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

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

function SettingsTab({ token }: { token: string }) {
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
                    onValueChange={(value) => setEditValues({ ...editValues, [setting.key]: value[0].toString() })}
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

function PowerupsTab({ token }: { token: string }) {
  const [powerups, setPowerups] = useState<PowerupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editPowerups, setEditPowerups] = useState<Record<string, PowerupConfig>>({});

  useEffect(() => {
    fetchPowerups();
  }, [token]);

  const fetchPowerups = async () => {
    try {
      const res = await fetch('/api/admin/powerups', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setPowerups(data);
      const edits: Record<string, PowerupConfig> = {};
      data.forEach((p: PowerupConfig) => {
        edits[p.id] = { ...p };
      });
      setEditPowerups(edits);
    } catch (err) {
      console.error('Failed to fetch powerups:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePowerup = async (id: string) => {
    setSaving(id);
    try {
      const powerup = editPowerups[id];
      await fetch(`/api/admin/powerups/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: powerup.name,
          description: powerup.description,
          cost: powerup.cost,
          variables: powerup.variables,
          enabled: powerup.enabled,
        }),
      });
      await fetchPowerups();
    } catch (err) {
      console.error('Failed to save powerup:', err);
    } finally {
      setSaving(null);
    }
  };

  const updatePowerup = (id: string, field: string, value: any) => {
    setEditPowerups({
      ...editPowerups,
      [id]: {
        ...editPowerups[id],
        [field]: value,
      },
    });
  };

  // Check if a powerup has unsaved changes
  const hasChanges = (id: string): boolean => {
    const original = powerups.find(p => p.id === id);
    const edited = editPowerups[id];
    if (!original || !edited) return false;

    return (
      original.name !== edited.name ||
      original.description !== edited.description ||
      original.cost !== edited.cost ||
      original.enabled !== edited.enabled ||
      JSON.stringify(original.variables) !== JSON.stringify(edited.variables)
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading powerups...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20">
          <Zap className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Powerup Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage drop game powerups and their effects</p>
        </div>
      </div>

      {powerups.map((powerup) => {
        const edit = editPowerups[powerup.id];
        if (!edit) return null;

        return (
          <Card key={powerup.id} className="bg-card/50 border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary/50">
                  <span className="text-3xl">{powerup.emoji}</span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg text-foreground">{powerup.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{powerup.effect}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`enabled-${powerup.id}`} className="text-sm text-muted-foreground">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${powerup.id}`}
                    checked={edit.enabled === 1}
                    onCheckedChange={(checked) => updatePowerup(powerup.id, 'enabled', checked ? 1 : 0)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <Input
                    type="text"
                    value={edit.name}
                    onChange={(e) => updatePowerup(powerup.id, 'name', e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Cost (points)</Label>
                  <Input
                    type="number"
                    value={edit.cost}
                    onChange={(e) => updatePowerup(powerup.id, 'cost', parseInt(e.target.value) || 0)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Description</Label>
                <textarea
                  value={edit.description}
                  onChange={(e) => updatePowerup(powerup.id, 'description', e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                />
              </div>

            {Object.keys(edit.variables).length > 0 && (
              <div className="mb-4">
                <Label className="text-muted-foreground mb-3 block">Variables</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(edit.variables).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <Input
                        type="number"
                        value={value as number}
                        onChange={(e) => {
                          const newVars = { ...edit.variables, [key]: parseInt(e.target.value) || 0 };
                          updatePowerup(powerup.id, 'variables', newVars);
                        }}
                        className="bg-secondary border-border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

              <Button
                onClick={() => savePowerup(powerup.id)}
                disabled={saving === powerup.id || !hasChanges(powerup.id)}
                className="bg-primary hover:bg-primary/90"
                style={saving === powerup.id || !hasChanges(powerup.id) ? { backgroundColor: '#475569', opacity: 0.6, cursor: 'not-allowed' } : { backgroundColor: '#16a34a' }}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving === powerup.id ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface UserData {
  id: number;
  username: string;
  voice_id: string | null;
  drop_image: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  channel_points: number;
  drop_points: number;
  total_drops: number;
}

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [originalUser, setOriginalUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_id: editingUser.voice_id,
          drop_image: editingUser.drop_image,
          country: editingUser.country,
          channel_points: editingUser.channel_points,
          drop_points: editingUser.drop_points,
          total_drops: editingUser.total_drops,
        }),
      });
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const startEditUser = (user: UserData) => {
    setEditingUser({ ...user });
    setOriginalUser({ ...user });
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setOriginalUser(null);
  };

  // Check if user has unsaved changes
  const hasUserChanges = (): boolean => {
    if (!editingUser || !originalUser) return false;
    return (
      editingUser.voice_id !== originalUser.voice_id ||
      editingUser.drop_image !== originalUser.drop_image ||
      editingUser.country !== originalUser.country ||
      editingUser.channel_points !== originalUser.channel_points ||
      editingUser.drop_points !== originalUser.drop_points ||
      editingUser.total_drops !== originalUser.total_drops
    );
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20">
          <Users className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">View and modify user data ({users.length} users)</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Editing: {editingUser.username}</CardTitle>
              <Button variant="ghost" size="sm" onClick={cancelEditUser}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Channel Points</Label>
                <Input
                  type="number"
                  value={editingUser.channel_points}
                  onChange={(e) => setEditingUser({ ...editingUser, channel_points: parseInt(e.target.value) || 0 })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Drop Points</Label>
                <Input
                  type="number"
                  value={editingUser.drop_points}
                  onChange={(e) => setEditingUser({ ...editingUser, drop_points: parseInt(e.target.value) || 0 })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Total Drops</Label>
                <Input
                  type="number"
                  value={editingUser.total_drops}
                  onChange={(e) => setEditingUser({ ...editingUser, total_drops: parseInt(e.target.value) || 0 })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Voice ID</Label>
                <Input
                  type="text"
                  value={editingUser.voice_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, voice_id: e.target.value || null })}
                  placeholder="Default voice"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Country</Label>
                <Input
                  type="text"
                  value={editingUser.country || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, country: e.target.value || null })}
                  placeholder="e.g., US"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Drop Image URL</Label>
                <Input
                  type="text"
                  value={editingUser.drop_image || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, drop_image: e.target.value || null })}
                  placeholder="Custom avatar URL"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveUser}
                disabled={saving || !hasUserChanges()}
                className="bg-primary hover:bg-primary/90"
                style={saving || !hasUserChanges() ? { backgroundColor: '#475569', opacity: 0.6, cursor: 'not-allowed' } : { backgroundColor: '#16a34a' }}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={cancelEditUser}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Username</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Channel Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Drop Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Total Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Drops</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Country</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.drop_image ? (
                        <img src={user.drop_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-foreground">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-secondary-foreground">{user.channel_points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-secondary-foreground">{user.drop_points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary">
                    {(user.channel_points + user.drop_points).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-secondary-foreground">{user.total_drops}</td>
                  <td className="px-4 py-3 text-center">
                    {user.country ? (
                      <span className="text-lg">{getFlagEmoji(user.country)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditUser(user)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No users match your search' : 'No users found'}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Field metadata for drop game settings
interface DropGameFieldMeta {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  useSlider?: boolean;
}

const GAME_FIELDS: DropGameFieldMeta[] = [
  { key: 'gravity', label: 'Gravity', description: 'Fall speed multiplier', min: 1, max: 20, step: 0.5, useSlider: true },
  { key: 'bounceDamping', label: 'Bounce Damping', description: 'Energy retained on bounce', min: 0, max: 1, step: 0.05, useSlider: true },
  { key: 'platformWidthRatio', label: 'Platform Width', description: 'Platform width as screen ratio', min: 0.05, max: 0.5, step: 0.01, useSlider: true },
  { key: 'avatarSize', label: 'Avatar Size', description: 'Size of player avatars', min: 30, max: 120, step: 5, unit: 'px', useSlider: true },
  { key: 'usernameFontSize', label: 'Username Font Size', description: 'Font size for usernames', min: 12, max: 36, step: 1, unit: 'px', useSlider: true },
  { key: 'minHorizontalVelocity', label: 'Min Horizontal Speed', description: 'Minimum horizontal movement', min: 0, max: 500, step: 10, unit: 'px/s' },
  { key: 'maxHorizontalVelocity', label: 'Max Horizontal Speed', description: 'Maximum horizontal movement', min: 100, max: 1000, step: 25, unit: 'px/s' },
  { key: 'horizontalDrift', label: 'Horizontal Drift', description: 'Random drift during fall', min: 0, max: 300, step: 10, unit: 'px' },
  { key: 'cleanupDelay', label: 'Cleanup Delay', description: 'Time before removing landed players', min: 1000, max: 30000, step: 1000, unit: 'ms' },
];

const SCORING_FIELDS: DropGameFieldMeta[] = [
  { key: 'basePoints', label: 'Base Points', description: 'Minimum points for landing', min: 1, max: 100, step: 5, unit: 'pts', useSlider: true },
  { key: 'centerBonusPoints', label: 'Center Bonus', description: 'Extra points for perfect landing', min: 0, max: 500, step: 10, unit: 'pts', useSlider: true },
];

const PHYSICS_FIELDS: DropGameFieldMeta[] = [
  { key: 'explosionRadius', label: 'TNT Explosion Radius', description: 'Range of explosion effect', min: 500, max: 5000, step: 100, unit: 'px', useSlider: true },
  { key: 'explosionForce', label: 'TNT Explosion Force', description: 'Push strength of explosion', min: 500, max: 3000, step: 100, useSlider: true },
  { key: 'explosionUpwardBoost', label: 'TNT Upward Boost', description: 'Upward force from explosion', min: 0, max: 1000, step: 50, useSlider: true },
  { key: 'ghostDuration', label: 'Ghost Duration', description: 'How long ghost mode lasts', min: 1000, max: 15000, step: 500, unit: 'ms', useSlider: true },
  { key: 'boostDuration', label: 'Speed Boost Duration', description: 'How long speed boost lasts', min: 1000, max: 10000, step: 500, unit: 'ms', useSlider: true },
  { key: 'powerDropGravityMultiplier', label: 'Power Drop Gravity', description: 'Gravity multiplier for power drop', min: 1, max: 10, step: 0.5, unit: 'x', useSlider: true },
];

function DropGameTab({ token }: { token: string }) {
  const [config, setConfig] = useState<DropGameConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<DropGameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetRecently, setResetRecently] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/dropgame', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep copy
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch('/api/admin/dropgame', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      setOriginalConfig(JSON.parse(JSON.stringify(config))); // Update original after save
      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  // Check if config has unsaved changes
  const hasConfigChanges = (): boolean => {
    if (!config || !originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  // Reset drop game state (clear stuck players)
  const resetDropGame = async () => {
    setResetting(true);
    try {
      await fetch('/api/admin/dropgame', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setResetRecently(true);
      setTimeout(() => setResetRecently(false), 2000);
    } catch (err) {
      console.error('Failed to reset drop game:', err);
    } finally {
      setResetting(false);
    }
  };

  const updateGameValue = (key: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      game: { ...config.game, [key]: value },
    });
  };

  const updateScoringValue = (key: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      scoring: { ...config.scoring, [key]: value },
    });
  };

  const updatePhysicsValue = (key: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      physics: { ...config.physics, [key]: value },
    });
  };

  if (loading || !config) {
    return <div className="text-center py-8 text-muted-foreground">Loading config...</div>;
  }

  const renderField = (
    field: DropGameFieldMeta,
    value: number,
    onChange: (key: string, value: number) => void
  ) => (
    <Card key={field.key} className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">{field.label}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              onChange={(e) => onChange(field.key, parseFloat(e.target.value) || 0)}
              className="w-24 text-right bg-secondary border-border"
              style={{ backgroundColor: '#334155', borderColor: '#475569', color: '#ffffff' }}
            />
            {field.unit && <span className="text-sm text-muted-foreground min-w-[40px]">{field.unit}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {field.useSlider && (
          <div className="flex flex-col gap-3">
            <Slider
              value={[value]}
              min={field.min}
              max={field.max}
              step={field.step}
              onValueChange={(val) => onChange(field.key, val[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.min}{field.unit ? ` ${field.unit}` : ''}</span>
              <span>{field.max}{field.unit ? ` ${field.unit}` : ''}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{field.description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div>
      {/* Header with Save Button */}
      <div className="flex items-center justify-between" style={{ marginBottom: '32px' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
          >
            <Gamepad2 className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Drop Game Configuration</h2>
            <p className="text-sm text-muted-foreground">Tune game physics, scoring, and powerup mechanics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {resetRecently && (
            <div className="flex items-center gap-1.5 text-accent-foreground animate-pulse">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Reset!</span>
            </div>
          )}
          {savedRecently && (
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Saved!</span>
            </div>
          )}
          <Button
            onClick={resetDropGame}
            disabled={resetting}
            className="bg-destructive hover:bg-destructive/90"
            style={resetting ? { backgroundColor: '#475569', opacity: 0.6, cursor: 'not-allowed' } : { backgroundColor: '#dc2626' }}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset State'}
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving || !hasConfigChanges()}
            className="bg-primary hover:bg-primary/90"
            style={saving || !hasConfigChanges() ? { backgroundColor: '#475569', opacity: 0.6, cursor: 'not-allowed' } : { backgroundColor: '#16a34a' }}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* Game Settings Section */}
      <section style={{ marginBottom: '48px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          >
            <span className="text-lg">🎮</span>
          </div>
          <h3 className="text-lg font-semibold text-primary">Game Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_FIELDS.map((field) =>
            renderField(field, config.game[field.key as keyof typeof config.game], updateGameValue)
          )}
        </div>
      </section>

      {/* Scoring Section */}
      <section style={{ marginBottom: '48px', paddingTop: '32px', borderTop: '1px solid #475569' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)' }}
          >
            <span className="text-lg">🏆</span>
          </div>
          <h3 className="text-lg font-semibold text-accent-foreground">Scoring Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCORING_FIELDS.map((field) =>
            renderField(field, config.scoring[field.key as keyof typeof config.scoring], updateScoringValue)
          )}
        </div>
      </section>

      {/* Physics Section */}
      <section style={{ paddingTop: '32px', borderTop: '1px solid #475569' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
          >
            <span className="text-lg">⚡</span>
          </div>
          <h3 className="text-lg font-semibold text-primary">Physics & Powerups</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHYSICS_FIELDS.map((field) =>
            renderField(field, config.physics[field.key as keyof typeof config.physics], updatePhysicsValue)
          )}
        </div>
      </section>
    </div>
  );
}

// Clean color picker component
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
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

// Color pair component for related colors
function ColorPair({
  title,
  bgLabel,
  bgValue,
  onBgChange,
  fgLabel,
  fgValue,
  onFgChange,
}: {
  title: string;
  bgLabel: string;
  bgValue: string;
  onBgChange: (value: string) => void;
  fgLabel: string;
  fgValue: string;
  onFgChange: (value: string) => void;
}) {
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

function ThemeTab({ token }: { token: string }) {
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
                : 'bg-primary text-foreground hover:bg-primary/80 shadow-lg shadow-green-500/25'
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

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'powerups' | 'dropgame' | 'users' | 'theme'>('settings');

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setVerifying(false);
    }
  }, []);

  const verifyToken = async (t: string) => {
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.valid) {
        setToken(t);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (err) {
      localStorage.removeItem('adminToken');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Verifying session...</div>
      </div>
    );
  }

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'powerups' as const, label: 'Powerups', icon: Zap },
    { id: 'dropgame' as const, label: 'Drop Game', icon: Gamepad2 },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'theme' as const, label: 'Theme', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-foreground'
                    : 'bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'settings' && <SettingsTab token={token} />}
        {activeTab === 'powerups' && <PowerupsTab token={token} />}
        {activeTab === 'dropgame' && <DropGameTab token={token} />}
        {activeTab === 'users' && <UsersTab token={token} />}
        {activeTab === 'theme' && <ThemeTab token={token} />}
      </main>
    </div>
  );
}
