import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/Supply/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';
import { useAuth } from '../../context/AuthContext';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Franchise Staff Order History - View all orders
 * Same UI as franchise manager with Confirm Receipt functionality
 */
export default function StaffOrderHistory() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [complaintModal, setComplaintModal] = useState({ open: false, order: null });

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

    // Subscribe to order-related notifications for auto-refresh
    const unsubscribe = subscribe(['ORDER_STATUS', 'ORDER_NEW'], () => {
      console.log('🔄 Refreshing orders due to notification');
      fetchOrders();
    });

    return unsubscribe;
  }, [subscribe]);

  const filteredOrders = filterStatus
    ? orders.filter(o => o.status === filterStatus)
    : orders;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading orders...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Order History
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            View and track purchase orders
          </p>
        </div>
        <Link
          to="/franchise-staff/create-order"
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          ➕ New Order
        </Link>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilterStatus('')}
          style={filterStatus === '' ? activeFilterBtn : filterBtn}
        >
          All ({orders.length})
        </button>
        {['PLACED', 'ACCEPTED', 'DISPATCHED', 'RECEIVED'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={filterStatus === status ? activeFilterBtn : filterBtn}
          >
            {status} ({orders.filter(o => o.status === status).length})
          </button>
        ))}
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {formatDateTime(order.created_at)}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    Created by: <span style={{ fontWeight: 500, color: '#6b7280' }}>
                      {order.created_by_name || 'Owner'}
                      {order.created_by_employee_id && ` (${order.created_by_employee_id})`}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {formatCurrency(order.total_amount)}
                </div>
              </div>

              {/* Status Timeline */}
              <div style={{
                display: 'flex',
                gap: 4,
                padding: 12,
                background: '#f9fafb',
                borderRadius: 10,
                marginBottom: 12
              }}>
                <TimelineStep label="Placed" done={true} />
                <TimelineStep label="Accepted" done={['ACCEPTED', 'DISPATCHED', 'RECEIVED'].includes(order.status)} />
                <TimelineStep label="Dispatched" done={['DISPATCHED', 'RECEIVED'].includes(order.status)} />
                <TimelineStep label="Received" done={order.status === 'RECEIVED'} />
              </div>

              {/* Dispatch Photos - Show when dispatched or received */}
              {(order.status === 'DISPATCHED' || order.status === 'RECEIVED') && order.dispatch_photos && order.dispatch_photos.length > 0 && (
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
                    🚚 Dispatch Photos from Kitchen
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {order.dispatch_photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Dispatch ${idx + 1}`}
                        onClick={() => window.open(photo, '_blank')}
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer',
                          border: '2px solid #86efac'
                        }}
                      />
                    ))}
                  </div>
                  {order.dispatched_at && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                      Dispatched: {formatDateTime(order.dispatched_at)}
                      {order.dispatched_by_name && ` by ${order.dispatched_by_name}`}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#e5e7eb',
                    color: '#374151',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>

                {order.status === 'DISPATCHED' && (
                  <Link
                    to={`/franchise-staff/confirm-receipt/${order.id}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Confirm Receipt
                  </Link>
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

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Items</h3>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <span>{item.item_name}</span>
                    <span style={{ color: '#6b7280' }}>{item.ordered_qty} {item.uom}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Dispatch Photos Section */}
            {selectedOrder.dispatch_photos && selectedOrder.dispatch_photos.length > 0 && (
              <div style={{
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 12 }}>
                  🚚 Dispatch Photos
                </h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedOrder.dispatch_photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Dispatch ${idx + 1}`}
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
                  Dispatched: {formatDateTime(selectedOrder.dispatched_at)}
                  {selectedOrder.dispatched_by_name && ` by ${selectedOrder.dispatched_by_name}`}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Total: {formatCurrency(selectedOrder.total_amount)}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
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
                <button onClick={() => setSelectedOrder(null)} style={closeBtnStyle}>
                  Close
                </button>
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
          fetchOrders();
          alert('Complaint submitted successfully!');
        }}
      />
    </div>
  );
}

function TimelineStep({ label, done }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: done ? '#10b981' : '#e5e7eb',
        margin: '0 auto 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 10
      }}>
        {done && '✓'}
      </div>
      <div style={{ fontSize: 11, color: done ? '#065f46' : '#9ca3af' }}>{label}</div>
    </div>
  );
}

const filterBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 13, cursor: 'pointer' };
const activeFilterBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500 };
const closeBtnStyle = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#e5e7eb', color: '#374151', fontSize: 14, cursor: 'pointer' };

