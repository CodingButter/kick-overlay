import { Link } from 'react-router-dom';
import { User, Terminal, Mic, Gamepad2, Settings, ChevronRight, Coins, Gift, MessageCircle, Clock, Zap, Target } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/context/ThemeContext';

interface FeatureCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  brandColor: string;
}

function FeatureCard({ to, icon: Icon, title, description, brandColor }: FeatureCardProps) {
  return (
    <Link
      to={to}
      className="group bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all hover:shadow-lg"
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <Icon className="w-6 h-6" style={{ color: brandColor }} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <div className="flex items-center text-sm font-medium" style={{ color: brandColor }}>
        Explore <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

export function HomePage() {
  const { theme } = useTheme();

  const features = [
    {
      to: '/profile-login',
      icon: User,
      title: 'Your Profile',
      description: 'View your stats, earn channel points, buy powerups, and customize your TTS voice and drop game avatar.',
    },
    {
      to: '/commands',
      icon: Terminal,
      title: 'Chat Commands',
      description: 'Browse all available bot commands. Copy them with one click and use them in chat!',
    },
    {
      to: '/voicelist',
      icon: Mic,
      title: 'TTS Voices',
      description: 'Preview and choose from dozens of text-to-speech voices. Find the perfect voice for your messages!',
    },
    {
      to: '/drop-game-rules',
      icon: Gamepad2,
      title: 'Drop Game',
      description: 'Learn about the drop game! Compete with other chatters, land on the platform, and win prizes.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 py-16 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6"
              style={{ backgroundColor: theme.brandColor, color: theme.brandColorForeground }}
            >
              K
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Welcome to <span style={{ color: theme.brandColor }}>{theme.siteName}{theme.siteNameAccent}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your complete stream companion. Interact with the stream through games,
              custom TTS voices, chat commands, and more!
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature) => (
            <FeatureCard
              key={feature.to}
              to={feature.to}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              brandColor={theme.brandColor}
            />
          ))}
        </div>

        {/* Points Economy Section */}
        <div className="bg-card rounded-xl p-8 border border-border mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${theme.brandColor}20` }}
            >
              <Coins className="w-5 h-5" style={{ color: theme.brandColor }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Channel Points</h2>
              <p className="text-muted-foreground text-sm">Earn points, unlock rewards!</p>
            </div>
          </div>

          {/* Earning Points */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">💰</span> How to Earn Points
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Chat Messages</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.brandColor }}>25 pts</p>
                <p className="text-sm text-muted-foreground">Per message while stream is live</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Watch Time</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.brandColor }}>5 pts</p>
                <p className="text-sm text-muted-foreground">Per minute while actively watching</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Drop Game</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: theme.brandColor }}>10-100+ pts</p>
                <p className="text-sm text-muted-foreground">Land on the platform to win!</p>
              </div>
            </div>
          </div>

          {/* Support Bonuses */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">🎁</span> Support Bonuses
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Show your support and earn massive point bonuses!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500/10 to-transparent rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-foreground">Subscribe</span>
                </div>
                <p className="text-2xl font-bold text-green-500">2,000 pts</p>
                <p className="text-sm text-muted-foreground">One-time new sub bonus</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-foreground">Renew Sub</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">1,000 pts</p>
                <p className="text-sm text-muted-foreground">Each month you renew</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-transparent rounded-lg p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-pink-500" />
                  <span className="font-medium text-foreground">Gift Subs</span>
                </div>
                <p className="text-2xl font-bold text-pink-500">1,500 pts</p>
                <p className="text-sm text-muted-foreground">Per sub you gift</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-foreground">Tip Kicks</span>
                </div>
                <p className="text-2xl font-bold text-yellow-500">100 pts</p>
                <p className="text-sm text-muted-foreground">Per Kick you tip</p>
              </div>
            </div>
          </div>

          {/* What You Can Buy */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">🛒</span> Spend Your Points
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">🎤 Text-to-Speech (!say)</p>
                    <p className="text-sm text-muted-foreground">Get your message read aloud on stream</p>
                  </div>
                  <span className="font-bold" style={{ color: theme.brandColor }}>500 pts</span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">💣 TNT Powerup</p>
                    <p className="text-sm text-muted-foreground">Explode and push other players away</p>
                  </div>
                  <span className="font-bold" style={{ color: theme.brandColor }}>500 pts</span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">🛡️ Shield Powerup</p>
                    <p className="text-sm text-muted-foreground">Block explosions and stay on course</p>
                  </div>
                  <span className="font-bold" style={{ color: theme.brandColor }}>400 pts</span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">⚡ Power Drop</p>
                    <p className="text-sm text-muted-foreground">Drop straight down at 3x speed</p>
                  </div>
                  <span className="font-bold" style={{ color: theme.brandColor }}>300 pts</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              <Link to="/commands" className="text-primary hover:underline">View all commands</Link> ·
              <Link to="/drop-game-rules" className="text-primary hover:underline ml-1">Drop game rules</Link>
            </p>
          </div>

          {/* Gambling Section */}
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">🎰</span> Feeling Lucky?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Risk your points for a chance to win big!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-transparent rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎲</span>
                  <span className="font-medium text-foreground">!roll &lt;amount&gt;</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Roll 1-10: <span className="text-amber-400 font-bold">JACKPOT 5x!</span></p>
                  <p>Roll 11-50: <span className="text-green-400">Win 2x</span></p>
                  <p>Roll 51-100: <span className="text-red-400">Lose bet</span></p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-transparent rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🪙</span>
                  <span className="font-medium text-foreground">!coinflip &lt;amount&gt;</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Call heads or tails</p>
                  <p>Win: <span className="text-green-400 font-bold">Double your bet!</span></p>
                  <p>Lose: <span className="text-red-400">Lose your bet</span></p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-transparent rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚔️</span>
                  <span className="font-medium text-foreground">!duel @user &lt;amount&gt;</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Challenge another chatter!</p>
                  <p>They have 60s to <span className="text-orange-400">!accept</span></p>
                  <p>Winner takes <span className="text-green-400 font-bold">all the points!</span></p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Gambling: Min 50 pts · Max 10,000 pts | Duels: Min 100 pts · Max 5,000 pts
            </p>
          </div>
        </div>

        {/* Quick Start Section */}
        <div className="bg-card rounded-xl p-8 border border-border mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: theme.brandColor, color: theme.brandColorForeground }}
              >
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Join the Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Head to the stream and start chatting. You'll automatically start earning points!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: theme.brandColor, color: theme.brandColorForeground }}
              >
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Use Commands</h3>
                <p className="text-sm text-muted-foreground">
                  Try <code className="bg-secondary px-1 rounded">!say</code> for TTS or <code className="bg-secondary px-1 rounded">!drop</code> to play the drop game.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: theme.brandColor, color: theme.brandColorForeground }}
              >
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Customize</h3>
                <p className="text-sm text-muted-foreground">
                  Visit your profile to set a custom voice, avatar, and spend your points on powerups!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Streamer Section */}
        <div className="bg-gradient-to-br from-card to-secondary/30 rounded-xl p-8 border border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Are you the streamer?</h2>
              <p className="text-muted-foreground">
                Access the admin panel to configure your overlay, manage powerups, customize themes, and more.
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors shrink-0"
              style={{
                backgroundColor: theme.brandColor,
                color: theme.brandColorForeground
              }}
            >
              <Settings className="w-5 h-5" />
              Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
