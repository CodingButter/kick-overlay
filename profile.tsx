import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

interface UserData {
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

function ProfilePage() {
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

    // Cookie helpers
    const getSessionCookie = (username: string): string | null => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === `profile_session_${username}`) {
                return value;
            }
        }
        return null;
    };

    const setSessionCookie = (username: string, token: string) => {
        // Set cookie to expire in 7 days
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        document.cookie = `profile_session_${username}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    };

    // Form state
    const [selectedVoice, setSelectedVoice] = useState<string>("");
    const [dropImageUrl, setDropImageUrl] = useState<string>("");
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Extract username from URL: /profile/:username
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[2] || '';

    // Check for existing session or generate verification code on mount
    useEffect(() => {
        if (!username) {
            setError("No username specified");
            setLoading(false);
            return;
        }

        const initSession = async () => {
            // First check if we have a valid session cookie
            const sessionToken = getSessionCookie(username);
            if (sessionToken) {
                // Validate the session with the server
                try {
                    const res = await fetch(`/api/session/validate/${username}/${sessionToken}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.valid) {
                            // Session is valid, skip verification
                            setIsVerified(true);
                            setVerifyStatus('verified');
                            setLoading(false);
                            loadProfileData();
                            return;
                        }
                    }
                } catch (err) {
                    // Session validation failed, continue to verification
                }
            }

            // No valid session, generate verification code
            try {
                const res = await fetch(`/api/verify/generate/${username}`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setVerifyCode(data.code);
                    setVerifyStatus('ready');
                } else {
                    setError('Failed to generate verification code');
                }
            } catch (err) {
                setError('Failed to connect to server');
            }
            setLoading(false);
        };
        initSession();
    }, [username]);

    // Poll for profile data updates (powerups, points) every 10 seconds
    useEffect(() => {
        if (!isVerified || !username) return;

        const pollInterval = setInterval(async () => {
            try {
                // Refresh user powerups
                const userPowerupsRes = await fetch(`/api/powerups/${username}`);
                if (userPowerupsRes.ok) {
                    const userPowerupsData = await userPowerupsRes.json();
                    setUserPowerups(userPowerupsData);
                }

                // Refresh profile data (points)
                const profileRes = await fetch(`/api/profile/${username}`);
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    setUserData(prev => prev ? {
                        ...prev,
                        channelPoints: profile.channelPoints,
                        dropPoints: profile.dropPoints,
                        totalDrops: profile.totalDrops,
                    } : prev);
                }
            } catch (err) {
                // Silently continue polling
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(pollInterval);
    }, [isVerified, username]);

    // Poll for verification status
    useEffect(() => {
        if (!verifyCode || verifyStatus !== 'waiting') return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/verify/check/${username}/${verifyCode}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.verified) {
                        setIsVerified(true);
                        setVerifyStatus('verified');
                        clearInterval(pollInterval);

                        // Save session token from server (or use the verify code as token)
                        const sessionToken = data.sessionToken || verifyCode;
                        setSessionCookie(username, sessionToken);

                        // Load full profile data
                        loadProfileData();
                    }
                }
            } catch (err) {
                // Silently continue polling
            }
        }, 2000);

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            setError('Verification expired. Please refresh the page to try again.');
            setVerifyStatus('ready');
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [verifyCode, verifyStatus, username]);

    const loadProfileData = async () => {
        try {
            // Fetch user profile (using session from verification)
            const profileRes = await fetch(`/api/profile/${username}`);
            if (profileRes.ok) {
                const profile = await profileRes.json();
                setUserData(profile);
                setSelectedVoice(profile.voiceId || "");
                setDropImageUrl(profile.dropImage || "");
                setSelectedCountry(profile.country || "");
            }

            // Fetch available voices
            const voicesRes = await fetch("/api/voices");
            if (voicesRes.ok) {
                const voicesData = await voicesRes.json();
                // API returns array directly, not wrapped in { voices: [] }
                setVoices(Array.isArray(voicesData) ? voicesData : voicesData.voices || []);
            }

            // Fetch available powerups
            const powerupsRes = await fetch("/api/powerups");
            if (powerupsRes.ok) {
                const powerupsData = await powerupsRes.json();
                setPowerups(powerupsData);
            }

            // Fetch user's owned powerups
            const userPowerupsRes = await fetch(`/api/powerups/${username}`);
            if (userPowerupsRes.ok) {
                const userPowerupsData = await userPowerupsRes.json();
                setUserPowerups(userPowerupsData);
            }
        } catch (err) {
            setError("Failed to load profile data.");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
                setMessage("Image uploaded successfully!");
                // Reload profile data
                const profileRes = await fetch(`/api/profile/${username}`);
                if (profileRes.ok) {
                    setUserData(await profileRes.json());
                }
            } else {
                const err = await res.json();
                setMessage(err.error || "Failed to upload image.");
            }
        } catch (err) {
            setMessage("Failed to upload image.");
        }

        setUploading(false);
    };

    const handleStartVerify = () => {
        setVerifyStatus('waiting');
    };

    const handleCopyCommand = async () => {
        const command = `!verify ${verifyCode}`;
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
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

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/profile/${username}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voiceId: selectedVoice || undefined,
                    dropImage: dropImageUrl || undefined,
                    country: selectedCountry || undefined,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setUserData(updated);
                setMessage("Settings saved successfully!");
            } else {
                setMessage("Failed to save settings.");
            }
        } catch (err) {
            setMessage("Failed to save settings.");
        }

        setSaving(false);
    };

    const handleBuyPowerup = async (powerupId: string) => {
        setBuying(powerupId);
        setMessage(null);

        try {
            const res = await fetch(`/api/powerups/${username}/buy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ powerupId }),
            });

            const data = await res.json();
            if (data.success) {
                setMessage(`Purchased ${powerups[powerupId]?.name}! You now have ${data.quantity}.`);
                // Update user powerups
                setUserPowerups(prev => ({ ...prev, [powerupId]: data.quantity }));
                // Update channel points
                setUserData(prev => prev ? { ...prev, channelPoints: data.balance } : prev);
            } else {
                setMessage(data.error || "Failed to purchase powerup.");
            }
        } catch (err) {
            setMessage("Failed to purchase powerup.");
        }

        setBuying(null);
    };

    // Common countries list with codes
    const countries = [
        { code: "", name: "-- Select Country --" },
        { code: "US", name: "United States" },
        { code: "GB", name: "United Kingdom" },
        { code: "CA", name: "Canada" },
        { code: "AU", name: "Australia" },
        { code: "DE", name: "Germany" },
        { code: "FR", name: "France" },
        { code: "JP", name: "Japan" },
        { code: "KR", name: "South Korea" },
        { code: "BR", name: "Brazil" },
        { code: "MX", name: "Mexico" },
        { code: "ES", name: "Spain" },
        { code: "IT", name: "Italy" },
        { code: "NL", name: "Netherlands" },
        { code: "SE", name: "Sweden" },
        { code: "NO", name: "Norway" },
        { code: "DK", name: "Denmark" },
        { code: "FI", name: "Finland" },
        { code: "PL", name: "Poland" },
        { code: "RU", name: "Russia" },
        { code: "IN", name: "India" },
        { code: "CN", name: "China" },
        { code: "TW", name: "Taiwan" },
        { code: "PH", name: "Philippines" },
        { code: "ID", name: "Indonesia" },
        { code: "TH", name: "Thailand" },
        { code: "VN", name: "Vietnam" },
        { code: "MY", name: "Malaysia" },
        { code: "SG", name: "Singapore" },
        { code: "NZ", name: "New Zealand" },
        { code: "AR", name: "Argentina" },
        { code: "CL", name: "Chile" },
        { code: "CO", name: "Colombia" },
        { code: "PE", name: "Peru" },
        { code: "ZA", name: "South Africa" },
        { code: "EG", name: "Egypt" },
        { code: "NG", name: "Nigeria" },
        { code: "AE", name: "UAE" },
        { code: "SA", name: "Saudi Arabia" },
        { code: "IL", name: "Israel" },
        { code: "TR", name: "Turkey" },
        { code: "UA", name: "Ukraine" },
        { code: "CZ", name: "Czech Republic" },
        { code: "AT", name: "Austria" },
        { code: "CH", name: "Switzerland" },
        { code: "BE", name: "Belgium" },
        { code: "PT", name: "Portugal" },
        { code: "IE", name: "Ireland" },
        { code: "GR", name: "Greece" },
        { code: "HU", name: "Hungary" },
        { code: "RO", name: "Romania" },
    ].sort((a, b) => a.code === "" ? -1 : b.code === "" ? 1 : a.name.localeCompare(b.name));

    // Get flag emoji from country code using flagcdn.com
    const getFlagUrl = (countryCode: string) => {
        if (!countryCode) return null;
        return `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Show verification flow if not verified
    if (!isVerified) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-lg">
                <h1 className="text-3xl font-bold text-green-400 mb-2 text-center">{username}'s Profile</h1>
                <p className="text-gray-400 mb-8 text-center">Verify your identity to access your settings</p>

                <div className="bg-gray-800 rounded-lg p-6">
                    {verifyStatus === 'ready' && (
                        <>
                            <div className="text-center mb-6">
                                <p className="mb-4">To prove you are <span className="text-green-400 font-bold">{username}</span>, paste this command in chat:</p>
                                <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                    <code className="text-xl font-bold text-green-400 block mb-3">!verify {verifyCode}</code>
                                    <button
                                        onClick={handleCopyCommand}
                                        className={`px-4 py-2 rounded font-medium transition-colors ${
                                            copied
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                                        }`}
                                    >
                                        {copied ? 'Copied!' : 'Copy Command'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <h3 className="font-bold text-lg">Instructions:</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                                    <li>Copy the command above</li>
                                    <li>Paste it in the stream chat on Kick</li>
                                    <li>Click the button below to start verification</li>
                                    <li>This page will automatically unlock</li>
                                </ol>
                            </div>

                            <button
                                onClick={handleStartVerify}
                                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors"
                            >
                                I'm Ready - Start Verification
                            </button>
                        </>
                    )}

                    {verifyStatus === 'waiting' && (
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                                <p className="text-lg">Waiting for verification...</p>
                            </div>

                            <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                <p className="text-sm text-gray-400 mb-2">Paste this in chat:</p>
                                <code className="text-xl font-bold text-green-400 block mb-3">!verify {verifyCode}</code>
                                <button
                                    onClick={handleCopyCommand}
                                    className={`px-4 py-2 rounded font-medium transition-colors ${
                                        copied
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {copied ? 'Copied!' : 'Copy Command'}
                                </button>
                            </div>

                            <p className="text-gray-400 text-sm">
                                This page will automatically update when you verify.
                                <br />
                                Code expires in 5 minutes.
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-center text-gray-500 text-sm mt-8">
                    This ensures only you can modify your settings.
                </p>
            </div>
        );
    }

    // Show full profile after verification
    const totalPoints = (userData?.channelPoints || 0) + (userData?.dropPoints || 0);

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-green-400 mb-2">{username}'s Profile</h1>
            <p className="text-gray-400 mb-8">Manage your stream settings and view your stats</p>

            {/* Stats Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold mb-4 text-green-400">Your Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{totalPoints}</div>
                        <div className="text-sm text-gray-400">Total Points</div>
                    </div>
                    <div className="bg-gray-700 rounded p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">{userData?.channelPoints || 0}</div>
                        <div className="text-sm text-gray-400">Channel Points</div>
                    </div>
                    <div className="bg-gray-700 rounded p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{userData?.dropPoints || 0}</div>
                        <div className="text-sm text-gray-400">Drop Points</div>
                    </div>
                    <div className="bg-gray-700 rounded p-4 text-center">
                        <div className="text-2xl font-bold text-pink-400">{userData?.totalDrops || 0}</div>
                        <div className="text-sm text-gray-400">Total Drops</div>
                    </div>
                </div>
            </div>

            {/* Powerup Shop Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold mb-2 text-purple-400">Powerup Shop</h2>
                <p className="text-gray-400 text-sm mb-4">
                    Purchase powerups to use in the drop game! Activate them with chat commands while dropping.
                    <a href="/drop-game-rules" className="text-purple-400 hover:text-purple-300 ml-1">View Rules</a>
                </p>

                {/* User's current powerups inventory */}
                {Object.values(userPowerups).some(qty => qty > 0) && (
                    <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Your Inventory</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(userPowerups).map(([id, quantity]) => {
                                if (quantity <= 0) return null;
                                const powerup = powerups[id];
                                if (!powerup) return null;
                                return (
                                    <div key={id} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
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
                            <div
                                key={powerup.id}
                                className="bg-gray-700 rounded-lg p-4 flex items-center justify-between gap-4"
                            >
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
                                        <p className="text-sm text-gray-400 truncate">{powerup.description}</p>
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
                                                ? 'bg-gray-600 text-gray-400 cursor-wait'
                                                : canAfford
                                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
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
                    <div className={`mt-4 p-3 rounded ${message.includes('Purchased') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {message}
                    </div>
                )}
            </div>

            {/* Settings Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold mb-4 text-green-400">Settings</h2>

                {/* Country Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Country
                    </label>
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
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:border-green-400 focus:outline-none"
                        >
                            {countries.map((country) => (
                                <option key={country.code} value={country.code}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Your flag will be displayed next to your username in chat
                    </p>
                </div>

                {/* Voice Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Default TTS Voice
                    </label>
                    <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:border-green-400 focus:outline-none"
                    >
                        <option value="">-- Select a voice --</option>
                        {voices.map((voice) => (
                            <option key={voice.voice_id} value={voice.voice_id}>
                                {voice.name} ({voice.labels?.gender || 'unknown'}, {voice.labels?.accent || 'neutral'})
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                        This voice will be used when you use !say without specifying a voice
                    </p>
                </div>

                {/* Drop Game Image */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Drop Game Avatar
                    </label>

                    {/* Current Image Preview */}
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
                            <div className="text-sm text-gray-400">
                                Current avatar
                            </div>
                        </div>
                    )}

                    {/* Upload Button */}
                    <div className="flex flex-col gap-3">
                        <label className="cursor-pointer">
                            <div className={`flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded px-4 py-3 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                        <p className="text-sm text-gray-500">
                            PNG, JPEG, GIF, or WebP. Max 2MB. This image will be used in the drop game.
                        </p>
                    </div>

                    {/* Or use URL */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Or enter an image URL:
                        </label>
                        <input
                            type="url"
                            value={dropImageUrl}
                            onChange={(e) => setDropImageUrl(e.target.value)}
                            placeholder="https://example.com/my-avatar.png"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:border-green-400 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>

                {message && (
                    <div className={`mt-4 p-3 rounded ${message.includes('success') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {message}
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-green-400">Help</h2>
                <div className="space-y-3 text-gray-300 text-sm">
                    <p><strong>!say &lt;message&gt;</strong> - Text-to-speech using your default voice (costs 500 points)</p>
                    <p><strong>!say id=VOICE_ID &lt;message&gt;</strong> - Use a specific voice (also saves it as default)</p>
                    <p><strong>!drop</strong> - Play the drop game to earn points</p>
                    <p><strong>!drop -powerups</strong> - List available powerups</p>
                    <p><strong>!drop -buy [powerup]</strong> - Buy a powerup (e.g., !drop -buy tnt)</p>
                    <p><strong>!drop -mine</strong> - View your owned powerups</p>
                    <p><strong>!drop -rules</strong> - Get link to the drop game rules</p>
                    <p><strong>!points</strong> - Check your point balance</p>
                    <p><strong>!voicelist</strong> - View all available TTS voices</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <a
                        href="/drop-game-rules"
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
                    >
                        <span>View Drop Game Rules</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}

const container = document.getElementById("profile-root");
if (container) {
    const root = createRoot(container);
    root.render(<ProfilePage />);
}
