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

interface CommandHandler {
    message: Message;
    sendChat: ChatSend;
    queueTTS?: QueueTTS;
    queueDrop?: QueueDrop;
    queuePowerup?: QueuePowerup;
}

// Admin users exempt from cooldowns and point costs
export const ADMIN_USERS = ['codingbutter'];

export function isAdmin(username: string): boolean {
    return ADMIN_USERS.includes(username.toLowerCase());
}

// User data file path (replaces user_voices.json)
const USER_DATA_FILE = './user_data.json';

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

// Default powerup definitions (can be overridden by dropgame.config.json)
const DEFAULT_POWERUPS: Record<PowerupType, Powerup> = {
    tnt: {
        id: 'tnt',
        name: 'TNT',
        description: 'Creates an explosion that pushes all other players away from you',
        cost: 500,
        emoji: '💣',
        effect: 'Pushes nearby droppers away with explosive force'
    },
    powerdrop: {
        id: 'powerdrop',
        name: 'Power Drop',
        description: 'Stops horizontal movement and drops straight down at high speed',
        cost: 300,
        emoji: '⚡',
        effect: 'Instantly drops straight down with 3x gravity'
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        description: 'Protects you from being pushed by other players\' powerups',
        cost: 400,
        emoji: '🛡️',
        effect: 'Immune to TNT and other push effects for this drop'
    },
    magnet: {
        id: 'magnet',
        name: 'Magnet',
        description: 'Pulls your dropper towards the center of the platform',
        cost: 600,
        emoji: '🧲',
        effect: 'Attracts towards platform center when activated'
    },
    ghost: {
        id: 'ghost',
        name: 'Ghost',
        description: 'Pass through walls and ignore explosions/collisions',
        cost: 750,
        emoji: '👻',
        effect: 'Immune to collisions/explosions and wrap around screen for 5 seconds'
    },
    boost: {
        id: 'boost',
        name: 'Speed Boost',
        description: 'Doubles your horizontal speed temporarily',
        cost: 250,
        emoji: '🚀',
        effect: 'Doubles horizontal velocity for 3 seconds'
    }
};

// Load config and merge with defaults
let loadedPowerups: Record<PowerupType, Powerup> | null = null;

async function loadPowerupsConfig(): Promise<Record<PowerupType, Powerup>> {
    if (loadedPowerups) return loadedPowerups;
    try {
        const file = Bun.file('./dropgame.config.json');
        if (await file.exists()) {
            const config = await file.json();
            if (config.powerups) {
                // Merge config costs/descriptions with defaults
                loadedPowerups = { ...DEFAULT_POWERUPS };
                for (const [id, data] of Object.entries(config.powerups)) {
                    if (loadedPowerups[id as PowerupType]) {
                        loadedPowerups[id as PowerupType] = {
                            ...loadedPowerups[id as PowerupType],
                            cost: (data as any).cost ?? loadedPowerups[id as PowerupType].cost,
                            description: (data as any).description ?? loadedPowerups[id as PowerupType].description,
                        };
                    }
                }
                return loadedPowerups;
            }
        }
    } catch (error) {
        console.error('Error loading powerups config:', error);
    }
    loadedPowerups = DEFAULT_POWERUPS;
    return loadedPowerups;
}

// Initialize on module load
loadPowerupsConfig();

// Export getter function for dynamic access
export async function getPowerups(): Promise<Record<PowerupType, Powerup>> {
    return loadPowerupsConfig();
}

// Export sync version for backwards compatibility (uses cached value)
export const POWERUPS: Record<PowerupType, Powerup> = DEFAULT_POWERUPS;

// Update POWERUPS object after config loads (for sync access)
loadPowerupsConfig().then(loaded => {
    Object.assign(POWERUPS, loaded);
});

interface UserData {
    voiceId?: string;
    dropPoints: number;
    totalDrops: number;
    channelPoints: number;
    profileToken?: string;
    dropImage?: string;
    country?: string; // ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "JP")
    powerups?: Record<PowerupType, number>; // Inventory of powerups owned
}

// Helper to read all user data
export async function getAllUserData(): Promise<Record<string, UserData>> {
    try {
        const file = Bun.file(USER_DATA_FILE);
        if (await file.exists()) {
            return await file.json();
        }
    } catch (error) {
        console.error('Error reading user data:', error);
    }
    return {};
}

// Helper to get a single user's data
export async function getUserData(username: string): Promise<UserData> {
    const allData = await getAllUserData();
    return allData[username] || { dropPoints: 0, totalDrops: 0, channelPoints: 0 };
}

