import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table (core user data)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  voiceId: text('voice_id'),
  dropImage: text('drop_image'),
  country: text('country'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_users_username').on(table.username),
]);

// User points (high-frequency updates, separate table for performance)
export const userPoints = sqliteTable('user_points', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  channelPoints: integer('channel_points').default(0),
  dropPoints: integer('drop_points').default(0),
  totalDrops: integer('total_drops').default(0),
  lastUpdated: text('last_updated').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_user_points_user_id').on(table.userId),
]);

// Powerup inventory
export const powerupInventory = sqliteTable('powerup_inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  powerupType: text('powerup_type').notNull(),
  quantity: integer('quantity').default(0),
}, (table) => [
  unique().on(table.userId, table.powerupType),
  index('idx_powerup_inventory_user_id').on(table.userId),
]);

// API tokens (encrypted at rest)
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull().default('kick'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at').notNull(),
  scope: text('scope'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// User sessions (replaces in-memory activeSessions Map)
export const userSessions = sqliteTable('user_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
}, (table) => [
  index('idx_user_sessions_token').on(table.sessionToken),
  index('idx_user_sessions_expires').on(table.expiresAt),
]);

// Verification codes (replaces in-memory pendingVerifications Map)
export const verificationCodes = sqliteTable('verification_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  code: text('code').notNull(),
  verified: integer('verified').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
}, (table) => [
  unique().on(table.username, table.code),
  index('idx_verification_codes_username').on(table.username),
]);

// Command cooldowns (replaces in-memory commandCooldowns Map)
export const commandCooldowns = sqliteTable('command_cooldowns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  command: text('command').notNull(),
  lastUsedAt: text('last_used_at').notNull(),
  expiresAt: text('expires_at').notNull(),
}, (table) => [
  unique().on(table.userId, table.command),
  index('idx_command_cooldowns_user_command').on(table.userId, table.command),
]);

// Drop game history (new - for analytics)
export const dropHistory = sqliteTable('drop_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  isPerfect: integer('is_perfect').default(0),
  powerupUsed: text('powerup_used'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_drop_history_user_id').on(table.userId),
]);

// Powerup purchase history (audit trail)
export const powerupPurchases = sqliteTable('powerup_purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  powerupType: text('powerup_type').notNull(),
  cost: integer('cost').notNull(),
  purchasedAt: text('purchased_at').default(sql`CURRENT_TIMESTAMP`),
});

// Powerup configuration (singleton records, editable via db studio)
export const powerupConfig = sqliteTable('powerup_config', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  cost: integer('cost').notNull().default(500),
  emoji: text('emoji').notNull(),
  effect: text('effect').notNull(),
  variables: text('variables').default('{}'),
  enabled: integer('enabled').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Overlay settings (key-value store for overlay configuration)
export const overlaySettings = sqliteTable('overlay_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Admin sessions (for admin dashboard authentication)
export const adminSessions = sqliteTable('admin_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionToken: text('session_token').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
}, (table) => [
  index('idx_admin_sessions_token').on(table.sessionToken),
]);

// Tips (rotating tips displayed on overlay)
export const tips = sqliteTable('tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  enabled: integer('enabled').default(1),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Goals (channel goals like followers, subscribers)
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  currentValue: integer('current_value').default(0),
  targetValue: integer('target_value').notNull(),
  enabled: integer('enabled').default(1),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
