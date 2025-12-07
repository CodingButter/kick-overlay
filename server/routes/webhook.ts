import { verifyWebhookSignature, sendChatMessage, goals, saveGoals } from '../services/kick-api';
import { detectStreamFromChat, trackChatter, awardChatPoints, setStreamStatus } from '../services/stream';
import { addChatMessage, processAIResponse, getChatMessages } from '../services/ai-chat';
import { queueTTS } from '../services/tts';
import {
  queueDrop,
  queuePowerup,
  isPlayerDropping,
  addToWaitingQueue,
  removeFromWaitingQueue,
  isPlayerQueued,
  startDrop,
  clearWaitingQueue,
  getWaitingQueueSize,
} from '../services/dropgame';
import { handleVerifyCommand } from '../services/verification';
import { setLastEvent } from './api';
import commands, { addChannelPoints, isAdmin } from '../commands';

// Monetization point rewards (configurable via env)
const POINTS_PER_KICK = parseInt(process.env.POINTS_PER_KICK || '100'); // 1 kick = 100 points
const POINTS_PER_SUB = parseInt(process.env.POINTS_PER_SUB || '2000'); // New sub = 2000 points
const POINTS_PER_GIFT = parseInt(process.env.POINTS_PER_GIFT || '1500'); // Per gifted sub = 1500 points
const POINTS_PER_RENEWAL = parseInt(process.env.POINTS_PER_RENEWAL || '1000'); // Renewal = 1000 points

// Command cooldown tracking
const commandCooldowns = new Map<string, number>();

