import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { misaAuditService } from '../../services/misaAuditService';

export default function MisaAuditHistory() {
    const navigate = useNavigate();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [filter, setFilter] = useState('all');
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
            console.log('Misa Audits received:', data);
            console.log('Is array?', Array.isArray(data));
            console.log('Count:', data?.length);
            setAudits(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading audits:', error);
            console.error('Error details:', error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const filtered = audits.filter(a => filter === 'all' || a.status === filter);

    const getStatusStyle = (status) => {
        if (status === 'ON_TIME') return { bg: '#d1fae5', color: '#065f46', label: 'On Time' };
        if (status === 'LATE') return { bg: '#fef3c7', color: '#92400e', label: 'Late' };
        return { bg: '#e5e7eb', color: '#374151', label: status };
    };

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

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 16 }}>Loading audits...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Misa Audit History</h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>View past daily audit submissions</p>
            </div>

            {/* Filters + New Audit button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['all', 'ON_TIME', 'LATE'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 16px', borderRadius: 20, border: 'none',
                                background: filter === f ? '#3b82f6' : '#f3f4f6',
                                color: filter === f ? 'white' : '#6b7280',
                                cursor: 'pointer', fontWeight: filter === f ? 600 : 400, fontSize: 13
                            }}
                        >
                            {f === 'all' ? 'All' : f === 'ON_TIME' ? 'On Time' : 'Late'}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => navigate('/auditor/misa-audit')}
                    style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none',
                        background: '#3b82f6', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                    }}
                >
                    + New Audit
                </button>
            </div>

            {/* Table / Cards */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        <p style={{ fontSize: 16 }}>No audits found</p>
                        <button onClick={() => navigate('/auditor/misa-audit')} style={{
                            display: 'inline-block', marginTop: 16, padding: '12px 24px',
                            background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none',
                            fontWeight: 500, cursor: 'pointer'
                        }}>Submit First Audit</button>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        {!isMobile ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            <th style={thStyle}>Date</th>
                                            <th style={thStyle}>Vendor</th>
                                            <th style={thStyle}>Time</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Items</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(audit => {
                                            const s = getStatusStyle(audit.status);
                                            return (
                                                <tr key={audit.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontWeight: 500 }}>{formatDate(audit.audit_date)}</div>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontWeight: 500 }}>{audit.vendor_name || 'N/A'}</div>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontSize: 13, color: '#6b7280' }}>{formatTime(audit.submission_time)}</div>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{audit.total_items}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <button onClick={() => setSelectedAudit(audit)} style={viewBtn}>View Details</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <>
                                {filtered.map(audit => {
                                    const s = getStatusStyle(audit.status);
                                    return (
                                        <div key={audit.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatDate(audit.audit_date)}</div>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                                                <div>{audit.vendor_name || 'N/A'} &middot; {audit.total_items} items</div>
                                                <div>{formatTime(audit.submission_time)}</div>
                                            </div>
                                            <button onClick={() => setSelectedAudit(audit)} style={{ ...viewBtn, width: '100%' }}>View Details</button>
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
                <MisaAuditDetailModal
                    audit={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                    formatDate={formatDate}
                    formatTime={formatTime}
                />
            )}
        </div>
    );
}

// --- Detail Modal (matches AuditHistory style) ---
function MisaAuditDetailModal({ audit, onClose, formatDate, formatTime }) {
    const s = audit.status === 'ON_TIME' ? { bg: '#d1fae5', color: '#065f46', label: 'On Time' } : { bg: '#fef3c7', color: '#92400e', label: 'Late' };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16
        }}>
            <div style={{ background: 'white', borderRadius: 16, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: 'white', zIndex: 1
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Misa Audit Report</h2>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                            {audit.vendor_name || 'N/A'} &middot; {formatDate(audit.audit_date)}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: 18
                    }}>x</button>
                </div>

                <div style={{ padding: 24 }}>
                    {/* Summary row */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 12, marginBottom: 24
                    }}>
                        <div style={summaryCard}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{audit.total_items}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Items</div>
                        </div>
                        <div style={summaryCard}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 14, background: s.bg, color: s.color }}>
                                {s.label}
                            </span>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Status</div>
                        </div>
                        <div style={summaryCard}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{formatTime(audit.submission_time)}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Submitted</div>
                        </div>
                        {audit.misa_dispatch_time && (
                            <div style={summaryCard}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{audit.misa_dispatch_time}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Dispatched</div>
                            </div>
                        )}
                    </div>

                    {/* Overall notes */}
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

                    {/* Items */}
                    <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Items ({audit.items?.length || 0})</h4>
                    {audit.items?.map((item, idx) => (
                        <div key={item.item_id || idx} style={{
                            padding: 16, background: item.has_complaint ? '#fff7f7' : '#f9fafb',
                            borderRadius: 12, marginBottom: 12,
                            border: item.has_complaint ? '1.5px solid #fecaca' : 'none'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{idx + 1}. {item.item_name}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#e5e7eb', color: '#6b7280' }}>{item.category}</span>
                                </div>
                                {item.has_complaint && (
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>⚠ Complaint</span>
                                )}
                            </div>
                            {item.photo_url && (
                                <img
                                    src={item.photo_url}
                                    alt={item.item_name}
                                    style={{
                                        width: '100%', maxHeight: 240, objectFit: 'cover',
                                        borderRadius: 8, cursor: 'pointer', marginBottom: 8
                                    }}
                                    onClick={() => window.open(item.photo_url, '_blank')}
                                />
                            )}
                            {item.notes && (
                                <div style={{ fontSize: 13, color: '#6b7280' }}>Notes: {item.notes}</div>
                            )}
                            {item.has_complaint && item.complaint_note && (
                                <div style={{ fontSize: 13, color: '#991b1b', marginTop: 6, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #fecaca' }}>
                                    <span style={{ fontWeight: 600 }}>Complaint: </span>{item.complaint_note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Styles ---
const thStyle = { padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '14px 16px' };
const viewBtn = {
    padding: '6px 16px', background: '#eff6ff', color: '#3b82f6', border: 'none',
    borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer'
};
const summaryCard = {
    padding: 16, background: '#f9fafb', borderRadius: 12, textAlign: 'center'
};
