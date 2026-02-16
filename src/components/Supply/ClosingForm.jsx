import { useState, useEffect } from 'react';
import SearchableDropdown from '../SearchableDropdown';
import { formatCurrency } from '../../utils/constants';

/**
 * ClosingForm - Form for entering closing inventory
 */
export default function ClosingForm({ items, onSubmit, loading, initialData = [] }) {
  const [rows, setRows] = useState(
    initialData.length > 0 ? initialData : [{ item: '', qty: '', uom: 'kg', price: 0, total: 0 }]
  );

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
    setRows([...rows, { item: '', qty: '', uom: 'kg', price: 0, total: 0 }]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      setRows([{ item: '', qty: '', uom: 'kg', price: 0, total: 0 }]);
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
        total: r.total
      })),
      total: grandTotal
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f0fdf4' }}>
              <th style={thStyle}>Item</th>
              <th style={{ ...thStyle, width: 80 }}>Qty</th>
              <th style={{ ...thStyle, width: 100 }}>UOM</th>
              <th style={{ ...thStyle, width: 100 }}>Price</th>
              <th style={{ ...thStyle, width: 100 }}>Total</th>
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
                  <span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(row.total)}</span>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px dashed #10b981',
            background: 'transparent',
            color: '#10b981',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500
          }}
        >
          + Add Item
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#374151' }}>
            Total: <strong style={{ color: '#059669', fontSize: 16 }}>{formatCurrency(grandTotal)}</strong>
          </span>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            {loading ? 'Saving...' : 'Save Closing'}
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
