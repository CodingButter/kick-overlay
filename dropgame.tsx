import { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

type PowerupType = 'tnt' | 'powerdrop' | 'shield' | 'magnet' | 'ghost' | 'boost';

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

interface PowerupEvent {
    username: string;
    powerupId: PowerupType;
    timestamp: number;
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
    landedOnPlatform?: boolean;
    // Powerup states
    hasShield?: boolean;
    isGhost?: boolean;
    ghostEndTime?: number;
    isBoosted?: boolean;
    boostEndTime?: number;
    isPowerDropping?: boolean;
    activePowerup?: PowerupType;
}

interface ConfettiParticle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    size: number;
}

interface ExplosionParticle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
}

interface DropEvent {
    username: string;
    avatarUrl: string;
    emoteUrl?: string;
    activePowerup?: PowerupType;
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

const CONFETTI_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700', '#ff6b6b', '#53fc18'];

function DropGame() {
    const [droppers, setDroppers] = useState<Dropper[]>([]);
    const [config, setConfig] = useState<DropConfig>(DEFAULT_CONFIG);
    const [platformX, setPlatformX] = useState<number | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);
    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
    const [explosions, setExplosions] = useState<ExplosionParticle[]>([]);
    const [powerupAnnouncement, setPowerupAnnouncement] = useState<{ text: string; emoji: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Spawn confetti at a position
    const spawnConfetti = useCallback((x: number, y: number, count: number = 30) => {
        const particles: ConfettiParticle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 200 + Math.random() * 300;
            particles.push({
                id: `confetti-${Date.now()}-${i}`,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 200, // Initial upward boost
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 720,
                size: 8 + Math.random() * 8,
            });
        }
        setConfetti(prev => [...prev, ...particles]);

        // Clean up confetti after animation
        setTimeout(() => {
            setConfetti(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
        }, 3000);
    }, []);

    // Spawn explosion at a position
    const spawnExplosion = useCallback((x: number, y: number) => {
        const particles: ExplosionParticle[] = [];
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 300 + Math.random() * 200;
            particles.push({
                id: `explosion-${Date.now()}-${i}`,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 20 + Math.random() * 20,
                opacity: 1,
            });
        }
        setExplosions(prev => [...prev, ...particles]);

        // Clean up explosion after animation
        setTimeout(() => {
            setExplosions(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
        }, 1000);
    }, []);

    // Apply powerup effect to dropper
    const applyPowerup = useCallback((username: string, powerupId: PowerupType) => {
        const now = Date.now();
        const POWERUP_EMOJIS: Record<PowerupType, string> = {
            tnt: '💣',
            powerdrop: '⚡',
            shield: '🛡️',
            magnet: '🧲',
            ghost: '👻',
            boost: '🚀'
        };
        const POWERUP_NAMES: Record<PowerupType, string> = {
            tnt: 'TNT',
            powerdrop: 'POWER DROP',
            shield: 'SHIELD',
            magnet: 'MAGNET',
            ghost: 'GHOST',
            boost: 'SPEED BOOST'
        };

        setPowerupAnnouncement({ text: `${username}: ${POWERUP_NAMES[powerupId]}!`, emoji: POWERUP_EMOJIS[powerupId] });
        setTimeout(() => setPowerupAnnouncement(null), 2000);

        setDroppers(prev => prev.map(d => {
            if (d.username.toLowerCase() !== username.toLowerCase() || d.landed) return d;

            switch (powerupId) {
                case 'tnt':
                    // TNT: Push all other droppers away
                    const tntX = d.x + config.avatarSize / 2;
                    const tntY = d.y + config.avatarSize / 2;
                    spawnExplosion(tntX, tntY);

                    // We'll handle pushing other droppers separately
                    setDroppers(prevDroppers => prevDroppers.map(other => {
                        if (other.id === d.id || other.landed || other.hasShield) return other;
                        const otherX = other.x + config.avatarSize / 2;
                        const otherY = other.y + config.avatarSize / 2;
                        const dx = otherX - tntX;
                        const dy = otherY - tntY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 300) {
                            const force = (300 - distance) / 300 * 500;
                            const angle = Math.atan2(dy, dx);
                            return {
                                ...other,
                                vx: other.vx + Math.cos(angle) * force,
                                vy: other.vy + Math.sin(angle) * force - 100, // Also push up a bit
                            };
                        }
                        return other;
                    }));
                    return d;

                case 'powerdrop':
                    // Power Drop: Stop horizontal movement permanently and increase gravity
                    return { ...d, vx: 0, isPowerDropping: true };

                case 'shield':
                    // Shield: Mark as protected
                    return { ...d, hasShield: true };

                case 'magnet':
                    // Magnet: Pull towards platform center
                    if (platformX !== null && containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const platformCenterX = platformX + (rect.width * config.platformWidthRatio) / 2;
                        const dropperCenterX = d.x + config.avatarSize / 2;
                        const pullDirection = platformCenterX > dropperCenterX ? 1 : -1;
                        return { ...d, vx: pullDirection * 400 }; // Strong pull towards center
                    }
                    return d;

                case 'ghost':
                    // Ghost: Enable wall wrapping for 5 seconds
                    return { ...d, isGhost: true, ghostEndTime: now + 5000 };

                case 'boost':
                    // Boost: Double horizontal speed for 3 seconds
                    return { ...d, isBoosted: true, boostEndTime: now + 3000, vx: d.vx * 2 };

                default:
                    return d;
            }
        }));
    }, [config.avatarSize, config.gravity, config.platformWidthRatio, platformX, spawnExplosion]);

