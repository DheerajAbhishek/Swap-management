import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../services/staffService';
import ToastNotification from '../../components/ToastNotification';

/**
 * Kitchen Staff Management
 * Allows kitchen owner to manage their staff members AND managers
 * No attendance for kitchen staff
 */
export default function KitchenStaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'managers'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    role: 'KITCHEN_STAFF' // or 'KITCHEN' for manager
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Validate phone number (10 digits)
  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Handle phone change with validation
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
      if (value.length === 10) {
        if (!validatePhone(value)) {
          setPhoneError('Please enter a valid 10-digit phone number starting with 6-9');
        } else {
          setPhoneError('');
        }
      } else if (value.length > 0) {
        setPhoneError('Phone number must be 10 digits');
      } else {
        setPhoneError('');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const parentId = user.kitchen_id || user.vendor_id || user.userId;
      const [staffData, managersData] = await Promise.all([
        staffService.getStaff({ type: 'KITCHEN_STAFF', parentId }),
        staffService.getManagers('KITCHEN')
      ]);
      setStaff(staffData);
      // Filter managers for this vendor only
      const vendorId = user.vendor_id || user.userId;
      setManagers(managersData.filter(m => m.vendor_id === vendorId));
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setToast({ show: true, message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffMember = null, isManager = false) => {
    setPhoneError('');
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name || '',
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        password: '',
        address: staffMember.address || '',
        role: isManager ? 'KITCHEN' : 'KITCHEN_STAFF'
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        role: activeTab === 'managers' ? 'KITCHEN' : 'KITCHEN_STAFF'
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
      address: '',
      role: 'KITCHEN_STAFF'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone number for staff
    if (formData.role === 'KITCHEN_STAFF' && !validatePhone(formData.phone)) {
      setPhoneError('Please enter a valid 10-digit phone number starting with 6-9');
      setToast({ show: true, message: 'Please enter a valid phone number', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      if (editingStaff) {
        // Update existing (only staff, managers cannot be edited)
        if (formData.role === 'KITCHEN_STAFF') {
          const updateData = { ...formData };
          if (!updateData.password) delete updateData.password;
          await staffService.updateStaff(editingStaff.id, updateData);
          setToast({ show: true, message: 'Staff updated successfully!', type: 'success' });
        }
      } else {
        // Create new
        if (formData.role === 'KITCHEN') {
          await staffService.createManager({
            ...formData,
            role: 'KITCHEN',
            vendor_id: user.vendor_id || user.userId,
            vendor_name: user.vendor_name || user.name
          });
          setToast({ show: true, message: 'Manager created successfully!', type: 'success' });
        } else {
          await staffService.createStaff({
            ...formData,
            role: 'KITCHEN_STAFF',
            kitchen_id: user.kitchen_id || user.userId
          });
          setToast({ show: true, message: 'Staff created successfully!', type: 'success' });
        }
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      let errorMessage = 'Failed to save';
      if (err.message?.toLowerCase().includes('email already exists')) {
        errorMessage = 'A user with this email already exists.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setToast({ show: true, message: errorMessage, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, isManager = false) => {
    if (!window.confirm(`Are you sure you want to delete this ${isManager ? 'manager' : 'staff member'}?`)) return;

    try {
      if (isManager) {
        await staffService.deleteManager(id);
        setToast({ show: true, message: 'Manager deleted successfully!', type: 'success' });
      } else {
        await staffService.deleteStaff(id);
        setToast({ show: true, message: 'Staff deleted successfully!', type: 'success' });
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
      setToast({ show: true, message: 'Failed to delete', type: 'error' });
    }
  };

  const handleToggleStatus = async (staffMember) => {
    const newStatus = staffMember.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await staffService.updateStaff(staffMember.id, { status: newStatus });
      setToast({ show: true, message: `Staff ${newStatus.toLowerCase()}`, type: 'success' });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
      setToast({ show: true, message: 'Failed to update status', type: 'error' });
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading...</div>;
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
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Team Management
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
            Manage kitchen staff and managers
          </p>
        </div>
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
          + Add {activeTab === 'managers' ? 'Manager' : 'Staff'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'staff' ? '#3b82f6' : '#f3f4f6',
            color: activeTab === 'staff' ? 'white' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Staff ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('managers')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'managers' ? '#f59e0b' : '#f3f4f6',
            color: activeTab === 'managers' ? 'white' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Managers ({managers.length})
        </button>
      </div>

      {/* Managers Tab */}
      {activeTab === 'managers' && (
        <>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
            color: '#92400e'
          }}>
            <strong>Managers</strong> have the same access as you - they can manage incoming orders, dispatch, and manage staff.
          </div>

          {managers.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No managers added yet. Add a manager to give them access to this kitchen.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {managers.map(manager => (
                <div
                  key={manager.id}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{manager.name}</span>
                      <span style={{
                        padding: '4px 10px',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        MANAGER
                      </span>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                      {manager.email} • {manager.phone || 'No phone'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(manager.id, true)}
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
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <>
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    opacity: member.status === 'INACTIVE' ? 0.7 : 1
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
                        onClick={() => handleToggleStatus(member)}
                        style={{
                          padding: '8px 16px',
                          background: member.status === 'ACTIVE' ? '#fef3c7' : '#dbeafe',
                          color: member.status === 'ACTIVE' ? '#92400e' : '#1d4ed8',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
              ))}
            </div>
          )}
        </>
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
              {editingStaff ? 'Edit Staff' : formData.role === 'KITCHEN' ? 'Add New Manager' : 'Add New Staff'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Role Selection (only for new) */}
              {!editingStaff && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Type *</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'KITCHEN_STAFF' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 8,
                        border: formData.role === 'KITCHEN_STAFF' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                        background: formData.role === 'KITCHEN_STAFF' ? '#dbeafe' : 'white',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'KITCHEN' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 8,
                        border: formData.role === 'KITCHEN' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                        background: formData.role === 'KITCHEN' ? '#fef3c7' : 'white',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Manager
                    </button>
                  </div>
                  {formData.role === 'KITCHEN' && (
                    <p style={{ fontSize: 12, color: '#d97706', marginTop: 6 }}>
                      Managers get full access to this kitchen.
                    </p>
                  )}
                </div>
              )}

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
                    fontSize: 14,
                    boxSizing: 'border-box'
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
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: phoneError ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
                {phoneError && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, margin: '4px 0 0 0' }}>
                    {phoneError}
                  </p>
                )}
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
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {formData.role === 'KITCHEN_STAFF' && (
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
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

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
                    background: formData.role === 'KITCHEN' ? '#f59e0b' : '#3b82f6',
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
