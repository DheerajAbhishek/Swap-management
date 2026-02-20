import { useState, useEffect } from 'react';
import { formatDateTime } from '../../utils/constants';
import discrepancyService from '../../services/discrepancyService';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Kitchen View Discrepancies - See reported issues
 */
export default function ViewDiscrepancies() {
  const { subscribe } = useNotificationEvents();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('open'); // 'open' or 'resolved'

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

  const handleResolve = async (discrepancyId) => {
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes');
      return;
    }

    try {
      await discrepancyService.resolveDiscrepancy(discrepancyId, resolutionNotes);
      alert('Discrepancy resolved successfully!');
      setResolvingId(null);
      setResolutionNotes('');
      fetchDiscrepancies(); // Refresh list
    } catch (err) {
      alert('Failed to resolve discrepancy: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading discrepancies...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Discrepancies
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Quantity mismatches reported by franchises - resolve and update them
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('open')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'open' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e5e7eb',
            color: activeTab === 'open' ? 'white' : '#6b7280',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Open ({discrepancies.filter(d => !d.resolved).length})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'resolved' ? 'linear-gradient(135deg, #10b981, #059669)' : '#e5e7eb',
            color: activeTab === 'resolved' ? 'white' : '#6b7280',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Resolved ({discrepancies.filter(d => d.resolved).length})
        </button>
      </div>

      {/* Open Discrepancies */}
      {activeTab === 'open' && (
        <>
          {discrepancies.filter(d => !d.resolved).length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No open discrepancies
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {discrepancies.filter(d => !d.resolved).map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #ef4444'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{d.item_name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Order: <span style={{ color: '#3b82f6' }}>{d.order_number}</span>
                        {' • '}{d.franchise_name}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      background: '#fee2e2',
                      color: '#991b1b',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      OPEN
                    </span>
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
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Short</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444' }}>-{d.difference} {d.uom}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reported Reason:</div>
                    <div style={{ fontSize: 14 }}>{d.notes}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                      Reported on {formatDateTime(d.created_at)}
                    </div>
                  </div>

                  {/* Discrepancy Photos */}
                  {d.photos && d.photos.length > 0 && (
                    <div style={{
                      marginTop: 16,
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
                            alt={`Discrepancy ${idx + 1}`}
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

                  {/* Resolve Section */}
                  {resolvingId === d.id ? (
                    <div style={{
                      marginTop: 16,
                      padding: 16,
                      background: '#f9fafb',
                      borderRadius: 10,
                      border: '1px solid #d1d5db'
                    }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        Resolution Notes *
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Explain how this was resolved (e.g., 'Missing items sent with next delivery', 'Credit issued')"
                        style={{
                          width: '100%',
                          minHeight: 80,
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid #d1d5db',
                          fontSize: 14,
                          resize: 'vertical',
                          marginBottom: 12
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleResolve(d.id)}
                          disabled={!resolutionNotes.trim()}
                          style={{
                            padding: '10px 20px',
                            background: resolutionNotes.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#e5e7eb',
                            color: resolutionNotes.trim() ? 'white' : '#9ca3af',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: resolutionNotes.trim() ? 'pointer' : 'not-allowed',
                            fontSize: 14
                          }}
                        >
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => {
                            setResolvingId(null);
                            setResolutionNotes('');
                          }}
                          style={{
                            padding: '10px 20px',
                            background: 'white',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(d.id)}
                      style={{
                        marginTop: 16,
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14,
                        width: '100%'
                      }}
                    >
                      Resolve This Discrepancy
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Resolved Discrepancies */}
      {activeTab === 'resolved' && (
        <>
          {discrepancies.filter(d => d.resolved).length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No resolved discrepancies
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {discrepancies.filter(d => d.resolved).map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{d.item_name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Order: <span style={{ color: '#3b82f6' }}>{d.order_number}</span>
                        {' • '}{d.franchise_name}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      background: '#d1fae5',
                      color: '#065f46',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      RESOLVED
                    </span>
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
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Short</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444' }}>-{d.difference} {d.uom}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reported Reason:</div>
                    <div style={{ fontSize: 14 }}>{d.notes}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                      Reported on {formatDateTime(d.created_at)}
                    </div>
                  </div>

                  {/* Discrepancy Photos */}
                  {d.photos && d.photos.length > 0 && (
                    <div style={{
                      marginBottom: 16,
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
                            alt={`Discrepancy ${idx + 1}`}
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

                  {/* Resolution Details */}
                  <div style={{
                    padding: 16,
                    background: '#f0fdf4',
                    borderRadius: 10,
                    border: '1px solid #86efac'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Resolution Details
                    </div>
                    <div style={{ fontSize: 14, color: '#166534', marginBottom: 8 }}>
                      {d.resolution_notes}
                    </div>
                    <div style={{ fontSize: 11, color: '#059669' }}>
                      Resolved on {formatDateTime(d.resolved_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
