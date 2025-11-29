import commands, { addDropPoints, addChannelPoints, getUserData, saveUserData, getAllUserData, isAdmin, POWERUPS, PowerupType, getUserPowerups, buyPowerup } from './server/commands';
import { generateSystemPrompt, generateUserPrompt } from './server/claude_prompt_template';
import { db, queries, migrateFromJson, seedDefaultOverlaySettings, seedDefaultPowerups, seedDefaultTips, seedDefaultGoals, getOverlaySettingsMap, getPowerupsFromDb, getTipsArray, getGoalsData } from './server/db';

// Run database migration on startup (imports from JSON files if they exist)
migrateFromJson().catch(err => console.error('Migration error:', err));

// Seed default data
seedDefaultPowerups();
seedDefaultOverlaySettings();
seedDefaultTips();
seedDefaultGoals();

// Admin session TTL (24 hours)
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000;

// Generate admin session token
function generateAdminSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Verify admin session from request
function verifyAdminSession(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const session = queries.getAdminSession.get(token);
  return !!session;
}

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Clean up expired verifications and sessions every minute (database-based)
setInterval(() => {
  try {
    // Delete expired sessions
    queries.deleteExpiredSessions.run();
    // Delete expired admin sessions
    queries.deleteExpiredAdminSessions.run();
    // Delete expired verification codes (older than 5 minutes)
    db.exec(`DELETE FROM verification_codes WHERE expires_at < datetime('now')`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 60000);

function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateVerifyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
import { speak, getVoices } from './server/elevenlabs';

// Load dropgame config from JSON file
interface DropGameConfig {
  game: {
    platformWidthRatio: number;
    avatarSize: number;
    cleanupDelay: number;
    gravity: number;
    bounceDamping: number;
    minHorizontalVelocity: number;
    maxHorizontalVelocity: number;
    horizontalDrift: number;
    usernameFontSize: number;
  };
  scoring: {
    basePoints: number;
    centerBonusPoints: number;
  };
  physics: {
    explosionRadius: number;
    explosionForce: number;
    explosionUpwardBoost: number;
    ghostDuration: number;
    boostDuration: number;
    powerDropGravityMultiplier: number;
  };
  powerups: Record<string, { cost: number; description: string }>;
}

let dropGameConfig: DropGameConfig | null = null;

async function loadDropGameConfig(): Promise<DropGameConfig> {
  if (dropGameConfig) return dropGameConfig;
  try {
    const file = Bun.file('./config/dropgame.config.json');
    if (await file.exists()) {
      dropGameConfig = await file.json();
      console.log('Loaded dropgame.config.json');
      return dropGameConfig!;
    }
  } catch (error) {
    console.error('Error loading dropgame.config.json:', error);
  }
  // Return defaults if file doesn't exist
  dropGameConfig = {
    game: {
      platformWidthRatio: 0.125,
      avatarSize: 60,
      cleanupDelay: 10000,
      gravity: 5,
      bounceDamping: 0.85,
      minHorizontalVelocity: 100,
      maxHorizontalVelocity: 500,
      horizontalDrift: 100,
      usernameFontSize: 24,
    },
    scoring: {
      basePoints: 10,
      centerBonusPoints: 100,
    },
    physics: {
      explosionRadius: 2000,
      explosionForce: 1500,
      explosionUpwardBoost: 400,
      ghostDuration: 5000,
      boostDuration: 3000,
      powerDropGravityMultiplier: 3,
    },
    powerups: {},
  };
  return dropGameConfig;
}

// Load config on startup
loadDropGameConfig();

// Drop game types and queue
interface DropEvent {
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
  activePowerup?: PowerupType;
}
const dropQueue: DropEvent[] = [];

// Track active players in the drop game (haven't landed yet)
const activeDroppers: Set<string> = new Set();

// Powerup event queue - activated during a drop
interface PowerupEvent {
  username: string;
  powerupId: PowerupType;
  timestamp: number;
}
const powerupQueue: PowerupEvent[] = [];

// Function to check if a player is already dropping
function isPlayerDropping(username: string): boolean {
  return activeDroppers.has(username.toLowerCase());
}

// Function to mark a player as landed/finished
function playerLanded(username: string): void {
  activeDroppers.delete(username.toLowerCase());
  console.log(`Player ${username} landed and removed from active droppers`);
}

// Function to queue a drop
function queueDrop(username: string, avatarUrl: string, emoteUrl?: string, activePowerup?: PowerupType): boolean {
  const lowerUsername = username.toLowerCase();
  if (activeDroppers.has(lowerUsername)) {
    console.log(`Player ${username} already has an active dropper, ignoring drop request`);
    return false;
  }
  activeDroppers.add(lowerUsername);
  dropQueue.push({ username, avatarUrl, emoteUrl, activePowerup });
  console.log(`Drop queued for ${username}${activePowerup ? ` with ${activePowerup}` : ''} (queue size: ${dropQueue.length}, active: ${activeDroppers.size})`);
  return true;
}

// Function to queue a powerup activation
function queuePowerup(username: string, powerupId: PowerupType): void {
  powerupQueue.push({ username, powerupId, timestamp: Date.now() });
  console.log(`Powerup ${powerupId} queued for ${username}`);
}

const PORT = 5050;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Public URL for all links and webhook (derived from PUBLIC_URL env var)
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const WEBHOOK_URL = `${PUBLIC_URL}/webhook`;

// Store tokens and chat messages in memory
let storedTokens: any = null;
let chatMessages: any[] = [];

// Load tokens from file on startup
async function loadStoredTokens(): Promise<void> {
  try {
    const file = Bun.file('./config/tokens.json');
    if (await file.exists()) {
      storedTokens = await file.json();
      console.log('Loaded tokens from tokens.json');
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = storedTokens?.refresh_token || process.env.KICK_REFRESH_TOKEN;

  if (!refreshToken) {
    console.error('No refresh token available');
    return false;
  }

  try {
    console.log('Refreshing access token...');
    const response = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KICK_CLIENT_ID!,
        client_secret: process.env.KICK_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token refresh failed:', error);
      return false;
    }

    const newTokens = await response.json();
    storedTokens = newTokens;

    // Save new tokens to file
    await Bun.write('./config/tokens.json', JSON.stringify(newTokens, null, 2));
    console.log('Access token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// Get current access token (from memory or env)
function getAccessToken(): string | undefined {
  return storedTokens?.access_token || process.env.KICK_ACCESS_TOKEN;
}

// Initialize tokens on startup
loadStoredTokens();

// Command cooldown tracking: Map<"commandKey:username", timestamp>
const commandCooldowns = new Map<string, number>();
let kickPublicKey: string | null = null;

// Active chatters for watch points (tracks usernames with their last activity time)
const activeChatters = new Map<string, number>();

// Award watch points every minute to active chatters
setInterval(async () => {
  const pointsPerMinute = parseInt(process.env.POINTS_PER_MINUTE || '5');
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Award points to users who chatted in the last minute
  for (const [username, lastActivity] of activeChatters.entries()) {
    if (lastActivity > oneMinuteAgo) {
      await addChannelPoints(username, pointsPerMinute);
      console.log(`Awarded ${pointsPerMinute} watch points to ${username}`);
    } else {
      // Remove inactive users (no activity for over 5 minutes)
      if (now - lastActivity > 5 * 60000) {
        activeChatters.delete(username);
      }
    }
  }
}, 60000); // Run every minute

// TTS audio queue
const ttsQueue: ArrayBuffer[] = [];

// Function to queue TTS audio
async function queueTTS(text: string, voiceId?: string): Promise<boolean> {
  try {
    const audioBuffer = await speak({ text, voiceId });
    if (audioBuffer) {
      ttsQueue.push(audioBuffer);
      console.log(`TTS queued: "${text.substring(0, 50)}..." (queue size: ${ttsQueue.length})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to queue TTS:', error);
    return false;
  }
}

// AI Chat Bot - processes messages and responds if helpful
// Track if AI is currently processing to avoid overlapping requests
let aiProcessing = false;
const aiCooldown = new Map<string, number>(); // Per-user cooldown

async function processAIResponse(
  username: string,
  messageContent: string,
  avatarUrl?: string
): Promise<string | null> {
  // Check if AI is enabled
  if (process.env.AI_ENABLED !== 'true') {
    return null;
  }

  // Check if already processing
  if (aiProcessing) {
    console.log('AI: Already processing a request, skipping');
    return null;
  }

  // Per-user cooldown (10 seconds)
  const now = Date.now();
  const lastRequest = aiCooldown.get(username);
  if (lastRequest && now - lastRequest < 10000) {
    console.log(`AI: User ${username} on cooldown`);
    return null;
  }

  const projectDir = process.env.PROJECT_DIRECTORY || '.';
  const streamerUsername = process.env.KICK_USERNAME || 'codingbutter';

  try {
    aiProcessing = true;
    aiCooldown.set(username, now);

    // Get user data for context
    const userData = getUserData(username);

    // Get recent messages for context (last 20, excluding the current message)
    const recentMessages = chatMessages.slice(-21, -1).map(m => ({
      username: m.sender?.username || 'Unknown',
      content: m.content || '',
    }));

    console.log(`AI: chatMessages array has ${chatMessages.length} messages`);
    console.log(`AI: recentMessages has ${recentMessages.length} messages for context`);
    if (recentMessages.length > 0) {
      console.log('AI: Recent messages:', JSON.stringify(recentMessages.slice(-5), null, 2));
    }

    // Build commands list for the AI
    const commandsList = Object.entries(commands).map(([name, cmd]) => ({
      name,
      description: cmd.description,
      arguments: cmd.arguments,
      cooldown: cmd.cooldown,
      alternatives: cmd.alternatives,
    }));

    // Fetch emotes for the AI
    const emotesList = await getEmotesForAI();

    // Generate prompts
    const systemPrompt = generateSystemPrompt({
      streamerUsername,
      projectDirectory: projectDir,
      commands: commandsList,
      emotes: emotesList,
    });

    const userPrompt = generateUserPrompt({
      username,
      avatarUrl,
      channelPoints: userData.channelPoints,
      dropPoints: userData.dropPoints,
      totalDrops: userData.totalDrops,
      country: userData.country,
      messageContent,
      recentMessages,
    });

    console.log(`AI: Processing message from ${username}: "${messageContent.substring(0, 50)}..."`);
    console.log('AI: User prompt being sent:', userPrompt.substring(0, 500));

    // Run Claude CLI with the -p flag
    // Using allowed tools for web search and project file access
    const proc = Bun.spawn([
      'claude',
      '-p',
      '--system-prompt', systemPrompt,
      '--allowedTools', 'WebSearch,Read,Glob,Grep',
      '--add-dir', projectDir,
      '--model', 'sonnet',
      userPrompt,
    ], {
      cwd: projectDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Set a timeout (30 seconds)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 30000);
    });

    const outputPromise = (async () => {
      const output = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (stderr) {
        console.error('AI stderr:', stderr);
      }

      return output.trim();
    })();

    const output = await Promise.race([outputPromise, timeoutPromise]);

    if (!output) {
      console.log('AI: Timeout or no output');
      return null;
    }

    // Check for "No Response" indicator
    if (output === 'No Response' || output.toLowerCase().includes('no response')) {
      console.log('AI: Chose not to respond');
      return null;
    }

    // Truncate if too long (Kick has message limits)
    let response = output;
    if (response.length > 500) {
      response = response.substring(0, 497) + '...';
    }

    console.log(`AI: Responding with: "${response.substring(0, 50)}..."`);
    return response;
  } catch (error) {
    console.error('AI: Error processing response:', error);
    return null;
  } finally {
    aiProcessing = false;
  }
}

// Last event tracking (follows, subscriptions, gifts - not chat)
interface LastEvent {
  type: 'follow' | 'subscription' | 'gift';
  username: string;
  timestamp: string;
  details?: string;
}
let lastEvent: LastEvent | null = null;

// Kick API Goal type
interface KickGoal {
  id: string;
  channel_id: string;
  type: string; // 'followers', 'subscribers', etc.
  status: string; // 'active', 'completed', etc.
  target_value: number;
  current_value: number;
  progress_bar_emoji_id: string;
  end_date: string;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
  count_from_creation: boolean;
}

// Goals cache
let cachedKickGoals: KickGoal[] = [];
let lastGoalsFetch = 0;
const GOALS_CACHE_TTL = 30000; // 30 seconds cache

// Kick Emotes types
interface KickEmote {
  id: number;
  channel_id: number | null;
  name: string;
  subscribers_only: boolean;
}

interface KickEmoteCategory {
  name: string;
  id: string;
  emotes: KickEmote[];
}

// Emotes cache
let cachedKickEmotes: KickEmoteCategory[] = [];
let lastEmotesFetch = 0;
const EMOTES_CACHE_TTL = 300000; // 5 minutes cache (emotes don't change often)

// Fetch emotes from Kick API
async function fetchKickEmotes(): Promise<KickEmoteCategory[]> {
  const now = Date.now();

  // Return cached if still fresh
  if (cachedKickEmotes.length > 0 && now - lastEmotesFetch < EMOTES_CACHE_TTL) {
    return cachedKickEmotes;
  }

  const accessToken = getAccessToken();
  const username = process.env.KICK_USERNAME || 'codingbutter';

  if (!accessToken) {
    console.error('No access token for fetching emotes');
    return cachedKickEmotes;
  }

  try {
    const response = await fetch(`https://kick.com/emotes/${username}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchKickEmotes();
        }
      }
      console.error('Failed to fetch Kick emotes:', await response.text());
      return cachedKickEmotes;
    }

    const emotes = await response.json() as KickEmoteCategory[];
    cachedKickEmotes = emotes;
    lastEmotesFetch = now;
    const totalEmotes = emotes.reduce((sum, cat) => sum + cat.emotes.length, 0);
    console.log(`Fetched ${totalEmotes} emotes from Kick API (${emotes.length} categories)`);
    return emotes;
  } catch (error) {
    console.error('Error fetching Kick emotes:', error);
    return cachedKickEmotes;
  }
}

// Get emotes formatted for AI prompt (just global emotes, not emoji)
async function getEmotesForAI(): Promise<Array<{ name: string; id: number }>> {
  const emoteCategories = await fetchKickEmotes();

  // Find the Global category (not Emojis - those are too many)
  const globalCategory = emoteCategories.find(c => c.id === 'Global');
  if (!globalCategory) return [];

  return globalCategory.emotes.map(e => ({
    name: e.name,
    id: e.id,
  }));
}

// Fetch goals from Kick API
async function fetchKickGoals(): Promise<KickGoal[]> {
  const now = Date.now();

  // Return cached if still fresh
  if (cachedKickGoals.length > 0 && now - lastGoalsFetch < GOALS_CACHE_TTL) {
    return cachedKickGoals;
  }

  const accessToken = getAccessToken();
  const username = process.env.KICK_USERNAME || 'codingbutter';

  if (!accessToken) {
    console.error('No access token for fetching goals');
    return cachedKickGoals;
  }

  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${username}/goals`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
      },
    });

    if (!response.ok) {
      // Try refreshing token if unauthorized
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchKickGoals(); // Retry with new token
        }
      }
      console.error('Failed to fetch Kick goals:', await response.text());
      return cachedKickGoals;
    }

    const goals = await response.json() as KickGoal[];
    cachedKickGoals = goals;
    lastGoalsFetch = now;
    console.log(`Fetched ${goals.length} goals from Kick API`);
    return goals;
  } catch (error) {
    console.error('Error fetching Kick goals:', error);
    return cachedKickGoals;
  }
}

// Convert Kick goals to the format expected by the overlay
interface Goals {
  followers: { current: number; target: number };
  subscribers: { current: number; target: number };
}

async function getGoalsForOverlay(): Promise<Goals> {
  const kickGoals = await fetchKickGoals();

  // Default values
  const result: Goals = {
    followers: { current: 0, target: 100 },
    subscribers: { current: 0, target: 50 },
  };

  // Map Kick goals to our format
  for (const goal of kickGoals) {
    if (goal.status !== 'active') continue;

    if (goal.type === 'followers') {
      result.followers = {
        current: goal.current_value,
        target: goal.target_value,
      };
    } else if (goal.type === 'subscribers') {
      result.subscribers = {
        current: goal.current_value,
        target: goal.target_value,
      };
    }
  }

  return result;
}

// Legacy goals object for backwards compatibility with event handlers
const goals: Goals = {
  followers: {
    current: parseInt(process.env.GOAL_FOLLOWERS_CURRENT || '0'),
    target: parseInt(process.env.GOAL_FOLLOWERS_TARGET || '100'),
  },
  subscribers: {
    current: parseInt(process.env.GOAL_SUBS_CURRENT || '0'),
    target: parseInt(process.env.GOAL_SUBS_TARGET || '50'),
  },
};

// Load goals from database on startup (fallback for when API isn't available)
async function loadGoals(): Promise<void> {
  try {
    // Load from database
    const dbGoals = getGoalsData();
    goals.followers.current = dbGoals.followers.current;
    goals.followers.target = dbGoals.followers.target;
    goals.subscribers.current = dbGoals.subscribers.current;
    goals.subscribers.target = dbGoals.subscribers.target;
    console.log(`Loaded goals: ${goals.followers.current} followers, ${goals.subscribers.current} subs`);

    // Also try to fetch from Kick API on startup
    fetchKickGoals().catch(err => console.error('Initial goals fetch failed:', err));
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}

// Save goals to database (fallback)
function saveGoals(): void {
  try {
    queries.upsertGoal.run('followers', 'Followers', goals.followers.current, goals.followers.target, 1);
    queries.upsertGoal.run('subscribers', 'Subscribers', goals.subscribers.current, goals.subscribers.target, 1);
  } catch (error) {
    console.error('Error saving goals:', error);
  }
}

// Initialize goals on startup
loadGoals();

// PKCE helpers
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Store code verifier for token exchange (in production, use a proper session store)
let storedCodeVerifier: string | null = null;

// Build the OAuth authorization URL
async function buildAuthUrl(): Promise<string> {
  const codeVerifier = generateRandomString(64);
  storedCodeVerifier = codeVerifier;

  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  const params = new URLSearchParams({
    client_id: process.env.KICK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'user:read channel:read channel:write chat:read chat:write events:subscribe',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://id.kick.com/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code: string): Promise<any> {
  if (!storedCodeVerifier) {
    throw new Error('No code verifier found. Please start the OAuth flow again.');
  }

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KICK_CLIENT_ID!,
      client_secret: process.env.KICK_CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      code: code,
      code_verifier: storedCodeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Fetch Kick's public key for webhook verification
async function getKickPublicKey(): Promise<string> {
  if (kickPublicKey) return kickPublicKey;

  const response = await fetch('https://api.kick.com/public/v1/public-key');
  if (!response.ok) {
    throw new Error('Failed to fetch Kick public key');
  }
  const data = await response.json() as { data: { public_key: string } };
  kickPublicKey = data.data.public_key;
  return kickPublicKey;
}

// Verify webhook signature
async function verifyWebhookSignature(
  messageId: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  try {
    const publicKeyPem = await getKickPublicKey();
    const message = `${messageId}.${timestamp}.${body}`;

    // Import the public key
    const pemContents = publicKeyPem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode the signature
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    // Verify
    const encoder = new TextEncoder();
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      encoder.encode(message)
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Subscribe to events via Kick API
async function subscribeToEvents(accessToken: string, userId: string): Promise<any> {
  const response = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: [
        { name: 'chat.message.sent', version: 1 },
        { name: 'channel.followed', version: 1 },
        { name: 'channel.subscription.new', version: 1 },
        { name: 'channel.subscription.gifts', version: 1 },
      ],
      method: 'webhook',
      broadcaster_user_id: parseInt(userId),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to subscribe to events:', error);
    throw new Error(`Event subscription failed: ${error}`);
  }

  return response.json();
}

// Get current user info
async function getCurrentUser(accessToken: string): Promise<any> {
  const response = await fetch('https://api.kick.com/public/v1/users', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

// Send a chat message to Kick (with auto-refresh on token expiry)
async function sendChatMessage(message: string, retried = false): Promise<void> {
  const accessToken = getAccessToken();
  const broadcasterId = process.env.KICK_USER_ID;

  if (!accessToken || !broadcasterId) {
    console.error('Missing access token or KICK_USER_ID for sending chat');
    return;
  }

  try {
    const response = await fetch('https://api.kick.com/public/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broadcaster_user_id: parseInt(broadcasterId),
        content: message,
        type: 'user',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send chat message:', error);

      // If unauthorized and we haven't retried yet, try refreshing the token
      if ((response.status === 401 || error.includes('Unauthorized')) && !retried) {
        console.log('Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          return sendChatMessage(message, true);
        }
      }
    } else {
      console.log('Chat message sent successfully');
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
  }
}

// SPA entry point - serves React Router app for all frontend routes
import spaIndex from './index.html';

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0', // Listen on all network interfaces
  routes: {
    // SPA routes - all served by React Router
    '/': spaIndex,
    '/commands': spaIndex,
    '/voicelist': spaIndex,
    '/drop-game-rules': spaIndex,
    '/profile-login': spaIndex,
    '/overlay': spaIndex,
    '/overlay/chat': spaIndex,
    '/overlay/goals': spaIndex,
    '/overlay/dropgame': spaIndex,
    '/profile/*': spaIndex,
    '/admin': spaIndex,
    '/auth': {
      GET: async () => {
        const authUrl = await buildAuthUrl();
        return Response.redirect(authUrl, 302);
      },
    },
    '/auth-url': {
      GET: async () => {
        const authUrl = await buildAuthUrl();
        return Response.json({ url: authUrl });
      },
    },
    '/callback': {
      GET: async (req) => {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>OAuth Error</h1>
                <p><strong>Error:</strong> ${error}</p>
                <p><strong>Description:</strong> ${errorDescription || 'No description'}</p>
                <a href="/">Try again</a>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        }

        if (!code) {
          return new Response('No authorization code received', { status: 400 });
        }

        try {
          const tokens = await exchangeCodeForTokens(code);
          console.log('Tokens received:', tokens);
          storedTokens = tokens;

          // Save tokens to file for use in overlay app
          await Bun.write('./config/tokens.json', JSON.stringify(tokens, null, 2));

          // Get user info and subscribe to events
          let userInfo = null;
          let subscriptionResult = null;
          let subscriptionError = null;

          try {
            userInfo = await getCurrentUser(tokens.access_token);
            console.log('User info:', userInfo);

            if (userInfo.data?.[0]?.user_id) {
              subscriptionResult = await subscribeToEvents(
                tokens.access_token,
                userInfo.data[0].user_id
              );
              console.log('Subscribed to events:', subscriptionResult);
            }
          } catch (subErr) {
            console.error('Event subscription error:', subErr);
            subscriptionError = subErr instanceof Error ? subErr.message : 'Unknown error';
          }

          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>OAuth Success</title></head>
              <body>
                <h1>Authentication Successful!</h1>
                <p>Your tokens have been saved to <code>tokens.json</code></p>
                <h3>Token Details:</h3>
                <pre>${JSON.stringify(tokens, null, 2)}</pre>
                ${userInfo ? `<h3>User Info:</h3><pre>${JSON.stringify(userInfo, null, 2)}</pre>` : ''}
                ${subscriptionResult ? `<h3>Event Subscriptions:</h3><pre>${JSON.stringify(subscriptionResult, null, 2)}</pre>` : ''}
                ${subscriptionError ? `<p style="color: red;">Event subscription error: ${subscriptionError}</p><p>Make sure WEBHOOK_URL env var is set to a public URL (use ngrok for local dev)</p>` : ''}
                <p><a href="/chat">View Chat Messages</a></p>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        } catch (err) {
          console.error('Token exchange error:', err);
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>Token Exchange Error</title></head>
              <body>
                <h1>Token Exchange Failed</h1>
                <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
                <a href="/">Try again</a>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        }
      },
    },
    '/webhook': {
      POST: async (req) => {
        const messageId = req.headers.get('Kick-Event-Message-Id') || '';
        const timestamp = req.headers.get('Kick-Event-Message-Timestamp') || '';
        const signature = req.headers.get('Kick-Event-Signature') || '';
        const eventType = req.headers.get('Kick-Event-Type') || '';
        const body = await req.text();

        console.log(`Webhook received: ${eventType}`);
        console.log('Headers:', {
          messageId,
          timestamp,
          eventType,
        });

        // Verify signature (optional for dev, recommended for production)
        if (signature) {
          const isValid = await verifyWebhookSignature(messageId, timestamp, body, signature);
          if (!isValid) {
            console.warn('Invalid webhook signature');
            // In production, you might want to reject invalid signatures
            // return new Response('Invalid signature', { status: 401 });
          }
        }

        // Parse and store the event
        try {
          const event = JSON.parse(body);
          console.log('Event payload:', JSON.stringify(event, null, 2));

          if (eventType === 'chat.message.sent') {
            chatMessages.push({
              id: messageId,
              timestamp: timestamp,
              ...event,
            });
            // Keep only last 100 messages
            if (chatMessages.length > 100) {
              chatMessages = chatMessages.slice(-100);
            }

            // Award chat points and track active chatters
            const chatterUsername = event.sender?.username;
            if (chatterUsername) {
              const chatPoints = parseInt(process.env.POINTS_PER_CHAT || '25');
              addChannelPoints(chatterUsername, chatPoints);
              activeChatters.set(chatterUsername, Date.now());
            }

            // Check for commands (supports any prefix like ! or /)
            const content = event.content?.trim() || '';
            const commandKey = content.split(' ')[0].toLowerCase();

            // Handle !verify command for profile login
            if (commandKey === '!verify') {
              const verifyCode = content.split(' ')[1]?.toUpperCase();
              const username = event.sender?.username;
              if (verifyCode && username) {
                // Check database for pending verification
                const verification = queries.getVerification.get(username, verifyCode);
                if (verification && !verification.verified) {
                  queries.markVerified.run(username, verifyCode);
                  console.log(`Profile verified for ${username} with code ${verifyCode}`);
                }
              }
            }

            // Find command by key or alternatives
            let command = commands[commandKey];
            let matchedKey = commandKey;
            if (!command) {
              // Check alternatives
              for (const [key, cmd] of Object.entries(commands)) {
                if (cmd.alternatives?.includes(commandKey)) {
                  command = cmd;
                  matchedKey = key;
                  break;
                }
              }
            }

            if (command) {
              const username = event.sender?.username || 'Unknown';
              const cooldownKey = `${commandKey}:${username}`;
              const now = Date.now();
              const lastUsed = commandCooldowns.get(cooldownKey);
              const userIsAdmin = isAdmin(username);

              // Check if user is on cooldown for this command (admins skip cooldowns)
              if (!userIsAdmin && lastUsed && command.cooldown && (now - lastUsed) < command.cooldown) {
                const remainingSeconds = Math.ceil((command.cooldown - (now - lastUsed)) / 1000);
                console.log(`Command ${matchedKey} on cooldown for ${username} (${remainingSeconds}s remaining)`);
                // Silently ignore - don't spam chat with cooldown messages
              } else {
                // Record usage and execute command (still record for admins for logging purposes)
                commandCooldowns.set(cooldownKey, now);
                console.log(`Executing command: ${matchedKey}${commandKey !== matchedKey ? ` (via ${commandKey})` : ''}${userIsAdmin ? ' (admin)' : ''}`);
                command.handler({
                  message: {
                    content: content,
                    user: {
                      username: username,
                      avatar_url: event.sender?.profile_picture || '',
                    },
                  },
                  sendChat: sendChatMessage,
                  queueTTS: queueTTS,
                  queueDrop: queueDrop,
                  queuePowerup: queuePowerup,
                });
              }
            } else if (!commandKey.startsWith('!') && !commandKey.startsWith('/')) {
              // Not a command - process through AI (async, don't await to not block webhook response)
              const username = event.sender?.username || 'Unknown';
              const avatarUrl = event.sender?.profile_picture;

              // Process AI response in the background
              processAIResponse(username, content, avatarUrl).then(response => {
                if (response) {
                  sendChatMessage(response);
                }
              }).catch(err => {
                console.error('AI response error:', err);
              });
            }
          } else if (eventType === 'channel.followed') {
            goals.followers.current++;
            const followerName = event.follower?.username || event.user?.username || 'Someone';
            lastEvent = {
              type: 'follow',
              username: followerName,
              timestamp: timestamp,
            };
            console.log(`New follower: ${followerName}! Total: ${goals.followers.current}`);
            saveGoals();
          } else if (eventType === 'channel.subscription.new') {
            goals.subscribers.current++;
            const subName = event.subscriber?.username || event.user?.username || 'Someone';
            lastEvent = {
              type: 'subscription',
              username: subName,
              timestamp: timestamp,
            };
            console.log(`New subscriber: ${subName}! Total: ${goals.subscribers.current}`);
            saveGoals();
          } else if (eventType === 'channel.subscription.gifts') {
            const gifterName = event.gifter?.username || event.user?.username || 'Someone';
            const giftCount = event.gift_count || 1;
            goals.subscribers.current += giftCount;
            lastEvent = {
              type: 'gift',
              username: gifterName,
              timestamp: timestamp,
              details: `${giftCount} sub${giftCount > 1 ? 's' : ''}`,
            };
            console.log(`${gifterName} gifted ${giftCount} subs! Total: ${goals.subscribers.current}`);
            saveGoals();
          }
        } catch (e) {
          console.error('Failed to parse webhook body:', e);
        }

        return new Response('OK', { status: 200 });
      },
    },
    '/chat': {
      GET: () => {
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Chat Messages</title>
              <style>
                body { font-family: sans-serif; background: #1a1a2e; color: #fff; padding: 20px; }
                .message { background: #16213e; padding: 10px; margin: 5px 0; border-radius: 5px; }
                .username { color: #53fc18; font-weight: bold; }
                .content { margin-left: 10px; }
                .time { color: #666; font-size: 0.8em; }
                h1 { color: #53fc18; }
                .refresh { color: #53fc18; }
              </style>
              <script>
                setTimeout(() => location.reload(), 5000);
              </script>
            </head>
            <body>
              <h1>Chat Messages</h1>
              <p class="refresh">Auto-refreshing every 5 seconds...</p>
              <p>Total messages: ${chatMessages.length}</p>
              ${chatMessages.length === 0 ? '<p>No messages yet. Make sure webhooks are configured and you have subscribed to events.</p>' : ''}
              ${chatMessages.slice().reverse().map(msg => `
                <div class="message">
                  <span class="username">${msg.sender?.username || 'Unknown'}</span>
                  <span class="time">${msg.timestamp || ''}</span>
                  <div class="content">${msg.content || JSON.stringify(msg)}</div>
                </div>
              `).join('')}
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      },
    },
    '/api/chat': {
      GET: () => {
        return Response.json(chatMessages);
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
        // Fetch goals from Kick API (with caching)
        const liveGoals = await getGoalsForOverlay();
        return Response.json(liveGoals);
      },
    },
    '/api/goals/raw': {
      GET: async () => {
        // Return raw Kick goals data for debugging
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
        const audio = ttsQueue.shift();
        if (audio) {
          return new Response(audio, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache',
            },
          });
        }
        return new Response(null, { status: 204 }); // No content
      },
    },
    '/api/tts/queue': {
      GET: () => {
        return Response.json({ queueLength: ttsQueue.length });
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

          // Limit text length to prevent abuse
          if (text.length > 200) {
            return Response.json({ error: 'Text must be 200 characters or less' }, { status: 400 });
          }

          const audioBuffer = await speak({ text, voiceId });
          if (!audioBuffer) {
            return Response.json({ error: 'Failed to generate TTS' }, { status: 500 });
          }

          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
            },
          });
        } catch (error) {
          console.error('TTS preview error:', error);
          return Response.json({ error: 'Failed to generate TTS' }, { status: 500 });
        }
      },
    },
    // Note: page routes moved to top with spaIndex
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
          // Also send physics config for frontend
          physics: config.physics,
        });
      },
    },
    '/api/dropgame/queue': {
      GET: () => {
        // Return and clear the queue
        const drops = [...dropQueue];
        dropQueue.length = 0;
        return Response.json(drops);
      },
    },
    '/api/dropgame/score': {
      POST: async (req) => {
        try {
          const body = await req.json() as { username: string; score: number; isPerfect: boolean };
          const { username, score, isPerfect } = body;

          if (!username || typeof score !== 'number') {
            return Response.json({ error: 'Invalid request' }, { status: 400 });
          }

          // Add points to user and record drop history
          const newTotal = await addDropPoints(username, score, isPerfect);

          console.log(`${username} scored ${score} points${isPerfect ? ' (PERFECT!)' : ''} - Total: ${newTotal}`);

          return Response.json({ success: true, newTotal });
        } catch (error) {
          console.error('Error recording drop score:', error);
          return Response.json({ error: 'Failed to record score' }, { status: 500 });
        }
      },
    },
    '/api/dropgame/landed': {
      POST: async (req) => {
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
        // Return and clear the powerup queue
        const powerups = [...powerupQueue];
        powerupQueue.length = 0;
        return Response.json(powerups);
      },
    },
    '/api/powerups': {
      GET: () => {
        // Return all available powerups with their details
        return Response.json(POWERUPS);
      },
    },
    '/api/powerups/:username': {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const username = url.pathname.split('/')[3];
        if (!username) {
          return Response.json({ error: 'Username required' }, { status: 400 });
        }
        const userPowerups = await getUserPowerups(username);
        return Response.json(userPowerups);
      },
    },
    '/api/powerups/:username/buy': {
      POST: async (req: Request) => {
        const url = new URL(req.url);
        const username = url.pathname.split('/')[3];
        if (!username) {
          return Response.json({ error: 'Username required' }, { status: 400 });
        }
        try {
          const body = await req.json() as { powerupId: string };
          const { powerupId } = body;
          if (!powerupId || !POWERUPS[powerupId as PowerupType]) {
            return Response.json({ error: 'Invalid powerup ID' }, { status: 400 });
          }
          const result = await buyPowerup(username, powerupId as PowerupType);
          if (result.success) {
            return Response.json({ success: true, balance: result.balance, quantity: result.quantity });
          } else {
            return Response.json({ success: false, error: result.error, balance: result.balance }, { status: 400 });
          }
        } catch (error) {
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      },
    },
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
    // Public stats API (no auth needed)
    '/api/stats/:username': async (req) => {
      const url = new URL(req.url);
      const username = url.pathname.split('/')[3];
      if (!username) {
        return Response.json({ error: 'Username required' }, { status: 400 });
      }
      const userData = getUserData(username);
      // Return only public stats (no token)
      return Response.json({
        username,
        channelPoints: userData.channelPoints || 0,
        dropPoints: userData.dropPoints || 0,
        totalDrops: userData.totalDrops || 0,
        totalPoints: (userData.channelPoints || 0) + (userData.dropPoints || 0),
        country: userData.country || null,
      });
    },
    // Public leaderboard
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
    // Admin login
    '/api/admin/login': {
      POST: async (req) => {
        try {
          const body = await req.json() as { password: string };
          const adminPassword = process.env.ADMIN_PASSWORD;

          if (!adminPassword) {
            return Response.json({ error: 'Admin password not configured' }, { status: 500 });
          }

          if (body.password !== adminPassword) {
            return Response.json({ error: 'Invalid password' }, { status: 401 });
          }

          // Create admin session
          const token = generateAdminSessionToken();
          const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL).toISOString();
          queries.createAdminSession.run(token, expiresAt);

          return Response.json({ success: true, token });
        } catch (error) {
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      },
    },
    // Admin logout
    '/api/admin/logout': {
      POST: async (req) => {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          queries.deleteAdminSession.run(token);
        }
        return Response.json({ success: true });
      },
    },
    // Admin session verification
    '/api/admin/verify': {
      GET: (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ valid: false }, { status: 401 });
        }
        return Response.json({ valid: true });
      },
    },
    // Admin overlay settings
    '/api/admin/settings': {
      GET: (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const rows = queries.getAllOverlaySettings.all();
        return Response.json(rows);
      },
      PUT: async (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
          const body = await req.json() as { key: string; value: string };
          queries.upsertOverlaySetting.run(body.key, body.value, null);
          return Response.json({ success: true });
        } catch (error) {
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      },
    },
    // Admin powerup config
    '/api/admin/powerups': {
      GET: (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const rows = queries.getAllPowerupConfigsIncludingDisabled.all();
        return Response.json(rows.map(row => ({
          ...row,
          variables: JSON.parse(row.variables || '{}'),
        })));
      },
    },
    // Admin dropgame config
    '/api/admin/dropgame': {
      GET: async (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const config = await loadDropGameConfig();
        return Response.json(config);
      },
      PUT: async (req) => {
        if (!verifyAdminSession(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
          const body = await req.json() as DropGameConfig;
          await Bun.write('./config/dropgame.config.json', JSON.stringify(body, null, 2));
          // Invalidate cache to reload on next access
          dropGameConfig = null;
          return Response.json({ success: true });
        } catch (error) {
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      },
    },
  },
  // Handle dynamic routes for profile pages
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Admin powerup update API: PUT /api/admin/powerups/:id
    const adminPowerupMatch = path.match(/^\/api\/admin\/powerups\/([^/]+)$/);
    if (adminPowerupMatch && req.method === 'PUT') {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [, powerupId] = adminPowerupMatch;
      return (async () => {
        try {
          const body = await req.json() as { name: string; description: string; cost: number; variables: Record<string, any>; enabled: number };
          queries.updatePowerupConfig.run(
            body.name,
            body.description,
            body.cost,
            JSON.stringify(body.variables),
            body.enabled,
            powerupId!
          );
          return Response.json({ success: true });
        } catch (error) {
          console.error('Powerup update error:', error);
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      })();
    }

    // Verify generate API: POST /api/verify/generate/:username
    const verifyGenerateMatch = path.match(/^\/api\/verify\/generate\/([^/]+)$/);
    if (verifyGenerateMatch && req.method === 'POST') {
      const [, username] = verifyGenerateMatch;
      const code = generateVerifyCode();
      // Store in database with 5 minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      queries.createVerification.run(username!, code, expiresAt);
      return Response.json({ code });
    }

    // Verify check API: GET /api/verify/check/:username/:code
    const verifyCheckMatch = path.match(/^\/api\/verify\/check\/([^/]+)\/([A-Z0-9]+)$/);
    if (verifyCheckMatch && req.method === 'GET') {
      const [, username, code] = verifyCheckMatch;
      const verification = queries.getVerification.get(username!, code!);

      if (!verification) {
        return Response.json({ error: 'Invalid or expired code' }, { status: 404 });
      }

      // If verified, create a session token for persistent access
      if (verification.verified) {
        // Get or create user
        let user = queries.getUserByUsername.get(username!);
        if (!user) {
          queries.createUser.run(username!);
          user = queries.getUserByUsername.get(username!);
        }

        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();
        queries.createSession.run(user!.id, sessionToken, expiresAt);

        // Clean up the verification code
        queries.deleteVerification.run(username!);

        return Response.json({ verified: true, sessionToken });
      }

      return Response.json({ verified: false });
    }

    // Session validation API: GET /api/session/validate/:username/:token
    const sessionValidateMatch = path.match(/^\/api\/session\/validate\/([^/]+)\/([A-Za-z0-9]+)$/);
    if (sessionValidateMatch && req.method === 'GET') {
      const [, username, token] = sessionValidateMatch;
      const session = queries.getSession.get(token!);

      if (session) {
        // Verify the session belongs to this user
        const user = queries.getUserById.get(session.user_id);
        if (user && user.username.toLowerCase() === username!.toLowerCase()) {
          return Response.json({ valid: true });
        }
      }

      return Response.json({ valid: false });
    }

    // Serve uploaded images: /public/uploads/:filename
    const uploadMatch = path.match(/^\/public\/uploads\/([^/]+)$/);
    if (uploadMatch && req.method === 'GET') {
      const [, filename] = uploadMatch;
      return (async () => {
        const file = Bun.file(`./public/uploads/${filename}`);
        if (await file.exists()) {
          const ext = filename!.split('.').pop()?.toLowerCase();
          const contentType = ext === 'png' ? 'image/png'
            : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
            : 'application/octet-stream';
          return new Response(file, {
            headers: { 'Content-Type': contentType },
          });
        }
        return new Response('Not Found', { status: 404 });
      })();
    }

    // Image upload API: POST /api/upload/:username
    const uploadApiMatch = path.match(/^\/api\/upload\/([^/]+)$/);
    if (uploadApiMatch && req.method === 'POST') {
      const [, username] = uploadApiMatch;
      return (async () => {
        try {
          const formData = await req.formData();
          const file = formData.get('image') as File | null;

          if (!file) {
            return Response.json({ error: 'No image provided' }, { status: 400 });
          }

          // Validate file type
          const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            return Response.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP' }, { status: 400 });
          }

          // Limit file size (2MB)
          if (file.size > 2 * 1024 * 1024) {
            return Response.json({ error: 'File too large. Max 2MB' }, { status: 400 });
          }

          // Generate unique filename
          const ext = file.name.split('.').pop() || 'png';
          const filename = `${username}-${Date.now()}.${ext}`;
          const filepath = `./public/uploads/${filename}`;

          // Save file
          const buffer = await file.arrayBuffer();
          await Bun.write(filepath, buffer);

          // Update user's dropImage in their profile
          const imageUrl = `${PUBLIC_URL}/public/uploads/${filename}`;
          saveUserData(username!, { dropImage: imageUrl });

          return Response.json({ success: true, imageUrl });
        } catch (error) {
          console.error('Upload error:', error);
          return Response.json({ error: 'Upload failed' }, { status: 500 });
        }
      })();
    }

    // Profile API: /api/profile/:username (session-based after verification)
    const profileApiMatch = path.match(/^\/api\/profile\/([^/]+)$/);
    if (profileApiMatch) {
      const [, username] = profileApiMatch;

      if (req.method === 'GET') {
        return (async () => {
          const userData = getUserData(username!);
          const userPowerups = await getUserPowerups(username!);
          // Return full profile data (user already verified via chat)
          return Response.json({
            username: username,
            voiceId: userData.voiceId,
            dropPoints: userData.dropPoints || 0,
            totalDrops: userData.totalDrops || 0,
            channelPoints: userData.channelPoints || 0,
            dropImage: userData.dropImage,
            country: userData.country,
            powerups: userPowerups,
          });
        })();
      }

      if (req.method === 'POST') {
        return (async () => {
          try {
            const body = await req.json() as { voiceId?: string; dropImage?: string; country?: string };
            const updates: { voiceId?: string; dropImage?: string; country?: string } = {};
            if (body.voiceId !== undefined) updates.voiceId = body.voiceId;
            if (body.dropImage !== undefined) updates.dropImage = body.dropImage;
            if (body.country !== undefined) updates.country = body.country;

            saveUserData(username!, updates);
            const updatedData = getUserData(username!);
            const userPowerups = await getUserPowerups(username!);
            return Response.json({
              username: username,
              voiceId: updatedData.voiceId,
              dropPoints: updatedData.dropPoints || 0,
              totalDrops: updatedData.totalDrops || 0,
              channelPoints: updatedData.channelPoints || 0,
              dropImage: updatedData.dropImage,
              country: updatedData.country,
              powerups: userPowerups,
            });
          } catch (error) {
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
          }
        })();
      }
    }

    // Profile page route (dynamic): /profile/:username
    const profilePageMatch = path.match(/^\/profile\/([^/]+)$/);
    if (profilePageMatch) {
      // Read and serve the HTML file for dynamic routes
      const htmlFile = Bun.file('./index.html');
      return new Response(htmlFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // For all other non-API routes, serve the SPA (React Router will handle 404)
    if (!path.startsWith('/api/') && !path.startsWith('/public/') && !path.startsWith('/webhook')) {
      const htmlFile = Bun.file('./index.html');
      return new Response(htmlFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`OAuth server running at http://localhost:${PORT}`);
console.log(`Visit http://localhost:${PORT} to start the OAuth flow`);
