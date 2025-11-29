export interface ChatSender {
  username: string;
  id: number;
  profile_picture?: string;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  sender?: ChatSender;
  content?: string;
}

export interface UserCountryCache {
  [userId: string]: string;
}
