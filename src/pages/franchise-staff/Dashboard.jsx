import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { orderService } from '../../services/orderService';
import { staffService } from '../../services/staffService';

/**
 * Franchise Staff Dashboard
 * Shows attendance status, score, and quick actions
 * No financial data visible
 */
export default function FranchiseStaffDashboard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date();
  const isBeforeCutoff = currentTime.getHours() < 10 || (currentTime.getHours() === 10 && currentTime.getMinutes() === 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get today's attendance
        const attendance = await attendanceService.getTodayAttendance();
        setTodayAttendance(attendance);

        // Get staff info for score
        if (user?.staff_id || user?.id) {
          try {
            const staff = await staffService.getStaffById(user.staff_id || user.id);
            setStaffInfo(staff);
          } catch (e) {
            console.log('Could not fetch staff info');
          }
        }

        // Get recent orders
        const orders = await orderService.getOrders();
        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Calculate score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const score = staffInfo?.score ?? 100;
  const scoreColor = getScoreColor(score);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Staff Dashboard
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Welcome, {user?.name} ({user?.employee_id})
        </p>
      </div>

      {/* Score Warning */}
      {score < 60 && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#dc2626' }}>Low Score Warning</div>
            <div style={{ color: '#b91c1c', fontSize: 14 }}>
              Your score is below 60. Please ensure timely check-in (before 10 AM) and complete 9-hour shifts.
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Score Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Monthly Score</div>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 700, 
            color: scoreColor 
          }}>
            {score}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>out of 100</div>
        </div>

        {/* Attendance Status */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Today's Status</div>
          {todayAttendance ? (
            <>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: todayAttendance.check_out_time ? '#10b981' : '#3b82f6' 
              }}>
                {todayAttendance.check_out_time ? 'Shift Complete' : 'Checked In'}
              </div>
              {todayAttendance.is_late && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                  ⚠️ Late Check-in
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444' }}>
              Not Checked In
            </div>
          )}
        </div>

        {/* Check-in Time */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Check-in Time</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
            {todayAttendance?.check_in_time 
              ? new Date(todayAttendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : '--:--'
            }
          </div>
          {!todayAttendance && (
            <div style={{ fontSize: 12, color: isBeforeCutoff ? '#10b981' : '#ef4444', marginTop: 4 }}>
              {isBeforeCutoff ? 'On time if checked in now' : 'Will be marked late'}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        color: 'white'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, margin: 0 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!todayAttendance && (
            <Link
              to="/franchise-staff/attendance"
              style={{
                background: 'white',
                color: '#059669',
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              📸 Mark Attendance
            </Link>
          )}
          {todayAttendance && !todayAttendance.check_out_time && (
            <Link
              to="/franchise-staff/attendance"
              style={{
                background: 'white',
                color: '#059669',
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              👋 Check Out
            </Link>
          )}
          <Link
            to="/franchise-staff/create-order"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            📝 Create Order
          </Link>
          <Link
            to="/franchise-staff/orders"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            📋 View Orders
          </Link>
        </div>
      </div>

      {/* Recent Orders (No financial data) */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
          Recent Orders
        </h2>
        {recentOrders.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No orders yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentOrders.map(order => (
              <div
                key={order.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  background: '#f9fafb',
                  borderRadius: 8
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{order.order_number}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                    {order.created_by_name && ` • By: ${order.created_by_name}`}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: order.status === 'RECEIVED' ? '#d1fae5' : 
                             order.status === 'DISPATCHED' ? '#dbeafe' :
                             order.status === 'ACCEPTED' ? '#e0e7ff' : '#fef3c7',
                  color: order.status === 'RECEIVED' ? '#065f46' :
                         order.status === 'DISPATCHED' ? '#1e40af' :
                         order.status === 'ACCEPTED' ? '#3730a3' : '#92400e'
                }}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
