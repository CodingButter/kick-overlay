export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in ms
export const DEFAULT_MESSAGE = 'Hello! This is a test of my voice.';