// Create webhook route
export function createWebhookRoute() {
  return {
    '/webhook': {
      POST: async (req: Request) => {
        const messageId = req.headers.get('Kick-Event-Message-Id') || '';
        const timestamp = req.headers.get('Kick-Event-Message-Timestamp') || '';
        const signature = req.headers.get('Kick-Event-Signature') || '';
        const eventType = req.headers.get('Kick-Event-Type') || '';
        const body = await req.text();

        console.log(`Webhook received: ${eventType}`);
        console.log('Headers:', { messageId, timestamp, eventType });

        // Verify signature
        if (signature) {
          const isValid = await verifyWebhookSignature(messageId, timestamp, body, signature);
          if (!isValid) {
            console.warn('Invalid webhook signature');
          }
        }

        // Parse and store the event
        try {
          const event = JSON.parse(body);
          console.log('Event payload:', JSON.stringify(event, null, 2));

          if (eventType === 'chat.message.sent') {
            // Auto-detect stream is live
            detectStreamFromChat();

            addChatMessage({
              id: messageId,
              timestamp: timestamp,
              ...event,
            });

            // Award chat points and track active chatters
            const chatterUsername = event.sender?.username;
            if (chatterUsername) {
              awardChatPoints(chatterUsername);
              trackChatter(chatterUsername);
            }

            // Check for commands
            const content = event.content?.trim() || '';
            const commandKey = content.split(' ')[0].toLowerCase();

            // Handle !verify command
            if (commandKey === '!verify') {
              const verifyCode = content.split(' ')[1]?.toUpperCase();
              const username = event.sender?.username;
              if (verifyCode && username) {
                handleVerifyCommand(username, verifyCode);
              }
            }

            // Find command by key or alternatives
            let command = commands[commandKey];
            let matchedKey = commandKey;
            if (!command) {
              for (const [key, cmd] of Object.entries(commands)) {
                if (cmd.alternatives?.includes(commandKey)) {
                  command = cmd;
                  matchedKey = key;
                  break;
                }
              }
            }

            if (command) {
              const username = event.sender?.username || 'Unknown';
              const cooldownKey = `${commandKey}:${username}`;
              const now = Date.now();
              const lastUsed = commandCooldowns.get(cooldownKey);
              const userIsAdmin = isAdmin(username);

              if (!userIsAdmin && lastUsed && command.cooldown && (now - lastUsed) < command.cooldown) {
                const remainingSeconds = Math.ceil((command.cooldown - (now - lastUsed)) / 1000);
                console.log(`Command ${matchedKey} on cooldown for ${username} (${remainingSeconds}s remaining)`);
              } else {
                commandCooldowns.set(cooldownKey, now);
                console.log(`Executing command: ${matchedKey}${commandKey !== matchedKey ? ` (via ${commandKey})` : ''}${userIsAdmin ? ' (admin)' : ''}`);
                command.handler({
                  message: {
                    content: content,
                    user: {
                      username: username,
                      avatar_url: event.sender?.profile_picture || '',
                    },
                  },
                  sendChat: sendChatMessage,
                  queueTTS: queueTTS,
                  queueDrop: queueDrop,
                  queuePowerup: queuePowerup,
                  isPlayerDropping: isPlayerDropping,
                  addToWaitingQueue: addToWaitingQueue,
                  removeFromWaitingQueue: removeFromWaitingQueue,
                  isPlayerQueued: isPlayerQueued,
                  startDrop: startDrop,
                  clearWaitingQueue: clearWaitingQueue,
                  getWaitingQueueSize: getWaitingQueueSize,
                });
              }
            } else if (!commandKey.startsWith('!') && !commandKey.startsWith('/')) {
              // Not a command - process through AI
              const username = event.sender?.username || 'Unknown';
              const avatarUrl = event.sender?.profile_picture;

              processAIResponse(username, content, avatarUrl).then(response => {
                if (response) {
                  sendChatMessage(response);
                }
              }).catch(err => {
                console.error('AI response error:', err);
              });
            }
          } else if (eventType === 'channel.followed') {
            goals.followers.current++;
            const followerName = event.follower?.username || event.user?.username || 'Someone';
            setLastEvent({
              type: 'follow',
              username: followerName,
              timestamp: timestamp,
            });
            console.log(`New follower: ${followerName}! Total: ${goals.followers.current}`);
            saveGoals();
          } else if (eventType === 'channel.subscription.new') {
            goals.subscribers.current++;
            const subName = event.subscriber?.username || event.user?.username || 'Someone';
            setLastEvent({
              type: 'subscription',
              username: subName,
              timestamp: timestamp,
            });

            // Award points to subscriber
            addChannelPoints(subName, POINTS_PER_SUB, 'sub', 'New subscription bonus');
            console.log(`New subscriber: ${subName}! +${POINTS_PER_SUB} points. Total subs: ${goals.subscribers.current}`);
            saveGoals();

            // Send thank you message
            sendChatMessage(`🎉 Welcome ${subName} as a new subscriber! You earned ${POINTS_PER_SUB} bonus points!`);
          } else if (eventType === 'channel.subscription.renewal') {
            const subName = event.subscriber?.username || event.user?.username || 'Someone';
            setLastEvent({
              type: 'subscription',
              username: subName,
              timestamp: timestamp,
              details: 'Renewal',
            });

            // Award points for renewal
            addChannelPoints(subName, POINTS_PER_RENEWAL, 'renewal', 'Subscription renewal bonus');
            console.log(`Subscription renewal: ${subName}! +${POINTS_PER_RENEWAL} points`);

            // Send thank you message
            sendChatMessage(`💜 Thanks ${subName} for renewing your subscription! You earned ${POINTS_PER_RENEWAL} bonus points!`);
          } else if (eventType === 'channel.subscription.gifts') {
            const gifterName = event.gifter?.username || event.user?.username || 'Someone';
            const giftCount = event.gift_count || 1;
            goals.subscribers.current += giftCount;
            setLastEvent({
              type: 'gift',
              username: gifterName,
              timestamp: timestamp,
              details: `${giftCount} sub${giftCount > 1 ? 's' : ''}`,
            });

            // Award points to gifter (multiplied by gift count)
            const totalPoints = POINTS_PER_GIFT * giftCount;
            addChannelPoints(gifterName, totalPoints, 'gift', `Gifted ${giftCount} sub${giftCount > 1 ? 's' : ''}`);
            console.log(`${gifterName} gifted ${giftCount} subs! +${totalPoints} points. Total subs: ${goals.subscribers.current}`);
            saveGoals();

            // Send thank you message
            sendChatMessage(`🎁 ${gifterName} just gifted ${giftCount} sub${giftCount > 1 ? 's' : ''}! You earned ${totalPoints} bonus points!`);
          } else if (eventType === 'kicks.gifted') {
            // Handle Kick's virtual currency tips (like Twitch Bits)
            const tipperName = event.sender?.username || event.user?.username || 'Someone';
            const kickAmount = event.amount || 1;
            const totalPoints = POINTS_PER_KICK * kickAmount;

            setLastEvent({
              type: 'tip',
              username: tipperName,
              timestamp: timestamp,
              details: `${kickAmount} Kick${kickAmount > 1 ? 's' : ''}`,
            });

            // Award points to tipper
            addChannelPoints(tipperName, totalPoints, 'tip', `Tipped ${kickAmount} Kick${kickAmount > 1 ? 's' : ''}`);
            console.log(`${tipperName} tipped ${kickAmount} Kicks! +${totalPoints} points`);

            // Send thank you message
            sendChatMessage(`⚡ ${tipperName} just tipped ${kickAmount} Kick${kickAmount > 1 ? 's' : ''}! You earned ${totalPoints} bonus points! Thank you!`);
          } else if (eventType === 'livestream.start' || eventType === 'stream.online') {
            setStreamStatus(true);
            console.log('Stream went LIVE - points earning enabled');
          } else if (eventType === 'livestream.stop' || eventType === 'stream.offline') {
            setStreamStatus(false);
            console.log('Stream went OFFLINE - points earning disabled');
          }
        } catch (e) {
          console.error('Failed to parse webhook body:', e);
        }

        return new Response('OK', { status: 200 });
      },
    },
  };
}
