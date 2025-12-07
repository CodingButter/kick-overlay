import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { OverlayWidgetProps } from './types';

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

// Get flag image URL from country code
function getFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
}

// Get emote image URL from emote ID
function getEmoteUrl(emoteId: string): string {
  return `https://files.kick.com/emotes/${emoteId}/fullsize`;
}

// Parse message content and render emotes
function renderMessageContent(content: string): React.ReactNode {
  const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = emoteRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const emoteId = match[1];
    const emoteName = match[2];
    parts.push(
      <img
        key={`${emoteId}-${match.index}`}
        src={getEmoteUrl(emoteId!)}
        alt={emoteName}
        title={emoteName}
        className="inline-block align-middle"
        style={{ width: '28px', height: '28px' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

function ChatMessageItem({
  message,
  countryCode,
  colors,
}: {
  message: ChatMessage;
  countryCode?: string | null;
  colors: {
    foreground: string;
    secondary: string;
    primary: string;
    primaryForeground: string;
  };
}) {
  const username = message.sender?.username || 'Unknown';
  const content = message.content || '';
  const profilePicture = message.sender?.profile_picture;

  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: colors.secondary }}>
      <div className="flex items-center gap-2 mb-1">
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={username}
            className="rounded-full object-cover shrink-0"
            style={{ width: '30px', height: '30px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
            }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-bold text-xs shrink-0"
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: colors.primary,
              color: colors.primaryForeground,
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
        )}

        {countryCode && (
          <img
            src={getFlagUrl(countryCode)}
            alt={countryCode}
            className="object-cover rounded-sm shrink-0"
            style={{ width: '30px', height: '30px' }}
          />
        )}

        <span className="font-bold" style={{ color: colors.primary }}>
          {username}
        </span>
      </div>

      <p className="break-words" style={{ color: colors.foreground }}>
        {renderMessageContent(content)}
      </p>
    </div>
  );
}

export function ChatWidget({ width, height }: OverlayWidgetProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userCountries, setUserCountries] = useState<UserCountryCache>({});

  const fetchUserCountry = async (username: string) => {
    if (username in userCountries) return;

    try {
      const response = await fetch(`/api/stats/${username}`);
      if (response.ok) {
        const data = await response.json();
        setUserCountries((prev) => ({
          ...prev,
          [username]: data.country || null,
        }));
      } else {
        setUserCountries((prev) => ({
          ...prev,
          [username]: null,
        }));
      }
    } catch {
      setUserCountries((prev) => ({
        ...prev,
        [username]: null,
      }));
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/chat');
        const data = (await response.json()) as ChatMessage[];

        for (const msg of data) {
          const username = msg.sender?.username;
          if (username && !(username in userCountries)) {
            fetchUserCountry(username);
          }
        }

        setMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculate how many messages to show based on height
  const maxMessages = Math.max(5, Math.floor(height / 60));

  return (
    <div
      className="shadow-2xl p-4 flex flex-col h-full overflow-hidden"
      style={{
        borderRadius: '1rem',
        backgroundColor: colors.card,
        color: colors.cardForeground,
      }}
    >
      <h2
        className="text-lg font-bold mb-3 flex items-center gap-2 shrink-0"
        style={{ color: colors.primary }}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
        Chat
      </h2>
      <div className="flex-1 min-h-0 flex flex-col-reverse gap-2 overflow-hidden">
        {messages
          .slice(-maxMessages)
          .reverse()
          .map((msg, index) => (
            <ChatMessageItem
              key={msg.id || msg.message_id || index}
              message={msg}
              countryCode={msg.sender?.username ? userCountries[msg.sender.username] : null}
              colors={colors}
            />
          ))}
      </div>
    </div>
  );
}
