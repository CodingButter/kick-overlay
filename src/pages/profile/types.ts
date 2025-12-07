export interface UserData {
  username?: string;
  voiceId?: string;
  dropPoints: number;
  totalDrops: number;
  channelPoints: number;
  dropImage?: string;
  country?: string;
  powerups?: Record<string, number>;
}

export interface Powerup {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  effect: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
  };
}

export type VerifyStatus = 'loading' | 'ready' | 'waiting' | 'verified';

// Common countries list with codes
export const countries = [
  { code: '', name: '-- Select Country --' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
].sort((a, b) => (a.code === '' ? -1 : b.code === '' ? 1 : a.name.localeCompare(b.name)));

// Get flag URL from country code
export const getFlagUrl = (countryCode: string): string | null => {
  if (!countryCode) return null;
  return `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
};
