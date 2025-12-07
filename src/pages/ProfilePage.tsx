import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useProfileSession } from './profile/hooks/useProfileSession';
import { useProfileData } from './profile/hooks/useProfileData';
import { LoadingState, ErrorState } from './profile/components/LoadingState';
import { VerificationFlow } from './profile/components/VerificationFlow';
import { StatsSection } from './profile/components/StatsSection';
import { PointsBreakdown } from './profile/components/PointsBreakdown';
import { PowerupShop } from './profile/components/PowerupShop';
import { SettingsSection } from './profile/components/SettingsSection';
import { HelpSection } from './profile/components/HelpSection';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  // Profile data hook
  const profileData = useProfileData({ username, isVerified: false });

  // Session/verification hook
  const session = useProfileSession({
    username,
    onVerified: profileData.loadProfileData,
  });

  // Redirect if no username
  if (!username) {
    navigate('/profile-login');
    return null;
  }

  // Handle save settings
  const handleSave = useCallback(async () => {
    const res = await fetch(`/api/profile/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceId: profileData.selectedVoice || undefined,
        dropImage: profileData.dropImageUrl || undefined,
        country: profileData.selectedCountry || undefined,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      profileData.setUserData(updated);
    } else {
      throw new Error('Failed to save');
    }
  }, [username, profileData]);

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !username) return;

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`/api/upload/${username}`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      profileData.setDropImageUrl(data.imageUrl);
      const profileRes = await fetch(`/api/profile/${username}`);
      if (profileRes.ok) {
        profileData.setUserData(await profileRes.json());
      }
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload');
    }
  }, [username, profileData]);

  // Handle powerup purchase
  const handlePurchase = useCallback((powerupId: string, quantity: number, balance: number) => {
    profileData.setUserPowerups((prev) => ({ ...prev, [powerupId]: quantity }));
    profileData.setUserData((prev) => (prev ? { ...prev, channelPoints: balance } : prev));
  }, [profileData]);

  // Loading state
  if (session.loading) {
    return <LoadingState />;
  }

  // Error state
  const error = session.error || profileData.error;
  if (error) {
    return <ErrorState error={error} />;
  }

  // Verification flow
  if (!session.isVerified && session.verifyCode) {
    return (
      <VerificationFlow
        username={username}
        verifyCode={session.verifyCode}
        verifyStatus={session.verifyStatus}
        onStartWaiting={session.startWaiting}
      />
    );
  }

  // Verified profile view
  if (!profileData.userData) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{username}'s Profile</h1>
          <p className="text-muted-foreground">Manage your stream settings and view your stats</p>
        </div>

        <StatsSection userData={profileData.userData} />

        <PointsBreakdown username={username} />

        <PowerupShop
          username={username}
          userData={profileData.userData}
          powerups={profileData.powerups}
          userPowerups={profileData.userPowerups}
          onPurchase={handlePurchase}
        />

        <SettingsSection
          username={username}
          selectedVoice={profileData.selectedVoice}
          setSelectedVoice={profileData.setSelectedVoice}
          dropImageUrl={profileData.dropImageUrl}
          setDropImageUrl={profileData.setDropImageUrl}
          selectedCountry={profileData.selectedCountry}
          setSelectedCountry={profileData.setSelectedCountry}
          voices={profileData.voices}
          onSave={handleSave}
          onImageUpload={handleImageUpload}
        />

        <HelpSection />
      </div>
    </div>
  );
}
