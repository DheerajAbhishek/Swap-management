import { useState, useEffect } from 'react';
import SearchableDropdown from '../SearchableDropdown';
import { formatCurrency } from '../../utils/constants';

/**
 * WastageForm - Form for entering daily wastage
 */
export default function WastageForm({ items, onSubmit, loading, initialData = [] }) {
  const [rows, setRows] = useState(
    initialData.length > 0 ? initialData : [{ item: '', qty: '', uom: 'kg', price: 0, total: 0, reason: '' }]
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemNames = items.map(i => i.name);

  const handleItemChange = (index, itemName) => {
    const updated = [...rows];
    updated[index].item = itemName;

    const itemData = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    if (itemData) {
      updated[index].price = itemData.standard_price || 0;
      updated[index].uom = itemData.defaultUom || 'kg';
      updated[index].total = updated[index].qty * updated[index].price;
    }

    setRows(updated);
  };

  const handleQtyChange = (index, qty) => {
    const updated = [...rows];
    updated[index].qty = qty;
    updated[index].total = qty * updated[index].price;
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { item: '', qty: '', uom: 'kg', price: 0, total: 0, reason: '' }]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      setRows([{ item: '', qty: '', uom: 'kg', price: 0, total: 0, reason: '' }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const grandTotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validRows = rows.filter(r => r.item && r.qty > 0);
    if (validRows.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Validate that all items exist in the items list
    const invalidItems = validRows.filter(r => !itemNames.includes(r.item));
    if (invalidItems.length > 0) {
      alert('Please select valid items from the dropdown. Invalid items detected.');
      return;
    }

    onSubmit({
      items: validRows.map(r => ({
        item_name: r.item,
        qty: parseFloat(r.qty),
        uom: r.uom,
        unit_price: r.price,
        total: r.total,
        reason: r.reason
      })),
      total: grandTotal
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {isMobile ? (
        // Mobile Card View
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {rows.map((row, index) => (
            <div key={index} style={{
              background: '#fef9f9',
              borderRadius: 10,
              padding: 12,
              border: '1px solid #fee2e2'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Item #{index + 1}</span>
                {index > 0 || rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Item</label>
                <SearchableDropdown
                  items={itemNames}
                  selectedItem={row.item}
                  onChange={(value) => handleItemChange(index, value)}
                  placeholder="Select item..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.qty}
                    onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, fontSize: 14 }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>UOM</label>
                  <select
                    value={row.uom}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].uom = e.target.value;
                      setRows(updated);
                    }}
                    style={{ ...inputStyle, fontSize: 14 }}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Reason</label>
                <select
                  value={row.reason}
                  onChange={(e) => {
                    const updated = [...rows];
                    updated[index].reason = e.target.value;
                    setRows(updated);
                  }}
                  style={{ ...inputStyle, fontSize: 14 }}
                >
                  <option value="">Select...</option>
                  <option value="expired">Expired</option>
                  <option value="spoiled">Spoiled</option>
                  <option value="damaged">Damaged</option>
                  <option value="overcooked">Overcooked</option>
                  <option value="spilled">Spilled</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #fee2e2' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Price: {formatCurrency(row.price)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>Total: {formatCurrency(row.total)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#fef2f2' }}>
                <th style={thStyle}>Item</th>
                <th style={{ ...thStyle, width: 70 }}>Qty</th>
                <th style={{ ...thStyle, width: 100 }}>UOM</th>
                <th style={{ ...thStyle, width: 90 }}>Price</th>
                <th style={{ ...thStyle, width: 90 }}>Total</th>
                <th style={{ ...thStyle, width: 120 }}>Reason</th>
                <th style={{ ...thStyle, width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <SearchableDropdown
                      items={itemNames}
                      selectedItem={row.item}
                      onChange={(value) => handleItemChange(index, value)}
                      placeholder="Select item..."
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.qty}
                      onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                      placeholder="0"
                    />
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={row.uom}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[index].uom = e.target.value;
                        setRows(updated);
                      }}
                      style={inputStyle}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="box">box</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: '#6b7280' }}>{formatCurrency(row.price)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>{formatCurrency(row.total)}</span>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={row.reason}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[index].reason = e.target.value;
                        setRows(updated);
                      }}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="expired">Expired</option>
                      <option value="spoiled">Spoiled</option>
                      <option value="damaged">Damaged</option>
                      <option value="overcooked">Overcooked</option>
                      <option value="spilled">Spilled</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    {index > 0 || rows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: 'none',
                          background: '#fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: 14
                        }}
                      >
                        ✕
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        gap: isMobile ? 12 : 0,
        marginTop: 12 
      }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: isMobile ? '10px 16px' : '8px 16px',
            borderRadius: 8,
            border: '1px dashed #dc2626',
            background: 'transparent',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: isMobile ? 14 : 13,
            fontWeight: 500
          }}
        >
          + Add Item
        </button>

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center', 
          gap: isMobile ? 12 : 16 
        }}>
          <div style={{ 
            padding: isMobile ? '8px 12px' : 0,
            background: isMobile ? '#fef2f2' : 'transparent',
            borderRadius: isMobile ? 8 : 0,
            textAlign: isMobile ? 'center' : 'left'
          }}>
            <span style={{ fontSize: isMobile ? 12 : 14, color: '#374151' }}>
              Total: <strong style={{ color: '#dc2626', fontSize: isMobile ? 18 : 16 }}>{formatCurrency(grandTotal)}</strong>
            </span>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: isMobile ? '12px 20px' : '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#9ca3af' : '#dc2626',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: isMobile ? 14 : 13
            }}
          >
            {loading ? 'Saving...' : 'Save Wastage'}
          </button>
        </div>
      </div>
    </form>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 };
const tdStyle = { padding: '8px 12px', fontSize: 13 };
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  boxSizing: 'border-box'
};
