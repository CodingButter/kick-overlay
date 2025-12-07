import { queries } from '../db';

// Session TTL (7 days)
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// Generate session token
export function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate verification code
export function generateVerifyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create verification code
export function createVerification(username: string): string {
  const code = generateVerifyCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  queries.createVerification.run(username, code, expiresAt);
  return code;
}

// Check verification and create session if verified
export function checkVerification(username: string, code: string): { verified: boolean; sessionToken?: string; error?: string } {
  const verification = queries.getVerification.get(username, code);

  if (!verification) {
    return { verified: false, error: 'Invalid or expired code' };
  }

  if (!verification.verified) {
    return { verified: false };
  }

  // Get or create user
  let user = queries.getUserByUsername.get(username);
  if (!user) {
    queries.createUser.run(username);
    user = queries.getUserByUsername.get(username);
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();
  queries.createSession.run(user!.id, sessionToken, expiresAt);

  // Clean up the verification code
  queries.deleteVerification.run(username);

  return { verified: true, sessionToken };
}

// Validate session
export function validateSession(username: string, token: string): boolean {
  const session = queries.getSession.get(token);

  if (session) {
    const user = queries.getUserById.get(session.user_id);
    if (user && user.username.toLowerCase() === username.toLowerCase()) {
      return true;
    }
  }

  return false;
}

// Handle !verify command from chat
export function handleVerifyCommand(username: string, code: string): void {
  const verification = queries.getVerification.get(username, code);
  if (verification && !verification.verified) {
    queries.markVerified.run(username, code);
    console.log(`Profile verified for ${username} with code ${code}`);
  }
}
