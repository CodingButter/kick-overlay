import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';

interface Powerup {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
}

function CommandRow({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2">
      <code className="bg-slate-900 px-3 py-1 rounded text-cyan-400 font-mono text-sm whitespace-nowrap">
        {command}
      </code>
      <span className="text-slate-300 text-sm">{description}</span>
    </div>
  );
}

export function DropGameRulesPage() {
  const [powerups, setPowerups] = useState<Record<string, Powerup>>({});

  useEffect(() => {
    fetch('/api/powerups')
      .then((res) => res.json())
      .then((data) => setPowerups(data))
      .catch((err) => console.error('Failed to fetch powerups:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">Drop Game Rules</h1>
          <p className="text-slate-400">
            Learn how to play and dominate the drop game!
          </p>
        </div>

        {/* How to Play */}
        <section className="mb-12 bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold text-green-400 mb-6 flex items-center gap-3">
            <span className="text-4xl">🎮</span> How to Play
          </h2>
          <div className="space-y-4 text-lg text-slate-300">
            <p>
              The Drop Game is a fun mini-game where you drop your avatar from the top of the screen
              and try to land on the platform below. The closer you land to the center, the more points you earn!
            </p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li>Type <code className="bg-slate-700 px-2 py-1 rounded text-cyan-400">!drop</code> in chat to start a drop</li>
              <li>Your avatar will appear at the top and start falling with random horizontal movement</li>
              <li>It will bounce off walls and eventually land on (or miss) the platform</li>
              <li>Land on the platform to earn points - center = bonus points!</li>
              <li>Use powerups to gain advantages over other players</li>
            </ol>
          </div>
        </section>

        {/* Scoring */}
        <section className="mb-12 bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center gap-3">
            <span className="text-4xl">🏆</span> Scoring
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-yellow-300 mb-3">Landing Points</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex justify-between">
                  <span>Base points (on platform):</span>
                  <span className="text-green-400 font-bold">10 pts</span>
                </li>
                <li className="flex justify-between">
                  <span>Perfect center bonus:</span>
                  <span className="text-yellow-400 font-bold">+100 pts</span>
                </li>
                <li className="flex justify-between">
                  <span>Miss the platform:</span>
                  <span className="text-red-400 font-bold">0 pts</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-cyan-300 mb-3">Channel Points</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex justify-between">
                  <span>Per chat message:</span>
                  <span className="text-green-400 font-bold">25 pts</span>
                </li>
                <li className="flex justify-between">
                  <span>Per minute watching:</span>
                  <span className="text-green-400 font-bold">5 pts</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section className="mb-12 bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-3">
            <span className="text-4xl">💬</span> Commands
          </h2>
          <div className="space-y-4">
            {/* Basic Commands */}
            <div className="bg-slate-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-cyan-300 mb-4">Basic Commands</h3>
              <div className="grid gap-3">
                <CommandRow command="!drop" description="Start a drop - your avatar falls from the sky!" />
                <CommandRow command="!drop -rules" description="Get a link to this rules page" />
                <CommandRow command="!points" description="Check your current points balance" />
                <CommandRow command="!leaderboard" description="View the top players" />
              </div>
            </div>

            {/* Powerup Commands */}
            <div className="bg-slate-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-purple-300 mb-4">Powerup Commands</h3>
              <div className="grid gap-3">
                <CommandRow command="!drop -powerups" description="List all available powerups and their costs" />
                <CommandRow command="!drop -buy [powerup]" description="Purchase a powerup (e.g., !drop -buy tnt)" />
                <CommandRow command="!drop -mine" description="View your owned powerups" />
              </div>
            </div>

            {/* Activation Commands */}
            <div className="bg-slate-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-orange-300 mb-4">Powerup Activation (use while dropping!)</h3>
              <div className="grid gap-3">
                <CommandRow command="!tnt" description="Activate TNT - explode and push others away!" />
                <CommandRow command="!powerdrop" description="Activate Power Drop - zoom straight down!" />
                <CommandRow command="!shield" description="Activate Shield - protect from other powerups" />
                <CommandRow command="!magnet" description="Activate Magnet - pull towards platform center" />
                <CommandRow command="!ghost" description="Activate Ghost - pass through walls" />
                <CommandRow command="!boost" description="Activate Boost - double your speed" />
              </div>
            </div>
          </div>
        </section>

        {/* Powerups */}
        <section className="mb-12 bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold text-purple-400 mb-6 flex items-center gap-3">
            <span className="text-4xl">⚡</span> Powerups
          </h2>
          <p className="text-slate-300 mb-6">
            Purchase powerups with your channel points and activate them during a drop for special effects!
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.values(powerups).map((powerup) => (
              <div
                key={powerup.id}
                className="bg-gradient-to-br from-slate-700/70 to-slate-800/70 rounded-xl p-5 border border-slate-600 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{powerup.emoji}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{powerup.name}</h3>
                    <span className="text-sm text-yellow-400 font-semibold">{powerup.cost} pts</span>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-2">{powerup.description}</p>
                <p className="text-xs text-purple-300 italic">{powerup.effect}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="mb-12 bg-gradient-to-br from-green-900/30 to-cyan-900/30 rounded-2xl p-8 border border-green-700/50">
          <h2 className="text-3xl font-bold text-green-400 mb-6 flex items-center gap-3">
            <span className="text-4xl">💡</span> Pro Tips
          </h2>
          <ul className="space-y-3 text-lg text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">•</span>
              <span>Use <strong className="text-cyan-400">!magnet</strong> when you're close to the platform to pull yourself to the center</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">•</span>
              <span>Activate <strong className="text-cyan-400">!tnt</strong> when other players are nearby to push them away from the platform</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">•</span>
              <span>Use <strong className="text-cyan-400">!shield</strong> if you suspect others might use TNT on you</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">•</span>
              <span><strong className="text-cyan-400">!ghost</strong> lets you wrap around the screen edges instead of bouncing</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">•</span>
              <span>Stack up channel points by chatting and watching before going on a powerup shopping spree!</span>
            </li>
          </ul>
        </section>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          <p>Good luck and have fun! May your drops be perfect! 🎯</p>
        </div>
      </div>
    </div>
  );
}
