import { useState, useEffect } from 'react';
import StatusBadge from '../../components/Supply/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';
import DispatchModal from '../../components/Supply/DispatchModal';
import { useAuth } from '../../context/AuthContext';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Kitchen Incoming Orders - Accept and dispatch orders
 * Shows both selling price (franchise_price) and vendor cost for margin tracking
 */
export default function IncomingOrders() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('PLACED');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [complaintModal, setComplaintModal] = useState({ open: false, order: null });
  const [dispatchModal, setDispatchModal] = useState({ open: false, order: null });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to order-related notifications
    const unsubscribe = subscribe(['ORDER_NEW', 'ORDER_STATUS'], () => {
      console.log('🔄 Refreshing orders due to notification');
      fetchOrders();
    });

    return unsubscribe;
  }, [subscribe]);

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await orderService.acceptOrder(orderId);
      // Refetch orders to get updated data
      await fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert('Failed to accept order: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (orderId, dispatchData = {}) => {
    setActionLoading(orderId);
    try {
      await orderService.dispatchOrder(orderId, dispatchData);
      // Refetch orders to get updated data
      await fetchOrders();
      setSelectedOrder(null);
      setDispatchModal({ open: false, order: null });
    } catch (err) {
      alert('Failed to dispatch order: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openDispatchModal = (order) => {
    setDispatchModal({ open: true, order });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading orders...</div>;
  }

  const placedCount = orders.filter(o => o.status === 'PLACED').length;
  const acceptedCount = orders.filter(o => o.status === 'ACCEPTED').length;
  const receivedCount = orders.filter(o => o.status === 'RECEIVED').length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Incoming Orders
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Accept and dispatch purchase orders
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('PLACED')}
          style={filterStatus === 'PLACED' ? activeTabBtn : tabBtn}
        >
          New Orders ({placedCount})
        </button>
        <button
          onClick={() => setFilterStatus('ACCEPTED')}
          style={filterStatus === 'ACCEPTED' ? activeTabBtn : tabBtn}
        >
          Ready to Dispatch ({acceptedCount})
        </button>
        <button
          onClick={() => setFilterStatus('RECEIVED')}
          style={filterStatus === 'RECEIVED' ? activeTabBtnGreen : tabBtn}
        >
          ✓ Received ({receivedCount})
        </button>
        <button
          onClick={() => setFilterStatus('ALL')}
          style={filterStatus === 'ALL' ? activeTabBtn : tabBtn}
        >
          All
        </button>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredOrders.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No orders found
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: order.status === 'PLACED' ? '4px solid #f59e0b' :
                  order.status === 'RECEIVED' ? '4px solid #10b981' : '4px solid #3b82f6'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {order.franchise_name} • {formatDateTime(order.created_at)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Total Cost</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(order.total_vendor_cost || order.total_amount)}
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div style={{
                padding: 12,
                background: '#f9fafb',
                borderRadius: 10,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                  Items ({order.items.length})
                </div>
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    padding: '4px 0'
                  }}>
                    <span>{item.item_name}</span>
                    <span style={{ color: '#6b7280' }}>
                      {item.ordered_qty} {item.uom} @ {formatCurrency(item.vendor_price || item.unit_price)}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    +{order.items.length - 3} more items
                  </div>
                )}
              </div>

              {/* Receipt Photos - Show when order is received */}
              {order.status === 'RECEIVED' && order.receive_photos && order.receive_photos.length > 0 && (
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
                    📸 Receipt Confirmation Photos
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {order.receive_photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Receipt ${idx + 1}`}
                        onClick={() => window.open(photo, '_blank')}
                        style={{
                          width: 70,
                          height: 70,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer',
                          border: '2px solid #86efac'
                        }}
                      />
                    ))}
                  </div>
                  {order.received_at && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                      Received: {formatDateTime(order.received_at)}
                      {order.received_by_name && ` by ${order.received_by_name}`}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#e5e7eb',
                    color: '#374151',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>

                {order.status === 'PLACED' && (
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={actionLoading === order.id}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: actionLoading === order.id ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: actionLoading === order.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {actionLoading === order.id ? 'Accepting...' : '✓ Accept Order'}
                  </button>
                )}

                {order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => openDispatchModal(order)}
                    disabled={actionLoading === order.id}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: actionLoading === order.id ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: actionLoading === order.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    {actionLoading === order.id ? 'Dispatching...' : 'Dispatch'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Order Details</h2>
                <p style={{ color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>{selectedOrder.order_number}</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Franchise</div>
              <div style={{ fontWeight: 600 }}>{selectedOrder.franchise_name}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Unit Cost</th>
                  <th style={thStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>{item.item_name}</td>
                    <td style={tdStyle}>{item.ordered_qty} {item.uom}</td>
                    <td style={tdStyle}>
                      {formatCurrency(item.vendor_price || item.unit_price)}
                    </td>
                    <td style={tdStyle}>
                      {formatCurrency(item.ordered_qty * (item.vendor_price || item.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Receipt Photos Section */}
            {selectedOrder.status === 'RECEIVED' && selectedOrder.receive_photos && selectedOrder.receive_photos.length > 0 && (
              <div style={{
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 12 }}>
                  📸 Receipt Confirmation Photos from Franchise
                </h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedOrder.receive_photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Receipt ${idx + 1}`}
                      onClick={() => window.open(photo, '_blank')}
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '2px solid #86efac'
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  Received: {formatDateTime(selectedOrder.received_at)}
                  {selectedOrder.received_by_name && ` by ${selectedOrder.received_by_name}`}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Total Cost</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(selectedOrder.total_vendor_cost || selectedOrder.total_amount)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setComplaintModal({ open: true, order: selectedOrder });
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Raise Complaint
                </button>
                <button onClick={() => setSelectedOrder(null)} style={cancelBtnStyle}>Close</button>
                {selectedOrder.status === 'PLACED' && (
                  <button onClick={() => handleAccept(selectedOrder.id)} style={acceptBtnStyle}>
                    Accept Order
                  </button>
                )}
                {selectedOrder.status === 'ACCEPTED' && (
                  <button onClick={() => { setSelectedOrder(null); openDispatchModal(selectedOrder); }} style={dispatchBtnStyle}>
                    Dispatch Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      <OrderComplaintModal
        isOpen={complaintModal.open}
        onClose={() => setComplaintModal({ open: false, order: null })}
        order={complaintModal.order}
        user={user}
        onSuccess={() => {
          setSelectedOrder(null);
          alert('Complaint submitted successfully!');
        }}
      />

      {/* Dispatch Modal */}
      <DispatchModal
        isOpen={dispatchModal.open}
        onClose={() => setDispatchModal({ open: false, order: null })}
        order={dispatchModal.order}
        onDispatch={handleDispatch}
        loading={actionLoading === dispatchModal.order?.id}
      />
    </div>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 };
const tdStyle = { padding: '10px 12px', fontSize: 13 };
const tabBtn = { padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 14, cursor: 'pointer' };
const activeTabBtn = { padding: '10px 20px', borderRadius: 10, border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const activeTabBtnGreen = { padding: '10px 20px', borderRadius: 10, border: '1px solid #10b981', background: '#f0fdf4', color: '#10b981', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' };
const cancelBtnStyle = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#e5e7eb', color: '#374151', fontSize: 14, cursor: 'pointer' };
const acceptBtnStyle = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const dispatchBtnStyle = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
