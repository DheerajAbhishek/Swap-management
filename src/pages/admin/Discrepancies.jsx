import { useState, useEffect } from 'react';
import { formatDateTime, formatCurrency } from '../../utils/constants';
import discrepancyService from '../../services/discrepancyService';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Admin Discrepancies - View and resolve discrepancies
 */
export default function Discrepancies() {
  const { subscribe } = useNotificationEvents();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'acknowledged', 'resolved'
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [forceClosingId, setForceClosingId] = useState(null);
  const [forceCloseReason, setForceCloseReason] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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
    const unsubscribe = subscribe(['DISCREPANCY_NEW', 'DISCREPANCY_VENDOR_ACKNOWLEDGED', 'DISCREPANCY_FRANCHISE_CLOSED'], () => {
      console.log('🔄 Admin refreshing discrepancies due to notification');
      fetchDiscrepancies();
    });

    return unsubscribe;
  }, [subscribe]);

  // Filter by status
  const pendingDiscrepancies = discrepancies.filter(d => !d.vendor_acknowledged && !d.franchise_closed);
  const acknowledgedDiscrepancies = discrepancies.filter(d => d.vendor_acknowledged && !d.franchise_closed);
  const resolvedDiscrepancies = discrepancies.filter(d => d.franchise_closed);

  const handleResolve = async (id) => {
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution notes');
      return;
    }

    try {
      await discrepancyService.resolveDiscrepancy(id, { resolution_notes: resolutionNotes });
      await fetchDiscrepancies();
      setResolvingId(null);
      setResolutionNotes('');
    } catch (err) {
      alert('Failed to resolve discrepancy: ' + err.message);
    }
  };

  const handleForceClose = async (id) => {
    if (!forceCloseReason.trim()) {
      alert('Please enter a reason for force closing');
      return;
    }

    if (!confirm('Are you sure you want to force close this discrepancy? This will mark it as resolved.')) {
      return;
    }

    try {
      await discrepancyService.forceClose(id, forceCloseReason);
      alert('Discrepancy force closed successfully!');
      await fetchDiscrepancies();
      setForceClosingId(null);
      setForceCloseReason('');
    } catch (err) {
      alert('Failed to force close discrepancy: ' + err.message);
    }
  };

  const handleDelete = async (id, softDelete) => {
    const deleteType = softDelete ? 'soft delete (audit trail preserved)' : 'permanently delete';
    if (!confirm(`Are you sure you want to ${deleteType} this discrepancy?`)) {
      return;
    }

    try {
      await discrepancyService.deleteDiscrepancy(id, softDelete);
      alert(`Discrepancy ${softDelete ? 'soft deleted' : 'permanently deleted'} successfully!`);
      await fetchDiscrepancies();
      setDeletingId(null);
    } catch (err) {
      alert('Failed to delete discrepancy: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading discrepancies...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Discrepancies - Two-Step Resolution
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Monitor discrepancy workflow: Vendor acknowledges → Franchise confirms receipt
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20
      }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'pending' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
            color: activeTab === 'pending' ? 'white' : '#6b7280',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Pending Vendor ({pendingDiscrepancies.length})
        </button>
        <button
          onClick={() => setActiveTab('acknowledged')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'acknowledged' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
            color: activeTab === 'acknowledged' ? 'white' : '#6b7280',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Vendor Acknowledged ({acknowledgedDiscrepancies.length})
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
          Fully Resolved ({resolvedDiscrepancies.length})
        </button>
      </div>

      {/* Discrepancies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(() => {
          const selectedDiscrepancies = activeTab === 'pending'
            ? pendingDiscrepancies
            : activeTab === 'acknowledged'
              ? acknowledgedDiscrepancies
              : resolvedDiscrepancies;

          if (selectedDiscrepancies.length === 0) {
            return (
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No {activeTab} discrepancies
              </div>
            );
          }

          return selectedDiscrepancies.map((d) => {
            const status = d.franchise_closed
              ? 'FULLY_RESOLVED'
              : d.vendor_acknowledged
                ? 'VENDOR_ACKNOWLEDGED'
                : 'PENDING';

            const statusConfig = {
              PENDING: { border: '#ef4444', badge: { bg: '#fee2e2', color: '#991b1b', text: 'PENDING VENDOR' } },
              VENDOR_ACKNOWLEDGED: { border: '#f59e0b', badge: { bg: '#fef3c7', color: '#92400e', text: 'VENDOR ACKNOWLEDGED' } },
              FULLY_RESOLVED: { border: '#10b981', badge: { bg: '#d1fae5', color: '#065f46', text: 'FULLY RESOLVED' } }
            };
            const config = statusConfig[status];

            // Calculate overage or shortage
            const isOverage = d.discrepancy_type === 'OVERAGE' || (d.received_qty > d.ordered_qty);
            const isShortage = d.discrepancy_type === 'SHORTAGE' || (d.received_qty < d.ordered_qty);
            const difference = Math.abs(parseFloat((d.ordered_qty - d.received_qty).toFixed(2)));
            const diffColor = isOverage ? '#059669' : '#ef4444';
            const diffSign = isOverage ? '+' : '-';

            return (
              <div
                key={d.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${config.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{d.item_name}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: config.badge.bg,
                        color: config.badge.color,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {config.badge.text}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Order: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{d.order_number}</span>
                      {' • '}{d.franchise_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                    Reported: {formatDateTime(d.created_at)}
                    {d.reported_by_name && <div style={{ fontSize: 11 }}>by {d.reported_by_name}</div>}
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
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{isOverage ? 'Extra' : 'Short'}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: diffColor }}>{diffSign}{difference} {d.uom}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reported Reason:</div>
                  <div style={{ fontSize: 14 }}>{d.notes}</div>
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

                {/* Workflow Status */}
                {d.vendor_acknowledged && (
                  <div style={{
                    padding: 12,
                    background: status === 'FULLY_RESOLVED' ? '#f0fdf4' : '#fef3c7',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: `1px solid ${status === 'FULLY_RESOLVED' ? '#86efac' : '#fbbf24'}`
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: status === 'FULLY_RESOLVED' ? '#166534' : '#92400e', marginBottom: 8 }}>
                      ✓ Step 1: Vendor Acknowledged
                    </div>
                    <div style={{ fontSize: 13, color: status === 'FULLY_RESOLVED' ? '#166534' : '#92400e', marginBottom: 4 }}>
                      "{d.vendor_notes}"
                    </div>
                    <div style={{ fontSize: 11, color: status === 'FULLY_RESOLVED' ? '#059669' : '#a16207' }}>
                      {d.vendor_acknowledged_by_name || 'Vendor'} on {formatDateTime(d.vendor_acknowledged_at)}
                    </div>
                  </div>
                )}

                {d.franchise_closed && (
                  <div style={{
                    padding: 12,
                    background: '#f0fdf4',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: '1px solid #86efac'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
                      ✓ Step 2: Franchise Confirmed Receipt & Closed
                    </div>
                    {d.franchise_notes && (
                      <div style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>
                        "{d.franchise_notes}"
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#059669' }}>
                      {d.franchise_closed_by_name || 'Franchise'} on {formatDateTime(d.franchise_closed_at)}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {!d.franchise_closed && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Force Close */}
                    {forceClosingId === d.id ? (
                      <div style={{ padding: 16, background: '#fef3c7', borderRadius: 10, border: '1px solid #fbbf24' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
                          ⚠️ Force Close - Skip Normal Workflow
                        </div>
                        <textarea
                          value={forceCloseReason}
                          onChange={(e) => setForceCloseReason(e.target.value)}
                          placeholder="Enter reason for force closing (e.g., 'Franchise confirmed verbally', 'Urgent closure needed')..."
                          style={{
                            width: '100%',
                            padding: 12,
                            borderRadius: 8,
                            border: '2px solid #fbbf24',
                            fontSize: 14,
                            minHeight: 70,
                            resize: 'vertical',
                            marginBottom: 12,
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleForceClose(d.id)}
                            disabled={!forceCloseReason.trim()}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: 'none',
                              background: forceCloseReason.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
                              color: forceCloseReason.trim() ? 'white' : '#9ca3af',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: forceCloseReason.trim() ? 'pointer' : 'not-allowed'
                            }}
                          >
                            ⚠️ Force Close
                          </button>
                          <button
                            onClick={() => { setForceClosingId(null); setForceCloseReason(''); }}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: '1px solid #d1d5db',
                              background: 'white',
                              color: '#6b7280',
                              fontSize: 13,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : deletingId === d.id ? (
                      <div style={{ padding: 16, background: '#fee2e2', borderRadius: 10, border: '1px solid #fca5a5' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 12 }}>
                          🗑️ Delete Discrepancy - Choose Type
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleDelete(d.id, true)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              minWidth: '140px'
                            }}
                          >
                            📝 Soft Delete (Audit Trail)
                          </button>
                          <button
                            onClick={() => handleDelete(d.id, false)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              minWidth: '140px'
                            }}
                          >
                            🗑️ Hard Delete (Permanent)
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: '1px solid #d1d5db',
                              background: 'white',
                              color: '#6b7280',
                              fontSize: 13,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setForceClosingId(d.id)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: 8,
                            border: '2px solid #f59e0b',
                            background: 'white',
                            color: '#f59e0b',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            minWidth: '140px'
                          }}
                        >
                          ⚠️ Force Close
                        </button>
                        <button
                          onClick={() => setDeletingId(d.id)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: 8,
                            border: '2px solid #ef4444',
                            background: 'white',
                            color: '#ef4444',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            minWidth: '140px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

const tabBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: 'white',
  color: '#6b7280',
  fontSize: 14,
  cursor: 'pointer'
};

const activeTabBtn = {
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid #3b82f6',
  background: '#eff6ff',
  color: '#3b82f6',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
};
