import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { VoiceCard } from './voicelist/components/VoiceCard';
import { usePreviewRateLimit } from './voicelist/hooks/usePreviewRateLimit';
import { RATE_LIMIT_MAX, type Voice } from './voicelist/types';
import './voicelist/hooks/useAudioPrimer'; // Initialize audio primer on module load

export function VoiceListPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const { canPlay, remaining, timeLeft, recordPlay } = usePreviewRateLimit();

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/voices');
        const data = (await response.json()) as Voice[];
        setVoices(data);
      } catch (error) {
        console.error('Failed to fetch voices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Extract unique categories and tags
  const categories = [...new Set(voices.map((v) => v.category))].sort();
  const allTags = new Set<string>();
  voices.forEach((voice) => {
    if (voice.labels) {
      Object.values(voice.labels).forEach((label) => allTags.add(label));
    }
  });
  const sortedTags = [...allTags].sort();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const filteredVoices = voices.filter((voice) => {
    const searchMatch =
      searchFilter === '' ||
      voice.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      voice.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      Object.values(voice.labels || {}).some((label) =>
        label.toLowerCase().includes(searchFilter.toLowerCase())
      );

    const categoryMatch = categoryFilter === 'all' || voice.category === categoryFilter;

    const tagMatch =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) => Object.values(voice.labels || {}).includes(tag));

    return searchMatch && categoryMatch && tagMatch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Available Voices</h1>
          <p className="text-muted-foreground">
            Test voices and copy the <code className="text-primary bg-card px-2 py-1 rounded">!say</code> command
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Type your message, click Play to hear it, then Copy to get the command
          </p>
        </div>

        {/* Rate limit indicator */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-muted-foreground text-sm">
            Previews remaining:{' '}
            <span className={remaining > 3 ? 'text-primary' : remaining > 0 ? 'text-warning' : 'text-destructive'}>
              {remaining}/{RATE_LIMIT_MAX}
            </span>
          </span>
          {timeLeft && (
            <span className="text-muted-foreground text-sm">(resets in {timeLeft})</span>
          )}
        </div>

        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search voices..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Category filter */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-secondary'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  categoryFilter === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-secondary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tags filter */}
        {sortedTags.length > 0 && (
          <div className="mb-6">
            <p className="text-muted-foreground text-sm mb-2">Filter by tags:</p>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.has(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.size > 0 && (
                <button
                  onClick={() => setSelectedTags(new Set())}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                >
                  Clear tags
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading voices...</p>
          </div>
        ) : filteredVoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No voices found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVoices.map((voice) => (
              <VoiceCard
                key={voice.voice_id}
                voice={voice}
                canPlay={canPlay}
                onPlay={recordPlay}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-8 text-muted-foreground text-sm">
          {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
}
