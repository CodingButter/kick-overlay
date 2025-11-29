import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Check, AlertCircle, Copy, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

type Step = 'username' | 'verify' | 'success';

export function ProfileLoginPage() {
  const navigate = useNavigate();
  const { login, username: storedUsername, isAuthenticated, isLoading, validateSession } = useAuthStore();
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (isLoading) return; // Wait for zustand to rehydrate

      if (isAuthenticated && storedUsername) {
        // Validate session with backend
        const isValid = await validateSession();
        if (isValid) {
          navigate(`/profile/${storedUsername}`, { replace: true });
          return;
        }
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [isAuthenticated, storedUsername, isLoading, validateSession, navigate]);

  const copyVerifyCommand = async () => {
    try {
      await navigator.clipboard.writeText(`!verify ${verifyCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.generateVerifyCode(username);
      if (result.error) {
        setError(result.error);
      } else {
        setVerifyCode(result.code);
        setStep('verify');
      }
    } catch (err) {
      setError('Failed to generate verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.checkVerifyCode(username, verifyCode);
      if (result.verified) {
        login(username, result.token);
        setStep('success');
        setTimeout(() => {
          navigate(`/profile/${username}`);
        }, 1500);
      } else {
        setError('Verification not complete. Please type the code in chat.');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking for existing session
  if (checkingSession || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-kick animate-spin" />
            <p className="text-slate-400">Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-slate-700/50 bg-slate-800/80 backdrop-blur">
            <CardHeader className="text-center pb-2 pt-8">
              <div className="w-16 h-16 bg-kick/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-kick" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Profile Login
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Verify your Kick username to access your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-4">
              {step === 'username' && (
                <form onSubmit={handleUsernameSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">
                      Kick Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your Kick username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      className="h-12 bg-slate-700/50 border-slate-600 focus:border-kick focus:ring-kick/20 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-kick text-black hover:bg-kick/90 font-semibold text-base"
                    disabled={loading || !username.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {step === 'verify' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Badge variant="outline" className="text-base px-4 py-2 mb-4 bg-slate-700/50 border-slate-600">
                      @{username}
                    </Badge>
                    <p className="text-slate-400 text-sm">
                      Type this command in the stream chat to verify:
                    </p>
                  </div>

                  <div className="bg-slate-700/50 rounded-xl p-6 text-center relative border border-slate-600/50">
                    <code className="text-2xl font-bold text-kick tracking-wider font-mono">
                      !verify {verifyCode}
                    </code>
                    <button
                      onClick={copyVerifyCommand}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all ${
                        copied
                          ? 'bg-green-500/20 text-green-400 scale-110'
                          : 'bg-slate-600/50 text-slate-400 hover:bg-slate-500/50 hover:text-white'
                      }`}
                      title="Copy code"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-blue-950/30 rounded-xl border border-blue-800/30">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-blue-200 mb-2">How to verify:</p>
                      <ol className="text-blue-300/80 list-decimal list-inside space-y-1.5">
                        <li>Go to the stream chat</li>
                        <li>Type the command above (or click copy)</li>
                        <li>Come back and click "Check Verification"</li>
                      </ol>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 border-slate-600 hover:bg-slate-700"
                      onClick={() => setStep('username')}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 h-12 bg-kick text-black hover:bg-kick/90 font-semibold"
                      onClick={handleVerify}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Check Verification'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 bg-kick/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Check className="w-10 h-10 text-kick" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Verified!</h3>
                    <p className="text-slate-400">
                      Redirecting to your profile...
                    </p>
                  </div>
                  <Loader2 className="w-6 h-6 text-kick animate-spin mx-auto" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
