// ElevenLabs Text-to-Speech Client

interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

const config: ElevenLabsConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
  stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
  similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.75'),
  style: parseFloat(process.env.ELEVENLABS_STYLE || '0'),
};

export interface SpeakOptions {
  voiceId?: string;
  text: string;
}

export async function speak(options: SpeakOptions): Promise<ArrayBuffer | null> {
  const { voiceId = config.defaultVoiceId, text } = options;

  if (!config.apiKey) {
    console.error('ElevenLabs API key not configured');
    return null;
  }

  if (!voiceId) {
    console.error('No voice ID provided and no default voice ID configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: config.modelId,
          voice_settings: {
            stability: config.stability,
            similarity_boost: config.similarityBoost,
            style: config.style,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs request failed:', error);
    return null;
  }
}

export function parseVoiceIdFromMessage(content: string): { voiceId?: string; message: string } {
  // Match pattern like "id=VOICE_ID" at the start
  const match = content.match(/^id=(\S+)\s+(.+)$/i);

  if (match && match[1] && match[2]) {
    return {
      voiceId: match[1],
      message: match[2],
    };
  }

  return { message: content };
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export async function getVoices(): Promise<Voice[]> {
  if (!config.apiKey) {
    console.error('ElevenLabs API key not configured');
    return [];
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch voices:', error);
      return [];
    }

    const data = await response.json() as { voices: Voice[] };
    return data.voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
}

export default { speak, parseVoiceIdFromMessage, getVoices };
