import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hygieneMonitorService } from '../../services/hygieneMonitorService';

/**
 * HygieneMonitorDashboard - Main dashboard for hygiene monitors
 */
export default function HygieneMonitorDashboard() {
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFranchises();
  }, []);

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const data = await hygieneMonitorService.getAssignedFranchises();
      setFranchises(data);
    } catch (err) {
      console.error('Failed to load franchises:', err);
      alert('Failed to load franchises: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ color: '#6b7280', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Hygiene Monitor Dashboard
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4, margin: 0 }}>
            Monitor staff attendance and franchise audits
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 24
        }}>
          {/* Assigned Franchises Card */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Assigned Franchises</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6', marginTop: 8, margin: 0 }}>
                  {franchises.length}
                </p>
              </div>
              <div style={{
                width: 48,
                height: 48,
                background: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: 24, height: 24, color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Quick Access */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Quick Access</p>
                <button
                  onClick={() => navigate('/hygiene-monitor/attendance')}
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#10b981',
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#059669'}
                  onMouseLeave={(e) => e.target.style.color = '#10b981'}
                >
                  View Attendance →
                </button>
              </div>
              <div style={{
                width: 48,
                height: 48,
                background: '#d1fae5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: 24, height: 24, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Audits Quick Access */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Quick Access</p>
                <button
                  onClick={() => navigate('/hygiene-monitor/audits')}
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#8b5cf6',
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#7c3aed'}
                  onMouseLeave={(e) => e.target.style.color = '#8b5cf6'}
                >
                  View Audits →
                </button>
              </div>
              <div style={{
                width: 48,
                height: 48,
                background: '#ede9fe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: 24, height: 24, color: '#8b5cf6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Franchises */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Assigned Franchises
            </h2>
          </div>

          {franchises.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
              No franchises assigned. Contact admin to assign franchises.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
              padding: 24
            }}>
              {franchises.map(franchise => (
                <div
                  key={franchise.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 16,
                    transition: 'box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1f2937', margin: 0, marginBottom: 12 }}>
                    {franchise.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      <span style={{ fontWeight: 500 }}>Owner:</span> {franchise.owner_name}
                    </p>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      <span style={{ fontWeight: 500 }}>Location:</span> {franchise.location}
                    </p>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      <span style={{ fontWeight: 500 }}>Phone:</span> {franchise.phone}
                    </p>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/hygiene-monitor/attendance?franchise_id=${franchise.id}`)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#10b981',
                        color: 'white',
                        fontSize: 14,
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#059669'}
                      onMouseLeave={(e) => e.target.style.background = '#10b981'}
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => navigate(`/hygiene-monitor/audits?franchise_id=${franchise.id}`)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#8b5cf6',
                        color: 'white',
                        fontSize: 14,
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#7c3aed'}
                      onMouseLeave={(e) => e.target.style.background = '#8b5cf6'}
                    >
                      Audits
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
