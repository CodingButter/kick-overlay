type Message = {
    content: string;
    user: {
        username: string;
        avatar_url: string;
    }
}
type ChatSend = (message: string) => void;
type QueueTTS = (text: string, voiceId?: string) => Promise<boolean>;
type QueueDrop = (username: string, avatarUrl: string, emoteUrl?: string) => void;

interface CommandHandler {
    message: Message;
    sendChat: ChatSend;
    queueTTS?: QueueTTS;
    queueDrop?: QueueDrop;
}

// User data file path (replaces user_voices.json)
const USER_DATA_FILE = './user_data.json';

interface UserData {
    voiceId?: string;
    dropPoints: number;
    totalDrops: number;
    channelPoints: number;
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

            // Check if user has enough points
            const cost = parseInt(process.env.POINTS_COST_SAY || '500');
            const spendResult = await spendChannelPoints(message.user.username, cost);
            if (!spendResult.success) {
                sendChat(`@${message.user.username} You need ${cost} points to use !say (you have ${spendResult.balance}). Earn points by watching and chatting!`);
                return;
            }

            // Parse the message content (remove the !say prefix)
            const content = message.content.replace(/^!say\s*/i, '').trim();

            if (!content) {
                // Refund points if no message
                await addChannelPoints(message.user.username, cost);
                sendChat(`@${message.user.username} Please provide a message to speak!`);
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
                await saveUserVoice(message.user.username, voiceId);
            } else {
                // No voice ID specified - check for saved preference
                text = content;
                voiceId = await getUserVoice(message.user.username);
            }

            const success = await queueTTS(text, voiceId);
            if (success) {
                sendChat(`@${message.user.username} Your message is being spoken! (-${cost} points, balance: ${spendResult.balance})`);
            } else {
                // Refund points if TTS failed
                await addChannelPoints(message.user.username, cost);
                sendChat(`@${message.user.username} Sorry, TTS failed. Points refunded.`);
            }
        }
    },
    "!points": {
        cooldown: 5000,
        alternatives: ["!balance", "!bal"],
        description: "Check your channel points balance",
        arguments: "",
        handler: async ({message, sendChat}: CommandHandler) => {
            const points = await getChannelPoints(message.user.username);
            sendChat(`@${message.user.username} You have ${points} channel points!`);
        }
    },
    "!drop": {
        cooldown: 10000, // 10 seconds between drops
        description: "Drop game! Land on the platform to earn points",
        arguments: "[emote]",
        handler: async ({ message, queueDrop }: CommandHandler) => {
            if (!queueDrop) {
                console.error('Drop game not available');
                return;
            }

            const content = message.content.replace(/^!drop\s*/i, '').trim();

            // Check for emote pattern: [emote:ID:name]
            let emoteUrl: string | undefined;
            const emoteMatch = content.match(/\[emote:(\d+):([^\]]+)\]/);
            if (emoteMatch && emoteMatch[1]) {
                emoteUrl = `https://files.kick.com/emotes/${emoteMatch[1]}/fullsize`;
            }

            // Queue the drop with user's avatar or emote
            queueDrop(
                message.user.username,
                message.user.avatar_url,
                emoteUrl
            );

            console.log(`Drop queued for ${message.user.username}${emoteUrl ? ' with emote' : ''}`);
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
    }
};

export default commands;
