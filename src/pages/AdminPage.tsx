import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Lock, Settings, Zap, Gamepad2, LogOut, Save, RefreshCw, FolderOpen, Users, Trash2, Search, X, Check, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Lock className="w-8 h-8 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
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
    return <div className="text-center py-8 text-slate-400">Loading settings...</div>;
  }

  // Separate AI settings from other settings
  const generalSettings = settings.filter(s => !aiSettings.includes(s.key));
  const aiSettingsData = settings.filter(s => aiSettings.includes(s.key));

  const renderSetting = (setting: OverlaySetting) => {
    const meta = getSettingMeta(setting.key);
    const isEnabled = editValues[setting.key] === 'true';
    const numValue = parseInt(editValues[setting.key] || '0', 10);

    return (
      <Card key={setting.key} className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-white">
                {formatLabel(setting.key)}
              </CardTitle>
              {setting.description && (
                <CardDescription className="text-slate-400">
                  {setting.description}
                </CardDescription>
              )}
            </div>
            {/* Boolean toggle switch */}
            {meta.type === 'boolean' && (
              <div className="flex items-center gap-3">
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
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
              <div className="space-y-4">
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
                      className="w-24 text-right bg-slate-700 border-slate-600"
                    />
                    {meta.unit && (
                      <span className="text-sm text-slate-400 min-w-[60px]">{meta.unit}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{meta.min ?? 0}{meta.unit ? ` ${meta.unit}` : ''}</span>
                  <span>{meta.max ?? 100}{meta.unit ? ` ${meta.unit}` : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                  {savedRecently[setting.key] && (
                    <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Saved</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Path input */}
            {meta.type === 'path' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-1">
                    <div className="flex items-center justify-center w-12 bg-slate-600 rounded-l-md border border-r-0 border-slate-500">
                      <FolderOpen className="h-5 w-5 text-slate-300" />
                    </div>
                    <Input
                      type="text"
                      value={editValues[setting.key] || ''}
                      onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                      placeholder={meta.placeholder || ''}
                      className="flex-1 font-mono text-sm bg-slate-700 border-slate-600 rounded-l-none"
                    />
                  </div>
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Saved</span>
                  </div>
                )}
              </div>
            )}

            {/* Default string input */}
            {meta.type === 'string' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={editValues[setting.key] || ''}
                    onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                    placeholder={meta.placeholder || ''}
                    className="flex-1 bg-slate-700 border-slate-600"
                  />
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === setting.key ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {savedRecently[setting.key] && (
                  <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
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
              <h2 className="text-lg font-semibold text-white">AI Chatbot</h2>
              <p className="text-sm text-slate-400">Configure the Claude AI assistant for chat</p>
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
            <Settings className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Overlay Settings</h2>
            <p className="text-sm text-slate-400">General overlay configuration</p>
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
    return <div className="text-center py-8 text-slate-400">Loading powerups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/20">
          <Zap className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Powerup Configuration</h2>
          <p className="text-sm text-slate-400">Manage drop game powerups and their effects</p>
        </div>
      </div>

      {powerups.map((powerup) => {
        const edit = editPowerups[powerup.id];
        if (!edit) return null;

        return (
          <Card key={powerup.id} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-slate-700/50">
                  <span className="text-3xl">{powerup.emoji}</span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg text-white">{powerup.name}</CardTitle>
                  <CardDescription className="text-slate-400">{powerup.effect}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`enabled-${powerup.id}`} className="text-sm text-slate-400">
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

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Name</Label>
                  <Input
                    type="text"
                    value={edit.name}
                    onChange={(e) => updatePowerup(powerup.id, 'name', e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Cost (points)</Label>
                  <Input
                    type="number"
                    value={edit.cost}
                    onChange={(e) => updatePowerup(powerup.id, 'cost', parseInt(e.target.value) || 0)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Description</Label>
                <textarea
                  value={edit.description}
                  onChange={(e) => updatePowerup(powerup.id, 'description', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                />
              </div>

            {Object.keys(edit.variables).length > 0 && (
              <div className="mb-4">
                <Label className="text-slate-400 mb-3 block">Variables</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(edit.variables).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs text-slate-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <Input
                        type="number"
                        value={value as number}
                        onChange={(e) => {
                          const newVars = { ...edit.variables, [key]: parseInt(e.target.value) || 0 };
                          updatePowerup(powerup.id, 'variables', newVars);
                        }}
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

              <Button
                onClick={() => savePowerup(powerup.id)}
                disabled={saving === powerup.id || !hasChanges(powerup.id)}
                className="bg-green-600 hover:bg-green-700"
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
    return <div className="text-center py-8 text-slate-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">User Management</h2>
          <p className="text-sm text-slate-400">View and modify user data ({users.length} users)</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-700 border-slate-600"
        />
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Editing: {editingUser.username}</CardTitle>
              <Button variant="ghost" size="sm" onClick={cancelEditUser}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Channel Points</Label>
                <Input
                  type="number"
                  value={editingUser.channel_points}
                  onChange={(e) => setEditingUser({ ...editingUser, channel_points: parseInt(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Drop Points</Label>
                <Input
                  type="number"
                  value={editingUser.drop_points}
                  onChange={(e) => setEditingUser({ ...editingUser, drop_points: parseInt(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Total Drops</Label>
                <Input
                  type="number"
                  value={editingUser.total_drops}
                  onChange={(e) => setEditingUser({ ...editingUser, total_drops: parseInt(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Voice ID</Label>
                <Input
                  type="text"
                  value={editingUser.voice_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, voice_id: e.target.value || null })}
                  placeholder="Default voice"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Country</Label>
                <Input
                  type="text"
                  value={editingUser.country || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, country: e.target.value || null })}
                  placeholder="e.g., US"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Drop Image URL</Label>
                <Input
                  type="text"
                  value={editingUser.drop_image || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, drop_image: e.target.value || null })}
                  placeholder="Custom avatar URL"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveUser}
                disabled={saving || !hasUserChanges()}
                className="bg-green-600 hover:bg-green-700"
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
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Username</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Channel Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Drop Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Total Pts</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Drops</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-400">Country</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.drop_image ? (
                        <img src={user.drop_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{user.channel_points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{user.drop_points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-400">
                    {(user.channel_points + user.drop_points).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{user.total_drops}</td>
                  <td className="px-4 py-3 text-center">
                    {user.country ? (
                      <span className="text-lg">{getFlagEmoji(user.country)}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditUser(user)}
                        className="text-slate-400 hover:text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
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
          <div className="text-center py-8 text-slate-400">
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
    return <div className="text-center py-8 text-slate-400">Loading config...</div>;
  }

  const renderField = (
    field: DropGameFieldMeta,
    value: number,
    onChange: (key: string, value: number) => void
  ) => (
    <Card key={field.key} className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-white">{field.label}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              onChange={(e) => onChange(field.key, parseFloat(e.target.value) || 0)}
              className="w-24 text-right bg-slate-700 border-slate-600"
              style={{ backgroundColor: '#334155', borderColor: '#475569', color: '#ffffff' }}
            />
            {field.unit && <span className="text-sm text-slate-400 min-w-[40px]">{field.unit}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {field.useSlider && (
          <div className="space-y-3">
            <Slider
              value={[value]}
              min={field.min}
              max={field.max}
              step={field.step}
              onValueChange={(val) => onChange(field.key, val[0])}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{field.min}{field.unit ? ` ${field.unit}` : ''}</span>
              <span>{field.max}{field.unit ? ` ${field.unit}` : ''}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">{field.description}</p>
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
            <Gamepad2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Drop Game Configuration</h2>
            <p className="text-sm text-slate-400">Tune game physics, scoring, and powerup mechanics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {resetRecently && (
            <div className="flex items-center gap-1.5 text-yellow-400 animate-pulse">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Reset!</span>
            </div>
          )}
          {savedRecently && (
            <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Saved!</span>
            </div>
          )}
          <Button
            onClick={resetDropGame}
            disabled={resetting}
            className="bg-red-600 hover:bg-red-700"
            style={resetting ? { backgroundColor: '#475569', opacity: 0.6, cursor: 'not-allowed' } : { backgroundColor: '#dc2626' }}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset State'}
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving || !hasConfigChanges()}
            className="bg-green-600 hover:bg-green-700"
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
          <h3 className="text-lg font-semibold text-green-400">Game Settings</h3>
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
          <h3 className="text-lg font-semibold text-yellow-400">Scoring Settings</h3>
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
          <h3 className="text-lg font-semibold text-purple-400">Physics & Powerups</h3>
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

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'powerups' | 'dropgame' | 'users'>('settings');

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Verifying session...</div>
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
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
      </main>
    </div>
  );
}
