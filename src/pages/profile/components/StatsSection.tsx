import type { UserData } from '../types';

interface StatsSectionProps {
  userData: UserData;
}

export function StatsSection({ userData }: StatsSectionProps) {
  const totalPoints = (userData.channelPoints || 0) + (userData.dropPoints || 0);

  return (
    <div className="bg-card rounded-xl p-6 mb-6 border border-border overflow-hidden">
      <h2 className="text-xl font-bold mb-4 text-primary">Your Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-hidden">
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-warning">{totalPoints}</div>
          <div className="text-sm text-muted-foreground">Total Points</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-accent-foreground">{userData.channelPoints || 0}</div>
          <div className="text-sm text-muted-foreground">Channel Points</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{userData.dropPoints || 0}</div>
          <div className="text-sm text-muted-foreground">Drop Points</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{userData.totalDrops || 0}</div>
          <div className="text-sm text-muted-foreground">Total Drops</div>
        </div>
      </div>
    </div>
  );
}
