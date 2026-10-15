import React, { useState, useEffect, useRef } from 'react';

/**
 * A highly interactive, reactive SVG Tablet (Pill) illustration.
 * States: 'idle', 'typing-username', 'typing-password', 'loading', 'success', 'error'
 */
export default function TabletIllustration({ state = 'idle' }) {
    const svgRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            // Only track cursor when the tablet is in idle or typing-username state
            if (state !== 'idle' && state !== 'typing-username') return;
            if (!svgRef.current) return;

            const rect = svgRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Cap the eye offset
            const maxOffset = 7;
            const offset = Math.min(dist * 0.06, maxOffset);

            setMousePos({
                x: Math.cos(angle) * offset,
                y: Math.sin(angle) * offset
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [state]);

    // Dynamic styles and transforms based on state
    const isError = state === 'error';
    const isSuccess = state === 'success';
    const isTypingUser = state === 'typing-username';
    const isTypingPass = state === 'typing-password';
    const isLoading = state === 'loading';

    // Split translation for the broken tablet effect
    const leftHalfTransform = isError 
        ? 'translate(-18, 12) rotate(-16)' 
        : 'translate(0, 0) rotate(0)';
    const rightHalfTransform = isError 
        ? 'translate(18, 12) rotate(16)' 
        : 'translate(0, 0) rotate(0)';

    // Face translation/effects
    let faceTransform = 'translate(0, 0)';
    if (isTypingUser) {
        faceTransform = 'translate(-6, 6)';
    } else if (isTypingPass) {
        faceTransform = 'translate(0, 8)';
    } else if (isError) {
        faceTransform = 'translate(0, 4)';
    } else if (isSuccess) {
        faceTransform = 'translate(0, -2)';
    }

    return (
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center select-none">
            {/* Embedded styles for keyframes and custom transitions */}
            <style dangerouslySetInnerHTML={{ __html: `
                .tablet-svg {
                    overflow: visible;
                }
                .tablet-part {
                    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.4s ease;
                    transform-origin: 100px 100px;
                }
                .tablet-face {
                    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                }
                .sparkle {
                    animation: sparklePulse 1.8s infinite ease-in-out;
                    transform-origin: center;
                }
                .sparkle-1 { animation-delay: 0s; }
                .sparkle-2 { animation-delay: 0.4s; }
                .sparkle-3 { animation-delay: 0.8s; }
                
                .shadow-ellipse {
                    transition: transform 0.5s ease, opacity 0.5s ease;
                    transform-origin: 100px 165px;
                }
                
                /* Animations */
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes floatShadow {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(0.85); opacity: 0.25; }
                }
                @keyframes spinPulse {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes sparklePulse {
                    0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
                    50% { transform: scale(1.2) rotate(45deg); opacity: 0.9; }
                }
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                .eye-blink {
                    animation: blink 4s infinite;
                    transform-origin: center;
                }
                .shake-active {
                    animation: shake 0.5s ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
            `}} />

            {/* Main SVG Container */}
            <svg 
                ref={svgRef}
                viewBox="0 0 200 200" 
                className={`w-full h-full tablet-svg ${isError ? 'shake-active' : ''}`}
                style={{
                    animation: isLoading ? 'float 1.6s infinite ease-in-out' : 'none',
                }}
            >
                {/* Definitions for Gradients and Filters */}
                <defs>
                    {/* Normal State Gradient - Cool Duo Color (Royal / Sky Blue) */}
                    <linearGradient id="pillLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" /> {/* Darker Blue */}
                        <stop offset="100%" stopColor="#1e40af" />
                    </linearGradient>
                    <linearGradient id="pillRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" /> {/* Lighter Sky Blue */}
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>

                    {/* Success State Gradient - Healing Green */}
                    <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" /> {/* Mint Green */}
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>

                    {/* Error State Gradient - Broken Red/Grey */}
                    <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" /> {/* Muted Red-Pink */}
                        <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>

                    {/* Radial Glow Filter */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Drop shadow indicator */}
                <ellipse 
                    cx="100" 
                    cy="165" 
                    rx="45" 
                    ry="6" 
                    fill="rgba(0, 0, 0, 0.4)" 
                    className="shadow-ellipse"
                    style={{
                        animation: isLoading ? 'floatShadow 1.6s infinite ease-in-out' : 'none',
                        transform: isError ? 'scale(0.8)' : isSuccess ? 'scale(1.15)' : 'scale(1)',
                        opacity: isError ? 0.2 : 0.4
                    }}
                />

                {/* Success Sparkles */}
                {isSuccess && (
                    <g fill="#34d399">
                        {/* Sparkle 1 */}
                        <path 
                            d="M45,45 Q50,45 50,40 Q50,45 55,45 Q50,45 50,50 Q50,45 45,45 Z" 
                            className="sparkle sparkle-1" 
                        />
                        {/* Sparkle 2 */}
                        <path 
                            d="M155,40 Q160,40 160,35 Q160,40 165,40 Q160,40 160,45 Q160,40 155,40 Z" 
                            className="sparkle sparkle-2" 
                        />
                        {/* Sparkle 3 */}
                        <path 
                            d="M165,135 Q170,135 170,130 Q170,135 175,135 Q170,135 170,140 Q170,135 165,135 Z" 
                            className="sparkle sparkle-3" 
                        />
                        {/* Sparkle 4 */}
                        <path 
                            d="M35,130 Q40,130 40,125 Q40,130 45,130 Q40,130 40,135 Q40,130 35,130 Z" 
                            className="sparkle sparkle-1" 
                        />
                    </g>
                )}

                {/* Left Half of the Tablet */}
                <g 
                    className="tablet-part" 
                    style={{ 
                        transform: leftHalfTransform,
                        filter: isSuccess ? 'url(#glow)' : 'none'
                    }}
                >
                    <path 
                        d="M 100 40 A 60 60 0 0 0 100 160 Z" 
                        fill={isSuccess ? 'url(#successGrad)' : isError ? 'url(#errorGrad)' : 'url(#pillLeftGrad)'} 
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                    />
                    {/* Inner highlight (3D edge) */}
                    <path 
                        d="M 52 100 A 48 48 0 0 1 100 42" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.25)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                    />
                </g>

                {/* Right Half of the Tablet */}
                <g 
                    className="tablet-part" 
                    style={{ 
                        transform: rightHalfTransform,
                        filter: isSuccess ? 'url(#glow)' : 'none'
                    }}
                >
                    <path 
                        d="M 100 40 A 60 60 0 0 1 100 160 Z" 
                        fill={isSuccess ? 'url(#successGrad)' : isError ? 'url(#errorGrad)' : 'url(#pillRightGrad)'} 
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                    />
                    {/* Inner highlight */}
                    <path 
                        d="M 100 42 A 48 48 0 0 1 148 100" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                    />
                </g>

                {/* Center dividing score-line (dull and embedded look) */}
                {!isError && (
                    <line 
                        x1="100" 
                        y1="40" 
                        x2="100" 
                        y2="160" 
                        stroke="rgba(0, 0, 0, 0.15)" 
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="tablet-part"
                    />
                )}

                {/* Reactive Face Group */}
                <g className="tablet-face" style={{ transform: faceTransform }}>
                    
                    {/* ─── EYES ─── */}
                    {isSuccess ? (
                        /* Happy Success Eyes (^ ^) */
                        <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
                            <path d="M 72 100 Q 80 88 88 100" />
                            <path d="M 112 100 Q 120 88 128 100" />
                        </g>
                    ) : isError ? (
                        /* Dizzy/Hurt Crossed Eyes (x x) */
                        <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none">
                            {/* Left cross */}
                            <path d="M 72 90 L 84 102" />
                            <path d="M 84 90 L 72 102" />
                            {/* Right cross */}
                            <path d="M 116 90 L 128 102" />
                            <path d="M 128 90 L 116 102" />
                        </g>
                    ) : isTypingPass ? (
                        /* Shy closed squinting eyes (> <) */
                        <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none">
                            <path d="M 74 90 L 84 97 L 74 104" />
                            <path d="M 126 90 L 116 97 L 126 104" />
                        </g>
                    ) : (
                        /* Normal open eyes tracking mouse cursor (both idle & username typing) */
                        <g 
                            fill="#ffffff" 
                            style={{ 
                                transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
                                transition: 'transform 0.05s ease-out' 
                            }}
                        >
                            <circle cx="80" cy="96" r="6" className="eye-blink" />
                            <circle cx="120" cy="96" r="6" className="eye-blink" />
                            {/* Eye highlights */}
                            <circle cx="78" cy="94" r="1.8" className="eye-blink" fill="#ffffff" />
                            <circle cx="118" cy="94" r="1.8" className="eye-blink" fill="#ffffff" />
                        </g>
                    )}

                    {/* ─── MOUTH ─── */}
                    {isSuccess ? (
                        /* Happy Open Mouth */
                        <path 
                            d="M 93 108 Q 100 124 107 108 Z" 
                            fill="#ffffff" 
                        />
                    ) : isError ? (
                        /* Dizzy wavy sad mouth */
                        <path 
                            d="M 93 115 Q 96 110 100 115 T 107 115" 
                            fill="none" 
                            stroke="#ffffff" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                        />
                    ) : isTypingPass ? (
                        /* Cute flat shy mouth */
                        <line 
                            x1="95" 
                            y1="113" 
                            x2="105" 
                            y2="113" 
                            stroke="#ffffff" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                        />
                    ) : isTypingUser ? (
                        /* Small cute "o" curious mouth */
                        <circle 
                            cx="100" 
                            cy="114" 
                            r="3" 
                            fill="#ffffff" 
                        />
                    ) : (
                        /* Idle smile */
                        <path 
                            d="M 94 112 Q 100 118 106 112" 
                            fill="none" 
                            stroke="#ffffff" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                        />
                    )}

                    {/* ─── BLUSH CHEEKS ─── */}
                    {!isError && (
                        <g fill="#ff7da7" opacity="0.45">
                            <ellipse cx="68" cy="103" rx="5" ry="3" />
                            <ellipse cx="132" cy="103" rx="5" ry="3" />
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
}
