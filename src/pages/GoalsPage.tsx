import { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useGoals } from '@/hooks/useGoals';

export function GoalsPage() {
  const { goals, loading } = useGoals(30000);

  if (loading || !goals) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse text-kick">Loading goals...</div>
      </div>
    );
  }

  const followerProgress = goals.followers
    ? (goals.followers.current / goals.followers.target) * 100
    : 0;
  const subscriberProgress = goals.subscribers
    ? (goals.subscribers.current / goals.subscribers.target) * 100
    : 0;

  return (
    <div className="w-full h-full p-4 flex flex-col gap-4">
      {/* Followers Goal */}
      <div className="bg-black/50 backdrop-blur rounded-xl p-4 border border-kick/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-semibold">Followers</span>
          <span className="text-kick font-bold">
            {goals.followers?.current.toLocaleString()} / {goals.followers?.target.toLocaleString()}
          </span>
        </div>
        <Progress value={followerProgress} className="h-4" />
      </div>

      {/* Subscribers Goal */}
      <div className="bg-black/50 backdrop-blur rounded-xl p-4 border border-kick/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-semibold">Subscribers</span>
          <span className="text-kick font-bold">
            {goals.subscribers?.current.toLocaleString()} / {goals.subscribers?.target.toLocaleString()}
          </span>
        </div>
        <Progress value={subscriberProgress} className="h-4" />
      </div>
    </div>
  );
}
