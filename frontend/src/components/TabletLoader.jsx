import React from 'react';

/**
 * A cute miniature capsule loading animation.
 * The top and bottom halves split and rejoin in a continuous loop while spinning.
 */
export default function TabletLoader({ size = 18, color = 'currentColor' }) {
    return (
        <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes loaderSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes loaderSplitTop {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-3.5px); }
                }
                @keyframes loaderSplitBottom {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(3.5px); }
                }
                .loader-svg {
                    animation: loaderSpin 1.4s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
                    overflow: visible;
                }
                .loader-top {
                    animation: loaderSplitTop 1.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
                }
                .loader-bottom {
                    animation: loaderSplitBottom 1.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
                }
            `}} />
            <svg 
                viewBox="0 0 24 24" 
                className="loader-svg w-full h-full"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
            >
                {/* Top half of capsule */}
                <path 
                    d="M 6 11 A 6 6 0 0 1 18 11 L 18 7 A 6 6 0 0 0 6 7 Z" 
                    fill={color}
                    className="loader-top"
                    style={{ transformOrigin: '12px 12px' }}
                />
                {/* Bottom half of capsule */}
                <path 
                    d="M 6 13 A 6 6 0 0 0 18 13 L 18 17 A 6 6 0 0 1 6 17 Z" 
                    className="loader-bottom"
                    style={{ transformOrigin: '12px 12px', stroke: color }}
                />
            </svg>
        </span>
    );
}
