import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleGuard';
import logo from '../assets/logo.png';

/**
 * Login Page
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(getDashboardPath(user));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={logo} alt="SWAP Logo" style={{ width: 80, height: 80, marginBottom: 16 }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            SWAP Management
          </h1>
          <p style={{ color: '#6b7280', marginTop: 8 }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: 12,
              background: '#fee2e2',
              borderRadius: 10,
              color: '#dc2626',
              fontSize: 14,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#374151',
              fontSize: 13
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              color: '#374151',
              fontSize: 13
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
