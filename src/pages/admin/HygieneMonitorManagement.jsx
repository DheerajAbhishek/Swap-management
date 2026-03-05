import { useState, useEffect } from 'react';
import { hygieneMonitorService } from '../../services/hygieneMonitorService';
import { franchiseService } from '../../services/franchiseService';

/**
 * HygieneMonitorManagement - Admin page to manage hygiene monitors
 */
export default function HygieneMonitorManagement() {
  const [monitors, setMonitors] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newMonitor, setNewMonitor] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    franchise_ids: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [monitorData, franchiseData] = await Promise.all([
        hygieneMonitorService.getHygieneMonitors(),
        franchiseService.getFranchises()
      ]);
      setMonitors(monitorData);
      setFranchises(franchiseData);
    } catch (err) {
      console.error('Failed to load data:', err);
      alert('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMonitor = async () => {
    if (!newMonitor.name || !newMonitor.email || !newMonitor.password) {
      alert('Please fill in name, email, and password');
      return;
    }

    if (newMonitor.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(newMonitor.phone)) {
        alert('Invalid phone number. Must be a valid 10-digit number starting with 6-9');
        return;
      }
    }

    setSaving(true);
    try {
      await hygieneMonitorService.createHygieneMonitor(newMonitor);
      await loadData();
      setShowAddForm(false);
      setNewMonitor({
        name: '',
        email: '',
        phone: '',
        password: '',
        franchise_ids: []
      });
      alert('Hygiene monitor created successfully');
    } catch (err) {
      alert('Failed to create hygiene monitor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (monitor) => {
    setEditingId(monitor.id);
    setEditForm({ ...monitor });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await hygieneMonitorService.updateHygieneMonitor(editingId, editForm);
      await loadData();
      setEditingId(null);
      setEditForm({});
      alert('Hygiene monitor updated successfully');
    } catch (err) {
      alert('Failed to update hygiene monitor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hygiene monitor? This will also delete their login credentials.')) {
      return;
    }

    setSaving(true);
    try {
      await hygieneMonitorService.deleteHygieneMonitor(id);
      await loadData();
      alert('Hygiene monitor deleted successfully');
    } catch (err) {
      alert('Failed to delete hygiene monitor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFranchiseAssignment = (franchiseId, isNew = false) => {
    if (isNew) {
      const currentIds = newMonitor.franchise_ids || [];
      if (currentIds.includes(franchiseId)) {
        setNewMonitor({
          ...newMonitor,
          franchise_ids: currentIds.filter(id => id !== franchiseId)
        });
      } else {
        setNewMonitor({
          ...newMonitor,
          franchise_ids: [...currentIds, franchiseId]
        });
      }
    } else {
      const currentIds = editForm.franchise_ids || [];
      if (currentIds.includes(franchiseId)) {
        setEditForm({
          ...editForm,
          franchise_ids: currentIds.filter(id => id !== franchiseId)
        });
      } else {
        setEditForm({
          ...editForm,
          franchise_ids: [...currentIds, franchiseId]
        });
      }
    }
  };

  const getFranchiseName = (franchiseId) => {
    const franchise = franchises.find(f => f.id === franchiseId);
    return franchise?.name || franchiseId;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Hygiene Monitor Management
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            Manage hygiene monitors and their franchise assignments
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#8b5cf6',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Hygiene Monitor'}
        </button>
      </div>

      {/* Add New Monitor Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '2px solid #8b5cf6'
        }}>
          <h3 style={{ margin: 0, marginBottom: 16, color: '#1f2937' }}>Create New Hygiene Monitor</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <InputField
              label="Name *"
              value={newMonitor.name}
              onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
              placeholder="Enter name"
            />
            <InputField
              label="Email *"
              type="email"
              value={newMonitor.email}
              onChange={(e) => setNewMonitor({ ...newMonitor, email: e.target.value })}
              placeholder="Enter email"
            />
            <InputField
              label="Phone"
              type="tel"
              value={newMonitor.phone}
              onChange={(e) => setNewMonitor({ ...newMonitor, phone: e.target.value })}
              placeholder="10-digit number"
            />
            <InputField
              label="Password *"
              type="password"
              value={newMonitor.password}
              onChange={(e) => setNewMonitor({ ...newMonitor, password: e.target.value })}
              placeholder="Enter password"
            />
          </div>

          {/* Franchise Assignment */}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Assign Franchises
            </label>
            <select
              onChange={(e) => {
                if (e.target.value && !(newMonitor.franchise_ids || []).includes(e.target.value)) {
                  setNewMonitor({
                    ...newMonitor,
                    franchise_ids: [...(newMonitor.franchise_ids || []), e.target.value]
                  });
                }
                e.target.value = '';
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                boxSizing: 'border-box',
                marginBottom: 12
              }}
            >
              <option value="">Select franchise to add...</option>
              {franchises
                .filter(f => !(newMonitor.franchise_ids || []).includes(f.id))
                .map(franchise => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
            </select>

            {/* Selected Franchises */}
            {(newMonitor.franchise_ids || []).length > 0 && (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                background: '#f9fafb'
              }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Selected Franchises:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(newMonitor.franchise_ids || []).map(franchiseId => (
                    <div
                      key={franchiseId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: 20,
                        fontSize: 13
                      }}
                    >
                      <span>{getFranchiseName(franchiseId)}</span>
                      <button
                        type="button"
                        onClick={() => toggleFranchiseAssignment(franchiseId, true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1e40af',
                          cursor: 'pointer',
                          fontSize: 18,
                          lineHeight: 1,
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={handleAddMonitor}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 14,
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Creating...' : 'Create Monitor'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewMonitor({
                  name: '',
                  email: '',
                  phone: '',
                  password: '',
                  franchise_ids: []
                });
              }}
              style={{
                padding: '10px 24px',
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
      )}

      {/* Monitors List */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Assigned Franchises</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {monitors.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280', padding: 32 }}>
                  No hygiene monitors found. Create one to get started.
                </td>
              </tr>
            ) : (
              monitors.map((monitor, idx) => (
                <tr key={monitor.id} style={{ borderBottom: idx < monitors.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={tdStyle}>
                    {editingId === monitor.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ fontWeight: 500, color: '#1f2937' }}>{monitor.name}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingId === monitor.id ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ color: '#1f2937' }}>{monitor.email}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingId === monitor.id ? (
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ color: '#1f2937' }}>{monitor.phone || '-'}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingId === monitor.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select
                          onChange={(e) => {
                            if (e.target.value && !(editForm.franchise_ids || []).includes(e.target.value)) {
                              setEditForm({
                                ...editForm,
                                franchise_ids: [...(editForm.franchise_ids || []), e.target.value]
                              });
                            }
                            e.target.value = '';
                          }}
                          style={{
                            ...inputStyle,
                            fontSize: 12
                          }}
                        >
                          <option value="">Add franchise...</option>
                          {franchises
                            .filter(f => !(editForm.franchise_ids || []).includes(f.id))
                            .map(franchise => (
                              <option key={franchise.id} value={franchise.id}>
                                {franchise.name}
                              </option>
                            ))}
                        </select>

                        {/* Selected Franchises */}
                        {(editForm.franchise_ids || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(editForm.franchise_ids || []).map(franchiseId => (
                              <div
                                key={franchiseId}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 8px',
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  borderRadius: 12,
                                  fontSize: 11
                                }}
                              >
                                <span>{getFranchiseName(franchiseId)}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleFranchiseAssignment(franchiseId, false)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#1e40af',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    lineHeight: 1,
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(monitor.franchise_ids || []).length === 0 ? (
                          <span style={{ color: '#9ca3af', fontSize: 13 }}>No franchises assigned</span>
                        ) : (
                          (monitor.franchise_ids || []).map(franchiseId => (
                            <span
                              key={franchiseId}
                              style={{
                                padding: '4px 10px',
                                background: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: 12,
                                fontSize: 12
                              }}
                            >
                              {getFranchiseName(franchiseId)}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingId === monitor.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          style={saveBtnStyle}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={cancelBtnStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleEdit(monitor)}
                          style={editBtnStyle}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(monitor.id)}
                          style={deleteBtnStyle}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }) {
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
const saveBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#059669', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const cancelBtnStyle = { padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
