import {
  buildAuthUrl,
  exchangeCodeForTokens,
  saveTokensToDb,
  setStoredTokens,
  getCurrentUser,
  subscribeToEvents
} from '../services/kick-api';

// OAuth routes
export function createOAuthRoutes(redirectUri: string) {
  return {
    '/auth': {
      GET: async () => {
        const authUrl = await buildAuthUrl(redirectUri);
        return Response.redirect(authUrl, 302);
      },
    },
    '/auth-url': {
      GET: async () => {
        const authUrl = await buildAuthUrl(redirectUri);
        return Response.json({ url: authUrl });
      },
    },
    '/callback': {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>OAuth Error</h1>
                <p><strong>Error:</strong> ${error}</p>
                <p><strong>Description:</strong> ${errorDescription || 'No description'}</p>
                <a href="/">Try again</a>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        }

        if (!code) {
          return new Response('No authorization code received', { status: 400 });
        }

        try {
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          console.log('Tokens received:', tokens);
          setStoredTokens(tokens);
          saveTokensToDb(tokens);

          let userInfo = null;
          let subscriptionResult = null;
          let subscriptionError = null;

          try {
            userInfo = await getCurrentUser(tokens.access_token);
            console.log('User info:', userInfo);

            if (userInfo.data?.[0]?.user_id) {
              subscriptionResult = await subscribeToEvents(
                tokens.access_token,
                userInfo.data[0].user_id
              );
              console.log('Subscribed to events:', subscriptionResult);
            }
          } catch (subErr) {
            console.error('Event subscription error:', subErr);
            subscriptionError = subErr instanceof Error ? subErr.message : 'Unknown error';
          }

          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>OAuth Success</title></head>
              <body>
                <h1>Authentication Successful!</h1>
                <p>Your tokens have been saved to the database</p>
                <h3>Token Details:</h3>
                <pre>${JSON.stringify(tokens, null, 2)}</pre>
                ${userInfo ? `<h3>User Info:</h3><pre>${JSON.stringify(userInfo, null, 2)}</pre>` : ''}
                ${subscriptionResult ? `<h3>Event Subscriptions:</h3><pre>${JSON.stringify(subscriptionResult, null, 2)}</pre>` : ''}
                ${subscriptionError ? `<p style="color: red;">Event subscription error: ${subscriptionError}</p><p>Make sure WEBHOOK_URL env var is set to a public URL (use ngrok for local dev)</p>` : ''}
                <p><a href="/chat">View Chat Messages</a></p>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        } catch (err) {
          console.error('Token exchange error:', err);
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head><title>Token Exchange Error</title></head>
              <body>
                <h1>Token Exchange Failed</h1>
                <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
                <a href="/">Try again</a>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        }
      },
    },
  };
}

// Chat page route (legacy)
export const chatPageRoute = {
  '/chat': {
    GET: () => {
      // Import chatMessages from ai-chat service
      const { getChatMessages } = require('../services/ai-chat');
      const chatMessages = getChatMessages();

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Chat Messages</title>
            <style>
              body { font-family: sans-serif; background: #1a1a2e; color: #fff; padding: 20px; }
              .message { background: #16213e; padding: 10px; margin: 5px 0; border-radius: 5px; }
              .username { color: #53fc18; font-weight: bold; }
              .content { margin-left: 10px; }
              .time { color: #666; font-size: 0.8em; }
              h1 { color: #53fc18; }
              .refresh { color: #53fc18; }
            </style>
            <script>
              setTimeout(() => location.reload(), 5000);
            </script>
          </head>
          <body>
            <h1>Chat Messages</h1>
            <p class="refresh">Auto-refreshing every 5 seconds...</p>
            <p>Total messages: ${chatMessages.length}</p>
            ${chatMessages.length === 0 ? '<p>No messages yet. Make sure webhooks are configured and you have subscribed to events.</p>' : ''}
            ${chatMessages.slice().reverse().map((msg: any) => `
              <div class="message">
                <span class="username">${msg.sender?.username || 'Unknown'}</span>
                <span class="time">${msg.timestamp || ''}</span>
                <div class="content">${msg.content || JSON.stringify(msg)}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    },
  },
};
