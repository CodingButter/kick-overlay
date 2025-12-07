import { useState, useEffect, useCallback } from 'react';
import type { UserData, Voice, Powerup } from '../types';

interface UseProfileDataProps {
  username: string | undefined;
  isVerified: boolean;
}

export function useProfileData({ username, isVerified }: UseProfileDataProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [powerups, setPowerups] = useState<Record<string, Powerup>>({});
  const [userPowerups, setUserPowerups] = useState<Record<string, number>>({});
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [dropImageUrl, setDropImageUrl] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!username) return;
    try {
      const profileRes = await fetch(`/api/profile/${username}`);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserData(profile);
        setSelectedVoice(profile.voiceId || '');
        setDropImageUrl(profile.dropImage || '');
        setSelectedCountry(profile.country || '');
      }

      const voicesRes = await fetch('/api/voices');
      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        setVoices(Array.isArray(voicesData) ? voicesData : voicesData.voices || []);
      }

      const powerupsRes = await fetch('/api/powerups');
      if (powerupsRes.ok) {
        const powerupsData = await powerupsRes.json();
        setPowerups(powerupsData);
      }

      const userPowerupsRes = await fetch(`/api/powerups/${username}`);
      if (userPowerupsRes.ok) {
        const userPowerupsData = await userPowerupsRes.json();
        setUserPowerups(userPowerupsData);
      }
    } catch {
      setError('Failed to load profile data.');
    }
  }, [username]);

  // Poll for profile updates
  useEffect(() => {
    if (!isVerified || !username) return;

    const pollInterval = setInterval(async () => {
      try {
        const userPowerupsRes = await fetch(`/api/powerups/${username}`);
        if (userPowerupsRes.ok) {
          setUserPowerups(await userPowerupsRes.json());
        }

        const profileRes = await fetch(`/api/profile/${username}`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUserData((prev) =>
            prev
              ? {
                  ...prev,
                  channelPoints: profile.channelPoints,
                  dropPoints: profile.dropPoints,
                  totalDrops: profile.totalDrops,
                }
              : prev
          );
        }
      } catch {
        // Silently continue
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [isVerified, username]);

  return {
    userData,
    setUserData,
    voices,
    powerups,
    userPowerups,
    setUserPowerups,
    selectedVoice,
    setSelectedVoice,
    dropImageUrl,
    setDropImageUrl,
    selectedCountry,
    setSelectedCountry,
    error,
    loadProfileData,
  };
}
