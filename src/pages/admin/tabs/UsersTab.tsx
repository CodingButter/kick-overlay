import { useState, useEffect } from 'react';
import { Users, RefreshCw, Search, X, Trash2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserData } from '../types';

// Helper function to convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface UsersTabProps {
  token: string;
}

export function UsersTab({ token }: UsersTabProps) {
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
