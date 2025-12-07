import { queries } from '../db';
import { verifyAdminSession, createAdminSession, deleteAdminSession, ADMIN_SESSION_TTL, generateAdminSessionToken } from '../services/admin';
import { getStreamStatus, setStreamStatus } from '../services/stream';
import { clearAllDroppers } from '../services/dropgame';
import { loadDropGameConfig, saveDropGameConfig } from '../config/dropgame';
import type { DropGameConfig } from '../config/dropgame';
import { loadThemeConfig, saveThemeConfig } from '../config/theme';
import type { ThemeConfig } from '../config/theme';
import { loadOverlayLayout, saveOverlayLayout } from '../config/overlay';
import type { OverlayLayoutConfig } from '../config/overlay';

// Admin API routes
export const adminRoutes = {
  '/api/admin/login': {
    POST: async (req: Request) => {
      try {
        const body = await req.json() as { password: string };
        const result = createAdminSession(body.password);

        if (result.success) {
          return Response.json({ success: true, token: result.token });
        } else {
          const status = result.error === 'Invalid password' ? 401 : 500;
          return Response.json({ error: result.error }, { status });
        }
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    },
  },
  '/api/admin/logout': {
    POST: async (req: Request) => {
      deleteAdminSession(req);
      return Response.json({ success: true });
    },
  },
  '/api/admin/verify': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ valid: false }, { status: 401 });
      }
      return Response.json({ valid: true });
    },
  },
  '/api/admin/stream-status': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return Response.json({ isLive: getStreamStatus() });
    },
    POST: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const body = await req.json() as { isLive: boolean };
      setStreamStatus(body.isLive);
      console.log(`Stream status manually set to: ${body.isLive ? 'LIVE' : 'OFFLINE'}`);
      return Response.json({ isLive: getStreamStatus() });
    },
  },
  '/api/admin/settings': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const rows = queries.getAllOverlaySettings.all();
      return Response.json(rows);
    },
    PUT: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        const body = await req.json() as { key: string; value: string };
        queries.upsertOverlaySetting.run(body.key, body.value, null);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    },
  },
  '/api/admin/powerups': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const rows = queries.getAllPowerupConfigsIncludingDisabled.all();
      return Response.json(rows.map(row => ({
        ...row,
        variables: JSON.parse(row.variables || '{}'),
      })));
    },
  },
  '/api/admin/dropgame': {
    GET: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const config = await loadDropGameConfig();
      return Response.json(config);
    },
    PUT: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        const body = await req.json() as DropGameConfig;
        saveDropGameConfig(body);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    },
    DELETE: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      clearAllDroppers();
      return Response.json({ success: true, message: 'Drop game state cleared' });
    },
  },
  '/api/admin/users': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const users = queries.getAllUsersWithPoints.all();
      return Response.json(users);
    },
  },
  '/api/admin/theme': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const config = loadThemeConfig();
      return Response.json(config);
    },
    PUT: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        const body = await req.json() as ThemeConfig;
        saveThemeConfig(body);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    },
  },
  '/api/admin/overlay/layout': {
    GET: (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const config = loadOverlayLayout();
      return Response.json(config);
    },
    PUT: async (req: Request) => {
      if (!verifyAdminSession(req)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        const body = await req.json() as OverlayLayoutConfig;
        saveOverlayLayout(body);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    },
  },
};

// Handle dynamic admin routes (powerup update, user update/delete)
export function handleAdminDynamicRoutes(path: string, req: Request): Response | null {
  // Admin powerup update API: PUT /api/admin/powerups/:id
  const adminPowerupMatch = path.match(/^\/api\/admin\/powerups\/([^/]+)$/);
  if (adminPowerupMatch && req.method === 'PUT') {
    if (!verifyAdminSession(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [, powerupId] = adminPowerupMatch;
    return (async () => {
      try {
        const body = await req.json() as { name: string; description: string; cost: number; variables: Record<string, any>; enabled: number };
        queries.updatePowerupConfig.run(
          body.name,
          body.description,
          body.cost,
          JSON.stringify(body.variables),
          body.enabled,
          powerupId!
        );
        return Response.json({ success: true });
      } catch (error) {
        console.error('Powerup update error:', error);
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    })() as unknown as Response;
  }

  // Admin user update/delete API: PUT/DELETE /api/admin/users/:id
  const adminUserMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (adminUserMatch) {
    if (!verifyAdminSession(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [, userIdStr] = adminUserMatch;
    const userId = parseInt(userIdStr!, 10);

    if (req.method === 'PUT') {
      return (async () => {
        try {
          const body = await req.json() as {
            voice_id?: string | null;
            drop_image?: string | null;
            country?: string | null;
            channel_points?: number;
            drop_points?: number;
            total_drops?: number;
          };

          const user = queries.getUserById.get(userId);
          if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
          }

          queries.updateUser.run(
            body.voice_id !== undefined ? body.voice_id : user.voice_id,
            body.drop_image !== undefined ? body.drop_image : user.drop_image,
            body.country !== undefined ? body.country : user.country,
            user.username
          );

          if (body.channel_points !== undefined || body.drop_points !== undefined || body.total_drops !== undefined) {
            const currentPoints = queries.getPoints.get(userId);
            queries.updateUserPoints.run(
              body.channel_points !== undefined ? body.channel_points : (currentPoints?.channel_points || 0),
              body.drop_points !== undefined ? body.drop_points : (currentPoints?.drop_points || 0),
              body.total_drops !== undefined ? body.total_drops : (currentPoints?.total_drops || 0),
              userId
            );
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('User update error:', error);
          return Response.json({ error: 'Invalid request' }, { status: 400 });
        }
      })() as unknown as Response;
    }

    if (req.method === 'DELETE') {
      return (async () => {
        try {
          queries.deleteUserPowerups.run(userId);
          queries.deleteUserPoints.run(userId);
          queries.deleteUser.run(userId);
          return Response.json({ success: true });
        } catch (error) {
          console.error('User delete error:', error);
          return Response.json({ error: 'Failed to delete user' }, { status: 500 });
        }
      })() as unknown as Response;
    }
  }

  return null;
}
