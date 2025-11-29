import { db, queries, getPowerupsFromDb, seedDefaultPowerups } from './db';

type Message = {
    content: string;
    user: {
        username: string;
        avatar_url: string;
    }
}
type ChatSend = (message: string) => void;
type QueueTTS = (text: string, voiceId?: string) => Promise<boolean>;
type QueueDrop = (username: string, avatarUrl: string, emoteUrl?: string, activePowerup?: PowerupType) => boolean;
type QueuePowerup = (username: string, powerupId: PowerupType) => void;

type IsPlayerDropping = (username: string) => boolean;

interface CommandHandler {
    message: Message;
    sendChat: ChatSend;
    queueTTS?: QueueTTS;
    queueDrop?: QueueDrop;
    queuePowerup?: QueuePowerup;
    isPlayerDropping?: IsPlayerDropping;
}

// Public URL for all links (derived from PUBLIC_URL env var)
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5050';

// Admin users exempt from cooldowns and point costs
export const ADMIN_USERS = ['codingbutter'];

export function isAdmin(username: string): boolean {
    return ADMIN_USERS.includes(username.toLowerCase());
}

// Powerup types
export type PowerupType = 'tnt' | 'powerdrop' | 'shield' | 'magnet' | 'ghost' | 'boost';

export interface Powerup {
    id: PowerupType;
    name: string;
    description: string;
    cost: number;
    emoji: string;
    effect: string;
}

// Seed default powerups on startup
seedDefaultPowerups();

// Load powerups from database - cached for sync access
let cachedPowerups: Record<PowerupType, Powerup> | null = null;

function loadPowerupsFromDb(): Record<PowerupType, Powerup> {
    const dbPowerups = getPowerupsFromDb();
    const result: Record<PowerupType, Powerup> = {} as Record<PowerupType, Powerup>;

    for (const [id, data] of Object.entries(dbPowerups)) {
        result[id as PowerupType] = {
            id: id as PowerupType,
            name: data.name,
            description: data.description,
            cost: data.cost,
            emoji: data.emoji,
            effect: data.effect,
        };
    }

    cachedPowerups = result;
    return result;
}

// Initialize on module load
const initialPowerups = loadPowerupsFromDb();

// Export getter function for dynamic access (reloads from db)
export async function getPowerups(): Promise<Record<PowerupType, Powerup>> {
    return loadPowerupsFromDb();
}

// Export sync version (uses cached value, refreshes on each call)
export function getPowerupsSync(): Record<PowerupType, Powerup> {
    return loadPowerupsFromDb();
}

// Export POWERUPS for backwards compatibility
export const POWERUPS: Record<PowerupType, Powerup> = initialPowerups;

interface UserData {
    voiceId?: string;
    dropPoints: number;
    totalDrops: number;
    channelPoints: number;
    dropImage?: string;
    country?: string; // ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "JP")
    powerups?: Record<PowerupType, number>; // Inventory of powerups owned
}

// Helper to get or create a user in the database
function getOrCreateUser(username: string): number {
    // Try to get existing user
    let user = queries.getUserByUsername.get(username);
    if (!user) {
        // Create new user
        queries.createUser.run(username);
        user = queries.getUserByUsername.get(username);
    }
    if (!user) throw new Error(`Failed to create user: ${username}`);

    // Ensure points record exists
    queries.createPoints.run(user.id);

    return user.id;
}

// Helper to read all user data (for leaderboard etc)
export function getAllUserData(): Record<string, UserData> {
    const leaderboard = queries.getLeaderboard.all();
    const result: Record<string, UserData> = {};

    for (const row of leaderboard) {
        result[row.username] = {
            dropPoints: row.drop_points,
            totalDrops: row.total_drops,
            channelPoints: row.channel_points,
            dropImage: row.drop_image || undefined,
            country: row.country || undefined,
        };
    }

    return result;
}

