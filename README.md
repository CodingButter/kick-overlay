# Kick Overlay

A stream overlay and chatbot system for Kick.com built with Bun. Features chat overlays, goals tracking, TTS integration, interactive drop game, and channel points system.

## Features

- **Chat Overlay** - Real-time chat display for OBS/streaming software
- **Goals Overlay** - Track follower and subscriber goals
- **Drop Game** - Interactive chat game where users drop avatars onto a platform to earn points
- **TTS Integration** - Text-to-speech via ElevenLabs (costs channel points)
- **Channel Points** - Users earn points for chatting and watching
- **Chat Commands** - Extensible command system with cooldowns

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Kick.com Developer Application (for OAuth)
- ElevenLabs API key (optional, for TTS)
- A way to expose your local server (ngrok, Cloudflare Tunnel, etc.)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/codingbutter/kick-overlay.git
cd kick-overlay
```

2. Install dependencies:
```bash
bun install
```

3. Copy the example environment file and configure it:
```bash
cp .example.env .env
```

4. Configure your `.env` file:
   - Get your `KICK_CLIENT_ID` and `KICK_CLIENT_SECRET` from [Kick Developer Settings](https://kick.com/settings/developer)
   - Set `WEBHOOK_URL` to your public URL (use ngrok for local development)
   - Add your ElevenLabs API key if you want TTS functionality

5. Start the server:
```bash
bun run dev
```

6. Visit `http://localhost:5050` and complete the OAuth flow to connect your Kick account

## Usage

### Overlay URLs

Add these as Browser Sources in OBS:

| Overlay | URL | Description |
|---------|-----|-------------|
| Chat | `http://localhost:5050/overlay/chat` | Chat messages display |
| Goals | `http://localhost:5050/overlay/goals` | Follower/subscriber goals |
| Drop Game | `http://localhost:5050/overlay/dropgame` | Interactive drop game |

### Chat Commands

| Command | Description |
|---------|-------------|
| `!help` | Get link to commands list |
| `!points` | Check your channel points balance |
| `!say <message>` | Text-to-speech (costs points) |
| `!drop [emote]` | Play the drop game |
| `!dropstats` | View your drop game stats |
| `!droptop` | View drop game leaderboard |
| `!socials` | Get all social links |
| `!discord` | Get Discord invite |

### Channel Points

Users earn points by:
- **Chatting**: 25 points per message (configurable)
- **Watching**: 5 points per minute while active (configurable)

Points can be spent on:
- `!say` command: 500 points (configurable)

## Configuration

All configuration is done via environment variables. See `.example.env` for all available options.

### Drop Game Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DROP_PLATFORM_WIDTH_RATIO` | 0.125 | Platform width as ratio of screen |
| `DROP_AVATAR_SIZE` | 100 | Size of dropping avatars |
| `DROP_GRAVITY` | 5 | Gravity strength |
| `DROP_BASE_POINTS` | 10 | Points for landing on platform |
| `DROP_CENTER_BONUS_POINTS` | 100 | Bonus points for center landing |

### Channel Points Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `POINTS_PER_MINUTE` | 5 | Points earned per minute watching |
| `POINTS_PER_CHAT` | 25 | Points earned per chat message |
| `POINTS_COST_SAY` | 500 | Cost to use !say command |

## Development

```bash
# Run with hot reload
bun run dev

# Build CSS
bun run build:css
```

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React (via Bun HTML imports)
- **Styling**: Tailwind CSS
- **TTS**: ElevenLabs API
- **Platform**: Kick.com Webhooks API

## License

MIT
