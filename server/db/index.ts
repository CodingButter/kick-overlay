import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';

const DB_PATH = path.join(import.meta.dir, '../../data/kick-overlay.db');
const SCHEMA_PATH = path.join(import.meta.dir, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL'); // Better concurrent read/write
db.exec('PRAGMA foreign_keys = ON');

// Run schema
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('✅ Database initialized at:', DB_PATH);

// Type definitions for query results
interface UserRow {
  id: number;
  username: string;
  voice_id: string | null;
  drop_image: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

interface UserPointsRow {
  id: number;
  user_id: number;
  channel_points: number;
  drop_points: number;
  total_drops: number;
  last_updated: string;
}

interface PowerupRow {
  powerup_type: string;
  quantity: number;
}

interface SessionRow {
  id: number;
  user_id: number;
  session_token: string;
  created_at: string;
  expires_at: string;
}

interface TokenRow {
  id: number;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

interface VerificationRow {
  id: number;
  username: string;
  code: string;
  verified: number;
  created_at: string;
  expires_at: string;
}

interface LeaderboardRow {
  username: string;
  drop_image: string | null;
  country: string | null;
  channel_points: number;
  drop_points: number;
  total_drops: number;
  total_points: number;
}

interface AdminUserRow {
  id: number;
  username: string;
  voice_id: string | null;
  drop_image: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  channel_points: number;
  drop_points: number;
  total_drops: number;
}

// Prepared statements for common operations
export const queries = {
  // Users
  getUserByUsername: db.prepare<UserRow, [string]>(
    'SELECT * FROM users WHERE username = ? COLLATE NOCASE'
  ),
  getUserById: db.prepare<UserRow, [number]>(
    'SELECT * FROM users WHERE id = ?'
  ),
  createUser: db.prepare<UserRow, [string]>(
    'INSERT INTO users (username) VALUES (?) ON CONFLICT(username) DO NOTHING RETURNING *'
  ),
  updateUser: db.prepare<null, [string | null, string | null, string | null, string]>(
    'UPDATE users SET voice_id = ?, drop_image = ?, country = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?'
  ),

  // Points
  getPoints: db.prepare<UserPointsRow, [number]>(
    'SELECT * FROM user_points WHERE user_id = ?'
  ),
  createPoints: db.prepare<null, [number]>(
    'INSERT INTO user_points (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING'
  ),
  addChannelPoints: db.prepare<null, [number, number]>(
    'UPDATE user_points SET channel_points = channel_points + ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?'
  ),
  setChannelPoints: db.prepare<null, [number, number]>(
    'UPDATE user_points SET channel_points = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?'
  ),
  addDropPoints: db.prepare<null, [number, number]>(
    'UPDATE user_points SET drop_points = drop_points + ?, total_drops = total_drops + 1, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?'
  ),

  // Powerups
  getPowerups: db.prepare<PowerupRow, [number]>(
    'SELECT powerup_type, quantity FROM powerup_inventory WHERE user_id = ?'
  ),
  upsertPowerup: db.prepare<null, [number, string, number]>(
    `INSERT INTO powerup_inventory (user_id, powerup_type, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, powerup_type) DO UPDATE SET quantity = quantity + excluded.quantity`
  ),
  setPowerup: db.prepare<null, [number, string, number]>(
    `INSERT INTO powerup_inventory (user_id, powerup_type, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, powerup_type) DO UPDATE SET quantity = excluded.quantity`
  ),
  usePowerup: db.prepare<null, [number, string]>(
    'UPDATE powerup_inventory SET quantity = quantity - 1 WHERE user_id = ? AND powerup_type = ? AND quantity > 0'
  ),

  // Sessions
  createSession: db.prepare<null, [number, string, string]>(
    'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)'
  ),
  getSession: db.prepare<SessionRow, [string]>(
    'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP'
  ),
  deleteSession: db.prepare<null, [string]>(
    'DELETE FROM user_sessions WHERE session_token = ?'
  ),
  deleteExpiredSessions: db.prepare<null, []>(
    'DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP'
  ),

  // Verification
  createVerification: db.prepare<null, [string, string, string]>(
    'INSERT INTO verification_codes (username, code, expires_at) VALUES (?, ?, ?) ON CONFLICT(username, code) DO UPDATE SET expires_at = excluded.expires_at'
  ),
  getVerification: db.prepare<VerificationRow, [string, string]>(
    'SELECT * FROM verification_codes WHERE username = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP'
  ),
  getVerificationByUsername: db.prepare<VerificationRow, [string]>(
    'SELECT * FROM verification_codes WHERE username = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1'
  ),
  markVerified: db.prepare<null, [string, string]>(
    'UPDATE verification_codes SET verified = 1 WHERE username = ? AND code = ?'
  ),
  deleteVerification: db.prepare<null, [string]>(
    'DELETE FROM verification_codes WHERE username = ?'
  ),

  // API Tokens
  getToken: db.prepare<TokenRow, [string]>(
    'SELECT * FROM api_tokens WHERE provider = ? ORDER BY id DESC LIMIT 1'
  ),
  upsertToken: db.prepare<null, [string, string, string | null, string, string | null]>(
    `INSERT INTO api_tokens (provider, access_token, refresh_token, expires_at, scope)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       scope = excluded.scope,
       updated_at = CURRENT_TIMESTAMP`
  ),

  // Leaderboard
  getLeaderboard: db.prepare<LeaderboardRow, []>(`
    SELECT u.username, u.drop_image, u.country,
           p.channel_points, p.drop_points, p.total_drops,
           (p.channel_points + p.drop_points) as total_points
    FROM users u
    JOIN user_points p ON u.id = p.user_id
    ORDER BY total_points DESC
    LIMIT 50
  `),

  // Admin: get all users with points
  getAllUsersWithPoints: db.prepare<AdminUserRow, []>(`
    SELECT u.id, u.username, u.voice_id, u.drop_image, u.country, u.created_at, u.updated_at,
           COALESCE(p.channel_points, 0) as channel_points,
           COALESCE(p.drop_points, 0) as drop_points,
           COALESCE(p.total_drops, 0) as total_drops
    FROM users u
    LEFT JOIN user_points p ON u.id = p.user_id
    ORDER BY (COALESCE(p.channel_points, 0) + COALESCE(p.drop_points, 0)) DESC
  `),

  // Admin: update user points
  updateUserPoints: db.prepare<null, [number, number, number, number]>(
    'UPDATE user_points SET channel_points = ?, drop_points = ?, total_drops = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?'
  ),

  // Admin: delete user
  deleteUser: db.prepare<null, [number]>(
    'DELETE FROM users WHERE id = ?'
  ),

  // Admin: delete user points
  deleteUserPoints: db.prepare<null, [number]>(
    'DELETE FROM user_points WHERE user_id = ?'
  ),

  // Admin: delete user powerups
  deleteUserPowerups: db.prepare<null, [number]>(
    'DELETE FROM powerup_inventory WHERE user_id = ?'
  ),

  // Drop history
  recordDrop: db.prepare<null, [number, number, number, string | null]>(
    'INSERT INTO drop_history (user_id, score, is_perfect, powerup_used) VALUES (?, ?, ?, ?)'
  ),

  // Powerup purchases
  recordPurchase: db.prepare<null, [number, string, number]>(
    'INSERT INTO powerup_purchases (user_id, powerup_type, cost) VALUES (?, ?, ?)'
  ),

  // Powerup config
  getAllPowerupConfigs: db.prepare<PowerupConfigRow, []>(
    'SELECT * FROM powerup_config WHERE enabled = 1 ORDER BY cost ASC'
  ),
  getAllPowerupConfigsIncludingDisabled: db.prepare<PowerupConfigRow, []>(
    'SELECT * FROM powerup_config ORDER BY cost ASC'
  ),
  getPowerupConfig: db.prepare<PowerupConfigRow, [string]>(
    'SELECT * FROM powerup_config WHERE id = ?'
  ),
  upsertPowerupConfig: db.prepare<null, [string, string, string, number, string, string, string]>(
    `INSERT INTO powerup_config (id, name, description, cost, emoji, effect, variables)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       cost = excluded.cost,
       emoji = excluded.emoji,
       effect = excluded.effect,
       variables = excluded.variables,
       updated_at = CURRENT_TIMESTAMP`
  ),
  updatePowerupConfig: db.prepare<null, [string, string, number, string, number, string]>(
    `UPDATE powerup_config SET
       name = ?, description = ?, cost = ?, variables = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ),

  // Overlay settings
  getOverlaySetting: db.prepare<OverlaySettingRow, [string]>(
    'SELECT * FROM overlay_settings WHERE key = ?'
  ),
  getAllOverlaySettings: db.prepare<OverlaySettingRow, []>(
    'SELECT * FROM overlay_settings ORDER BY key ASC'
  ),
  upsertOverlaySetting: db.prepare<null, [string, string, string | null]>(
    `INSERT INTO overlay_settings (key, value, description)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       description = COALESCE(excluded.description, overlay_settings.description),
       updated_at = CURRENT_TIMESTAMP`
  ),

  // Admin sessions
  createAdminSession: db.prepare<null, [string, string]>(
    'INSERT INTO admin_sessions (session_token, expires_at) VALUES (?, ?)'
  ),
  getAdminSession: db.prepare<AdminSessionRow, [string]>(
    'SELECT * FROM admin_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP'
  ),
  deleteAdminSession: db.prepare<null, [string]>(
    'DELETE FROM admin_sessions WHERE session_token = ?'
  ),
  deleteExpiredAdminSessions: db.prepare<null, []>(
    'DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP'
  ),

  // Tips
  getAllTips: db.prepare<TipRow, []>(
    'SELECT * FROM tips WHERE enabled = 1 ORDER BY sort_order, id'
  ),
  getAllTipsAdmin: db.prepare<TipRow, []>(
    'SELECT * FROM tips ORDER BY sort_order, id'
  ),
  insertTip: db.prepare<null, [string, number]>(
    'INSERT INTO tips (content, sort_order) VALUES (?, ?)'
  ),
  updateTip: db.prepare<null, [string, number, number, number]>(
    'UPDATE tips SET content = ?, enabled = ?, sort_order = ? WHERE id = ?'
  ),
  deleteTip: db.prepare<null, [number]>(
    'DELETE FROM tips WHERE id = ?'
  ),

  // Goals
  getAllGoals: db.prepare<GoalRow, []>(
    'SELECT * FROM goals WHERE enabled = 1'
  ),
  getAllGoalsAdmin: db.prepare<GoalRow, []>(
    'SELECT * FROM goals'
  ),
  getGoal: db.prepare<GoalRow, [string]>(
    'SELECT * FROM goals WHERE id = ?'
  ),
  upsertGoal: db.prepare<null, [string, string, number, number, number]>(
    `INSERT INTO goals (id, label, current_value, target_value, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       current_value = excluded.current_value,
       target_value = excluded.target_value,
       enabled = excluded.enabled,
       updated_at = CURRENT_TIMESTAMP`
  ),
  updateGoalProgress: db.prepare<null, [number, string]>(
    'UPDATE goals SET current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ),
  deleteGoal: db.prepare<null, [string]>(
    'DELETE FROM goals WHERE id = ?'
  ),
};

// Powerup config row type
interface PowerupConfigRow {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
  variables: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

// Overlay settings row type
interface OverlaySettingRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// Admin session row type
interface AdminSessionRow {
  id: number;
  session_token: string;
  created_at: string;
  expires_at: string;
}

// Tip row type
interface TipRow {
  id: number;
  content: string;
  enabled: number;
  sort_order: number;
  created_at: string;
}

// Goal row type
interface GoalRow {
  id: string;
  label: string;
  current_value: number;
  target_value: number;
  enabled: number;
  updated_at: string;
}

// Default powerup definitions for seeding
const DEFAULT_POWERUPS = [
  {
    id: 'tnt',
    name: 'TNT',
    description: 'Creates an explosion that pushes all other players away from you',
    cost: 500,
    emoji: '💣',
    effect: 'Pushes nearby droppers away with explosive force',
    variables: JSON.stringify({ explosionRadius: 2000, explosionForce: 1500, explosionUpwardBoost: 400 }),
  },
  {
    id: 'powerdrop',
    name: 'Power Drop',
    description: 'Stops horizontal movement and drops straight down at high speed',
    cost: 300,
    emoji: '⚡',
    effect: 'Instantly drops straight down with 3x gravity',
    variables: JSON.stringify({ gravityMultiplier: 3 }),
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Protects you from being pushed by other players\' powerups',
    cost: 400,
    emoji: '🛡️',
    effect: 'Immune to TNT and other push effects for this drop',
    variables: JSON.stringify({ duration: 10000 }),
  },
  {
    id: 'magnet',
    name: 'Magnet',
    description: 'Pulls your dropper towards the center of the platform',
    cost: 600,
    emoji: '🧲',
    effect: 'Attracts towards platform center when activated',
    variables: JSON.stringify({ pullStrength: 500, duration: 3000 }),
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Pass through walls and ignore explosions/collisions',
    cost: 750,
    emoji: '👻',
    effect: 'Immune to collisions/explosions and wrap around screen for 5 seconds',
    variables: JSON.stringify({ duration: 5000 }),
  },
  {
    id: 'boost',
    name: 'Speed Boost',
    description: 'Doubles your horizontal speed temporarily',
    cost: 250,
    emoji: '🚀',
    effect: 'Doubles horizontal velocity for 3 seconds',
    variables: JSON.stringify({ speedMultiplier: 2, duration: 3000 }),
  },
];

// Seed default powerups if none exist
export function seedDefaultPowerups(): void {
  const existing = queries.getAllPowerupConfigs.all();
  if (existing.length === 0) {
    console.log('🌱 Seeding default powerup configurations...');
    for (const p of DEFAULT_POWERUPS) {
      queries.upsertPowerupConfig.run(p.id, p.name, p.description, p.cost, p.emoji, p.effect, p.variables);
    }
    console.log(`✅ Seeded ${DEFAULT_POWERUPS.length} powerups`);
  }
}

// Get all powerups as a map (for use in commands.ts)
export function getPowerupsFromDb(): Record<string, { id: string; name: string; description: string; cost: number; emoji: string; effect: string; variables: Record<string, any> }> {
  const rows = queries.getAllPowerupConfigs.all();
  const result: Record<string, any> = {};
  for (const row of rows) {
    result[row.id] = {
      id: row.id,
      name: row.name,
      description: row.description,
      cost: row.cost,
      emoji: row.emoji,
      effect: row.effect,
      variables: JSON.parse(row.variables || '{}'),
    };
  }
  return result;
}

// Migration helper - import user data from legacy JSON file (if exists)
export async function migrateFromJson() {
  const userDataPath = path.join(import.meta.dir, '../../user_data.json');

  // Check if already migrated (has users in database)
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const alreadyMigrated = existingUsers.count > 0;

  // Migrate user data from legacy JSON file
  if (existsSync(userDataPath) && !alreadyMigrated) {
    try {
      const userData = JSON.parse(readFileSync(userDataPath, 'utf-8'));

      db.transaction(() => {
        for (const [username, data] of Object.entries(userData as Record<string, any>)) {
          // Create user
          db.prepare(
            'INSERT INTO users (username, voice_id, drop_image, country) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET voice_id = excluded.voice_id, drop_image = excluded.drop_image, country = excluded.country'
          ).run(username, data.voiceId || null, data.dropImage || null, data.country || null);

          const user = queries.getUserByUsername.get(username);
          if (!user) continue;

          // Create points
          db.prepare(
            'INSERT INTO user_points (user_id, channel_points, drop_points, total_drops) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET channel_points = excluded.channel_points, drop_points = excluded.drop_points, total_drops = excluded.total_drops'
          ).run(user.id, data.channelPoints || 0, data.dropPoints || 0, data.totalDrops || 0);

          // Create powerups
          if (data.powerups) {
            for (const [type, qty] of Object.entries(data.powerups)) {
              if ((qty as number) > 0) {
                queries.setPowerup.run(user.id, type, qty as number);
              }
            }
          }
        }
      })();

      console.log('✅ Migrated user_data.json to SQLite');
    } catch (err) {
      console.error('❌ Failed to migrate user_data.json:', err);
    }
  }
}

// Default overlay settings for seeding
const DEFAULT_OVERLAY_SETTINGS = [
  { key: 'notification_sound_threshold', value: '120000', description: 'Time in ms of silence before playing new message sound (default: 2 minutes)' },
  { key: 'tts_enabled', value: 'true', description: 'Enable text-to-speech for chat messages' },
  { key: 'drop_game_enabled', value: 'true', description: 'Enable the drop game feature' },
  { key: 'ai_chatbot_enabled', value: 'false', description: 'Enable AI chatbot responses to chat messages' },
  { key: 'ai_cooldown_seconds', value: '10', description: 'Cooldown between AI responses per user (in seconds)' },
  { key: 'ai_project_directory', value: '', description: 'Project directory for Claude AI to reference (leave empty to disable project context)' },
];

// Seed default overlay settings if none exist
export function seedDefaultOverlaySettings(): void {
  for (const setting of DEFAULT_OVERLAY_SETTINGS) {
    const existing = queries.getOverlaySetting.get(setting.key);
    if (!existing) {
      queries.upsertOverlaySetting.run(setting.key, setting.value, setting.description);
    }
  }
  console.log('✅ Overlay settings initialized');
}

// Get all overlay settings as a map
export function getOverlaySettingsMap(): Record<string, string> {
  const rows = queries.getAllOverlaySettings.all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// Check if AI chatbot is enabled
export function isAIChatbotEnabled(): boolean {
  const setting = queries.getOverlaySetting.get('ai_chatbot_enabled');
  return setting?.value === 'true';
}

// Get AI cooldown in milliseconds
export function getAICooldownMs(): number {
  const setting = queries.getOverlaySetting.get('ai_cooldown_seconds');
  const seconds = parseInt(setting?.value || '10', 10);
  return seconds * 1000;
}

// Get AI project directory (empty string if not configured)
export function getAIProjectDirectory(): string {
  const setting = queries.getOverlaySetting.get('ai_project_directory');
  return setting?.value || '';
}

// Default tips for seeding
const DEFAULT_TIPS = [
  "Type !help or !commands to see all available commands",
  "Type !discord to join our Discord community",
  "Don't forget to follow if you enjoy the stream!",
  "Use !say to have your message spoken on stream with text-to-speech!",
  "Type !voicelist to browse 100+ AI voices you can use",
  "Pick your favorite voice with !say id=VOICE_ID and it remembers your choice!",
  "Pro tip: Test voices at the /voicelist page before using in chat",
  "Visit /commands for detailed command info",
  "The overlay you see is custom-built with Bun and React!",
  "This entire stream setup is powered by Kick webhooks",
  "The TTS uses ElevenLabs AI voices - over 100 to choose from!",
  "Type !drop to play the drop game and earn points!",
  "Land on the platform center for bonus points - PERFECT drops get 100+ pts!",
  "Check your points with !points - earn by chatting and watching!",
  "See who's on top with !leaderboard",
  "You earn 25 points per chat message and 5 points per minute watching!",
  "Buy powerups with !drop -buy [powerup] - use them during drops!",
  "See all powerups with !drop -powerups - TNT, Shield, Magnet and more!",
  "Check your powerup inventory with !drop -mine",
  "Use !powerdrop while falling to drop straight down with 3x gravity!",
  "TNT (!tnt) creates an explosion that pushes other players away!",
  "Shield (!shield) protects you from other players' powerups!",
  "Magnet (!magnet) pulls you towards the platform center - great for clutch saves!",
  "Ghost (!ghost) lets you pass through walls for 5 seconds!",
  "Speed Boost (!boost) doubles your horizontal speed for 3 seconds!",
  "Time your powerups right - activate them while your dropper is falling!",
  "Customize your profile at /profile-login - set your voice, avatar, and country!",
  "Upload a custom drop game avatar from your profile page!",
  "Your country flag shows next to your name in chat!",
  "Buy powerups from your profile page or with chat commands!",
  "Check out /drop-game-rules for the full drop game guide!",
  "Type !drop -rules to get a link to the drop game rules page",
];

// Default goals for seeding
const DEFAULT_GOALS = [
  { id: 'followers', label: 'Followers', current_value: 0, target_value: 100 },
  { id: 'subscribers', label: 'Subscribers', current_value: 0, target_value: 50 },
];

// Seed default tips if none exist
export function seedDefaultTips(): void {
  const existingTips = queries.getAllTips.all();
  if (existingTips.length === 0) {
    DEFAULT_TIPS.forEach((tip, index) => {
      queries.insertTip.run(tip, index);
    });
    console.log('✅ Tips initialized');
  }
}

// Seed default goals if none exist
export function seedDefaultGoals(): void {
  const existingGoals = queries.getAllGoals.all();
  if (existingGoals.length === 0) {
    DEFAULT_GOALS.forEach(goal => {
      queries.upsertGoal.run(goal.id, goal.label, goal.current_value, goal.target_value, 1);
    });
    console.log('✅ Goals initialized');
  }
}

// Get all tips as an array of strings
export function getTipsArray(): string[] {
  return queries.getAllTips.all().map(row => row.content);
}

// Get goals in the format expected by the frontend
export function getGoalsData(): { followers: { current: number; target: number }; subscribers: { current: number; target: number } } {
  const goals = queries.getAllGoals.all();
  const result = {
    followers: { current: 0, target: 100 },
    subscribers: { current: 0, target: 50 },
  };
  for (const goal of goals) {
    if (goal.id === 'followers') {
      result.followers = { current: goal.current_value, target: goal.target_value };
    } else if (goal.id === 'subscribers') {
      result.subscribers = { current: goal.current_value, target: goal.target_value };
    }
  }
  return result;
}

// Export types
export type { UserRow, UserPointsRow, PowerupRow, SessionRow, TokenRow, VerificationRow, LeaderboardRow, AdminUserRow, PowerupConfigRow, OverlaySettingRow, AdminSessionRow, TipRow, GoalRow };
