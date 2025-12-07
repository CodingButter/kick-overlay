import { queries, getOverlaySettingsMap, getTipsArray, getGoalsData } from '../db';
import { getUserData, saveUserData, getAllUserData, POWERUPS, getUserPowerups, buyPowerup } from '../commands';
import type { PowerupType } from '../commands';
import { getGoalsForOverlay, fetchKickGoals } from '../services/kick-api';
import { getNextTTS, getTTSQueueLength, generateTTSPreview, getVoices } from '../services/tts';
import {
  getDropQueue,
  getPowerupQueue,
  playerLanded,
  getGameState,
  getRecentEvents,
  getWaitingQueue,
  getWaitingQueueSize,
} from '../services/dropgame';
import { loadDropGameConfig } from '../config/dropgame';
import { loadThemeConfig } from '../config/theme';
import { loadOverlayLayout } from '../config/overlay';
import { getChatMessages } from '../services/ai-chat';
import commands from '../commands';

// Last event tracking
interface LastEvent {
  type: 'follow' | 'subscription' | 'gift' | 'tip';
  username: string;
  timestamp: string;
  details?: string;
}
let lastEvent: LastEvent | null = null;

export function setLastEvent(event: LastEvent): void {
  lastEvent = event;
}

export function getLastEvent(): LastEvent | null {
  return lastEvent;
}

