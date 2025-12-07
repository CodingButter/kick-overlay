# Kick-Overlay API Reference

## Base URL
```
http://localhost:5050
```

## Authentication

### Admin Authentication
- Login via POST `/api/admin/login` with password
- Returns session token stored in `admin_sessions` table
- Include token in requests for admin endpoints

### User Authentication
- Chat-based verification via `/api/verify/*`
- Session tokens stored in `user_sessions` table

---

## Chat Endpoints

### GET /api/chat
Get recent chat messages.

**Response:** `ChatMessage[]`
```json
[
  {
    "id": "msg_123",
    "content": "Hello world!",
    "user": {
      "username": "viewer1",
      "avatar_url": "https://..."
    },
    "timestamp": 1699999999999
  }
]
```

---

## Drop Game Endpoints

### GET /api/dropgame/queue
Get pending drops and current config.

**Response:**
```json
{
  "drops": [
    {
      "username": "player1",
      "avatarUrl": "https://...",
      "emoteUrl": null,
      "activePowerup": null
    }
  ],
  "config": {
    "platformWidthRatio": 0.125,
    "avatarSize": 60,
    "gravity": 5,
    "basePoints": 10,
    "centerBonusPoints": 100
  }
}
```

### GET /api/dropgame/config
Get drop game configuration only.

### POST /api/dropgame/score
Report a drop landing score.

**Request:**
```json
{
  "username": "player1",
  "score": 85,
  "isPerfect": false
}
```

### POST /api/dropgame/landed
Notify that a player has landed (allows them to drop again).

**Request:**
```json
{
  "username": "player1"
}
```

### GET /api/dropgame/powerups
Get pending powerup activations (polled by game).

**Response:** `PowerupEvent[]`
```json
[
  {
    "username": "player1",
    "powerupId": "tnt",
    "timestamp": 1699999999999
  }
]
```

---

## Profile Endpoints

### GET /api/profile/:username
Get user profile data.

**Response:**
```json
{
  "username": "viewer1",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "dropImage": "https://...",
  "country": "US",
  "channelPoints": 5000,
  "dropPoints": 1200,
  "totalDrops": 45,
  "powerups": {
    "tnt": 3,
    "shield": 1
  }
}
```

### POST /api/profile/:username
Update user profile (requires session token).

**Request:**
```json
{
  "voiceId": "new_voice_id",
  "dropImage": "https://...",
  "country": "CA",
  "token": "session_token"
}
```

---

## Powerup Endpoints

### GET /api/powerups
Get all available powerups with costs.

**Response:**
```json
{
  "tnt": { "id": "tnt", "name": "TNT", "cost": 500, "emoji": "..." },
  "shield": { "id": "shield", "name": "Shield", "cost": 400, "emoji": "..." }
}
```

### GET /api/powerups/:username
Get user's powerup inventory.

### POST /api/powerups/:username/buy
Purchase a powerup.

**Request:**
```json
{
  "powerup": "tnt",
  "token": "session_token"
}
```

**Response:**
```json
{
  "success": true,
  "balance": 4500,
  "quantity": 2
}
```

---

## TTS Endpoints

### GET /api/tts/next
Get next TTS audio from queue (returns audio blob or 204).

### POST /api/tts/preview
Preview a TTS voice without queueing.

**Request:**
```json
{
  "text": "Hello world",
  "voiceId": "EXAVITQu4vr4xnSDxMaL"
}
```

**Response:** Audio blob

### GET /api/voices
Get list of available ElevenLabs voices.

---

## Goals Endpoints

### GET /api/goals
Get channel goals.

**Response:**
```json
{
  "followers": { "current": 150, "target": 200 },
  "subscribers": { "current": 25, "target": 50 }
}
```

---

## Stats Endpoints

### GET /api/stats/:username
Get user statistics.

### GET /api/leaderboard
Get top 50 users by total points.

**Response:**
```json
[
  {
    "username": "player1",
    "drop_image": "...",
    "country": "US",
    "channel_points": 5000,
    "drop_points": 3000,
    "total_drops": 100,
    "total_points": 8000
  }
]
```

---

## Verification Endpoints

### POST /api/verify/generate/:username
Generate a verification code for user.

**Response:**
```json
{
  "code": "ABC123",
  "expiresAt": "2024-01-01T00:05:00Z"
}
```

### GET /api/verify/check/:username/:code
Check if verification code is valid.

**Response:**
```json
{
  "valid": true,
  "token": "session_token"
}
```

### GET /api/session/validate/:username/:token
Validate an existing session.

---

## Overlay Endpoints

### GET /api/overlay/layout
Get current overlay layout configuration.

**Response:**
```json
{
  "width": 1920,
  "height": 1080,
  "columns": 16,
  "rows": 9,
  "gap": 8,
  "padding": 16,
  "components": [
    {
      "id": "comp_1",
      "type": "chat",
      "row": 1,
      "col": 1,
      "rowSpan": 6,
      "colSpan": 4
    }
  ]
}
```

### POST /api/overlay/layout
Update overlay layout (admin only).

### GET /api/overlay/settings
Get overlay settings (notification threshold, etc.).

---

## Admin Endpoints

### POST /api/admin/login
Authenticate as admin.

**Request:**
```json
{
  "password": "admin_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "admin_session_token"
}
```

### GET /api/admin/settings
Get all overlay settings (admin only).

### POST /api/admin/settings
Update overlay settings.

### GET /api/admin/users
Get all users with points (admin only).

### DELETE /api/admin/users/:id
Delete a user (admin only).

### GET /api/admin/tips
Get all tips (admin only).

### POST /api/admin/tips
Create/update tips.

### DELETE /api/admin/tips/:id
Delete a tip.

### GET /api/admin/goals
Get all goals (admin only).

### POST /api/admin/goals
Create/update goals.

### GET /api/admin/powerups
Get powerup configurations (admin only).

### POST /api/admin/powerups/:id
Update powerup configuration.

### GET /api/admin/dropgame/config
Get drop game configuration.

### POST /api/admin/dropgame/config
Update drop game configuration.

### GET /api/admin/theme
Get theme configuration.

### POST /api/admin/theme
Update theme configuration.

---

## Webhook Endpoints

### POST /api/webhooks/kick
Receive Kick.com webhook events.

**Event Types:**
- `chat.message.sent` - New chat message
- `channel.followed` - New follower
- `channel.subscription.new` - New subscription
- `channel.subscription.gifted` - Gifted subscription

---

## Commands Endpoint

### GET /api/commands
Get list of available chat commands.

**Response:**
```json
[
  {
    "command": "!say",
    "description": "Text-to-speech message",
    "arguments": "[id=VOICE_ID] <message>",
    "cooldown": 5000,
    "alternatives": []
  }
]
```
