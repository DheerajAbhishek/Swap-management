import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

/**
 * Notification Context - Broadcasts notification events for selective UI refresh
 * 
 * When a new notification arrives, components can subscribe to refresh their data
 * without reloading the entire page.
 */
export function NotificationProvider({ children }) {
  const [listeners, setListeners] = useState({});
  const listenerIdRef = useRef(0);

  /**
   * Subscribe to notification events
   * @param {string[]} types - Array of notification types to listen for
   * @param {function} callback - Function to call when notification arrives
   * @returns {function} Unsubscribe function
   */
  const subscribe = useCallback((types, callback) => {
    const id = ++listenerIdRef.current;

    setListeners(prev => ({
      ...prev,
      [id]: { types, callback }
    }));

    // Return unsubscribe function
    return () => {
      setListeners(prev => {
        const newListeners = { ...prev };
        delete newListeners[id];
        return newListeners;
      });
    };
  }, []);

  /**
   * Broadcast a notification event
   * @param {string} type - Notification type
   * @param {object} data - Notification data
   */
  const broadcast = useCallback((type, data) => {
    Object.values(listeners).forEach(listener => {
      if (listener.types.includes(type) || listener.types.includes('*')) {
        try {
          listener.callback(type, data);
        } catch (err) {
          console.error('Error in notification listener:', err);
        }
      }
    });
  }, [listeners]);

  return (
    <NotificationContext.Provider value={{ subscribe, broadcast }}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification events
 */
export function useNotificationEvents() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationEvents must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Hook to subscribe to specific notification types and trigger refresh
 * @param {string[]} types - Array of notification types to listen for
 * @param {function} refreshCallback - Function to call to refresh data
 */
export function useNotificationRefresh(types, refreshCallback) {
  const { subscribe } = useNotificationEvents();
  const callbackRef = useRef(refreshCallback);

  // Update ref when callback changes
  callbackRef.current = refreshCallback;

  // Subscribe on mount
  useEffect(() => {
    const unsubscribe = subscribe(types, () => {
      callbackRef.current();
    });
    return unsubscribe;
  }, [types.join(','), subscribe]);
}

export default NotificationContext;
