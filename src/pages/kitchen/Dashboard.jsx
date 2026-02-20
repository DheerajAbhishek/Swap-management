import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/Supply/StatusBadge';
import DatePeriodPicker from '../../components/Supply/DatePeriodPicker';
import ReceivedItemsReport from '../../components/Supply/ReceivedItemsReport';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import { orderService } from '../../services/orderService';
import { franchiseService } from '../../services/franchiseService';

// SVG Icons for dashboard stats
const PendingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AcceptedIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const DispatchedIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

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
  const [assignedFranchises, setAssignedFranchises] = useState([]);
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

  // Fetch orders and franchises
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch orders and franchises in parallel
        const [ordersData, franchisesData] = await Promise.all([
          orderService.getOrders(),
          franchiseService.getFranchises().catch(() => [])
        ]);

        setOrders(ordersData);

        // Filter franchises assigned to this kitchen (vendor_1_id or vendor_2_id matches)
        const vendorId = user?.vendor_id || user?.userId || user?.id;
        const myFranchises = franchisesData.filter(f => 
          f.vendor_1_id === vendorId || f.vendor_2_id === vendorId
        );
        setAssignedFranchises(myFranchises);

        // Use franchises from API, fallback to extracting from orders if API fails
        if (myFranchises && myFranchises.length > 0) {
          const franchiseList = myFranchises.map(f => ({ id: f.id, name: f.name }));
          setFranchises([{ id: 'all', name: 'All Franchises' }, ...franchiseList]);
        } else if (franchisesData && franchisesData.length > 0) {
          // Fallback to all franchises if none specifically assigned
          const franchiseList = franchisesData.map(f => ({ id: f.id, name: f.name }));
          setFranchises([{ id: 'all', name: 'All Franchises' }, ...franchiseList]);
        } else {
          // Fallback: Extract unique franchises from orders
          const uniqueFranchises = [...new Set(ordersData.map(o => o.franchise_id))]
            .filter(Boolean)
            .map(id => {
              const order = ordersData.find(o => o.franchise_id === id);
              return { id, name: order?.franchise_name || id };
            });
          setFranchises([{ id: 'all', name: 'All Franchises' }, ...uniqueFranchises]);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
        <StatCard icon={<PendingIcon />} label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" />
        <StatCard icon={<AcceptedIcon />} label="Accepted" value={stats.acceptedOrders} color="#3b82f6" />
        <StatCard icon={<DispatchedIcon />} label="Dispatched Today" value={stats.dispatchedToday} color="#10b981" />
      </div>

      {/* Assigned Franchises */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Franchises You Supply
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
              {assignedFranchises.length} franchise{assignedFranchises.length !== 1 ? 's' : ''} assigned to your kitchen
            </p>
          </div>
        </div>

        {assignedFranchises.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: '#6b7280',
            background: '#f9fafb',
            borderRadius: 12
          }}>
            <p style={{ margin: 0 }}>No franchises assigned yet. Contact admin for franchise assignments.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {assignedFranchises.map(franchise => (
              <div key={franchise.id} style={{
                padding: 16,
                background: '#f9fafb',
                borderRadius: 12,
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#3b82f6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14
                  }}>
                    {franchise.name?.charAt(0)?.toUpperCase() || 'F'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{franchise.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{franchise.location || 'No location'}</div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: franchise.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                    color: franchise.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                    fontSize: 11,
                    fontWeight: 500
                  }}>
                    {franchise.status || 'ACTIVE'}
                  </div>
                </div>
                {franchise.phone && (
                  <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {franchise.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
