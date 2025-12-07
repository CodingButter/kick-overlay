import { useState } from 'react';
import type { Voice } from '../types';
import { countries, getFlagUrl } from '../types';

interface SettingsSectionProps {
  username: string;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  dropImageUrl: string;
  setDropImageUrl: (url: string) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  voices: Voice[];
  onSave: () => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function SettingsSection({
  username,
  selectedVoice,
  setSelectedVoice,
  dropImageUrl,
  setDropImageUrl,
  selectedCountry,
  setSelectedCountry,
  voices,
  onSave,
  onImageUpload,
}: SettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave();
      setMessage('Settings saved successfully!');
    } catch {
      setMessage('Failed to save settings.');
    }
    setSaving(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    setMessage(null);
    try {
      await onImageUpload(e);
      setMessage('Image uploaded successfully!');
    } catch {
      setMessage('Failed to upload image.');
    }
    setUploading(false);
  };

  return (
    <div className="bg-card rounded-xl p-6 mb-6 border border-border overflow-hidden">
      <h2 className="text-xl font-bold mb-4 text-primary">Settings</h2>

      {/* Country Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Country</label>
        <div className="flex items-center gap-3">
          {selectedCountry && (
            <img
              src={getFlagUrl(selectedCountry) || ''}
              alt={selectedCountry}
              className="w-8 h-6 object-cover rounded"
            />
          )}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary focus:outline-none"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Your flag will be displayed next to your username in chat</p>
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Default TTS Voice</label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">-- Select a voice --</option>
          {voices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
              {voice.name} ({voice.labels?.gender || 'unknown'}, {voice.labels?.accent || 'neutral'})
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground mt-1">This voice will be used when you use !say without specifying a voice</p>
      </div>

      {/* Drop Game Image */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Drop Game Avatar</label>

        {dropImageUrl && (
          <div className="mb-4 flex items-center gap-4">
            <img
              src={dropImageUrl}
              alt="Drop avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="text-sm text-muted-foreground">Current avatar</div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="cursor-pointer">
            <div
              className={`flex items-center justify-center gap-2 bg-secondary hover:bg-muted border border-border rounded-lg px-4 py-3 transition-colors ${uploading ? 'opacity-50' : ''}`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Upload Image</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-sm text-muted-foreground">PNG, JPEG, GIF, or WebP. Max 2MB. This image will be used in the drop game.</p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Or enter an image URL:</label>
          <input
            type="url"
            value={dropImageUrl}
            onChange={(e) => setDropImageUrl(e.target.value)}
            placeholder="https://example.com/my-avatar.png"
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg ${message.includes('success') ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
