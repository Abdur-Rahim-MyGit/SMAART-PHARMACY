import React, { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  "Checking Inventory...",
  "Loading Dashboard...",
  "Syncing Medicines...",
  "Preparing Analytics...",
  "Securing Patient Data...",
  "Loading complete."
];

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // 0.0s: Soft white background with floating particles (default Phase 0)
    const t1 = setTimeout(() => setPhase(1), 400);   // 0.4s: Logo base fades in
    const t2 = setTimeout(() => setPhase(2), 800);  // 0.8s: Glowing ECG heartbeat
    const t3 = setTimeout(() => setPhase(3), 1300);  // 1.3s: Medical icons softly appear
    const t4 = setTimeout(() => setPhase(4), 1800);  // 1.8s: Transition into final logo
    const t5 = setTimeout(() => setPhase(5), 2200);  // 2.2s: Logo gently scales
    const t6 = setTimeout(() => setPhase(6), 2600);  // 2.6s: Typography appears
    const t7 = setTimeout(() => setPhase(7), 3000);  // 3.0s: Loading indicator appears
    
    // Message cycling
    let msgInterval;
    const t8 = setTimeout(() => {
      msgInterval = setInterval(() => {
        setMsgIndex(prev => {
          if (prev < LOADING_MESSAGES.length - 1) return prev + 1;
          clearInterval(msgInterval);
          return prev;
        });
      }, 250); // Faster cycling to fit 5s
    }, 3000);

    // Fade and zoom into dashboard
    const t9 = setTimeout(() => setPhase(8), 4500); 
    const t10 = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10].forEach(clearTimeout);
      clearInterval(msgInterval);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[var(--bg-primary)] flex items-center justify-center flex-col overflow-hidden transition-all duration-[800ms] ease-in-out ${phase >= 8 ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
        
        {/* Floating Particles Background */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
           <div className="medical-particles" />
        </div>

        {/* Central Animation Container */}
        <div className={`relative flex flex-col items-center justify-center transition-transform duration-[1200ms] ease-out ${phase >= 5 ? 'scale-100' : 'scale-[1.05]'} ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
           
           {/* Visual Brand Mark */}
           <div className="relative w-48 h-48 flex items-center justify-center">
              
              {/* Orbital Rings */}
              <svg className={`absolute inset-0 w-full h-full transition-all duration-[1200ms] ease-out ${phase >= 4 ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="url(#ring-grad)" strokeWidth="1.5" 
                          strokeDasharray="400" strokeDashoffset={phase >= 4 ? "0" : "400"} 
                          className="transition-all duration-[1500ms] ease-in-out" />
                  
                  {/* Orbiting Elements */}
                  <circle cx="12" cy="120" r="4.5" fill="#22D3EE" className={`transition-opacity duration-700 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`} />
                  <circle cx="180" cy="50" r="3" fill="#10B981" className={`transition-opacity duration-700 delay-150 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`} />
                  <circle cx="130" cy="12" r="2" fill="#0F172A" className={`transition-opacity duration-700 delay-300 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`} />
                  <circle cx="70" cy="188" r="2.5" fill="#10B981" className={`transition-opacity duration-700 delay-[400ms] ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`} />
                  
                  <defs>
                     <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--bg-secondary)" stopOpacity="0.8" />
                     </linearGradient>
                  </defs>
              </svg>

              {/* Central Medical Cross */}
              <div className={`absolute transition-all duration-[1200ms] ease-in-out origin-center ${
                  phase >= 4 ? 'scale-90 -translate-x-3 -translate-y-3 opacity-100' : 
                  phase >= 1 ? 'scale-110 translate-x-0 translate-y-0 opacity-70 blur-[1px]' : 
                  'scale-50 opacity-0 blur-md'
              }`}>
                 <svg width="70" height="70" viewBox="0 0 100 100">
                    <path d="M35 15 h30 v20 h20 v30 h-20 v20 h-30 v-20 h-20 v-30 h20 z" fill="url(#cross-grad)" rx="5" ry="5"/>
                    <defs>
                       <linearGradient id="cross-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--bg-secondary)" />
                          <stop offset="100%" stopColor="var(--brand)" />
                       </linearGradient>
                    </defs>
                 </svg>
              </div>

              {/* Glowing ECG Heartbeat (1.0s to 2.2s) */}
              <div className={`absolute transition-all duration-[800ms] ease-in-out ${
                  phase >= 4 ? 'opacity-0 scale-75 blur-sm' : 
                  phase >= 2 ? 'opacity-100 scale-100 blur-0' : 
                  'opacity-0 scale-90 blur-sm'
              }`}>
                  <svg width="140" height="70" viewBox="0 0 140 70" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 207, 234, 0.6))' }}>
                     <path d="M10 35 L30 35 L40 15 L55 55 L70 20 L80 40 L90 35 L130 35" 
                           fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                           strokeDasharray="250" strokeDashoffset={phase >= 2 && phase < 4 ? "0" : "250"} 
                           className="transition-all duration-[1200ms] ease-out" />
                  </svg>
              </div>

              {/* Orbiting Medical Icons (1.6s to 2.2s) */}
              <div className={`absolute inset-0 transition-all duration-700 ${phase >= 3 && phase < 4 ? 'opacity-100 animate-spin-slow' : 'opacity-0 scale-50'}`}>
                  <span className="absolute top-2 left-8 text-cyan-400 material-symbols-rounded drop-shadow-md text-xl">medication</span>
                  <span className="absolute bottom-4 right-8 text-emerald-400 material-symbols-rounded drop-shadow-md text-xl">shield_plus</span>
                  <span className="absolute top-1/2 -right-2 text-[var(--text-muted)] material-symbols-rounded drop-shadow-md text-xl">inventory_2</span>
              </div>

              {/* Capsule & Leaf (Assembles into logo at 2.2s) */}
              <div className={`absolute z-10 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-center ${
                  phase >= 4 ? 'scale-100 translate-x-[12px] translate-y-[12px] opacity-100 rotate-[-40deg]' : 
                  'scale-50 translate-x-[60px] translate-y-[60px] opacity-0 rotate-0'
              }`}>
                  {/* Two-tone Capsule */}
                  <svg width="56" height="26" viewBox="0 0 100 46" style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}>
                     <rect x="0" y="0" width="50" height="46" rx="23" fill="var(--brand)" />
                     <rect x="50" y="0" width="50" height="46" rx="23" fill="var(--bg-secondary)" />
                     <path d="M50 0 v46" stroke="#FFFFFF" strokeWidth="2.5" />
                     <path d="M10 12 Q25 5 40 12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
              </div>
              
              <div className={`absolute z-20 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-75 ${
                  phase >= 4 ? 'scale-100 translate-x-[32px] translate-y-[28px] opacity-100 rotate-0' : 
                  'scale-0 translate-x-[60px] translate-y-[60px] opacity-0 rotate-[45deg]'
              }`}>
                  {/* Green Leaf */}
                  <svg width="34" height="34" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.2))' }}>
                     <path d="M10 90 C 10 30, 90 10, 90 10 C 90 90, 30 90, 10 90 Z" fill="#10B981" />
                     <path d="M10 90 Q40 60 90 10" fill="none" stroke="#047857" strokeWidth="2" strokeOpacity="0.2" />
                  </svg>
              </div>
           </div>

           {/* Elegant Typography (3.2s) */}
           <div className={`flex flex-col items-center mt-8 transition-all duration-[800ms] ease-out ${
               phase >= 6 ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-6 blur-sm'
           }`}>
              <h1 className="text-[2.75rem] font-black tracking-[-0.04em] flex items-center">
                 <span style={{ color: 'var(--text-primary)' }}>SMA</span>
                 <span style={{ background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--brand) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ART</span>
              </h1>
              <div className="flex items-center justify-center gap-3 mt-1.5 w-full max-w-[240px]">
                 <div className="h-[1px] bg-[var(--card-border)] flex-1" />
                 <h2 className="text-[11px] font-bold tracking-[0.35em] text-[var(--text-primary)] uppercase">PHARMACY</h2>
                 <div className="h-[1px] bg-[var(--card-border)] flex-1" />
              </div>
              <h3 className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] mt-2.5 uppercase">
                 MANAGEMENT SYSTEM
              </h3>
           </div>

           {/* Loading Indicator & Messages (3.8s) */}
           <div className={`flex flex-col items-center mt-12 transition-all duration-[600ms] ease-in ${
               phase >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
           }`}>
              
              {/* Animated Capsule Loader */}
              <div className="relative w-10 h-3.5 rounded-full border border-[var(--card-border)] overflow-hidden bg-[var(--bg-secondary)] flex shadow-inner">
                 <div className="w-1/2 h-full bg-cyan-400 opacity-90" />
                 <div className="w-1/2 h-full bg-emerald-400 opacity-90" />
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-[200%] h-full animate-[shimmer_1.2s_infinite_linear] -translate-x-full" />
              </div>
              
              {/* Scrolling Loading Messages */}
              <div className="mt-5 h-[16px] overflow-hidden relative w-64 flex justify-center">
                 <div className="flex flex-col transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" 
                      style={{ transform: `translateY(-${msgIndex * 16}px)` }}>
                    {LOADING_MESSAGES.map((msg, i) => (
                       <span key={i} className={`text-[11px] h-[16px] flex items-center justify-center tracking-wide
                           ${i === LOADING_MESSAGES.length - 1 ? 'text-emerald-500 font-bold' : 'text-[var(--text-secondary)] font-medium'}`}>
                          {msg}
                       </span>
                    ))}
                 </div>
              </div>
           </div>

        </div>

        {/* Inline Styles for Particles & Animations */}
        <style dangerouslySetInnerHTML={{__html: `
          .animate-spin-slow {
             animation: spin 10s linear infinite;
          }
          @keyframes shimmer {
             0% { transform: translateX(-100%); }
             100% { transform: translateX(100%); }
          }
          .medical-particles {
             position: absolute;
             width: 100%;
             height: 100%;
             background-image: 
                radial-gradient(circle at 10% 20%, rgba(34, 211, 238, 0.12) 3px, transparent 4px),
                radial-gradient(circle at 90% 40%, rgba(16, 185, 129, 0.1) 2.5px, transparent 3px),
                radial-gradient(circle at 40% 80%, rgba(15, 23, 42, 0.05) 4px, transparent 5px),
                radial-gradient(circle at 80% 90%, rgba(34, 211, 238, 0.08) 2px, transparent 2.5px),
                radial-gradient(circle at 25% 60%, rgba(16, 185, 129, 0.06) 3px, transparent 3.5px);
             background-size: 150% 150%;
             animation: floatParticles 18s ease-in-out infinite alternate;
          }
          @keyframes floatParticles {
             0% { background-position: 0% 0%; transform: scale(1); }
             100% { background-position: 100% 100%; transform: scale(1.05); }
          }
        `}} />
    </div>
  );
}
