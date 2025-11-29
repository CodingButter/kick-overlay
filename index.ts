import commands, { addDropPoints, addChannelPoints } from './commands';
import { speak, getVoices } from './elevenlabs';

// Drop game types and queue
interface DropEvent {
  username: string;
  avatarUrl: string;
  emoteUrl?: string;
}
const dropQueue: DropEvent[] = [];

// Function to queue a drop
function queueDrop(username: string, avatarUrl: string, emoteUrl?: string): void {
  dropQueue.push({ username, avatarUrl, emoteUrl });
  console.log(`Drop queued for ${username} (queue size: ${dropQueue.length})`);
}

const PORT = 5050;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Set this to your public webhook URL (e.g., ngrok URL)
// For local dev, run: ngrok http 5050
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${PORT}/webhook`;

// Store tokens and chat messages in memory
let storedTokens: any = null;
let chatMessages: any[] = [];

// Load tokens from file on startup
async function loadStoredTokens(): Promise<void> {
  try {
    const file = Bun.file('./tokens.json');
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
    await Bun.write('./tokens.json', JSON.stringify(newTokens, null, 2));
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

// Last event tracking (follows, subscriptions, gifts - not chat)
interface LastEvent {
  type: 'follow' | 'subscription' | 'gift';
  username: string;
  timestamp: string;
  details?: string;
}
let lastEvent: LastEvent | null = null;

// Goals tracking (persisted to file, targets from env)
interface Goals {
  followers: { current: number; target: number };
  subscribers: { current: number; target: number };
}

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

// Load goals from file on startup
async function loadGoals(): Promise<void> {
  try {
    const file = Bun.file('./goals.json');
    if (await file.exists()) {
      const saved = await file.json();
      // Restore current counts from file, but keep targets from env
      goals.followers.current = saved.followers?.current ?? goals.followers.current;
      goals.subscribers.current = saved.subscribers?.current ?? goals.subscribers.current;
      console.log(`Loaded goals: ${goals.followers.current} followers, ${goals.subscribers.current} subs`);
    }
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}

// Save goals to file
async function saveGoals(): Promise<void> {
  try {
    await Bun.write('./goals.json', JSON.stringify({
      followers: { current: goals.followers.current },
      subscribers: { current: goals.subscribers.current },
    }, null, 2));
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

import loginPage from './login.html';
import chatPage from './chat.html';
import goalsPage from './goals.html';
import overlayPage from './overlay.html';
import voicelistPage from './voicelist.html';
import commandslistPage from './commandslist.html';
import dropgamePage from './dropgame.html';

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0', // Listen on all network interfaces
  routes: {
    '/': loginPage,
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
          await Bun.write('./tokens.json', JSON.stringify(tokens, null, 2));

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

              // Check if user is on cooldown for this command
              if (lastUsed && command.cooldown && (now - lastUsed) < command.cooldown) {
                const remainingSeconds = Math.ceil((command.cooldown - (now - lastUsed)) / 1000);
                console.log(`Command ${matchedKey} on cooldown for ${username} (${remainingSeconds}s remaining)`);
                // Silently ignore - don't spam chat with cooldown messages
              } else {
                // Record usage and execute command
                commandCooldowns.set(cooldownKey, now);
                console.log(`Executing command: ${matchedKey}${commandKey !== matchedKey ? ` (via ${commandKey})` : ''}`);
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
                });
              }
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
    '/api/goals': {
      GET: () => {
        return Response.json(goals);
      },
    },
    '/api/goals/set': {
      POST: async (req) => {
        const body = await req.json() as {
          followers_target?: number;
          followers_current?: number;
          subs_target?: number;
          subs_current?: number;
        };
        if (body.followers_target !== undefined) goals.followers.target = body.followers_target;
        if (body.followers_current !== undefined) goals.followers.current = body.followers_current;
        if (body.subs_target !== undefined) goals.subscribers.target = body.subs_target;
        if (body.subs_current !== undefined) goals.subscribers.current = body.subs_current;
        return Response.json(goals);
      },
    },
    '/api/events/last': {
      GET: () => {
        return Response.json(lastEvent);
      },
    },
    '/api/tips': {
      GET: async () => {
        try {
          const file = Bun.file('./tips.json');
          const tips = await file.json();
          return Response.json(tips);
        } catch (error) {
          return Response.json([]);
        }
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
    '/voicelist': voicelistPage,
    '/commands': commandslistPage,
    '/overlay': overlayPage,
    '/overlay/chat': chatPage,
    '/overlay/goals': goalsPage,
    '/overlay/dropgame': dropgamePage,
    '/api/dropgame/config': {
      GET: () => {
        return Response.json({
          platformWidthRatio: parseFloat(process.env.DROP_PLATFORM_WIDTH_RATIO || '0.125'),
          avatarSize: parseInt(process.env.DROP_AVATAR_SIZE || '60'),
          cleanupDelay: parseInt(process.env.DROP_CLEANUP_DELAY || '10000'),
          gravity: parseInt(process.env.DROP_GRAVITY || '5'),
          bounceDamping: parseFloat(process.env.DROP_BOUNCE_DAMPING || '0.85'),
          minHorizontalVelocity: parseInt(process.env.DROP_MIN_HORIZONTAL_VELOCITY || '100'),
          maxHorizontalVelocity: parseInt(process.env.DROP_MAX_HORIZONTAL_VELOCITY || '500'),
          horizontalDrift: parseInt(process.env.DROP_HORIZONTAL_DRIFT || '100'),
          centerBonusPoints: parseInt(process.env.DROP_CENTER_BONUS_POINTS || '100'),
          basePoints: parseInt(process.env.DROP_BASE_POINTS || '10'),
          usernameFontSize: parseInt(process.env.DROP_USERNAME_FONT_SIZE || '24'),
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

          // Add points to user
          const newTotal = await addDropPoints(username, score);

          console.log(`${username} scored ${score} points${isPerfect ? ' (PERFECT!)' : ''} - Total: ${newTotal}`);

          return Response.json({ success: true, newTotal });
        } catch (error) {
          console.error('Error recording drop score:', error);
          return Response.json({ error: 'Failed to record score' }, { status: 500 });
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
  },
  development: true,
});

console.log(`OAuth server running at http://localhost:${PORT}`);
console.log(`Visit http://localhost:${PORT} to start the OAuth flow`);
