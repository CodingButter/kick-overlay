import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// Sound notification for new messages after silence
const TWO_MINUTES = 2 * 60 * 1000;
const notificationSound = new Audio("/public/new_message.mp3");

// Audio unlock state - browsers require user interaction before playing audio
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  // Play a silent sound to unlock audio context
  const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
  silentAudio.play().then(() => {
    audioUnlocked = true;
    console.log("Audio unlocked");
  }).catch(() => {
    // Still mark as unlocked - the user interaction should have enabled it
    audioUnlocked = true;
  });
}

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

interface ChatMessage {
  id: string;
  timestamp: string;
  sender?: {
    username: string;
    id: number;
    profile_picture?: string;
  };
  content?: string;
  message_id?: string;
}

interface UserCountryCache {
  [username: string]: string | null;
}

// Get flag image URL from country code using flagcdn.com
function getFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
}

// Get emote image URL from emote ID
function getEmoteUrl(emoteId: string): string {
  return `https://files.kick.com/emotes/${emoteId}/fullsize`;
}

// Parse message content and render emotes
// Emote format: [emote:ID:NAME]
function renderMessageContent(content: string): React.ReactNode {
  const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = emoteRegex.exec(content)) !== null) {
    // Add text before the emote
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Add the emote image
    const emoteId = match[1];
    const emoteName = match[2];
    parts.push(
      <img
        key={`${emoteId}-${match.index}`}
        src={getEmoteUrl(emoteId)}
        alt={emoteName}
        title={emoteName}
        className="inline-block align-middle"
        style={{ width: '28px', height: '28px' }}
        onError={(e) => {
          // If emote fails to load, show the text instead
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last emote
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

interface LastEvent {
  type: 'follow' | 'subscription' | 'gift';
  username: string;
  timestamp: string;
  details?: string;
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const diffMs = now - eventTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
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
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-200">{label}</span>
        <span className="text-sm font-bold text-white">
          {current} / {target}
        </span>
      </div>
      <div className="h-5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
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

function ChatMessageItem({ message, countryCode }: { message: ChatMessage; countryCode?: string | null }) {
  const username = message.sender?.username || "Unknown";
  const content = message.content || "";
  const profilePicture = message.sender?.profile_picture;

  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
      {/* Header: Profile Picture, Flag, Username */}
      <div className="flex items-center gap-2 mb-1">
        {/* Profile Picture - 30x30px */}
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={username}
            className="rounded-full object-cover border border-green-400 shrink-0"
            style={{ width: '30px', height: '30px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
            }}
          />
        ) : (
          <div
            className="rounded-full bg-green-400 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0"
            style={{ width: '30px', height: '30px' }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Flag - 30x30px */}
        {countryCode && (
          <img
            src={getFlagUrl(countryCode)}
            alt={countryCode}
            className="object-cover rounded-sm shrink-0"
            style={{ width: '30px', height: '30px' }}
          />
        )}

        {/* Username */}
        <span className="font-bold text-green-400">{username}</span>
      </div>

      {/* Message - below the header (with emote rendering) */}
      <p className="text-gray-100 break-words">{renderMessageContent(content)}</p>
    </div>
  );
}

function CombinedOverlay() {
  const [goals, setGoals] = useState<GoalData>({
    followers: { current: 0, target: 100 },
    subscribers: { current: 0, target: 50 },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true); // Audio works (notification sound plays)
  const [userCountries, setUserCountries] = useState<UserCountryCache>({});

  // Fetch country for a specific user
  const fetchUserCountry = async (username: string) => {
    // Skip if already cached (including null = no country)
    if (username in userCountries) return;

    try {
      const response = await fetch(`/api/stats/${username}`);
      if (response.ok) {
        const data = await response.json();
        setUserCountries(prev => ({
          ...prev,
          [username]: data.country || null
        }));
      } else {
        setUserCountries(prev => ({
          ...prev,
          [username]: null
        }));
      }
    } catch {
      setUserCountries(prev => ({
        ...prev,
        [username]: null
      }));
    }
  };

  const handleEnableAudio = () => {
    unlockAudio();
    setAudioEnabled(true);
  };

  // Track message count and last message time for sound notification
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch("/api/goals");
        const data = (await response.json()) as GoalData;
        setGoals(data);
      } catch (error) {
        console.error("Failed to fetch goals:", error);
      }
    };

    const fetchLastEvent = async () => {
      try {
        const response = await fetch("/api/events/last");
        const data = (await response.json()) as LastEvent | null;
        setLastEvent(data);
      } catch (error) {
        console.error("Failed to fetch last event:", error);
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/chat");
        const data = (await response.json()) as ChatMessage[];

        // Check if we have new messages
        if (data.length > lastMessageCountRef.current) {
          const now = Date.now();
          const timeSinceLastMessage = now - lastMessageTimeRef.current;

          // Play sound on first message OR if it's been more than 2 minutes since last message
          if (lastMessageCountRef.current === 0 || timeSinceLastMessage >= TWO_MINUTES) {
            notificationSound.play().catch(() => {
              // Ignore autoplay errors (browser may block until user interaction)
            });
          }

          // Update tracking refs
          lastMessageTimeRef.current = now;
        }
        lastMessageCountRef.current = data.length;

        // Fetch countries for any new users
        for (const msg of data) {
          const username = msg.sender?.username;
          if (username && !(username in userCountries)) {
            fetchUserCountry(username);
          }
        }

        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    const fetchTips = async () => {
      try {
        const response = await fetch("/api/tips");
        const data = (await response.json()) as string[];
        setTips(data);
      } catch (error) {
        console.error("Failed to fetch tips:", error);
      }
    };

    fetchGoals();
    fetchMessages();
    fetchLastEvent();
    fetchTips();

    const goalsInterval = setInterval(fetchGoals, 5000);
    const chatInterval = setInterval(fetchMessages, 2000);
    const eventInterval = setInterval(fetchLastEvent, 5000);

    return () => {
      clearInterval(goalsInterval);
      clearInterval(chatInterval);
      clearInterval(eventInterval);
    };
  }, []);

  // Cycle through tips every 8 seconds
  useEffect(() => {
    if (tips.length === 0) return;
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(tipInterval);
  }, [tips.length]);

  // TTS audio playback - poll for new audio and play it
  useEffect(() => {
    let isPlaying = false;
    let currentAudio: HTMLAudioElement | null = null;

    const checkAndPlayTTS = async () => {
      if (isPlaying) return;

      try {
        const response = await fetch("/api/tts/next");
        if (response.status === 204) return; // No audio in queue

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) return;

        isPlaying = true;
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create a new Audio element for each playback
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          isPlaying = false;
          currentAudio = null;
        };

        audio.onerror = (e) => {
          console.error("TTS audio error:", e);
          URL.revokeObjectURL(audioUrl);
          isPlaying = false;
          currentAudio = null;
        };

        // Play directly - audio will buffer as it plays
        try {
          await audio.play();
          console.log("TTS playing...");
        } catch (err) {
          console.error("TTS play error:", err);
          URL.revokeObjectURL(audioUrl);
          isPlaying = false;
        }
      } catch (error) {
        console.error("TTS playback error:", error);
        isPlaying = false;
      }
    };

    const ttsInterval = setInterval(checkAndPlayTTS, 1000);
    return () => {
      clearInterval(ttsInterval);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    };
  }, []);

  return (
    <div className="w-[1920px] h-[1080px] flex flex-col gap-4 p-4">
      {/* Audio enable overlay - required for browser autoplay policy */}
      {!audioEnabled && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={handleEnableAudio}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🔊</div>
            <h2 className="text-2xl font-bold text-white mb-2">Click to Enable Audio</h2>
            <p className="text-gray-400">Required for TTS messages</p>
          </div>
        </div>
      )}

      {/* TOP ROW - VS Code (left) | Goals, Notifications, Chat (right) */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* VS Code Frame - chroma-key magenta for OBS filtering */}
        <div
          className="flex-1 rounded-2xl border-2 border-slate-600/50 pointer-events-none"
          style={{
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            background: '#FF00FF',
          }}
        />

        {/* Right sidebar - Goals, Notifications, Chat as separate sections */}
        <div className="w-[420px] flex flex-col gap-4 min-h-0">
          {/* Goals section */}
          <div className="shrink-0 bg-slate-900/90 rounded-2xl shadow-2xl border border-slate-700 p-4">
            <h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
          </div>

          {/* Notifications section */}
          <div className="shrink-0 bg-slate-900/90 rounded-2xl shadow-2xl border border-slate-700 p-4">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#22D3EE' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              Latest Event
            </h2>
            <div className="flex items-center gap-2 text-sm">
              {!lastEvent && (
                <span style={{ color: '#6B7280' }}>No Recent Events</span>
              )}
              {lastEvent?.type === 'follow' && (
                <>
                  <span style={{ color: '#F87171' }}>
                    <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span style={{ color: '#D1D5DB' }}>
                    <span className="font-bold" style={{ color: '#F87171' }}>{lastEvent.username}</span> followed! <span style={{ color: '#6B7280' }}>- {getRelativeTime(lastEvent.timestamp)}</span>
                  </span>
                </>
              )}
              {lastEvent?.type === 'subscription' && (
                <>
                  <span style={{ color: '#FBBF24' }}>
                    <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                  <span style={{ color: '#D1D5DB' }}>
                    <span className="font-bold" style={{ color: '#FBBF24' }}>{lastEvent.username}</span> subscribed! <span style={{ color: '#6B7280' }}>- {getRelativeTime(lastEvent.timestamp)}</span>
                  </span>
                </>
              )}
              {lastEvent?.type === 'gift' && (
                <>
                  <span style={{ color: '#FACC15' }}>
                    <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                      <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                    </svg>
                  </span>
                  <span style={{ color: '#D1D5DB' }}>
                    <span className="font-bold" style={{ color: '#FACC15' }}>{lastEvent.username}</span> gifted {lastEvent.details}! <span style={{ color: '#6B7280' }}>- {getRelativeTime(lastEvent.timestamp)}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Chat section - fills remaining space */}
          <div className="flex-1 min-h-0 bg-slate-900/90 rounded-2xl shadow-2xl border border-slate-700 p-4 overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2 shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Chat
            </h2>
            <div className="flex-1 min-h-0 flex flex-col-reverse gap-2 overflow-hidden">
              {messages
                .slice(-15)
                .reverse()
                .map((msg, index) => (
                  <ChatMessageItem
                    key={msg.id || msg.message_id || index}
                    message={msg}
                    countryCode={msg.sender?.username ? userCountries[msg.sender.username] : null}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW - Diabetes Metrics | Music | Camera */}
      <div className="h-[250px] flex gap-4 shrink-0">
        {/* Blood Sugar & Graph */}
        <div
          className="flex-1 rounded-2xl bg-slate-900/90 shadow-2xl border border-slate-700 pointer-events-none"
        />

        {/* Insulin Delivery Graph - chroma-key magenta for OBS filtering */}
        <div
          className="flex-1 rounded-2xl border-2 border-slate-600/50 pointer-events-none"
          style={{
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            background: '#FF00FF',
          }}
        />

        {/* Units Remaining & Battery - chroma-key magenta for OBS filtering */}
        <div
          className="flex-1 rounded-2xl border-2 border-slate-600/50 pointer-events-none"
          style={{
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            background: '#FF00FF',
          }}
        />

        {/* Music Video Frame - square (250x250), chroma-key magenta for OBS filtering */}
        <div
          className="w-[250px] shrink-0 rounded-2xl border-2 border-slate-600/50 pointer-events-none"
          style={{
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            background: '#FF00FF',
          }}
        />

        {/* Camera Frame - matches right sidebar width, chroma-key magenta for OBS filtering */}
        <div
          className="w-[420px] shrink-0 rounded-3xl border-4 border-white pointer-events-none"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)',
            background: '#FF00FF',
          }}
        />
      </div>

      {/* BOTTOM ROW - Tips (full width) */}
      {tips.length > 0 && (
        <div className="shrink-0 bg-slate-900/90 rounded-2xl shadow-2xl border border-slate-700 px-6 py-3">
          <div className="flex items-center gap-3 text-base">
            <span className="text-green-400 font-bold shrink-0">TIP:</span>
            <span className="text-gray-200">{tips[currentTipIndex]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("overlay-container");
if (container) {
  const root = createRoot(container);
  root.render(<CombinedOverlay />);
}
