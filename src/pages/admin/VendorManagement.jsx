import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/constants';
import { vendorService } from '../../services/vendorService';

/**
 * VendorManagement - Manage kitchen/vendor details and margin
 */
export default function VendorManagement() {
  const navigate = useNavigate();
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
    password: '',
    bank_name: '',
    bank_location: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: ''
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
        password: '',
        bank_name: '',
        bank_location: '',
        account_number: '',
        ifsc_code: '',
        account_holder_name: ''
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
        username: resetPasswordModal.email || resetPasswordModal.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@kitchen.swap',
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
            Manage kitchen details and bank information
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
              placeholder="Email address (used for login)"
              type="email"
            />
            <InputField
              label="Password (Optional)"
              value={newVendor.password}
              onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
              placeholder="Leave blank for auto-generated"
              type="text"
            />
          </div>

          {/* Bank Details Section */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#6b7280', fontWeight: 600 }}>
              🏦 Bank Details (Optional)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <InputField
                label="Account Holder Name"
                value={newVendor.account_holder_name}
                onChange={(e) => setNewVendor({ ...newVendor, account_holder_name: e.target.value })}
                placeholder="Name on account"
              />
              <InputField
                label="Bank Name"
                value={newVendor.bank_name}
                onChange={(e) => setNewVendor({ ...newVendor, bank_name: e.target.value })}
                placeholder="e.g. State Bank of India"
              />
              <InputField
                label="Bank Branch/Location"
                value={newVendor.bank_location}
                onChange={(e) => setNewVendor({ ...newVendor, bank_location: e.target.value })}
                placeholder="Branch location"
              />
              <InputField
                label="Account Number"
                value={newVendor.account_number}
                onChange={(e) => setNewVendor({ ...newVendor, account_number: e.target.value })}
                placeholder="Account number"
              />
              <InputField
                label="IFSC Code"
                value={newVendor.ifsc_code}
                onChange={(e) => setNewVendor({ ...newVendor, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
              />
            </div>
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

      {/* Vendors List - Card Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: 16
      }}>
        {vendors.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            color: '#6b7280',
            gridColumn: '1 / -1'
          }}>
            No vendors added yet
          </div>
        ) : (
          vendors.map((vendor) => (
            editingId === vendor.id ? (
              // Edit Form Card
              <div key={vendor.id} style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '2px solid #3b82f6'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Edit Vendor</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InputField
                    label="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <InputField
                    label="Owner"
                    value={editForm.owner_name}
                    onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                  />
                  <InputField
                    label="Location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                  <InputField
                    label="Phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  <InputField
                    label="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  {/* Bank Details in Edit Form */}
                  <div style={{ gridColumn: '1/-1', marginTop: 8, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>🏦 Bank Details</span>
                  </div>
                  <InputField
                    label="Account Holder"
                    value={editForm.account_holder_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, account_holder_name: e.target.value })}
                  />
                  <InputField
                    label="Bank Name"
                    value={editForm.bank_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                  />
                  <InputField
                    label="Branch"
                    value={editForm.bank_location || ''}
                    onChange={(e) => setEditForm({ ...editForm, bank_location: e.target.value })}
                  />
                  <InputField
                    label="Account No."
                    value={editForm.account_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                  />
                  <InputField
                    label="IFSC Code"
                    value={editForm.ifsc_code || ''}
                    onChange={(e) => setEditForm({ ...editForm, ifsc_code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button onClick={handleSaveEdit} style={saveBtnStyle}>Save</button>
                  <button onClick={handleCancelEdit} style={cancelBtnStyle}>Cancel</button>
                </div>
              </div>
            ) : (
              // Vendor Card - Clickable
              <div
                key={vendor.id}
                onClick={() => navigate(`/admin/vendors/${vendor.id}/items`)}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                      {vendor.name}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
                      {vendor.owner_name}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {vendor.location || 'No location'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {vendor.phone || 'No phone'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {vendor.email || 'No email'}
                  </div>
                </div>

                {/* Items Badge */}
                <div style={{
                  background: '#eff6ff',
                  color: '#3b82f6',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  {vendor.items?.length || 0} Items - Click to Manage
                </div>

                {/* Bank Details Display */}
                {vendor.bank_name && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 600, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </svg>
                      Bank Details
                    </div>
                    <div style={{ color: '#374151', lineHeight: 1.6 }}>
                      <div><strong>Holder:</strong> {vendor.account_holder_name || 'N/A'}</div>
                      <div><strong>Bank:</strong> {vendor.bank_name} {vendor.bank_location ? `(${vendor.bank_location})` : ''}</div>
                      <div><strong>A/C:</strong> {vendor.account_number || 'N/A'}</div>
                      <div><strong>IFSC:</strong> {vendor.ifsc_code || 'N/A'}</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(vendor)} style={editBtnStyle}>Edit</button>
                  <button onClick={() => setResetPasswordModal(vendor)} style={resetBtnStyle}>Reset Pwd</button>
                  <button onClick={() => handleDelete(vendor.id)} style={deleteBtnStyle}>Delete</button>
                </div>
              </div>
            )
          ))
        )}
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

const editBtnStyle = { padding: '6px 14px', borderRadius: 6, border: 'none', background: '#dbeafe', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const deleteBtnStyle = { padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const resetBtnStyle = { padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const saveBtnStyle = { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const cancelBtnStyle = { padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
