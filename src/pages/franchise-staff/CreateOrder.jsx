import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../../components/Supply/OrderForm';
import { franchiseService } from '../../services/franchiseService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

/**
 * Franchise Staff - Create Order
 * Uses franchise-specific item prices from Franchise Management
 */
export default function StaffCreateOrder() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Store all items
  const [vendors, setVendors] = useState([]); // Store franchise vendors
  const [selectedVendor, setSelectedVendor] = useState(''); // Selected vendor ID
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
        const franchiseId = user?.franchise_id;

        if (!franchiseId) {
          setError('Franchise not found. Please contact admin.');
          return;
        }

        // Get franchise-specific items with custom prices
        const data = await franchiseService.getFranchiseItems(franchiseId);

        if (!data || data.length === 0) {
          setError('No items configured for this franchise. Please contact admin to add items.');
          return;
        }

        // Get franchise data to load vendors
        const franchiseData = await franchiseService.getFranchise(franchiseId);
        const franchiseVendors = [];
        
        if (franchiseData.vendor_1_id && franchiseData.vendor_1_name) {
          franchiseVendors.push({
            id: franchiseData.vendor_1_id,
            name: franchiseData.vendor_1_name,
            type: 'SFI'
          });
        }
        if (franchiseData.vendor_2_id && franchiseData.vendor_2_name) {
          franchiseVendors.push({
            id: franchiseData.vendor_2_id,
            name: franchiseData.vendor_2_name,
            type: 'Raw Materials'
          });
        }
        
        setVendors(franchiseVendors);

        // Transform to format expected by OrderForm
        const formattedItems = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category || 'General',
          defaultUom: item.unit || 'kg',
          standard_price: item.price, // franchise custom price
          vendor_id: item.vendor_id // track which vendor supplies this
        }));

        setAllItems(formattedItems);
        
        // Auto-select first vendor if available
        if (franchiseVendors.length > 0) {
          setSelectedVendor(franchiseVendors[0].id);
          setItems(formattedItems.filter(item => item.vendor_id === franchiseVendors[0].id));
        } else {
          setItems(formattedItems);
        }
      } catch (err) {
        console.error('Failed to fetch items:', err);
        setError('Failed to load items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [user]);

  // Handle vendor change
  const handleVendorChange = (vendorId) => {
    setSelectedVendor(vendorId);
    if (vendorId) {
      setItems(allItems.filter(item => item.vendor_id === vendorId));
    } else {
      setItems(allItems);
    }
  };

  const handleSubmit = async (orderData) => {
    if (!selectedVendor && vendors.length > 0) {
      setError('Please select a vendor before creating the order');
      return;
    }

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
        notes: orderData.notes || '',
        vendor_id: selectedVendor // Include selected vendor
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
          Select vendor and add items to create a new order
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

      {/* Vendor Selection */}
      {vendors.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8
          }}>
            Select Vendor *
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {vendors.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => handleVendorChange(vendor.id)}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  borderRadius: 8,
                  border: `2px solid ${selectedVendor === vendor.id ? '#10b981' : '#e5e7eb'}`,
                  background: selectedVendor === vendor.id ? '#f0fdf4' : 'white',
                  color: selectedVendor === vendor.id ? '#059669' : '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: 15
                }}
              >
                {vendor.type === 'SFI' ? '🍳' : '🥬'} {vendor.name}
                <div style={{ 
                  fontSize: 12, 
                  marginTop: 4,
                  color: selectedVendor === vendor.id ? '#059669' : '#9ca3af'
                }}>
                  {vendor.type}
                </div>
              </button>
            ))}
          </div>
          {selectedVendor && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: '#eff6ff',
              borderRadius: 8,
              fontSize: 13,
              color: '#1e40af'
            }}>
              📦 {items.length} items available from selected vendor
            </div>
          )}
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
