const API_BASE = '';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Chat
  getChat: () => fetchJSON<any[]>(`${API_BASE}/api/chat`),

  // Goals
  getGoals: () => fetchJSON<any>(`${API_BASE}/api/goals`),

  // Drop Game
  getDropQueue: () => fetchJSON<any[]>(`${API_BASE}/api/dropgame/queue`),
  getDropConfig: () => fetchJSON<any>(`${API_BASE}/api/dropgame/config`),
  postDropScore: (data: any) =>
    fetch(`${API_BASE}/api/dropgame/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  postDropLanded: (data: any) =>
    fetch(`${API_BASE}/api/dropgame/landed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Profile
  getProfile: (username: string) =>
    fetchJSON<any>(`${API_BASE}/api/profile/${username}`),
  updateProfile: (username: string, data: any) =>
    fetch(`${API_BASE}/api/profile/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Voices
  getVoices: () => fetchJSON<any[]>(`${API_BASE}/api/voices`),

  // Commands
  getCommands: () => fetchJSON<any[]>(`${API_BASE}/api/commands`),

  // Powerups
  getPowerups: () => fetchJSON<any>(`${API_BASE}/api/powerups`),
  getUserPowerups: (username: string) =>
    fetchJSON<any>(`${API_BASE}/api/powerups/${username}`),
  buyPowerup: (username: string, powerup: string, token: string) =>
    fetch(`${API_BASE}/api/powerups/${username}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ powerup, token }),
    }).then((r) => r.json()),

  // Auth
  generateVerifyCode: (username: string) =>
    fetch(`${API_BASE}/api/verify/generate/${username}`, { method: 'POST' }).then(
      (r) => r.json()
    ),
  checkVerifyCode: (username: string, code: string) =>
    fetchJSON<any>(`${API_BASE}/api/verify/check/${username}/${code}`),
  validateSession: (username: string, token: string) =>
    fetchJSON<{ valid: boolean }>(
      `${API_BASE}/api/session/validate/${username}/${token}`
    ),

  // Stats
  getStats: (username: string) =>
    fetchJSON<any>(`${API_BASE}/api/stats/${username}`),
  getLeaderboard: () => fetchJSON<any[]>(`${API_BASE}/api/leaderboard`),

  // TTS
  previewTTS: (text: string, voiceId: string) =>
    fetch(`${API_BASE}/api/tts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    }),
};
