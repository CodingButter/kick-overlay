export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  cooldown: number;
  adminOnly: boolean;
}

export interface LeaderboardEntry {
  username: string;
  dropImage?: string;
  country?: string;
  channelPoints: number;
  dropPoints: number;
  totalDrops: number;
  totalPoints: number;
}
