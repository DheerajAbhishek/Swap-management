import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { franchiseService } from '../../services/franchiseService';
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
 * Admin Attendance View
 * View all staff attendance across all franchises
 */
export default function AdminAttendanceView() {
  const [attendance, setAttendance] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filters, setFilters] = useState({
    franchise_id: 'ALL',
    status: 'ALL',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null); // For viewing photos

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filters]);

  const fetchData = async () => {
    try {
      const franchiseData = await franchiseService.getFranchises();
      setFranchises(franchiseData);
    } catch (err) {
      console.error('Failed to fetch franchises:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      if (filters.franchise_id !== 'ALL') {
        params.franchise_id = filters.franchise_id;
      }
      const data = await attendanceService.getAllAttendanceRecords(params);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setToast({ show: true, message: 'Failed to load attendance', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(record => {
    if (filters.status !== 'ALL' && record.status !== filters.status) return false;
    return true;
  });

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

  // Stats
  const stats = {
    total: attendance.length,
    onTime: attendance.filter(a => a.status === 'ON_TIME').length,
    late: attendance.filter(a => a.status === 'LATE').length,
    missed: attendance.filter(a => a.status === 'MISSED').length,
    earlyCheckout: attendance.filter(a => a.status === 'EARLY_CHECKOUT').length
  };

  // Group by date
  const groupedByDate = filteredAttendance.reduce((acc, record) => {
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Total Records</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{stats.onTime}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>On Time</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{stats.late}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Late</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{stats.missed}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Missed</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>{stats.earlyCheckout}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Early Checkout</div>
        </div>
      </div>

      {/* Filters */}
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
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Franchise</label>
          <select
            value={filters.franchise_id}
            onChange={(e) => setFilters({ ...filters, franchise_id: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              minWidth: 180
            }}
          >
            <option value="ALL">All Franchises</option>
            {franchises.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              minWidth: 140
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ON_TIME">On Time</option>
            <option value="LATE">Late</option>
            <option value="MISSED">Missed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="EARLY_CHECKOUT">Early Checkout</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>From</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
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
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
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
            {filteredAttendance.length} records
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
          No attendance records found for the selected filters.
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
                  <span style={{ fontWeight: 400, marginLeft: 8 }}>({records.length} records)</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                          padding: 14,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontWeight: 600 }}>{record.staff_name}</span>
                            {getStatusBadge(record.status)}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            {record.employee_id} • {record.franchise_name || 'N/A'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#4b5563' }}>
                              {record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                              {record.checkout_time && (
                                <> → {new Date(record.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                              {formatDuration(record.shift_duration)}
                            </div>
                          </div>
                          {record.score_deduction > 0 && (
                            <span style={{
                              padding: '4px 8px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              -{record.score_deduction}
                            </span>
                          )}
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
                          {record.deduction_reason && (
                            <div style={{
                              marginTop: 16,
                              padding: 12,
                              background: '#fee2e2',
                              borderRadius: 8,
                              color: '#991b1b',
                              fontSize: 13
                            }}>
                              Deduction reason: {record.deduction_reason}
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
