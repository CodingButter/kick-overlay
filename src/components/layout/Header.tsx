import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Gamepad2, Mic, Terminal, User, Book } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { theme } = useTheme();

  const navItems = [
    { href: '/profile-login', label: 'Profile', icon: User },
    { href: '/commands', label: 'Commands', icon: Terminal },
    { href: '/voicelist', label: 'Voices', icon: Mic },
    { href: '/drop-game-rules', label: 'Drop Game', icon: Gamepad2 },
    { href: '/wiki', label: 'Wiki', icon: Book },
  ];

  const isActive = (href: string) => {
    if (href === '/profile-login') {
      return location.pathname.startsWith('/profile');
    }
    return location.pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-bold text-xl text-foreground tracking-tight">
            {theme.siteName}<span style={{ color: theme.brandColor }}>{theme.siteNameAccent}</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="desktop-nav items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
                style={active ? { backgroundColor: `${theme.brandColor}15`, color: theme.brandColor } : undefined}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Nav Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="mobile-nav-toggle p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {open && (
        <div className="mobile-nav-dropdown border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col p-3 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                    active
                      ? ''
                      : 'text-foreground hover:bg-card hover:text-foreground'
                  }`}
                  style={active ? { backgroundColor: `${theme.brandColor}15`, color: theme.brandColor } : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
