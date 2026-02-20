import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DiscrepancyForm from '../../components/Supply/DiscrepancyForm';
import StatusBadge from '../../components/Supply/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import discrepancyService from '../../services/discrepancyService';
import photoService from '../../services/photoService';
import { useAuth } from '../../context/AuthContext';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Franchise Staff Confirm Receipt - Accept order or report discrepancies
 */
export default function StaffConfirmReceipt() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDiscrepancyForm, setShowDiscrepancyForm] = useState(false);
  const [orderDiscrepancies, setOrderDiscrepancies] = useState({ hasUnresolved: false, discrepancies: [] });

  const fetchOrderAndDiscrepancies = async () => {
    try {
      setLoading(true);
      const orders = await orderService.getOrders();
      const foundOrder = orders.find(o => o.id === orderId);
      setOrder(foundOrder || null);

      // Check for existing discrepancies
      if (foundOrder) {
        try {
          const discData = await discrepancyService.getOrderDiscrepancies(orderId);
          setOrderDiscrepancies(discData);
        } catch (err) {
          console.error('Failed to fetch discrepancies:', err);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndDiscrepancies();

    // Subscribe to discrepancy resolution notifications
    const unsubscribe = subscribe(['DISCREPANCY_RESOLVED'], (type, data) => {
      // Only refresh if it's for this order
      if (data.reference_id && orderDiscrepancies.discrepancies.some(d => d.id === data.reference_id)) {
        console.log('🔄 Refreshing order discrepancies due to resolution');
        fetchOrderAndDiscrepancies();
      }
    });

    return unsubscribe;
  }, [orderId, subscribe]);

  const handleAcceptOrder = async () => {
    if (!window.confirm('Confirm that you have received all items correctly?')) {
      return;
    }

    setSubmitting(true);
    try {
      await orderService.receiveOrder(orderId, {});
      setSuccess(true);
    } catch (err) {
      if (err.message?.includes('unresolved discrepancies')) {
        alert('Cannot accept order: There are unresolved discrepancies. Please wait for vendor to resolve them.');
      } else {
        alert('Failed to accept order: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDiscrepancy = async (data) => {
    setSubmitting(true);

    try {
      // Upload discrepancy photos if provided
      let discrepancyPhotoUrls = [];
      if (data.photos && data.photos.length > 0) {
        try {
          discrepancyPhotoUrls = await photoService.uploadPhotos(data.photos, `orders/${orderId}/discrepancies`);
        } catch (err) {
          console.error('Failed to upload photos:', err);
        }
      }

      // Report discrepancies
      if (data.discrepancies && data.discrepancies.length > 0) {
        for (const disc of data.discrepancies) {
          await discrepancyService.createDiscrepancy({
            order_id: orderId,
            order_number: order.order_number,
            item_name: disc.itemName,
            ordered_qty: disc.orderedQty,
            received_qty: disc.receivedQty,
            uom: disc.uom,
            notes: disc.notes,
            photos: discrepancyPhotoUrls
          });
        }
      }

      alert('Discrepancy reported successfully! Vendor will be notified.');
      setShowDiscrepancyForm(false);
      fetchOrderAndDiscrepancies(); // Refresh to show new discrepancies
    } catch (err) {
      alert('Failed to report discrepancy: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading order...</div>;
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ color: '#1f2937' }}>Order not found</h2>
        <button
          onClick={() => navigate('/franchise-staff/orders')}
          style={{
            marginTop: 16,
            padding: '12px 24px',
            borderRadius: 10,
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Back to Orders
        </button>
      </div>
    );
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
          Order Accepted!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          The order has been marked as received and added to the vendor ledger.
        </p>
        <button
          onClick={() => navigate('/franchise-staff/orders')}
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
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Confirm Receipt
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Accept the order or report discrepancies if items are missing/damaged
        </p>
      </div>

      {/* Order Info */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                {order.order_number}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Dispatched on {formatDateTime(order.dispatched_at)}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {formatCurrency(order.total_amount)}
          </div>
        </div>

        {/* Unresolved Discrepancies Warning */}
        {orderDiscrepancies.hasUnresolved && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ color: '#92400e', fontSize: 14, fontWeight: 600 }}>
              {orderDiscrepancies.unresolvedCount} unresolved discrepancy(ies) - waiting for vendor to resolve
            </span>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          Order Items
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {order.items?.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                background: '#f9fafb',
                borderRadius: 8
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>{item.item_name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {item.ordered_qty} {item.uom} × {formatCurrency(item.unit_price)}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: '#1f2937' }}>
                {formatCurrency(item.line_total)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {!showDiscrepancyForm && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 12
        }}>
          <button
            onClick={handleAcceptOrder}
            disabled={submitting || orderDiscrepancies.hasUnresolved}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: orderDiscrepancies.hasUnresolved
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: orderDiscrepancies.hasUnresolved ? '#9ca3af' : 'white',
              fontSize: 15,
              fontWeight: 700,
              cursor: orderDiscrepancies.hasUnresolved ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Processing...' : '✓ Accept Order - All Items Received'}
          </button>

          <button
            onClick={() => setShowDiscrepancyForm(true)}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: 10,
              border: '2px solid #ef4444',
              background: 'white',
              color: '#ef4444',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            Report Discrepancy
          </button>
        </div>
      )}

      {/* Discrepancy Form */}
      {showDiscrepancyForm && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Report Discrepancy
            </h3>
            <button
              onClick={() => setShowDiscrepancyForm(false)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Cancel
            </button>
          </div>
          <DiscrepancyForm
            orderItems={order.items}
            onSubmit={handleSubmitDiscrepancy}
            loading={submitting}
          />
        </div>
      )}

      {/* Existing Discrepancies */}
      {orderDiscrepancies.discrepancies.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginTop: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
            Reported Discrepancies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orderDiscrepancies.discrepancies.map((disc) => (
              <div
                key={disc.id}
                style={{
                  padding: 16,
                  background: disc.resolved ? '#f0fdf4' : '#fef3c7',
                  border: `1px solid ${disc.resolved ? '#86efac' : '#fcd34d'}`,
                  borderRadius: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: '#1f2937' }}>{disc.item_name}</div>
                  <div
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      background: disc.resolved ? '#22c55e' : '#f59e0b',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {disc.resolved ? 'Resolved' : 'Pending'}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                  Ordered: {disc.ordered_qty} {disc.uom} | Received: {disc.received_qty} {disc.uom}
                </div>
                {disc.notes && (
                  <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                    Note: {disc.notes}
                  </div>
                )}
                {disc.resolved && disc.resolution_notes && (
                  <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, marginTop: 8 }}>
                    Resolution: {disc.resolution_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
