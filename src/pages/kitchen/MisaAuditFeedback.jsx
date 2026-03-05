import { useState, useEffect } from 'react';
import { misaAuditService } from '../../services/misaAuditService';

/**
 * MisaAuditFeedback - Read-only view for kitchen manager and kitchen staff
 * Shows today's MISA audit results: dispatch time, food-as-per-menu, and item complaints with photos
 */

function getTokenDebugInfo() {
    try {
        const token = localStorage.getItem('supply_token');
        if (!token) return null;
        const decoded = JSON.parse(atob(token));
        return { vendor_id: decoded.vendor_id || '(not set)', userId: decoded.userId || decoded.id || '(not set)', role: decoded.role };
    } catch { return null; }
}

export default function MisaAuditFeedback() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const tokenInfo = getTokenDebugInfo();

    useEffect(() => {
        loadFeedback(selectedDate);
    }, [selectedDate]);

    const loadFeedback = async (date) => {
        try {
            setLoading(true);
            const data = await misaAuditService.getAuditFeedbackForVendor(date);
            setAudits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load audit feedback:', err);
            setAudits([]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (t) => {
        if (!t) return 'N/A';
        const d = new Date(t);
        return isNaN(d.getTime()) ? t : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 15 }}>Loading feedback...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={pageTitle}>Misa Audit Feedback</h1>
                <p style={{ color: '#6b7280', marginTop: 6 }}>View daily audit results, dispatch time, and item complaints for your kitchen</p>
            </div>

            {/* Date Picker */}
            <div style={{ ...card, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Select Date:</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={today}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#374151', outline: 'none' }}
                />
                {selectedDate !== today && (
                    <button
                        onClick={() => setSelectedDate(today)}
                        style={{ padding: '8px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                    >
                        Today
                    </button>
                )}
            </div>

            {/* No audits */}
            {audits.length === 0 && (
                <div style={{ ...card, padding: 60, textAlign: 'center', color: '#6b7280' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p style={{ fontSize: 15, margin: '0 0 12px' }}>No audit submitted for {formatDate(selectedDate)}</p>
                    {tokenInfo && (
                        <div style={{ fontSize: 12, color: '#9ca3af', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', display: 'inline-block', textAlign: 'left' }}>
                            <strong style={{ color: '#6b7280' }}>Debug info (share with admin if audits are missing):</strong><br />
                            Vendor ID: <code style={{ fontSize: 12 }}>{tokenInfo.vendor_id}</code><br />
                            User ID: <code style={{ fontSize: 12 }}>{tokenInfo.userId}</code>
                        </div>
                    )}
                </div>
            )}

            {/* Audit cards */}
            {audits.map((audit) => {
                const complaints = (audit.items || []).filter(i => i.has_complaint);
                const statusColor = audit.status === 'ON_TIME' ? { bg: '#d1fae5', color: '#065f46', label: 'On Time' } : { bg: '#fef3c7', color: '#92400e', label: 'Late' };

                return (
                    <div key={audit.id} style={{ ...card, marginBottom: 20, overflow: 'hidden' }}>
                        {/* Audit header bar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                                        Audit by {audit.auditor_name || 'N/A'}
                                    </span>
                                    <span style={{ marginLeft: 10, fontSize: 13, color: '#6b7280' }}>
                                        {formatTime(audit.submission_time)}
                                    </span>
                                </div>
                                <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusColor.bg, color: statusColor.color }}>
                                    {statusColor.label}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: 20 }}>
                            {/* Summary row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                                {/* Dispatch time */}
                                <div style={summaryTile}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Dispatch Time</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                                        {audit.misa_dispatch_time || 'N/A'}
                                    </div>
                                </div>

                                {/* Food as per menu */}
                                <div style={{
                                    ...summaryTile,
                                    background: audit.food_as_per_menu === 'yes' ? '#f0fdf4' : audit.food_as_per_menu === 'no' ? '#fef2f2' : '#f9fafb',
                                    border: `1px solid ${audit.food_as_per_menu === 'yes' ? '#bbf7d0' : audit.food_as_per_menu === 'no' ? '#fecaca' : '#e5e7eb'}`
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Food as per Menu</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {audit.food_as_per_menu === 'yes' && (
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>✓ Yes</span>
                                        )}
                                        {audit.food_as_per_menu === 'no' && (
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>✗ No</span>
                                        )}
                                        {!audit.food_as_per_menu && (
                                            <span style={{ fontSize: 14, color: '#9ca3af' }}>N/A</span>
                                        )}
                                    </div>
                                    {audit.food_menu_note && (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>{audit.food_menu_note}</div>
                                    )}
                                </div>

                                {/* Complaint count */}
                                <div style={{
                                    ...summaryTile,
                                    background: complaints.length > 0 ? '#fef2f2' : '#f0fdf4',
                                    border: `1px solid ${complaints.length > 0 ? '#fecaca' : '#bbf7d0'}`
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Complaints</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: complaints.length > 0 ? '#ef4444' : '#10b981' }}>
                                        {complaints.length}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>of {audit.total_items} items</div>
                                </div>
                            </div>

                            {/* Overall auditor notes */}
                            {audit.notes && (
                                <div style={{ padding: 14, background: '#f9fafb', borderRadius: 10, marginBottom: 20, fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                                    <span style={{ fontWeight: 600 }}>Auditor Notes: </span>{audit.notes}
                                </div>
                            )}

                            {/* Complaints section */}
                            {complaints.length === 0 ? (
                                <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
                                    <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>✓</span>
                                    <p style={{ margin: 0, color: '#065f46', fontWeight: 600 }}>No complaints reported for this audit</p>
                                </div>
                            ) : (
                                <div>
                                    <h4 style={{ fontWeight: 700, fontSize: 14, color: '#991b1b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                        Complaints ({complaints.length})
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {complaints.map((item, idx) => (
                                            <div key={item.item_id || idx} style={{ background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
                                                {/* Item photo only (as per requirement) */}
                                                {item.photo_url && (
                                                    <img
                                                        src={item.photo_url}
                                                        alt={item.item_name}
                                                        style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover', cursor: 'pointer', borderRadius: '12px 12px 0 0' }}
                                                        onClick={() => window.open(item.photo_url, '_blank')}
                                                    />
                                                )}
                                                <div style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                        <div>
                                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.item_name}</span>
                                                            {item.category && (
                                                                <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#991b1b' }}>{item.category}</span>
                                                            )}
                                                        </div>
                                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b', whiteSpace: 'nowrap' }}>
                                                            ⚠ Complaint
                                                        </span>
                                                    </div>
                                                    {item.complaint_note && (
                                                        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #fecaca' }}>
                                                            <span style={{ fontWeight: 600, color: '#374151' }}>Complaint Note: </span>
                                                            {item.complaint_note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- Styles ---
const pageTitle = { fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 };
const card = { background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const summaryTile = { padding: 14, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' };
