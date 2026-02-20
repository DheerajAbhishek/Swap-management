import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import ToastNotification from '../../components/ToastNotification';
import {
  CameraIcon,
  UserIcon,
  ShoesIcon,
  KitchenIcon,
  CleanIcon,
  CloseIcon
} from '../../components/AttendanceIcons';

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
  const [selectedRecord, setSelectedRecord] = useState(null); // For viewing photos

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
                          <div style={{ marginBottom: 16 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecord(record);
                              }}
                              style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <CameraIcon size={14} color="white" /> View All Photos
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                            {/* Selfie Photo */}
                            {record.selfie_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <UserIcon size={14} color="#6b7280" /> Selfie
                                </div>
                                <img
                                  src={record.selfie_photo}
                                  alt="Selfie"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(record);
                                  }}
                                />
                              </div>
                            )}
                            {/* Shoes Photo */}
                            {record.shoes_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <ShoesIcon size={14} color="#6b7280" /> Shoes
                                </div>
                                <img
                                  src={record.shoes_photo}
                                  alt="Shoes"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(record);
                                  }}
                                />
                              </div>
                            )}
                            {/* Mesa Photo */}
                            {record.mesa_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <KitchenIcon size={14} color="#6b7280" /> Kitchen (Mesa)
                                </div>
                                <img
                                  src={record.mesa_photo}
                                  alt="Kitchen Overview"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(record);
                                  }}
                                />
                              </div>
                            )}
                            {/* Standing Area Photo */}
                            {record.standing_area_photo && (
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <CleanIcon size={14} color="#6b7280" /> Standing Area
                                </div>
                                <img
                                  src={record.standing_area_photo}
                                  alt="Standing Area"
                                  style={{
                                    width: '100%',
                                    maxWidth: 200,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(record);
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

      {/* Photo Viewer Modal */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflow: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 1000,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '2px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  Attendance Photos
                </h2>
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {selectedRecord.staff_name} - {new Date(selectedRecord.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <CloseIcon size={16} color="white" /> Close
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20
            }}>
              {selectedRecord.selfie_photo && (
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#6b7280',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <UserIcon size={16} color="#6b7280" /> Selfie Photo
                  </div>
                  <img
                    src={selectedRecord.selfie_photo}
                    alt="Selfie"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb'
                    }}
                  />
                </div>
              )}

              {selectedRecord.shoes_photo && (
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#6b7280',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <ShoesIcon size={16} color="#6b7280" /> Shoes Photo
                  </div>
                  <img
                    src={selectedRecord.shoes_photo}
                    alt="Shoes"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb'
                    }}
                  />
                </div>
              )}

              {selectedRecord.mesa_photo && (
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#6b7280',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <KitchenIcon size={16} color="#6b7280" /> Kitchen Overview (Mesa)
                  </div>
                  <img
                    src={selectedRecord.mesa_photo}
                    alt="Kitchen Overview"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb'
                    }}
                  />
                </div>
              )}

              {selectedRecord.standing_area_photo && (
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#6b7280',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <CleanIcon size={16} color="#6b7280" /> Standing Area Photo
                  </div>
                  <img
                    src={selectedRecord.standing_area_photo}
                    alt="Standing Area"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb'
                    }}
                  />
                </div>
              )}
            </div>

            {selectedRecord.deduction_reason && (
              <div style={{
                marginTop: 20,
                padding: 16,
                background: '#fee2e2',
                borderRadius: 12,
                color: '#991b1b',
                fontSize: 14,
                fontWeight: 500
              }}>
                ⚠️ Deduction Reason: {selectedRecord.deduction_reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
