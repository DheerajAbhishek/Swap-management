import { useState, useEffect } from 'react';
import { formatDateTime } from '../../utils/constants';
import discrepancyService from '../../services/discrepancyService';

/**
 * Kitchen View Discrepancies - See reported issues
 */
export default function ViewDiscrepancies() {
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDiscrepancies = async () => {
      try {
        setLoading(true);
        const data = await discrepancyService.getDiscrepancies();
        // Kitchen only sees open discrepancies
        setDiscrepancies(data.filter(d => !d.resolved));
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch discrepancies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiscrepancies();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading discrepancies...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          View Discrepancies
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Reported quantity mismatches from franchises
        </p>
      </div>

      {discrepancies.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No discrepancies reported
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {discrepancies.map((d) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
