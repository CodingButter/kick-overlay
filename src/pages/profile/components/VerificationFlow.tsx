import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import type { VerifyStatus } from '../types';

interface VerificationFlowProps {
  username: string;
  verifyCode: string;
  verifyStatus: VerifyStatus;
  onStartWaiting: () => void;
}

export function VerificationFlow({ username, verifyCode, verifyStatus, onStartWaiting }: VerificationFlowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = async () => {
    const command = `!verify ${verifyCode}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{username}'s Profile</h1>
          <p className="text-muted-foreground">Verify your identity to access your settings</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          {verifyStatus === 'ready' && (
            <>
              <div className="text-center mb-6">
                <p className="text-foreground mb-4">
                  To prove you are <span className="text-primary font-bold">{username}</span>, paste this command in chat:
                </p>
                <div className="bg-background p-4 rounded-lg mb-4">
                  <code className="text-xl font-bold text-primary block mb-3">!verify {verifyCode}</code>
                  <button
                    onClick={handleCopyCommand}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      copied ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted text-foreground'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-left">
                <h3 className="font-bold text-lg text-foreground">Instructions:</h3>
                <ol className="list-decimal list-inside flex flex-col gap-2 text-muted-foreground">
                  <li>Copy the command above</li>
                  <li>Paste it in the stream chat on Kick</li>
                  <li>Click the button below to start verification</li>
                  <li>This page will automatically unlock</li>
                </ol>
              </div>

              <button
                onClick={onStartWaiting}
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg transition-colors"
              >
                I'm Ready - Start Verification
              </button>
            </>
          )}

          {verifyStatus === 'waiting' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg text-foreground">Waiting for verification...</p>
              </div>

              <div className="bg-background p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground mb-2">Paste this in chat:</p>
                <code className="text-xl font-bold text-primary block mb-3">!verify {verifyCode}</code>
                <button
                  onClick={handleCopyCommand}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    copied ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted text-foreground'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy Command'}
                </button>
              </div>

              <p className="text-muted-foreground text-sm">
                This page will automatically update when you verify.
                <br />
                Code expires in 5 minutes.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8">This ensures only you can modify your settings.</p>
      </div>
    </div>
  );
}
