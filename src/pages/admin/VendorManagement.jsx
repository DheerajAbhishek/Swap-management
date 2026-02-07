import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/constants';
import { vendorService } from '../../services/vendorService';

/**
 * VendorManagement - Manage kitchen/vendor details and margin
 */
export default function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCredentials, setShowCredentials] = useState(null); // To show generated credentials
  const [resetPasswordModal, setResetPasswordModal] = useState(null); // For password reset
  const [newPassword, setNewPassword] = useState('');
  const [newVendor, setNewVendor] = useState({
    name: '',
    owner_name: '',
    location: '',
    phone: '',
    email: '',
    margin_percent: 5
  });

  // Load vendors from API
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getVendors();
      setVendors(data);
      // Also save to localStorage for kitchen views
      localStorage.setItem('supply_vendors', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to load vendors:', err);
      // Fallback to localStorage
      const stored = localStorage.getItem('supply_vendors');
      if (stored) setVendors(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor.id);
    setEditForm({ ...vendor });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await vendorService.updateVendor(editingId, editForm);
      await loadVendors();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      alert('Failed to update vendor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAddVendor = async () => {
    if (!newVendor.name || !newVendor.email) {
      alert('Please fill in name and email');
      return;
    }
    setSaving(true);
    try {
      const result = await vendorService.createVendor(newVendor);
      // Show generated credentials if returned
      if (result.credentials) {
        setShowCredentials({
          name: result.name,
          username: result.credentials.username,
          password: result.credentials.password
        });
      }
      await loadVendors();
      setNewVendor({
        name: '',
        owner_name: '',
        location: '',
        phone: '',
        email: '',
        margin_percent: 5
      });
      setShowAddForm(false);
    } catch (err) {
      alert('Failed to add vendor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        await vendorService.deleteVendor(id);
        await loadVendors();
      } catch (err) {
        alert('Failed to delete vendor: ' + err.message);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await vendorService.resetPassword(resetPasswordModal.id, newPassword);
      setShowCredentials({
        name: resetPasswordModal.name,
        username: resetPasswordModal.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@kitchen.swap',
        password: newPassword,
        isReset: true
      });
      setResetPasswordModal(null);
      setNewPassword('');
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Credentials Modal */}
      {showCredentials && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 32,
            maxWidth: 450,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28
            }}>
              ✓
            </div>
            <h2 style={{ margin: 0, marginBottom: 8, color: '#1f2937' }}>
              {showCredentials.isReset ? 'Password Reset Successfully!' : 'Vendor Created Successfully!'}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              Login credentials for <strong>{showCredentials.name}</strong>
            </p>
            <div style={{
              background: '#f3f4f6',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Username</div>
                <div style={{
                  background: 'white',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1f2937',
                  border: '1px solid #e5e7eb'
                }}>
                  {showCredentials.username}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Password</div>
                <div style={{
                  background: 'white',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1f2937',
                  border: '1px solid #e5e7eb'
                }}>
                  {showCredentials.password}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 20 }}>
              ⚠️ Please save these credentials. The password cannot be recovered later.
            </p>
            <button
              onClick={() => setShowCredentials(null)}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: 'none',
                background: '#f59e0b',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: 0, marginBottom: 8, color: '#1f2937' }}>
              Reset Password
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              Set a new password for <strong>{resetPasswordModal.name}</strong>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '2px solid #e5e7eb',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleResetPassword}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: saving ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}
              >
                {saving ? 'Saving...' : 'Reset Password'}
              </button>
              <button
                onClick={() => { setResetPasswordModal(null); setNewPassword(''); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Vendor / Kitchen Management
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            Manage kitchen details and margin percentage
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#f59e0b',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          + Add Vendor
        </button>
      </div>

      {/* Add New Vendor Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '2px solid #f59e0b'
        }}>
          <h3 style={{ margin: 0, marginBottom: 16, color: '#1f2937' }}>Add New Vendor</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <InputField
              label="Vendor Name"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              placeholder="Kitchen name"
            />
            <InputField
              label="Owner Name"
              value={newVendor.owner_name}
              onChange={(e) => setNewVendor({ ...newVendor, owner_name: e.target.value })}
              placeholder="Owner's name"
            />
            <InputField
              label="Location"
              value={newVendor.location}
              onChange={(e) => setNewVendor({ ...newVendor, location: e.target.value })}
              placeholder="Address"
            />
            <InputField
              label="Phone"
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              placeholder="Phone number"
            />
            <InputField
              label="Email"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              placeholder="Email address"
              type="email"
            />
            <InputField
              label="Margin %"
              value={newVendor.margin_percent}
              onChange={(e) => setNewVendor({ ...newVendor, margin_percent: parseFloat(e.target.value) || 0 })}
              type="number"
              min="0"
              max="100"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={handleAddVendor}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Save Vendor
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#6b7280',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vendors List */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle}>Vendor Name</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Margin %</th>
              <th style={{ ...thStyle, width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280', padding: 40 }}>
                  No vendors added yet
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {editingId === vendor.id ? (
                    <>
                      <td style={tdStyle}>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={editForm.owner_name}
                          onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          style={inputStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="number"
                          value={editForm.margin_percent}
                          onChange={(e) => setEditForm({ ...editForm, margin_percent: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputStyle, width: 70, textAlign: 'center' }}
                          min="0"
                          max="100"
                        />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleSaveEdit} style={saveBtnStyle}>Save</button>
                          <button onClick={handleCancelEdit} style={cancelBtnStyle}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#1f2937' }}>{vendor.name}</span>
                      </td>
                      <td style={tdStyle}>{vendor.owner_name}</td>
                      <td style={tdStyle}>{vendor.location}</td>
                      <td style={tdStyle}>{vendor.phone}</td>
                      <td style={tdStyle}>{vendor.email}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          background: '#fef3c7',
                          color: '#d97706',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {vendor.margin_percent}%
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => handleEdit(vendor)} style={editBtnStyle}>Edit</button>
                          <button onClick={() => setResetPasswordModal(vendor)} style={resetBtnStyle}>Reset Pwd</button>
                          <button onClick={() => handleDelete(vendor.id)} style={deleteBtnStyle}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', min, max }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          fontSize: 14,
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 };
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const inputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', boxSizing: 'border-box' };
const editBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#dbeafe', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const deleteBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const resetBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const saveBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#059669', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const cancelBtnStyle = { padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
