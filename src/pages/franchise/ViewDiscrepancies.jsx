import { useState, useEffect } from 'react';
import { formatDateTime } from '../../utils/constants';
import discrepancyService from '../../services/discrepancyService';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Franchise View Discrepancies - See reported issues
 */
export default function ViewDiscrepancies() {
  const { subscribe } = useNotificationEvents();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterResolved, setFilterResolved] = useState(false);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      const data = await discrepancyService.getDiscrepancies();
      setDiscrepancies(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch discrepancies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();

    // Subscribe to discrepancy notifications
    const unsubscribe = subscribe(['DISCREPANCY_NEW', 'DISCREPANCY_RESOLVED'], () => {
      console.log('🔄 Refreshing discrepancies due to notification');
      fetchDiscrepancies();
    });

    return unsubscribe;
  }, [subscribe]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading discrepancies...</div>;
  }

  const openCount = discrepancies.filter(d => !d.resolved).length;
  const resolvedCount = discrepancies.filter(d => d.resolved).length;
  const filteredDiscrepancies = discrepancies.filter(d => d.resolved === filterResolved);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          My Discrepancies
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Track quantity discrepancies you've reported
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20
      }}>
        <button
          onClick={() => setFilterResolved(false)}
          style={!filterResolved ? activeTabBtn : tabBtn}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilterResolved(true)}
          style={filterResolved ? activeTabBtn : tabBtn}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {filteredDiscrepancies.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No {filterResolved ? 'resolved' : 'open'} discrepancies
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredDiscrepancies.map((d) => (
            <div
              key={d.id}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${d.resolved ? '#10b981' : '#ef4444'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{d.item_name}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: d.resolved ? '#d1fae5' : '#fee2e2',
                      color: d.resolved ? '#065f46' : '#991b1b',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {d.resolved ? 'RESOLVED' : 'OPEN'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Order: <span style={{ color: '#3b82f6' }}>{d.order_number}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                  {formatDateTime(d.created_at)}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                padding: 16,
                background: '#f9fafb',
                borderRadius: 10,
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Ordered</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{d.ordered_qty} {d.uom}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Received</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#f59e0b' }}>{d.received_qty} {d.uom}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Difference</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444' }}>-{d.difference} {d.uom}</div>
                </div>
              </div>

              <div style={{ marginBottom: d.photos?.length > 0 || d.resolved ? 16 : 0 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Your Notes:</div>
                <div style={{ fontSize: 14 }}>{d.notes || 'No notes provided'}</div>
              </div>

              {/* Discrepancy Photos */}
              {d.photos && d.photos.length > 0 && (
                <div style={{
                  marginBottom: d.resolved ? 16 : 0,
                  padding: 16,
                  background: '#fef3c7',
                  borderRadius: 10
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Received Items Photos ({d.photos.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {d.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        onClick={() => window.open(photo, '_blank')}
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer',
                          border: '2px solid #fbbf24'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution */}
              {d.resolved && d.resolution_notes && (
                <div style={{
                  padding: 12,
                  background: '#d1fae5',
                  borderRadius: 8
                }}>
                  <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600, marginBottom: 4 }}>Admin Resolution:</div>
                  <div style={{ fontSize: 14, color: '#065f46' }}>{d.resolution_notes}</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>
                    Resolved on {formatDateTime(d.resolved_at)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const tabBtn = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: 'white',
  color: '#6b7280',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
};

const activeTabBtn = {
  ...tabBtn,
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: 'white',
  border: 'none'
};
