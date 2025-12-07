import type { PowerupType } from '../commands';

// Drop game types
export interface DropEvent {
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
  activePowerup?: PowerupType;
}

// Queued player waiting to drop
export interface QueuedPlayer {
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
  queuedAt: number;
}

// Powerup event type
export interface PowerupEvent {
  username: string;
  powerupId: PowerupType;
  timestamp: number;
}

// Game event types for overlays
export type GameEventType =
  | 'player_queued'
  | 'player_unqueued'
  | 'drop_started'
  | 'player_dropped'
  | 'player_landed'
  | 'powerup_used'
  | 'queue_cleared';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data: {
    username?: string;
    avatarUrl?: string;
    emoteUrl?: string;
    powerupId?: PowerupType;
    score?: number;
    isPerfect?: boolean;
    queueSize?: number;
    dropCount?: number;
    targetUsername?: string;
  };
}

// Waiting queue (players who typed !queue)
const waitingQueue: Map<string, QueuedPlayer> = new Map();

// Drop queue (active drops being sent to overlay)
const dropQueue: DropEvent[] = [];

// Powerup event queue
const powerupQueue: PowerupEvent[] = [];

// Track active players in the drop game (currently falling)
const activeDroppers: Map<string, number> = new Map();
const DROP_TIMEOUT_MS = 90000; // 90 seconds

// Game events for overlay consumption
const gameEvents: GameEvent[] = [];
const MAX_EVENTS = 100; // Keep last 100 events

// Event listeners for real-time updates
type EventListener = (event: GameEvent) => void;
const eventListeners: Set<EventListener> = new Set();

// Add event listener
export function addEventListener(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

// Emit game event
function emitEvent(event: GameEvent): void {
  gameEvents.push(event);
  if (gameEvents.length > MAX_EVENTS) {
    gameEvents.shift();
  }
  // Notify all listeners
  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('Event listener error:', err);
    }
  }
}

// Get recent events (for polling)
export function getRecentEvents(since?: number): GameEvent[] {
  if (!since) return [...gameEvents];
  return gameEvents.filter(e => e.timestamp > since);
}

// Get all events
export function getAllEvents(): GameEvent[] {
  return [...gameEvents];
}

// Clear events
export function clearEvents(): void {
  gameEvents.length = 0;
}

// Clean up stale droppers
export function cleanupStaleDroppers(): void {
  const now = Date.now();
  for (const [username, startTime] of activeDroppers.entries()) {
    if (now - startTime > DROP_TIMEOUT_MS) {
      activeDroppers.delete(username);
      console.log(`Cleaned up stale dropper: ${username} (timed out after ${DROP_TIMEOUT_MS}ms)`);
    }
  }
}

// Check if a player is already dropping
export function isPlayerDropping(username: string): boolean {
  return activeDroppers.has(username.toLowerCase());
}

// Check if a player is in the waiting queue
export function isPlayerQueued(username: string): boolean {
  return waitingQueue.has(username.toLowerCase());
}

// Mark a player as landed/finished
export function playerLanded(username: string, score?: number, isPerfect?: boolean): void {
  const lowerUsername = username.toLowerCase();
  activeDroppers.delete(lowerUsername);
  console.log(`Player ${username} landed${score !== undefined ? ` with score ${score}` : ''}`);

  emitEvent({
    type: 'player_landed',
    timestamp: Date.now(),
    data: {
      username,
      score,
      isPerfect,
    },
  });
}

// Clear all active droppers (admin reset)
export function clearAllDroppers(): void {
  const count = activeDroppers.size;
  activeDroppers.clear();
  dropQueue.length = 0;
  console.log(`Cleared ${count} active droppers and drop queue`);
}

// ==========================================
// WAITING QUEUE FUNCTIONS
// ==========================================

// Add player to waiting queue
export function addToWaitingQueue(username: string, avatarUrl: string, emoteUrl?: string): boolean {
  const lowerUsername = username.toLowerCase();

  // Can't queue if already queued or actively dropping
  if (waitingQueue.has(lowerUsername)) {
    return false;
  }
  if (activeDroppers.has(lowerUsername)) {
    return false;
  }

  const player: QueuedPlayer = {
    username,
    avatarUrl,
    emoteUrl,
    queuedAt: Date.now(),
  };

  waitingQueue.set(lowerUsername, player);
  console.log(`${username} joined the waiting queue (queue size: ${waitingQueue.size})`);

  emitEvent({
    type: 'player_queued',
    timestamp: Date.now(),
    data: {
      username,
      avatarUrl,
      emoteUrl,
      queueSize: waitingQueue.size,
    },
  });

  return true;
}

