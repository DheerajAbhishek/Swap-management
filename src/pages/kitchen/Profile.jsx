import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vendorService } from '../../services/vendorService';

export default function KitchenProfile() {
    const { user } = useAuth();
    const vendorId = user?.vendor_id || '';

    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [editMode, setEditMode] = useState(false);

    const [form, setForm] = useState({
        name: '',
        owner_name: '',
        phone: '',
        location: '',
        bank_name: '',
        bank_location: '',
        account_number: '',
        ifsc_code: '',
        account_holder_name: ''
    });

    useEffect(() => {
        if (vendorId) loadProfile();
        else { setError('No vendor ID found'); setLoading(false); }
    }, [vendorId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await vendorService.getProfile(vendorId);
            setVendor(data);
            setForm({
                name: data.name || '',
                owner_name: data.owner_name || '',
                phone: data.phone || '',
                location: data.location || '',
                bank_name: data.bank_name || '',
                bank_location: data.bank_location || '',
                account_number: data.account_number || '',
                ifsc_code: data.ifsc_code || '',
                account_holder_name: data.account_holder_name || ''
            });
        } catch (err) {
            console.error('Failed to load profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            const updated = await vendorService.updateProfile(vendorId, form);
            setVendor(updated);
            setEditMode(false);
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to save profile:', err);
            setError('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        if (vendor) {
            setForm({
                name: vendor.name || '',
                owner_name: vendor.owner_name || '',
                phone: vendor.phone || '',
                location: vendor.location || '',
                bank_name: vendor.bank_name || '',
                bank_location: vendor.bank_location || '',
                account_number: vendor.account_number || '',
                ifsc_code: vendor.ifsc_code || '',
                account_holder_name: vendor.account_holder_name || ''
            });
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loader}>Loading profile...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Kitchen Profile</h1>
                {!editMode ? (
                    <button style={styles.editBtn} onClick={() => setEditMode(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Profile
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.cancelBtn} onClick={handleCancel} disabled={saving}>Cancel</button>
                        <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}
            {success && <div style={styles.successBanner}>{success}</div>}

            {/* Basic Info */}
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    Basic Information
                </h2>
                <div style={styles.grid}>
                    <Field label="Kitchen Name" name="name" value={form.name} onChange={handleChange} edit={editMode} />
                    <Field label="Owner Name" name="owner_name" value={form.owner_name} onChange={handleChange} edit={editMode} />
                    <Field label="Email" value={vendor?.email || ''} edit={false} />
                    <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} edit={editMode} />
                    <Field label="Location" name="location" value={form.location} onChange={handleChange} edit={editMode} />
                    <Field label="Status" value={vendor?.status || ''} edit={false} badge />
                </div>
            </div>

            {/* Bank Details */}
            <div style={styles.card}>
                <h2 style={styles.sectionTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Bank Details
                </h2>
                {!editMode && !form.bank_name && !form.account_number ? (
                    <div style={styles.emptyBank}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        <p style={{ color: '#9ca3af', margin: '8px 0 0' }}>No bank details added yet</p>
                        <button style={{ ...styles.editBtn, marginTop: 12, fontSize: 13 }} onClick={() => setEditMode(true)}>
                            Add Bank Details
                        </button>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        <Field label="Bank Name" name="bank_name" value={form.bank_name} onChange={handleChange} edit={editMode} placeholder="e.g. State Bank of India" />
                        <Field label="Branch / Location" name="bank_location" value={form.bank_location} onChange={handleChange} edit={editMode} placeholder="e.g. Hyderabad Main Branch" />
                        <Field label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} edit={editMode} placeholder="Enter account number" />
                        <Field label="IFSC Code" name="ifsc_code" value={form.ifsc_code} onChange={handleChange} edit={editMode} placeholder="e.g. SBIN0001234" />
                        <Field label="Account Holder Name" name="account_holder_name" value={form.account_holder_name} onChange={handleChange} edit={editMode} placeholder="Name as per bank" />
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, edit, badge, placeholder }) {
    if (badge) {
        return (
            <div style={styles.field}>
                <label style={styles.label}>{label}</label>
                <span style={{
                    ...styles.badge,
                    background: value === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: value === 'ACTIVE' ? '#166534' : '#991b1b'
                }}>{value || '-'}</span>
            </div>
        );
    }

    return (
        <div style={styles.field}>
            <label style={styles.label}>{label}</label>
            {edit ? (
                <input
                    style={styles.input}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={placeholder || ''}
                />
            ) : (
                <span style={styles.value}>{value || '-'}</span>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '16px 20px',
        maxWidth: 800,
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        color: '#1e293b',
        margin: 0
    },
    editBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500
    },
    saveBtn: {
        padding: '8px 20px',
        background: '#22c55e',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600
    },
    cancelBtn: {
        padding: '8px 16px',
        background: '#f1f5f9',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500
    },
    card: {
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: 16,
        fontWeight: 600,
        color: '#1e293b',
        margin: '0 0 16px 0',
        paddingBottom: 12,
        borderBottom: '1px solid #f1f5f9'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
    },
    label: {
        fontSize: 12,
        fontWeight: 500,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    value: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: 500
    },
    input: {
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        color: '#1e293b',
        background: '#f8fafc',
        transition: 'border-color 0.2s'
    },
    badge: {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        width: 'fit-content'
    },
    emptyBank: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        textAlign: 'center'
    },
    errorBanner: {
        background: '#fef2f2',
        color: '#dc2626',
        padding: '10px 16px',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 14,
        border: '1px solid #fecaca'
    },
    successBanner: {
        background: '#f0fdf4',
        color: '#16a34a',
        padding: '10px 16px',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 14,
        border: '1px solid #bbf7d0'
    },
    loader: {
        textAlign: 'center',
        padding: 40,
        color: '#6b7280',
        fontSize: 16
    }
};
