import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TabletIllustration from '../components/TabletIllustration';
import TabletLoader from '../components/TabletLoader';

export default function Login() {
    const { login, isAuthenticated, error: authError } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [focused, setFocused] = useState(null);
    const [tabletState, setTabletState] = useState('idle');
    const [shouldShake, setShouldShake] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    // Reset error animation state when starting to type
    useEffect(() => {
        if (tabletState === 'error') {
            setTabletState('idle');
        }
    }, [username, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        
        if (!username || !password) {
            setLocalError('Please fill in both fields.');
            setTabletState('error');
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
            return;
        }

        setIsSubmitting(true);
        setTabletState('loading');

        // Artificial delay for a better viewing experience of the cute loader
        const [result] = await Promise.all([
            login(username, password),
            new Promise(resolve => setTimeout(resolve, 1200))
        ]);

        setIsSubmitting(false);

        if (result.success) {
            setTabletState('success');
            localStorage.setItem('justLoggedIn', 'true');
            // Allow success animation to complete before navigating
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } else {
            setLocalError(result.message || 'Authentication failed. Please check your credentials.');
            setTabletState('error');
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
        }
    };

    const handleFocus = (field) => {
        setFocused(field);
        if (tabletState !== 'error' && tabletState !== 'success' && tabletState !== 'loading') {
            if (field === 'username') setTabletState('typing-username');
            if (field === 'password') setTabletState('typing-password');
        }
    };

    const handleBlur = () => {
        setFocused(null);
        if (tabletState !== 'error' && tabletState !== 'success' && tabletState !== 'loading') {
            setTabletState('idle');
        }
    };

    const displayError = localError || authError;

    return (
        <div
            className="min-h-screen w-screen flex items-center justify-center px-4 relative overflow-hidden"
            style={{ background: 'var(--canvas)' }}
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
            `}} />

            {/* Background glows */}
            <div
                className="absolute pointer-events-none"
                style={{
                    width: '600px', height: '600px',
                    top: '-200px', left: '50%', transform: 'translateX(-50%)',
                    background: 'radial-gradient(circle, rgba(0,194,204,0.06) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    width: '400px', height: '400px',
                    bottom: '-100px', right: '-100px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Card */}
            <div
                className={`w-full max-w-[420px] rounded-3xl p-8 relative animate-slide-up ${shouldShake ? 'shake-card' : ''}`}
                style={{
                    background: 'rgba(15, 20, 32, 0.95)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(24px)',
                }}
            >
                {/* Top brand accent line */}
                <div
                    className="absolute top-0 left-8 right-8 h-[1px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,204,0.6), transparent)' }}
                />

                {/* Logo + brand */}
                <div className="flex flex-col items-center mb-6">
                    {/* Cute responsive tablet animation */}
                    <TabletIllustration state={tabletState} />

                    <h1 className="text-xl font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Welcome Back
                    </h1>
                    <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                        Sign in to SMAART Pharmacy Platform
                    </p>
                </div>

                {/* Error state */}
                {displayError && (
                    <div
                        className="flex items-center gap-3 p-3 rounded-xl mb-5 text-xs animate-fade-in"
                        style={{
                            background: 'rgba(248, 113, 113, 0.08)',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            color: '#fca5a5',
                        }}
                    >
                        <span className="material-symbols-rounded text-base flex-shrink-0" style={{ color: '#f87171' }}>error</span>
                        <span className="font-medium">{displayError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Username */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Username
                        </label>
                        <div className="relative">
                            <span
                                className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none transition-colors duration-200"
                                style={{ color: focused === 'username' ? '#00c2cc' : 'var(--text-muted)' }}
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
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                                style={{
                                    background: focused === 'username' ? 'rgba(0,194,204,0.05)' : 'rgba(255,255,255,0.04)',
                                    border: focused === 'username' ? '1px solid rgba(0,194,204,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--text-primary)',
                                    caretColor: '#00c2cc',
                                }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Password
                        </label>
                        <div className="relative">
                            <span
                                className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none transition-colors duration-200"
                                style={{ color: focused === 'password' ? '#00c2cc' : 'var(--text-muted)' }}
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
                                className="w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                                style={{
                                    background: focused === 'password' ? 'rgba(0,194,204,0.05)' : 'rgba(255,255,255,0.04)',
                                    border: focused === 'password' ? '1px solid rgba(0,194,204,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--text-primary)',
                                    caretColor: '#00c2cc',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <span className="material-symbols-rounded text-base">
                                    {showPass ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: isSubmitting || tabletState === 'success'
                                ? 'rgba(0,194,204,0.5)'
                                : 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)',
                            color: '#0a0d14',
                            boxShadow: isSubmitting || tabletState === 'success' ? 'none' : '0 4px 24px rgba(0,194,204,0.3)',
                        }}
                        onMouseEnter={e => { if (!isSubmitting && tabletState !== 'success') e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,194,204,0.45)'; }}
                        onMouseLeave={e => { if (!isSubmitting && tabletState !== 'success') e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,194,204,0.3)'; }}
                    >
                        {isSubmitting ? (
                            <>
                                <TabletLoader size={16} color="#0a0d14" />
                                <span>Authenticating…</span>
                            </>
                        ) : tabletState === 'success' ? (
                            <>
                                <span className="material-symbols-rounded text-base">check_circle</span>
                                <span>Success!</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <span className="material-symbols-rounded text-base">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>


                {/* Footer note */}
                <p className="mt-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Session-based authentication · Cookies required
                </p>
            </div>
        </div>
    );
}

