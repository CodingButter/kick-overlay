# Kick Overlay System

<div align="center">

![Kick Overlay](https://img.shields.io/badge/Platform-Kick.com-53fc18?style=for-the-badge&logo=kick&logoColor=white)
![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?style=for-the-badge&logo=bun&logoColor=black)
![React](https://img.shields.io/badge/Frontend-React-61dafb?style=for-the-badge&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/Database-SQLite-003b57?style=for-the-badge&logo=sqlite&logoColor=white)

**A full-featured stream overlay and chatbot system for [Kick.com](https://kick.com)**

*Drop games, channel points, TTS, AI chatbot, gambling, duels, and more!*

[Quick Start](#quick-start) | [Features](#features) | [Documentation](#documentation) | [Chat Commands](#chat-commands)

</div>

---

## What is Kick Overlay?

Kick Overlay is an all-in-one streaming toolkit that transforms your Kick.com streams with interactive overlays, a complete channel points economy, and engaging chat games. Built with modern web technologies and designed for streamers who want professional-quality engagement tools.

### Highlights

- **Interactive Drop Game** - Viewers drop avatars onto a platform to earn points with physics-based gameplay
- **Channel Points Economy** - Earn points from watching, chatting, subscribing, tipping, and more
- **Gambling & Duels** - Roll dice, flip coins, and challenge other viewers for points
- **Custom TTS** - Text-to-speech with 30+ ElevenLabs voices and per-user preferences
- **AI Chatbot** - Claude-powered bot that engages naturally with your community
- **Beautiful Overlays** - Professional chat display, goal trackers, and drop game visuals
- **Admin Dashboard** - Web-based control panel for all settings
- **Theming System** - Full customization to match your brand

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Overlay URLs for OBS](#overlay-urls-for-obs)
- [Chat Commands](#chat-commands)
  - [General Commands](#general-commands)
  - [Drop Game Commands](#drop-game-commands)
  - [TTS Commands](#tts-commands)
  - [Gambling Commands](#gambling-commands)
  - [Duel Commands](#duel-commands)
  - [Social Commands](#social-commands)
- [Channel Points Economy](#channel-points-economy)
- [Drop Game & Powerups](#drop-game--powerups)
- [AI Chatbot](#ai-chatbot)
- [Admin Dashboard](#admin-dashboard)
- [User Profiles](#user-profiles)
- [Database Management](#database-management)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Stream Overlays
- **Chat Overlay** - Beautiful real-time chat display with animations and theming
- **Goals Overlay** - Track follower and subscriber goals with animated progress bars
- **Drop Game Overlay** - Interactive physics-based game visible on stream
- **Rotating Tips** - Display helpful tips and information to viewers
- **Event Alerts** - Show follows, subs, gifts, and tips

### Interactive Systems
- **Drop Game** - Viewers drop avatars onto a platform to earn points
- **Powerups** - TNT, Shield, Magnet, Ghost, Boost, and Power Drop abilities
- **Gambling** - !roll and !coinflip commands for betting points
- **Duels** - Challenge other viewers to win their points
- **Leaderboards** - Track top players across all activities

### Channel Points Economy
- **Earn Points** from chatting, watching, subscribing, tipping, and gifting
- **Spend Points** on TTS messages, drop game powerups, and more
- **Track History** - See exactly where every point came from
- **Reward Supporters** - Bonus points for subs, gifts, and tips

### AI & Automation
- **AI Chatbot** - Claude-powered bot that responds naturally to chat
- **Text-to-Speech** - ElevenLabs integration with 30+ voices
- **Per-User Voices** - Viewers can set their own TTS voice
- **Auto-moderation** - Configurable command cooldowns

### Management
- **Admin Dashboard** - Web-based control panel for all settings
- **User Profiles** - Viewers can customize their drop image and voice
- **Database Studio** - Browse and edit data with Drizzle Studio
- **Theme Editor** - Customize colors, fonts, and styling

---

## Prerequisites

Before you begin, ensure you have:

1. **[Bun](https://bun.sh/)** - JavaScript runtime (v1.0+)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Kick.com Developer Application**
   - Go to [Kick Developer Settings](https://kick.com/dashboard/oauth)
   - Create a new OAuth application
   - Note your Client ID and Client Secret

3. **Public URL** - Required for webhooks
   - [ngrok](https://ngrok.com/) - `ngrok http 5050` (recommended for development)
   - [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
   - Your own domain with reverse proxy

4. **ElevenLabs API Key** (optional, for TTS)
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Get your API key from the dashboard

5. **Claude Code CLI** (optional, for AI chatbot)
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

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

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Configuration](#configuration)).

### Step 3: Set Up Database

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

```env
# ===========================================
# REQUIRED - Kick OAuth Credentials
# ===========================================
KICK_CLIENT_ID=your_kick_client_id
KICK_CLIENT_SECRET=your_kick_client_secret
PUBLIC_URL=https://your-domain.com

# ===========================================
# AUTO-POPULATED - After OAuth
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
# OPTIONAL - Channel Points Configuration
# ===========================================
# Earning rates
POINTS_PER_MINUTE=5           # Points earned per minute watching
POINTS_PER_CHAT=25            # Points earned per chat message

# Monetization rewards
POINTS_PER_KICK=100           # Points per Kick donated (tips)
POINTS_PER_SUB=2000           # Points for subscribing
POINTS_PER_GIFT=1500          # Points per gifted sub
POINTS_PER_RENEWAL=1000       # Points for renewing subscription

# Spending costs
POINTS_COST_SAY=500           # Cost for !say TTS command

# ===========================================
# OPTIONAL - Gambling Limits
# ===========================================
MIN_BET=10                    # Minimum bet for gambling
MAX_BET=10000                 # Maximum bet for gambling
MIN_DUEL=50                   # Minimum duel wager
MAX_DUEL=5000                 # Maximum duel wager
```

---

## Running the Application

### Development Mode

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
| `bun run db:studio` | Open Drizzle Studio |
| `bun run typecheck` | Run TypeScript type checking |
| `bun test` | Run tests |

---

## Overlay URLs for OBS

Add these as **Browser Sources** in OBS Studio:

| Overlay | URL | Size |
|---------|-----|------|
| **Main Overlay** | `http://localhost:5050/overlay` | 1920x1080 |
| **Chat Only** | `http://localhost:5050/overlay/chat` | 400x600 |
| **Goals Only** | `http://localhost:5050/overlay/goals` | 400x200 |
| **Drop Game** | `http://localhost:5050/overlay/dropgame` | 1920x1080 |

### OBS Browser Source Settings

- **Width**: Match your canvas (1920 for 1080p)
- **Height**: Match your canvas (1080 for 1080p)
- **FPS**: 60
- **Custom CSS**: `body { background-color: transparent; }`
- **Shutdown source when not visible**: Unchecked
- **Refresh browser when scene becomes active**: Checked

---

## Chat Commands

### General Commands

| Command | Aliases | Description | Cooldown |
|---------|---------|-------------|----------|
| `!help` | `!commands` | Get link to commands list | 5s |
| `!points` | `!balance`, `!bal` | Check your points balance | 5s |
| `!profile` | - | Get link to your profile page | 5s |

### Drop Game Commands

| Command | Description | Cooldown |
|---------|-------------|----------|
| `!drop` | Drop with your avatar | 10s |
| `!drop <emote>` | Drop with an emote | 10s |
| `!drop -powerup <type>` | Use a powerup while dropping | 10s |
| `!drop -rules` | View drop game rules | - |
| `!drop -powerups` | View available powerups | - |
| `!drop -buy <type>` | Buy a powerup | - |
| `!drop -mine` | View your powerup inventory | - |
| `!dropstats` | View your drop statistics | 5s |
| `!droptop` | View the leaderboard | 10s |

### Queue Mode Commands (Mass Drops)

| Command | Aliases | Description |
|---------|---------|-------------|
| `!queuedrop` | `!qdrop`, `!joindrop` | Join the waiting queue |
| `!queuedrop <emote>` | - | Queue with a specific emote |
| `!leavedrop` | `!unqdrop`, `!canceldrop` | Leave the queue |
| `!queuesize` | `!qsize`, `!waiting` | Check how many are waiting |
| `!startdrop` | `!go`, `!launch` | Start the drop (admin only) |
| `!clearqueue` | - | Clear the queue (admin only) |

**How Queue Mode Works:**
1. Viewers join with `!queuedrop`
2. Streamer starts everyone dropping with `!startdrop`
3. All queued players drop at once!

### TTS Commands

| Command | Description | Cost |
|---------|-------------|------|
| `!say <message>` | Text-to-speech message | 500 pts |
| `!say -voice <id> <message>` | TTS with specific voice | 500 pts |
| `!voices` | Get link to voice list | Free |

### Gambling Commands

| Command | Aliases | Description | Odds |
|---------|---------|-------------|------|
| `!roll <amount>` | `!gamble`, `!bet`, `!slots` | Roll dice to win or lose | See below |
| `!coinflip <amount>` | `!flip`, `!cf` | 50/50 chance to double | 50% |

**!roll Odds:**
- Roll 1-10: **JACKPOT!** Win 5x your bet
- Roll 11-50: **WIN!** Win 2x your bet
- Roll 51-100: **LOSE** Lose your bet

**Examples:**
```
!roll 100        # Bet 100 points on the dice
!coinflip 500    # Flip a coin for 500 points
!gamble all      # Bet all your points (use carefully!)
```

### Duel Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `!duel <user> <amount>` | `!challenge`, `!fight` | Challenge another user |
| `!accept` | - | Accept a pending duel |
| `!decline` | `!deny`, `!reject` | Decline a duel |
| `!cancel` | - | Cancel your pending challenge |

**How Duels Work:**
1. Challenge someone: `!duel @username 500`
2. They have 60 seconds to `!accept` or `!decline`
3. If accepted, a random winner is chosen (50/50)
4. Winner takes both wagers!

**Examples:**
```
!duel @rival 500     # Challenge @rival for 500 points
!accept              # Accept a pending duel against you
!decline             # Decline a duel
!cancel              # Cancel your outgoing challenge
```

### Social Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `!socials` | - | Get all social media links |
| `!twitter` | `!x` | Twitter/X profile |
| `!youtube` | `!yt` | YouTube channel |
| `!github` | `!gh` | GitHub profile |
| `!tiktok` | - | TikTok profile |
| `!instagram` | `!ig` | Instagram profile |
| `!discord` | - | Discord server invite |

### Verification Commands

| Command | Description |
|---------|-------------|
| `!verify <code>` | Verify your profile ownership |

---

## Channel Points Economy

### Earning Points

| Activity | Points | Notes |
|----------|--------|-------|
| **Watching** | 5/min | Passive earning while stream is live |
| **Chatting** | 25/msg | Earn for each chat message |
| **Subscribing** | 2,000 | One-time bonus for new subs |
| **Sub Renewal** | 1,000 | Bonus for renewing your sub |
| **Gifting Subs** | 1,500/gift | Per gifted subscription |
| **Tipping (Kicks)** | 100/kick | Per Kick donated |
| **Drop Game** | Varies | Based on landing position |
| **Gambling** | Win/Lose | Risk it for the biscuit |
| **Duels** | Win/Lose | Challenge other viewers |

### Spending Points

| Item | Cost | Description |
|------|------|-------------|
| **TTS Message** | 500 | !say command |
| **Powerups** | 500 each | Drop game abilities |
| **Gambling** | Your bet | Win or lose |
| **Duels** | Your wager | Winner takes all |

### Point Sources Tracked

All points are tracked by source so you can see exactly where they came from:

- `chat` - Points from chat messages
- `watch` - Points from watch time
- `drop` - Points from drop game
- `sub` - Points from subscribing
- `gift` - Points from gifting subs
- `renewal` - Points from renewing
- `tip` - Points from Kick tips
- `gamble` - Points won/lost gambling
- `duel` - Points won/lost in duels
- `admin` - Points given by admin
- `spend` - Points spent on items

View your complete breakdown on your profile page!

---

## Drop Game & Powerups

### How to Play

1. Type `!drop` in chat to drop your avatar
2. Your avatar falls from a random position at the top
3. Land on the platform to earn points
4. Land in the center for bonus points!
5. Use powerups for special abilities

### Scoring

| Landing Zone | Points |
|--------------|--------|
| Edge of platform | 50 |
| Near center | 100 |
| Perfect center | 200 + bonus |

### Powerups

| Powerup | Effect | Cost |
|---------|--------|------|
| **TNT** | Creates explosion pushing other players away | 500 |
| **Power Drop** | Stops horizontal movement, drops straight down | 500 |
| **Shield** | Protects from other players' powerups | 500 |
| **Magnet** | Pulls your dropper towards platform center | 500 |
| **Ghost** | Pass through other players without collision | 500 |
| **Boost** | Increases your drop speed | 500 |

### Powerup Commands

```bash
!drop -buy tnt        # Buy TNT powerup
!drop -buy shield     # Buy Shield powerup
!drop -mine           # Check your inventory
!drop -powerup tnt    # Use TNT on your next drop
!drop -powerup shield # Use Shield on your next drop
```

---

## AI Chatbot

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

- Reads all non-command messages in chat
- Has context about the streamer, commands, emotes, and recent chat
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

Access at `http://localhost:5050/admin`

### Features

- **Powerup Configuration** - Adjust costs, enable/disable powerups
- **Overlay Settings** - Customize colors, sizes, animations
- **Tips Management** - Add/edit/remove rotating tips
- **Goals Management** - Set follower/subscriber targets
- **User Management** - View user stats and balances
- **Theme Editor** - Customize the visual appearance
- **Wiki Link** - Access full documentation

### Authentication

The admin dashboard uses session-based authentication. On first visit, you'll be prompted to authenticate via Kick OAuth. Only the channel owner can access admin features.

---

## User Profiles

Visit `http://localhost:5050/profile/{username}`

### Features

- View total points and breakdown by source
- See earned vs spent statistics
- View drop game statistics
- View powerup inventory
- Customize drop avatar/image
- Set preferred TTS voice
- View recent point transactions

### Profile Verification

1. Visit `http://localhost:5050/login`
2. Enter your Kick username
3. Type `!verify <code>` in chat
4. You're now verified and can customize your profile!

---

## Database Management

### SQLite Database

Located at `data/kick-overlay.db`

### Drizzle Studio

Browse and edit visually:

```bash
bun run db:studio
```

Then visit `https://local.drizzle.studio`

### Database Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and preferences |
| `user_points` | Channel and drop points |
| `point_transactions` | History of all point changes |
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
├── .env                  # Environment variables
│
├── data/                 # Database storage
│   └── kick-overlay.db   # SQLite database
│
├── server/               # Server-side code
│   ├── commands.ts       # Chat command handlers
│   ├── elevenlabs.ts     # TTS integration
│   ├── claude_prompt_template.ts  # AI prompt config
│   ├── config/           # Configuration loaders
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   └── db/               # Database layer
│       ├── index.ts      # Database queries
│       ├── schema.sql    # SQL schema
│       ├── drizzle-schema.ts  # Drizzle ORM schema
│       └── setup.ts      # Database initialization
│
├── src/                  # Frontend React application
│   ├── App.tsx           # Main React app with routing
│   ├── main.tsx          # React entry point
│   ├── index.css         # Global styles
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── pages/            # Page components
│   ├── stores/           # Zustand state stores
│   └── lib/              # Utilities and API client
│
└── public/               # Static assets
    └── uploads/          # User uploaded files
```

---

## API Reference

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
| GET | `/wiki` | Documentation wiki |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat` | Get recent chat messages |
| GET | `/api/goals` | Get current goals |
| GET | `/api/tips` | Get rotating tips |
| GET | `/api/overlay/settings` | Get overlay config |
| GET | `/api/powerups` | Get powerup config |
| GET | `/api/leaderboard` | Get leaderboard |
| GET | `/api/user/:username` | Get user data |
| GET | `/api/voices` | Get TTS voices |
| GET | `/api/commands` | Get all commands |
| GET | `/api/theme` | Get theme config |
| GET | `/api/points/:username/summary` | Point breakdown |
| GET | `/api/points/:username/transactions` | Transaction history |
| GET | `/api/dropgame/queue` | Get pending drops |
| GET | `/api/dropgame/state` | Get full game state |
| GET | `/api/dropgame/waiting` | Get waiting queue |
| GET | `/api/dropgame/events?since=timestamp` | Get game events |

### Webhook Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook` | Kick webhook receiver |

---

## Troubleshooting

### OAuth Issues

**"Invalid redirect URI"**
- Ensure Kick app redirect URI matches `{PUBLIC_URL}/callback`
- Make sure PUBLIC_URL has no trailing slash

**"Webhook not receiving events"**
- Verify your tunnel is running
- Check PUBLIC_URL matches your tunnel URL
- Re-authenticate to re-register webhooks

### Database Issues

**"Database is locked"**
- Only one process can write at a time
- Close Drizzle Studio when running the server
- Kill zombie processes: `pkill -f bun`

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
- Check Claude CLI: `claude --version`
- Verify authentication: `claude auth`

### Drop Game Issues

**"Drops not appearing"**
- Refresh the OBS browser source
- Check WebSocket connection in console
- Verify overlay URL is correct

### Gambling/Duel Issues

**"Can't place bet"**
- Check you have enough points
- Ensure bet is within MIN_BET and MAX_BET limits

**"Duel expired"**
- Duels expire after 60 seconds if not accepted

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

| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh/) | JavaScript runtime |
| [React](https://react.dev/) | Frontend framework |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI components |
| [SQLite](https://sqlite.org/) | Database |
| [Drizzle ORM](https://orm.drizzle.team/) | Database ORM |
| [ElevenLabs](https://elevenlabs.io/) | Text-to-speech |
| [Claude](https://claude.ai/) | AI chatbot |
| [Kick.com](https://kick.com/) | Streaming platform |

---

<div align="center">

**Made with love for the Kick.com community**

[Report Bug](https://github.com/codingbutter/kick-overlay/issues) | [Request Feature](https://github.com/codingbutter/kick-overlay/issues)

</div>
