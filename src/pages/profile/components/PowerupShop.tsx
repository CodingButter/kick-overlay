import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserData, Powerup } from '../types';

interface PowerupShopProps {
  username: string;
  userData: UserData;
  powerups: Record<string, Powerup>;
  userPowerups: Record<string, number>;
  onPurchase: (powerupId: string, quantity: number, balance: number) => void;
}

export function PowerupShop({ username, userData, powerups, userPowerups, onPurchase }: PowerupShopProps) {
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleBuyPowerup = async (powerupId: string) => {
    setBuying(powerupId);
    setMessage(null);

    try {
      const res = await fetch(`/api/powerups/${username}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerupId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Purchased ${powerups[powerupId]?.name}! You now have ${data.quantity}.`);
        onPurchase(powerupId, data.quantity, data.balance);
      } else {
        setMessage(data.error || 'Failed to purchase powerup.');
      }
    } catch {
      setMessage('Failed to purchase powerup.');
    }

    setBuying(null);
  };

  return (
    <div className="bg-card rounded-xl p-6 mb-6 border border-border overflow-hidden">
      <h2 className="text-xl font-bold mb-2 text-accent-foreground">Powerup Shop</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Purchase powerups to use in the drop game! Activate them with chat commands while dropping.
        <Link to="/drop-game-rules" className="text-accent-foreground hover:text-primary ml-1">
          View Rules
        </Link>
      </p>

      {/* User's current powerups inventory */}
      {Object.values(userPowerups).some((qty) => qty > 0) && (
        <div className="bg-secondary/50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Your Inventory</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(userPowerups).map(([id, quantity]) => {
              if (quantity <= 0) return null;
              const powerup = powerups[id];
              if (!powerup) return null;
              return (
                <div key={id} className="bg-card rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-xl">{powerup.emoji}</span>
                  <span className="text-foreground font-medium">{powerup.name}</span>
                  <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">x{quantity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {Object.values(powerups).map((powerup) => {
          const owned = userPowerups[powerup.id] || 0;
          const canAfford = (userData.channelPoints || 0) >= powerup.cost;
          const isBuying = buying === powerup.id;

          return (
            <div key={powerup.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between gap-4 overflow-hidden">
              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                <span className="text-3xl flex-shrink-0">{powerup.emoji}</span>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground">{powerup.name}</h3>
                    {owned > 0 && (
                      <span className="bg-accent/50 text-accent-foreground text-xs px-2 py-0.5 rounded">
                        Owned: {owned}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{powerup.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Command: !{powerup.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`font-bold whitespace-nowrap ${canAfford ? 'text-warning' : 'text-destructive'}`}>
                  {powerup.cost} pts
                </span>
                <button
                  onClick={() => handleBuyPowerup(powerup.id)}
                  disabled={!canAfford || isBuying}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    isBuying
                      ? 'bg-muted text-muted-foreground cursor-wait'
                      : canAfford
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isBuying ? 'Buying...' : 'Buy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div
          className={`mt-4 p-3 rounded ${message.includes('Purchased') ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
