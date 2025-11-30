import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Volume2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';

interface Command {
  name: string;
  cooldown: number;
  alternatives?: string[];
  description: string;
  arguments: string;
}

function CommandCard({ command }: { command: Command }) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const cooldownSeconds = command.cooldown / 1000;
  const cooldownDisplay = cooldownSeconds >= 60
    ? `${Math.floor(cooldownSeconds / 60)}m`
    : `${cooldownSeconds}s`;

  return (
    <div className="bg-card rounded-xl p-5 border border-border hover:border-primary/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-primary font-mono">{command.name}</h3>
            {command.arguments && (
              <span className="text-sm text-muted-foreground font-mono">{command.arguments}</span>
            )}
          </div>
          {command.alternatives && command.alternatives.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Also:</span>
              {command.alternatives.map((alt) => (
                <span key={alt} className="text-xs bg-secondary text-primary px-2 py-0.5 rounded font-mono">
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full shrink-0 ml-2">
          {cooldownDisplay} cooldown
        </span>
      </div>

      <p className="text-foreground mb-4">{command.description}</p>

      <div className="flex gap-2">
        <button
          onClick={copyCommand}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? 'bg-primary text-foreground'
              : 'bg-secondary text-foreground hover:bg-muted'
          }`}
          title="Copy command"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [quickCopied, setQuickCopied] = useState<string | null>(null);

  const handleQuickCopy = async (cmdName: string) => {
    try {
      await navigator.clipboard.writeText(cmdName);
      setQuickCopied(cmdName);
      setTimeout(() => setQuickCopied(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const response = await fetch('/api/commands');
        const data = (await response.json()) as Command[];
        setCommands(data);
      } catch (error) {
        console.error('Failed to fetch commands:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, []);

  const filteredCommands = commands.filter((command) => {
    if (searchFilter === '') return true;
    const search = searchFilter.toLowerCase();
    return (
      command.name.toLowerCase().includes(search) ||
      command.description.toLowerCase().includes(search) ||
      command.alternatives?.some((alt) => alt.toLowerCase().includes(search))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Chat Commands</h1>
          <p className="text-muted-foreground">
            All available bot commands for the stream
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Click on a command to copy it, then paste it in chat!
          </p>
        </div>

        {/* Search input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search commands..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Quick reference */}
        <div className="mb-8 bg-gradient-to-br from-card/80 to-background/80 rounded-2xl p-6 border border-border/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Quick Reference</h2>
            <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded-full">click to copy</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {commands.map((cmd) => (
              <button
                key={cmd.name}
                className={`group relative px-4 py-2 rounded-xl font-mono text-sm font-medium transition-all duration-200 ${
                  quickCopied === cmd.name
                    ? 'bg-primary text-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary/50 text-primary border border-border/50 hover:bg-secondary hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10'
                }`}
                onClick={() => handleQuickCopy(cmd.name)}
                title={cmd.description}
              >
                {quickCopied === cmd.name ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </span>
                ) : (
                  cmd.name
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading commands...</p>
          </div>
        ) : filteredCommands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No commands found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCommands.map((command) => (
              <CommandCard key={command.name} command={command} />
            ))}
          </div>
        )}

        <div className="text-center mt-8 text-muted-foreground text-sm">
          {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} available
        </div>

        {/* Links to other pages */}
        <div className="mt-8 text-center">
          <Link
            to="/voicelist"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Volume2 className="w-5 h-5" />
            Browse TTS Voices
          </Link>
        </div>
      </div>
    </div>
  );
}
