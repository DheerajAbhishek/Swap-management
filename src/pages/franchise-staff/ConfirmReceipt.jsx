import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DiscrepancyForm from '../../components/Supply/DiscrepancyForm';
import StatusBadge from '../../components/Supply/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import discrepancyService from '../../services/discrepancyService';
import photoService from '../../services/photoService';
import PhotoCapture from '../../components/PhotoCapture';
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
  const [closingDiscrepancyId, setClosingDiscrepancyId] = useState(null);
  const [receivePhotos, setReceivePhotos] = useState([]);

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
    const unsubscribe = subscribe(['DISCREPANCY_VENDOR_ACKNOWLEDGED', 'DISCREPANCY_FRANCHISE_CLOSED'], (type, data) => {
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

    if (receivePhotos.length === 0) {
      alert('Please take at least one photo of the received order before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrls = [];
      try {
        photoUrls = await photoService.uploadPhotos(receivePhotos, `orders/${orderId}/receive`);
      } catch (err) {
        console.error('Failed to upload receive photos:', err);
        alert('Failed to upload photos. Please try again.');
        setSubmitting(false);
        return;
      }
      await orderService.receiveOrder(orderId, { receive_photos: photoUrls });
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

  const handleCloseDiscrepancy = async (discrepancyId, itemName) => {
    if (!window.confirm(`Confirm that you received the missing items for ${itemName}?`)) {
      return;
    }

    setClosingDiscrepancyId(discrepancyId);
    try {
      await discrepancyService.franchiseClose(discrepancyId, 'Items received and verified');
      alert('Discrepancy closed successfully!');
      fetchOrderAndDiscrepancies(); // Refresh discrepancies
    } catch (err) {
      alert('Failed to close discrepancy: ' + err.message);
    } finally {
      setClosingDiscrepancyId(null);
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
              {order.cost_adjusted && (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  COST ADJUSTED
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Dispatched on {formatDateTime(order.dispatched_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatCurrency(order.total_amount)}
            </div>
            {order.cost_adjusted && order.adjustment_amount !== undefined && (
              <div style={{
                fontSize: 12,
                color: order.adjustment_amount > 0 ? '#16a34a' : '#dc2626',
                fontWeight: 600,
                marginTop: 4
              }}>
                {order.adjustment_amount > 0 ? '+' : ''}{formatCurrency(order.adjustment_amount)}
              </div>
            )}
          </div>
        </div>

        {/* Unresolved Discrepancies Warning */}
        {orderDiscrepancies.hasUnresolved && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: orderDiscrepancies.vendorAcknowledgedCount > 0 ? '#eff6ff' : '#fef3c7',
            border: `1px solid ${orderDiscrepancies.vendorAcknowledgedCount > 0 ? '#93c5fd' : '#fcd34d'}`,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={orderDiscrepancies.vendorAcknowledgedCount > 0 ? '#1e40af' : '#92400e'} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <span style={{ color: orderDiscrepancies.vendorAcknowledgedCount > 0 ? '#1e40af' : '#92400e', fontSize: 14, fontWeight: 600 }}>
                {orderDiscrepancies.unresolvedCount} unresolved discrepancy(ies)
              </span>
              <div style={{ fontSize: 12, color: orderDiscrepancies.vendorAcknowledgedCount > 0 ? '#1e40af' : '#92400e', marginTop: 2 }}>
                {orderDiscrepancies.vendorAcknowledgedCount > 0
                  ? `${orderDiscrepancies.vendorAcknowledgedCount} vendor acknowledged - you can close them below after receiving items`
                  : 'Waiting for vendor to acknowledge'}
              </div>
            </div>
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

      {/* Receipt Photos */}
      {!showDiscrepancyForm && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
            Receipt Photos
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Take a clear photo of the received order — required before confirming receipt
          </p>
          <PhotoCapture
            photos={receivePhotos}
            onChange={setReceivePhotos}
            maxPhotos={3}
            label="Receipt Photo"
            required
            disabled={submitting}
          />
        </div>
      )}

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
            disabled={submitting || orderDiscrepancies.hasUnresolved || receivePhotos.length === 0}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: (orderDiscrepancies.hasUnresolved || receivePhotos.length === 0)
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: (orderDiscrepancies.hasUnresolved || receivePhotos.length === 0) ? '#9ca3af' : 'white',
              fontSize: 15,
              fontWeight: 700,
              cursor: (orderDiscrepancies.hasUnresolved || receivePhotos.length === 0) ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Processing...' : receivePhotos.length === 0 ? '📷 Add Photo to Accept' : 'Accept Order - All Items Received'}
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
            {orderDiscrepancies.discrepancies.map((disc) => {
              // Determine status: PENDING → VENDOR_ACKNOWLEDGED → FULLY_RESOLVED
              const status = disc.franchise_closed
                ? 'FULLY_RESOLVED'
                : disc.vendor_acknowledged
                  ? 'VENDOR_ACKNOWLEDGED'
                  : 'PENDING';

              const statusColors = {
                PENDING: { bg: '#fef3c7', border: '#fcd34d', badge: '#f59e0b', text: '#92400e' },
                VENDOR_ACKNOWLEDGED: { bg: '#eff6ff', border: '#93c5fd', badge: '#3b82f6', text: '#1e40af' },
                FULLY_RESOLVED: { bg: '#f0fdf4', border: '#86efac', badge: '#22c55e', text: '#166534' }
              };

              const colors = statusColors[status];

              // Determine discrepancy type and display
              const isOverage = disc.discrepancy_type === 'OVERAGE' || (disc.received_qty > disc.ordered_qty) || (disc.difference && disc.difference < 0);
              const isShortage = disc.discrepancy_type === 'SHORTAGE' || (disc.received_qty < disc.ordered_qty) || (disc.difference && disc.difference > 0);
              const discTypeLabel = isOverage ? 'OVERAGE' : 'SHORTAGE';
              const discTypeColor = isOverage ? '#059669' : '#dc2626';
              const difference = Math.abs(disc.difference || (disc.ordered_qty - disc.received_qty) || 0);

              return (
                <div
                  key={disc.id}
                  style={{
                    padding: 16,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1f2937' }}>{disc.item_name}</div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: discTypeColor,
                        marginTop: 4
                      }}>
                        {discTypeLabel} {isOverage ? `(+${difference})` : `(-${difference})`} {disc.uom}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: colors.badge,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        height: 'fit-content'
                      }}
                    >
                      {status === 'PENDING' ? 'Pending' : status === 'VENDOR_ACKNOWLEDGED' ? 'Vendor Acknowledged' : 'Fully Resolved'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    Ordered: {disc.ordered_qty} {disc.uom} | Received: {disc.received_qty} {disc.uom}
                  </div>
                  {disc.adjustment_amount > 0 && (
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isOverage ? '#059669' : '#dc2626',
                      marginBottom: 4
                    }}>
                      Amount adjustment: {isOverage ? '+' : '-'}{formatCurrency(disc.adjustment_amount)}
                    </div>
                  )}
                  {disc.notes && (
                    <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                      Note: {disc.notes}
                    </div>
                  )}

                  {/* Show vendor acknowledgment info */}
                  {disc.vendor_acknowledged && (
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: 8,
                      borderLeft: '3px solid #3b82f6'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
                        Vendor Acknowledged
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        "{disc.vendor_notes}"
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                        Acknowledged by {disc.vendor_acknowledged_by_name || 'Vendor'} on {new Date(disc.vendor_acknowledged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}

                  {/* Show franchise closure info (fully resolved) */}
                  {disc.franchise_closed && (
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: 8,
                      borderLeft: '3px solid #22c55e'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                        Fully Resolved
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {disc.franchise_notes || 'Items received'}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                        Closed by {disc.franchise_closed_by_name || 'Franchise'} on {new Date(disc.franchise_closed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}

                  {/* Close Discrepancy Button - Show if vendor acknowledged but not franchise closed */}
                  {status === 'VENDOR_ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleCloseDiscrepancy(disc.id, disc.item_name)}
                      disabled={closingDiscrepancyId === disc.id}
                      style={{
                        marginTop: 12,
                        width: '100%',
                        padding: '12px 20px',
                        background: closingDiscrepancyId === disc.id
                          ? '#9ca3af'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: closingDiscrepancyId === disc.id ? 'not-allowed' : 'pointer',
                        fontSize: 14
                      }}
                    >
                      {closingDiscrepancyId === disc.id ? 'Closing...' : 'Confirm Items Received & Close Discrepancy'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost Summary for Resolved Discrepancies */}
      {orderDiscrepancies.discrepancies.length > 0 && orderDiscrepancies.discrepancies.some(d => d.franchise_closed) && (() => {
        const resolvedDiscs = orderDiscrepancies.discrepancies.filter(d => d.franchise_closed);
        const totalAdjustment = resolvedDiscs.reduce((sum, d) => {
          const adj = d.adjustment_amount || 0;
          return sum + (d.discrepancy_type === 'OVERAGE' ? adj : -adj);
        }, 0);

        // Calculate original order amount (before adjustments)
        const originalAmount = order.total_amount - totalAdjustment;

        return (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            marginTop: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '2px solid #3b82f6'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
              Cost Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Original Cost */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>Original Order Amount</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(originalAmount)}</span>
              </div>

              {/* Adjustments */}
              {resolvedDiscs.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                    Adjustments from Resolved Discrepancies:
                  </div>
                  {resolvedDiscs.map(disc => {
                    const isOverage = disc.discrepancy_type === 'OVERAGE' || (disc.received_qty > disc.ordered_qty);
                    const adjustment = disc.adjustment_amount || 0;
                    return (
                      <div
                        key={disc.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: isOverage ? '#f0fdf4' : '#fef2f2',
                          borderRadius: 6,
                          marginBottom: 6
                        }}
                      >
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          {disc.item_name} ({isOverage ? 'Overage' : 'Shortage'})
                        </span>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isOverage ? '#059669' : '#dc2626'
                        }}>
                          {isOverage ? '+' : '-'}{formatCurrency(adjustment)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Adjustment */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: totalAdjustment >= 0 ? '#f0fdf4' : '#fef2f2',
                borderRadius: 8,
                border: totalAdjustment >= 0 ? '2px solid #86efac' : '2px solid #fca5a5'
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                  Total Adjustment
                </span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: totalAdjustment >= 0 ? '#059669' : '#dc2626'
                }}>
                  {totalAdjustment >= 0 ? '+' : ''}{formatCurrency(totalAdjustment)}
                </span>
              </div>

              {/* Final Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: 10,
                marginTop: 8
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                  Final Total Amount
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                  {formatCurrency(order.total_amount)}
                </span>
              </div>

              {totalAdjustment !== 0 && (
                <div style={{
                  padding: 12,
                  background: '#eff6ff',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#1e40af',
                  textAlign: 'center'
                }}>
                  Your payment has been {totalAdjustment > 0 ? 'increased' : 'decreased'} by {formatCurrency(Math.abs(totalAdjustment))} due to {totalAdjustment > 0 ? 'overages' : 'shortages'}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
