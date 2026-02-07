import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Create context for toast notifications
const ToastContext = createContext(null);

// Notification sound as base64 data URI (short alert tone)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAABkZGRkZGRkZGRkZGRk';

// Default notification sound (modern alert sound)
const playNotificationSound = () => {
    try {
        // Create audio context for better browser support
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Set up a pleasant notification tone
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
        console.log('Could not play notification sound:', err);
    }
};

// Toast Provider Component
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        const id = Date.now() + Math.random();
        const newToast = {
            id,
            type: toast.type || 'info',
            title: toast.title,
            message: toast.message,
            duration: toast.duration || 5000,
            ...toast
        };

        setToasts(prev => [...prev, newToast]);

        // Play sound if enabled (default true)
        if (toast.sound !== false) {
            playNotificationSound();
        }

        // Auto remove after duration
        if (newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Convenience methods
    const success = useCallback((title, message, options = {}) => {
        return addToast({ type: 'success', title, message, ...options });
    }, [addToast]);

    const error = useCallback((title, message, options = {}) => {
        return addToast({ type: 'error', title, message, ...options });
    }, [addToast]);

    const warning = useCallback((title, message, options = {}) => {
        return addToast({ type: 'warning', title, message, ...options });
    }, [addToast]);

    const info = useCallback((title, message, options = {}) => {
        return addToast({ type: 'info', title, message, ...options });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook to use toast notifications
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Container - renders all toasts
function ToastContainer({ toasts, removeToast }) {
    return (
        <div style={styles.container}>
            {toasts.map((toast, index) => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                    index={index}
                />
            ))}
        </div>
    );
}

// Individual Toast Component
function Toast({ toast, onClose, index }) {
    const [isExiting, setIsExiting] = useState(false);
    const [isEntering, setIsEntering] = useState(true);

    useEffect(() => {
        // Trigger enter animation
        const enterTimer = setTimeout(() => setIsEntering(false), 50);
        return () => clearTimeout(enterTimer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const typeConfig = {
        success: {
            icon: '✓',
            bgColor: '#10b981',
            borderColor: '#059669'
        },
        error: {
            icon: '✕',
            bgColor: '#ef4444',
            borderColor: '#dc2626'
        },
        warning: {
            icon: '⚠',
            bgColor: '#f59e0b',
            borderColor: '#d97706'
        },
        info: {
            icon: 'ℹ',
            bgColor: '#3b82f6',
            borderColor: '#2563eb'
        }
    };

    const config = typeConfig[toast.type] || typeConfig.info;

    return (
        <div
            style={{
                ...styles.toast,
                transform: isEntering
                    ? 'translateX(120%)'
                    : isExiting
                        ? 'translateX(120%)'
                        : 'translateX(0)',
                opacity: isEntering ? 0 : isExiting ? 0 : 1,
            }}
            role="alert"
        >
            {/* Icon */}
            <div style={{
                ...styles.iconWrapper,
                background: config.bgColor
            }}>
                <span style={styles.icon}>{config.icon}</span>
            </div>

            {/* Content */}
            <div style={styles.content}>
                <div style={styles.title}>{toast.title}</div>
                {toast.message && (
                    <div style={styles.message}>{toast.message}</div>
                )}
            </div>

            {/* Close Button */}
            <button
                onClick={handleClose}
                style={styles.closeBtn}
                aria-label="Close notification"
            >
                ×
            </button>

            {/* Progress Bar */}
            {toast.duration > 0 && (
                <div style={styles.progressContainer}>
                    <div
                        style={{
                            ...styles.progressBar,
                            background: config.bgColor,
                            animation: `shrink ${toast.duration}ms linear forwards`
                        }}
                    />
                </div>
            )}

            {/* Add keyframes */}
            <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 380,
        width: '100%',
        pointerEvents: 'none'
    },
    toast: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '16px 16px 20px',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto'
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    icon: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    },
    content: {
        flex: 1,
        minWidth: 0,
        paddingRight: 20
    },
    title: {
        fontWeight: 600,
        fontSize: 15,
        color: '#111827',
        marginBottom: 2,
        lineHeight: 1.3
    },
    message: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 1.4,
        wordBreak: 'break-word'
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: 'none',
        background: '#f3f4f6',
        color: '#6b7280',
        fontSize: 18,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s'
    },
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: '#e5e7eb',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden'
    },
    progressBar: {
        height: '100%',
        borderRadius: '0 0 12px 12px'
    }
};

export default ToastProvider;
