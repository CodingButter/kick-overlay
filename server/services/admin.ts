import { db, queries } from '../db';

// Admin session TTL (24 hours)
export const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000;

// Generate admin session token
export function generateAdminSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Verify admin session from request
export function verifyAdminSession(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const session = queries.getAdminSession.get(token);
  return !!session;
}

// Create admin session
export function createAdminSession(password: string): { success: boolean; token?: string; error?: string } {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { success: false, error: 'Admin password not configured' };
  }

  if (password !== adminPassword) {
    return { success: false, error: 'Invalid password' };
  }

  const token = generateAdminSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL).toISOString();
  queries.createAdminSession.run(token, expiresAt);

  return { success: true, token };
}

// Delete admin session
export function deleteAdminSession(req: Request): void {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    queries.deleteAdminSession.run(token);
  }
}

// Clean up expired sessions
export function cleanupExpiredSessions(): void {
  try {
    queries.deleteExpiredSessions.run();
    queries.deleteExpiredAdminSessions.run();
    db.exec(`DELETE FROM verification_codes WHERE expires_at < datetime('now')`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Start cleanup interval
export function startSessionCleanup(): void {
  setInterval(cleanupExpiredSessions, 60000);
}
