import { speak, getVoices as elevenLabsGetVoices } from '../elevenlabs';

// TTS audio queue
const ttsQueue: ArrayBuffer[] = [];

// Queue TTS audio
export async function queueTTS(text: string, voiceId?: string): Promise<boolean> {
  try {
    const audioBuffer = await speak({ text, voiceId });
    if (audioBuffer) {
      ttsQueue.push(audioBuffer);
      console.log(`TTS queued: "${text.substring(0, 50)}..." (queue size: ${ttsQueue.length})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to queue TTS:', error);
    return false;
  }
}

// Get next TTS audio from queue
export function getNextTTS(): ArrayBuffer | undefined {
  return ttsQueue.shift();
}

// Get queue length
export function getTTSQueueLength(): number {
  return ttsQueue.length;
}

// Generate TTS preview (not queued)
export async function generateTTSPreview(text: string, voiceId: string): Promise<ArrayBuffer | null> {
  try {
    return await speak({ text, voiceId });
  } catch (error) {
    console.error('TTS preview error:', error);
    return null;
  }
}

// Re-export getVoices
export const getVoices = elevenLabsGetVoices;
