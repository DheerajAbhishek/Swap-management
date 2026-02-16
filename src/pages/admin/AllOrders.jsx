import { useState, useEffect } from 'react';
import OrderTable from '../../components/Supply/OrderTable';
import StatusBadge from '../../components/Supply/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin All Orders - View all orders across franchises
 */
export default function AllOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [complaintModal, setComplaintModal] = useState({ open: false, order: null });

  useEffect(() => {
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
    fetchOrders();
  }, []);

  const filteredOrders = filterStatus
    ? orders.filter(o => o.status === filterStatus)
    : orders;

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading orders...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          All Orders
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          View and manage all purchase orders
        </p>
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
        {['PLACED', 'ACCEPTED', 'DISPATCHED', 'RECEIVED', 'DISCREPANCY'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={filterStatus === status ? activeFilterBtn : filterBtn}
          >
            {status} ({orders.filter(o => o.status === status).length})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <OrderTable
          orders={filteredOrders}
          onViewOrder={handleViewOrder}
          userRole="ADMIN"
          showActions={true}
        />
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Order Details
                </h2>
                <p style={{ color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>
                  {selectedOrder.order_number}
                </p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Franchise</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.franchise_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Created</div>
                <div style={{ fontWeight: 500 }}>{formatDateTime(selectedOrder.created_at)}</div>
              </div>
              {selectedOrder.accepted_at && (
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Accepted</div>
                  <div style={{ fontWeight: 500 }}>{formatDateTime(selectedOrder.accepted_at)}</div>
                </div>
              )}
              {selectedOrder.dispatched_at && (
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Dispatched</div>
                  <div style={{ fontWeight: 500 }}>{formatDateTime(selectedOrder.dispatched_at)}</div>
                </div>
              )}
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Items</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Price</th>
                      <th style={thStyle}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={tdStyle}>{item.ordered_qty} {item.uom}</td>
                        <td style={tdStyle}>{formatCurrency(item.unit_price)}</td>
                        <td style={tdStyle}>{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dispatch Photos Section */}
            {selectedOrder.dispatch_photos && selectedOrder.dispatch_photos.length > 0 && (
              <div style={{
                background: '#eff6ff',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Dispatch Photos (from Kitchen)
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
                        border: '2px solid #93c5fd'
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

            {/* Receipt/Accept Photos Section */}
            {selectedOrder.receive_photos && selectedOrder.receive_photos.length > 0 && (
              <div style={{
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Receipt Photos (from Franchise)
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
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#e5e7eb',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
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
          alert('Complaint submitted successfully!');
        }}
      />
    </div>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 };
const tdStyle = { padding: '10px 12px', fontSize: 13 };
const filterBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 13, cursor: 'pointer' };
const activeFilterBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' };
