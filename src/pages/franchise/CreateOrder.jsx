import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../../components/Supply/OrderForm';
import { formatDate } from '../../utils/constants';
import { itemService } from '../../services/itemService';
import { orderService } from '../../services/orderService';

/**
 * Franchise Create Order - Create new purchase order
 */
export default function CreateOrder() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const navigate = useNavigate();

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await itemService.getItems();
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleSubmit = async (orderData) => {
    setSubmitting(true);
    setError(null);

    try {
      // Transform order data for API - OrderForm returns { item_name, qty, uom, unit_price }
      const apiOrderData = {
        items: orderData.items.map(item => {
          // Find item_id from items list
          const itemData = items.find(i => i.name === item.item_name);
          return {
            item_id: itemData?.id || '',
            item_name: item.item_name,
            category: itemData?.category || '',
            uom: item.uom,
            quantity: item.qty,  // OrderForm returns 'qty', not 'quantity'
            unit_price: item.unit_price
          };
        }),
        notes: orderData.notes || ''
      };

      const result = await orderService.createOrder(apiOrderData);
      setNewOrderNumber(result.order_number);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading items...</div>;
  }

  if (error && !items.length) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{error}</div>;
  }

  if (success) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        maxWidth: 500,
        margin: '0 auto'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
          Order Placed Successfully!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Your purchase order has been submitted to the kitchen.
        </p>
        <div style={{
          padding: 16,
          background: '#f3f4f6',
          borderRadius: 10,
          marginBottom: 24
        }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Order Number</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
            {newOrderNumber}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/franchise/orders')}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#e5e7eb',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            View Orders
          </button>
          <button
            onClick={() => { setSuccess(false); setNewOrderNumber(''); }}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Create Purchase Order
            </h1>
            <p style={{ color: '#6b7280', marginTop: 4 }}>
              Select items and quantities to order from the kitchen
            </p>
          </div>
          <div style={{
            background: 'white',
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 500 }}>Order Date</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{formatDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: '#fffbeb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ fontSize: 14, color: '#92400e' }}>
          Prices are fixed by Admin and cannot be modified. Select items and enter quantities.
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <OrderForm
          items={items}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>
    </div>
  );
}
