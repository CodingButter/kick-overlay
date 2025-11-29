import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

function ProfileLoginPage() {
    const [claimCode, setClaimCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'waiting' | 'success' | 'error'>('loading');
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Generate a claim code on mount
    useEffect(() => {
        const generateCode = async () => {
            try {
                const res = await fetch('/api/claim/generate', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setClaimCode(data.code);
                    setStatus('ready');
                } else {
                    setError('Failed to generate claim code');
                    setStatus('error');
                }
            } catch (err) {
                setError('Failed to connect to server');
                setStatus('error');
            }
        };
        generateCode();
    }, []);

    // Poll for claim status
    useEffect(() => {
        if (!claimCode || status !== 'waiting') return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/claim/check/${claimCode}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.claimed && data.profileUrl) {
                        setProfileUrl(data.profileUrl);
                        setStatus('success');
                        clearInterval(pollInterval);
                    }
                }
            } catch (err) {
                // Silently continue polling
            }
        }, 2000);

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            setError('Claim expired. Please refresh the page to try again.');
            setStatus('error');
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [claimCode, status]);

    const handleStartClaim = () => {
        setStatus('waiting');
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success' && profileUrl) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-lg">
                <div className="bg-green-900/50 border border-green-500 rounded-lg p-6 text-center">
                    <h1 className="text-2xl font-bold text-green-400 mb-4">Profile Claimed!</h1>
                    <p className="mb-4">Your secret profile link is ready. Save this link - it's your private access to your profile settings.</p>
                    <div className="bg-gray-800 p-4 rounded mb-4 break-all">
                        <code className="text-green-300 text-sm">{profileUrl}</code>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigator.clipboard.writeText(profileUrl)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            Copy Link
                        </button>
                        <a
                            href={profileUrl}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded inline-block"
                        >
                            Go to Profile
                        </a>
                    </div>
                    <p className="mt-4 text-yellow-400 text-sm">
                        Warning: Anyone with this link can modify your settings. Keep it private!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <h1 className="text-3xl font-bold text-green-400 mb-2 text-center">Profile Login</h1>
            <p className="text-gray-400 mb-8 text-center">Verify your identity to access your profile settings</p>

            <div className="bg-gray-800 rounded-lg p-6">
                {status === 'ready' && (
                    <>
                        <div className="text-center mb-6">
                            <p className="mb-4">To verify you own your Kick account, you'll need to type a command in chat.</p>
                            <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                <p className="text-sm text-gray-400 mb-2">Your claim code:</p>
                                <code className="text-2xl font-bold text-green-400">{claimCode}</code>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-lg">Instructions:</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-300">
                                <li>Click the button below when you're ready</li>
                                <li>Go to the stream chat on Kick</li>
                                <li>Type: <code className="bg-gray-900 px-2 py-1 rounded text-green-400">!claim {claimCode}</code></li>
                                <li>Come back here - your profile link will appear automatically</li>
                            </ol>
                        </div>

                        <button
                            onClick={handleStartClaim}
                            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors"
                        >
                            I'm Ready - Start Verification
                        </button>
                    </>
                )}

                {status === 'waiting' && (
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                            <p className="text-lg">Waiting for verification...</p>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-400 mb-2">Type this in chat:</p>
                            <code className="text-xl font-bold text-green-400">!claim {claimCode}</code>
                        </div>

                        <p className="text-gray-400 text-sm">
                            This page will automatically update when you verify.
                            <br />
                            Code expires in 5 minutes.
                        </p>
                    </div>
                )}
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
                This ensures only you can access your profile settings.
                <br />
                Your profile link will only be shown here, never in public chat.
            </p>
        </div>
    );
}

const container = document.getElementById("login-root");
if (container) {
    const root = createRoot(container);
    root.render(<ProfileLoginPage />);
}
