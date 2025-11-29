import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Lock, Settings, Zap, Gamepad2, LogOut, Save, RefreshCw } from 'lucide-react';

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

function SettingsTab({ token }: { token: string }) {
  const [settings, setSettings] = useState<OverlaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

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

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value: editValues[key] }),
      });
      await fetchSettings();
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSaving(null);
    }
  };

  const formatLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Overlay Settings</h2>

      {settings.map((setting) => (
        <div key={setting.key} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-white font-medium">{formatLabel(setting.key)}</h3>
              {setting.description && (
                <p className="text-sm text-slate-400">{setting.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={editValues[setting.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
            />
            <button
              onClick={() => saveSetting(setting.key)}
              disabled={saving === setting.key || editValues[setting.key] === setting.value}
              className="bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ))}
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

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading powerups...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Powerup Configuration</h2>

      {powerups.map((powerup) => {
        const edit = editPowerups[powerup.id];
        if (!edit) return null;

        return (
          <div key={powerup.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{powerup.emoji}</span>
              <div className="flex-1">
                <h3 className="text-white font-bold">{powerup.name}</h3>
                <p className="text-sm text-slate-400">{powerup.effect}</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={edit.enabled === 1}
                  onChange={(e) => updatePowerup(powerup.id, 'enabled', e.target.checked ? 1 : 0)}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                />
                <span className="text-sm text-slate-400">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={edit.name}
                  onChange={(e) => updatePowerup(powerup.id, 'name', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cost (points)</label>
                <input
                  type="number"
                  value={edit.cost}
                  onChange={(e) => updatePowerup(powerup.id, 'cost', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={edit.description}
                onChange={(e) => updatePowerup(powerup.id, 'description', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                rows={2}
              />
            </div>

            {Object.keys(edit.variables).length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Variables</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(edit.variables).map(([key, value]) => (
                    <div key={key} className="bg-slate-700/50 rounded p-2">
                      <label className="block text-xs text-slate-500 mb-1">{key}</label>
                      <input
                        type="number"
                        value={value as number}
                        onChange={(e) => {
                          const newVars = { ...edit.variables, [key]: parseInt(e.target.value) || 0 };
                          updatePowerup(powerup.id, 'variables', newVars);
                        }}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => savePowerup(powerup.id)}
              disabled={saving === powerup.id}
              className="bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving === powerup.id ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DropGameTab({ token }: { token: string }) {
  const [config, setConfig] = useState<DropGameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateGameValue = (key: keyof DropGameConfig['game'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      game: { ...config.game, [key]: value },
    });
  };

  const updateScoringValue = (key: keyof DropGameConfig['scoring'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      scoring: { ...config.scoring, [key]: value },
    });
  };

  const updatePhysicsValue = (key: keyof DropGameConfig['physics'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      physics: { ...config.physics, [key]: value },
    });
  };

  if (loading || !config) {
    return <div className="text-center py-8 text-slate-400">Loading config...</div>;
  }

  const gameFields = [
    { key: 'gravity', label: 'Gravity', description: 'Fall speed multiplier' },
    { key: 'minHorizontalVelocity', label: 'Min Horizontal Speed', description: 'Minimum horizontal movement speed' },
    { key: 'maxHorizontalVelocity', label: 'Max Horizontal Speed', description: 'Maximum horizontal movement speed' },
    { key: 'horizontalDrift', label: 'Horizontal Drift', description: 'Random drift amount during fall' },
    { key: 'bounceDamping', label: 'Bounce Damping', description: 'Energy retained on bounce (0-1)' },
    { key: 'avatarSize', label: 'Avatar Size', description: 'Size of player avatars in pixels' },
    { key: 'platformWidthRatio', label: 'Platform Width Ratio', description: 'Platform width as screen ratio' },
    { key: 'cleanupDelay', label: 'Cleanup Delay (ms)', description: 'Time before removing landed players' },
    { key: 'usernameFontSize', label: 'Username Font Size', description: 'Font size for usernames' },
  ] as const;

  const scoringFields = [
    { key: 'basePoints', label: 'Base Points', description: 'Minimum points for landing' },
    { key: 'centerBonusPoints', label: 'Center Bonus Points', description: 'Extra points for center landing' },
  ] as const;

  const physicsFields = [
    { key: 'explosionRadius', label: 'TNT Explosion Radius', description: 'Range of TNT explosion effect' },
    { key: 'explosionForce', label: 'TNT Explosion Force', description: 'Push strength of TNT explosion' },
    { key: 'explosionUpwardBoost', label: 'TNT Upward Boost', description: 'Upward force from TNT' },
    { key: 'ghostDuration', label: 'Ghost Duration (ms)', description: 'How long ghost mode lasts' },
    { key: 'boostDuration', label: 'Speed Boost Duration (ms)', description: 'How long speed boost lasts' },
    { key: 'powerDropGravityMultiplier', label: 'Power Drop Gravity', description: 'Gravity multiplier for power drop' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Drop Game Configuration</h2>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Game Settings */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-bold text-green-400 mb-4">Game Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameFields.map(({ key, label, description }) => (
            <div key={key}>
              <label className="block text-sm text-white mb-1">{label}</label>
              <input
                type="number"
                step={key === 'bounceDamping' || key === 'platformWidthRatio' ? '0.01' : '1'}
                value={config.game[key]}
                onChange={(e) => updateGameValue(key, parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
              />
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Settings */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-bold text-green-400 mb-4">Scoring Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scoringFields.map(({ key, label, description }) => (
            <div key={key}>
              <label className="block text-sm text-white mb-1">{label}</label>
              <input
                type="number"
                value={config.scoring[key]}
                onChange={(e) => updateScoringValue(key, parseInt(e.target.value) || 0)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
              />
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Physics Settings */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-bold text-green-400 mb-4">Physics Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {physicsFields.map(({ key, label, description }) => (
            <div key={key}>
              <label className="block text-sm text-white mb-1">{label}</label>
              <input
                type="number"
                value={config.physics[key]}
                onChange={(e) => updatePhysicsValue(key, parseInt(e.target.value) || 0)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
              />
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'powerups' | 'dropgame'>('settings');

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
      </main>
    </div>
  );
}
