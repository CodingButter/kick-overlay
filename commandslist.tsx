import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

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
      console.error("Failed to copy:", err);
    }
  };

  const cooldownSeconds = command.cooldown / 1000;
  const cooldownDisplay = cooldownSeconds >= 60
    ? `${Math.floor(cooldownSeconds / 60)}m`
    : `${cooldownSeconds}s`;

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-green-500/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-green-400 font-mono">{command.name}</h3>
            {command.arguments && (
              <span className="text-sm text-slate-400 font-mono">{command.arguments}</span>
            )}
          </div>
          {command.alternatives && command.alternatives.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Also:</span>
              {command.alternatives.map((alt) => (
                <span key={alt} className="text-xs bg-slate-700 text-green-400 px-2 py-0.5 rounded font-mono">
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full shrink-0 ml-2">
          {cooldownDisplay} cooldown
        </span>
      </div>

      <p className="text-slate-300 mb-4">{command.description}</p>

      <div className="flex gap-2">
        <button
          onClick={copyCommand}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          title="Copy command"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CommandsList() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const response = await fetch("/api/commands");
        const data = (await response.json()) as Command[];
        setCommands(data);
      } catch (error) {
        console.error("Failed to fetch commands:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, []);

  const filteredCommands = commands.filter((command) => {
    if (searchFilter === "") return true;
    const search = searchFilter.toLowerCase();
    return (
      command.name.toLowerCase().includes(search) ||
      command.description.toLowerCase().includes(search) ||
      command.alternatives?.some((alt) => alt.toLowerCase().includes(search))
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-400 mb-2">Chat Commands</h1>
        <p className="text-slate-400">
          All available bot commands for the stream
        </p>
        <p className="text-slate-500 text-sm mt-2">
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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Quick reference */}
      <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h2 className="text-sm font-semibold text-slate-400 mb-2">Quick Reference</h2>
        <div className="flex flex-wrap gap-2">
          {commands.map((cmd) => (
            <code
              key={cmd.name}
              className="text-xs bg-slate-700 text-green-400 px-2 py-1 rounded cursor-pointer hover:bg-slate-600 transition-colors"
              onClick={() => navigator.clipboard.writeText(cmd.name)}
              title={cmd.description}
            >
              {cmd.name}
            </code>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400 mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading commands...</p>
        </div>
      ) : filteredCommands.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No commands found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommands.map((command) => (
            <CommandCard key={command.name} command={command} />
          ))}
        </div>
      )}

      <div className="text-center mt-8 text-slate-500 text-sm">
        {filteredCommands.length} command{filteredCommands.length !== 1 ? "s" : ""} available
      </div>

      {/* Links to other pages */}
      <div className="mt-8 text-center">
        <a
          href="/voicelist"
          className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          Browse TTS Voices
        </a>
      </div>
    </div>
  );
}

const container = document.getElementById("commandslist-container");
if (container) {
  const root = createRoot(container);
  root.render(<CommandsList />);
}