    // Poll for powerup activations
    useEffect(() => {
        const pollPowerups = async () => {
            try {
                const res = await fetch("/api/dropgame/powerups");
                const powerups: PowerupEvent[] = await res.json();

                for (const powerup of powerups) {
                    applyPowerup(powerup.username, powerup.powerupId);
                }
            } catch (error) {
                // Silently fail
            }
        };

        const interval = setInterval(pollPowerups, 300);
        return () => clearInterval(interval);
    }, [applyPowerup]);

    // Explosion physics
    useEffect(() => {
        if (explosions.length === 0) return;

        let animationId: number;
        let lastTime = performance.now();

        const updateExplosions = (currentTime: number) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            setExplosions(prev => prev.map(p => ({
                ...p,
                x: p.x + p.vx * deltaTime,
                y: p.y + p.vy * deltaTime,
                vx: p.vx * 0.95,
                vy: p.vy * 0.95,
                opacity: Math.max(0, p.opacity - deltaTime * 2),
                size: p.size * (1 - deltaTime * 0.5),
            })).filter(p => p.opacity > 0));

            animationId = requestAnimationFrame(updateExplosions);
        };

        animationId = requestAnimationFrame(updateExplosions);
        return () => cancelAnimationFrame(animationId);
    }, [explosions.length > 0]);

    // Confetti physics
    useEffect(() => {
        if (confetti.length === 0) return;

        let animationId: number;
        let lastTime = performance.now();

        const updateConfetti = (currentTime: number) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            setConfetti(prev => prev.map(p => ({
                ...p,
                x: p.x + p.vx * deltaTime,
                y: p.y + p.vy * deltaTime,
                vy: p.vy + 500 * deltaTime, // Gravity
                vx: p.vx * 0.99, // Air resistance
                rotation: p.rotation + p.rotationSpeed * deltaTime,
            })).filter(p => p.y < window.innerHeight + 100));

            animationId = requestAnimationFrame(updateConfetti);
        };

        animationId = requestAnimationFrame(updateConfetti);
        return () => cancelAnimationFrame(animationId);
    }, [confetti.length > 0]);

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
                let newWinner: string | null = null;

                const updated = prev.map((dropper) => {
                    if (dropper.landed) {
                        // Remove this dropper after cleanup delay has passed since landing
                        if (dropper.landedAt && Date.now() - dropper.landedAt > config.cleanupDelay) {
                            return null;
                        }
                        return dropper;
                    }

                    // Apply gravity (3x for power drop)
                    const gravityMultiplier = dropper.isPowerDropping ? 3 : 1;
                    let newVy = dropper.vy + config.gravity * gravityMultiplier * deltaTime;

                    // Apply random horizontal drift (wind effect) - skip if power dropping
                    let newVx = dropper.isPowerDropping ? 0 : dropper.vx + (Math.random() - 0.5) * config.horizontalDrift * deltaTime;

                    // Skip velocity clamping and minimum enforcement for power dropping
                    if (!dropper.isPowerDropping) {
                        // Clamp horizontal velocity to max
                        const direction = newVx >= 0 ? 1 : -1;
                        const absVx = Math.abs(newVx);
                        newVx = direction * Math.min(absVx, config.maxHorizontalVelocity);

                        // Enforce minimum velocity - if too slow, boost it
                        if (Math.abs(newVx) < config.minHorizontalVelocity) {
                            newVx = direction * config.minHorizontalVelocity;
                        }
                    }

                    let newX = dropper.x + newVx * deltaTime;
                    let newY = dropper.y + newVy * deltaTime;

                    // Check if ghost mode is still active
                    const now = Date.now();
                    let isGhost = dropper.isGhost && dropper.ghostEndTime && now < dropper.ghostEndTime;
                    let isBoosted = dropper.isBoosted && dropper.boostEndTime && now < dropper.boostEndTime;

                    // Handle wall collisions based on ghost mode
                    if (isGhost) {
                        // Ghost mode: wrap around screen
                        if (newX < -config.avatarSize) {
                            newX = rect.width;
                        } else if (newX > rect.width) {
                            newX = -config.avatarSize;
                        }
                    } else {
                        // Normal bounce off walls
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

                        // Spawn confetti! More confetti for better scores
                        const confettiCount = isPerfect ? 60 : Math.round(20 + accuracy * 30);
                        spawnConfetti(avatarCenterX, platformTopY, confettiCount);

                        return {
                            ...dropper,
                            x: newX,
                            y: platformTopY - config.avatarSize,
                            vx: 0,
                            vy: 0,
                            landed: true,
                            landedOnPlatform: true,
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
                        // Update powerup states
                        isGhost: isGhost,
                        isBoosted: isBoosted,
                    };
                });

                // Filter out null (removed) droppers
                const filtered = updated.filter((d): d is Dropper => d !== null);

                // Show winner name
                if (newWinner) {
                    setWinnerName(newWinner);
                    setTimeout(() => setWinnerName(null), 3000);
                }

                // Hide platform only when no droppers remain AND all have landed
                // This prevents early clearing if HMR or other re-renders occur
                const allLanded = filtered.every(d => d.landed);
                if (filtered.length === 0 || (filtered.length > 0 && allLanded && filtered.every(d => d.landedAt && Date.now() - d.landedAt > config.cleanupDelay - 100))) {
                    // Only clear if truly empty or all droppers are about to be cleaned up
                    if (filtered.length === 0) {
                        setPlatformX(null);
                    }
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
                        zIndex: 20,
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
                            border: dropper.hasShield ? "4px solid #ffd700" : "3px solid #53fc18",
                            boxShadow: dropper.hasShield
                                ? "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)"
                                : dropper.isBoosted
                                    ? "0 0 15px rgba(255, 100, 0, 0.8)"
                                    : "0 0 10px rgba(83, 252, 24, 0.5)",
                            opacity: dropper.isGhost ? 0.5 : 1,
                            filter: dropper.isGhost ? "blur(1px)" : undefined,
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src =
                                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2353fc18'/></svg>";
                        }}
                    />
                    {/* Shield indicator */}
                    {dropper.hasShield && (
                        <div style={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            fontSize: "20px",
                        }}>🛡️</div>
                    )}
                    {/* Ghost indicator */}
                    {dropper.isGhost && (
                        <div style={{
                            position: "absolute",
                            top: -5,
                            left: -5,
                            fontSize: "20px",
                        }}>👻</div>
                    )}
                    {/* Power Drop indicator */}
                    {dropper.isPowerDropping && (
                        <div style={{
                            position: "absolute",
                            bottom: -5,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: "20px",
                        }}>⚡</div>
                    )}
                    {/* Boost trail */}
                    {dropper.isBoosted && (
                        <div style={{
                            position: "absolute",
                            top: "50%",
                            left: dropper.vx > 0 ? -20 : undefined,
                            right: dropper.vx < 0 ? -20 : undefined,
                            transform: "translateY(-50%)",
                            fontSize: "16px",
                        }}>🚀</div>
                    )}
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
                    {/* Score popup - shown above username when landed */}
                    {dropper.showScore && dropper.score !== undefined && dropper.landed && (
                        <div
                            style={{
                                position: "absolute",
                                top: -(config.usernameFontSize + 50),
                                left: "50%",
                                transform: "translateX(-50%)",
                                color: dropper.landedOnPlatform
                                    ? (dropper.score > config.basePoints + config.centerBonusPoints * 0.5 ? "#ffd700" : "#53fc18")
                                    : "#ff4444",
                                fontSize: "28px",
                                fontWeight: "bold",
                                textShadow: "0 0 8px #000, 0 0 8px #000, 2px 2px 4px #000",
                                animation: "scorePopup 2.5s ease-out forwards",
                                zIndex: 100,
                            }}
                        >
                            {dropper.landedOnPlatform ? `+${dropper.score}` : "MISS!"}
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
                        zIndex: 10,
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

            {/* Confetti particles */}
            {confetti.map((particle) => (
                <div
                    key={particle.id}
                    style={{
                        position: "absolute",
                        left: particle.x,
                        top: particle.y,
                        width: particle.size,
                        height: particle.size * 0.6,
                        backgroundColor: particle.color,
                        transform: `rotate(${particle.rotation}deg)`,
                        borderRadius: "2px",
                        pointerEvents: "none",
                        zIndex: 50,
                    }}
                />
            ))}

            {/* Explosion particles */}
            {explosions.map((particle) => (
                <div
                    key={particle.id}
                    style={{
                        position: "absolute",
                        left: particle.x - particle.size / 2,
                        top: particle.y - particle.size / 2,
                        width: particle.size,
                        height: particle.size,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, rgba(255,200,0,${particle.opacity}) 0%, rgba(255,100,0,${particle.opacity * 0.8}) 50%, rgba(255,0,0,${particle.opacity * 0.5}) 100%)`,
                        boxShadow: `0 0 ${particle.size}px rgba(255,100,0,${particle.opacity})`,
                        pointerEvents: "none",
                        zIndex: 60,
                    }}
                />
            ))}

            {/* Powerup announcement */}
            {powerupAnnouncement && (
                <div
                    style={{
                        position: "absolute",
                        top: "20%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: "#fff",
                        fontSize: "36px",
                        fontWeight: "bold",
                        textShadow: "0 0 10px #000, 0 0 20px #ff6600",
                        textAlign: "center",
                        zIndex: 150,
                        animation: "powerupPop 0.5s ease-out",
                    }}
                >
                    <span style={{ fontSize: "48px" }}>{powerupAnnouncement.emoji}</span>
                    <div>{powerupAnnouncement.text}</div>
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
                        zIndex: 200,
                    }}
                >
                    {winnerName}
                    <div style={{ fontSize: "24px" }}>PERFECT!</div>
                </div>
            )}

            <style>{`
                @keyframes scorePopup {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(0.5);
                    }
                    20% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-10px) scale(1.2);
                    }
                    40% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-5px) scale(1);
                    }
                    80% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-20px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-40px) scale(0.8);
                    }
                }
                @keyframes pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                }
                @keyframes powerupPop {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) scale(0.5);
                    }
                    50% {
                        transform: translateX(-50%) scale(1.2);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
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
