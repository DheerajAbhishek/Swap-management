import { useState } from 'react';

/**
 * DiscrepancyForm - Form for reporting quantity discrepancies
 */
export default function DiscrepancyForm({ orderItems, onSubmit, loading }) {
  const [discrepancies, setDiscrepancies] = useState(
    orderItems.map(item => ({
      orderItemId: item.id,
      itemName: item.item_name,
      orderedQty: item.ordered_qty,
      receivedQty: item.ordered_qty, // Default to ordered qty
      uom: item.uom,
      hasDiscrepancy: false,
      notes: ''
    }))
  );

  const handleReceivedQtyChange = (index, value) => {
    const updated = [...discrepancies];
    updated[index].receivedQty = parseFloat(value) || 0;
    updated[index].hasDiscrepancy = updated[index].receivedQty !== updated[index].orderedQty;
    setDiscrepancies(updated);
  };

  const handleNotesChange = (index, value) => {
    const updated = [...discrepancies];
    updated[index].notes = value;
    setDiscrepancies(updated);
  };

  const hasAnyDiscrepancy = discrepancies.some(d => d.hasDiscrepancy);

  const handleSubmit = (e) => {
    e.preventDefault();

    const itemsWithDiscrepancy = discrepancies
      .filter(d => d.hasDiscrepancy)
      .map(d => ({
        orderItemId: d.orderItemId,
        itemName: d.itemName,
        orderedQty: d.orderedQty,
        receivedQty: d.receivedQty,
        difference: d.orderedQty - d.receivedQty,
        uom: d.uom,
        notes: d.notes
      }));

    onSubmit({
      receivedItems: discrepancies.map(d => ({
        orderItemId: d.orderItemId,
        receivedQty: d.receivedQty
      })),
      discrepancies: itemsWithDiscrepancy
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
          Confirm Received Quantities
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Ordered</th>
                <th style={thStyle}>Received</th>
                <th style={thStyle}>UOM</th>
                <th style={thStyle}>Difference</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((item, index) => {
                const diff = item.orderedQty - item.receivedQty;
                return (
                  <tr
                    key={item.orderItemId}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: item.hasDiscrepancy ? '#fef2f2' : 'transparent'
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500 }}>{item.itemName}</span>
                    </td>
                    <td style={tdStyle}>{item.orderedQty}</td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.receivedQty}
                        onChange={(e) => handleReceivedQtyChange(index, e.target.value)}
                        style={{
                          width: 80,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: item.hasDiscrepancy ? '2px solid #ef4444' : '2px solid #e5e7eb',
                          fontSize: 14
                        }}
                      />
                    </td>
                    <td style={tdStyle}>{item.uom}</td>
                    <td style={tdStyle}>
                      {item.hasDiscrepancy && (
                        <span style={{
                          color: diff > 0 ? '#dc2626' : '#059669',
                          fontWeight: 600
                        }}>
                          {diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {item.hasDiscrepancy && (
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          placeholder="Reason..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '2px solid #e5e7eb',
                            fontSize: 13
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasAnyDiscrepancy && (
        <div style={{
          padding: 16,
          background: '#fef3c7',
          borderRadius: 10,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#92400e' }}>Discrepancy Detected</div>
            <div style={{ fontSize: 13, color: '#a16207' }}>
              {discrepancies.filter(d => d.hasDiscrepancy).length} item(s) have quantity mismatch
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: 10,
          border: 'none',
          background: loading ? '#9ca3af' : hasAnyDiscrepancy
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Submitting...' : hasAnyDiscrepancy ? 'Confirm & Report Discrepancy' : 'Confirm Receipt'}
      </button>
    </form>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: 13
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14
};