// Helper to get a single user's data
export function getUserData(username: string): UserData {
    const user = queries.getUserByUsername.get(username);
    if (!user) {
        return { dropPoints: 0, totalDrops: 0, channelPoints: 0 };
    }

    const points = queries.getPoints.get(user.id);
    const powerupsRows = queries.getPowerups.all(user.id);

    const powerups: Record<PowerupType, number> = {} as Record<PowerupType, number>;
    for (const row of powerupsRows) {
        powerups[row.powerup_type as PowerupType] = row.quantity;
    }

    return {
        voiceId: user.voice_id || undefined,
        dropPoints: points?.drop_points || 0,
        totalDrops: points?.total_drops || 0,
        channelPoints: points?.channel_points || 0,
        dropImage: user.drop_image || undefined,
        country: user.country || undefined,
        powerups: Object.keys(powerups).length > 0 ? powerups : undefined,
    };
}

// Helper to save user data
export function saveUserData(username: string, data: Partial<UserData>): void {
    const userId = getOrCreateUser(username);

    // Update user profile fields
    if (data.voiceId !== undefined || data.dropImage !== undefined || data.country !== undefined) {
        const user = queries.getUserByUsername.get(username);
        queries.updateUser.run(
            data.voiceId ?? user?.voice_id ?? null,
            data.dropImage ?? user?.drop_image ?? null,
            data.country ?? user?.country ?? null,
            username
        );
    }

    // Update points if provided
    if (data.channelPoints !== undefined) {
        queries.setChannelPoints.run(data.channelPoints, userId);
    }
}

// Helper to add drop points to a user
export function addDropPoints(username: string, points: number, isPerfect: boolean = false, powerupUsed?: PowerupType): number {
    const userId = getOrCreateUser(username);
    queries.addDropPoints.run(points, userId);

    // Record drop history for analytics
    queries.recordDrop.run(userId, points, isPerfect ? 1 : 0, powerupUsed || null);

    const updatedPoints = queries.getPoints.get(userId);
    return updatedPoints?.drop_points || 0;
}

// Helper to get a user's preferred voice
function getUserVoice(username: string): string | undefined {
    const user = queries.getUserByUsername.get(username);
    return user?.voice_id || undefined;
}

// Helper to save user voice preference
function saveUserVoice(username: string, voiceId: string): void {
    getOrCreateUser(username);
    const user = queries.getUserByUsername.get(username);
    if (user) {
        queries.updateUser.run(voiceId, user.drop_image, user.country, username);
    }
}

// Channel points helpers
export function getChannelPoints(username: string): number {
    const user = queries.getUserByUsername.get(username);
    if (!user) return 0;
    const points = queries.getPoints.get(user.id);
    return points?.channel_points || 0;
}

export function addChannelPoints(username: string, points: number): number {
    const userId = getOrCreateUser(username);
    queries.addChannelPoints.run(points, userId);
    const updatedPoints = queries.getPoints.get(userId);
    return updatedPoints?.channel_points || 0;
}

export function spendChannelPoints(username: string, points: number): { success: boolean; balance: number } {
    const userId = getOrCreateUser(username);
    const currentPoints = queries.getPoints.get(userId);
    const current = currentPoints?.channel_points || 0;

    if (current < points) {
        return { success: false, balance: current };
    }

    queries.setChannelPoints.run(current - points, userId);
    return { success: true, balance: current - points };
}

// Powerup inventory helpers
export function getUserPowerups(username: string): Record<PowerupType, number> {
    const user = queries.getUserByUsername.get(username);
    if (!user) return {} as Record<PowerupType, number>;

    const powerupsRows = queries.getPowerups.all(user.id);
    const powerups: Record<PowerupType, number> = {} as Record<PowerupType, number>;

    for (const row of powerupsRows) {
        powerups[row.powerup_type as PowerupType] = row.quantity;
    }

    return powerups;
}

