import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import ToastNotification from '../../components/ToastNotification';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';
import DispatchModal from '../../components/Supply/DispatchModal';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Kitchen Staff Incoming Orders
 * Accept and dispatch orders like kitchen owner
 * No financial data visible
 */
export default function KitchenStaffIncomingOrders() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [actionLoading, setActionLoading] = useState(null);
  const [complaintModal, setComplaintModal] = useState({ open: false, order: null });
  const [dispatchModal, setDispatchModal] = useState({ open: false, order: null });

  useEffect(() => {
    fetchOrders();

    // Subscribe to order-related notifications for auto-refresh
    const unsubscribe = subscribe(['ORDER_STATUS', 'ORDER_NEW'], () => {
      console.log('🔄 Refreshing orders due to notification');
      fetchOrders();
    });

    return unsubscribe;
  }, [subscribe]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId) => {
    try {
      setActionLoading(orderId);
      await orderService.acceptOrder(orderId);
      setToast({ show: true, message: 'Order accepted successfully!', type: 'success' });
      fetchOrders();
    } catch (err) {
      console.error('Failed to accept order:', err);
      setToast({ show: true, message: 'Failed to accept order', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (orderId, dispatchData = {}) => {
    try {
      setActionLoading(orderId);
      await orderService.dispatchOrder(orderId, dispatchData);
      setToast({ show: true, message: 'Order dispatched successfully!', type: 'success' });
      setDispatchModal({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      console.error('Failed to dispatch order:', err);
      setToast({ show: true, message: 'Failed to dispatch order', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const openDispatchModal = (order) => {
    setDispatchModal({ open: true, order });
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'ALL') return true;
    return order.status === filter;
  });

  const filters = [
    { value: 'ALL', label: 'All Orders' },
    { value: 'PLACED', label: 'New', icon: '🔔' },
    { value: 'ACCEPTED', label: 'Accepted', icon: '✓' },
    { value: 'DISPATCHED', label: 'Dispatched', icon: '🚚' },
    { value: 'RECEIVED', label: 'Received', icon: '📦' }
  ];

  const getStatusBadge = (status) => {
    const styles = {
      PLACED: { bg: '#fef3c7', color: '#92400e', label: '🔔 New' },
      ACCEPTED: { bg: '#dbeafe', color: '#1e40af', label: '✓ Accepted' },
      DISPATCHED: { bg: '#e0e7ff', color: '#3730a3', label: '🚚 Dispatched' },
      RECEIVED: { bg: '#d1fae5', color: '#065f46', label: '📦 Received' }
    };
    const style = styles[status] || { bg: '#f3f4f6', color: '#374151', label: status };
    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading orders...</div>;
  }

  return (
    <div>
      <ToastNotification
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
        Incoming Orders
      </h1>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              background: filter === f.value ? '#3b82f6' : '#f3f4f6',
              color: filter === f.value ? 'white' : '#4b5563',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {f.label}
            {f.value !== 'ALL' && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({orders.filter(o => o.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.map(order => (
            <div
              key={order.id}
              style={{
                background: 'white',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {/* Order Header */}
              <div
                style={{
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <div style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
                    {order.franchise_name}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    {order.items?.length || 0} items • {new Date(order.created_at).toLocaleDateString()}
                    {order.created_by_name && (
                      <span> • Created by: {order.created_by_name}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Action Buttons */}
                  {order.status === 'PLACED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAccept(order.id); }}
                      disabled={actionLoading === order.id}
                      style={{
                        padding: '10px 20px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: actionLoading === order.id ? 'wait' : 'pointer',
                        opacity: actionLoading === order.id ? 0.7 : 1
                      }}
                    >
                      {actionLoading === order.id ? 'Accepting...' : '✓ Accept'}
                    </button>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openDispatchModal(order); }}
                      disabled={actionLoading === order.id}
                      style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: actionLoading === order.id ? 'wait' : 'pointer',
                        opacity: actionLoading === order.id ? 0.7 : 1,
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
                  <span style={{ color: '#9ca3af', fontSize: 20 }}>
                    {expandedOrder === order.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded Items */}
              {expandedOrder === order.id && (
                <div style={{
                  borderTop: '1px solid #e5e7eb',
                  padding: 20,
                  background: '#f9fafb'
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Order Items</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#6b7280' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#6b7280' }}>Quantity</th>
                        <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#6b7280' }}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 0', fontWeight: 500 }}>{item.item_name}</td>
                          <td style={{ textAlign: 'center', padding: '12px 0', fontWeight: 600 }}>{item.ordered_qty}</td>
                          <td style={{ textAlign: 'center', padding: '12px 0', color: '#6b7280' }}>{item.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Order Timeline */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Order Timeline</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          Created: {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                      {order.accepted_at && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>
                            Accepted: {new Date(order.accepted_at).toLocaleString()}
                            {order.accepted_by_name && ` by ${order.accepted_by_name}`}
                          </span>
                        </div>
                      )}
                      {order.dispatched_at && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}></span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>
                            Dispatched: {new Date(order.dispatched_at).toLocaleString()}
                            {order.dispatched_by_name && ` by ${order.dispatched_by_name}`}
                          </span>
                        </div>
                      )}
                      {order.received_at && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }}></span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>
                            Received: {new Date(order.received_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raise Complaint Button */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComplaintModal({ open: true, order });
                      }}
                      style={{
                        padding: '12px 20px',
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Raise Complaint
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Complaint Modal */}
      <OrderComplaintModal
        isOpen={complaintModal.open}
        onClose={() => setComplaintModal({ open: false, order: null })}
        order={complaintModal.order}
        user={user}
        onSuccess={() => {
          setToast({ show: true, message: 'Complaint submitted successfully!', type: 'success' });
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