// Remove player from waiting queue
export function removeFromWaitingQueue(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  const wasQueued = waitingQueue.delete(lowerUsername);

  if (wasQueued) {
    console.log(`${username} left the waiting queue (queue size: ${waitingQueue.size})`);

    emitEvent({
      type: 'player_unqueued',
      timestamp: Date.now(),
      data: {
        username,
        queueSize: waitingQueue.size,
      },
    });
  }

  return wasQueued;
}

// Get waiting queue as array
export function getWaitingQueue(): QueuedPlayer[] {
  return Array.from(waitingQueue.values()).sort((a, b) => a.queuedAt - b.queuedAt);
}

// Get waiting queue size
export function getWaitingQueueSize(): number {
  return waitingQueue.size;
}

// Clear waiting queue
export function clearWaitingQueue(): void {
  const count = waitingQueue.size;
  waitingQueue.clear();
  console.log(`Cleared ${count} players from waiting queue`);

  emitEvent({
    type: 'queue_cleared',
    timestamp: Date.now(),
    data: {
      queueSize: 0,
    },
  });
}

// Start the drop - move all waiting queue players to active drops
export function startDrop(): { success: boolean; count: number; players: string[] } {
  if (waitingQueue.size === 0) {
    return { success: false, count: 0, players: [] };
  }

  const players: string[] = [];
  const now = Date.now();

  for (const [lowerUsername, player] of waitingQueue.entries()) {
    // Add to active droppers
    activeDroppers.set(lowerUsername, now);

    // Add to drop queue (to be picked up by overlay)
    dropQueue.push({
      username: player.username,
      avatarUrl: player.avatarUrl,
      emoteUrl: player.emoteUrl,
    });

    players.push(player.username);

    emitEvent({
      type: 'player_dropped',
      timestamp: now,
      data: {
        username: player.username,
        avatarUrl: player.avatarUrl,
        emoteUrl: player.emoteUrl,
      },
    });
  }

  // Clear the waiting queue
  waitingQueue.clear();

  console.log(`Drop started with ${players.length} players: ${players.join(', ')}`);

  emitEvent({
    type: 'drop_started',
    timestamp: now,
    data: {
      dropCount: players.length,
      queueSize: 0,
    },
  });

  return { success: true, count: players.length, players };
}

// ==========================================
// INSTANT DROP FUNCTIONS (existing behavior)
// ==========================================

// Queue a drop (instant drop, not waiting queue)
export function queueDrop(username: string, avatarUrl: string, emoteUrl?: string, activePowerup?: PowerupType): boolean {
  const lowerUsername = username.toLowerCase();
  if (activeDroppers.has(lowerUsername)) {
    console.log(`Player ${username} already has an active dropper, ignoring drop request`);
    return false;
  }
  activeDroppers.set(lowerUsername, Date.now());
  dropQueue.push({ username, avatarUrl, emoteUrl, activePowerup });
  console.log(`Drop queued for ${username}${activePowerup ? ` with ${activePowerup}` : ''} (queue size: ${dropQueue.length}, active: ${activeDroppers.size})`);

  emitEvent({
    type: 'player_dropped',
    timestamp: Date.now(),
    data: {
      username,
      avatarUrl,
      emoteUrl,
      powerupId: activePowerup,
    },
  });

  return true;
}

// Queue a powerup activation
export function queuePowerup(username: string, powerupId: PowerupType, targetUsername?: string): void {
  powerupQueue.push({ username, powerupId, timestamp: Date.now() });
  console.log(`Powerup ${powerupId} queued for ${username}`);

  emitEvent({
    type: 'powerup_used',
    timestamp: Date.now(),
    data: {
      username,
      powerupId,
      targetUsername,
    },
  });
}

// Get and clear drop queue
export function getDropQueue(): DropEvent[] {
  const drops = [...dropQueue];
  dropQueue.length = 0;
  return drops;
}

// Get and clear powerup queue
export function getPowerupQueue(): PowerupEvent[] {
  const powerups = [...powerupQueue];
  powerupQueue.length = 0;
  return powerups;
}

// ==========================================
// STATS FUNCTIONS
// ==========================================

// Get current game state for overlays
export function getGameState(): {
  waitingQueueSize: number;
  activeDroppersCount: number;
  waitingPlayers: QueuedPlayer[];
  activePlayerUsernames: string[];
} {
  return {
    waitingQueueSize: waitingQueue.size,
    activeDroppersCount: activeDroppers.size,
    waitingPlayers: getWaitingQueue(),
    activePlayerUsernames: Array.from(activeDroppers.keys()),
  };
}

// Start cleanup interval
export function startDropGameCleanup(): void {
  setInterval(cleanupStaleDroppers, 10000);
}
