import { Header } from '@/components/layout/Header';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-destructive/20 border border-destructive rounded-lg p-6 max-w-md text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
