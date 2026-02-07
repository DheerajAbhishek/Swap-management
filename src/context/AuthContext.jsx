import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('supply_user');
    const storedToken = localStorage.getItem('supply_token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('supply_user');
        localStorage.removeItem('supply_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Call real API
    const response = await authService.login(email, password);

    const { user: userObj, token } = response;

    // Store in localStorage
    localStorage.setItem('supply_user', JSON.stringify(userObj));
    localStorage.setItem('supply_token', token);

    setUser(userObj);
    setIsAuthenticated(true);

    return userObj;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const getToken = () => {
    return localStorage.getItem('supply_token');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: 18,
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
