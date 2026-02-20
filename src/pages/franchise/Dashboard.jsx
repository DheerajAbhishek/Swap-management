import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/Supply/StatusBadge';
import DatePeriodPicker from '../../components/Supply/DatePeriodPicker';
import ReceivedItemsReport from '../../components/Supply/ReceivedItemsReport';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import { orderService } from '../../services/orderService';
import { franchiseService } from '../../services/franchiseService';
import { useNotificationEvents } from '../../context/NotificationContext';

// SVG Icons
const Icons = {
  shoppingBag: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
  ),
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  checkCircle: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  store: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  alertTriangle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  )
};

/**
 * Franchise Dashboard
 */
export default function FranchiseDashboard() {
  const { user } = useAuth();
  const { subscribe } = useNotificationEvents();
  const [orders, setOrders] = useState([]);
  const [assignedKitchen, setAssignedKitchen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date period state for received items
  const today = new Date().toISOString().split('T')[0];
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ startDate: last30, endDate: today });
  const [receivedItems, setReceivedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders();
      setOrders(data);

      // Get franchise details to find assigned kitchen
      if (user?.franchise_id) {
        try {
          const franchiseData = await franchiseService.getFranchise(user.franchise_id);
          if (franchiseData) {
            setAssignedKitchen({
              id: franchiseData.vendor_id,
              name: franchiseData.vendor_name,
              // Additional details from user token if available
              phone: '', // Can be enhanced later
              location: ''
            });
          }
        } catch (err) {
          console.log('Could not fetch franchise details:', err);
          // Fallback to user token data
          if (user?.vendor_id && user?.vendor_name) {
            setAssignedKitchen({
              id: user.vendor_id,
              name: user.vendor_name
            });
          }
        }
      } else if (user?.vendor_id && user?.vendor_name) {
        // Use token data directly
        setAssignedKitchen({
          id: user.vendor_id,
          name: user.vendor_name
        });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to order notifications
    const unsubscribe = subscribe(['ORDER_STATUS', 'ORDER_NEW'], () => {
      console.log('🔄 Dashboard refreshing orders due to notification');
      fetchOrders();
    });

    return unsubscribe;
  }, [user, subscribe]);

  // Load received items when date range changes
  useEffect(() => {
    const fetchReceivedItems = async () => {
      if (dateRange.startDate && dateRange.endDate) {
        setLoadingItems(true);
        try {
          const items = await orderService.getReceivedItems({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          });
          setReceivedItems(items);
        } catch (err) {
          console.error('Failed to fetch received items:', err);
        } finally {
          setLoadingItems(false);
        }
      }
    };
    fetchReceivedItems();
  }, [dateRange]);

  // Calculate stats from orders
  const stats = {
    totalOrders: orders.length,
    pendingDelivery: orders.filter(o => o.status === 'PLACED' || o.status === 'ACCEPTED').length,
    pendingReceipt: orders.filter(o => o.status === 'DISPATCHED').length
  };

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Franchise Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Quick Action */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Need supplies?</h2>
          <p style={{ opacity: 0.9, marginTop: 4 }}>Create a new purchase order to the kitchen</p>
        </div>
        <Link
          to="/franchise/create-order"
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            background: 'white',
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          + Create Order
        </Link>
      </div>

      {/* Assigned Kitchen Info */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: 24,
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: 12,
            background: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d97706'
          }}>
            {Icons.store}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Your Assigned Kitchen (Supplier)</div>
            {assignedKitchen ? (
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937' }}>
                {assignedKitchen.name}
              </div>
            ) : (
              <div style={{ color: '#ef4444', fontSize: 14 }}>
                No kitchen assigned. Contact admin.
              </div>
            )}
          </div>
          {assignedKitchen && (
            <div style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: '#d1fae5',
              color: '#065f46',
              fontSize: 12,
              fontWeight: 600
            }}>
              Connected
            </div>
          )}
        </div>
        {!assignedKitchen && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#fef3c7',
            borderRadius: 8,
            fontSize: 13,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ flexShrink: 0 }}>{Icons.alertTriangle}</div>
            <div>You cannot place orders until a kitchen is assigned to your franchise.</div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <StatCard icon={Icons.shoppingBag} label="Total Orders" value={stats.totalOrders} color="#3b82f6" />
        <StatCard icon={Icons.clock} label="Pending Delivery" value={stats.pendingDelivery} color="#f59e0b" />
        <StatCard icon={Icons.checkCircle} label="To Confirm" value={stats.pendingReceipt} color="#10b981" />
      </div>

      {/* Recent Orders */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>
            Recent Orders
          </h2>
          <Link to="/franchise/orders" style={{ color: '#3b82f6', fontSize: 14, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Order #</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                    No orders yet. Create your first order!
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                        {order.order_number}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDateTime(order.created_at)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Received Report */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginTop: 24
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
          Items Received Report
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Select a date period to view all items you have received
        </p>

        <DatePeriodPicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />

        <div style={{ marginTop: 20 }}>
          <ReceivedItemsReport
            data={receivedItems}
            loading={loadingItems}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 };
const tdStyle = { padding: '12px 16px', fontSize: 14 };
