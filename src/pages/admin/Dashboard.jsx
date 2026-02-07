import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/Supply/StatusBadge';
import DatePeriodPicker from '../../components/Supply/DatePeriodPicker';
import ReceivedItemsReport from '../../components/Supply/ReceivedItemsReport';
import { formatCurrency } from '../../utils/constants';
import { orderService } from '../../services/orderService';
import { itemService } from '../../services/itemService';
import { discrepancyService } from '../../services/discrepancyService';

// Franchise options - will be populated from orders
const FRANCHISE_OPTIONS = [
  { id: 'all', name: 'All Franchises' }
];

/**
 * Admin Dashboard - Overview of system (Responsive)
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [franchises, setFranchises] = useState(FRANCHISE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Date period state for received items report
  const today = new Date().toISOString().split('T')[0];
  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ startDate: last30, endDate: today });
  const [selectedFranchise, setSelectedFranchise] = useState('all');
  const [receivedItems, setReceivedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersData, itemsData, discrepanciesData] = await Promise.all([
          orderService.getOrders(),
          itemService.getItems(),
          discrepancyService.getDiscrepancies({ resolved: false })
        ]);
        setOrders(ordersData);
        setItems(itemsData);
        setDiscrepancies(discrepanciesData);

        // Extract unique franchises from orders
        const uniqueFranchises = [...new Set(ordersData.map(o => o.franchise_id))]
          .filter(Boolean)
          .map(id => {
            const order = ordersData.find(o => o.franchise_id === id);
            return { id, name: order?.franchise_name || id };
          });
        setFranchises([{ id: 'all', name: 'All Franchises' }, ...uniqueFranchises]);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'PLACED' || o.status === 'ACCEPTED').length,
    totalItems: items.length,
    openDiscrepancies: discrepancies.length
  };

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{error}</div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4, fontSize: isMobile ? 13 : 14 }}>
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? 12 : 20,
        marginBottom: isMobile ? 20 : 32
      }}>
        <StatCard
          icon=""
          label="Total Orders"
          value={stats.totalOrders}
          color="#3b82f6"
          isMobile={isMobile}
        />
        <StatCard
          icon=""
          label="Pending Orders"
          value={stats.pendingOrders}
          color="#f59e0b"
          isMobile={isMobile}
        />
        <StatCard
          icon=""
          label="Total Items"
          value={stats.totalItems}
          color="#10b981"
          isMobile={isMobile}
        />
        <StatCard
          icon=""
          label="Open Discrepancies"
          value={stats.openDiscrepancies}
          color="#ef4444"
          isMobile={isMobile}
        />
      </div>

      {/* Recent Orders */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? 16 : 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1f2937', marginBottom: isMobile ? 16 : 20 }}>
          Recent Orders
        </h2>

        {/* Mobile Card View */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>
                No orders yet
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} style={{
                  padding: 12,
                  background: '#f9fafb',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: '#3b82f6', fontSize: 13 }}>
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    {order.franchise_name}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Order #</th>
                  <th style={thStyle}>Franchise</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                      No orders yet
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
                      <td style={tdStyle}>{order.franchise_name}</td>
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
        )}
      </div>

      {/* Items Received Report */}
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? 16 : 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginTop: isMobile ? 16 : 24
      }}>
        <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1f2937', marginBottom: isMobile ? 12 : 16 }}>
          Items Received by Franchise
        </h2>
        <p style={{ color: '#6b7280', marginBottom: isMobile ? 12 : 16, fontSize: isMobile ? 13 : 14 }}>
          Select a franchise and date period to view items received
        </p>

        {/* Franchise Selector */}
        <div style={{ marginBottom: isMobile ? 12 : 16 }}>
          <label style={{ fontSize: isMobile ? 12 : 13, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Franchise:
          </label>
          <select
            value={selectedFranchise}
            onChange={(e) => setSelectedFranchise(e.target.value)}
            style={{
              padding: isMobile ? '8px 12px' : '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              width: isMobile ? '100%' : 'auto',
              minWidth: isMobile ? 'auto' : 180,
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

        <div style={{ marginTop: isMobile ? 16 : 20 }}>
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

function StatCard({ icon, label, value, color, isMobile }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? 14 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 10 : 16
    }}>
      <div style={{
        width: isMobile ? 40 : 48,
        height: isMobile ? 40 : 48,
        borderRadius: isMobile ? 10 : 12,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? 20 : 24
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1f2937' }}>
          {value}
        </div>
        <div style={{ fontSize: isMobile ? 11 : 13, color: '#6b7280' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: 13
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14
};
