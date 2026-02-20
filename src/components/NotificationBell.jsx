import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { useToast } from './ToastNotification';
import { useNotificationEvents } from '../context/NotificationContext';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { broadcast } = useNotificationEvents();
  const prevUnreadCountRef = useRef(0);
  const prevNotificationsRef = useRef([]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smart polling - only when tab is active and user is active
  const lastActivityRef = useRef(Date.now());
  const POLL_INTERVAL = 60000; // 60 seconds
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  useEffect(() => {
    fetchNotifications(true); // Initial fetch, don't show toast

    const interval = setInterval(() => {
      // Only poll if tab is visible and user was active in last 5 min
      if (document.visibilityState === 'visible' &&
        Date.now() - lastActivityRef.current < INACTIVITY_TIMEOUT) {
        fetchNotifications(false); // Subsequent fetches can show toast
      }
    }, POLL_INTERVAL);

    // Also fetch when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async (isInitial = false) => {
    try {
      const data = await notificationService.getNotifications(15);
      const newNotifications = data.notifications || [];
      const newUnreadCount = data.unreadCount || 0;

      // Detect new notifications and broadcast events (only if not initial load)
      if (!isInitial && newNotifications.length > 0) {
        const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
        const newOnes = newNotifications.filter(n => !prevIds.has(n.id));

        newOnes.forEach(notif => {
          // Show toast for unread notifications
          if (!notif.is_read) {
            const toastType = getToastType(notif.type);
            toast[toastType](
              notif.title || 'New Notification',
              notif.message,
              { duration: 6000 }
            );
          }

          // Broadcast event for selective refresh
          broadcast(notif.type, notif);
        });
      }

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
      prevUnreadCountRef.current = newUnreadCount;
      prevNotificationsRef.current = newNotifications;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const getToastType = (notifType) => {
    switch (notifType) {
      case 'ORDER_NEW':
      case 'ORDER_STATUS':
        return 'info';
      case 'DISCREPANCY_NEW':
        return 'warning';
      case 'DISCREPANCY_RESOLVED':
        return 'success';
      case 'AUDIT_SUBMITTED':
        return 'info';
      case 'AUDIT_FLAGGED':
        return 'error';
      default:
        return 'info';
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    // Navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
    setLoading(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ORDER_NEW': return '📦';
      case 'ORDER_STATUS': return '🚚';
      case 'DISCREPANCY_NEW': return '⚠️';
      case 'DISCREPANCY_RESOLVED': return '✅';
      case 'FRANCHISE_ASSIGNED': return '🏪';
      default: return '🔔';
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-block'
    },
    bellButton: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      position: 'relative',
      transition: 'background 0.2s'
    },
    bellIcon: {
      width: isMobile ? '20px' : '22px',
      height: isMobile ? '20px' : '22px',
      color: '#374151'
    },
    badge: {
      position: 'absolute',
      top: '2px',
      right: '2px',
      background: '#ef4444',
      color: 'white',
      fontSize: isMobile ? '10px' : '11px',
      fontWeight: 'bold',
      padding: '2px 6px',
      borderRadius: '10px',
      minWidth: isMobile ? '16px' : '18px',
      textAlign: 'center'
    },
    dropdown: {
      position: isMobile ? 'fixed' : 'absolute',
      top: isMobile ? 'auto' : '100%',
      right: isMobile ? '10px' : 0,
      left: isMobile ? '10px' : 'auto',
      bottom: isMobile ? '10px' : 'auto',
      width: isMobile ? 'auto' : '360px',
      maxHeight: isMobile ? '70vh' : '450px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      zIndex: 1000,
      overflow: 'hidden',
      marginTop: isMobile ? 0 : '8px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '12px 14px' : '16px',
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb'
    },
    headerTitle: {
      fontWeight: 600,
      fontSize: isMobile ? '14px' : '16px',
      color: '#111827'
    },
    markAllBtn: {
      background: 'none',
      border: 'none',
      color: '#3b82f6',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '13px',
      fontWeight: 500
    },
    list: {
      maxHeight: isMobile ? 'calc(70vh - 60px)' : '350px',
      overflowY: 'auto'
    },
    item: {
      display: 'flex',
      gap: isMobile ? '10px' : '12px',
      padding: isMobile ? '12px 14px' : '14px 16px',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background 0.15s'
    },
    itemUnread: {
      background: '#eff6ff'
    },
    itemIcon: {
      fontSize: isMobile ? '20px' : '24px',
      flexShrink: 0
    },
    itemContent: {
      flex: 1,
      minWidth: 0
    },
    itemTitle: {
      fontWeight: 600,
      fontSize: isMobile ? '13px' : '14px',
      color: '#111827',
      marginBottom: '4px'
    },
    itemMessage: {
      fontSize: isMobile ? '12px' : '13px',
      color: '#6b7280',
      lineHeight: 1.4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    itemTime: {
      fontSize: isMobile ? '11px' : '12px',
      color: '#9ca3af',
      marginTop: '4px'
    },
    unreadDot: {
      width: '8px',
      height: '8px',
      background: '#3b82f6',
      borderRadius: '50%',
      flexShrink: 0,
      marginTop: '6px'
    },
    empty: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#9ca3af'
    },
    emptyIcon: {
      width: '48px',
      height: '48px',
      marginBottom: '12px',
      opacity: 0.5,
      margin: '0 auto 12px'
    }
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <svg style={styles.bellIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile overlay */}
          {isMobile && (
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 999
              }}
            />
          )}
          <div style={styles.dropdown}>
            <div style={styles.header}>
              <span style={styles.headerTitle}>Notifications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {unreadCount > 0 && (
                  <button
                    style={styles.markAllBtn}
                    onClick={handleMarkAllRead}
                    disabled={loading}
                  >
                    {loading ? 'Marking...' : 'Mark all read'}
                  </button>
                )}
                {isMobile && (
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '2px 6px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={styles.list}>
              {notifications.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>🔔</div>
                  <div>No notifications yet</div>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      ...styles.item,
                      ...(notif.is_read ? {} : styles.itemUnread)
                    }}
                    onClick={() => handleNotificationClick(notif)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'white' : '#eff6ff'}
                  >
                    <span style={styles.itemIcon}>{getNotificationIcon(notif.type)}</span>
                    <div style={styles.itemContent}>
                      <div style={styles.itemTitle}>{notif.title}</div>
                      <div style={styles.itemMessage}>{notif.message}</div>
                      <div style={styles.itemTime}>{formatTime(notif.created_at)}</div>
                    </div>
                    {!notif.is_read && <div style={styles.unreadDot}></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
