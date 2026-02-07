import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import ToastNotification from '../../components/ToastNotification';

/**
 * Franchise Staff Attendance View
 * Allows franchise owner to view staff attendance records
 */
export default function FranchiseStaffAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [expandedRecord, setExpandedRecord] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, [dateRange]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceRecords({
        franchise_id: user.franchise_id,
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      setAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setToast({ show: true, message: 'Failed to load attendance records', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ON_TIME: { bg: '#d1fae5', color: '#065f46', label: '✓ On Time' },
      LATE: { bg: '#fef3c7', color: '#92400e', label: '⚠ Late' },
      MISSED: { bg: '#fee2e2', color: '#991b1b', label: '✗ Missed' },
      CHECKED_IN: { bg: '#dbeafe', color: '#1e40af', label: '🕐 Checked In' },
      CHECKED_OUT: { bg: '#e5e7eb', color: '#374151', label: '✓ Checked Out' },
      EARLY_CHECKOUT: { bg: '#fef3c7', color: '#92400e', label: '⚠ Early Checkout' }
    };
    const style = styles[status] || { bg: '#f3f4f6', color: '#6b7280', label: status };
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Group attendance by date
  const groupedByDate = attendance.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading attendance...</div>;
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
        Staff Attendance
      </h1>

      {/* Date Filter */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </div>
        <div style={{ marginTop: 20 }}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {attendance.length} records found
          </span>
        </div>
      </div>

      {/* Attendance List */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No attendance records found for the selected period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, records]) => (
              <div key={date}>
                <h3 style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 12,
                  padding: '0 4px'
                }}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {records.map(record => (
                    <div
                      key={record.id}
                      style={{
                        background: 'white',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div
                        style={{
                          padding: 16,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.staff_name}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>
                            {record.employee_id}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {getStatusBadge(record.status)}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#4b5563' }}>
                              {record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                              {record.checkout_time && (
                                <> → {new Date(record.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>
                              Duration: {formatDuration(record.shift_duration)}
                            </div>
                          </div>
                          <span style={{ color: '#9ca3af' }}>
                            {expandedRecord === record.id ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {expandedRecord === record.id && (
                        <div style={{
                          borderTop: '1px solid #e5e7eb',
                          padding: 16,
                          background: '#f9fafb'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {/* Selfie Photo */}
                            {record.selfie_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Selfie Photo</div>
                                <img
                                  src={record.selfie_photo}
                                  alt="Selfie"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb'
                                  }}
                                />
                              </div>
                            )}
                            {/* Shoes Photo */}
                            {record.shoes_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Shoes Photo</div>
                                <img
                                  src={record.shoes_photo}
                                  alt="Shoes"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb'
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Score Impact */}
                          {record.score_deduction && record.score_deduction > 0 && (
                            <div style={{
                              marginTop: 16,
                              padding: 12,
                              background: '#fee2e2',
                              borderRadius: 8,
                              color: '#991b1b',
                              fontSize: 13
                            }}>
                              Score deduction: -{record.score_deduction} points
                              {record.deduction_reason && ` (${record.deduction_reason})`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
