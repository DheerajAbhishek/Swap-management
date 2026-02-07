import { useState, useEffect } from 'react';
import { formatDateTime, formatCurrency } from '../../utils/constants';
import discrepancyService from '../../services/discrepancyService';

/**
 * Admin Discrepancies - View and resolve discrepancies
 */
export default function Discrepancies() {
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterResolved, setFilterResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

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
  }, []);

  const filteredDiscrepancies = discrepancies.filter(d => d.resolved === filterResolved);

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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading discrepancies...</div>;
  }

  const openCount = discrepancies.filter(d => !d.resolved).length;
  const resolvedCount = discrepancies.filter(d => d.resolved).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Discrepancies
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Review and resolve quantity discrepancies
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

      {/* Discrepancies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          filteredDiscrepancies.map((d) => (
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
                    Order: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{d.order_number}</span>
                    {' • '}{d.franchise_name}
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

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reported Reason:</div>
                <div style={{ fontSize: 14 }}>{d.notes}</div>
              </div>

              {d.resolved && d.resolution_notes && (
                <div style={{
                  padding: 12,
                  background: '#d1fae5',
                  borderRadius: 8,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 12, color: '#065f46', marginBottom: 4 }}>Resolution:</div>
                  <div style={{ fontSize: 14, color: '#065f46' }}>{d.resolution_notes}</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>
                    Resolved by {d.resolved_by} on {formatDateTime(d.resolved_at)}
                  </div>
                </div>
              )}

              {!d.resolved && (
                resolvingId === d.id ? (
                  <div>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter resolution notes (e.g., credit note issued, replacement sent)..."
                      style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        minHeight: 80,
                        resize: 'vertical',
                        marginBottom: 12,
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => { setResolvingId(null); setResolutionNotes(''); }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#e5e7eb',
                          color: '#374151',
                          fontSize: 14,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(d.id)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolvingId(d.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Resolve Discrepancy
                  </button>
                )
              )}
            </div>
          ))
        )}
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
