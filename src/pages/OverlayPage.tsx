import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { OverlayRenderer, type OverlayLayoutConfig } from "@/components/overlay";

// Sound notification for new messages after silence
const DEFAULT_NOTIFICATION_THRESHOLD = 2 * 60 * 1000; // 2 minutes default
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

export function OverlayPage() {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;

  const [layout, setLayout] = useState<OverlayLayoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true); // OBS browser sources don't have autoplay restrictions
  const [notificationThreshold, setNotificationThreshold] = useState(DEFAULT_NOTIFICATION_THRESHOLD);

  // Track message count and last message time for sound notification
  const lastMessageCountRef = useRef<number>(-1); // -1 means not initialized yet (skip first load)
  const lastMessageTimeRef = useRef<number>(Date.now());

  const handleEnableAudio = () => {
    unlockAudio();
    setAudioEnabled(true);
  };

  // Fetch layout configuration and poll for changes
  useEffect(() => {
    let layoutHash = '';

    const fetchLayout = async () => {
      try {
        const response = await fetch("/api/overlay/layout");
        const data = await response.json();
        const newHash = JSON.stringify(data);

        // Only update if layout actually changed
        if (newHash !== layoutHash) {
          layoutHash = newHash;
          setLayout(data);
          if (layoutHash !== '') {
            console.log("Layout updated, refreshing overlay...");
          }
        }
      } catch (error) {
        console.error("Failed to fetch layout:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();

    // Poll for layout changes every 2 seconds
    const interval = setInterval(fetchLayout, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch overlay settings on mount
  useEffect(() => {
    const fetchOverlaySettings = async () => {
      try {
        const response = await fetch("/api/overlay/settings");
        const settings = await response.json();
        if (settings.notification_sound_threshold) {
          const threshold = parseInt(settings.notification_sound_threshold, 10);
          if (!isNaN(threshold) && threshold > 0) {
            setNotificationThreshold(threshold);
            console.log(`Notification threshold set to ${threshold}ms`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch overlay settings:", error);
      }
    };
    fetchOverlaySettings();
  }, []);

  // Chat notification sound effect
  useEffect(() => {
    const checkMessages = async () => {
      try {
        const response = await fetch("/api/chat");
        const data = await response.json();

        // Check if we have new messages (skip initial load when ref is -1)
        if (lastMessageCountRef.current === -1) {
          // First load - just initialize the count, set time to 0 to ensure first real message triggers sound
          lastMessageCountRef.current = data.length;
          lastMessageTimeRef.current = 0;
          console.log(`Initial load: ${data.length} messages`);
        } else if (data.length > lastMessageCountRef.current) {
          const now = Date.now();
          const timeSinceLastMessage = now - lastMessageTimeRef.current;

          // Play sound if it's been more than the configured threshold since last message
          if (timeSinceLastMessage >= notificationThreshold) {
            console.log(`Playing notification sound (time since last: ${Math.round(timeSinceLastMessage / 1000)}s, threshold: ${notificationThreshold / 1000}s)`);
            notificationSound.play().then(() => {
              console.log("Notification sound played successfully");
            }).catch((err) => {
              console.error("Failed to play notification sound:", err);
            });
          }

          // Update tracking refs
          lastMessageCountRef.current = data.length;
          lastMessageTimeRef.current = now;
        }
      } catch (error) {
        console.error("Failed to fetch messages for notification:", error);
      }
    };

    const interval = setInterval(checkMessages, 2000);
    checkMessages(); // Initial check
    return () => clearInterval(interval);
  }, [notificationThreshold]);

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

  if (loading) {
    return (
      <div
        className="w-[1920px] h-[1080px] flex items-center justify-center"
        style={{ backgroundColor: colors.background, color: colors.foreground }}
      >
        <div className="text-2xl">Loading overlay...</div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div
        className="w-[1920px] h-[1080px] flex items-center justify-center"
        style={{ backgroundColor: colors.background, color: colors.foreground }}
      >
        <div className="text-2xl text-destructive">Failed to load overlay layout</div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      {/* Audio enable overlay - required for browser autoplay policy */}
      {!audioEnabled && (
        <div
          className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center cursor-pointer"
          onClick={handleEnableAudio}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🔊</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Click to Enable Audio</h2>
            <p className="text-muted-foreground">Required for TTS messages</p>
          </div>
        </div>
      )}

      {/* Dynamic overlay renderer */}
      <OverlayRenderer layout={layout} />
    </div>
  );
}
