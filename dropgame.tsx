import { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

interface DropConfig {
    platformWidthRatio: number;
    avatarSize: number;
    cleanupDelay: number;
    gravity: number;
    bounceDamping: number;
    minHorizontalVelocity: number;
    maxHorizontalVelocity: number;
    horizontalDrift: number;
    centerBonusPoints: number;
    basePoints: number;
    usernameFontSize: number;
}

interface Dropper {
    id: string;
    username: string;
    avatarUrl: string;
    emoteUrl?: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    landed: boolean;
    score?: number;
    showScore: boolean;
    landedAt?: number;
}

interface DropEvent {
    username: string;
    avatarUrl: string;
    emoteUrl?: string;
}

const DEFAULT_CONFIG: DropConfig = {
    platformWidthRatio: 0.125,
    avatarSize: 60,
    cleanupDelay: 10000,
    gravity: 5,
    bounceDamping: 0.85,
    minHorizontalVelocity: 100,
    maxHorizontalVelocity: 500,
    horizontalDrift: 100,
    centerBonusPoints: 100,
    basePoints: 10,
    usernameFontSize: 24,
};

function DropGame() {
    const [droppers, setDroppers] = useState<Dropper[]>([]);
    const [config, setConfig] = useState<DropConfig>(DEFAULT_CONFIG);
    const [platformX, setPlatformX] = useState<number | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastDropIdRef = useRef<string | null>(null);
    const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch config on mount
    useEffect(() => {
        fetch("/api/dropgame/config")
            .then((res) => res.json())
            .then((data) => setConfig({ ...DEFAULT_CONFIG, ...data }))
            .catch(() => console.log("Using default config"));
    }, []);

    // Poll for new drops
    useEffect(() => {
        const pollDrops = async () => {
            try {
                const res = await fetch("/api/dropgame/queue");
                const drops: DropEvent[] = await res.json();

                if (drops.length > 0 && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();

                    // Show platform if not visible
                    if (platformX === null) {
                        const platformWidth = rect.width * config.platformWidthRatio;
                        const newPlatformX = Math.random() * (rect.width - platformWidth);
                        setPlatformX(newPlatformX);
                    }

                    // Add new droppers
                    const newDroppers: Dropper[] = drops.map((drop) => {
                        // Start with a random velocity between min and max
                        const speed = config.minHorizontalVelocity + Math.random() * (config.maxHorizontalVelocity - config.minHorizontalVelocity);
                        const direction = Math.random() > 0.5 ? 1 : -1;
                        return {
                            id: `${drop.username}-${Date.now()}-${Math.random()}`,
                            username: drop.username,
                            avatarUrl: drop.avatarUrl,
                            emoteUrl: drop.emoteUrl,
                            x: Math.random() * (rect.width - config.avatarSize),
                            y: -config.avatarSize,
                            vx: speed * direction,
                            vy: 0,
                            landed: false,
                            showScore: false,
                        };
                    });

                    setDroppers((prev) => [...prev, ...newDroppers]);

                    // Reset cleanup timer when new drops come in
                    if (cleanupTimerRef.current) {
                        clearTimeout(cleanupTimerRef.current);
                        cleanupTimerRef.current = null;
                    }
                }
            } catch (error) {
                // Silently fail
            }
        };

        const interval = setInterval(pollDrops, 500);
        return () => clearInterval(interval);
    }, [config, platformX]);

    // Physics loop
    useEffect(() => {
        let animationId: number;
        let lastTime = performance.now();

        const update = (currentTime: number) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            if (!containerRef.current) {
                animationId = requestAnimationFrame(update);
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const platformWidth = rect.width * config.platformWidthRatio;
            const platformHeight = 80; // Approximate platform image height
            const platformHitboxHeight = platformHeight / 2;
            const platformY = rect.height - platformHeight;

            setDroppers((prev) => {
                let hasActiveDroppers = false;
                let newWinner: string | null = null;

                // First pass: check if any droppers are still active
                const anyStillFalling = prev.some((d) => !d.landed);

                const updated = prev.map((dropper) => {
                    if (dropper.landed) {
                        // Only remove landed droppers if NO droppers are still falling
                        if (!anyStillFalling && dropper.landedAt && Date.now() - dropper.landedAt > 3000) {
                            return null;
                        }
                        return dropper;
                    }

                    hasActiveDroppers = true;

                    // Apply gravity
                    let newVy = dropper.vy + config.gravity * deltaTime;

                    // Apply random horizontal drift (wind effect)
                    let newVx = dropper.vx + (Math.random() - 0.5) * config.horizontalDrift * deltaTime;

                    // Clamp horizontal velocity to max
                    const direction = newVx >= 0 ? 1 : -1;
                    const absVx = Math.abs(newVx);
                    newVx = direction * Math.min(absVx, config.maxHorizontalVelocity);

                    // Enforce minimum velocity - if too slow, boost it
                    if (Math.abs(newVx) < config.minHorizontalVelocity) {
                        newVx = direction * config.minHorizontalVelocity;
                    }

                    let newX = dropper.x + newVx * deltaTime;
                    let newY = dropper.y + newVy * deltaTime;

                    // Bounce off walls with satisfying bounce
                    if (newX < 0) {
                        newX = 0;
                        newVx = Math.abs(newVx) * config.bounceDamping;
                        // Ensure minimum velocity after bounce
                        if (newVx < config.minHorizontalVelocity) {
                            newVx = config.minHorizontalVelocity;
                        }
                        // Add a little upward boost on bounce for fun
                        newVy = newVy * 0.8;
                    } else if (newX > rect.width - config.avatarSize) {
                        newX = rect.width - config.avatarSize;
                        newVx = -Math.abs(newVx) * config.bounceDamping;
                        // Ensure minimum velocity after bounce
                        if (Math.abs(newVx) < config.minHorizontalVelocity) {
                            newVx = -config.minHorizontalVelocity;
                        }
                        // Add a little upward boost on bounce for fun
                        newVy = newVy * 0.8;
                    }

                    // Check collisions - bottom of circle is the collision point
                    const avatarBottom = newY + config.avatarSize;
                    const avatarCenterX = newX + config.avatarSize / 2;

                    // Platform top Y position (where circles should land)
                    const platformTopY = rect.height - platformHeight;

                    // Check if over platform and hit platform top
                    if (
                        platformX !== null &&
                        avatarBottom >= platformTopY &&
                        avatarCenterX >= platformX &&
                        avatarCenterX <= platformX + platformWidth
                    ) {
                        // Landed on platform!
                        const platformCenterX = platformX + platformWidth / 2;
                        const distanceFromCenter = Math.abs(avatarCenterX - platformCenterX);
                        const maxDistance = platformWidth / 2;
                        const accuracy = 1 - distanceFromCenter / maxDistance;

                        // Calculate score based on accuracy
                        const score = Math.round(
                            config.basePoints + accuracy * config.centerBonusPoints
                        );

                        // Check if perfect center (within 10% of center)
                        const isPerfect = accuracy > 0.9;
                        if (isPerfect) {
                            newWinner = dropper.username;
                        }

                        // Report score to server
                        fetch("/api/dropgame/score", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                username: dropper.username,
                                score,
                                isPerfect,
                            }),
                        }).catch(() => {});

                        return {
                            ...dropper,
                            x: newX,
                            y: platformTopY - config.avatarSize,
                            vx: 0,
                            vy: 0,
                            landed: true,
                            score,
                            showScore: true,
                            landedAt: Date.now(),
                        };
                    }

                    // Check if fell off bottom (missed platform)
                    if (avatarBottom >= rect.height) {
                        return {
                            ...dropper,
                            x: newX,
                            y: rect.height - config.avatarSize,
                            vx: 0,
                            vy: 0,
                            landed: true,
                            score: 0,
                            showScore: true,
                            landedAt: Date.now(),
                        };
                    }

                    return {
                        ...dropper,
                        x: newX,
                        y: newY,
                        vx: newVx,
                        vy: newVy,
                    };
                });

                // Filter out null (removed) droppers
                const filtered = updated.filter((d): d is Dropper => d !== null);

                // Show winner name
                if (newWinner) {
                    setWinnerName(newWinner);
                    setTimeout(() => setWinnerName(null), 3000);
                }

                // Check if all droppers are done
                const allLanded = filtered.every((d) => d.landed);
                if (allLanded && filtered.length > 0 && !hasActiveDroppers) {
                    // Start cleanup timer only when all droppers have landed
                    if (!cleanupTimerRef.current) {
                        cleanupTimerRef.current = setTimeout(() => {
                            setDroppers([]);
                            setPlatformX(null);
                            cleanupTimerRef.current = null;
                        }, config.cleanupDelay);
                    }
                } else if (hasActiveDroppers && cleanupTimerRef.current) {
                    // Cancel cleanup timer if there are still active droppers
                    clearTimeout(cleanupTimerRef.current);
                    cleanupTimerRef.current = null;
                }

                return filtered;
            });

            animationId = requestAnimationFrame(update);
        };

        animationId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationId);
    }, [config, platformX]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Droppers */}
            {droppers.map((dropper) => (
                <div
                    key={dropper.id}
                    style={{
                        position: "absolute",
                        left: dropper.x,
                        top: dropper.y,
                        width: config.avatarSize,
                        height: config.avatarSize,
                        transition: dropper.landed ? "none" : undefined,
                    }}
                >
                    {/* Avatar/Emote */}
                    <img
                        src={dropper.emoteUrl || dropper.avatarUrl || "/public/default-avatar.png"}
                        alt={dropper.username}
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "3px solid #53fc18",
                            boxShadow: "0 0 10px rgba(83, 252, 24, 0.5)",
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src =
                                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
                        }}
                    />
                    {/* Username */}
                    <div
                        style={{
                            position: "absolute",
                            top: -(config.usernameFontSize + 10),
                            left: "50%",
                            transform: "translateX(-50%)",
                            whiteSpace: "nowrap",
                            color: "#fff",
                            fontSize: `${config.usernameFontSize}px`,
                            fontWeight: "bold",
                            textShadow: "0 0 6px #000, 0 0 6px #000, 2px 2px 4px #000",
                        }}
                    >
                        {dropper.username}
                    </div>
                    {/* Score popup */}
                    {dropper.showScore && dropper.score !== undefined && (
                        <div
                            style={{
                                position: "absolute",
                                top: -40,
                                left: "50%",
                                transform: "translateX(-50%)",
                                color: dropper.score > config.basePoints + config.centerBonusPoints * 0.5 ? "#ffd700" : "#53fc18",
                                fontSize: "18px",
                                fontWeight: "bold",
                                textShadow: "0 0 4px #000, 0 0 4px #000",
                                animation: "fadeUp 2s ease-out forwards",
                            }}
                        >
                            +{dropper.score}
                        </div>
                    )}
                </div>
            ))}

            {/* Platform */}
            {platformX !== null && (
                <div
                    style={{
                        position: "absolute",
                        left: platformX,
                        bottom: 0,
                        width: `${config.platformWidthRatio * 100}%`,
                    }}
                >
                    <img
                        src="/public/dropgame-platform.png"
                        alt="Platform"
                        style={{
                            width: "100%",
                            height: "auto",
                        }}
                    />
                </div>
            )}

            {/* Winner announcement */}
            {winnerName && (
                <div
                    style={{
                        position: "absolute",
                        top: "40%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "#ffd700",
                        fontSize: "48px",
                        fontWeight: "bold",
                        textShadow: "0 0 10px #000, 0 0 20px #ffd700",
                        animation: "pulse 0.5s ease-in-out infinite",
                        textAlign: "center",
                    }}
                >
                    {winnerName}
                    <div style={{ fontSize: "24px" }}>PERFECT!</div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp {
                    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
                }
                @keyframes pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                }
            `}</style>
        </div>
    );
}

const container = document.getElementById("game-container");
if (container) {
    const root = createRoot(container);
    root.render(<DropGame />);
}
