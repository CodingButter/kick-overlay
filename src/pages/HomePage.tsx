import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center p-8">
        <div className="w-20 h-20 bg-kick rounded-2xl flex items-center justify-center text-3xl font-bold text-black mx-auto mb-4">
          K
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Kick Overlay</h1>
        <p className="text-muted-foreground mb-8">
          Connect your Kick account to get started
        </p>

        <Button
          asChild
          className="bg-kick hover:bg-kick/90 text-black font-semibold px-8 py-6 text-lg"
        >
          <a href="/auth">Sign in with Kick</a>
        </Button>

        <div className="mt-8 p-4 bg-white/5 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            This will redirect you to Kick to authorize the overlay app.
            After signing in, you'll be redirected back here with your tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
