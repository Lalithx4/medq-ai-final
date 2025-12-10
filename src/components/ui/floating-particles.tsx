"use client";

import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  animationDuration: number;
  animationDelay: number;
  parallaxSpeed: number; // 0.1 = slow (far), 1 = normal, 2 = fast (close)
  layer: number; // 1 = back, 2 = mid, 3 = front
}

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

const COLORS = [
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // violet
];

export function FloatingParticles({ count = 50, className = "" }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Throttled scroll handler for performance
  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      setScrollY(window.scrollY);
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
      const colorIndex = Math.floor(Math.random() * COLORS.length);
      const layer = Math.ceil(Math.random() * 3); // 1, 2, or 3
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: COLORS[colorIndex] ?? "#3b82f6",
        animationDuration: Math.random() * 10 + 8,
        animationDelay: Math.random() * 5,
        parallaxSpeed: layer === 1 ? 0.2 : layer === 2 ? 0.5 : 0.8,
        layer,
      };
    });
    setParticles(newParticles);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [count, handleScroll]);

  if (!mounted) return null;

  return (
    <>
      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(30px, -40px) scale(1.2);
            opacity: 0.7;
          }
          50% {
            transform: translate(-20px, -60px) scale(1);
            opacity: 0.5;
          }
          75% {
            transform: translate(40px, -30px) scale(1.3);
            opacity: 0.8;
          }
        }
        
        @keyframes float-orb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -20px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 10px) scale(0.95);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.3;
            filter: blur(40px);
          }
          50% {
            opacity: 0.6;
            filter: blur(60px);
          }
        }
      `}</style>
      
      <div className={`absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none ${className}`} style={{ zIndex: 0 }}>
        {/* Floating Particles with Parallax */}
        {particles.map((particle) => {
          const parallaxOffset = scrollY * particle.parallaxSpeed;
          const layerOpacity = particle.layer === 1 ? 0.3 : particle.layer === 2 ? 0.5 : 0.7;
          const layerBlur = particle.layer === 1 ? 2 : particle.layer === 2 ? 1 : 0;
          
          return (
            <div
              key={particle.id}
              className="absolute rounded-full will-change-transform"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size * (particle.layer === 1 ? 0.6 : particle.layer === 2 ? 0.8 : 1),
                height: particle.size * (particle.layer === 1 ? 0.6 : particle.layer === 2 ? 0.8 : 1),
                backgroundColor: particle.color,
                opacity: layerOpacity,
                filter: `blur(${layerBlur}px)`,
                transform: `translateY(${-parallaxOffset}px)`,
                transition: "transform 0.1s linear",
                animation: `float-particle ${particle.animationDuration}s ease-in-out ${particle.animationDelay}s infinite`,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                zIndex: particle.layer,
              }}
            />
          );
        })}
        
        {/* Larger Glowing Orbs with Parallax */}
        {[
          { x: 10, y: 20, color: "rgba(59, 130, 246, 0.15)", size: 200, speed: 0.1 },
          { x: 80, y: 10, color: "rgba(139, 92, 246, 0.12)", size: 250, speed: 0.15 },
          { x: 20, y: 70, color: "rgba(16, 185, 129, 0.1)", size: 180, speed: 0.2 },
          { x: 70, y: 60, color: "rgba(236, 72, 153, 0.12)", size: 220, speed: 0.12 },
          { x: 50, y: 40, color: "rgba(6, 182, 212, 0.1)", size: 200, speed: 0.18 },
          { x: 90, y: 80, color: "rgba(245, 158, 11, 0.1)", size: 160, speed: 0.25 },
        ].map((orb, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full will-change-transform"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
              animation: `float-orb ${20 + i * 3}s ease-in-out ${i * 2}s infinite, pulse-glow ${8 + i * 2}s ease-in-out ${i}s infinite`,
              transform: `translate(-50%, -50%) translateY(${-scrollY * orb.speed}px)`,
              transition: "transform 0.1s linear",
            }}
          />
        ))}
      </div>
    </>
  );
}

// Sparkle variant for more magical effect
export function SparkleParticles({ count = 30, className = "" }: FloatingParticlesProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSparkles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
      }))
    );
  }, [count]);

  if (!mounted) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div className={`absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none ${className}`} style={{ zIndex: 0 }}>
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute text-primary/40"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              animation: `sparkle ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`,
            }}
          >
            <svg
              width={sparkle.size * 4}
              height={sparkle.size * 4}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                fill="currentColor"
              />
            </svg>
          </div>
        ))}
      </div>
    </>
  );
}
