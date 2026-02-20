import { useState, useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import SearchableDropdown from '../SearchableDropdown';
import { DEFAULT_UOM_OPTIONS, formatCurrency } from '../../utils/constants';

/**
 * OrderForm - Form for creating purchase orders (Mobile Responsive)
 */
export default function OrderForm({ items, onSubmit, loading, initialData, submitButtonText = 'Place Order', error, isSubmitting }) {
  const [rows, setRows] = useState([
    { item: '', qty: '', uom: '', price: 0, total: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const dateInputRef = useRef(null);
  const flatpickrInstance = useRef(null);

  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
      if (initialData.items && initialData.items.length > 0) {
        const initialRows = initialData.items.map(item => ({
          item: item.item_name,
          qty: item.qty || item.ordered_qty || '',
          uom: item.uom || 'kg',
          price: item.unit_price || 0,
          total: (item.qty || item.ordered_qty || 0) * (item.unit_price || 0)
        }));
        setRows(initialRows);
      }
      if (initialData.notes) {
        setNotes(initialData.notes);
      }
    }
  }, [initialData]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize flatpickr for date selection
  useEffect(() => {
    if (dateInputRef.current) {
      flatpickrInstance.current = flatpickr(dateInputRef.current, {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        defaultDate: new Date().fp_incr(1), // Tomorrow by default
        onChange: (selectedDates, dateStr) => {
          setDeliveryDate(dateStr);
        }
      });
      // Set initial date
      setDeliveryDate(flatpickrInstance.current.formatDate(new Date().fp_incr(1), 'Y-m-d'));
    }

    return () => {
      if (flatpickrInstance.current) {
        flatpickrInstance.current.destroy();
      }
    };
  }, []);

  const itemNames = items.map(i => i.name);

  console.log('OrderForm - Total items available:', items.length);
  console.log('OrderForm - Item names:', itemNames);
  console.log('OrderForm - Current rows:', rows);

  const handleItemChange = (index, itemName) => {
    const updated = [...rows];
    updated[index].item = itemName;

    // Auto-fill price and UOM from item data
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
    setRows([...rows, { item: '', qty: '', uom: '', price: 0, total: 0 }]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      setRows([{ item: '', qty: '', uom: '', price: 0, total: 0 }]);
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

    // Only require delivery date for new orders (not when editing)
    if (!initialData && !deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    onSubmit({
      items: validRows.map(r => ({
        item_name: r.item,
        qty: parseFloat(r.qty),
        uom: r.uom,
        unit_price: r.price
      })),
      deliveryDate,
      notes
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Mobile Card Layout */}
      {isMobile ? (
        <div style={{ marginBottom: 16 }}>
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                background: '#f9fafb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Item #{index + 1}</span>
                {(index > 0 || rows.length > 1) && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                  Select Item *
                </label>
                <SearchableDropdown
                  items={itemNames}
                  selectedItem={row.item}
                  onChange={(value) => handleItemChange(index, value)}
                  placeholder="Search items..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.qty}
                    onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '2px solid #e5e7eb',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    Unit
                  </label>
                  <select
                    value={row.uom}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].uom = e.target.value;
                      setRows(updated);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '2px solid #e5e7eb',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      background: 'white'
                    }}
                  >
                    {DEFAULT_UOM_OPTIONS.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Price: </span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(row.price)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Total: </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{formatCurrency(row.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop Table Layout */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Item</th>
                <th style={{ ...thStyle, width: 100 }}>Qty</th>
                <th style={{ ...thStyle, width: 120 }}>UOM</th>
                <th style={{ ...thStyle, width: 120 }}>Price</th>
                <th style={{ ...thStyle, width: 120 }}>Total</th>
                <th style={{ ...thStyle, width: 60 }}></th>
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
                      {DEFAULT_UOM_OPTIONS.map(uom => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>
                      {formatCurrency(row.price)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>
                      {formatCurrency(row.total)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      style={deleteBtnStyle}
                    >
                      ✕
                    </button>
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
        marginBottom: 20
      }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: isMobile ? '12px 16px' : '8px 16px',
            borderRadius: 8,
            border: '2px dashed #d1d5db',
            background: 'transparent',
            color: '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
            order: isMobile ? 2 : 1
          }}
        >
          + Add Item
        </button>

        <div style={{
          fontSize: isMobile ? 16 : 18,
          fontWeight: 700,
          textAlign: isMobile ? 'right' : 'left',
          padding: isMobile ? '12px 0' : 0,
          order: isMobile ? 1 : 2,
          background: isMobile ? '#f0fdf4' : 'transparent',
          borderRadius: isMobile ? 8 : 0,
          paddingRight: isMobile ? 12 : 0
        }}>
          Grand Total: {formatCurrency(grandTotal)}
        </div>
      </div>

      {/* Delivery Date Selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151', fontSize: 13 }}>
          Delivery Date *
        </label>
        <input
          ref={dateInputRef}
          type="text"
          placeholder="Select delivery date"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '2px solid #e5e7eb',
            fontSize: 14,
            boxSizing: 'border-box',
            cursor: 'pointer'
          }}
          readOnly
        />
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          Select when you need the items delivered
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151', fontSize: 13 }}>
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any special instructions..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: '2px solid #e5e7eb',
            fontSize: 14,
            minHeight: 80,
            resize: 'vertical'
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: '#fee2e2',
          borderRadius: 8,
          marginBottom: 16,
          color: '#dc2626',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || isSubmitting}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: 10,
          border: 'none',
          background: (loading || isSubmitting) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
          cursor: (loading || isSubmitting) ? 'not-allowed' : 'pointer'
        }}
      >
        {(loading || isSubmitting) ? 'Submitting...' : submitButtonText}
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
  padding: '8px 12px'
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '2px solid #e5e7eb',
  fontSize: 14
};

const deleteBtnStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#fee2e2',
  color: '#dc2626',
  cursor: 'pointer',
  fontSize: 12
};
