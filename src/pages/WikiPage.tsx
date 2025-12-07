import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Book,
  Rocket,
  Settings,
  Gamepad2,
  MessageCircle,
  Gift,
  Coins,
  Swords,
  Dice5,
  Volume2,
  Bot,
  Palette,
  Target,
  Users,
  Monitor,
  Database,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Home,
  ExternalLink,
  Zap,
  Shield,
  Bomb,
  Ghost,
  Magnet,
  ArrowDown,
} from 'lucide-react';

interface WikiSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

function TableOfContents({ sections, activeSection, onSelect }: {
  sections: WikiSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border sticky top-24">
      <h3 className="font-semibold text-foreground mb-3 px-2 text-xs uppercase tracking-widest text-muted-foreground">
        On this page
      </h3>
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                onClick={() => onSelect(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{section.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="mb-12 scroll-mt-28">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="text-muted-foreground space-y-4 text-[15px] leading-relaxed pl-0.5">
        {children}
      </div>
    </section>
  );
}

function InfoBox({ type, children }: { type: 'tip' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    tip: 'bg-green-500/5 border border-green-500/20',
    warning: 'bg-yellow-500/5 border border-yellow-500/20',
    info: 'bg-blue-500/5 border border-blue-500/20',
  };

  const textColors = {
    tip: 'text-green-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const icons = {
    tip: Zap,
    warning: HelpCircle,
    info: Book,
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-lg p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${textColors[type]}`} />
        <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function CommandExample({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
        {command}
      </code>
      <span className="text-muted-foreground text-sm">
        {description}
      </span>
    </div>
  );
}

export function WikiPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections: WikiSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Rocket,
      content: (
        <div className="space-y-6">
          <p>
            Welcome to Kick Overlay! This guide will help you understand all the features available to make your stream more engaging.
          </p>

          <h3 className="text-lg font-semibold text-foreground">What is Kick Overlay?</h3>
          <p>
            Kick Overlay is a complete streaming toolkit that adds interactive features to your Kick.com stream:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Drop Game</strong> - Viewers drop avatars to earn points</li>
            <li><strong>Channel Points</strong> - A full economy system with earning and spending</li>
            <li><strong>Text-to-Speech</strong> - Let viewers speak on stream using points</li>
            <li><strong>Gambling & Duels</strong> - Fun betting games for engagement</li>
            <li><strong>AI Chatbot</strong> - Claude-powered bot that chats naturally</li>
            <li><strong>Custom Overlays</strong> - Beautiful displays for OBS</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/commands" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <MessageCircle className="w-4 h-4 text-primary" />
              Commands
            </Link>
            <Link to="/voicelist" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <Volume2 className="w-4 h-4 text-primary" />
              TTS Voices
            </Link>
            <Link to="/drop-game-rules" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <Gamepad2 className="w-4 h-4 text-primary" />
              Drop Rules
            </Link>
            <Link to="/admin" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <Settings className="w-4 h-4 text-primary" />
              Admin Panel
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <Home className="w-4 h-4 text-primary" />
              Home
            </Link>
            <Link to="/profile-login" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted px-3 py-2 rounded-lg text-sm transition-colors">
              <Users className="w-4 h-4 text-primary" />
              My Profile
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'channel-points',
      title: 'Channel Points',
      icon: Coins,
      content: (
        <div className="space-y-6">
          <p>
            Channel points are the currency of your stream. Viewers earn them passively and through activities, then spend them on fun features.
          </p>

          <h3 className="text-lg font-semibold text-foreground">How Viewers Earn Points</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground">Activity</th>
                  <th className="text-left py-2 text-muted-foreground">Points</th>
                  <th className="text-left py-2 text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Watching Stream</td>
                  <td className="py-2 text-green-400">+5/min</td>
                  <td className="py-2 text-muted-foreground">Passive while live</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Sending Chat Message</td>
                  <td className="py-2 text-green-400">+25</td>
                  <td className="py-2 text-muted-foreground">Per message</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Subscribing</td>
                  <td className="py-2 text-green-400">+2,000</td>
                  <td className="py-2 text-muted-foreground">New subscription</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Sub Renewal</td>
                  <td className="py-2 text-green-400">+1,000</td>
                  <td className="py-2 text-muted-foreground">Renewing your sub</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Gifting Subs</td>
                  <td className="py-2 text-green-400">+1,500</td>
                  <td className="py-2 text-muted-foreground">Per gift</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Tipping (Kicks)</td>
                  <td className="py-2 text-green-400">+100</td>
                  <td className="py-2 text-muted-foreground">Per Kick donated</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Drop Game</td>
                  <td className="py-2 text-green-400">+50-200</td>
                  <td className="py-2 text-muted-foreground">Based on landing</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Gambling Wins</td>
                  <td className="py-2 text-green-400">Variable</td>
                  <td className="py-2 text-muted-foreground">Win 2x-5x bet</td>
                </tr>
                <tr>
                  <td className="py-2">Duel Wins</td>
                  <td className="py-2 text-green-400">Variable</td>
                  <td className="py-2 text-muted-foreground">Winner takes all</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-foreground">How to Spend Points</h3>
          <div className="space-y-3">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">TTS Message (!say)</span>
                <span className="text-red-400">-500 points</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Have your message spoken on stream</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Powerups</span>
                <span className="text-red-400">-500 points each</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Special abilities for the drop game</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Gambling</span>
                <span className="text-yellow-400">Risk/Reward</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Bet points to win more (or lose them)</p>
            </div>
          </div>

          <InfoBox type="tip">
            <strong>Tip:</strong> Viewers can check their balance anytime with <code className="bg-background px-1 rounded">!points</code> in chat!
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'drop-game',
      title: 'Drop Game',
      icon: Gamepad2,
      content: (
        <div className="space-y-6">
          <p>
            The Drop Game is an interactive mini-game where viewers drop their avatar from the top of the screen and try to land on a platform to earn points.
          </p>

          <h3 className="text-lg font-semibold text-foreground">How to Play</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Type <code className="bg-secondary px-2 py-0.5 rounded">!drop</code> in chat</li>
            <li>Your avatar appears at a random position at the top</li>
            <li>It falls with physics-based movement (bouncing, drifting)</li>
            <li>Land on the platform to score points</li>
            <li>Land in the center for bonus points!</li>
          </ol>

          <h3 className="text-lg font-semibold text-foreground">Scoring</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-muted-foreground">50</div>
              <div className="text-sm text-muted-foreground">Edge Landing</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">100</div>
              <div className="text-sm text-muted-foreground">Near Center</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">200+</div>
              <div className="text-sm text-green-400">Perfect Center!</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-foreground">Powerups</h3>
          <p className="text-muted-foreground mb-4">
            Powerups are special abilities that can help you score better or interfere with other players. Buy them with points!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <Bomb className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <div className="font-medium">TNT</div>
                <p className="text-sm text-muted-foreground">Creates an explosion that pushes nearby players away</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <ArrowDown className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <div className="font-medium">Power Drop</div>
                <p className="text-sm text-muted-foreground">Stops horizontal movement, drops straight down fast</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <div className="font-medium">Shield</div>
                <p className="text-sm text-muted-foreground">Protects you from other players' powerups</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <Magnet className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <div className="font-medium">Magnet</div>
                <p className="text-sm text-muted-foreground">Pulls your dropper towards the platform center</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <Ghost className="w-6 h-6 text-gray-400 shrink-0" />
              <div>
                <div className="font-medium">Ghost</div>
                <p className="text-sm text-muted-foreground">Pass through other players without collision</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
              <Zap className="w-6 h-6 text-yellow-400 shrink-0" />
              <div>
                <div className="font-medium">Boost</div>
                <p className="text-sm text-muted-foreground">Increases your drop speed</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-foreground">Drop Commands</h3>
          <div className="space-y-2">
            <CommandExample command="!drop" description="Drop with your avatar" />
            <CommandExample command="!drop -buy tnt" description="Buy TNT powerup (500 pts)" />
            <CommandExample command="!drop -powerup tnt" description="Use TNT on next drop" />
            <CommandExample command="!drop -mine" description="Check your powerup inventory" />
            <CommandExample command="!dropstats" description="View your drop statistics" />
            <CommandExample command="!droptop" description="View the leaderboard" />
          </div>

          <h3 className="text-lg font-semibold text-foreground">Queue Mode (Mass Drops)</h3>
          <p className="text-muted-foreground mb-4">
            Instead of instant drops, viewers can queue up and all drop together when the streamer starts the drop!
          </p>
          <div className="space-y-2">
            <CommandExample command="!queuedrop" description="Join the waiting queue" />
            <CommandExample command="!queuedrop [emote]" description="Queue with a specific emote" />
            <CommandExample command="!leavedrop" description="Leave the queue" />
            <CommandExample command="!queuesize" description="Check how many are waiting" />
            <CommandExample command="!startdrop" description="Start the drop (streamer only)" />
            <CommandExample command="!clearqueue" description="Clear the queue (streamer only)" />
          </div>

          <InfoBox type="tip">
            <strong>How Queue Mode Works:</strong> Viewers join the queue with <code className="bg-background px-1 rounded">!queuedrop</code>, then the streamer triggers everyone to drop at once with <code className="bg-background px-1 rounded">!startdrop</code>. Great for organized drop events!
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'gambling',
      title: 'Gambling',
      icon: Dice5,
      content: (
        <div className="space-y-6">
          <p>
            Feeling lucky? Risk your points on games of chance! Two gambling commands are available: dice roll and coin flip.
          </p>

          <InfoBox type="warning">
            <strong>Warning:</strong> Gambling is risky! The house always has a slight edge. Only bet what you're willing to lose.
          </InfoBox>

          <h3 className="text-lg font-semibold text-foreground">Dice Roll (!roll)</h3>
          <p className="text-muted-foreground mb-4">
            Roll a 100-sided dice. Different ranges give different payouts:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <span className="font-mono text-green-400 w-20">1-10</span>
              <span className="text-green-400 font-bold">JACKPOT! 5x</span>
              <span className="text-muted-foreground text-sm ml-auto">10% chance</span>
            </div>
            <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <span className="font-mono text-blue-400 w-20">11-50</span>
              <span className="text-blue-400 font-bold">WIN! 2x</span>
              <span className="text-muted-foreground text-sm ml-auto">40% chance</span>
            </div>
            <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <span className="font-mono text-red-400 w-20">51-100</span>
              <span className="text-red-400 font-bold">LOSE</span>
              <span className="text-muted-foreground text-sm ml-auto">50% chance</span>
            </div>
          </div>

          <CommandExample command="!roll 100" description="Bet 100 points" />
          <CommandExample command="!gamble 500" description="Same as !roll (alias)" />
          <CommandExample command="!roll all" description="Bet all your points (yolo!)" />

          <h3 className="text-lg font-semibold text-foreground">Coin Flip (!coinflip)</h3>
          <p className="text-muted-foreground mb-4">
            Simple 50/50 chance. Heads you double, tails you lose.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">Heads</div>
              <div className="text-sm text-muted-foreground">Win 2x your bet</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">Tails</div>
              <div className="text-sm text-muted-foreground">Lose your bet</div>
            </div>
          </div>

          <CommandExample command="!coinflip 200" description="Flip for 200 points" />
          <CommandExample command="!flip 50" description="Same as !coinflip (alias)" />
          <CommandExample command="!cf 1000" description="Short alias" />

          <InfoBox type="info">
            <strong>Limits:</strong> Minimum bet is 10 points, maximum is 10,000 points. These can be adjusted by the streamer.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'duels',
      title: 'Duels',
      icon: Swords,
      content: (
        <div className="space-y-6">
          <p>
            Think you're luckier than another viewer? Challenge them to a duel! Winner takes both wagers.
          </p>

          <h3 className="text-lg font-semibold text-foreground">How Duels Work</h3>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <strong>Challenge</strong> - Use <code className="bg-secondary px-1 rounded">!duel @username 500</code> to challenge someone
            </li>
            <li>
              <strong>Wait</strong> - The challenged player has 60 seconds to respond
            </li>
            <li>
              <strong>Accept/Decline</strong> - They can <code className="bg-secondary px-1 rounded">!accept</code> or <code className="bg-secondary px-1 rounded">!decline</code>
            </li>
            <li>
              <strong>Battle</strong> - If accepted, a random winner is chosen (50/50)
            </li>
            <li>
              <strong>Payout</strong> - Winner receives both wagers!
            </li>
          </ol>

          <h3 className="text-lg font-semibold text-foreground">Duel Commands</h3>
          <div className="space-y-2">
            <CommandExample command="!duel @rival 500" description="Challenge @rival for 500 points" />
            <CommandExample command="!challenge @user 1000" description="Same as !duel (alias)" />
            <CommandExample command="!accept" description="Accept a pending duel against you" />
            <CommandExample command="!decline" description="Decline a duel challenge" />
            <CommandExample command="!cancel" description="Cancel your outgoing challenge" />
          </div>

          <h3 className="text-lg font-semibold text-foreground">Example Scenario</h3>
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div><span className="text-blue-400">Player1:</span> !duel @Player2 500</div>
            <div className="text-muted-foreground italic">Bot: Player1 challenges Player2 to a duel for 500 points! Type !accept to fight!</div>
            <div><span className="text-purple-400">Player2:</span> !accept</div>
            <div className="text-muted-foreground italic">Bot: Player2 accepts! *dice roll* Player1 wins 1000 points!</div>
          </div>

          <InfoBox type="tip">
            <strong>Strategy:</strong> Only duel if you're prepared to lose! It's a 50/50 chance either way.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'tts',
      title: 'Text-to-Speech',
      icon: Volume2,
      content: (
        <div className="space-y-6">
          <p>
            Make your message heard on stream! The TTS system uses ElevenLabs for high-quality, natural-sounding voices.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Using TTS</h3>
          <p className="text-muted-foreground mb-4">
            The basic command is <code className="bg-secondary px-2 py-0.5 rounded">!say &lt;your message&gt;</code>. Each use costs 500 points.
          </p>

          <CommandExample command="!say Hello everyone!" description="Speak a message (500 pts)" />
          <CommandExample command="!say -voice xyz123 Hi there" description="Use a specific voice" />
          <CommandExample command="!voices" description="Get link to voice list" />

          <h3 className="text-lg font-semibold text-foreground">Choosing Your Voice</h3>
          <p>
            There are 30+ voices available! Visit the{' '}
            <Link to="/voicelist" className="text-primary hover:underline">Voice List</Link>{' '}
            page to preview them and find your favorite.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Setting a Default Voice</h3>
          <p className="text-muted-foreground">
            You can set your preferred voice on your profile page so you don't need to specify it each time.
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Go to the <Link to="/profile-login" className="text-primary hover:underline">Login page</Link></li>
            <li>Verify your account with a code in chat</li>
            <li>Choose your default voice in profile settings</li>
            <li>Now your <code className="bg-secondary px-1 rounded">!say</code> commands use that voice!</li>
          </ol>

          <InfoBox type="info">
            <strong>Note:</strong> Messages are filtered for inappropriate content. Keep it clean!
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'ai-chatbot',
      title: 'AI Chatbot',
      icon: Bot,
      content: (
        <div className="space-y-6">
          <p>
            The stream includes an AI chatbot powered by Claude that can chat naturally with viewers and answer questions.
          </p>

          <h3 className="text-lg font-semibold text-foreground">How It Works</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>The AI reads all non-command chat messages</li>
            <li>It has context about the stream, commands, and recent conversation</li>
            <li>It responds naturally when appropriate (not to every message)</li>
            <li>It can answer questions about the stream, commands, or general topics</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground">Talking to the Bot</h3>
          <p className="text-muted-foreground">
            You don't need any special commands! Just chat naturally. The bot will respond when it has something relevant to say.
            It's designed to feel like a helpful community member, not an annoying auto-responder.
          </p>

          <h3 className="text-lg font-semibold text-foreground">What the Bot Knows</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>All available commands and how to use them</li>
            <li>The channel points system</li>
            <li>Drop game rules and powerups</li>
            <li>Recent chat context</li>
            <li>General knowledge (it can search the web)</li>
          </ul>

          <InfoBox type="tip">
            <strong>Pro tip:</strong> Ask the bot questions about commands or features if you're confused!
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'profiles',
      title: 'User Profiles',
      icon: Users,
      content: (
        <div className="space-y-6">
          <p>
            Every viewer has a profile page showing their stats, points, and customization options.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Profile Features</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Points Overview</strong> - Total points, breakdown by source</li>
            <li><strong>Earned vs Spent</strong> - Track your point history</li>
            <li><strong>Drop Stats</strong> - Total drops, average score, best drops</li>
            <li><strong>Powerup Inventory</strong> - See what powerups you own</li>
            <li><strong>Recent Activity</strong> - Transaction history</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground">Customization (Verified Users)</h3>
          <p className="text-muted-foreground mb-4">
            After verifying your profile, you can customize:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Drop Avatar</strong> - Upload a custom image for the drop game</li>
            <li><strong>TTS Voice</strong> - Set your default voice for !say</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground">How to Verify</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Visit the <Link to="/profile-login" className="text-primary hover:underline">Login page</Link></li>
            <li>Enter your Kick username</li>
            <li>A verification code appears</li>
            <li>Type <code className="bg-secondary px-1 rounded">!verify CODE</code> in chat</li>
            <li>You're verified and can edit your profile!</li>
          </ol>

          <CommandExample command="!profile" description="Get a link to your profile page" />
        </div>
      ),
    },
    {
      id: 'admin-streamer',
      title: 'Admin Dashboard (Streamer)',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <p>
            The Admin Dashboard lets you control all aspects of the overlay system. Only the channel owner can access it.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Accessing Admin</h3>
          <p className="text-muted-foreground">
            Go to <code className="bg-secondary px-2 py-0.5 rounded">/admin</code> or click the Admin link in the navigation.
            You'll need to authenticate with your Kick account.
          </p>

          <h3 className="text-lg font-semibold text-foreground">What You Can Configure</h3>
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Powerup Settings</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Enable/disable individual powerups</li>
                <li>- Adjust costs for each powerup</li>
                <li>- Configure powerup effects</li>
              </ul>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Overlay Settings</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Customize overlay appearance</li>
                <li>- Adjust colors and styling</li>
                <li>- Configure overlay layout</li>
              </ul>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Tips & Goals</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Add/edit rotating tips</li>
                <li>- Set follower/subscriber goals</li>
                <li>- Enable/disable individual items</li>
              </ul>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">User Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- View all users and their points</li>
                <li>- Grant bonus points to users</li>
                <li>- View user statistics</li>
              </ul>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Theme Settings</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Customize colors to match your brand</li>
                <li>- Adjust fonts and styling</li>
                <li>- Preview changes in real-time</li>
              </ul>
            </div>
          </div>

          <InfoBox type="tip">
            <strong>Tip:</strong> Changes in the admin panel are applied immediately. No restart needed!
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'overlays',
      title: 'OBS Overlays',
      icon: Monitor,
      content: (
        <div className="space-y-6">
          <p>
            Add these overlays to OBS Studio as Browser Sources to display on your stream.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Available Overlays</h3>
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">Main Overlay</h4>
                <code className="text-xs bg-background px-2 py-1 rounded">/overlay</code>
              </div>
              <p className="text-sm text-muted-foreground">Full-featured overlay with chat, goals, tips, and events. Recommended size: 1920x1080</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">Chat Only</h4>
                <code className="text-xs bg-background px-2 py-1 rounded">/overlay/chat</code>
              </div>
              <p className="text-sm text-muted-foreground">Just the chat display. Recommended size: 400x600</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">Goals Only</h4>
                <code className="text-xs bg-background px-2 py-1 rounded">/overlay/goals</code>
              </div>
              <p className="text-sm text-muted-foreground">Follower/subscriber goals. Recommended size: 400x200</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">Drop Game</h4>
                <code className="text-xs bg-background px-2 py-1 rounded">/overlay/dropgame</code>
              </div>
              <p className="text-sm text-muted-foreground">The interactive drop game. Recommended size: 1920x1080 (full screen)</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-foreground">OBS Browser Source Settings</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
            <li><strong>URL:</strong> <code className="bg-secondary px-1 rounded">http://localhost:5050/overlay</code></li>
            <li><strong>Width/Height:</strong> Match your canvas (1920x1080 for 1080p)</li>
            <li><strong>FPS:</strong> 60</li>
            <li><strong>Custom CSS:</strong> <code className="bg-secondary px-1 rounded">body {'{'} background-color: transparent; {'}'}</code></li>
            <li><strong>Shutdown when not visible:</strong> Unchecked</li>
            <li><strong>Refresh when active:</strong> Checked</li>
          </ul>

          <InfoBox type="info">
            <strong>Note:</strong> If your server is on a different machine, replace <code>localhost</code> with that machine's IP address.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'configuration',
      title: 'Configuration',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <p>
            Most settings are configured through the Admin Dashboard, but some core settings use environment variables.
          </p>

          <h3 className="text-lg font-semibold text-foreground">Environment Variables (.env file)</h3>
          <p className="text-muted-foreground mb-4">
            These are set in the <code className="bg-secondary px-1 rounded">.env</code> file in the project root.
          </p>

          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">Required Settings</h4>
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-muted-foreground">KICK_CLIENT_ID=</span>your_kick_client_id</div>
                <div><span className="text-muted-foreground">KICK_CLIENT_SECRET=</span>your_kick_client_secret</div>
                <div><span className="text-muted-foreground">PUBLIC_URL=</span>https://your-url.com</div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">Point Earning Rates</h4>
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-muted-foreground">POINTS_PER_MINUTE=</span>5</div>
                <div><span className="text-muted-foreground">POINTS_PER_CHAT=</span>25</div>
                <div><span className="text-muted-foreground">POINTS_PER_KICK=</span>100</div>
                <div><span className="text-muted-foreground">POINTS_PER_SUB=</span>2000</div>
                <div><span className="text-muted-foreground">POINTS_PER_GIFT=</span>1500</div>
                <div><span className="text-muted-foreground">POINTS_PER_RENEWAL=</span>1000</div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">Gambling Limits</h4>
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-muted-foreground">MIN_BET=</span>10</div>
                <div><span className="text-muted-foreground">MAX_BET=</span>10000</div>
                <div><span className="text-muted-foreground">MIN_DUEL=</span>50</div>
                <div><span className="text-muted-foreground">MAX_DUEL=</span>5000</div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">TTS Settings</h4>
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-muted-foreground">ELEVENLABS_API_KEY=</span>your_api_key</div>
                <div><span className="text-muted-foreground">ELEVENLABS_VOICE_ID=</span>default_voice_id</div>
              </div>
            </div>
          </div>

          <InfoBox type="warning">
            <strong>Important:</strong> After changing .env settings, you need to restart the server for changes to take effect.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: HelpCircle,
      content: (
        <div className="space-y-6">
          <p>
            Having issues? Here are solutions to common problems.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Overlay not showing in OBS</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Make sure the server is running</li>
                <li>Check the URL is correct (localhost:5050/overlay)</li>
                <li>Try refreshing the browser source in OBS</li>
                <li>Ensure "Shutdown when not visible" is unchecked</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">TTS not working</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Check ELEVENLABS_API_KEY is set in .env</li>
                <li>Verify you have credits on your ElevenLabs account</li>
                <li>Try using a different voice ID</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Webhooks not receiving events</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Make sure your tunnel (ngrok) is running</li>
                <li>Check PUBLIC_URL matches your tunnel URL exactly</li>
                <li>Try re-authenticating to re-register webhooks</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Drops not appearing</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Refresh the drop game overlay in OBS</li>
                <li>Check browser console for WebSocket errors</li>
                <li>Make sure the correct URL is being used</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Database issues</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Close Drizzle Studio when running the server</li>
                <li>Run <code className="bg-secondary px-1 rounded">bun run db:setup</code> to reinitialize</li>
                <li>Check the data folder exists</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI chatbot not responding</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Make sure AI_ENABLED=true in .env</li>
                <li>Check Claude CLI is installed and authenticated</li>
                <li>The bot doesn't respond to every message - it's selective</li>
              </ul>
            </div>
          </div>

          <InfoBox type="info">
            <strong>Still stuck?</strong> Check the{' '}
            <a href="https://github.com/codingbutter/kick-overlay/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              GitHub Issues
            </a>{' '}
            or open a new one for help.
          </InfoBox>
        </div>
      ),
    },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div style={{ padding: '2rem 1.5rem', position: 'relative' }}>
        {/* Main content - centered */}
        <main style={{ maxWidth: '768px', marginLeft: 'auto', marginRight: 'auto' }}>
          {/* Hero Header */}
          <div className="mb-10 pb-8 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Documentation
            </h1>
            <p className="text-muted-foreground">
              Everything you need to know about Kick Overlay
            </p>
          </div>

          {/* Main content */}
          <div>
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <Section title={section.title} icon={section.icon}>
                  {section.content}
                </Section>
              </div>
            ))}

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-4">Need more help?</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/codingbutter/kick-overlay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  GitHub Repository
                </a>
                <span className="text-border">•</span>
                <a
                  href="https://github.com/codingbutter/kick-overlay/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Report an Issue
                </a>
                <span className="text-border">•</span>
                <Link
                  to="/commands"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Command List
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar - fixed position on right */}
        <aside style={{ position: 'fixed', right: '2rem', top: '6rem', width: '14rem' }}>
          <TableOfContents
            sections={sections}
            activeSection={activeSection}
            onSelect={scrollToSection}
          />
        </aside>
      </div>
    </div>
  );
}
