// Database initialization and migrations
import { migrateFromJson, seedDefaultOverlaySettings, seedDefaultPowerups, seedDefaultTips, seedDefaultGoals, getGoalsData } from './server/db';

// Config modules (load on startup)
import { loadDropGameConfig } from './server/config/dropgame';
import { loadThemeConfig } from './server/config/theme';
import { loadOverlayLayout } from './server/config/overlay';

// Services initialization
import { startSessionCleanup } from './server/services/admin';
import { startDropGameCleanup } from './server/services/dropgame';
import { startWatchPointsInterval } from './server/services/stream';
import { goals, fetchKickGoals } from './server/services/kick-api';

// Routes
import {
  publicApiRoutes,
  staticRoutes,
  adminRoutes,
  handleAdminDynamicRoutes,
  createOAuthRoutes,
  chatPageRoute,
  createWebhookRoute,
  profileRoutes,
  handleProfileDynamicRoutes,
} from './server/routes';

// SPA entry point
import spaIndex from './index.html';

// Configuration
const PORT = 5050;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const REDIRECT_URI = `${PUBLIC_URL}/callback`;

// Run database migrations on startup
migrateFromJson().catch(err => console.error('Migration error:', err));

// Seed default data
seedDefaultPowerups();
seedDefaultOverlaySettings();
seedDefaultTips();
seedDefaultGoals();

// Load configs on startup
loadDropGameConfig();
loadThemeConfig();
loadOverlayLayout();

// Load goals from database and fetch from Kick API
async function loadGoals(): Promise<void> {
  try {
    const dbGoals = getGoalsData();
    goals.followers.current = dbGoals.followers.current;
    goals.followers.target = dbGoals.followers.target;
    goals.subscribers.current = dbGoals.subscribers.current;
    goals.subscribers.target = dbGoals.subscribers.target;
    console.log(`Loaded goals: ${goals.followers.current} followers, ${goals.subscribers.current} subs`);
    fetchKickGoals().catch(err => console.error('Initial goals fetch failed:', err));
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}
loadGoals();

// Start background intervals
startSessionCleanup();
startDropGameCleanup();
startWatchPointsInterval();

// Build routes object
const oauthRoutes = createOAuthRoutes(REDIRECT_URI);
const webhookRoute = createWebhookRoute();

// SPA routes - all served by React Router
const spaRoutes = {
  '/': spaIndex,
  '/commands': spaIndex,
  '/voicelist': spaIndex,
  '/drop-game-rules': spaIndex,
  '/profile-login': spaIndex,
  '/overlay': spaIndex,
  '/overlay/chat': spaIndex,
  '/overlay/goals': spaIndex,
  '/overlay/dropgame': spaIndex,
  '/profile/*': spaIndex,
  '/admin': spaIndex,
  '/wiki': spaIndex,
};

// Combine all routes
const routes = {
  ...spaRoutes,
  ...oauthRoutes,
  ...webhookRoute,
  ...chatPageRoute,
  ...publicApiRoutes,
  ...staticRoutes,
  ...adminRoutes,
  ...profileRoutes,
};

// Start the server
Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  routes,
  // Handle dynamic routes
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Admin dynamic routes
    const adminResponse = handleAdminDynamicRoutes(path, req);
    if (adminResponse) {
      return adminResponse;
    }

    // Profile dynamic routes
    const profileResponse = handleProfileDynamicRoutes(path, req);
    if (profileResponse) {
      return profileResponse;
    }

    // Profile page route (dynamic): /profile/:username
    const profilePageMatch = path.match(/^\/profile\/([^/]+)$/);
    if (profilePageMatch) {
      const htmlFile = Bun.file('./index.html');
      return new Response(htmlFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // For all other non-API routes, serve the SPA
    if (!path.startsWith('/api/') && !path.startsWith('/public/') && !path.startsWith('/webhook')) {
      const htmlFile = Bun.file('./index.html');
      return new Response(htmlFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`OAuth server running at http://localhost:${PORT}`);
console.log(`Visit http://localhost:${PORT} to start the OAuth flow`);
