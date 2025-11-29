import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';

interface UserData {
  username?: string;
  voiceId?: string;
  dropPoints: number;
  totalDrops: number;
  channelPoints: number;
  dropImage?: string;
  country?: string;
  powerups?: Record<string, number>;
}

interface Powerup {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
  };
}

// Common countries list with codes
const countries = [
  { code: '', name: '-- Select Country --' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
].sort((a, b) => (a.code === '' ? -1 : b.code === '' ? 1 : a.name.localeCompare(b.name)));

// Get flag URL from country code
const getFlagUrl = (countryCode: string) => {
  if (!countryCode) return null;
  return `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
};

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [powerups, setPowerups] = useState<Record<string, Powerup>>({});
  const [userPowerups, setUserPowerups] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Verification state
  const [isVerified, setIsVerified] = useState(false);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'loading' | 'ready' | 'waiting' | 'verified'>('loading');

  // Form state
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [dropImageUrl, setDropImageUrl] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Cookie helpers
  const getSessionCookie = useCallback((user: string): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === `profile_session_${user}`) {
        return value;
      }
    }
    return null;
  }, []);

  const setSessionCookie = useCallback((user: string, token: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    document.cookie = `profile_session_${user}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }, []);

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

  // Initialize session on mount
  useEffect(() => {
    if (!username) {
      navigate('/profile-login');
      return;
    }

    const initSession = async () => {
      const sessionToken = getSessionCookie(username);
      if (sessionToken) {
        try {
          const res = await fetch(`/api/session/validate/${username}/${sessionToken}`);
          if (res.ok) {
            const data = await res.json();
            if (data.valid) {
              setIsVerified(true);
              setVerifyStatus('verified');
              setLoading(false);
              loadProfileData();
              return;
            }
          }
        } catch {
          // Session validation failed
        }
      }

      try {
        const res = await fetch(`/api/verify/generate/${username}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setVerifyCode(data.code);
          setVerifyStatus('ready');
        } else {
          setError('Failed to generate verification code');
        }
      } catch {
        setError('Failed to connect to server');
      }
      setLoading(false);
    };
    initSession();
  }, [username, navigate, getSessionCookie, loadProfileData]);

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

  // Poll for verification
  useEffect(() => {
    if (!verifyCode || verifyStatus !== 'waiting' || !username) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/check/${username}/${verifyCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            setIsVerified(true);
            setVerifyStatus('verified');
            clearInterval(pollInterval);
            const sessionToken = data.sessionToken || verifyCode;
            setSessionCookie(username, sessionToken);
            loadProfileData();
          }
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setError('Verification expired. Please refresh the page to try again.');
      setVerifyStatus('ready');
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [verifyCode, verifyStatus, username, setSessionCookie, loadProfileData]);

  const handleCopyCommand = async () => {
    const command = `!verify ${verifyCode}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !username) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/upload/${username}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setDropImageUrl(data.imageUrl);
        setMessage('Image uploaded successfully!');
        const profileRes = await fetch(`/api/profile/${username}`);
        if (profileRes.ok) {
          setUserData(await profileRes.json());
        }
      } else {
        const err = await res.json();
        setMessage(err.error || 'Failed to upload image.');
      }
    } catch {
      setMessage('Failed to upload image.');
    }

    setUploading(false);
  };

  const handleSave = async () => {
    if (!username) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/profile/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoice || undefined,
          dropImage: dropImageUrl || undefined,
          country: selectedCountry || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch {
      setMessage('Failed to save settings.');
    }

    setSaving(false);
  };

  const handleBuyPowerup = async (powerupId: string) => {
    if (!username) return;
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
        setUserPowerups((prev) => ({ ...prev, [powerupId]: data.quantity }));
        setUserData((prev) => (prev ? { ...prev, channelPoints: data.balance } : prev));
      } else {
        setMessage(data.error || 'Failed to purchase powerup.');
      }
    } catch {
      setMessage('Failed to purchase powerup.');
    }

    setBuying(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-slate-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verification flow
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-400 mb-2">{username}'s Profile</h1>
            <p className="text-slate-400">Verify your identity to access your settings</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            {verifyStatus === 'ready' && (
              <>
                <div className="text-center mb-6">
                  <p className="text-slate-300 mb-4">
                    To prove you are <span className="text-green-400 font-bold">{username}</span>, paste this command in chat:
                  </p>
                  <div className="bg-slate-900 p-4 rounded-lg mb-4">
                    <code className="text-xl font-bold text-green-400 block mb-3">!verify {verifyCode}</code>
                    <button
                      onClick={handleCopyCommand}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        copied ? 'bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy Command'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <h3 className="font-bold text-lg text-slate-200">Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-400">
                    <li>Copy the command above</li>
                    <li>Paste it in the stream chat on Kick</li>
                    <li>Click the button below to start verification</li>
                    <li>This page will automatically unlock</li>
                  </ol>
                </div>

                <button
                  onClick={() => setVerifyStatus('waiting')}
                  className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  I'm Ready - Start Verification
                </button>
              </>
            )}

            {verifyStatus === 'waiting' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400 mx-auto mb-4"></div>
                  <p className="text-lg text-slate-200">Waiting for verification...</p>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg mb-4">
                  <p className="text-sm text-slate-400 mb-2">Paste this in chat:</p>
                  <code className="text-xl font-bold text-green-400 block mb-3">!verify {verifyCode}</code>
                  <button
                    onClick={handleCopyCommand}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      copied ? 'bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>

                <p className="text-slate-500 text-sm">
                  This page will automatically update when you verify.
                  <br />
                  Code expires in 5 minutes.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-slate-600 text-sm mt-8">This ensures only you can modify your settings.</p>
        </div>
      </div>
    );
  }

  // Verified profile view
  const totalPoints = (userData?.channelPoints || 0) + (userData?.dropPoints || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">{username}'s Profile</h1>
          <p className="text-slate-400">Manage your stream settings and view your stats</p>
        </div>

        {/* Stats Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-green-400">Your Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{totalPoints}</div>
              <div className="text-sm text-slate-400">Total Points</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{userData?.channelPoints || 0}</div>
              <div className="text-sm text-slate-400">Channel Points</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{userData?.dropPoints || 0}</div>
              <div className="text-sm text-slate-400">Drop Points</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-pink-400">{userData?.totalDrops || 0}</div>
              <div className="text-sm text-slate-400">Total Drops</div>
            </div>
          </div>
        </div>

        {/* Powerup Shop Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-2 text-purple-400">Powerup Shop</h2>
          <p className="text-slate-400 text-sm mb-4">
            Purchase powerups to use in the drop game! Activate them with chat commands while dropping.
            <Link to="/drop-game-rules" className="text-purple-400 hover:text-purple-300 ml-1">
              View Rules
            </Link>
          </p>

          {/* User's current powerups inventory */}
          {Object.values(userPowerups).some((qty) => qty > 0) && (
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Your Inventory</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(userPowerups).map(([id, quantity]) => {
                  if (quantity <= 0) return null;
                  const powerup = powerups[id];
                  if (!powerup) return null;
                  return (
                    <div key={id} className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-xl">{powerup.emoji}</span>
                      <span className="text-white font-medium">{powerup.name}</span>
                      <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">x{quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {Object.values(powerups).map((powerup) => {
              const owned = userPowerups[powerup.id] || 0;
              const canAfford = (userData?.channelPoints || 0) >= powerup.cost;
              const isBuying = buying === powerup.id;

              return (
                <div key={powerup.id} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-3xl">{powerup.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{powerup.name}</h3>
                        {owned > 0 && (
                          <span className="bg-purple-600/50 text-purple-200 text-xs px-2 py-0.5 rounded">
                            Owned: {owned}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">{powerup.description}</p>
                      <p className="text-xs text-purple-300 mt-1">Command: !{powerup.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                      {powerup.cost} pts
                    </span>
                    <button
                      onClick={() => handleBuyPowerup(powerup.id)}
                      disabled={!canAfford || isBuying}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        isBuying
                          ? 'bg-slate-600 text-slate-400 cursor-wait'
                          : canAfford
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
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
              className={`mt-4 p-3 rounded ${message.includes('Purchased') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-green-400">Settings</h2>

          {/* Country Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
            <div className="flex items-center gap-3">
              {selectedCountry && (
                <img
                  src={getFlagUrl(selectedCountry) || ''}
                  alt={selectedCountry}
                  className="w-8 h-6 object-cover rounded"
                />
              )}
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500 mt-1">Your flag will be displayed next to your username in chat</p>
          </div>

          {/* Voice Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Default TTS Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
            >
              <option value="">-- Select a voice --</option>
              {voices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} ({voice.labels?.gender || 'unknown'}, {voice.labels?.accent || 'neutral'})
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 mt-1">This voice will be used when you use !say without specifying a voice</p>
          </div>

          {/* Drop Game Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Drop Game Avatar</label>

            {dropImageUrl && (
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={dropImageUrl}
                  alt="Drop avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-green-400"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="text-sm text-slate-400">Current avatar</div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="cursor-pointer">
                <div
                  className={`flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-4 py-3 transition-colors ${uploading ? 'opacity-50' : ''}`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Upload Image</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-slate-500">PNG, JPEG, GIF, or WebP. Max 2MB. This image will be used in the drop game.</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Or enter an image URL:</label>
              <input
                type="url"
                value={dropImageUrl}
                onChange={(e) => setDropImageUrl(e.target.value)}
                placeholder="https://example.com/my-avatar.png"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-green-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message && !message.includes('Purchased') && (
            <div
              className={`mt-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-green-400">Help</h2>
          <div className="space-y-3 text-slate-300 text-sm">
            <p>
              <strong className="text-green-400">!say &lt;message&gt;</strong> - Text-to-speech using your default voice (costs 500 points)
            </p>
            <p>
              <strong className="text-green-400">!say id=VOICE_ID &lt;message&gt;</strong> - Use a specific voice (also saves it as default)
            </p>
            <p>
              <strong className="text-green-400">!drop</strong> - Play the drop game to earn points
            </p>
            <p>
              <strong className="text-green-400">!drop -powerups</strong> - List available powerups
            </p>
            <p>
              <strong className="text-green-400">!drop -buy [powerup]</strong> - Buy a powerup (e.g., !drop -buy tnt)
            </p>
            <p>
              <strong className="text-green-400">!drop -mine</strong> - View your owned powerups
            </p>
            <p>
              <strong className="text-green-400">!drop -rules</strong> - Get link to the drop game rules
            </p>
            <p>
              <strong className="text-green-400">!points</strong> - Check your point balance
            </p>
            <p>
              <strong className="text-green-400">!voicelist</strong> - View all available TTS voices
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <Link to="/drop-game-rules" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300">
              <span>View Drop Game Rules</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
