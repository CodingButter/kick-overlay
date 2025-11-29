import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// Audio context primer - fixes first-play audio cutoff issue
let audioContextPrimed = false;
function primeAudioContext() {
  if (audioContextPrimed) return;

  // Create a short silent audio and play it to "unlock" the audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);

  audioContextPrimed = true;
  console.log("Audio context primed");
}

// Prime audio on first user interaction
if (typeof window !== "undefined") {
  const primeOnInteraction = () => {
    primeAudioContext();
    document.removeEventListener("click", primeOnInteraction);
    document.removeEventListener("touchstart", primeOnInteraction);
    document.removeEventListener("keydown", primeOnInteraction);
  };
  document.addEventListener("click", primeOnInteraction);
  document.addEventListener("touchstart", primeOnInteraction);
  document.addEventListener("keydown", primeOnInteraction);
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in ms

function usePreviewRateLimit() {
  const [playCount, setPlayCount] = useState(0);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("voicePreviewRateLimit");
    if (stored) {
      const { count, windowStart } = JSON.parse(stored);
      const now = Date.now();
      if (now - windowStart < RATE_LIMIT_WINDOW) {
        setPlayCount(count);
        setResetTime(windowStart + RATE_LIMIT_WINDOW);
      } else {
        localStorage.removeItem("voicePreviewRateLimit");
      }
    }
  }, []);

  useEffect(() => {
    if (!resetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = resetTime - now;
      if (remaining <= 0) {
        setPlayCount(0);
        setResetTime(null);
        setTimeLeft("");
        localStorage.removeItem("voicePreviewRateLimit");
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resetTime]);

  const canPlay = playCount < RATE_LIMIT_MAX;
  const remaining = RATE_LIMIT_MAX - playCount;

  const recordPlay = () => {
    const now = Date.now();
    const stored = localStorage.getItem("voicePreviewRateLimit");
    let newCount = 1;
    let windowStart = now;

    if (stored) {
      const data = JSON.parse(stored);
      if (now - data.windowStart < RATE_LIMIT_WINDOW) {
        newCount = data.count + 1;
        windowStart = data.windowStart;
      }
    }

    localStorage.setItem("voicePreviewRateLimit", JSON.stringify({ count: newCount, windowStart }));
    setPlayCount(newCount);
    setResetTime(windowStart + RATE_LIMIT_WINDOW);
  };

  return { canPlay, remaining, timeLeft, recordPlay };
}

interface VoiceCardProps {
  voice: Voice;
  canPlay: boolean;
  onPlay: () => void;
}

const DEFAULT_MESSAGE = "Hello! This is a test of my voice.";

function VoiceCard({ voice, canPlay, onPlay }: VoiceCardProps) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFocus = () => {
    if (message === DEFAULT_MESSAGE) {
      setMessage("");
    }
  };

  const handleBlur = () => {
    if (message.trim() === "") {
      setMessage(DEFAULT_MESSAGE);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const copyCommand = async () => {
    try {
      const command = `!say id=${voice.voice_id} ${message}`;
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const playMessage = async () => {
    if (playing) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        URL.revokeObjectURL(audioRef.current.src);
      }
      setPlaying(false);
      return;
    }

    if (!canPlay || !message.trim()) return;

    setLoading(true);
    onPlay();

    try {
      const response = await fetch("/api/tts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice.voice_id, text: message }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("TTS error:", error);
        setLoading(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio();
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlaying(false);
        setLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Set source and wait for it to be playable
      audio.src = audioUrl;
      audio.currentTime = 0;

      try {
        await audio.play();
        setPlaying(true);
        setLoading(false);
      } catch (err) {
        console.error("Playback failed:", err);
        setPlaying(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to play:", err);
      setLoading(false);
    }
  };

  const labelEntries = voice.labels ? Object.entries(voice.labels) : [];

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-green-500/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{voice.name}</h3>
          <span className="text-xs text-slate-400 uppercase tracking-wide">{voice.category}</span>
        </div>
      </div>

      {labelEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {labelEntries.map(([key, value]) => (
            <span
              key={key}
              className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full"
            >
              {value}
            </span>
          ))}
        </div>
      )}

      {/* Message input */}
      <div className="mb-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type your message..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none"
          rows={2}
        />
        <div className="text-right text-xs text-slate-500 mt-1">
          {message.length}/200
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={playMessage}
          disabled={(!canPlay && !playing) || loading || !message.trim()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            playing
              ? "bg-green-500 text-white"
              : loading
              ? "bg-slate-700 text-slate-400 cursor-wait"
              : !canPlay || !message.trim()
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          title={canPlay || playing ? "Play message" : "Rate limit reached"}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : playing ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play
            </>
          )}
        </button>
        <button
          onClick={copyCommand}
          disabled={!message.trim()}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : !message.trim()
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          title="Copy !say command"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Voice ID display */}
      <div className="mt-3 bg-slate-900 rounded-lg px-3 py-2">
        <code className="text-xs text-slate-500 font-mono break-all">{voice.voice_id}</code>
      </div>
    </div>
  );
}

function VoiceList() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const { canPlay, remaining, timeLeft, recordPlay } = usePreviewRateLimit();

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("/api/voices");
        const data = (await response.json()) as Voice[];
        setVoices(data);
      } catch (error) {
        console.error("Failed to fetch voices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Extract unique categories and tags
  const categories = [...new Set(voices.map((v) => v.category))].sort();
  const allTags = new Set<string>();
  voices.forEach((voice) => {
    if (voice.labels) {
      Object.values(voice.labels).forEach((label) => allTags.add(label));
    }
  });
  const sortedTags = [...allTags].sort();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const filteredVoices = voices.filter((voice) => {
    // Search filter
    const searchMatch =
      searchFilter === "" ||
      voice.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      voice.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      Object.values(voice.labels || {}).some((label) =>
        label.toLowerCase().includes(searchFilter.toLowerCase())
      );

    // Category filter
    const categoryMatch =
      categoryFilter === "all" || voice.category === categoryFilter;

    // Tags filter (voice must have ALL selected tags)
    const tagMatch =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) =>
        Object.values(voice.labels || {}).includes(tag)
      );

    return searchMatch && categoryMatch && tagMatch;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-400 mb-2">Available Voices</h1>
        <p className="text-slate-400">
          Test voices and copy the <code className="text-green-400 bg-slate-800 px-2 py-1 rounded">!say</code> command
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Type your message, click Play to hear it, then Copy to get the command
        </p>
      </div>

      {/* Rate limit indicator */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="text-slate-400 text-sm">
          Previews remaining: <span className={remaining > 3 ? "text-green-400" : remaining > 0 ? "text-yellow-400" : "text-red-400"}>{remaining}/{RATE_LIMIT_MAX}</span>
        </span>
        {timeLeft && (
          <span className="text-slate-500 text-sm">
            (resets in {timeLeft})
          </span>
        )}
      </div>

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search voices..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === "all"
                ? "bg-green-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                categoryFilter === category
                  ? "bg-green-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tags filter */}
      {sortedTags.length > 0 && (
        <div className="mb-6">
          <p className="text-slate-400 text-sm mb-2">Filter by tags:</p>
          <div className="flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.has(tag)
                    ? "bg-green-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Clear tags
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400 mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading voices...</p>
        </div>
      ) : filteredVoices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No voices found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVoices.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              canPlay={canPlay}
              onPlay={recordPlay}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-8 text-slate-500 text-sm">
        {filteredVoices.length} voice{filteredVoices.length !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}

const container = document.getElementById("voicelist-container");
if (container) {
  const root = createRoot(container);
  root.render(<VoiceList />);
}
