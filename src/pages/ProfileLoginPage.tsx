import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Check, AlertCircle, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

type Step = 'username' | 'verify' | 'success';

export function ProfileLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <User className="w-6 h-6 text-kick" />
              Profile Login
            </CardTitle>
            <CardDescription>
              Verify your Kick username to access your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'username' && (
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2">
                    Kick Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your Kick username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-kick text-black hover:bg-kick/90"
                  disabled={loading || !username.trim()}
                >
                  {loading ? 'Loading...' : 'Continue'}
                </Button>
              </form>
            )}

            {step === 'verify' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Badge variant="outline" className="text-lg px-4 py-2 mb-4">
                    {username}
                  </Badge>
                  <p className="text-muted-foreground text-sm">
                    Type this command in the stream chat to verify:
                  </p>
                </div>

                <div className="bg-secondary rounded-xl p-6 text-center relative">
                  <code className="text-2xl font-bold text-kick tracking-wider">
                    !verify {verifyCode}
                  </code>
                  <button
                    onClick={copyVerifyCommand}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
                    }`}
                    title="Copy code"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-950/30 rounded-lg border border-blue-800/50">
                  <MessageSquare className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-200">How to verify:</p>
                    <ol className="text-blue-300/80 mt-1 list-decimal list-inside space-y-1">
                      <li>Go to the stream chat</li>
                      <li>Type the command above exactly (or click copy)</li>
                      <li>Come back here and click "Check Verification"</li>
                    </ol>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('username')}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-kick text-black hover:bg-kick/90"
                    onClick={handleVerify}
                    disabled={loading}
                  >
                    {loading ? 'Checking...' : 'Check Verification'}
                  </Button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-kick/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-kick" />
                </div>
                <h3 className="text-xl font-semibold">Verified!</h3>
                <p className="text-muted-foreground">
                  Redirecting to your profile...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
