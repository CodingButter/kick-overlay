import { useEffect } from 'react';
import { useGoalsStore } from '@/stores/goalsStore';

export function useGoals(pollInterval = 30000) {
  const { goals, isLoading, error, fetchGoals } = useGoalsStore();

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, pollInterval);
    return () => clearInterval(interval);
  }, [fetchGoals, pollInterval]);

  return {
    goals,
    loading: isLoading,
    error,
    refetch: fetchGoals,
  };
}
