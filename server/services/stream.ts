import { addChannelPoints } from '../commands';

// Stream live status
let isStreamLive = false;

// Active chatters for watch points
const activeChatters = new Map<string, number>();

// Stream detection timing
let lastChatMessageTime = 0;

// Get stream status
export function getStreamStatus(): boolean {
  return isStreamLive;
}

// Set stream status
export function setStreamStatus(isLive: boolean): void {
  isStreamLive = isLive;
  if (!isLive) {
    activeChatters.clear();
  }
  console.log(`Stream status set to: ${isLive ? 'LIVE' : 'OFFLINE'}`);
}

// Auto-detect stream live status from chat webhooks
export function detectStreamFromChat(): void {
  lastChatMessageTime = Date.now();

  if (!isStreamLive) {
    isStreamLive = true;
    console.log('Stream detected as LIVE (receiving chat webhooks)');
  }
}

// Track active chatter
export function trackChatter(username: string): void {
  activeChatters.set(username, Date.now());
}

// Award chat points (only when live)
export function awardChatPoints(username: string): void {
  if (isStreamLive) {
    const chatPoints = parseInt(process.env.POINTS_PER_CHAT || '25');
    addChannelPoints(username, chatPoints, 'chat', 'Chat message');
  }
}

// Start watch points interval
export function startWatchPointsInterval(): void {
  setInterval(async () => {
    if (!isStreamLive) return;

    const pointsPerMinute = parseInt(process.env.POINTS_PER_MINUTE || '5');
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const [username, lastActivity] of activeChatters.entries()) {
      if (lastActivity > oneMinuteAgo) {
        await addChannelPoints(username, pointsPerMinute, 'watch', 'Watch time bonus');
        console.log(`Awarded ${pointsPerMinute} watch points to ${username}`);
      } else {
        // Remove inactive users (no activity for over 5 minutes)
        if (now - lastActivity > 5 * 60000) {
          activeChatters.delete(username);
        }
      }
    }
  }, 60000);
}
