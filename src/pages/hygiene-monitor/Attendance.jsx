import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hygieneMonitorService } from '../../services/hygieneMonitorService';

/**
 * HygieneMonitorAttendance - View staff attendance for assigned franchises
 */
export default function HygieneMonitorAttendance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [franchises, setFranchises] = useState([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(searchParams.get('franchise_id') || '');
  const [attendanceData, setAttendanceData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFranchises();
  }, []);

  useEffect(() => {
    if (selectedFranchiseId) {
      loadAttendance();
    }
  }, [selectedFranchiseId, startDate, endDate]);

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const data = await hygieneMonitorService.getAssignedFranchises();
      setFranchises(data);

      // Auto-select first franchise if none selected
      if (!selectedFranchiseId && data.length > 0) {
        setSelectedFranchiseId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load franchises:', err);
      alert('Failed to load franchises: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const params = { franchise_id: selectedFranchiseId };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await hygieneMonitorService.getAttendance(params);
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      alert('Failed to load attendance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!attendanceData || !attendanceData.attendance) {
      return { totalRecords: 0, presentCount: 0, absentCount: 0, leaveCount: 0 };
    }

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    attendanceData.attendance.forEach(record => {
      record.attendance.forEach(att => {
        if (att.status === 'PRESENT') presentCount++;
        else if (att.status === 'ABSENT') absentCount++;
        else if (att.status === 'LEAVE') leaveCount++;
      });
    });

    return {
      totalRecords: presentCount + absentCount + leaveCount,
      presentCount,
      absentCount,
      leaveCount
    };
  };

  const stats = calculateStats();
  const selectedFranchise = franchises.find(f => f.id === selectedFranchiseId);

  if (loading && !attendanceData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ color: '#6b7280', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                Staff Attendance Log
              </h1>
              <p style={{ color: '#6b7280', marginTop: 4, margin: 0 }}>
                Monitor daily staff attendance for assigned franchises
              </p>
            </div>
            <button
              onClick={() => navigate('/hygiene-monitor/staff-attendance-management')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Staff Hygiene Reports
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Franchise
              </label>
              <select
                value={selectedFranchiseId}
                onChange={(e) => setSelectedFranchiseId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              >
                <option value="">Select franchise</option>
                {franchises.map(franchise => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>
        </div>

        {!selectedFranchiseId ? (
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 48, textAlign: 'center', color: '#6b7280' }}>
            Please select a franchise to view attendance
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Total Records</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginTop: 4, margin: 0 }}>
                  {stats.totalRecords}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Present</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4, margin: 0 }}>
                  {stats.presentCount}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Absent</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4, margin: 0 }}>
                  {stats.absentCount}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>On Leave</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4, margin: 0 }}>
                  {stats.leaveCount}
                </p>
              </div>
            </div>

            {/* Staff List */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>
                  Staff - {selectedFranchise?.name}
                </h2>
              </div>

              {!attendanceData || attendanceData.staff?.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
                  No staff records found for this franchise
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                      <tr>
                        <th style={thStyle}>Staff Name</th>
                        <th style={thStyle}>Employee ID</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Role</th>
                        <th style={thStyle}>Attendance Count</th>
                      </tr>
                    </thead>
                    <tbody style={{ background: 'white' }}>
                      {attendanceData.staff.map((staff, idx) => {
                        const staffAttendance = attendanceData.attendance.find(a => a.staff.id === staff.id);
                        const attendanceCount = staffAttendance?.attendance?.length || 0;

                        return (
                          <tr key={staff.id} style={{ borderBottom: idx < attendanceData.staff.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <td style={tdStyle}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{staff.name}</div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: 14, color: '#1f2937' }}>{staff.employee_id || '-'}</div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: 14, color: '#1f2937' }}>{staff.phone || '-'}</div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ padding: '4px 8px', fontSize: 12, background: '#dbeafe', color: '#1e40af', borderRadius: 4 }}>
                                {staff.role}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: 14, color: '#1f2937' }}>{attendanceCount} records</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detailed Attendance Records */}
            {attendanceData && attendanceData.attendance?.length > 0 && (
              <div style={{ marginTop: 24, background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>
                    Attendance Details
                  </h2>
                </div>
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {attendanceData.attendance.map(record => (
                    <div key={record.staff.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                      <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 12, margin: 0 }}>
                        {record.staff.name}
                      </h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead style={{ background: '#f9fafb' }}>
                            <tr>
                              <th style={thStyleSmall}>Date</th>
                              <th style={thStyleSmall}>Status</th>
                              <th style={thStyleSmall}>Check-in</th>
                              <th style={thStyleSmall}>Check-out</th>
                              <th style={thStyleSmall}>Remarks</th>
                            </tr>
                          </thead>
                          <tbody style={{ background: 'white' }}>
                            {record.attendance.map((att, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < record.attendance.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                <td style={tdStyleSmall}>{att.date}</td>
                                <td style={tdStyleSmall}>
                                  <span style={{
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    borderRadius: 4,
                                    background: att.status === 'PRESENT' ? '#d1fae5' : att.status === 'ABSENT' ? '#fee2e2' : '#fef3c7',
                                    color: att.status === 'PRESENT' ? '#065f46' : att.status === 'ABSENT' ? '#991b1b' : '#92400e'
                                  }}>
                                    {att.status}
                                  </span>
                                </td>
                                <td style={tdStyleSmall}>{att.check_in || '-'}</td>
                                <td style={tdStyleSmall}>{att.check_out || '-'}</td>
                                <td style={tdStyleSmall}>{att.remarks || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 24px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase'
};

const tdStyle = {
  padding: '16px 24px'
};

const thStyleSmall = {
  padding: '8px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase'
};

const tdStyleSmall = {
  padding: '8px 16px',
  fontSize: 14
};