// Helper to save user data
export async function saveUserData(username: string, data: Partial<UserData>): Promise<void> {
    try {
        const allData = await getAllUserData();
        allData[username] = { ...await getUserData(username), ...data };
        await Bun.write(USER_DATA_FILE, JSON.stringify(allData, null, 2));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Helper to add points to a user
export async function addDropPoints(username: string, points: number): Promise<number> {
    const userData = await getUserData(username);
    const newPoints = userData.dropPoints + points;
    await saveUserData(username, {
        dropPoints: newPoints,
        totalDrops: userData.totalDrops + 1
    });
    return newPoints;
}

// Helper to get a user's preferred voice (backwards compatible)
async function getUserVoice(username: string): Promise<string | undefined> {
    const userData = await getUserData(username);
    return userData.voiceId;
}

// Helper to save user voice preference
async function saveUserVoice(username: string, voiceId: string): Promise<void> {
    await saveUserData(username, { voiceId });
}

// Profile token helpers
function generateProfileToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

export async function getOrCreateProfileToken(username: string): Promise<string> {
    const userData = await getUserData(username);
    if (userData.profileToken) {
        return userData.profileToken;
    }
    const token = generateProfileToken();
    await saveUserData(username, { profileToken: token });
    return token;
}

export async function validateProfileToken(username: string, token: string): Promise<boolean> {
    const userData = await getUserData(username);
    return userData.profileToken === token;
}

// Channel points helpers
export async function getChannelPoints(username: string): Promise<number> {
    const userData = await getUserData(username);
    return userData.channelPoints || 0;
}

export async function addChannelPoints(username: string, points: number): Promise<number> {
    const userData = await getUserData(username);
    const newPoints = (userData.channelPoints || 0) + points;
    await saveUserData(username, { channelPoints: newPoints });
    return newPoints;
}

export async function spendChannelPoints(username: string, points: number): Promise<{ success: boolean; balance: number }> {
    const userData = await getUserData(username);
    const currentPoints = userData.channelPoints || 0;
    if (currentPoints < points) {
        return { success: false, balance: currentPoints };
    }
    const newPoints = currentPoints - points;
    await saveUserData(username, { channelPoints: newPoints });
    return { success: true, balance: newPoints };
}

// Powerup inventory helpers
export async function getUserPowerups(username: string): Promise<Record<PowerupType, number>> {
    const userData = await getUserData(username);
    return userData.powerups || {} as Record<PowerupType, number>;
}

export async function addPowerup(username: string, powerupId: PowerupType, quantity: number = 1): Promise<Record<PowerupType, number>> {
    const userData = await getUserData(username);
    const powerups = userData.powerups || {} as Record<PowerupType, number>;
    powerups[powerupId] = (powerups[powerupId] || 0) + quantity;
    await saveUserData(username, { powerups });
    return powerups;
}

export async function usePowerup(username: string, powerupId: PowerupType): Promise<{ success: boolean; remaining: number }> {
    const userData = await getUserData(username);
    const powerups = userData.powerups || {} as Record<PowerupType, number>;
    const current = powerups[powerupId] || 0;
    if (current <= 0) {
        return { success: false, remaining: 0 };
    }
    powerups[powerupId] = current - 1;
    await saveUserData(username, { powerups });
    return { success: true, remaining: powerups[powerupId] };
}

export async function buyPowerup(username: string, powerupId: PowerupType): Promise<{ success: boolean; error?: string; balance?: number; quantity?: number }> {
    const powerup = POWERUPS[powerupId];
    if (!powerup) {
        return { success: false, error: 'Unknown powerup' };
    }

    // Admins get powerups for free
    if (isAdmin(username)) {
        const powerups = await addPowerup(username, powerupId, 1);
        const userData = await getUserData(username);
        return { success: true, balance: userData.channelPoints, quantity: powerups[powerupId] };
    }

    const spendResult = await spendChannelPoints(username, powerup.cost);
    if (!spendResult.success) {
        return { success: false, error: `Not enough points. Need ${powerup.cost}, have ${spendResult.balance}`, balance: spendResult.balance };
    }

    const powerups = await addPowerup(username, powerupId, 1);
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
            sendChat(`@${message.user.username} View all available commands at: https://kickhook.plexflex.tv/commands`);
        }
    },
    "!voicelist": {
        cooldown: 5000,
        description: "Get the link to available TTS voices",
        arguments: "",
        handler: ({message, sendChat}: CommandHandler) => {
            sendChat(`@${message.user.username} View all available voices at: https://kickhook.plexflex.tv/voicelist`);
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
                spendResult = await spendChannelPoints(username, cost);
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
                    await addChannelPoints(username, cost);
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
                    await addChannelPoints(username, cost);
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
                    await addChannelPoints(username, cost);
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
            const userData = await getUserData(message.user.username);
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
            const baseUrl = process.env.WEBHOOK_URL?.replace('/webhook', '') || 'https://kickhook.plexflex.tv';

            // Handle subcommands
            if (content.startsWith('-rules') || content === 'rules') {
                sendChat(`@${username} Learn how to play the Drop Game: ${baseUrl}/drop-game-rules`);
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

                const result = await buyPowerup(username, powerupId);
                if (result.success) {
                    const powerup = POWERUPS[powerupId];
                    sendChat(`@${username} ${powerup.emoji} Purchased ${powerup.name}! You now have ${result.quantity}. Balance: ${result.balance} pts`);
                } else {
                    sendChat(`@${username} ${result.error}`);
                }
                return;
            }

            if (content.startsWith('-mine') || content === 'mine') {
                const userPowerups = await getUserPowerups(username);
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
            const userData = await getUserData(username);
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
            const userData = await getUserData(message.user.username);
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
            const baseUrl = process.env.WEBHOOK_URL?.replace('/webhook', '') || 'https://kickhook.plexflex.tv';
            sendChat(`@${message.user.username} Visit ${baseUrl}/profile/${message.user.username} to view your stats and customize your settings!`);
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
            const userData = await getUserData(targetUser);
            const totalPoints = (userData.channelPoints || 0) + (userData.dropPoints || 0);
            sendChat(`@${targetUser} Stats - Total: ${totalPoints} pts | Channel: ${userData.channelPoints || 0} | Drop: ${userData.dropPoints || 0} | Drops: ${userData.totalDrops || 0}`);
        }
    },
    // Powerup activation commands
    "!tnt": {
        cooldown: 1000,
        description: "Activate TNT powerup during your drop to push other players away",
        arguments: "",
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'tnt');
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
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'powerdrop');
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
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'shield');
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
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'magnet');
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
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'ghost');
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
        handler: async ({ message, sendChat, queuePowerup }: CommandHandler) => {
            const username = message.user.username;
            const result = await usePowerup(username, 'boost');
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
