import { useState, useEffect } from 'react';
import { misaAuditService } from '../../services/misaAuditService';

export default function ViewMisaAudits() {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [filter, setFilter] = useState({ status: 'all', auditor: 'all' });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        loadAudits();
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadAudits = async () => {
        try {
            setLoading(true);
            const data = await misaAuditService.getMisaAudits();
            console.log('Admin Misa Audits received:', data);
            console.log('Is array?', Array.isArray(data));
            console.log('Count:', data?.length);
            setAudits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load Misa audits:', err);
            console.error('Error details:', err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const uniqueAuditors = [...new Set(audits.map(a => a.auditor_name))].filter(Boolean);

    const filtered = audits.filter(a => {
        if (filter.status !== 'all' && a.status !== filter.status) return false;
        if (filter.auditor !== 'all' && a.auditor_name !== filter.auditor) return false;

        // Date range filter
        if (dateRange.start || dateRange.end) {
            const auditDate = a.audit_date ? new Date(a.audit_date).toISOString().split('T')[0] : null;
            if (!auditDate) return false;
            if (dateRange.start && auditDate < dateRange.start) return false;
            if (dateRange.end && auditDate > dateRange.end) return false;
        }

        return true;
    });

    const stats = {
        total: filtered.length,
        onTime: filtered.filter(a => a.status === 'ON_TIME').length,
        late: filtered.filter(a => a.status === 'LATE').length,
        items: filtered.reduce((s, a) => s + (a.total_items || 0), 0)
    };

    const statusStyle = (s) => s === 'ON_TIME'
        ? { bg: '#d1fae5', color: '#065f46', label: 'On Time' }
        : s === 'LATE'
            ? { bg: '#fef3c7', color: '#92400e', label: 'Late' }
            : { bg: '#e5e7eb', color: '#374151', label: s };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        const date = new Date(timeStr);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleTimeString();
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading audits...</div>;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={pageTitle}>Misa Audits</h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>View all daily audit submissions across auditors</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                    { n: stats.total, l: 'Total Audits', c: '#3b82f6' },
                    { n: stats.onTime, l: 'On Time', c: '#10b981' },
                    { n: stats.late, l: 'Late', c: '#f59e0b' },
                    { n: stats.items, l: 'Items Audited', c: '#8b5cf6' }
                ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.n}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.l}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ ...card, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} style={selectStyle}>
                        <option value="all">All Status</option>
                        <option value="ON_TIME">On Time</option>
                        <option value="LATE">Late</option>
                    </select>
                    <select value={filter.auditor} onChange={e => setFilter({ ...filter, auditor: e.target.value })} style={selectStyle}>
                        <option value="all">All Auditors</option>
                        {uniqueAuditors.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    {/* Date Range Picker */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            style={{ border: 'none', background: 'transparent', fontSize: 13, padding: '4px 0', color: '#374151' }}
                            placeholder="Start date"
                        />
                        <span style={{ color: '#d1d5db' }}>→</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            style={{ border: 'none', background: 'transparent', fontSize: 13, padding: '4px 0', color: '#374151' }}
                            placeholder="End date"
                        />
                    </div>

                    {(filter.status !== 'all' || filter.auditor !== 'all' || dateRange.start || dateRange.end) && (
                        <button onClick={() => { setFilter({ status: 'all', auditor: 'all' }); setDateRange({ start: '', end: '' }); }} style={clearBtn}>Clear All</button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{ ...card, overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>No audits found</div>
                ) : (
                    <>
                        {/* Desktop */}
                        {!isMobile ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            <th style={thStyle}>Date</th>
                                            <th style={thStyle}>Auditor</th>
                                            <th style={thStyle}>Vendor</th>
                                            <th style={thStyle}>Time</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Items</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(a => {
                                            const s = statusStyle(a.status);
                                            return (
                                                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={tdStyle}>{formatDate(a.audit_date)}</td>
                                                    <td style={{ ...tdStyle, fontWeight: 500 }}>{a.auditor_name || 'N/A'}</td>
                                                    <td style={tdStyle}>{a.vendor_name || 'N/A'}</td>
                                                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: 13 }}>{formatTime(a.submission_time)}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{a.total_items}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <button onClick={() => setSelectedAudit(a)} style={viewBtn}>View</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <>
                                {filtered.map(a => {
                                    const s = statusStyle(a.status);
                                    return (
                                        <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontWeight: 600 }}>{formatDate(a.audit_date)}</span>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                                                {a.auditor_name} &middot; {a.vendor_name || 'N/A'} &middot; {a.total_items} items
                                            </div>
                                            <button onClick={() => setSelectedAudit(a)} style={{ ...viewBtn, width: '100%' }}>View Details</button>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedAudit && (
                <AuditDetailModal
                    audit={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                    statusStyle={statusStyle}
                    formatDate={formatDate}
                    formatTime={formatTime}
                />
            )}
        </div>
    );
}

function AuditDetailModal({ audit, onClose, statusStyle, formatDate, formatTime }) {
    const s = statusStyle(audit.status);
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16
        }}>
            <div style={{ background: 'white', borderRadius: 16, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '16px 16px 0 0'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Misa Audit Details</h2>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                            {audit.auditor_name || 'N/A'} &middot; {audit.vendor_name || 'N/A'} &middot; {formatDate(audit.audit_date)}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: 18
                    }}>&#x2715;</button>
                </div>

                <div style={{ padding: 24 }}>
                    {/* Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
                        <SummaryCard>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{audit.total_items}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Items</div>
                        </SummaryCard>
                        <SummaryCard>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 14, background: s.bg, color: s.color }}>{s.label}</span>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Status</div>
                        </SummaryCard>
                        <SummaryCard>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{formatTime(audit.submission_time)}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Submitted</div>
                        </SummaryCard>
                        {audit.misa_dispatch_time && (
                            <SummaryCard>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{audit.misa_dispatch_time}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Dispatched</div>
                            </SummaryCard>
                        )}
                        {(() => {
                            const complaintCount = (audit.items || []).filter(i => i.has_complaint).length;
                            return complaintCount > 0 ? (
                                <SummaryCard>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{complaintCount}</div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>Complaint{complaintCount > 1 ? 's' : ''}</div>
                                </SummaryCard>
                            ) : null;
                        })()}
                    </div>

                    {audit.notes && (
                        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 12, marginBottom: 20 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Overall Notes</div>
                            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{audit.notes}</div>
                        </div>
                    )}

                    {/* Food as per Daily Menu */}
                    {audit.food_as_per_menu && (
                        <div style={{ padding: 16, background: audit.food_as_per_menu === 'yes' ? '#f0fdf4' : '#fef2f2', borderRadius: 12, marginBottom: 20, border: `1px solid ${audit.food_as_per_menu === 'yes' ? '#bbf7d0' : '#fecaca'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: audit.food_menu_note ? 10 : 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Food as per Daily Menu:</span>
                                <span style={{
                                    padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                                    background: audit.food_as_per_menu === 'yes' ? '#d1fae5' : '#fee2e2',
                                    color: audit.food_as_per_menu === 'yes' ? '#065f46' : '#991b1b'
                                }}>
                                    {audit.food_as_per_menu === 'yes' ? '✓ Yes' : '✗ No'}
                                </span>
                            </div>
                            {audit.food_menu_note && (
                                <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                                    <span style={{ fontWeight: 600, color: '#374151' }}>Note: </span>{audit.food_menu_note}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Items with full-width photos */}
                    <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Items ({audit.items?.length || 0})</h4>
                    {audit.items?.map((item, idx) => (
                        <div key={item.item_id || idx} style={{
                            marginBottom: 16, background: item.has_complaint ? '#fff7f7' : '#f9fafb',
                            borderRadius: 12, overflow: 'hidden',
                            border: item.has_complaint ? '1.5px solid #fecaca' : '1px solid transparent'
                        }}>
                            {/* Photo — full width, no grey space */}
                            {item.photo_url && (
                                <img
                                    src={item.photo_url}
                                    alt={item.item_name}
                                    style={{
                                        width: '100%',
                                        display: 'block',
                                        cursor: 'pointer',
                                        borderRadius: '12px 12px 0 0'
                                    }}
                                    onClick={() => window.open(item.photo_url, '_blank')}
                                />
                            )}
                            <div style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: item.complaint_note ? 8 : 0 }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{idx + 1}. {item.item_name}</span>
                                        {item.category && (
                                            <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#e5e7eb', color: '#6b7280' }}>{item.category}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {item.has_complaint && (
                                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>⚠ Complaint</span>
                                        )}
                                        {item.photo_url && (
                                            <button
                                                onClick={() => window.open(item.photo_url, '_blank')}
                                                style={{ padding: '4px 12px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                                            >View Full</button>
                                        )}
                                    </div>
                                </div>
                                {item.notes && (
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Notes: {item.notes}</div>
                                )}
                                {item.has_complaint && item.complaint_note && (
                                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 6, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #fecaca' }}>
                                        <span style={{ fontWeight: 600 }}>Complaint: </span>{item.complaint_note}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ children }) {
    return <div style={{ padding: 16, background: '#f9fafb', borderRadius: 12, textAlign: 'center' }}>{children}</div>;
}

// --- Styles ---
const pageTitle = { fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 };
const card = { background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thStyle = { padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '14px 16px' };
const selectStyle = {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 13, color: '#374151', background: 'white', outline: 'none', minWidth: 130
};
const viewBtn = {
    padding: '6px 16px', background: '#eff6ff', color: '#3b82f6', border: 'none',
    borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer'
};
const clearBtn = {
    padding: '8px 14px', background: '#f3f4f6', color: '#6b7280', border: 'none',
    borderRadius: 8, fontSize: 13, cursor: 'pointer'
};
