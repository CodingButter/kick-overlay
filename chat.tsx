import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

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
  broadcaster?: {
    username: string;
    id: number;
  };
}

interface UserCountryCache {
  [username: string]: string | null;
}

// Get flag image URL from country code using flagcdn.com
function getFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
}

function ChatMessageComponent({ message, countryCode }: { message: ChatMessage; countryCode?: string | null }) {
  const username = message.sender?.username || "Unknown";
  const content = message.content || "";
  const profilePicture = message.sender?.profile_picture;

  return (
    <div className="flex items-start gap-3 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 animate-fade-in">
      {/* Profile Picture */}
      <div className="shrink-0">
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={username}
            className="w-10 h-10 rounded-full object-cover border-2 border-green-400"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center text-slate-900 font-bold text-lg">
            {username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Username, Flag, and Message */}
      <div className="flex-1 min-w-0">
        {/* Username row with flag */}
        <div className="flex items-center gap-2">
          {countryCode && (
            <img
              src={getFlagUrl(countryCode)}
              alt={countryCode}
              className="w-5 h-4 object-cover rounded-sm shrink-0"
            />
          )}
          <span className="font-bold text-green-400">{username}</span>
        </div>
        {/* Message */}
        <p className="text-gray-100 break-words mt-0.5">{content}</p>
      </div>
    </div>
  );
}

function ChatOverlay() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        // Mark as checked but no country
        setUserCountries(prev => ({
          ...prev,
          [username]: null
        }));
      }
    } catch {
      // On error, mark as checked
      setUserCountries(prev => ({
        ...prev,
        [username]: null
      }));
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/chat");
        const data = await response.json() as ChatMessage[];
        setMessages(data);

        // Fetch countries for any new users
        for (const msg of data) {
          const username = msg.sender?.username;
          if (username && !(username in userCountries)) {
            fetchUserCountry(username);
          }
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => clearInterval(interval);
  }, [userCountries]);

  return (
    <div className="relative bg-slate-900/80 rounded-2xl shadow-2xl border border-slate-700 p-4 h-full overflow-hidden">
      {/* Fade gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none rounded-t-2xl" />

      <div className="flex flex-col-reverse gap-2 h-full overflow-hidden">
        {messages
          .slice()
          .reverse()
          .slice(0, 20)
          .map((msg, index) => (
            <ChatMessageComponent
              key={msg.id || msg.message_id || index}
              message={msg}
              countryCode={msg.sender?.username ? userCountries[msg.sender.username] : null}
            />
          ))}
      </div>
    </div>
  );
}

const container = document.getElementById("chat-container");
if (container) {
  const root = createRoot(container);
  root.render(<ChatOverlay />);
}
