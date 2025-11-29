import { db, queries, type UserRow, type UserPointsRow, type PowerupRow } from '../index';
import type { PowerupType } from '@/types/dropgame';

export interface User {
  id: number;
  username: string;
  voiceId?: string;
  dropImage?: string;
  country?: string;
  channelPoints: number;
  dropPoints: number;
  totalDrops: number;
  powerups: Record<PowerupType, number>;
}

const DEFAULT_POWERUPS: Record<PowerupType, number> = {
  tnt: 0,
  powerdrop: 0,
  shield: 0,
  magnet: 0,
  ghost: 0,
  boost: 0,
};

function rowToUser(user: UserRow, points: UserPointsRow | null, powerups: PowerupRow[]): User {
  const powerupMap = { ...DEFAULT_POWERUPS };
  for (const p of powerups) {
    powerupMap[p.powerup_type as PowerupType] = p.quantity;
  }

  return {
    id: user.id,
    username: user.username,
    voiceId: user.voice_id || undefined,
    dropImage: user.drop_image || undefined,
    country: user.country || undefined,
    channelPoints: points?.channel_points || 0,
    dropPoints: points?.drop_points || 0,
    totalDrops: points?.total_drops || 0,
    powerups: powerupMap,
  };
}

export const userRepository = {
  getByUsername(username: string): User | null {
    const user = queries.getUserByUsername.get(username);
    if (!user) return null;

    const points = queries.getPoints.get(user.id);
    const powerups = queries.getPowerups.all(user.id);

    return rowToUser(user, points || null, powerups);
  },

  getById(id: number): User | null {
    const user = queries.getUserById.get(id);
    if (!user) return null;

    const points = queries.getPoints.get(user.id);
    const powerups = queries.getPowerups.all(user.id);

    return rowToUser(user, points || null, powerups);
  },

  getOrCreate(username: string): User {
    let user = this.getByUsername(username);
    if (!user) {
      db.prepare('INSERT INTO users (username) VALUES (?) ON CONFLICT(username) DO NOTHING').run(username);
      const userRow = queries.getUserByUsername.get(username);
      if (!userRow) throw new Error(`Failed to create user: ${username}`);

      queries.createPoints.run(userRow.id);
      user = this.getByUsername(username)!;
    }
    return user;
  },

  update(username: string, data: Partial<Pick<User, 'voiceId' | 'dropImage' | 'country'>>): User | null {
    const user = this.getByUsername(username);
    if (!user) return null;

    queries.updateUser.run(
      data.voiceId !== undefined ? data.voiceId : user.voiceId || null,
      data.dropImage !== undefined ? data.dropImage : user.dropImage || null,
      data.country !== undefined ? data.country : user.country || null,
      username
    );

    return this.getByUsername(username);
  },

  addChannelPoints(username: string, points: number): void {
    const user = this.getOrCreate(username);
    queries.addChannelPoints.run(points, user.id);
  },

  setChannelPoints(username: string, points: number): void {
    const user = this.getOrCreate(username);
    queries.setChannelPoints.run(points, user.id);
  },

  addDropPoints(username: string, points: number): void {
    const user = this.getOrCreate(username);
    queries.addDropPoints.run(points, user.id);
  },

  recordDrop(username: string, score: number, isPerfect: boolean, powerupUsed?: PowerupType): void {
    const user = this.getOrCreate(username);
    queries.recordDrop.run(user.id, score, isPerfect ? 1 : 0, powerupUsed || null);
    queries.addDropPoints.run(score, user.id);
  },

  getPowerups(username: string): Record<PowerupType, number> {
    const user = this.getByUsername(username);
    if (!user) return { ...DEFAULT_POWERUPS };
    return user.powerups;
  },

  addPowerup(username: string, type: PowerupType, quantity = 1): void {
    const user = this.getOrCreate(username);
    queries.upsertPowerup.run(user.id, type, quantity);
  },

  usePowerup(username: string, type: PowerupType): boolean {
    const user = this.getByUsername(username);
    if (!user || (user.powerups[type] || 0) < 1) return false;
    queries.usePowerup.run(user.id, type);
    return true;
  },

  buyPowerup(username: string, type: PowerupType, cost: number): boolean {
    const user = this.getByUsername(username);
    if (!user || user.channelPoints < cost) return false;

    db.transaction(() => {
      queries.setChannelPoints.run(user.channelPoints - cost, user.id);
      queries.upsertPowerup.run(user.id, type, 1);
      queries.recordPurchase.run(user.id, type, cost);
    })();

    return true;
  },

  getLeaderboard(): User[] {
    const rows = queries.getLeaderboard.all();
    return rows.map(row => ({
      id: 0, // Leaderboard doesn't need ID
      username: row.username,
      voiceId: undefined,
      dropImage: row.drop_image || undefined,
      country: row.country || undefined,
      channelPoints: row.channel_points,
      dropPoints: row.drop_points,
      totalDrops: row.total_drops,
      powerups: { ...DEFAULT_POWERUPS },
    }));
  },

  getAllUsers(): User[] {
    const rows = db.prepare<UserRow, []>('SELECT * FROM users').all();
    return rows.map(row => {
      const points = queries.getPoints.get(row.id);
      const powerups = queries.getPowerups.all(row.id);
      return rowToUser(row, points || null, powerups);
    });
  },
};
