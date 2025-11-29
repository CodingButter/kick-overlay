import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';

export function useProfile(username?: string) {
  const {
    userData,
    voices,
    isLoading,
    error,
    fetchProfile,
    fetchVoices,
    updateProfile,
    buyPowerup,
    clearProfile,
  } = useProfileStore();

  useEffect(() => {
    if (username) {
      fetchProfile(username);
    } else {
      clearProfile();
    }
  }, [username, fetchProfile, clearProfile]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  return {
    userData,
    voices,
    loading: isLoading,
    error,
    refetch: username ? () => fetchProfile(username) : undefined,
    updateProfile,
    buyPowerup,
  };
}
