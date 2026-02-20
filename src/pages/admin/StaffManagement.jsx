import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { franchiseService } from '../../services/franchiseService';
import ToastNotification from '../../components/ToastNotification';

/**
 * Admin Staff Management
 * View all staff across all franchises and kitchens
 */
export default function AdminStaffManagement() {
  const [staff, setStaff] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filters, setFilters] = useState({
    role: 'ALL',
    franchise_id: 'ALL',
    status: 'ALL'
  });
  const [expandedStaff, setExpandedStaff] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffData, franchiseData] = await Promise.all([
        staffService.getAllStaff(),
        franchiseService.getFranchises()
      ]);
      setStaff(staffData);
      setFranchises(franchiseData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setToast({ show: true, message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    if (filters.role !== 'ALL' && s.role !== filters.role) return false;
    if (filters.franchise_id !== 'ALL' && s.franchise_id !== filters.franchise_id) return false;
    if (filters.status !== 'ALL' && s.status !== filters.status) return false;
    return true;
  });

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getRoleBadge = (role) => {
    if (role === 'FRANCHISE') {
      return (
        <span style={{
          padding: '4px 10px',
          background: '#dbeafe',
          color: '#1e40af',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600
        }}>
          Franchise Manager
        </span>
      );
    }
    if (role === 'FRANCHISE_STAFF') {
      return (
        <span style={{
          padding: '4px 10px',
          background: '#e0e7ff',
          color: '#3730a3',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500
        }}>
          Franchise Staff
        </span>
      );
    }
    if (role === 'KITCHEN') {
      return (
        <span style={{
          padding: '4px 10px',
          background: '#fef3c7',
          color: '#92400e',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600
        }}>
          Kitchen Manager
        </span>
      );
    }
    return (
      <span style={{
        padding: '4px 10px',
        background: '#fed7aa',
        color: '#7c2d12',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500
      }}>
        Kitchen Staff
      </span>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading staff...</div>;
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
        All Staff Members
      </h1>

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
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Role</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              minWidth: 150
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="FRANCHISE">Franchise Manager</option>
            <option value="FRANCHISE_STAFF">Franchise Staff</option>
            <option value="KITCHEN">Kitchen Manager</option>
            <option value="KITCHEN_STAFF">Kitchen Staff</option>
          </select>
        </div>

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
              minWidth: 120
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {filteredStaff.length} staff found
          </span>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Total Staff</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.filter(s => s.status === 'ACTIVE').length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Franchise Managers</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.filter(s => s.role === 'FRANCHISE').length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Franchise Staff</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.filter(s => s.role === 'FRANCHISE_STAFF').length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Kitchen Managers</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.filter(s => s.role === 'KITCHEN').length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #fb923c, #ea580c)',
          borderRadius: 12,
          padding: 16,
          color: 'white'
        }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Kitchen Staff</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{staff.filter(s => s.role === 'KITCHEN_STAFF').length}</div>
        </div>
      </div>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No staff found matching filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredStaff.map(member => (
            <div
              key={member.id}
              style={{
                background: 'white',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                opacity: member.status === 'INACTIVE' ? 0.7 : 1
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
                onClick={() => setExpandedStaff(expandedStaff === member.id ? null : member.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 600 }}>{member.name}</span>
                    {getRoleBadge(member.role)}
                    <span style={{
                      padding: '4px 8px',
                      background: member.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                      color: member.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500
                    }}>
                      {member.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{member.employee_id}</span>
                    {member.role === 'FRANCHISE_STAFF' && member.franchise_name && (
                      <span style={{
                        padding: '2px 8px',
                        background: '#dcfce7',
                        color: '#166534',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        Franchise: {member.franchise_name}
                      </span>
                    )}
                    {member.role === 'KITCHEN_STAFF' && member.kitchen_name && (
                      <span style={{
                        padding: '2px 8px',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        Kitchen: {member.kitchen_name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Score (only for franchise staff) */}
                  {member.role === 'FRANCHISE_STAFF' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: getScoreColor(member.score || 100)
                      }}>
                        {member.score || 100}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Score</div>
                    </div>
                  )}
                  <span style={{ color: '#9ca3af' }}>
                    {expandedStaff === member.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedStaff === member.id && (
                <div style={{
                  borderTop: '1px solid #e5e7eb',
                  padding: 16,
                  background: '#f9fafb',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Email</div>
                    <div style={{ fontWeight: 500 }}>{member.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Phone</div>
                    <div style={{ fontWeight: 500 }}>{member.phone}</div>
                  </div>
                  {member.role === 'FRANCHISE_STAFF' && (
                    <>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Franchise</div>
                        <div style={{ fontWeight: 500, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                          {member.franchise_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Franchise ID</div>
                        <div style={{ fontWeight: 500, fontSize: 11, fontFamily: 'monospace' }}>
                          {member.franchise_id || 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                  {member.role === 'KITCHEN_STAFF' && (
                    <>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Kitchen</div>
                        <div style={{ fontWeight: 500, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                          {member.kitchen_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Kitchen ID</div>
                        <div style={{ fontWeight: 500, fontSize: 11, fontFamily: 'monospace' }}>
                          {member.kitchen_id || 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Created</div>
                    <div style={{ fontWeight: 500 }}>
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  {member.address && (
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Address</div>
                      <div style={{ fontWeight: 500 }}>{member.address}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