export function addPowerup(username: string, powerupId: PowerupType, quantity: number = 1): Record<PowerupType, number> {
    const userId = getOrCreateUser(username);
    queries.upsertPowerup.run(userId, powerupId, quantity);
    return getUserPowerups(username);
}

export function usePowerup(username: string, powerupId: PowerupType): { success: boolean; remaining: number } {
    const user = queries.getUserByUsername.get(username);
    if (!user) return { success: false, remaining: 0 };

    const powerups = getUserPowerups(username);
    const current = powerups[powerupId] || 0;

    if (current <= 0) {
        return { success: false, remaining: 0 };
    }

    queries.usePowerup.run(user.id, powerupId);
    return { success: true, remaining: current - 1 };
}

export function buyPowerup(username: string, powerupId: PowerupType): { success: boolean; error?: string; balance?: number; quantity?: number } {
    const powerup = POWERUPS[powerupId];
    if (!powerup) {
        return { success: false, error: 'Unknown powerup' };
    }

    const userId = getOrCreateUser(username);

    // Admins get powerups for free
    if (isAdmin(username)) {
        // Still record the purchase for audit trail (with cost=0)
        queries.recordPurchase.run(userId, powerupId, 0);
        const powerups = addPowerup(username, powerupId, 1);
        const points = queries.getPoints.get(userId);
        return { success: true, balance: points?.channel_points || 0, quantity: powerups[powerupId] };
    }

    const spendResult = spendChannelPoints(username, powerup.cost);
    if (!spendResult.success) {
        return { success: false, error: `Not enough points. Need ${powerup.cost}, have ${spendResult.balance}`, balance: spendResult.balance };
    }

    // Record the purchase
    queries.recordPurchase.run(userId, powerupId, powerup.cost);

    const powerups = addPowerup(username, powerupId, 1);
    return { success: true, balance: spendResult.balance, quantity: powerups[powerupId] };
}

type Command = {
    cooldown: number;
    alternatives?: string[];
    description: string;
    arguments: string;
    handler: (ctx: CommandHandler) => void | Promise<void>;
};