// Public API routes
export const publicApiRoutes = {
  '/api/chat': {
    GET: () => {
      return Response.json(getChatMessages());
    },
  },
  '/api/overlay/settings': {
    GET: () => {
      const settings = getOverlaySettingsMap();
      return Response.json(settings);
    },
  },
  '/api/goals': {
    GET: async () => {
      const liveGoals = await getGoalsForOverlay();
      return Response.json(liveGoals);
    },
  },
  '/api/goals/raw': {
    GET: async () => {
      const kickGoals = await fetchKickGoals();
      return Response.json(kickGoals);
    },
  },
  '/api/events/last': {
    GET: () => {
      return Response.json(lastEvent);
    },
  },
  '/api/tips': {
    GET: () => {
      return Response.json(getTipsArray());
    },
  },
  '/api/tts/next': {
    GET: () => {
      const audio = getNextTTS();
      if (audio) {
        return new Response(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
          },
        });
      }
      return new Response(null, { status: 204 });
    },
  },
  '/api/tts/queue': {
    GET: () => {
      return Response.json({ queueLength: getTTSQueueLength() });
    },
  },
  '/api/voices': {
    GET: async () => {
      const voices = await getVoices();
      return Response.json(voices);
    },
  },
  '/api/commands': {
    GET: () => {
      const commandList = Object.entries(commands).map(([name, cmd]) => ({
        name,
        cooldown: cmd.cooldown,
        alternatives: cmd.alternatives,
        description: cmd.description,
        arguments: cmd.arguments,
      }));
      return Response.json(commandList);
    },
  },
  '/api/tts/preview': {
    POST: async (req: Request) => {
      try {
        const body = await req.json() as { voiceId: string; text: string };
        const { voiceId, text } = body;

        if (!voiceId || !text) {
          return Response.json({ error: 'voiceId and text are required' }, { status: 400 });
        }

        if (text.length > 200) {
          return Response.json({ error: 'Text must be 200 characters or less' }, { status: 400 });
        }

        const audioBuffer = await generateTTSPreview(text, voiceId);
        if (!audioBuffer) {
          return Response.json({ error: 'Failed to generate TTS' }, { status: 500 });
        }

        return new Response(audioBuffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      } catch (error) {
        console.error('TTS preview error:', error);
        return Response.json({ error: 'Failed to generate TTS' }, { status: 500 });
      }
    },
  },
  '/api/dropgame/config': {
    GET: async () => {
      const config = await loadDropGameConfig();
      return Response.json({
        platformWidthRatio: config.game.platformWidthRatio,
        avatarSize: config.game.avatarSize,
        cleanupDelay: config.game.cleanupDelay,
        gravity: config.game.gravity,
        bounceDamping: config.game.bounceDamping,
        minHorizontalVelocity: config.game.minHorizontalVelocity,
        maxHorizontalVelocity: config.game.maxHorizontalVelocity,
        horizontalDrift: config.game.horizontalDrift,
        centerBonusPoints: config.scoring.centerBonusPoints,
        basePoints: config.scoring.basePoints,
        usernameFontSize: config.game.usernameFontSize,
        physics: config.physics,
      });
    },
  },
  '/api/dropgame/queue': {
    GET: async () => {
      const drops = getDropQueue();
      const config = await loadDropGameConfig();
      return Response.json({
        drops,
        config: {
          platformWidthRatio: config.game.platformWidthRatio,
          avatarSize: config.game.avatarSize,
          cleanupDelay: config.game.cleanupDelay,
          gravity: config.game.gravity,
          bounceDamping: config.game.bounceDamping,
          minHorizontalVelocity: config.game.minHorizontalVelocity,
          maxHorizontalVelocity: config.game.maxHorizontalVelocity,
          horizontalDrift: config.game.horizontalDrift,
          centerBonusPoints: config.scoring.centerBonusPoints,
          basePoints: config.scoring.basePoints,
          usernameFontSize: config.game.usernameFontSize,
          physics: config.physics,
        },
      });
    },
  },
  '/api/dropgame/landed': {
    POST: async (req: Request) => {
      try {
        const body = await req.json() as { username: string };
        const { username } = body;
        if (!username) {
          return Response.json({ error: 'Username required' }, { status: 400 });
        }
        playerLanded(username);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: 'Failed to process' }, { status: 500 });
      }
    },
  },
  '/api/dropgame/powerups': {
    GET: () => {
      const powerups = getPowerupQueue();
      return Response.json(powerups);
    },
  },
  '/api/powerups': {
    GET: () => {
      return Response.json(POWERUPS);
    },
  },
  '/api/theme': () => {
    const config = loadThemeConfig();
    return Response.json(config);
  },
  '/api/overlay/layout': () => {
    const config = loadOverlayLayout();
    return Response.json(config);
  },
  '/api/leaderboard': async () => {
    const allData = await getAllUserData();
    const leaderboard = Object.entries(allData)
      .map(([username, data]) => ({
        username,
        totalPoints: (data.channelPoints || 0) + (data.dropPoints || 0),
        channelPoints: data.channelPoints || 0,
        dropPoints: data.dropPoints || 0,
        totalDrops: data.totalDrops || 0,
      }))
      .filter(u => u.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 50);
    return Response.json(leaderboard);
  },
  // ==========================================
  // DROP QUEUE & EVENTS APIs
  // ==========================================
  '/api/dropgame/state': {
    GET: () => {
      const state = getGameState();
      return Response.json(state);
    },
  },
  '/api/dropgame/waiting': {
    GET: () => {
      return Response.json({
        count: getWaitingQueueSize(),
        players: getWaitingQueue(),
      });
    },
  },
  '/api/dropgame/events': {
    GET: (req: Request) => {
      const url = new URL(req.url);
      const since = url.searchParams.get('since');
      const sinceTimestamp = since ? parseInt(since, 10) : undefined;
      const events = getRecentEvents(sinceTimestamp);
      return Response.json({
        events,
        timestamp: Date.now(),
      });
    },
  },
};

// Static file routes
export const staticRoutes = {
  '/public/styles.css': async () => {
    const file = Bun.file('./public/styles.css');
    return new Response(file, {
      headers: { 'Content-Type': 'text/css' },
    });
  },
  '/public/new_message.mp3': async () => {
    const file = Bun.file('./public/new_message.mp3');
    return new Response(file, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  },
  '/public/dropgame-platform.png': async () => {
    const file = Bun.file('./public/dropgame-platform.png');
    return new Response(file, {
      headers: { 'Content-Type': 'image/png' },
    });
  },
};
