import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Gamepad2, Mic, Terminal, User } from 'lucide-react';

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { href: '/profile-login', label: 'Profile', icon: User },
    { href: '/commands', label: 'Commands', icon: Terminal },
    { href: '/voicelist', label: 'Voices', icon: Mic },
    { href: '/drop-game-rules', label: 'Drop Game', icon: Gamepad2 },
  ];

  const isActive = (href: string) => {
    if (href === '/profile-login') {
      return location.pathname.startsWith('/profile');
    }
    return location.pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-bold text-xl text-white tracking-tight">
            Kick<span className="text-green-400">Overlay</span>
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
                    ? 'bg-green-500/10 text-green-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
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
          className="mobile-nav-toggle p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {open && (
        <div className="mobile-nav-dropdown border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl">
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
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
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
