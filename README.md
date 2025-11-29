# Kick Overlay System

A full-featured stream overlay and chatbot system for [Kick.com](https://kick.com) built with Bun. Features real-time chat overlays, interactive drop game, AI chatbot, TTS integration, channel points, powerups, and more.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Overlay URLs for OBS](#overlay-urls-for-obs)
- [Chat Commands](#chat-commands)
- [Drop Game & Powerups](#drop-game--powerups)
- [AI Chatbot](#ai-chatbot)
- [Admin Dashboard](#admin-dashboard)
- [User Profiles](#user-profiles)
- [Database Management](#database-management)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Stream Overlays
- **Chat Overlay** - Beautiful real-time chat display for OBS with animations
- **Goals Overlay** - Track follower and subscriber goals with progress bars
- **Drop Game Overlay** - Interactive physics-based game visible on stream
- **Rotating Tips** - Display helpful tips and information to viewers

### Interactive Systems
- **Drop Game** - Viewers drop avatars onto a platform to earn points
- **Powerups** - TNT, Shield, Magnet, Ghost, Boost, and Power Drop abilities
- **Channel Points** - Earn points for chatting and watching, spend on TTS and powerups
- **Leaderboards** - Track top players and stats

### AI & Automation
- **AI Chatbot** - Claude-powered chatbot that responds naturally to chat
- **Text-to-Speech** - ElevenLabs integration with per-user voice preferences
- **Auto-moderation** - Configurable command cooldowns

### Management
- **Admin Dashboard** - Web-based control panel for all settings
- **User Profiles** - Viewers can customize their drop image and voice
- **Drizzle Studio** - Database browser for advanced management

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **[Bun](https://bun.sh/)** - JavaScript runtime (v1.0+)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **[Claude Code CLI](https://claude.ai/claude-code)** (optional, for AI chatbot)
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. **Kick.com Developer Application**
   - Go to [Kick Developer Settings](https://kick.com/dashboard/oauth)
   - Create a new OAuth application
   - Note your Client ID and Client Secret

4. **Public URL** - Required for webhooks. Options:
   - [ngrok](https://ngrok.com/) - `ngrok http 5050`
   - [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
   - Your own domain with reverse proxy

5. **ElevenLabs API Key** (optional, for TTS)
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Get your API key from the dashboard

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/codingbutter/kick-overlay.git
cd kick-overlay

# 2. Install dependencies
bun install

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials (see Configuration section)

# 4. Initialize the database
bun run db:setup

# 5. Start your tunnel (in a separate terminal)
ngrok http 5050

# 6. Update PUBLIC_URL in .env with your ngrok URL

# 7. Start the server
bun dev

# 8. Visit http://localhost:5050 and complete OAuth
```

---

## Installation

### Step 1: Clone and Install

```bash
git clone https://github.com/codingbutter/kick-overlay.git
cd kick-overlay
bun install
```

### Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 3: Set Up Database

Initialize the SQLite database with default data:

```bash
bun run db:setup
```

This creates:
- `data/kick-overlay.db` - SQLite database
- Default powerup configurations
- Default overlay settings
- Default tips and goals

### Step 4: Configure Kick OAuth

1. Go to [Kick Developer Settings](https://kick.com/dashboard/oauth)
2. Create a new application with:
   - **Redirect URI**: `{YOUR_PUBLIC_URL}/callback`
   - **Webhook URL**: `{YOUR_PUBLIC_URL}/webhook`
3. Copy your Client ID and Client Secret to `.env`

### Step 5: Set Up Public URL

For webhooks to work, Kick needs to reach your server. Options:

**Option A: ngrok (recommended for development)**
```bash
ngrok http 5050
# Copy the https URL to PUBLIC_URL in .env
```

**Option B: Cloudflare Tunnel**
```bash
cloudflared tunnel --url http://localhost:5050
```

**Option C: Production domain**
Set up a reverse proxy (nginx/caddy) pointing to port 5050.

---

## Configuration

### Environment Variables

Edit your `.env` file with the following:

```env
# ===========================================
# REQUIRED - Kick OAuth Credentials
# ===========================================
KICK_CLIENT_ID=your_kick_client_id
KICK_CLIENT_SECRET=your_kick_client_secret

# Public URL (for webhooks and links)
# Use your ngrok/tunnel URL or production domain
PUBLIC_URL=https://your-domain.com

# ===========================================
# OPTIONAL - User Info (auto-populated after OAuth)
# ===========================================
KICK_USER_ID=your_user_id
KICK_USERNAME=your_username

# ===========================================
# OPTIONAL - ElevenLabs TTS
# ===========================================
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL_ID=eleven_flash_v2
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY_BOOST=0.75
ELEVENLABS_STYLE=0.1

# ===========================================
# OPTIONAL - AI Chatbot
# ===========================================
AI_ENABLED=true
PROJECT_DIRECTORY=/path/to/your/project

# ===========================================
# OPTIONAL - Channel Points
# ===========================================
POINTS_PER_MINUTE=5
POINTS_PER_CHAT=25
POINTS_COST_SAY=500
```

### Drop Game Configuration

Drop game settings (physics, scoring, powerups) are configured via the Admin Dashboard at `/admin`. All settings are stored in the database.

---

## Running the Application

### Development Mode (with hot reload)

```bash
bun dev
```

### Production Mode

```bash
bun start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start with hot reload |
| `bun start` | Start in production mode |
| `bun run db:setup` | Initialize/seed database |
| `bun run db:studio` | Open Drizzle Studio (database browser) |
| `bun run typecheck` | Run TypeScript type checking |
| `bun test` | Run tests |

---

## Overlay URLs for OBS

Add these as **Browser Sources** in OBS Studio:

| Overlay | URL | Recommended Size |
|---------|-----|------------------|
| **Main Overlay** | `http://localhost:5050/overlay` | 1920x1080 |
| **Chat Only** | `http://localhost:5050/overlay/chat` | 400x600 |
| **Goals Only** | `http://localhost:5050/overlay/goals` | 400x200 |
| **Drop Game** | `http://localhost:5050/overlay/dropgame` | 1920x1080 |

### OBS Browser Source Settings

- **Width**: Match your canvas (1920 for 1080p)
- **Height**: Match your canvas (1080 for 1080p)
- **FPS**: 60
- **Custom CSS**: (optional) `body { background-color: transparent; }`
- **Shutdown source when not visible**: Unchecked
- **Refresh browser when scene becomes active**: Checked

---

## Chat Commands

### General Commands

| Command | Description | Cooldown |
|---------|-------------|----------|
| `!help` | Get link to commands list | 5s |
| `!commands` | Alias for !help | 5s |
| `!points` | Check your channel points balance | 5s |
| `!profile` | Get link to your profile page | 5s |

### Social Commands

| Command | Description |
|---------|-------------|
| `!socials` | Get all social media links |
| `!twitter` / `!x` | Twitter/X profile |
| `!youtube` / `!yt` | YouTube channel |
| `!github` / `!gh` | GitHub profile |
| `!tiktok` | TikTok profile |
| `!instagram` / `!ig` | Instagram profile |
| `!discord` | Discord server invite |

### TTS Commands

| Command | Description | Cost |
|---------|-------------|------|
| `!say <message>` | Text-to-speech | 500 points |
| `!say -voice <id> <message>` | TTS with specific voice | 500 points |
| `!voices` | Get link to voice list | Free |

### Drop Game Commands

| Command | Description | Cooldown |
|---------|-------------|----------|
| `!drop` | Drop with your avatar | 10s |
| `!drop <emote>` | Drop with an emote | 10s |
| `!drop -powerup <type>` | Drop using a powerup | 10s |
| `!drop -rules` | View drop game rules | - |
| `!drop -powerups` | View available powerups | - |
| `!drop -buy <type>` | Buy a powerup | - |
| `!drop -mine` | View your powerup inventory | - |
| `!dropstats` | View your drop stats | 5s |
| `!droptop` | View leaderboard | 10s |

### Verification Commands

| Command | Description |
|---------|-------------|
| `!verify <code>` | Verify your profile ownership |

---

## Drop Game & Powerups

### How to Play

1. Type `!drop` in chat to drop your avatar
2. Your avatar falls from a random position
3. Land on the platform to earn points
4. Land in the center for bonus points!
5. Use powerups for special abilities

### Powerups

| Powerup | Effect | Default Cost |
|---------|--------|--------------|
| **TNT** | Creates explosion pushing other players away | 500 pts |
| **Power Drop** | Stops horizontal movement, drops straight down fast | 500 pts |
| **Shield** | Protects from other players' powerups | 500 pts |
| **Magnet** | Pulls your dropper towards platform center | 500 pts |
| **Ghost** | Pass through other players without collision | 500 pts |
| **Boost** | Increases your drop speed | 500 pts |

### Buying Powerups

```
!drop -buy tnt        # Buy TNT powerup
!drop -buy shield     # Buy Shield powerup
!drop -mine           # Check your inventory
```

### Using Powerups

```
!drop -powerup tnt    # Use TNT on your next drop
!drop -powerup shield # Use Shield on your next drop
```

---

## AI Chatbot

The overlay includes a Claude-powered AI chatbot that can respond to chat messages naturally.

### Setup

1. Install Claude Code CLI:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Authenticate Claude:
   ```bash
   claude auth
   ```

3. Enable in `.env`:
   ```env
   AI_ENABLED=true
   PROJECT_DIRECTORY=/path/to/your/project
   ```

### How It Works

- The AI reads all non-command messages
- It has context about the streamer, commands, emotes, and recent chat
- Responds naturally when appropriate (not to every message)
- Can search the web and read project files
- Has a per-user cooldown to prevent spam

### Customizing AI Behavior

Edit `server/claude_prompt_template.ts` to customize:
- AI personality
- Response style
- Topics to engage with
- When to respond vs. stay silent

---

## Admin Dashboard

Access the admin dashboard at `http://localhost:5050/admin`

### Features

- **Powerup Configuration** - Adjust costs, enable/disable powerups
- **Overlay Settings** - Customize colors, sizes, animations
- **Tips Management** - Add/edit/remove rotating tips
- **Goals Management** - Set follower/subscriber targets
- **User Management** - View user stats and balances

### Authentication

The admin dashboard uses session-based authentication. On first visit, you'll be prompted to authenticate via Kick OAuth.

---

## User Profiles

Users can view and customize their profiles at `http://localhost:5050/profile/{username}`

### Features

- View channel points and drop points
- See drop game statistics
- View powerup inventory
- Customize drop avatar/image
- Set preferred TTS voice
- View recent activity

### Profile Verification

Users verify profile ownership by:
1. Visiting `http://localhost:5050/login`
2. Entering their Kick username
3. Typing `!verify <code>` in chat
4. Being redirected to their profile

---

## Database Management

### SQLite Database

The application uses SQLite stored at `data/kick-overlay.db`.

### Drizzle Studio

Browse and edit the database visually:

```bash
bun run db:studio
```

Then visit `https://local.drizzle.studio`

### Database Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and preferences |
| `user_points` | Channel and drop points |
| `powerup_inventory` | User powerup ownership |
| `powerup_config` | Powerup settings |
| `overlay_settings` | Overlay configuration |
| `tips` | Rotating tips content |
| `goals` | Follower/subscriber goals |
| `api_tokens` | OAuth tokens |
| `user_sessions` | User login sessions |
| `verification_codes` | Profile verification codes |
| `drop_history` | Drop game history |
| `admin_sessions` | Admin login sessions |

### Database Reset

To reset the database completely:

```bash
rm data/kick-overlay.db
bun run db:setup
```

---

## Project Structure

```
kick-overlay/
├── index.ts              # Main server entry point
├── index.html            # HTML entry for React app
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── drizzle.config.ts     # Drizzle ORM configuration
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment file
│
├── data/                 # Database storage
│   └── kick-overlay.db   # SQLite database
│
├── server/               # Server-side code
│   ├── commands.ts       # Chat command handlers
│   ├── elevenlabs.ts     # TTS integration
│   ├── claude_prompt_template.ts  # AI prompt configuration
│   └── db/               # Database layer
│       ├── index.ts      # Database queries and helpers
│       ├── schema.sql    # SQL schema definitions
│       ├── drizzle-schema.ts  # Drizzle ORM schema
│       └── setup.ts      # Database initialization script
│
├── src/                  # Frontend React application
│   ├── App.tsx           # Main React app with routing
│   ├── main.tsx          # React entry point
│   ├── index.css         # Global styles
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── pages/            # Page components
│   │   ├── AdminPage.tsx
│   │   ├── OverlayPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── DropGamePage.tsx
│   │   └── ...
│   ├── stores/           # Zustand state stores
│   └── lib/              # Utilities and API client
│
└── public/               # Static assets
    └── uploads/          # User uploaded files
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Landing page |
| GET | `/overlay` | Main overlay page |
| GET | `/overlay/chat` | Chat-only overlay |
| GET | `/overlay/goals` | Goals-only overlay |
| GET | `/overlay/dropgame` | Drop game overlay |
| GET | `/admin` | Admin dashboard |
| GET | `/profile/:username` | User profile page |
| GET | `/login` | Profile login page |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | Get recent chat messages |
| GET | `/api/goals` | Get current goals |
| GET | `/api/tips` | Get rotating tips |
| GET | `/api/overlay-settings` | Get overlay configuration |
| GET | `/api/powerups` | Get powerup configuration |
| GET | `/api/leaderboard` | Get drop game leaderboard |
| GET | `/api/user/:username` | Get user data |
| GET | `/api/voices` | Get available TTS voices |
| POST | `/api/verify/generate` | Generate verification code |
| POST | `/api/verify/check` | Check verification status |

### Webhook Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook` | Kick webhook receiver |

---

## Troubleshooting

### OAuth Issues

**"Invalid redirect URI"**
- Ensure your Kick app's redirect URI matches `{PUBLIC_URL}/callback`
- Make sure PUBLIC_URL has no trailing slash

**"Webhook not receiving events"**
- Verify your tunnel is running
- Check PUBLIC_URL matches your tunnel URL
- Re-authenticate to re-register webhooks

### Database Issues

**"Database is locked"**
- Only one process can write at a time
- Close Drizzle Studio when running the server
- Kill any zombie bun processes: `pkill -f bun`

**"Table not found"**
- Run `bun run db:setup` to initialize

### TTS Issues

**"TTS not working"**
- Verify ELEVENLABS_API_KEY is set
- Check you have credits on ElevenLabs
- Try a different voice ID

### AI Chatbot Issues

**"AI not responding"**
- Ensure `AI_ENABLED=true` in .env
- Check Claude CLI is installed: `claude --version`
- Verify Claude is authenticated: `claude auth`

### Drop Game Issues

**"Drops not appearing on overlay"**
- Refresh the OBS browser source
- Check WebSocket connection in browser console
- Verify overlay URL is correct

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run type checking: `bun run typecheck`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

Built by [CodingButter](https://github.com/codingbutter)

- **Runtime**: [Bun](https://bun.sh/)
- **Frontend**: [React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [SQLite](https://sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **TTS**: [ElevenLabs](https://elevenlabs.io/)
- **AI**: [Claude](https://claude.ai/)
- **Platform**: [Kick.com](https://kick.com/)
