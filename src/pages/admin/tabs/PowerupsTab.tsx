import { useState, useEffect } from 'react';
import { Zap, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PowerupConfig } from '../types';

interface PowerupsTabProps {
  token: string;
}

export function PowerupsTab({ token }: PowerupsTabProps) {
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
      if (!powerup) return;
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
    const existing = editPowerups[id];
    if (!existing) return;
    setEditPowerups({
      ...editPowerups,
      [id]: {
        ...existing,
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
