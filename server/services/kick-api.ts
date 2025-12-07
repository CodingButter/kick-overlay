import { queries } from '../db';

// Kick API Goal type
export interface KickGoal {
  id: string;
  channel_id: string;
  type: string;
  status: string;
  target_value: number;
  current_value: number;
  progress_bar_emoji_id: string;
  end_date: string;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
  count_from_creation: boolean;
}

// Kick Emotes types
export interface KickEmote {
  id: number;
  channel_id: number | null;
  name: string;
  subscribers_only: boolean;
}

export interface KickEmoteCategory {
  name: string;
  id: string;
  emotes: KickEmote[];
}

// Goals format for overlay
export interface Goals {
  followers: { current: number; target: number };
  subscribers: { current: number; target: number };
}

// Public key cache
let kickPublicKey: string | null = null;

// Token storage
let storedTokens: {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
} | null = null;

// PKCE storage
let storedCodeVerifier: string | null = null;

// Goals cache
let cachedKickGoals: KickGoal[] = [];
let lastGoalsFetch = 0;
const GOALS_CACHE_TTL = 30000; // 30 seconds

// Emotes cache
let cachedKickEmotes: KickEmoteCategory[] = [];
let lastEmotesFetch = 0;
const EMOTES_CACHE_TTL = 300000; // 5 minutes

// Legacy goals object for backwards compatibility
export const goals: Goals = {
  followers: {
    current: parseInt(process.env.GOAL_FOLLOWERS_CURRENT || '0'),
    target: parseInt(process.env.GOAL_FOLLOWERS_TARGET || '100'),
  },
  subscribers: {
    current: parseInt(process.env.GOAL_SUBS_CURRENT || '0'),
    target: parseInt(process.env.GOAL_SUBS_TARGET || '50'),
  },
};

// Load tokens from database on startup
export function loadStoredTokens(): void {
  try {
    const dbToken = queries.getToken.get('kick');
    if (dbToken) {
      storedTokens = {
        access_token: dbToken.access_token,
        refresh_token: dbToken.refresh_token ?? undefined,
        expires_at: dbToken.expires_at ?? undefined,
        scope: dbToken.scope ?? undefined,
      };
      console.log('Loaded tokens from database');
    } else {
      console.log('No tokens found in database');
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
}

// Save tokens to database
export function saveTokensToDb(tokens: any): void {
  try {
    const expiresAt = tokens.expires_at || new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    queries.upsertToken.run('kick', tokens.access_token, tokens.refresh_token || null, expiresAt, tokens.scope || null);
    storedTokens = tokens;
    console.log('Saved tokens to database');
  } catch (error) {
    console.error('Error saving tokens to database:', error);
  }
}

// Get current access token
export function getAccessToken(): string | undefined {
  return storedTokens?.access_token || process.env.KICK_ACCESS_TOKEN;
}

// Get stored tokens
export function getStoredTokens(): typeof storedTokens {
  return storedTokens;
}

// Set stored tokens
export function setStoredTokens(tokens: any): void {
  storedTokens = tokens;
}

// Refresh access token using refresh token
export async function refreshAccessToken(): Promise<boolean> {
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
    saveTokensToDb(newTokens);
    console.log('Access token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// PKCE helpers
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function setCodeVerifier(verifier: string): void {
  storedCodeVerifier = verifier;
}

export function getCodeVerifier(): string | null {
  return storedCodeVerifier;
}

// Build the OAuth authorization URL
export async function buildAuthUrl(redirectUri: string): Promise<string> {
  const codeVerifier = generateRandomString(64);
  storedCodeVerifier = codeVerifier;

  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  const params = new URLSearchParams({
    client_id: process.env.KICK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user:read channel:read channel:write chat:read chat:write events:subscribe',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://id.kick.com/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<any> {
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
      redirect_uri: redirectUri,
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
export async function getKickPublicKey(): Promise<string> {
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
export async function verifyWebhookSignature(
  messageId: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  try {
    const publicKeyPem = await getKickPublicKey();
    const message = `${messageId}.${timestamp}.${body}`;

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

    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
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
export async function subscribeToEvents(accessToken: string, userId: string): Promise<any> {
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
export async function getCurrentUser(accessToken: string): Promise<any> {
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

// Send a chat message to Kick
export async function sendChatMessage(message: string, retried = false): Promise<void> {
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

      if ((response.status === 401 || error.includes('Unauthorized')) && !retried) {
        console.log('Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
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

// Fetch emotes from Kick API
export async function fetchKickEmotes(): Promise<KickEmoteCategory[]> {
  const now = Date.now();

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

// Get emotes formatted for AI prompt
export async function getEmotesForAI(): Promise<Array<{ name: string; id: number }>> {
  const emoteCategories = await fetchKickEmotes();
  const globalCategory = emoteCategories.find(c => c.id === 'Global');
  if (!globalCategory) return [];

  return globalCategory.emotes.map(e => ({
    name: e.name,
    id: e.id,
  }));
}

// Fetch goals from Kick API
export async function fetchKickGoals(): Promise<KickGoal[]> {
  const now = Date.now();

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
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchKickGoals();
        }
      }
      console.error('Failed to fetch Kick goals:', await response.text());
      return cachedKickGoals;
    }

    const fetchedGoals = await response.json() as KickGoal[];
    cachedKickGoals = fetchedGoals;
    lastGoalsFetch = now;
    console.log(`Fetched ${fetchedGoals.length} goals from Kick API`);
    return fetchedGoals;
  } catch (error) {
    console.error('Error fetching Kick goals:', error);
    return cachedKickGoals;
  }
}

// Convert Kick goals to the format expected by the overlay
export async function getGoalsForOverlay(): Promise<Goals> {
  const kickGoals = await fetchKickGoals();

  const result: Goals = {
    followers: { current: 0, target: 100 },
    subscribers: { current: 0, target: 50 },
  };

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

// Save goals to database (fallback)
export function saveGoals(): void {
  try {
    queries.upsertGoal.run('followers', 'Followers', goals.followers.current, goals.followers.target, 1);
    queries.upsertGoal.run('subscribers', 'Subscribers', goals.subscribers.current, goals.subscribers.target, 1);
  } catch (error) {
    console.error('Error saving goals:', error);
  }
}

// Initialize tokens on module load
loadStoredTokens();
