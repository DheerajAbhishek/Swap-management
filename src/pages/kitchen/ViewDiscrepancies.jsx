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
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [vendorNotes, setVendorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'acknowledged', 'resolved', 'rejected'

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
      console.log('🔄 Refreshing discrepancies due to notification');
      fetchDiscrepancies();
    });

    return unsubscribe;
  }, [subscribe]);

  const handleAcknowledge = async (discrepancyId) => {
    if (!vendorNotes.trim()) {
      alert('Please provide acknowledgment notes (e.g., "Will send items with next delivery")');
      return;
    }

    try {
      await discrepancyService.vendorAcknowledge(discrepancyId, vendorNotes);
      alert('Discrepancy acknowledged! Franchise will be notified.');
      setAcknowledgingId(null);
      setVendorNotes('');
      fetchDiscrepancies(); // Refresh list
    } catch (err) {
      alert('Failed to acknowledge discrepancy: ' + err.message);
    }
  };

  const handleReject = async (discrepancyId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this discrepancy');
      return;
    }

    if (!confirm('Are you sure you want to reject this discrepancy? This will close it as rejected.')) {
      return;
    }

    try {
      await discrepancyService.vendorReject(discrepancyId, rejectionReason);
      alert('Discrepancy rejected! Franchise will be notified.');
      setRejectingId(null);
      setRejectionReason('');
      fetchDiscrepancies(); // Refresh list
    } catch (err) {
      alert('Failed to reject discrepancy: ' + err.message);
    }
  };

  // Filter functions
  const pendingDiscrepancies = discrepancies.filter(d => !d.vendor_acknowledged && !d.franchise_closed && !d.vendor_rejected);
  const acknowledgedDiscrepancies = discrepancies.filter(d => d.vendor_acknowledged && !d.franchise_closed && !d.vendor_rejected);
  const resolvedDiscrepancies = discrepancies.filter(d => d.franchise_closed && !d.vendor_rejected);
  const rejectedDiscrepancies = discrepancies.filter(d => d.vendor_rejected);

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
          Quantity mismatches reported by franchises - acknowledge and promise to send items
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
          Pending ({pendingDiscrepancies.length})
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
          Acknowledged ({acknowledgedDiscrepancies.length})
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
        <button
          onClick={() => setActiveTab('rejected')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'rejected' ? 'linear-gradient(135deg, #6b7280, #4b5563)' : '#e5e7eb',
            color: activeTab === 'rejected' ? 'white' : '#6b7280',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Rejected ({rejectedDiscrepancies.length})
        </button>
      </div>

      {/* Pending Discrepancies - Need Vendor Acknowledgment */}
      {activeTab === 'pending' && (
        <>
          {pendingDiscrepancies.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No pending discrepancies
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pendingDiscrepancies.map((d) => {
                // Determine if overage or shortage based on received vs ordered quantities
                const isOverage = d.discrepancy_type === 'OVERAGE' || (d.received_qty > d.ordered_qty) || (d.difference && d.difference < 0);
                const isShortage = d.discrepancy_type === 'SHORTAGE' || (d.received_qty < d.ordered_qty) || (d.difference && d.difference > 0);
                const difference = Math.abs(d.difference || (d.ordered_qty - d.received_qty) || 0);
                const discTypeLabel = isOverage ? 'OVERAGE' : 'SHORTAGE';
                const discTypeColor = isOverage ? '#059669' : '#ef4444';

                return (
                  <div
                    key={d.id}
                    style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: `4px solid ${discTypeColor}`
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
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          background: '#fee2e2',
                          color: '#991b1b',
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          PENDING
                        </span>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: discTypeColor,
                          marginTop: 4
                        }}>
                          {isOverage ? '📦' : '⚠️'} {discTypeLabel}
                        </div>
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
                        <div style={{ fontSize: 18, fontWeight: 600, color: discTypeColor }}>
                          {isOverage ? '+' : '-'}{difference} {d.uom}
                        </div>
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

                    {/* Acknowledge/Reject Section */}
                    {acknowledgingId === d.id ? (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#fef3c7',
                        borderRadius: 10,
                        border: '1px solid #fbbf24'
                      }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#92400e' }}>
                          Your Action Plan *
                        </label>
                        <textarea
                          value={vendorNotes}
                          onChange={(e) => setVendorNotes(e.target.value)}
                          placeholder="e.g., 'Will send 20kg missing items with tomorrow's delivery' or 'Items will be dispatched today'"
                          style={{
                            width: '100%',
                            minHeight: 80,
                            padding: 12,
                            borderRadius: 8,
                            border: '2px solid #fbbf24',
                            fontSize: 14,
                            resize: 'vertical',
                            marginBottom: 12
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleAcknowledge(d.id)}
                            disabled={!vendorNotes.trim()}
                            style={{
                              padding: '10px 20px',
                              background: vendorNotes.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
                              color: vendorNotes.trim() ? 'white' : '#9ca3af',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: vendorNotes.trim() ? 'pointer' : 'not-allowed',
                              fontSize: 14
                            }}
                          >
                            ✓ Acknowledge & Promise to Send
                          </button>
                          <button
                            onClick={() => {
                              setAcknowledgingId(null);
                              setVendorNotes('');
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
                    ) : rejectingId === d.id ? (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#fee2e2',
                        borderRadius: 10,
                        border: '1px solid #fca5a5'
                      }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#991b1b' }}>
                          Rejection Reason *
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g., 'Items were sent as per order, franchise count may be incorrect' or 'This quantity was never ordered'"
                          style={{
                            width: '100%',
                            minHeight: 80,
                            padding: 12,
                            borderRadius: 8,
                            border: '2px solid #fca5a5',
                            fontSize: 14,
                            resize: 'vertical',
                            marginBottom: 12
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleReject(d.id)}
                            disabled={!rejectionReason.trim()}
                            style={{
                              padding: '10px 20px',
                              background: rejectionReason.trim() ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
                              color: rejectionReason.trim() ? 'white' : '#9ca3af',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: rejectionReason.trim() ? 'pointer' : 'not-allowed',
                              fontSize: 14
                            }}
                          >
                            ✕ Reject Discrepancy
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason('');
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
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button
                          onClick={() => setAcknowledgingId(d.id)}
                          style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                        >
                          ✓ Acknowledge & Promise to Send
                        </button>
                        <button
                          onClick={() => setRejectingId(d.id)}
                          style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: 'white',
                            color: '#ef4444',
                            border: '2px solid #ef4444',
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                        >
                          ✕ Reject Discrepancy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Acknowledged Discrepancies - Waiting for Franchise to Close */}
      {activeTab === 'acknowledged' && (
        <>
          {acknowledgedDiscrepancies.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No acknowledged discrepancies - all are either pending or resolved
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {acknowledgedDiscrepancies.map((d) => {
                // Determine if overage or shortage based on received vs ordered quantities
                const isOverage = d.discrepancy_type === 'OVERAGE' || (d.received_qty > d.ordered_qty) || (d.difference && d.difference < 0);
                const isShortage = d.discrepancy_type === 'SHORTAGE' || (d.received_qty < d.ordered_qty) || (d.difference && d.difference > 0);
                const difference = Math.abs(d.difference || (d.ordered_qty - d.received_qty) || 0);
                const discTypeColor = isOverage ? '#059669' : '#ef4444';

                return (
                  <div
                    key={d.id}
                    style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: '4px solid #f59e0b'
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
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        ACKNOWLEDGED
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
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{isOverage ? 'Extra' : 'Short'}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: discTypeColor }}>
                          {isOverage ? '+' : '-'}{difference} {d.uom}
                        </div>
                      </div>
                    </div>

                    {/* Your Acknowledgment */}
                    <div style={{
                      padding: 16,
                      background: '#fef3c7',
                      borderRadius: 10,
                      border: '1px solid #fbbf24',
                      marginBottom: 16
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Your Promise
                      </div>
                      <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8 }}>
                        {d.vendor_notes}
                      </div>
                      <div style={{ fontSize: 11, color: '#a16207' }}>
                        Acknowledged by {d.vendor_acknowledged_by_name || 'Vendor'} on {formatDateTime(d.vendor_acknowledged_at)}
                      </div>
                    </div>

                    {/* Waiting Status */}
                    <div style={{
                      padding: 12,
                      background: '#eff6ff',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span style={{ color: '#1e40af', fontSize: 14, fontWeight: 600 }}>
                        Waiting for franchise to confirm receipt and close discrepancy
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Resolved Discrepancies */}
      {activeTab === 'resolved' && (
        <>
          {resolvedDiscrepancies.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No fully resolved discrepancies yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {resolvedDiscrepancies.map((d) => {
                // Determine if overage or shortage based on received vs ordered quantities
                const isOverage = d.discrepancy_type === 'OVERAGE' || (d.received_qty > d.ordered_qty) || (d.difference && d.difference < 0);
                const isShortage = d.discrepancy_type === 'SHORTAGE' || (d.received_qty < d.ordered_qty) || (d.difference && d.difference > 0);
                const difference = Math.abs(d.difference || (d.ordered_qty - d.received_qty) || 0);
                const discTypeColor = isOverage ? '#059669' : '#ef4444';

                return (
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
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{isOverage ? 'Extra' : 'Short'}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: discTypeColor }}>
                          {isOverage ? '+' : '-'}{difference} {d.uom}
                        </div>
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

                    {/* Resolution Details - Two Steps */}
                    <div style={{
                      padding: 16,
                      background: '#f0fdf4',
                      borderRadius: 10,
                      border: '1px solid #86efac',
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Resolution Timeline
                      </div>

                      {/* Step 1: Vendor Acknowledged */}
                      <div style={{ marginBottom: 12, paddingLeft: 16, borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                          ✓ Step 1: Vendor Acknowledged
                        </div>
                        {d.vendor_notes && (
                          <div style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>
                            "{d.vendor_notes}"
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#059669' }}>
                          {d.vendor_acknowledged_by_name || 'Vendor'} on {formatDateTime(d.vendor_acknowledged_at)}
                        </div>
                      </div>

                      {/* Step 2: Franchise Closed */}
                      <div style={{ paddingLeft: 16, borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                          ✓ Step 2: Franchise Confirmed & Closed
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Rejected Discrepancies */}
      {activeTab === 'rejected' && (
        <>
          {rejectedDiscrepancies.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No rejected discrepancies
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rejectedDiscrepancies.map((d) => {
                const isOverage = d.discrepancy_type === 'OVERAGE' || (d.received_qty > d.ordered_qty) || (d.difference && d.difference < 0);
                const isShortage = d.discrepancy_type === 'SHORTAGE' || (d.received_qty < d.ordered_qty) || (d.difference && d.difference > 0);
                const difference = Math.abs(d.difference || (d.ordered_qty - d.received_qty) || 0);
                const discTypeColor = isOverage ? '#059669' : '#ef4444';

                return (
                  <div
                    key={d.id}
                    style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: '4px solid #6b7280',
                      opacity: 0.8
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
                        background: '#e5e7eb',
                        color: '#4b5563',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        REJECTED
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
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{isOverage ? 'Extra' : 'Short'}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: discTypeColor }}>
                          {isOverage ? '+' : '-'}{difference} {d.uom}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reported Reason:</div>
                      <div style={{ fontSize: 14 }}>{d.notes}</div>
                    </div>

                    {/* Rejection Details */}
                    <div style={{
                      padding: 16,
                      background: '#fee2e2',
                      borderRadius: 10,
                      border: '1px solid #fca5a5'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Rejection Reason
                      </div>
                      <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8 }}>
                        {d.rejection_reason}
                      </div>
                      <div style={{ fontSize: 11, color: '#b91c1c' }}>
                        Rejected by {d.vendor_rejected_by_name || 'Vendor'} on {formatDateTime(d.vendor_rejected_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
