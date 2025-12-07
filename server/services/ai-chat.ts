import { generateSystemPrompt, generateUserPrompt } from '../claude_prompt_template';
import { getUserData } from '../commands';
import { isAIChatbotEnabled, getAICooldownMs, getAIProjectDirectory } from '../db';
import { getEmotesForAI } from './kick-api';
import commands from '../commands';

// AI processing state
let aiProcessing = false;
const aiCooldown = new Map<string, number>();

// Chat messages storage
let chatMessages: any[] = [];

// Get chat messages
export function getChatMessages(): any[] {
  return chatMessages;
}

// Add chat message
export function addChatMessage(message: any): void {
  chatMessages.push(message);
  // Keep only last 100 messages
  if (chatMessages.length > 100) {
    chatMessages = chatMessages.slice(-100);
  }
}

// Process AI response
export async function processAIResponse(
  username: string,
  messageContent: string,
  avatarUrl?: string
): Promise<string | null> {
  if (!isAIChatbotEnabled()) {
    return null;
  }

  if (aiProcessing) {
    console.log('AI: Already processing a request, skipping');
    return null;
  }

  const now = Date.now();
  const cooldownMs = getAICooldownMs();
  const lastRequest = aiCooldown.get(username);
  if (lastRequest && now - lastRequest < cooldownMs) {
    console.log(`AI: User ${username} on cooldown`);
    return null;
  }

  const projectDir = getAIProjectDirectory() || process.cwd();
  const hasProjectContext = getAIProjectDirectory() !== '';
  const streamerUsername = process.env.KICK_USERNAME || 'codingbutter';

  try {
    aiProcessing = true;
    aiCooldown.set(username, now);

    const userData = getUserData(username);

    // Get recent messages for context
    const recentMessages = chatMessages.slice(-21, -1).map(m => ({
      username: m.sender?.username || 'Unknown',
      content: m.content || '',
    }));

    console.log(`AI: chatMessages array has ${chatMessages.length} messages`);
    console.log(`AI: recentMessages has ${recentMessages.length} messages for context`);

    // Build commands list for the AI
    const commandsList = Object.entries(commands).map(([name, cmd]) => ({
      name,
      description: cmd.description,
      arguments: cmd.arguments,
      cooldown: cmd.cooldown,
      alternatives: cmd.alternatives,
    }));

    // Fetch emotes for the AI
    const emotesList = await getEmotesForAI();

    // Generate prompts
    const systemPrompt = generateSystemPrompt({
      streamerUsername,
      projectDirectory: hasProjectContext ? projectDir : undefined,
      commands: commandsList,
      emotes: emotesList,
    });

    const userPrompt = generateUserPrompt({
      username,
      avatarUrl,
      channelPoints: userData.channelPoints,
      dropPoints: userData.dropPoints,
      totalDrops: userData.totalDrops,
      country: userData.country,
      messageContent,
      recentMessages,
    });

    console.log(`AI: Processing message from ${username}: "${messageContent.substring(0, 50)}..."`);
    console.log(`AI: Project context ${hasProjectContext ? 'enabled' : 'disabled'}`);

    // Build Claude CLI arguments
    const claudeArgs = [
      'claude',
      '-p',
      '--system-prompt', systemPrompt,
      '--model', 'sonnet',
    ];

    if (hasProjectContext) {
      claudeArgs.push('--allowedTools', 'WebSearch,Read,Glob,Grep');
      claudeArgs.push('--add-dir', projectDir);
    } else {
      claudeArgs.push('--allowedTools', 'WebSearch');
    }

    const proc = Bun.spawn(claudeArgs, {
      cwd: hasProjectContext ? projectDir : process.cwd(),
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdinWriter = proc.stdin;
    if (stdinWriter) {
      stdinWriter.write(userPrompt);
      stdinWriter.end();
    }

    // Set a timeout (30 seconds)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 30000);
    });

    const outputPromise = (async () => {
      const output = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (stderr) {
        console.error('AI stderr:', stderr);
      }

      return output.trim();
    })();

    const output = await Promise.race([outputPromise, timeoutPromise]);

    if (!output) {
      console.log('AI: Timeout or no output');
      return null;
    }

    if (output === 'No Response' || output.toLowerCase().includes('no response')) {
      console.log('AI: Chose not to respond');
      return null;
    }

    let response = output;
    if (response.length > 500) {
      response = response.substring(0, 497) + '...';
    }

    console.log(`AI: Responding with: "${response.substring(0, 50)}..."`);
    return response;
  } catch (error) {
    console.error('AI: Error processing response:', error);
    return null;
  } finally {
    aiProcessing = false;
  }
}
