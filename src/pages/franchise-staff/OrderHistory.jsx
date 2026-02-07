import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/Supply/StatusBadge';
import { orderService } from '../../services/orderService';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';

/**
 * Franchise Staff - Order History
 * Shows all orders from the franchise with who created them
 * No financial data visible (no amounts shown)
 */
export default function StaffOrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [complaintModal, setComplaintModal] = useState({ open: false, order: null });

  useEffect(() => {
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
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    return true;
  });

  const statusOptions = ['all', 'PLACED', 'ACCEPTED', 'DISPATCHED', 'RECEIVED', 'DISCREPANCY'];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading orders...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Order History
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          View all orders from your franchise
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: statusFilter === status ? '#3b82f6' : '#f3f4f6',
                color: statusFilter === status ? 'white' : '#6b7280'
              }}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No orders found
          </div>
        ) : (
          <div>
            {filteredOrders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  padding: 16,
                  borderBottom: index < filteredOrders.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
                      {order.order_number}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      Created by: <span style={{ fontWeight: 500, color: '#6b7280' }}>
                        {order.created_by_name || 'Owner'}
                        {order.created_by_employee_id && ` (${order.created_by_employee_id})`}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Expanded Details */}
                {selectedOrder?.id === order.id && (
                  <div style={{
                    marginTop: 16,
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 8
                  }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Order Items</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {order.items?.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: 8,
                            background: 'white',
                            borderRadius: 6
                          }}
                        >
                          <span style={{ color: '#374151' }}>{item.item_name}</span>
                          <span style={{ color: '#6b7280', fontWeight: 500 }}>
                            {item.ordered_qty} {item.uom}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Status Timeline */}
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Timeline</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                          <span style={{ fontSize: 13 }}>
                            Placed: {new Date(order.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {order.accepted_at && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                            <span style={{ fontSize: 13 }}>
                              Accepted: {new Date(order.accepted_at).toLocaleString('en-IN')}
                              {order.accepted_by_name && ` by ${order.accepted_by_name}`}
                            </span>
                          </div>
                        )}
                        {order.dispatched_at && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                            <span style={{ fontSize: 13 }}>
                              Dispatched: {new Date(order.dispatched_at).toLocaleString('en-IN')}
                              {order.dispatched_by_name && ` by ${order.dispatched_by_name}`}
                            </span>
                          </div>
                        )}
                        {order.received_at && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: 13 }}>
                              Received: {new Date(order.received_at).toLocaleString('en-IN')}
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
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
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
      </div>

      {/* Complaint Modal */}
      <OrderComplaintModal
        isOpen={complaintModal.open}
        onClose={() => setComplaintModal({ open: false, order: null })}
        order={complaintModal.order}
        user={user}
        onSuccess={() => {
          // Show a simple toast or notification
          alert('Complaint submitted successfully!');
        }}
      />
    </div>
  );
}
