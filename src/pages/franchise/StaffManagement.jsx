import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../services/staffService';
import ToastNotification from '../../components/ToastNotification';

/**
 * Franchise Staff Management
 * Allows franchise owner to manage their staff members
 * View attendance and scores
 */
export default function FranchiseStaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaff();
      setStaff(data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      setToast({ show: true, message: 'Failed to load staff', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name || '',
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        password: '', // Don't populate password
        address: staffMember.address || ''
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        address: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      address: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingStaff) {
        // Update existing staff
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await staffService.updateStaff(editingStaff.id, updateData);
        setToast({ show: true, message: 'Staff updated successfully!', type: 'success' });
      } else {
        // Create new staff
        await staffService.createStaff({
          ...formData,
          role: 'FRANCHISE_STAFF',
          franchise_id: user.franchise_id
        });
        setToast({ show: true, message: 'Staff created successfully!', type: 'success' });
      }
      handleCloseModal();
      fetchStaff();
    } catch (err) {
      console.error('Failed to save staff:', err);
      setToast({ show: true, message: err.message || 'Failed to save staff', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await staffService.deleteStaff(staffId);
      setToast({ show: true, message: 'Staff deleted successfully!', type: 'success' });
      fetchStaff();
    } catch (err) {
      console.error('Failed to delete staff:', err);
      setToast({ show: true, message: 'Failed to delete staff', type: 'error' });
    }
  };

  const handleResetScore = async (staffId) => {
    if (!window.confirm('Reset this staff member\'s score to 100?')) return;

    try {
      await staffService.updateStaff(staffId, { score: 100 });
      setToast({ show: true, message: 'Score reset to 100', type: 'success' });
      fetchStaff();
    } catch (err) {
      console.error('Failed to reset score:', err);
      setToast({ show: true, message: 'Failed to reset score', type: 'error' });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Staff Management
        </h1>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Add Staff
        </button>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No staff members yet. Add your first staff member to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {staff.map(member => (
            <div
              key={member.id}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{member.name}</h3>
                    <span style={{
                      padding: '4px 10px',
                      background: member.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                      color: member.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {member.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                    ID: {member.employee_id}
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 14 }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Email: </span>
                      <span style={{ color: '#4b5563' }}>{member.email}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Phone: </span>
                      <span style={{ color: '#4b5563' }}>{member.phone}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: getScoreColor(member.score || 100)
                    }}>
                      {member.score || 100}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Score</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpenModal(member)}
                      style={{
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetScore(member.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Reset Score
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 480
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
              {editingStaff ? 'Edit Staff' : 'Add New Staff'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                  {editingStaff ? 'Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingStaff}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: submitting ? 'wait' : 'pointer',
                    fontWeight: 600,
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : editingStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
