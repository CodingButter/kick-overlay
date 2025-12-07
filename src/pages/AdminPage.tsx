import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Settings, Zap, Gamepad2, LogOut, Users, Palette, Layout, Book } from 'lucide-react';

// Import extracted components
import { LoginForm } from './admin/components/LoginForm';
import { SettingsTab } from './admin/tabs/SettingsTab';
import { PowerupsTab } from './admin/tabs/PowerupsTab';
import { DropGameTab } from './admin/tabs/DropGameTab';
import { UsersTab } from './admin/tabs/UsersTab';
import { ThemeTab } from './admin/tabs/ThemeTab';
import { OverlayTab } from './admin/tabs/OverlayTab';
import type { AdminTab } from './admin/types';

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    // Restore tab from localStorage on initial load
    const savedTab = localStorage.getItem('adminActiveTab') as AdminTab | null;
    return savedTab && ['settings', 'powerups', 'dropgame', 'users', 'theme', 'overlay'].includes(savedTab)
      ? savedTab
      : 'settings';
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

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
    { id: 'overlay' as const, label: 'Overlay', icon: Layout },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/wiki"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Book className="w-4 h-4" />
              Documentation
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
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
                    ? 'bg-primary text-primary-foreground'
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
        {activeTab === 'overlay' && <OverlayTab token={token} />}
      </main>
    </div>
  );
}
