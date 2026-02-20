import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { useNotificationEvents } from '../../context/NotificationContext';

/**
 * Kitchen Staff Dashboard
 * Shows order stats and quick actions
 * No financial data visible
 * No attendance required for kitchen staff
 */
export default function KitchenStaffDashboard() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

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

    // Subscribe to order-related notifications for auto-refresh
    const unsubscribe = subscribe(['ORDER_STATUS', 'ORDER_NEW'], () => {
      console.log('🔄 Refreshing orders due to notification');
      fetchOrders();
    });

    return unsubscribe;
  }, [subscribe]);

  // Calculate stats (no financial data)
  const stats = {
    pendingOrders: orders.filter(o => o.status === 'PLACED').length,
    acceptedOrders: orders.filter(o => o.status === 'ACCEPTED').length,
    dispatchedToday: orders.filter(o => {
      if (o.status !== 'DISPATCHED' && o.status !== 'RECEIVED') return false;
      const dispatchDate = o.dispatched_at?.split('T')[0];
      return dispatchDate === today;
    }).length
  };

  const recentOrders = orders
    .filter(o => o.status === 'PLACED' || o.status === 'ACCEPTED')
    .slice(0, 5);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Kitchen Staff Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Welcome, {user?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 16,
          padding: 20,
          color: 'white'
        }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Pending Orders</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{stats.pendingOrders}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Waiting to be accepted</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          borderRadius: 16,
          padding: 20,
          color: 'white'
        }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Accepted Orders</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{stats.acceptedOrders}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ready for dispatch</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: 16,
          padding: 20,
          color: 'white'
        }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Dispatched Today</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{stats.dispatchedToday}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Sent out today</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/kitchen-staff/orders"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            📋 View All Orders
          </Link>
        </div>
      </div>

      {/* Pending Orders */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
          Orders Needing Action
        </h2>
        {recentOrders.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>
            No pending orders 🎉
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentOrders.map(order => (
              <div
                key={order.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  background: '#f9fafb',
                  borderRadius: 8
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>
                    {order.order_number}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {order.franchise_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    {order.items?.length || 0} items
                  </div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: order.status === 'PLACED' ? '#fef3c7' : '#dbeafe',
                  color: order.status === 'PLACED' ? '#92400e' : '#1e40af'
                }}>
                  {order.status === 'PLACED' ? '🔔 New' : '✓ Accepted'}
                </span>
              </div>
            ))}
          </div>
        )}
        {recentOrders.length > 0 && (
          <Link
            to="/kitchen-staff/orders"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 16,
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            View all orders →
          </Link>
        )}
      </div>
    </div>
  );
}
