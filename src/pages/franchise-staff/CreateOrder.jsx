import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../../components/Supply/OrderForm';
import { vendorService } from '../../services/vendorService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

/**
 * Franchise Staff - Create Order
 * Items fetched from connected vendor with franchise prices
 */
export default function StaffCreateOrder() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const vendorId = user?.vendor_id;

        if (!vendorId) {
          setError('No vendor assigned. Please contact admin.');
          return;
        }

        // Get items from vendor with franchise prices
        const data = await vendorService.getVendorItemsForFranchise(vendorId);

        // Transform to format expected by OrderForm
        const formattedItems = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category || 'General',
          defaultUom: item.unit || 'kg',
          standard_price: item.price
        }));

        setItems(formattedItems);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [user]);

  const handleSubmit = async (orderData) => {
    setSubmitting(true);
    setError(null);

    try {
      const apiOrderData = {
        items: orderData.items.map(item => {
          const itemData = items.find(i => i.name === item.item_name);
          return {
            item_id: itemData?.id || '',
            item_name: item.item_name,
            category: itemData?.category || '',
            uom: item.uom,
            quantity: item.qty,
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
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
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{newOrderNumber}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => {
              setSuccess(false);
              setNewOrderNumber('');
            }}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create Another Order
          </button>
          <button
            onClick={() => navigate('/franchise-staff/orders')}
            style={{
              padding: '12px 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Create Purchase Order
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Add items to create a new order for the kitchen
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <OrderForm
          items={items}
          onSubmit={handleSubmit}
          loading={submitting}
          hideTotal={false} // Staff can see item totals for the order they're creating
        />
      </div>
    </div>
  );
}
