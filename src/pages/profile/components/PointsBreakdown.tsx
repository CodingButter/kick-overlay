import { useState, useEffect } from 'react';
import { MessageCircle, Clock, Gift, Zap, Coins, Target, ShoppingBag, ChevronDown, ChevronUp, Dice5, Swords } from 'lucide-react';

interface PointsSummary {
  chat?: number;
  watch?: number;
  drop?: number;
  sub?: number;
  gift?: number;
  renewal?: number;
  tip?: number;
  spend?: number;
  admin?: number;
  gamble?: number;
  duel?: number;
}

interface Transaction {
  id: number;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface PointsBreakdownProps {
  username: string;
}

const SOURCE_INFO: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  chat: { icon: MessageCircle, label: 'Chat Messages', color: 'text-blue-400' },
  watch: { icon: Clock, label: 'Watch Time', color: 'text-green-400' },
  drop: { icon: Target, label: 'Drop Game', color: 'text-purple-400' },
  sub: { icon: Gift, label: 'Subscription', color: 'text-emerald-500' },
  gift: { icon: Gift, label: 'Gifted Subs', color: 'text-pink-500' },
  renewal: { icon: Zap, label: 'Sub Renewal', color: 'text-purple-500' },
  tip: { icon: Coins, label: 'Kick Tips', color: 'text-yellow-500' },
  spend: { icon: ShoppingBag, label: 'Purchases', color: 'text-red-400' },
  admin: { icon: Zap, label: 'Admin Bonus', color: 'text-cyan-400' },
  gamble: { icon: Dice5, label: 'Gambling', color: 'text-amber-500' },
  duel: { icon: Swords, label: 'Duels', color: 'text-orange-500' },
};

export function PointsBreakdown({ username }: PointsBreakdownProps) {
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryRes, transactionsRes] = await Promise.all([
          fetch(`/api/points/${username}/summary`),
          fetch(`/api/points/${username}/transactions`),
        ]);

        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        }
        if (transactionsRes.ok) {
          setTransactions(await transactionsRes.json());
        }
      } catch (e) {
        console.error('Failed to load point data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 mb-6 border border-border">
        <h2 className="text-xl font-bold mb-4 text-primary">Points Breakdown</h2>
        <div className="text-muted-foreground text-center py-4">Loading...</div>
      </div>
    );
  }

  // Calculate totals
  const earned = Object.entries(summary || {})
    .filter(([source]) => source !== 'spend')
    .reduce((acc, [, val]) => acc + (val || 0), 0);

  const spent = Math.abs(summary?.spend || 0);

  if (!summary || Object.keys(summary).length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 mb-6 border border-border">
        <h2 className="text-xl font-bold mb-4 text-primary">Points Breakdown</h2>
        <p className="text-muted-foreground text-center py-4">
          No point history yet. Start chatting and watching to earn points!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 mb-6 border border-border">
      <h2 className="text-xl font-bold mb-4 text-primary">Points Breakdown</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-500">+{earned.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Earned</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-500">-{spent.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Spent</div>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="space-y-2">
        {Object.entries(summary)
          .filter(([, val]) => val !== 0)
          .sort(([, a], [, b]) => Math.abs(b || 0) - Math.abs(a || 0))
          .map(([source, amount]) => {
            const info = SOURCE_INFO[source] || { icon: Coins, label: source, color: 'text-muted-foreground' };
            const Icon = info.icon;
            const isNegative = (amount || 0) < 0;

            return (
              <div key={source} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${info.color}`} />
                  <span className="text-foreground">{info.label}</span>
                </div>
                <span className={`font-bold ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                  {isNegative ? '' : '+'}{(amount || 0).toLocaleString()}
                </span>
              </div>
            );
          })}
      </div>

      {/* Recent Transactions Toggle */}
      {transactions.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
          >
            {showTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showTransactions ? 'Hide' : 'Show'} Recent Activity ({transactions.length})
          </button>

          {showTransactions && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {transactions.slice(0, 20).map((tx) => {
                const info = SOURCE_INFO[tx.source] || { icon: Coins, label: tx.source, color: 'text-muted-foreground' };
                const Icon = info.icon;
                const isNegative = tx.amount < 0;
                const date = new Date(tx.created_at);

                return (
                  <div key={tx.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className={`w-3 h-3 ${info.color} shrink-0`} />
                      <span className="text-muted-foreground truncate">
                        {tx.description || info.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`font-medium ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                        {isNegative ? '' : '+'}{tx.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
