import { useState, useEffect } from 'react';
import { Gamepad2, Save, RefreshCw, CheckCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DropGameConfig, DropGameFieldMeta } from '../types';
import { GAME_FIELDS, SCORING_FIELDS, PHYSICS_FIELDS } from '../types';

interface DropGameTabProps {
  token: string;
}

export function DropGameTab({ token }: DropGameTabProps) {
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
              onValueChange={(val) => onChange(field.key, val[0] ?? 0)}
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
