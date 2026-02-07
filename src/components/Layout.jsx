import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavItems } from '../utils/roleGuard';
import NotificationBell from './NotificationBell';
import logo from '../assets/logo.png';

// SVG Icon component
const NavIcon = ({ name, size = 18 }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
    inventory: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
    orders: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    ),
    vendors: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    ),
    store: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
    clipboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      </svg>
    ),
    audit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    report: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    ),
    alert: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
    message: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    )
  };
  
  return icons[name] || null;
};

/**
 * Layout - Main layout with responsive sidebar navigation
 */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getNavItems(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'ADMIN': return '#8b5cf6';
      case 'KITCHEN': return '#f59e0b';
      case 'FRANCHISE': return '#10b981';
      case 'AUDITOR': return '#ec4899';
      case 'FRANCHISE_STAFF': return '#06b6d4';
      case 'KITCHEN_STAFF': return '#f97316';
      default: return '#6b7280';
    }
  };

  // Sidebar styles
  const sidebarStyle = {
    width: isMobile ? 280 : 260,
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: isMobile ? 'fixed' : 'relative',
    top: 0,
    left: isMobile ? (sidebarOpen ? 0 : -280) : 0,
    height: isMobile ? '100vh' : 'auto',
    minHeight: '100vh',
    zIndex: 999,
    transition: 'left 0.3s ease',
    overflowY: 'auto'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo/Header */}
        <div style={{
          padding: isMobile ? '16px' : '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={logo} alt="SWAP Logo" style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }} />
              <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0 }}>
                SWAP Management
              </h1>
            </div>
            {/* Close button on mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: isMobile ? 12 : 13
          }}>
            <div style={{ opacity: 0.7 }}>Logged in as</div>
            <div style={{ fontWeight: 600, marginTop: 2, wordBreak: 'break-word' }}>{user?.name}</div>
            <div style={{
              display: 'inline-block',
              marginTop: 6,
              padding: '2px 8px',
              background: getRoleColor(),
              borderRadius: 4,
              fontSize: isMobile ? 10 : 11,
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: isMobile ? '12px 8px' : '16px 12px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length === 2}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isMobile ? '10px 14px' : '12px 16px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                marginBottom: 4,
                fontSize: isMobile ? 13 : 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease'
              })}
            >
              <NavIcon name={item.icon} size={isMobile ? 16 : 18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: isMobile ? '12px 8px' : '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: isMobile ? '10px 14px' : '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, background: '#f3f4f6', overflow: 'auto', minWidth: 0 }}>
        {/* Top Bar with Notifications */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '10px 16px' : '12px 24px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          {/* Hamburger Menu Button */}
          {isMobile && (
            <button
              onClick={toggleSidebar}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151'
              }}
            >
              ☰
            </button>
          )}
          {/* Logo on mobile header */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={logo} alt="SWAP" style={{ width: 28, height: 28 }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>SWAP</span>
            </div>
          )}
          <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Kitchen Name for Franchise users */}
            {user?.vendor_name && (user?.role === 'FRANCHISE' || user?.role === 'FRANCHISE_STAFF') && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: 20,
                color: 'white',
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
              }}>
                <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                {user.vendor_name}
              </div>
            )}
            <NotificationBell />
          </div>
        </div>
        <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
