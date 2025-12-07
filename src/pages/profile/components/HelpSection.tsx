import { Link } from 'react-router-dom';

export function HelpSection() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border overflow-hidden">
      <h2 className="text-xl font-bold mb-4 text-primary">Help</h2>
      <div className="flex flex-col gap-3 text-foreground text-sm overflow-hidden">
        <p>
          <strong className="text-primary">!say &lt;message&gt;</strong> - Text-to-speech using your default voice (costs 500 points)
        </p>
        <p>
          <strong className="text-primary">!say id=VOICE_ID &lt;message&gt;</strong> - Use a specific voice (also saves it as default)
        </p>
        <p>
          <strong className="text-primary">!drop</strong> - Play the drop game to earn points
        </p>
        <p>
          <strong className="text-primary">!drop -powerups</strong> - List available powerups
        </p>
        <p>
          <strong className="text-primary">!drop -buy [powerup]</strong> - Buy a powerup (e.g., !drop -buy tnt)
        </p>
        <p>
          <strong className="text-primary">!drop -mine</strong> - View your owned powerups
        </p>
        <p>
          <strong className="text-primary">!drop -rules</strong> - Get link to the drop game rules
        </p>
        <p>
          <strong className="text-primary">!points</strong> - Check your point balance
        </p>
        <p>
          <strong className="text-primary">!voicelist</strong> - View all available TTS voices
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <Link to="/drop-game-rules" className="inline-flex items-center gap-2 text-accent-foreground hover:text-primary">
          <span>View Drop Game Rules</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
