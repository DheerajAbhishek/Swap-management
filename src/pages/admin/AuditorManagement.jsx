import { useState, useEffect } from 'react';
import { auditService } from '../../services/auditService';

/**
 * AuditorManagement - Admin page to manage auditors
 * Similar to FranchiseManagement
 */
export default function AuditorManagement() {
    const [auditors, setAuditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showCredentials, setShowCredentials] = useState(null);
    const [resetPasswordModal, setResetPasswordModal] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [newAuditor, setNewAuditor] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        zone: ''
    });

    useEffect(() => {
        loadAuditors();
    }, []);

    const loadAuditors = async () => {
        try {
            setLoading(true);
            const data = await auditService.getAuditors();
            setAuditors(data);
        } catch (err) {
            console.error('Failed to load auditors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (auditor) => {
        setEditingId(auditor.id);
        setEditForm({ ...auditor });
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await auditService.updateAuditor(editingId, editForm);
            await loadAuditors();
            setEditingId(null);
            setEditForm({});
        } catch (err) {
            alert('Failed to update auditor: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleAddAuditor = async () => {
        if (!newAuditor.name) {
            alert('Please fill in name');
            return;
        }
        setSaving(true);
        try {
            const result = await auditService.createAuditor(newAuditor);
            if (result.credentials) {
                setShowCredentials({
                    name: result.name,
                    username: result.credentials.username,
                    password: result.credentials.password
                });
            }
            await loadAuditors();
            setNewAuditor({
                name: '',
                email: '',
                phone: '',
                address: '',
                zone: ''
            });
            setShowAddForm(false);
        } catch (err) {
            alert('Failed to add auditor: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this auditor?')) {
            try {
                await auditService.deleteAuditor(id);
                await loadAuditors();
            } catch (err) {
                alert('Failed to delete auditor: ' + err.message);
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
            await auditService.resetAuditorPassword(resetPasswordModal.id, newPassword);
            setShowCredentials({
                name: resetPasswordModal.name,
                username: resetPasswordModal.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@auditor.swap',
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

    const getStatusBadge = (status) => {
        const colors = {
            ACTIVE: { bg: '#d1fae5', color: '#065f46' },
            INACTIVE: { bg: '#fee2e2', color: '#991b1b' }
        };
        const style = colors[status] || colors.ACTIVE;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading auditors...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                        Audit Management
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 8 }}>
                        Manage auditors who conduct restaurant inspections
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        padding: '12px 24px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    + Add Auditor
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>
                        Add New Auditor
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 16
                    }}>
                        <div>
                            <label style={labelStyle}>Name *</label>
                            <input
                                type="text"
                                value={newAuditor.name}
                                onChange={e => setNewAuditor({ ...newAuditor, name: e.target.value })}
                                style={inputStyle}
                                placeholder="Auditor name"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input
                                type="email"
                                value={newAuditor.email}
                                onChange={e => setNewAuditor({ ...newAuditor, email: e.target.value })}
                                style={inputStyle}
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Phone</label>
                            <input
                                type="tel"
                                value={newAuditor.phone}
                                onChange={e => setNewAuditor({ ...newAuditor, phone: e.target.value })}
                                style={inputStyle}
                                placeholder="Phone number"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Zone/Area</label>
                            <input
                                type="text"
                                value={newAuditor.zone}
                                onChange={e => setNewAuditor({ ...newAuditor, zone: e.target.value })}
                                style={inputStyle}
                                placeholder="Coverage area"
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Address</label>
                            <input
                                type="text"
                                value={newAuditor.address}
                                onChange={e => setNewAuditor({ ...newAuditor, address: e.target.value })}
                                style={inputStyle}
                                placeholder="Full address"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button
                            onClick={handleAddAuditor}
                            disabled={saving}
                            style={{
                                padding: '10px 24px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            {saving ? 'Adding...' : 'Add Auditor'}
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            style={{
                                padding: '10px 24px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Auditors Table */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {auditors.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        <p style={{ fontSize: 16 }}>No auditors registered yet</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            style={{
                                marginTop: 16,
                                padding: '12px 24px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Add First Auditor
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={thStyle}>Auditor</th>
                                <th style={thStyle}>Contact</th>
                                <th style={thStyle}>Zone</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditors.map(auditor => (
                                <tr key={auditor.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    {editingId === auditor.id ? (
                                        <>
                                            <td style={tdStyle}>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    type="text"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 4 }}
                                                    placeholder="Phone"
                                                />
                                                <input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                    placeholder="Email"
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    type="text"
                                                    value={editForm.zone}
                                                    onChange={e => setEditForm({ ...editForm, zone: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                />
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <select
                                                    value={editForm.status}
                                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                >
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={saving}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        marginRight: 8,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#f3f4f6',
                                                        color: '#374151',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: 500 }}>{auditor.name}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{auditor.id}</div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div>{auditor.phone || '—'}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{auditor.email || '—'}</div>
                                            </td>
                                            <td style={tdStyle}>{auditor.zone || '—'}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {getStatusBadge(auditor.status || 'ACTIVE')}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleEdit(auditor)}
                                                    style={actionBtnStyle}
                                                    title="Edit"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setResetPasswordModal(auditor)}
                                                    style={actionBtnStyle}
                                                    title="Reset Password"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(auditor.id)}
                                                    style={{ ...actionBtnStyle, color: '#ef4444' }}
                                                    title="Delete"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Credentials Modal */}
            {showCredentials && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
                            {showCredentials.isReset ? 'Password Reset' : 'Auditor Created'}
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: 20 }}>
                            {showCredentials.isReset
                                ? 'Password has been reset. Share these credentials with the auditor:'
                                : 'New auditor has been created. Please share these login credentials:'}
                        </p>
                        <div style={{
                            background: '#f9fafb',
                            padding: 16,
                            borderRadius: 8,
                            fontFamily: 'monospace'
                        }}>
                            <p style={{ margin: '0 0 8px' }}>
                                <strong>Name:</strong> {showCredentials.name}
                            </p>
                            <p style={{ margin: '0 0 8px' }}>
                                <strong>Username:</strong> {showCredentials.username}
                            </p>
                            <p style={{ margin: 0 }}>
                                <strong>Password:</strong> {showCredentials.password}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCredentials(null)}
                            style={{
                                marginTop: 20,
                                width: '100%',
                                padding: '12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModal && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
                            Reset Password
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: 20 }}>
                            Reset password for: <strong>{resetPasswordModal.name}</strong>
                        </p>
                        <div>
                            <label style={labelStyle}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={inputStyle}
                                placeholder="Enter new password (min 6 chars)"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button
                                onClick={handleResetPassword}
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {saving ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button
                                onClick={() => {
                                    setResetPasswordModal(null);
                                    setNewPassword('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6
};

const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
};

const thStyle = {
    padding: '14px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const tdStyle = {
    padding: '14px 16px'
};

const actionBtnStyle = {
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16
};

const modalOverlay = {
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
};

const modalContent = {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%'
};
