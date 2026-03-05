import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { misaAuditService } from '../../services/misaAuditService';
import { vendorService } from '../../services/vendorService';
import CameraCapture from '../../components/CameraCapture';

export default function MisaAudit() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [auditItems, setAuditItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [foodAsPerMenu, setFoodAsPerMenu] = useState(null); // null | 'yes' | 'no'
    const [foodMenuNote, setFoodMenuNote] = useState('');
    const [misaDispatchTime, setMisaDispatchTime] = useState('');
    const [existingAudit, setExistingAudit] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeStatus, setTimeStatus] = useState('');

    useEffect(() => {
        loadVendors();
        checkExistingAudit();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { updateTimeStatus(); }, [currentTime]);

    useEffect(() => {
        if (selectedVendor) loadVendorItems(selectedVendor);
        else setAuditItems([]);
    }, [selectedVendor]);

    const loadVendors = async () => {
        try {
            setLoading(true);
            const data = await vendorService.getVendors();
            setVendors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading vendors:', error);
            setVendors([]);
        } finally {
            setLoading(false);
        }
    };

    const loadVendorItems = async (vendorId) => {
        try {
            setLoading(true);
            const data = await vendorService.getVendorItemsForFranchise(vendorId);
            const items = Array.isArray(data) ? data : [];
            setAuditItems(items.map(item => ({
                item_id: item.item_id || item.id,
                item_name: item.item_name || item.name,
                category: item.category || '',
                photo: null,
                notes: '',
                has_complaint: false,
                complaint_note: ''
            })));
        } catch (error) {
            console.error('Error loading vendor items:', error);
            setAuditItems([]);
        } finally {
            setLoading(false);
        }
    };

    const checkExistingAudit = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await misaAuditService.checkAuditExists(today);
            if (result.exists) setExistingAudit(result.audit);
        } catch (error) {
            console.error('Error checking existing audit:', error);
        }
    };

    const updateTimeStatus = () => {
        const m = currentTime.getHours() * 60 + currentTime.getMinutes();
        setTimeStatus(m < 510 ? 'EARLY' : m <= 540 ? 'ON_TIME' : 'LATE');
    };

    const handlePhotoChange = (itemId, photo) => {
        setAuditItems(prev => prev.map(i => i.item_id === itemId ? { ...i, photo } : i));
    };

    const handleNotesChange = (itemId, val) => {
        setAuditItems(prev => prev.map(i => i.item_id === itemId ? { ...i, notes: val } : i));
    };

    const handleComplaintToggle = (itemId) => {
        setAuditItems(prev => prev.map(i => i.item_id === itemId
            ? { ...i, has_complaint: !i.has_complaint, complaint_note: !i.has_complaint ? i.complaint_note : '' }
            : i));
    };

    const handleComplaintNoteChange = (itemId, val) => {
        setAuditItems(prev => prev.map(i => i.item_id === itemId ? { ...i, complaint_note: val } : i));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVendor) return alert('Please select a vendor/kitchen to audit');
        if (timeStatus === 'EARLY') return alert('Misa Audit can only be submitted after 8:30 AM');
        const missing = auditItems.filter(i => !i.photo).length;
        if (missing > 0) return alert(`Missing photos for ${missing} items`);
        if (!foodAsPerMenu) return alert('Please answer: Is the food as per daily menu?');
        if (foodAsPerMenu === 'no' && !foodMenuNote.trim()) return alert('Please provide a note since food is not as per daily menu');
        if (!misaDispatchTime) return alert('Please enter the MISA dispatch time');

        const vendorData = vendors.find(v => v.id === selectedVendor);
        const vendorName = vendorData?.name || 'Unknown';
        if (!confirm(`Submit Misa Audit for ${vendorName}?`)) return;

        try {
            setSubmitting(true);

            // Step 1: Get presigned S3 upload URLs
            const uploadUrls = await misaAuditService.getUploadUrls(
                auditItems.map(i => ({ item_id: i.item_id }))
            );

            // Step 2: Upload each photo directly to S3
            for (const urlInfo of uploadUrls) {
                const item = auditItems.find(i => i.item_id === urlInfo.item_id);
                if (item?.photo) {
                    await misaAuditService.uploadPhotoToS3(urlInfo.upload_url, item.photo);
                }
            }

            // Step 3: Submit audit with S3 URLs (not base64)
            const itemsWithUrls = auditItems.map(item => {
                const urlInfo = uploadUrls.find(u => u.item_id === item.item_id);
                return {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    category: item.category,
                    photo_url: urlInfo?.photo_url || '',
                    notes: item.notes,
                    has_complaint: item.has_complaint || false,
                    complaint_note: item.complaint_note || ''
                };
            });

            const result = await misaAuditService.submitMisaAudit({
                audit_date: new Date().toISOString().split('T')[0],
                vendor_id: selectedVendor,
                vendor_name: vendorName,
                items: itemsWithUrls,
                notes,
                food_as_per_menu: foodAsPerMenu,
                food_menu_note: foodMenuNote,
                misa_dispatch_time: misaDispatchTime
            });
            alert(`Submitted! Status: ${result.status === 'ON_TIME' ? 'On Time' : 'Late'}`);
            navigate('/auditor/misa-history');
        } catch (error) {
            alert(error.response?.data?.message || error.message || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const time = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const captured = auditItems.filter(i => i.photo).length;

    // --- Already submitted ---
    if (existingAudit) {
        return (
            <div>
                <div style={{ marginBottom: 24 }}>
                    <h1 style={pageTitle}>Misa Audit</h1>
                    <p style={pageSubtitle}>Already submitted for today</p>
                </div>
                <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>Audit Submitted</h3>
                    <p style={{ color: '#6b7280', margin: '0 0 4px', fontSize: 14 }}>
                        {new Date(existingAudit.submission_time).toLocaleTimeString()} &middot;{' '}
                        <span style={{ fontWeight: 600, color: existingAudit.status === 'ON_TIME' ? '#10b981' : '#f59e0b' }}>
                            {existingAudit.status === 'ON_TIME' ? 'On Time' : 'Late'}
                        </span>
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 24px' }}>{existingAudit.total_items} items audited</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/auditor/dashboard')} style={btnGhost}>Dashboard</button>
                        <button onClick={() => navigate('/auditor/misa-history')} style={btnPrimary}>View History</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={pageTitle}>Misa Audit</h1>
                <p style={pageSubtitle}>Select vendor and capture photos for each item</p>
            </div>

            {/* Time Status Pill */}
            <div style={{
                padding: '12px 18px',
                borderRadius: 12,
                marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10,
                background: timeStatus === 'EARLY' ? '#fef3c7' : timeStatus === 'ON_TIME' ? '#d1fae5' : '#fee2e2',
                color: timeStatus === 'EARLY' ? '#92400e' : timeStatus === 'ON_TIME' ? '#065f46' : '#991b1b'
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {timeStatus === 'EARLY' ? 'Too Early' : timeStatus === 'ON_TIME' ? 'On Time Window' : 'Late'} &middot; {time}
                </span>
            </div>

            {/* Vendor Selection */}
            <div style={{ ...card, padding: 20, marginBottom: 20 }}>
                <label style={labelStyle}>Select Vendor / Kitchen</label>
                <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    style={selectStyle}
                >
                    <option value="">-- Choose a vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>

            {/* Loading state */}
            {loading && (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 15 }}>Loading items...</div>
            )}

            {/* Audit Items */}
            {!loading && selectedVendor && auditItems.length > 0 && (
                <form onSubmit={handleSubmit}>
                    {/* Progress */}
                    <div style={{ ...card, padding: 20, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Progress</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: captured === auditItems.length ? '#10b981' : '#6b7280' }}>
                                {captured}/{auditItems.length}
                            </span>
                        </div>
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${(captured / auditItems.length) * 100}%`,
                                background: captured === auditItems.length ? '#10b981' : '#3b82f6',
                                borderRadius: 3,
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>

                    {/* Items list */}
                    <div style={{ ...card, overflow: 'hidden' }}>
                        {auditItems.map((item, idx) => (
                            <div key={item.item_id} style={{
                                padding: '16px 20px',
                                borderBottom: idx < auditItems.length - 1 ? '1px solid #f3f4f6' : 'none'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                                            {idx + 1}. {item.item_name}
                                        </span>
                                        <span style={categoryPill}>{item.category}</span>
                                    </div>
                                    {item.photo ? (
                                        <span style={doneBadge}>Done</span>
                                    ) : (
                                        <span style={pendingBadge}>Pending</span>
                                    )}
                                </div>

                                <CameraCapture
                                    photo={item.photo}
                                    onChange={(photo) => handlePhotoChange(item.item_id, photo)}
                                    label="Capture Photo"
                                    required={true}
                                />

                                <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => handleNotesChange(item.item_id, e.target.value)}
                                    placeholder="Notes (optional)"
                                    style={inputStyle}
                                />

                                {/* Complaint button */}
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => handleComplaintToggle(item.item_id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            border: '1.5px solid',
                                            borderColor: item.has_complaint ? '#ef4444' : '#e5e7eb',
                                            background: item.has_complaint ? '#fee2e2' : 'white',
                                            color: item.has_complaint ? '#991b1b' : '#6b7280',
                                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                        {item.has_complaint ? 'Complaint Added' : 'Report Complaint'}
                                    </button>
                                    {item.has_complaint && (
                                        <textarea
                                            value={item.complaint_note}
                                            onChange={(e) => handleComplaintNoteChange(item.item_id, e.target.value)}
                                            placeholder="Describe the complaint (e.g. food quality not good, quantity less...)" 
                                            rows={3}
                                            style={{
                                                ...inputStyle, marginTop: 8, resize: 'vertical',
                                                borderColor: '#fca5a5', background: '#fff7f7'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overall Notes */}
                    <div style={{ ...card, padding: 20, marginTop: 20 }}>
                        <label style={labelStyle}>Overall Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="General observations..."
                            rows={3}
                            style={{ ...inputStyle, marginTop: 0, resize: 'vertical' }}
                        />
                    </div>

                    {/* Food as per Daily Menu */}
                    <div style={{ ...card, padding: 20, marginTop: 20 }}>
                        <label style={labelStyle}>Is the food as per daily menu? <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ display: 'flex', gap: 10, marginBottom: foodAsPerMenu ? 14 : 0 }}>
                            <button
                                type="button"
                                onClick={() => setFoodAsPerMenu('yes')}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
                                    borderColor: foodAsPerMenu === 'yes' ? '#10b981' : '#e5e7eb',
                                    background: foodAsPerMenu === 'yes' ? '#d1fae5' : 'white',
                                    color: foodAsPerMenu === 'yes' ? '#065f46' : '#374151',
                                    fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                ✓ Yes
                            </button>
                            <button
                                type="button"
                                onClick={() => setFoodAsPerMenu('no')}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
                                    borderColor: foodAsPerMenu === 'no' ? '#ef4444' : '#e5e7eb',
                                    background: foodAsPerMenu === 'no' ? '#fee2e2' : 'white',
                                    color: foodAsPerMenu === 'no' ? '#991b1b' : '#374151',
                                    fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                ✗ No
                            </button>
                        </div>
                        {foodAsPerMenu && (
                            <div>
                                <label style={{ ...labelStyle, marginTop: 12, color: foodAsPerMenu === 'no' ? '#ef4444' : '#374151' }}>
                                    {foodAsPerMenu === 'no' ? 'Reason (required)' : 'Note (optional)'}
                                    {foodAsPerMenu === 'no' && <span style={{ color: '#ef4444' }}> *</span>}
                                </label>
                                <textarea
                                    value={foodMenuNote}
                                    onChange={(e) => setFoodMenuNote(e.target.value)}
                                    placeholder={foodAsPerMenu === 'no' ? 'Explain why the food is not as per daily menu...' : 'Add any notes about the food...'}
                                    rows={3}
                                    required={foodAsPerMenu === 'no'}
                                    style={{
                                        ...inputStyle, marginTop: 0, resize: 'vertical',
                                        borderColor: foodAsPerMenu === 'no' && !foodMenuNote.trim() ? '#fca5a5' : '#e5e7eb'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* MISA Dispatch Time */}
                    <div style={{ ...card, padding: 20, marginTop: 20 }}>
                        <label style={labelStyle}>MISA Dispatch Time <span style={{ color: '#ef4444' }}>*</span></label>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Enter the time at which the MISA was dispatched</p>
                        <input
                            type="time"
                            value={misaDispatchTime}
                            onChange={(e) => setMisaDispatchTime(e.target.value)}
                            required
                            style={{ ...inputStyle, marginTop: 0, width: 'auto', minWidth: 160 }}
                        />
                    </div>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => navigate('/auditor/dashboard')} disabled={submitting} style={btnGhost}>Cancel</button>
                        <button type="submit" disabled={submitting || timeStatus === 'EARLY'} style={{
                            ...btnPrimary,
                            opacity: (submitting || timeStatus === 'EARLY') ? 0.5 : 1,
                            cursor: (submitting || timeStatus === 'EARLY') ? 'not-allowed' : 'pointer'
                        }}>
                            {submitting ? 'Submitting...' : 'Submit Misa Audit'}
                        </button>
                    </div>
                </form>
            )}

            {/* Empty state */}
            {!loading && selectedVendor && auditItems.length === 0 && (
                <div style={{ ...card, padding: 40, textAlign: 'center', color: '#6b7280' }}>
                    No items found for this vendor. Contact admin to add items.
                </div>
            )}
        </div>
    );
}

// --- Shared Styles ---
const pageTitle = { fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 };
const pageSubtitle = { color: '#6b7280', marginTop: 8 };
const card = { background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 8 };
const selectStyle = {
    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 10,
    fontSize: 15, color: '#111827', background: 'white', outline: 'none', appearance: 'auto'
};
const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#374151', outline: 'none', marginTop: 10
};
const categoryPill = {
    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: '#f3f4f6', color: '#6b7280'
};
const doneBadge = {
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#d1fae5', color: '#065f46'
};
const pendingBadge = {
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#fef3c7', color: '#92400e'
};
const btnPrimary = {
    padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 160
};
const btnGhost = {
    padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer'
};
