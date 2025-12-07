import { queries, getPointSummary, getRecentTransactions } from '../db';
import { getUserData, saveUserData, getUserPowerups, addDropPoints, POWERUPS, buyPowerup } from '../commands';
import type { PowerupType } from '../commands';
import { createVerification, checkVerification, validateSession } from '../services/verification';

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5050';

// Profile and user API routes
export const profileRoutes = {
  '/api/dropgame/score': {
    POST: async (req: Request) => {
      try {
        const body = await req.json() as { username: string; score: number; isPerfect: boolean };
        const { username, score, isPerfect } = body;

        if (!username || typeof score !== 'number') {
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }

        const newTotal = await addDropPoints(username, score, isPerfect);
        console.log(`${username} scored ${score} points${isPerfect ? ' (PERFECT!)' : ''} - Total: ${newTotal}`);

        return Response.json({ success: true, newTotal });
      } catch (error) {
        console.error('Error recording drop score:', error);
        return Response.json({ error: 'Failed to record score' }, { status: 500 });
      }
    },
  },
};

// Handle dynamic profile and user routes
export function handleProfileDynamicRoutes(path: string, req: Request): Response | Promise<Response> | null {
  // Public stats API: /api/stats/:username
  const statsMatch = path.match(/^\/api\/stats\/([^/]+)$/);
  if (statsMatch && req.method === 'GET') {
    const [, username] = statsMatch;
    const userData = getUserData(username!);
    return Response.json({
      username,
      channelPoints: userData.channelPoints || 0,
      dropPoints: userData.dropPoints || 0,
      totalDrops: userData.totalDrops || 0,
      totalPoints: (userData.channelPoints || 0) + (userData.dropPoints || 0),
      country: userData.country || null,
    });
  }

  // Point summary by source: /api/points/:username/summary
  const pointSummaryMatch = path.match(/^\/api\/points\/([^/]+)\/summary$/);
  if (pointSummaryMatch && req.method === 'GET') {
    const [, username] = pointSummaryMatch;
    const summary = getPointSummary(username!);
    return Response.json(summary);
  }

  // Recent transactions: /api/points/:username/transactions
  const transactionsMatch = path.match(/^\/api\/points\/([^/]+)\/transactions$/);
  if (transactionsMatch && req.method === 'GET') {
    const [, username] = transactionsMatch;
    const transactions = getRecentTransactions(username!);
    return Response.json(transactions);
  }

  // User powerups: /api/powerups/:username
  const powerupsMatch = path.match(/^\/api\/powerups\/([^/]+)$/);
  if (powerupsMatch && req.method === 'GET') {
    const [, username] = powerupsMatch;
    return (async () => {
      const userPowerups = await getUserPowerups(username!);
      return Response.json(userPowerups);
    })();
  }

  // Buy powerup: /api/powerups/:username/buy
  const buyPowerupMatch = path.match(/^\/api\/powerups\/([^/]+)\/buy$/);
  if (buyPowerupMatch && req.method === 'POST') {
    const [, username] = buyPowerupMatch;
    return (async () => {
      try {
        const body = await req.json() as { powerupId: string };
        const { powerupId } = body;
        if (!powerupId || !POWERUPS[powerupId as PowerupType]) {
          return Response.json({ error: 'Invalid powerup ID' }, { status: 400 });
        }
        const result = await buyPowerup(username!, powerupId as PowerupType);
        if (result.success) {
          return Response.json({ success: true, balance: result.balance, quantity: result.quantity });
        } else {
          return Response.json({ success: false, error: result.error, balance: result.balance }, { status: 400 });
        }
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    })();
  }

  // Verify generate API: POST /api/verify/generate/:username
  const verifyGenerateMatch = path.match(/^\/api\/verify\/generate\/([^/]+)$/);
  if (verifyGenerateMatch && req.method === 'POST') {
    const [, username] = verifyGenerateMatch;
    const code = createVerification(username!);
    return Response.json({ code });
  }

  // Verify check API: GET /api/verify/check/:username/:code
  const verifyCheckMatch = path.match(/^\/api\/verify\/check\/([^/]+)\/([A-Z0-9]+)$/);
  if (verifyCheckMatch && req.method === 'GET') {
    const [, username, code] = verifyCheckMatch;
    const result = checkVerification(username!, code!);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 404 });
    }

    if (result.verified) {
      return Response.json({ verified: true, sessionToken: result.sessionToken });
    }

    return Response.json({ verified: false });
  }

  // Session validation API: GET /api/session/validate/:username/:token
  const sessionValidateMatch = path.match(/^\/api\/session\/validate\/([^/]+)\/([A-Za-z0-9]+)$/);
  if (sessionValidateMatch && req.method === 'GET') {
    const [, username, token] = sessionValidateMatch;
    const isValid = validateSession(username!, token!);
    return Response.json({ valid: isValid });
  }

  // Serve uploaded images: /public/uploads/:filename
  const uploadMatch = path.match(/^\/public\/uploads\/([^/]+)$/);
  if (uploadMatch && req.method === 'GET') {
    const [, filename] = uploadMatch;
    return (async () => {
      const file = Bun.file(`./public/uploads/${filename}`);
      if (await file.exists()) {
        const ext = filename!.split('.').pop()?.toLowerCase();
        const contentType = ext === 'png' ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : 'application/octet-stream';
        return new Response(file, {
          headers: { 'Content-Type': contentType },
        });
      }
      return new Response('Not Found', { status: 404 });
    })();
  }

  // Image upload API: POST /api/upload/:username
  const uploadApiMatch = path.match(/^\/api\/upload\/([^/]+)$/);
  if (uploadApiMatch && req.method === 'POST') {
    const [, username] = uploadApiMatch;
    return (async () => {
      try {
        const formData = await req.formData();
        const file = formData.get('image') as File | null;

        if (!file) {
          return Response.json({ error: 'No image provided' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return Response.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP' }, { status: 400 });
        }

        if (file.size > 2 * 1024 * 1024) {
          return Response.json({ error: 'File too large. Max 2MB' }, { status: 400 });
        }

        const ext = file.name.split('.').pop() || 'png';
        const filename = `${username}-${Date.now()}.${ext}`;
        const filepath = `./public/uploads/${filename}`;

        const buffer = await file.arrayBuffer();
        await Bun.write(filepath, buffer);

        const imageUrl = `${PUBLIC_URL}/public/uploads/${filename}`;
        saveUserData(username!, { dropImage: imageUrl });

        return Response.json({ success: true, imageUrl });
      } catch (error) {
        console.error('Upload error:', error);
        return Response.json({ error: 'Upload failed' }, { status: 500 });
      }
    })();
  }

  // Profile API: /api/profile/:username
  const profileApiMatch = path.match(/^\/api\/profile\/([^/]+)$/);
  if (profileApiMatch) {
    const [, username] = profileApiMatch;

    if (req.method === 'GET') {
      return (async () => {
        const userData = getUserData(username!);
        const userPowerups = await getUserPowerups(username!);
        return Response.json({
          username: username,
          voiceId: userData.voiceId,
          dropPoints: userData.dropPoints || 0,
          totalDrops: userData.totalDrops || 0,
          channelPoints: userData.channelPoints || 0,
          dropImage: userData.dropImage,
          country: userData.country,
          powerups: userPowerups,
        });
      })();
    }

    if (req.method === 'POST') {
      return (async () => {
        try {
          const body = await req.json() as { voiceId?: string; dropImage?: string; country?: string };
          const updates: { voiceId?: string; dropImage?: string; country?: string } = {};
          if (body.voiceId !== undefined) updates.voiceId = body.voiceId;
          if (body.dropImage !== undefined) updates.dropImage = body.dropImage;
          if (body.country !== undefined) updates.country = body.country;

          saveUserData(username!, updates);
          const updatedData = getUserData(username!);
          const userPowerups = await getUserPowerups(username!);
          return Response.json({
            username: username,
            voiceId: updatedData.voiceId,
            dropPoints: updatedData.dropPoints || 0,
            totalDrops: updatedData.totalDrops || 0,
            channelPoints: updatedData.channelPoints || 0,
            dropImage: updatedData.dropImage,
            country: updatedData.country,
            powerups: userPowerups,
          });
        } catch (error) {
          return Response.json({ error: 'Invalid request body' }, { status: 400 });
        }
      })();
    }
  }

  return null;
}
