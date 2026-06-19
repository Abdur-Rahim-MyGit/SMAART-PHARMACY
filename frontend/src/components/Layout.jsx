import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
    {
        to: '/dashboard',
        icon: 'dashboard',
        label: 'Analytics Dashboard',
        sublabel: 'Operational metrics',
    },
    {
        to: '/expiry-dashboard',
        icon: 'hourglass_empty',
        label: 'Expiry Intelligence',
        sublabel: 'Risk & dead stock',
    },
    {
        to: '/medicines',
        end: true,
        icon: 'layers',
        label: 'Medicine Ledger',
        sublabel: 'Stock catalog',
    },
    {
        to: '/medicines/add',
        icon: 'add_circle',
        label: 'Add Medicine',
        sublabel: 'New catalog entry',
    },
    {
        to: '/inventory/history',
        icon: 'swap_vert',
        label: 'Stock Movements',
        sublabel: 'Audit trail',
    },
    {
        to: '/inventory/transaction-new',
        icon: 'edit_note',
        label: 'New Transaction',
        sublabel: 'Record movement',
    },
];

const PAGE_LABELS = {
    '/dashboard': { title: 'Analytics Dashboard', sub: 'Pharmacy metrics and intelligence' },
    '/expiry-dashboard': { title: 'Expiry Intelligence', sub: 'Risk analysis and stock actions' },
    '/medicines': { title: 'Medicine Ledger', sub: 'Manage your pharmacy catalog' },
    '/medicines/add': { title: 'Add Medicine', sub: 'Create a new catalog entry' },
    '/inventory/history': { title: 'Stock Movements', sub: 'Complete audit trail' },
    '/inventory/transaction-new': { title: 'New Transaction', sub: 'Record a stock movement' },
    '/pharmacies': { title: 'Pharmacy Management', sub: 'Manage organization branches' },
    '/users': { title: 'User Account Management', sub: 'Manage system users and access roles' },
    '/emergency-support': { title: 'Emergency Support Center', sub: 'Coordinate emergency stock transfers across branches' },
};

function getPageMeta(pathname) {
    if (pathname.startsWith('/medicines/edit/')) return { title: 'Edit Medicine', sub: 'Update catalog record' };
    if (pathname.startsWith('/medicines/') && pathname !== '/medicines/add') return { title: 'Medicine Details', sub: 'Full record view' };
    if (pathname.startsWith('/inventory/transaction/')) return { title: 'Transaction Receipt', sub: 'Movement audit log' };
    if (pathname.startsWith('/pharmacies/')) return { title: 'Branch Details', sub: 'Branch performance and statistics' };
    if (pathname.startsWith('/users/') && pathname !== '/users') return { title: 'User Profile Details', sub: 'View user profile and audit logs' };
    return PAGE_LABELS[pathname] || { title: 'SMAART Pharmacy', sub: 'Intelligence Platform' };
}

