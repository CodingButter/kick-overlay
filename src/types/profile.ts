import type { PowerupType } from './dropgame';

export interface UserData {
  username: string;
  voiceId?: string;
  dropPoints: number;
  totalDrops: number;
  channelPoints: number;
  dropImage?: string;
  country?: string;
  powerups?: Record<PowerupType, number>;
}

export interface Voice {
  voice_id: string;
  name: string;
  labels?: {
    gender?: string;
    age?: string;
    accent?: string;
    description?: string;
    use_case?: string;
  };
  preview_url?: string;
}

export interface SessionData {
  username: string;
  token: string;
  expiresAt: number;
}
