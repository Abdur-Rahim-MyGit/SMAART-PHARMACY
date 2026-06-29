import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login, isAuthenticated, error: authError, user } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [focused, setFocused] = useState(null);
    const [shouldShake, setShouldShake] = useState(false);
    const [showStat, setShowStat] = useState(false);
    
    // Transition state management
    const [transitionPhase, setTransitionPhase] = useState('idle');
    const [logoOpacityClass, setLogoOpacityClass] = useState('opacity-0');
    const [successRole, setSuccessRole] = useState('');

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(user.role === 'Pharmacist' ? '/medicines' : '/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        const timer = setTimeout(() => setShowStat(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        
        if (!username || !password) {
            setLocalError('Please fill in both fields.');
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
            return;
        }

        setIsSubmitting(true);
        setTransitionPhase('signing-in');

        const startTime = Date.now();
        const result = await login(username, password);
        const elapsed = Date.now() - startTime;
        const delay = Math.max(500 - elapsed, 0);
        await new Promise(resolve => setTimeout(resolve, delay));

        setIsSubmitting(false);

        if (result.success) {
            localStorage.setItem('justLoggedIn', 'true');
            const targetRole = result.user?.role || 'Pharmacist';
            setSuccessRole(targetRole);

            // Step 2: Entire login page fades to dark #0A0A0A — 400ms fade
            setTransitionPhase('fade-to-black');
            await new Promise(resolve => setTimeout(resolve, 400));

            // Step 3: Center of screen shows logo — fades in over 300ms, holds for 700ms (total 1000ms)
            setTransitionPhase('show-logo');
            setTimeout(() => setLogoOpacityClass('opacity-100'), 50);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 4: Fades out — 300ms
            setLogoOpacityClass('opacity-0');
            setTransitionPhase('fade-out');
            await new Promise(resolve => setTimeout(resolve, 300));

            // Step 5: Dashboard loads
            navigate(targetRole === 'Pharmacist' ? '/medicines' : '/dashboard');
        } else {
            setTransitionPhase('idle');
            setLocalError(result.message || 'Authentication failed. Please check your credentials.');
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
        }
    };

    const handleFocus = (field) => setFocused(field);
    const handleBlur = () => setFocused(null);

    const displayError = localError || authError;

    return (
        <div
            className={`min-h-screen w-screen relative overflow-hidden flex transition-all duration-400 select-none ${
                transitionPhase === 'fade-to-black' || transitionPhase === 'show-logo' || transitionPhase === 'fade-out'
                    ? 'bg-[var(--app-bg)]'
                    : 'bg-[var(--app-bg)]'
            }`}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes cardShake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                .shake-card {
                    animation: cardShake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes pulseSlow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulseSlow 8s ease-in-out infinite;
                }
            `}} />

            {/* Split Panels Container */}
            <div className={`w-full min-h-screen flex flex-col lg:flex-row transition-opacity duration-400 ${
                transitionPhase !== 'idle' && transitionPhase !== 'signing-in' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
                
                {/* ════════════════════════════════════════
                    LEFT PANEL — Product Story Side
                    ════════════════════════════════════════ */}
                <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand)] relative flex-col justify-between p-16 overflow-hidden border-r border-[var(--card-border)]">
                    {/* Subtle animated gradient orb bottom-left */}
                    <div 
                        className="absolute -bottom-20 -left-20 w-[450px] h-[450px] rounded-full pointer-events-none mix-blend-screen animate-pulse-slow"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                            filter: 'blur(55px)',
                        }}
                    />

                    {/* TOP: Logo mark + name */}
                    <div className="flex items-center gap-3 z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15 border border-white/30 flex-shrink-0">
                            <span className="text-xl select-none">💊</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black tracking-tight leading-none text-white font-serif" style={{ fontFamily: "'Lora', serif" }}>SMAART</span>
                            <span className="text-[9px] font-bold tracking-widest text-white/80 uppercase leading-none mt-1">PHARMACY</span>
                        </div>
                    </div>

                    {/* MIDDLE: Headline */}
                    <div className="flex flex-col gap-6 my-auto z-10 max-w-md">
                        <h1 className="text-4xl font-extrabold text-white leading-tight font-serif" style={{ fontFamily: "'Lora', serif" }}>
                            Pharmacy Operations,<br />Fully Visible.
                        </h1>
                        <p className="text-sm text-white/80">
                            Real-time intelligence for Indian multi-branch pharmacy chains.
                        </p>
                        
                        {/* DIVIDER: thin line, 40px wide */}
                        <div className="h-[1px] bg-white/30 w-10 my-2" />

                        {/* THREE PROOF POINTS */}
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white text-sm flex-shrink-0">
                                    🏥
                                </span>
                                <span className="text-xs font-semibold text-white/90">Multi-branch inventory in real time</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white text-sm flex-shrink-0">
                                    ⏳
                                </span>
                                <span className="text-xs font-semibold text-white/90">Expiry risk surfaced before it costs you</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white text-sm flex-shrink-0">
                                    🔒
                                </span>
                                <span className="text-xs font-semibold text-white/90">Complete audit trail, compliance ready</span>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Subtle animated stat */}
                    <div className={`mt-auto transition-all duration-1000 z-10 ${showStat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <p className="text-xs italic text-white/70 font-medium font-serif" style={{ fontFamily: "'Lora', serif" }}>
                            "₹11,830 in dead stock identified on first day of deployment."
                        </p>
                    </div>
                </div>

                {/* ════════════════════════════════════════
                    RIGHT PANEL — Login Form Side
                    ════════════════════════════════════════ */}
                <div className="w-full lg:w-1/2 bg-[var(--card-bg)] flex flex-col justify-between p-8 md:p-16 relative">
                    {/* Top Right: Secure Healthcare Platform */}
                    <div className="hidden sm:block absolute top-8 right-8 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                        Secure Healthcare Platform · v1.0
                    </div>

                    {/* Center the login form */}
                    <div className={`my-auto w-full max-w-[400px] mx-auto flex flex-col gap-6 ${shouldShake ? 'shake-card' : ''}`}>
                        
                        {/* Responsive Header for Mobile & Tablet */}
                        <div className="lg:hidden flex flex-col items-center mb-4 text-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--brand-dim)] border border-[var(--brand)]/30 flex-shrink-0 animate-pulse">
                                    <span className="text-xl select-none">💊</span>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-lg font-black tracking-tight leading-none text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>SMAART</span>
                                    <span className="text-[9px] font-bold tracking-widest text-[var(--brand)] uppercase leading-none mt-1">PHARMACY</span>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                                Real-time intelligence for Indian multi-branch pharmacy chains
                            </p>
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-1.5 text-center lg:text-left">
                            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] font-serif tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                                Welcome Back
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Sign in to your pharmacy dashboard
                            </p>
                        </div>

                        {/* Error State */}
                        {displayError && (
                            <div
                                className="flex items-center gap-3 p-3.5 rounded-xl text-xs animate-fade-in bg-[var(--card-border)]/20 border border-[var(--text-danger)]/20 text-[var(--text-danger)]"
                            >
                                <span className="material-symbols-rounded text-base flex-shrink-0">error</span>
                                <span className="font-semibold">{displayError}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Username */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Username
                                </label>
                                <div className="relative">
                                    <span
                                        className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none transition-colors duration-200"
                                        style={{ color: focused === 'username' ? 'var(--brand)' : 'var(--text-muted)' }}
                                    >
                                        person
                                    </span>
                                    <input
                                        id="login-username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        onFocus={() => handleFocus('username')}
                                        onBlur={handleBlur}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 outline-none bg-[var(--app-bg)] text-[var(--text-primary)] border"
                                        style={{
                                            borderColor: focused === 'username' ? 'var(--brand)' : 'var(--card-border)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Password
                                </label>
                                <div className="relative">
                                    <span
                                        className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none transition-colors duration-200"
                                        style={{ color: focused === 'password' ? 'var(--brand)' : 'var(--text-muted)' }}
                                    >
                                        lock
                                    </span>
                                    <input
                                        id="login-password"
                                        type={showPass ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => handleFocus('password')}
                                        onBlur={handleBlur}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl text-xs font-semibold transition-all duration-200 outline-none bg-[var(--app-bg)] text-[var(--text-primary)] border"
                                        style={{
                                            borderColor: focused === 'password' ? 'var(--brand)' : 'var(--card-border)',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                    >
                                        <span className="material-symbols-rounded text-base">
                                            {showPass ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Role indicator after successful login */}
                            {successRole && (
                                <div className="text-xs font-semibold text-[var(--brand)] text-center lg:text-left animate-pulse py-1">
                                    Logged in as {successRole} — redirecting to your dashboard...
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isSubmitting || !!successRole}
                                className="mt-2 w-full py-3.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg bg-[var(--brand)] hover:shadow-xl"
                            >
                                {isSubmitting || successRole ? (
                                    <>
                                        <span className="material-symbols-rounded animate-spin text-base">sync</span>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <span className="material-symbols-rounded text-base">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer info */}
                        <p className="text-center text-xs text-[var(--text-secondary)]">
                            Session-based authentication · Cookies required
                        </p>
                    </div>

                    {/* Bottom branding footer */}
                    <div className="text-center text-xs text-[var(--text-secondary)] select-none">
                        © 2026 SMAART Healthcare Systems Private Limited.
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════
                LOGIN TRANSITION OVERLAY
                ════════════════════════════════════════ */}
            {(transitionPhase === 'show-logo' || transitionPhase === 'fade-out') && (
                <div 
                    className={`absolute inset-0 flex flex-col items-center justify-center z-50 bg-[var(--app-bg)] transition-opacity duration-300 ${logoOpacityClass}`}
                >
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="text-6xl select-none animate-bounce">💊</span>
                        <div className="flex flex-col items-center mt-2">
                            <span className="text-4xl font-black text-[var(--text-primary)] font-serif tracking-tight leading-none" style={{ fontFamily: "'Lora', serif" }}>
                                SMAART
                            </span>
                            <span className="text-xs font-bold tracking-[0.3em] text-[var(--brand)] uppercase mt-2">
                                PHARMACY
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