export default function Layout() {
    const { user, logout, activeBranch, switchBranch } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const pageMeta = getPageMeta(pathname);

    // ── Guide Modal State ──
    const [isGuideOpen, setIsGuideOpen] = useState(true);
    const [guideTab, setGuideTab] = useState('workflow');
    const [activeWorkflowRole, setActiveWorkflowRole] = useState('Pharmacist');

    useEffect(() => {
        if (user?.role) {
            setActiveWorkflowRole(user.role);
        }
    }, [user]);

    useEffect(() => {
        const handleOpenGuide = (e) => {
            setIsGuideOpen(true);
            if (e.detail) {
                setGuideTab(e.detail);
            }
        };
        window.addEventListener('open-system-guide', handleOpenGuide);

        // Check for immediate onboarding flash after login
        const justLoggedIn = localStorage.getItem('justLoggedIn');
        if (justLoggedIn === 'true') {
            setIsGuideOpen(true);
            setGuideTab('workflow');
            localStorage.removeItem('justLoggedIn');
        }

        return () => window.removeEventListener('open-system-guide', handleOpenGuide);
    }, []);

    // ── Branches & Alerts Polling State ──
    const [branches, setBranches] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchAlertCount = async () => {
        try {
            const res = await fetch('/api/alerts');
            if (res.ok) {
                const alerts = await res.json();
                setUnreadCount(alerts.length);
            }
        } catch (err) {
            console.error('Error fetching alerts count:', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAlertCount();
            const interval = setInterval(fetchAlertCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user, activeBranch]);

    useEffect(() => {
        if (user?.role === 'Admin') {
            const fetchBranches = async () => {
                try {
                    const res = await fetch('/api/analytics/admin/branches');
                    if (res.ok) {
                        const data = await res.json();
                        setBranches(data);
                    }
                } catch (err) {
                    console.error('Error fetching branches list:', err);
                }
            };
            fetchBranches();
        }
    }, [user]);

    // ── RBAC Navigation Setup ──
    const navItems = [
        {
            to: '/dashboard',
            icon: 'dashboard',
            label: 'Analytics Dashboard',
            sublabel: 'Operational metrics',
        }
    ];

    if (user?.role === 'Admin') {
        navItems.push(
            {
                to: '/branch-comparison',
                icon: 'compare_arrows',
                label: 'Branch Comparison',
                sublabel: 'Compare locations',
            },
            {
                to: '/pharmacies',
                icon: 'storefront',
                label: 'Branches',
                sublabel: 'Manage branches',
            },
            {
                to: '/users',
                icon: 'group',
                label: 'Users',
                sublabel: 'Manage accounts',
            },
            {
                to: '/medicines',
                end: true,
                icon: 'layers',
                label: 'Medicine Ledger',
                sublabel: 'Stock catalog',
            },
            {
                to: '/inventory/history',
                icon: 'swap_vert',
                label: 'Stock Movements',
                sublabel: 'Audit trail',
            },
            {
                to: '/reorder-intelligence',
                icon: 'shopping_cart',
                label: 'Reorder Center',
                sublabel: 'Auto replenish',
            },
            {
                to: '/suppliers',
                icon: 'handshake',
                label: 'Suppliers',
                sublabel: 'Manage suppliers',
            },
            {
                to: '/purchase-orders',
                icon: 'receipt_long',
                label: 'Purchase Orders',
                sublabel: 'Procurement POs',
            },
            {
                to: '/revenue',
                icon: 'show_chart',
                label: 'Revenue Analytics',
                sublabel: 'Sales & profits margins',
            },
            {
                to: '/emergency-support',
                icon: 'emergency',
                label: 'Emergency Support',
                sublabel: 'Network transfer helper',
            }
        );
    } else if (user?.role === 'Manager') {
        navItems.push(
            {
                to: `/pharmacies/${user?.pharmacy?.id || ''}`,
                icon: 'storefront',
                label: 'My Branch',
                sublabel: 'Branch details & stats',
            },
            {
                to: '/expiry-dashboard',
                icon: 'hourglass_empty',
                label: 'Expiry Intelligence',
                sublabel: 'Risk & dead stock',
            },
            {
                to: '/medicines',
                end: true,
                icon: 'layers',
                label: 'Medicine Ledger',
                sublabel: 'Stock catalog',
            },
            {
                to: '/inventory/history',
                icon: 'swap_vert',
                label: 'Stock Movements',
                sublabel: 'Audit trail',
            },
            {
                to: '/reorder-intelligence',
                icon: 'shopping_cart',
                label: 'Reorder Center',
                sublabel: 'Auto replenish',
            },
            {
                to: '/suppliers',
                icon: 'handshake',
                label: 'Suppliers',
                sublabel: 'View suppliers',
            },
            {
                to: '/purchase-orders',
                icon: 'receipt_long',
                label: 'Purchase Orders',
                sublabel: 'Procurement POs',
            },
            {
                to: '/revenue',
                icon: 'show_chart',
                label: 'Revenue Analytics',
                sublabel: 'Sales & profits margins',
            },
            {
                to: '/emergency-support',
                icon: 'emergency',
                label: 'Emergency Support',
                sublabel: 'Network transfer helper',
            }
        );
    } else if (user?.role === 'Pharmacist') {
        navItems.push(
            {
                to: `/pharmacies/${user?.pharmacy?.id || ''}`,
                icon: 'storefront',
                label: 'My Branch',
                sublabel: 'Branch info',
            },
            {
                to: '/medicines',
                end: true,
                icon: 'layers',
                label: 'Medicine Ledger',
                sublabel: 'Stock catalog',
            },
            {
                to: '/inventory/transaction-new',
                icon: 'edit_note',
                label: 'New Transaction',
                sublabel: 'Record movement',
            },
            {
                to: '/emergency-support',
                icon: 'emergency',
                label: 'Emergency Support',
                sublabel: 'Network transfer helper',
            }
        );
    }

    // ── Spotlight Command Center State ──
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [spotlightQuery, setSpotlightQuery] = useState('');
    const [spotlightMeds, setSpotlightMeds] = useState([]);
    const [isSpotlightLoading, setIsSpotlightLoading] = useState(false);
    const [spotlightSelectedIndex, setSpotlightSelectedIndex] = useState(0);

    const quickActions = [
        { id: 'add-med', title: 'Add Medicine', subtitle: 'Create a new catalog entry', icon: 'add_circle', path: '/medicines/add' },
        { id: 'new-tx', title: 'New Transaction', subtitle: 'Record stock movement', icon: 'edit_note', path: '/inventory/transaction-new' },
        { id: 'exp-intel', title: 'Expiry Intelligence', subtitle: 'Risk & dead stock analysis', icon: 'hourglass_empty', path: '/expiry-dashboard' },
        { id: 'dashboard', title: 'Analytics Dashboard', subtitle: 'Operational metrics dashboard', icon: 'dashboard', path: '/dashboard' },
        { id: 'ledger', title: 'Medicine Ledger', subtitle: 'Manage stock catalog', icon: 'layers', path: '/medicines' },
        { id: 'history', title: 'Stock Movements Audit', subtitle: 'Audit log trail', icon: 'swap_vert', path: '/inventory/history' },
    ];

    const filteredActions = quickActions.filter(a =>
        a.title.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(spotlightQuery.toLowerCase())
    );

    const filteredMeds = spotlightMeds.filter(m =>
        m.name.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
        m.ndc.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
        (m.supplier && m.supplier.toLowerCase().includes(spotlightQuery.toLowerCase()))
    );

    const spotlightItems = [
        ...filteredActions,
        ...filteredMeds.map(m => ({
            id: m._id,
            title: m.name,
            subtitle: `${m.category} • NDC: ${m.ndc} • Stock: ${m.stock} units`,
            icon: 'medication',
            path: `/medicines/${m._id}`
        }))
    ];

    // Fetch medicines when spotlight opens
    useEffect(() => {
        if (isSpotlightOpen) {
            const fetchMeds = async () => {
                setIsSpotlightLoading(true);
                try {
                    const res = await fetch('/api/medicines');
                    if (res.ok) {
                        const data = await res.json();
                        setSpotlightMeds(data);
                    }
                } catch (err) {
                    console.error('Error fetching medicines for spotlight:', err);
                } finally {
                    setIsSpotlightLoading(false);
                }
            };
            fetchMeds();
            setSpotlightSelectedIndex(0);
            setSpotlightQuery('');
        }
    }, [isSpotlightOpen]);

    // Handle K / Ctrl+K / Cmd+K global listeners
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            
            if (
                ((e.key === 'k' || e.key === 'K') && !isInput && !e.ctrlKey && !e.metaKey) ||
                ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))
            ) {
                e.preventDefault();
                setIsSpotlightOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Handle spotlight modal arrows & navigation keys
    useEffect(() => {
        if (!isSpotlightOpen || spotlightItems.length === 0) return;

        const handleModalKeys = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSpotlightSelectedIndex(prev => (prev + 1) % spotlightItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSpotlightSelectedIndex(prev => (prev - 1 + spotlightItems.length) % spotlightItems.length);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsSpotlightOpen(false);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedItem = spotlightItems[spotlightSelectedIndex];
                if (selectedItem) {
                    navigate(selectedItem.path);
                    setIsSpotlightOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleModalKeys);
        return () => window.removeEventListener('keydown', handleModalKeys);
    }, [isSpotlightOpen, spotlightItems, spotlightSelectedIndex, navigate]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex w-screen h-screen overflow-hidden" style={{ background: 'var(--canvas)' }}>
            {/* ── Sidebar ── */}
            <aside
                className={`flex-shrink-0 flex flex-col h-full transition-all duration-300 ease-in-out relative z-20 ${
                    collapsed ? 'w-[60px]' : 'w-[160px]'
                }`}
                style={{
                    background: 'rgba(8, 10, 16, 0.4)',
                }}
            >
                {/* Sidebar brand glow accent */}
                <div
                    className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(0,194,204,0.08) 0%, transparent 70%)' }}
                />

                {/* Logo */}
                <div className={`flex items-center gap-2.5 px-4 py-2.5 relative ${collapsed ? 'justify-center' : ''}`}>
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #00c2cc 0%, #0077a8 100%)', boxShadow: '0 0 16px rgba(0,194,204,0.2)' }}
                    >
                        <span className="material-symbols-rounded text-[#0a0d14] text-base font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                            medication
                        </span>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-base font-black tracking-tight leading-none text-white font-serif" style={{ fontFamily: "'Lora', serif" }}>SMAART</span>
                            <span className="text-[11px] font-bold tracking-wider mt-0.5" style={{ color: 'var(--brand)', textShadow: '0 0 10px rgba(0,194,204,0.2)' }}>PHARMACY</span>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto scrollable">
                    {!collapsed && (
                        <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 pb-1.5" style={{ color: 'var(--text-muted)' }}>
                            Navigation
                        </span>
                    )}

                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                                `group flex items-center gap-2.5 rounded-lg transition-all duration-200 relative ${
                                    collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-1.5'
                                } ${
                                    isActive
                                        ? 'text-[#00e1f0]'
                                        : 'hover:text-[var(--text-primary)]'
                                }`
                            }
                            style={({ isActive }) => ({
                                background: isActive ? 'rgba(0, 194, 204, 0.08)' : 'transparent',
                                color: isActive ? '#00e1f0' : 'var(--text-secondary)',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                            style={{ background: '#00c2cc', boxShadow: '0 0 8px rgba(0,194,204,0.8)' }}
                                        />
                                    )}
                                    <div className="relative flex-shrink-0">
                                        <span
                                            className="material-symbols-rounded flex-shrink-0 transition-all"
                                            style={{
                                                fontSize: '18px',
                                                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        {collapsed && item.to === '/dashboard' && unreadCount > 0 && (
                                            <div className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-red-500 border border-[#0a0d14] animate-pulse" />
                                        )}
                                    </div>
                                    {!collapsed && (
                                        <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-semibold truncate leading-tight">{item.label}</span>
                                                <span className="text-[11px] truncate leading-tight opacity-60">{item.sublabel}</span>
                                            </div>
                                            {item.to === '/dashboard' && unreadCount > 0 && (
                                                <span className="flex-shrink-0 ml-1.5 w-4 h-4 rounded-full bg-red-500 text-[11px] font-black text-white flex items-center justify-center animate-pulse">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom collapse toggle */}
                <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {/* User Card / Settings Corner */}
                    {!collapsed ? (
                        <button
                            onClick={() => navigate(`/users/${user?.id}`)}
                            className="w-full text-left rounded-xl p-3 mb-3 group hover:border-[#00c2cc]/40 hover:bg-[#00c2cc]/5 transition-all duration-300 border border-white/5 cursor-pointer relative block"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all group-hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg, #00c2cc20, #007db830)', color: '#00c2cc', border: '1px solid rgba(0,194,204,0.2)' }}
                                >
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs font-semibold truncate text-[var(--text-primary)] group-hover:text-[#00e1f0] transition-colors">{user?.username}</span>
                                    <span className="text-[11px] truncate capitalize text-[var(--text-muted)] group-hover:text-white/80 transition-colors">{user?.role} Settings</span>
                                </div>
                                <span className="material-symbols-rounded text-xs text-white/30 group-hover:text-[#00e1f0] transition-colors">
                                    settings
                                </span>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate(`/users/${user?.id}`)}
                            className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-3 group hover:border-[#00c2cc]/40 hover:bg-[#00c2cc]/5 transition-all duration-300 border border-white/5 cursor-pointer flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                            title="Profile & Settings"
                        >
                            <span className="material-symbols-rounded text-base text-[var(--text-muted)] group-hover:text-[#00e1f0] transition-colors">
                                manage_accounts
                            </span>
                        </button>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-200 text-xs font-medium cursor-pointer"
                            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <span className="material-symbols-rounded text-base">
                                {collapsed ? 'chevron_right' : 'chevron_left'}
                            </span>
                            {!collapsed && <span>Collapse</span>}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-200 text-xs font-medium cursor-pointer"
                            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248, 113, 113, 0.06)'; e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                        >
                            <span className="material-symbols-rounded text-base">logout</span>
                            {!collapsed && <span>Sign Out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Area ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative" style={{ background: 'var(--canvas)' }}>

                {/* ── Top Header Bar ── */}
                <header
                    className="flex-shrink-0 flex items-center justify-between px-6 h-12 relative z-30 border-b border-white/[0.05]"
                    style={{ 
                        background: 'rgba(10, 15, 29, 0.45)', 
                        backdropFilter: 'blur(12px)', 
                        WebkitBackdropFilter: 'blur(12px)' 
                    }}
                >
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm font-bold tracking-tight text-white leading-tight" style={{ fontFamily: "'Lora', serif" }}>{pageMeta.title}</h1>
                        <p className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>{pageMeta.sub}</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Live status pill */}
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-300"
                            style={{ 
                                background: 'rgba(0,194,204,0.08)', 
                                border: '1px solid rgba(0,194,204,0.22)', 
                                color: '#00c2cc',
                                boxShadow: '0 0 10px rgba(0,194,204,0.05)'
                            }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00c2cc', boxShadow: '0 0 8px rgba(0,194,204,0.8)' }} />
                            <span>Live</span>
                        </div>

                        {/* System Guide Help Button */}
                        <button
                            onClick={() => {
                                setIsGuideOpen(true);
                                setGuideTab('workflow');
                            }}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.07] text-white/80 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.15] transition-all cursor-pointer"
                            title="System Guide & Logic Reference"
                        >
                            <span className="material-symbols-rounded text-sm">help</span>
                        </button>

                        {/* Profile Settings Button */}
                        <button
                            onClick={() => navigate(`/users/${user?.id}`)}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00c2cc]/10 border border-[#00c2cc]/20 text-[#00c2cc] hover:text-[#00e5ff] hover:bg-[#00c2cc]/20 hover:border-[#00c2cc]/40 transition-all cursor-pointer"
                            title="Profile & Settings"
                        >
                            <span className="material-symbols-rounded text-sm">settings</span>
                        </button>

                        {/* Pharmacy name pill or Branch Switcher for Admin */}
                        {user?.role === 'Admin' && branches.length > 0 ? (
                            <div
                                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-300"
                                style={{ 
                                    background: 'rgba(15,20,32,0.85)', 
                                    border: '1px solid rgba(0,194,204,0.25)', 
                                    color: 'var(--text-secondary)',
                                    boxShadow: '0 0 10px rgba(0,194,204,0.05)'
                                }}
                            >
                                <span className="material-symbols-rounded text-xs" style={{ color: 'var(--brand)' }}>storefront</span>
                                <select
                                    value={activeBranch?.id || ''}
                                    onChange={(e) => {
                                        const selected = branches.find(b => b.pharmacyId === e.target.value);
                                        if (selected) {
                                            switchBranch(selected.pharmacyId, selected.name);
                                        }
                                    }}
                                    className="bg-transparent border-none outline-none text-white font-medium cursor-pointer py-0.5 pr-0.5 text-[11px]"
                                >
                                    {branches.map(b => (
                                        <option key={b.pharmacyId} value={b.pharmacyId} className="bg-[#0f1420] text-white">
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300"
                                style={{ 
                                    background: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.07)', 
                                    color: 'var(--text-secondary)',
                                    boxShadow: '0 0 10px rgba(255,255,255,0.02)'
                                }}
                            >
                                <span className="material-symbols-rounded text-xs" style={{ color: 'var(--brand)' }}>storefront</span>
                                <span>{activeBranch?.name || user?.pharmacy?.name || 'Pharmacy'}</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Page Content ── */}
                <main className="flex-1 overflow-y-auto scrollable px-6 pt-2 pb-6 animate-fade-in relative z-10">
                    <Outlet />
                </main>
            </div>

            {/* ── Spotlight Command Center Modal ── */}
            {isSpotlightOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
                    style={{ background: 'rgba(10, 15, 29, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                    onClick={() => setIsSpotlightOpen(false)}
                >
                    <div 
                        className="w-full max-w-xl rounded-2xl overflow-hidden glass-elevated border border-white/[0.08] shadow-2xl animate-slide-up relative z-10"
                        style={{ background: 'rgba(20, 25, 41, 0.9)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search bar inside modal */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] relative">
                            <span className="material-symbols-rounded text-[#00e5ff] text-xl">search</span>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder-white/40 font-medium"
                                placeholder="Search medicines, NDC, categories, or actions..."
                                value={spotlightQuery}
                                onChange={e => {
                                    setSpotlightQuery(e.target.value);
                                    setSpotlightSelectedIndex(0);
                                }}
                                autoFocus
                            />
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono tracking-wider font-semibold text-white/50">
                                ESC
                            </div>
                        </div>

                        {/* List of items */}
                        <div className="max-h-[350px] overflow-y-auto scrollable py-2">
                            {isSpotlightLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/40">
                                    <span className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs">Fetching catalog items...</span>
                                </div>
                            ) : spotlightItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-white/40 gap-2">
                                    <span className="material-symbols-rounded text-3xl">search_off</span>
                                    <span className="text-xs">No matching entries found</span>
                                </div>
                            ) : (
                                <div>
                                    {/* Quick Actions Header if there are actions */}
                                    {spotlightItems.some(i => i.id && quickActions.some(qa => qa.id === i.id)) && (
                                        <div className="text-[11px] font-bold uppercase tracking-wider px-4 py-1 text-white/30">
                                            Quick Actions
                                        </div>
                                    )}
                                    {spotlightItems.map((item, index) => {
                                        const isSelected = index === spotlightSelectedIndex;
                                        const isMed = !quickActions.some(qa => qa.id === item.id);
                                        
                                        // Show section header for Medicine if it's the first medicine in the list
                                        const isFirstMed = isMed && (index === 0 || !spotlightMeds.some(m => m._id === spotlightItems[index - 1].id));

                                        return (
                                            <React.Fragment key={item.id}>
                                                {isFirstMed && (
                                                    <div className="text-[11px] font-bold uppercase tracking-wider px-4 py-1 mt-2 text-white/30">
                                                        Medicines
                                                    </div>
                                                )}
                                                <div
                                                    className="flex items-center justify-between px-4 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-all duration-150"
                                                    style={{
                                                        background: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                                                        border: isSelected ? '1px solid rgba(0, 229, 255, 0.15)' : '1px solid transparent',
                                                    }}
                                                    onClick={() => {
                                                        navigate(item.path);
                                                        setIsSpotlightOpen(false);
                                                    }}
                                                    onMouseEnter={() => setSpotlightSelectedIndex(index)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div 
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{ 
                                                                background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                                border: isSelected ? '1px solid rgba(0, 229, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                                color: isSelected ? '#00e5ff' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="material-symbols-rounded text-base font-bold">
                                                                {item.icon}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span 
                                                                className="text-xs font-bold leading-none truncate"
                                                                style={{ color: isSelected ? '#00e5ff' : 'var(--text-primary)' }}
                                                            >
                                                                {item.title}
                                                            </span>
                                                            <span className="text-[11px] leading-tight truncate text-white/50 mt-1">
                                                                {item.subtitle}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <span className="material-symbols-rounded text-xs text-[#00e5ff] animate-pulse">
                                                            keyboard_return
                                                        </span>
                                                    )}
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer / Shortcut Help */}
                        <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-t border-white/[0.04] text-[11px] text-white/40">
                            <div className="flex items-center gap-1.5">
                                <span>Navigate:</span>
                                <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono">↑↓</span>
                                <span>Select:</span>
                                <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono">⏎ Enter</span>
                            </div>
                            <div>
                                <span>Close:</span>
                                <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono">ESC</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Spotlight Toggle Button */}
            <button
                onClick={() => setIsSpotlightOpen(true)}
                className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center glass border border-[#00c2cc]/20 shadow-lg shadow-[#00c2cc]/10 hover:border-[#00e5ff]/50 hover:shadow-[#00e5ff]/20 transition-all duration-300 group cursor-pointer"
                style={{
                    background: 'rgba(15, 20, 32, 0.85)',
                    backdropFilter: 'blur(8px)'
                }}
                title="Command Center (Ctrl+K / K)"
            >
                {/* Outer pulsing shadow glow ring */}
                <span className="absolute inset-0 rounded-full bg-[#00e5ff]/5 scale-100 group-hover:scale-120 group-hover:bg-[#00e5ff]/10 transition-all duration-500 animate-pulse" />
                <span className="material-symbols-rounded text-[#00e5ff] text-lg font-bold group-hover:scale-110 transition-all duration-300">
                    terminal
                </span>
            </button>

            {/* ── System Guide Modal ── */}
            {isGuideOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
                    style={{ background: 'rgba(10, 15, 29, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                    onClick={() => setIsGuideOpen(false)}
                >
                    <div 
                        className="w-full max-w-4xl h-[85vh] max-h-[700px] rounded-2xl overflow-hidden glass-elevated border border-white/[0.08] shadow-2xl animate-slide-up relative z-10 p-6 flex flex-col gap-5"
                        style={{ background: 'rgba(20, 25, 41, 0.96)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20">
                                    <span className="material-symbols-rounded text-lg">info</span>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Lora', serif" }}>System Reference Guide</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Learn about our inventory rules, expiry bands, and health scores.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsGuideOpen(false)}
                                className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all"
                            >
                                <span className="material-symbols-rounded text-base">close</span>
                            </button>
                        </div>

                        {/* Guide Content with internal tabs */}
                        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                            {/* Tabs Column */}
                            <div className="flex flex-col gap-1.5 w-[180px] border-r border-white/[0.06] pr-4 flex-shrink-0">
                                {[
                                    { key: 'workflow', label: 'Role Workflows', icon: 'route', color: '#f472b6' },
                                    { key: 'expiry', label: 'Expiry Bands', icon: 'hourglass_empty', color: '#00e5ff' },
                                    { key: 'stock', label: 'Stock & Movements', icon: 'warning', color: '#f59e0b' },
                                    { key: 'value', label: 'Stock Value', icon: 'payments', color: '#a78bfa' },
                                    { key: 'health', label: 'Branch Health', icon: 'favorite', color: '#10b981' }
                                ].map(tab => (
                                    <button 
                                        key={tab.key}
                                        id={`guide-tab-btn-${tab.key}`}
                                        onClick={() => setGuideTab(tab.key)}
                                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all text-left cursor-pointer border border-transparent"
                                        style={{
                                            background: guideTab === tab.key ? `${tab.color}12` : 'transparent',
                                            color: guideTab === tab.key ? tab.color : 'rgba(255,255,255,0.6)',
                                            borderColor: guideTab === tab.key ? `${tab.color}25` : 'transparent'
                                        }}
                                    >
                                        <span className="material-symbols-rounded text-base" style={{ fontVariationSettings: guideTab === tab.key ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Panel Column */}
                            <div className="flex-1 overflow-y-auto scrollable pr-2">
                                {guideTab === 'workflow' && (
                                    <div className="flex flex-col gap-4 animate-fade-in h-full">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-base font-bold text-[#f472b6] uppercase tracking-wider">Role Operational Workflows</h4>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                                Select a role to view the custom visual lifecycle and quickly jump to key pages:
                                            </p>
                                        </div>

                                        {/* Segmented Selector */}
                                        <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl self-start">
                                            {[
                                                { role: 'Pharmacist', label: 'Pharmacist Flow', icon: 'local_pharmacy', color: '#60a5fa' },
                                                { role: 'Manager', label: 'Manager Flow', icon: 'assignment_ind', color: '#f59e0b' },
                                                { role: 'Admin', label: 'Admin Flow', icon: 'admin_panel_settings', color: '#10b981' }
                                            ].map(item => {
                                                const isActive = activeWorkflowRole === item.role;
                                                return (
                                                    <button
                                                        key={item.role}
                                                        id={`guide-role-btn-${item.role.toLowerCase()}`}
                                                        onClick={() => setActiveWorkflowRole(item.role)}
                                                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                                                        style={{
                                                            background: isActive ? item.color : 'transparent',
                                                            color: isActive ? '#0a0d14' : 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        <span className="material-symbols-rounded text-sm" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                                                            {item.icon}
                                                        </span>
                                                        <span>{item.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Active Role Workflow Stepper */}
                                        <div className="flex flex-col gap-4 pl-2 border-l-2 border-dashed ml-3 py-1 relative" style={{ borderColor: activeWorkflowRole === 'Pharmacist' ? '#60a5fa40' : activeWorkflowRole === 'Manager' ? '#f59e0b40' : '#10b98140' }}>
                                            {activeWorkflowRole === 'Pharmacist' && (
                                                <>
                                                    {/* Step 1 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#60a5fa] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">search</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#60a5fa] bg-[#60a5fa]/10 px-2.5 py-0.5 rounded-full">Step 1</span>
                                                                        <span className="text-sm font-bold text-white">Check Shelf Stock</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Verify active inventory levels, safety threshold alerts, and brand listings in the centralized ledger.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-ledger-pharmacist"
                                                                onClick={() => { navigate('/medicines'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#60a5fa]/10 border border-[#60a5fa]/20 hover:bg-[#60a5fa] hover:text-[#0a0d14] text-[#60a5fa] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#60a5fa]/5"
                                                            >
                                                                <span>Ledger</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 2 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#60a5fa] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">sell</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#60a5fa] bg-[#60a5fa]/10 px-2.5 py-0.5 rounded-full">Step 2</span>
                                                                        <span className="text-sm font-bold text-white">Dispense Units (Stock Out)</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Process daily retail transactions or prescription orders, deducting units from the database in real-time.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-transaction-pharmacist"
                                                                onClick={() => { navigate('/inventory/transaction-new'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#60a5fa]/10 border border-[#60a5fa]/20 hover:bg-[#60a5fa] hover:text-[#0a0d14] text-[#60a5fa] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#60a5fa]/5"
                                                            >
                                                                <span>Dispense</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 3 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#60a5fa] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">local_shipping</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#60a5fa] bg-[#60a5fa]/10 px-2.5 py-0.5 rounded-full">Step 3</span>
                                                                        <span className="text-sm font-bold text-white">Emergency Transfers</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Trigger network-wide transfers for critical out-of-stock items to get immediate relief from nearby branches.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-emergency-pharmacist"
                                                                onClick={() => { navigate('/emergency-support'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#60a5fa]/10 border border-[#60a5fa]/20 hover:bg-[#60a5fa] hover:text-[#0a0d14] text-[#60a5fa] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#60a5fa]/5"
                                                            >
                                                                <span>Transfer</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {activeWorkflowRole === 'Manager' && (
                                                <>
                                                    {/* Step 1 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#f59e0b] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">hourglass_empty</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-0.5 rounded-full">Step 1</span>
                                                                        <span className="text-sm font-bold text-white">Audit Shelf Health</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Inspect dead stock valuations, track expiration waves, and discard Red Band (expiry &le; 30d) medicines.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-expiry-manager"
                                                                onClick={() => { navigate('/expiry-dashboard'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 hover:bg-[#f59e0b] hover:text-[#0a0d14] text-[#f59e0b] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#f59e0b]/5"
                                                            >
                                                                <span>Expiry</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 2 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#f59e0b] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">shopping_cart</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-0.5 rounded-full">Step 2</span>
                                                                        <span className="text-sm font-bold text-white">Reorder Procurement</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Replenish stock using auto-calculated minimum thresholds, manage supplier listings, and submit purchase orders.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-reorder-manager"
                                                                onClick={() => { navigate('/reorder-intelligence'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 hover:bg-[#f59e0b] hover:text-[#0a0d14] text-[#f59e0b] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#f59e0b]/5"
                                                            >
                                                                <span>Reorder</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 3 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#f59e0b] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">add_box</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-0.5 rounded-full">Step 3</span>
                                                                        <span className="text-sm font-bold text-white">Receive Deliveries (Stock In)</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Add units back into active inventory under specific batches and expiration dates when supplier orders arrive.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-stockin-manager"
                                                                onClick={() => { navigate('/inventory/transaction-new'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 hover:bg-[#f59e0b] hover:text-[#0a0d14] text-[#f59e0b] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#f59e0b]/5"
                                                            >
                                                                <span>Stock In</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {activeWorkflowRole === 'Admin' && (
                                                <>
                                                    {/* Step 1 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#10b981] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">storefront</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full">Step 1</span>
                                                                        <span className="text-sm font-bold text-white">Onboard Branches</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Register new pharmacy branches into the organization networks and configure branch-level information.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-branches-admin"
                                                                onClick={() => { navigate('/pharmacies'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 hover:bg-[#10b981] hover:text-[#0a0d14] text-[#10b981] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#10b981]/5"
                                                            >
                                                                <span>Branches</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 2 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#10b981] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">group</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full">Step 2</span>
                                                                        <span className="text-sm font-bold text-white">Configure Staff Credentials</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Onboard new employee accounts, define role-based access limits, and assign accounts to specific branch locations.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-users-admin"
                                                                onClick={() => { navigate('/users'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 hover:bg-[#10b981] hover:text-[#0a0d14] text-[#10b981] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#10b981]/5"
                                                            >
                                                                <span>Users</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step 3 */}
                                                    <div className="relative pl-7 group">
                                                        <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-[#0a0f1d] border-2 border-[#10b981] flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                                                            <div className="flex gap-4 items-start">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex-shrink-0 mt-0.5">
                                                                    <span className="material-symbols-rounded text-lg">compare_arrows</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full">Step 3</span>
                                                                        <span className="text-sm font-bold text-white">Compare Network Analytics</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                                        Monitor stock valuation, staff sizing, and average health score metrics across all branches in the network.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                id="guide-btn-compare-admin"
                                                                onClick={() => { navigate('/branch-comparison'); setIsGuideOpen(false); }} 
                                                                className="flex-shrink-0 flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 hover:bg-[#10b981] hover:text-[#0a0d14] text-[#10b981] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#10b981]/5"
                                                            >
                                                                <span>Compare</span>
                                                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {guideTab === 'expiry' && (
                                    <div className="flex flex-col gap-4 animate-fade-in h-full">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-base font-bold text-[#00e5ff] uppercase tracking-wider">Expiry Intelligence Bands</h4>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                                Shelf-life zones mapped automatically depending on remaining days to expiration:
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-2">
                                            {[
                                                { 
                                                    label: 'Red Band (Urgent Action)', 
                                                    range: '≤ 30 Days left', 
                                                    color: '#f87171', 
                                                    bg: 'rgba(248,113,113,0.04)', 
                                                    border: 'rgba(248,113,113,0.15)',
                                                    icon: 'error_outline',
                                                    desc: 'Expired or expiring within a month. Stock is locked from regular sales. Action required immediately: mark for disposal, write-off, or return to supplier.' 
                                                },
                                                { 
                                                    label: 'Amber Band (Warning)', 
                                                    range: '31 to 60 Days left', 
                                                    color: '#f59e0b', 
                                                    bg: 'rgba(245,158,11,0.04)', 
                                                    border: 'rgba(245,158,11,0.15)',
                                                    icon: 'warning_amber',
                                                    desc: 'Critical zone. Check selling speeds, initiate clearance discounts, check supplier return contracts, or plan nearby branch transfers.' 
                                                },
                                                { 
                                                    label: 'Green Band (Monitor)', 
                                                    range: '61 to 90 Days left', 
                                                    color: '#34d399', 
                                                    bg: 'rgba(52,211,153,0.04)', 
                                                    border: 'rgba(52,211,153,0.15)',
                                                    icon: 'hourglass_top',
                                                    desc: 'Safe tier. Keep an eye on weekly usage rates. If stock is moving slower than normal, request marketing push before hitting Amber band.' 
                                                }
                                            ].map(b => (
                                                <div 
                                                    key={b.label} 
                                                    className="p-4 rounded-xl border flex flex-col gap-3 justify-between bg-white/[0.01]" 
                                                    style={{ borderColor: b.border, background: b.bg }}
                                                >
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/30" style={{ color: b.color }}>
                                                                <span className="material-symbols-rounded text-base">{b.icon}</span>
                                                            </div>
                                                            <span className="text-[11px] px-2 py-0.5 rounded bg-black/45 text-white/90 font-mono tracking-tight">{b.range}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-white leading-tight">{b.label}</span>
                                                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{b.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {guideTab === 'stock' && (
                                    <div className="flex flex-col gap-4 animate-fade-in h-full">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-base font-bold text-[#f59e0b] uppercase tracking-wider">Inventory Statuses & Movements</h4>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                                Understand how the ledger tracks product levels and records adjustments:
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-5 mt-2">
                                            {/* Left Column: Stock Levels */}
                                            <div className="flex flex-col gap-3">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06] pb-1.5">Stock Alert Levels</span>
                                                {[
                                                    { label: 'Out of Stock', icon: 'gpp_bad', color: '#f87171', bg: 'rgba(248,113,113,0.03)', desc: '0 units left in active inventory. Immediately blocks prescriptions from checkout.' },
                                                    { label: 'Low Stock Alert', icon: 'gpp_maybe', color: '#f59e0b', bg: 'rgba(245,158,11,0.03)', desc: 'Available stock is below the designated branch safety point (triggers order notifications).' },
                                                    { label: 'Reorder Safety Point', icon: 'verified_user', color: '#34d399', bg: 'rgba(52,211,153,0.03)', desc: 'Custom branch minimum thresholds. Defaults to 20 units if not configured manually.' }
                                                ].map(s => (
                                                    <div key={s.label} className="flex gap-3.5 items-start bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl hover:bg-white/[0.02] transition-colors" style={{ background: s.bg }}>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/20 flex-shrink-0" style={{ color: s.color }}>
                                                            <span className="material-symbols-rounded text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white leading-none">{s.label}</span>
                                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{s.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Right Column: Stock Movements */}
                                            <div className="flex flex-col gap-3">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06] pb-1.5">Ledger Movements</span>
                                                {[
                                                    { label: 'Stocked In', icon: 'add_circle', color: '#34d399', bg: 'rgba(52,211,153,0.03)', desc: 'Add units to inventory (when new orders are delivered by supplier or branch transfer).' },
                                                    { label: 'Stocked Out', icon: 'remove_circle', color: '#60a5fa', bg: 'rgba(96,165,250,0.03)', desc: 'Deduct units (when sold to customers, shipped to other locations, or expired).' },
                                                    { label: 'Adjustments', icon: 'published_with_changes', color: '#a78bfa', bg: 'rgba(167,139,250,0.03)', desc: 'Manual override corrections to resolve physical count audits, damage, or losses.' }
                                                ].map(s => (
                                                    <div key={s.label} className="flex gap-3.5 items-start bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl hover:bg-white/[0.02] transition-colors" style={{ background: s.bg }}>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/20 flex-shrink-0" style={{ color: s.color }}>
                                                            <span className="material-symbols-rounded text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white leading-none">{s.label}</span>
                                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{s.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {guideTab === 'value' && (
                                    <div className="flex flex-col gap-4 animate-fade-in h-full">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-base font-bold text-[#a78bfa] uppercase tracking-wider">Financial & Catalog Metrics</h4>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                                How financial valuations and portfolio statistics are calculated on the dashboards:
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            {[
                                                { 
                                                    label: 'Inventory Valuation', 
                                                    icon: 'payments', 
                                                    color: '#34d399', 
                                                    formula: 'Available Stock × Unit Cost',
                                                    desc: 'The complete financial capital tied up on shelves. Represents purchase value of all stock items in your current branch.' 
                                                },
                                                { 
                                                    label: 'Dead Stock Value', 
                                                    icon: 'event_busy', 
                                                    color: '#f87171', 
                                                    formula: 'Expired Quantity × Unit Cost',
                                                    desc: 'Total capital loss from expired stock. Red band items remain here until they are physically discarded/returned.' 
                                                },
                                                { 
                                                    label: 'At Risk Value', 
                                                    icon: 'gpp_maybe', 
                                                    color: '#f59e0b', 
                                                    formula: 'Red Band Stock × Unit Cost',
                                                    desc: 'Capital sitting in medicines that expire within 30 days. These require immediate clearance or return actions to prevent loss.' 
                                                },
                                                { 
                                                    label: 'Catalog Channels', 
                                                    icon: 'medication', 
                                                    color: '#60a5fa', 
                                                    formula: 'Count of Unique SKUs / Products',
                                                    desc: 'The diversity count of registered medicine types in the ledger, regardless of the individual unit stock levels.' 
                                                }
                                            ].map(v => (
                                                <div key={v.label} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2.5 justify-between hover:bg-white/[0.02] transition-colors">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/20" style={{ color: v.color }}>
                                                                <span className="material-symbols-rounded text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{v.icon}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{v.label}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 leading-relaxed mt-1">{v.desc}</p>
                                                    </div>
                                                    <div className="text-[10px] font-mono bg-black/25 px-2.5 py-1 rounded text-slate-400 self-start">
                                                        Formula: {v.formula}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {guideTab === 'health' && (
                                    <div className="flex flex-col gap-4 animate-fade-in h-full">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-base font-bold text-[#10b981] uppercase tracking-wider">Branch Health Calculation</h4>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                                All branches begin each day with a perfect score of **100**. Point deductions are calculated automatically for active inventory issues:
                                            </p>
                                        </div>

                                        {/* Mock Health Meter Widget */}
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-[#10b981]/20 bg-[#10b981]/5 mt-1 flex-shrink-0">
                                            <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border-4 border-dashed border-[#10b981]/40 text-[#10b981] bg-[#10b981]/10 font-mono text-xs font-bold tracking-tight">
                                                100
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-[#10b981]">Baseline Grade A Branch Health</span>
                                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                    Deductions apply only to active medications with positive stock. Expired or low-stock items cause points to be deducted automatically.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {[
                                                { label: 'Expired Medicines', cost: '-15 points', limit: 'Maximum -45 pts', desc: 'Active medicines that are past their expiration date.', color: '#f87171', bg: 'rgba(248,113,113,0.02)', border: 'rgba(248,113,113,0.1)' },
                                                { label: 'Near Expiry (≤30 Days)', cost: '-5 points', limit: 'Maximum -25 pts', desc: 'Active medicines inside the Red Band range.', color: '#f59e0b', bg: 'rgba(245,158,11,0.02)', border: 'rgba(245,158,11,0.1)' },
                                                { label: 'Out of Stock Items', cost: '-10 points', limit: 'Maximum -20 pts', desc: 'Active catalog medicines with exactly 0 stock units.', color: '#ef4444', bg: 'rgba(239,68,68,0.02)', border: 'rgba(239,68,68,0.1)' },
                                                { label: 'Low Stock Items', cost: '-5 points', limit: 'Maximum -20 pts', desc: 'Active stock levels that sit below the reorder point.', color: '#60a5fa', bg: 'rgba(96,165,250,0.02)', border: 'rgba(96,165,250,0.1)' }
                                            ].map(p => (
                                                <div key={p.label} className="p-3.5 rounded-xl border flex flex-col gap-2 justify-between bg-white/[0.01]" style={{ borderColor: p.border, background: p.bg }}>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-white">{p.label}</span>
                                                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/25" style={{ color: p.color }}>{p.cost}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 leading-normal mt-0.5">{p.desc}</p>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{p.limit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-3 border-t border-white/[0.06] flex-shrink-0">
                            <button 
                                onClick={() => setIsGuideOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer text-slate-900 transition-all shadow-lg shadow-[#00c2cc]/10 hover:shadow-[#00c2cc]/20 hover:scale-[1.02] active:scale-[0.98] duration-200"
                                style={{ background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)' }}
                            >
                                Got it, thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
