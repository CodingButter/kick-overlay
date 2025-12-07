import { useState, useEffect, useRef } from 'react';
import { Play, Square, Check, Copy, Loader2 } from 'lucide-react';
import type { Voice } from '../types';
import { DEFAULT_MESSAGE } from '../types';

interface VoiceCardProps {
  voice: Voice;
  canPlay: boolean;
  onPlay: () => void;
}

export function VoiceCard({ voice, canPlay, onPlay }: VoiceCardProps) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFocus = () => {
    if (message === DEFAULT_MESSAGE) {
      setMessage('');
    }
  };

  const handleBlur = () => {
    if (message.trim() === '') {
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
      console.error('Failed to copy:', err);
    }
  };

  const playMessage = async () => {
    if (playing) {
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
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: voice.voice_id, text: message }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('TTS error:', error);
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

      audio.src = audioUrl;
      audio.currentTime = 0;

      try {
        await audio.play();
        setPlaying(true);
        setLoading(false);
      } catch (err) {
        console.error('Playback failed:', err);
        setPlaying(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to play:', err);
      setLoading(false);
    }
  };

  const labelEntries = voice.labels ? Object.entries(voice.labels) : [];

  return (
    <div className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">{voice.name}</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{voice.category}</span>
        </div>
      </div>

      {labelEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {labelEntries.map(([key, value]) => (
            <span
              key={key}
              className="text-xs bg-secondary text-foreground px-2 py-1 rounded-full"
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
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
          rows={2}
        />
        <div className="text-right text-xs text-muted-foreground mt-1">
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
              ? 'bg-primary text-primary-foreground'
              : loading
              ? 'bg-secondary text-muted-foreground cursor-wait'
              : !canPlay || !message.trim()
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : 'bg-secondary text-foreground hover:bg-muted'
          }`}
          title={canPlay || playing ? 'Play message' : 'Rate limit reached'}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : playing ? (
            <>
              <Square className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Play
            </>
          )}
        </button>
        <button
          onClick={copyCommand}
          disabled={!message.trim()}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? 'bg-primary text-primary-foreground'
              : !message.trim()
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : 'bg-secondary text-foreground hover:bg-muted'
          }`}
          title="Copy !say command"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Voice ID display */}
      <div className="mt-3 bg-background rounded-lg px-3 py-2">
        <code className="text-xs text-muted-foreground font-mono break-all">{voice.voice_id}</code>
      </div>
    </div>
  );
}
