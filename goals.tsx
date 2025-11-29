import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

interface GoalData {
  followers: {
    current: number;
    target: number;
  };
  subscribers: {
    current: number;
    target: number;
  };
}

function GoalBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-200">{label}</span>
        <span className="text-sm font-bold text-white">
          {current} / {target}
        </span>
      </div>
      <div className="h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {percentage >= 15 && (
            <span className="text-xs font-bold text-white drop-shadow">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalsOverlay() {
  const [goals, setGoals] = useState<GoalData>({
    followers: { current: 0, target: 100 },
    subscribers: { current: 0, target: 50 },
  });

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch("/api/goals");
        const data = await response.json() as GoalData;
        setGoals(data);
      } catch (error) {
        console.error("Failed to fetch goals:", error);
      }
    };

    fetchGoals();
    const interval = setInterval(fetchGoals, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-2xl">
      <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Channel Goals
      </h2>

      <GoalBar
        label="Followers"
        current={goals.followers.current}
        target={goals.followers.target}
        color="bg-gradient-to-r from-green-500 to-green-400"
      />

      {/* TODO: Enable when subscriber API is available
      <GoalBar
        label="Subscribers"
        current={goals.subscribers.current}
        target={goals.subscribers.target}
        color="bg-gradient-to-r from-purple-500 to-pink-500"
      />
      */}
    </div>
  );
}

const container = document.getElementById("goals-container");
if (container) {
  const root = createRoot(container);
  root.render(<GoalsOverlay />);
}
