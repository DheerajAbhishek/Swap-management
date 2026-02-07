import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/Supply/StatusBadge';
import DatePeriodPicker from '../../components/Supply/DatePeriodPicker';
import ReceivedItemsReport from '../../components/Supply/ReceivedItemsReport';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import { orderService } from '../../services/orderService';

// Franchise options - will be populated from orders
const FRANCHISE_OPTIONS = [
  { id: 'all', name: 'All Franchises' }
];

// Get margin from localStorage (default 5%)
const getMarginPercent = () => {
  const vendors = JSON.parse(localStorage.getItem('supply_vendors') || '[]');
  return vendors.length > 0 ? vendors[0].margin_percent : 5;
};

/**
 * Kitchen Dashboard
 */
export default function KitchenDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [franchises, setFranchises] = useState(FRANCHISE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const marginPercent = getMarginPercent();

  // Calculate kitchen amount (after margin deduction)
  const getKitchenAmount = (amount) => {
    return amount * (1 - marginPercent / 100);
  };

  // Date period state for received items report
  const today = new Date().toISOString().split('T')[0];
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ startDate: last30, endDate: today });
  const [selectedFranchise, setSelectedFranchise] = useState('all');
  const [receivedItems, setReceivedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrders();
        setOrders(data);

        // Extract unique franchises from orders
        const uniqueFranchises = [...new Set(data.map(o => o.franchise_id))]
          .filter(Boolean)
          .map(id => {
            const order = data.find(o => o.franchise_id === id);
            return { id, name: order?.franchise_name || id };
          });
        setFranchises([{ id: 'all', name: 'All Franchises' }, ...uniqueFranchises]);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Load received items when date range or franchise changes
  useEffect(() => {
    const fetchReceivedItems = async () => {
      if (dateRange.startDate && dateRange.endDate) {
        setLoadingItems(true);
        try {
          const items = await orderService.getReceivedItems({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            franchiseId: selectedFranchise
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
  }, [dateRange, selectedFranchise]);

  // Calculate stats
  const stats = {
    pendingOrders: orders.filter(o => o.status === 'PLACED').length,
    acceptedOrders: orders.filter(o => o.status === 'ACCEPTED').length,
    dispatchedToday: orders.filter(o => {
      if (o.status !== 'DISPATCHED' && o.status !== 'RECEIVED') return false;
      const dispatchDate = o.dispatched_at?.split('T')[0];
      return dispatchDate === today;
    }).length
  };

  // Filter orders requiring action (PLACED or ACCEPTED)
  const actionOrders = orders.filter(o => o.status === 'PLACED' || o.status === 'ACCEPTED').slice(0, 5);

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
          Kitchen Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <StatCard icon="" label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" />
        <StatCard icon="" label="Accepted" value={stats.acceptedOrders} color="#3b82f6" />
        <StatCard icon="" label="Dispatched Today" value={stats.dispatchedToday} color="#10b981" />
      </div>

      {/* Pending Orders */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 20 }}>
          Orders Requiring Action
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Order #</th>
                <th style={thStyle}>Franchise</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {actionOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                    No orders requiring action
                  </td>
                </tr>
              ) : (
                actionOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                        {order.order_number}
                      </span>
                    </td>
                    <td style={tdStyle}>{order.franchise_name}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={tdStyle}>
                      {formatDateTime(order.created_at)}
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
          Items Received by Franchise
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Select a franchise and date period to view items dispatched and received
        </p>

        {/* Franchise Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginRight: 8 }}>
            Franchise:
          </label>
          <select
            value={selectedFranchise}
            onChange={(e) => setSelectedFranchise(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              minWidth: 180,
              outline: 'none'
            }}
          >
            {franchises.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <DatePeriodPicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />

        <div style={{ marginTop: 20 }}>
          <ReceivedItemsReport
            data={receivedItems}
            loading={loadingItems}
            franchiseName={selectedFranchise !== 'all' ? franchises.find(f => f.id === selectedFranchise)?.name : null}
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
        fontSize: 24
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
