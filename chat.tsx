import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

interface ChatMessage {
  id: string;
  timestamp: string;
  sender?: {
    username: string;
    id: number;
  };
  content?: string;
  message_id?: string;
  broadcaster?: {
    username: string;
    id: number;
  };
}

function ChatMessage({ message }: { message: ChatMessage }) {
  const username = message.sender?.username || "Unknown";
  const content = message.content || "";

  return (
    <div className="flex items-start gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 animate-fade-in">
      <span className="font-bold text-green-400 shrink-0">{username}</span>
      <span className="text-gray-100 break-words">{content}</span>
    </div>
  );
}

function ChatOverlay() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/chat");
        const data = await response.json() as ChatMessage[];
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => clearInterval(interval);
  }, []);

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
            <ChatMessage key={msg.id || msg.message_id || index} message={msg} />
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