const commands: Record<string, Command> = {
    "!socials": {
        cooldown: 30000,
        description: "Get links to all social media accounts",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Follow @codingbutter everywhere! Twitter: x.com/codingbutter | YouTube: youtube.com/@codingbutter | GitHub: github.com/codingbutter | TikTok: tiktok.com/@codingbutter | Instagram: instagram.com/codingbutter`);
        }
    },
    "!twitter": {
        cooldown: 30000,
        alternatives: ["!x"],
        description: "Get the Twitter/X profile link",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Follow on Twitter/X: https://x.com/codingbutter`);
        }
    },
    "!youtube": {
        cooldown: 30000,
        alternatives: ["!yt"],
        description: "Get the YouTube channel link",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Subscribe on YouTube: https://youtube.com/@codingbutter`);
        }
    },
    "!github": {
        cooldown: 30000,
        alternatives: ["!gh"],
        description: "Get the GitHub profile link",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Check out GitHub: https://github.com/codingbutter`);
        }
    },
    "!tiktok": {
        cooldown: 30000,
        description: "Get the TikTok profile link",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Follow on TikTok: https://tiktok.com/@codingbutter`);
        }
    },
    "!instagram": {
        cooldown: 30000,
        alternatives: ["!ig", "!insta"],
        description: "Get the Instagram profile link",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} Follow on Instagram: https://instagram.com/codingbutter`);
        }
    },
    "!discord": {
        cooldown: 60000,
        description: "Get the link to our Discord server",
        arguments: "",
        handler:({message,sendChat}: CommandHandler) => {
        sendChat(`@${message.user.username} Join our Discord server: https://discord.gg/gqE6qxGx`);
        }
    },
    "!hello": {
        cooldown: 60000,
        description: "Greet the user",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`Hello, @${message.user.username}! 👋`);
        }
    },
    "!help": {
        cooldown: 5000,
        alternatives: ["!commands"],
        description: "Get the link to all available commands",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} View all available commands at: ${PUBLIC_URL}/commands`);
        }
    },
    "!voicelist": {
        cooldown: 5000,
        description: "Get the link to available TTS voices",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} View all available voices at: ${PUBLIC_URL}/voicelist`);
        }
    },
    "!say": {
        cooldown:5000, // 5 seconds
        description: "Text-to-speech message (costs points, remembers your voice)",
        arguments: "[id=VOICE_ID] <message>",
        handler: async ({message, sendChat, queueTTS}: CommandHandler) => {
            if (!queueTTS) {
                console.error('TTS not available');
                return;
            }

            const username = message.user.username;
            const userIsAdmin = isAdmin(username);

            // Check if user has enough points (admins skip this)
            const cost = parseInt(process.env.POINTS_COST_SAY || '500');
            let spendResult = { success: true, balance: 0 };

            if (!userIsAdmin) {
                spendResult = spendChannelPoints(username, cost);
                if (!spendResult.success) {
                    sendChat(`@${username} You need ${cost} points to use !say (you have ${spendResult.balance}). Earn points by watching, chatting and earning them from the drop game !drop`);
                    return;
                }
            }

            // Parse the message content (remove the !say prefix)
            const content = message.content.replace(/^!say\s*/i, '').trim();

            if (!content) {
                // Refund points if no message (only if not admin)
                if (!userIsAdmin) {
                    addChannelPoints(username, cost);
                }
                sendChat(`@${username} Please provide a message to speak!`);
                return;
            }

            // Check for voice ID pattern: id=VOICE_ID message
            const voiceMatch = content.match(/^id=(\S+)\s+(.+)$/i);
            let voiceId: string | undefined;
            let text: string;

            if (voiceMatch && voiceMatch[1] && voiceMatch[2]) {
                // User specified a voice ID - save it for future use
                voiceId = voiceMatch[1];
                text = voiceMatch[2];
                await saveUserVoice(username, voiceId);
            } else {
                // No voice ID specified - check for saved preference
                text = content;
                voiceId = await getUserVoice(username);
            }

            // Strip emotes [emote:ID:NAME] and emojis from text
            text = text
                .replace(/\[emote:\d+:[^\]]+\]/g, '') // Remove [emote:ID:NAME] format
                .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/gu, '') // Remove emojis
                .replace(/\s+/g, ' ') // Collapse multiple spaces
                .trim();

            if (!text) {
                if (!userIsAdmin) {
                    addChannelPoints(username, cost);
                }
                sendChat(`@${username} Please provide a message with actual text to speak (emotes/emojis are ignored)!`);
                return;
            }

            const success = await queueTTS(text, voiceId);
            if (success) {
                if (userIsAdmin) {
                    sendChat(`@${username} Your message is being spoken! (admin - free)`);
                } else {
                    sendChat(`@${username} Your message is being spoken! (-${cost} points, balance: ${spendResult.balance})`);
                }
            } else {
                // Refund points if TTS failed (only if not admin)
                if (!userIsAdmin) {
                    addChannelPoints(username, cost);
                }
                sendChat(`@${username} Sorry, TTS failed. Points refunded.`);
            }
        }
    },
    "!points": {
        cooldown: 5000,
        alternatives: ["!balance", "!bal"],
        description: "Check your total points balance",
        arguments: "",
        handler: async ({message, sendChat}: CommandHandler) => {
            const userData = getUserData(message.user.username);
            const totalPoints = (userData.channelPoints || 0) + (userData.dropPoints || 0);
            sendChat(`@${message.user.username} You have ${totalPoints} total points! (${userData.channelPoints || 0} channel + ${userData.dropPoints || 0} drop)`);
        }
    },
    "!drop": {
        cooldown: 10000, // 10 seconds between drops
        description: "Drop game! Land on the platform to earn points. Use -rules, -powerups, -buy, -mine for more options",
        arguments: "[emote] | -rules | -powerups | -buy <powerup> | -mine",
        handler: async ({ message, sendChat, queueDrop }: CommandHandler) => {
            const content = message.content.replace(/^!drop\s*/i, '').trim();
            const username = message.user.username;
            // Handle subcommands
            if (content.startsWith('-rules') || content === 'rules') {
                sendChat(`@${username} Learn how to play the Drop Game: ${PUBLIC_URL}/drop-game-rules`);
                return;
            }

            if (content.startsWith('-powerups') || content === 'powerups') {
                const powerupList = Object.values(POWERUPS)
                    .map(p => `${p.emoji} ${p.name} (${p.cost}pts)`)
                    .join(' | ');
                sendChat(`@${username} Powerups: ${powerupList} - Use !drop -buy <name> to purchase!`);
                return;
            }

            if (content.startsWith('-buy ') || content.startsWith('buy ')) {
                const powerupName = content.replace(/^-?buy\s+/i, '').toLowerCase().trim();
                const powerupId = Object.keys(POWERUPS).find(
                    k => k === powerupName || POWERUPS[k as PowerupType].name.toLowerCase() === powerupName
                ) as PowerupType | undefined;

                if (!powerupId) {
                    sendChat(`@${username} Unknown powerup "${powerupName}". Use !drop -powerups to see available powerups.`);
                    return;
                }

                const result = buyPowerup(username, powerupId);
                if (result.success) {
                    const powerup = POWERUPS[powerupId];
                    sendChat(`@${username} ${powerup.emoji} Purchased ${powerup.name}! You now have ${result.quantity}. Balance: ${result.balance} pts`);
                } else {
                    sendChat(`@${username} ${result.error}`);
                }
                return;
            }

            if (content.startsWith('-mine') || content === 'mine') {
                const userPowerups = getUserPowerups(username);
                const owned = Object.entries(userPowerups)
                    .filter(([_, count]) => count > 0)
                    .map(([id, count]) => {
                        const p = POWERUPS[id as PowerupType];
                        return `${p.emoji}${p.name}:${count}`;
                    });

                if (owned.length === 0) {
                    sendChat(`@${username} You don't have any powerups. Use !drop -buy <name> to purchase!`);
                } else {
                    sendChat(`@${username} Your powerups: ${owned.join(' | ')}`);
                }
                return;
            }

            // Regular drop command
            if (!queueDrop) {
                console.error('Drop game not available');
                return;
            }

            // Check for emote pattern: [emote:ID:name]
            let emoteUrl: string | undefined;
            const emoteMatch = content.match(/\[emote:(\d+):([^\]]+)\]/);
            if (emoteMatch && emoteMatch[1]) {
                emoteUrl = `https://files.kick.com/emotes/${emoteMatch[1]}/fullsize`;
            }

            // Get user's custom drop image if set, otherwise use their Kick avatar
            const userData = getUserData(username);
            const avatarUrl = userData.dropImage || message.user.avatar_url;

            // Queue the drop with user's custom image or avatar
            const dropQueued = queueDrop(
                username,
                avatarUrl,
                emoteUrl
            );

            if (!dropQueued) {
                sendChat(`@${username} You already have an active dropper! Wait for it to land first.`);
                return;
            }

            console.log(`Drop queued for ${username}${emoteUrl ? ' with emote' : ''}${userData.dropImage ? ' (custom image)' : ''}`);
        }
    },
    "!dropstats": {
        cooldown: 5000,
        description: "Check your drop game stats",
        arguments: "",
        handler: async ({ message, sendChat }: CommandHandler) => {
            const userData = getUserData(message.user.username);
            sendChat(`@${message.user.username} Drop Stats - Points: ${userData.dropPoints} | Total Drops: ${userData.totalDrops}`);
        }
    },
    "!droptop": {
        cooldown: 10000,
        description: "See the top drop game players",
        arguments: "",
        handler: async ({ sendChat }: CommandHandler) => {
            const allData = await getAllUserData();
            const sorted = Object.entries(allData)
                .filter(([_, data]) => data.dropPoints > 0)
                .sort((a, b) => b[1].dropPoints - a[1].dropPoints)
                .slice(0, 5);

            if (sorted.length === 0) {
                sendChat("No drop scores yet! Type !drop to play!");
                return;
            }

            const leaderboard = sorted
                .map(([name, data], i) => `${i + 1}. ${name}: ${data.dropPoints}pts`)
                .join(' | ');
            sendChat(`Drop Leaderboard: ${leaderboard}`);
        }
    },
    "!profile": {
        cooldown: 30000,
        description: "Get the link to your profile page to view stats and customize settings",
        arguments: "",
        handler: async ({ message, sendChat }: CommandHandler) => {
            sendChat(`@${message.user.username} Visit ${PUBLIC_URL}/profile/${message.user.username} to view your stats and customize your settings!`);
        }
    },
    "!stats": {
        cooldown: 5000,
        alternatives: ["!mystats"],
        description: "View your public stats",
        arguments: "[username]",
        handler: async ({ message, sendChat }: CommandHandler) => {
            const content = message.content.replace(/^!(stats|mystats)\s*/i, '').trim();
            const targetUser = content || message.user.username;
            const userData = getUserData(targetUser);
            const totalPoints = (userData.channelPoints || 0) + (userData.dropPoints || 0);
            sendChat(`@${targetUser} Stats - Total: ${totalPoints} pts | Channel: ${userData.channelPoints || 0} | Drop: ${userData.dropPoints || 0} | Drops: ${userData.totalDrops || 0}`);
        }
    },
    // Powerup activation commands
    "!tnt": {
        cooldown: 1000,
        description: "Activate TNT powerup during your drop to push other players away",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'tnt');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'tnt');
                }
                sendChat(`@${username} 💣 TNT ACTIVATED! Boom! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have any TNT! Buy with !drop -buy tnt`);
            }
        }
    },
    "!powerdrop": {
        cooldown: 1000,
        description: "Activate Power Drop to drop straight down at high speed",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'powerdrop');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'powerdrop');
                }
                sendChat(`@${username} ⚡ POWER DROP! Dropping fast! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have Power Drop! Buy with !drop -buy powerdrop`);
            }
        }
    },
    "!shield": {
        cooldown: 1000,
        description: "Activate Shield to protect from other players' powerups",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'shield');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'shield');
                }
                sendChat(`@${username} 🛡️ SHIELD ACTIVATED! Protected! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have Shield! Buy with !drop -buy shield`);
            }
        }
    },
    "!magnet": {
        cooldown: 1000,
        description: "Activate Magnet to pull towards the platform center",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'magnet');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'magnet');
                }
                sendChat(`@${username} 🧲 MAGNET ACTIVATED! Pulling towards center! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have Magnet! Buy with !drop -buy magnet`);
            }
        }
    },
    "!ghost": {
        cooldown: 1000,
        description: "Activate Ghost to pass through walls",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'ghost');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'ghost');
                }
                sendChat(`@${username} 👻 GHOST MODE! Passing through walls! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have Ghost! Buy with !drop -buy ghost`);
            }
        }
    },
    "!boost": {
        cooldown: 1000,
        description: "Activate Speed Boost to double your horizontal speed",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup, isPlayerDropping }: CommandHandler) => {
            const username = message.user.username;
            if (!isPlayerDropping || !isPlayerDropping(username)) {
                return; // Silently ignore if not dropping
            }
            const result = usePowerup(username, 'boost');
            if (result.success) {
                if (queuePowerup) {
                    queuePowerup(username, 'boost');
                }
                sendChat(`@${username} 🚀 SPEED BOOST! Going faster! (${result.remaining} remaining)`);
            } else {
                sendChat(`@${username} You don't have Speed Boost! Buy with !drop -buy boost`);
            }
        }
    }
};

export default commands;
