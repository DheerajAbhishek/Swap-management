import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hygieneMonitorService } from '../../services/hygieneMonitorService';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function HygieneMonitorStaffAttendanceManagement() {
    const navigate = useNavigate();
    const [staff, setStaff] = useState([]);
    const [franchises, setFranchises] = useState([]);
    const [selectedFranchise, setSelectedFranchise] = useState('all');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('score');
    const [statsModal, setStatsModal] = useState(null);

    useEffect(() => {
        loadFranchises();
        loadStaff();
    }, []);

    const loadFranchises = async () => {
        try {
            const data = await hygieneMonitorService.getAssignedFranchises();
            setFranchises(data);
        } catch (error) {
            console.error('Error loading franchises:', error);
        }
    };

    const loadStaff = async () => {
        try {
            setLoading(true);
            const data = await hygieneMonitorService.getStaff();
            // Only keep FRANCHISE_STAFF
            const franchiseStaff = data.filter(s => s.role === 'FRANCHISE_STAFF');
            setStaff(franchiseStaff);
        } catch (error) {
            console.error('Error loading staff:', error);
            alert(error.response?.data?.error || 'Failed to load staff');
        } finally {
            setLoading(false);
        }
    };

    const loadStaffStats = async (staffId) => {
        try {
            const data = await hygieneMonitorService.getStaffAttendanceStats(staffId);
            setStatsModal(data);
        } catch (error) {
            console.error('Error loading staff stats:', error);
            alert(error.response?.data?.error || 'Failed to load attendance stats');
        }
    };

    // Filter and sort
    const filtered = staff.filter(s => {
        if (selectedFranchise !== 'all' && (s.franchise_id || s.parent_id) !== selectedFranchise) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'score') {
            return (b.score || 100) - (a.score || 100);
        } else if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });

    const getScoreColor = (score) => {
        const s = score || 100;
        if (s >= 90) return '#10b981';
        if (s >= 70) return '#f59e0b';
        return '#ef4444';
    };

    const getScoreLabel = (score) => {
        const s = score || 100;
        if (s >= 90) return 'Excellent';
        if (s >= 70) return 'Good';
        return 'Needs Improvement';
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading staff...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                        Staff Attendance Monitoring
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 8 }}>
                        View attendance statistics and hygiene scores for franchise staff
                    </p>
                </div>
                <button
                    onClick={() => navigate('/hygiene-monitor/staff-performance')}
                    style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                    📊 Staff Performance
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Total Staff</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>{filtered.length}</div>
                </div>
                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Excellent (≥90)</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>
                        {filtered.filter(s => (s.score || 100) >= 90).length}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Good (70-89)</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                        {filtered.filter(s => (s.score || 100) >= 70 && (s.score || 100) < 90).length}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Needs Improvement</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>
                        {filtered.filter(s => (s.score || 100) < 70).length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>
                        Franchise
                    </label>
                    <select
                        value={selectedFranchise}
                        onChange={(e) => setSelectedFranchise(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 14
                        }}
                    >
                        <option value="all">All Franchises</option>
                        {franchises.sort((a, b) => a.name.localeCompare(b.name)).map(franchise => (
                            <option key={franchise.id} value={franchise.id}>{franchise.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>
                        Sort By
                    </label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 14
                        }}
                    >
                        <option value="score">Score (Low to High)</option>
                        <option value="name">Name (A-Z)</option>
                    </select>
                </div>
            </div>

            {/* Staff List */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {sorted.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        No staff found
                    </div>
                ) : (
                    <div>
                        {sorted.map((staffMember) => {
                            const scoreColor = getScoreColor(staffMember.score);
                            const scoreLabel = getScoreLabel(staffMember.score);

                            return (
                                <div
                                    key={staffMember.id}
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: '1px solid #f3f4f6',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 16
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                                            {staffMember.name}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                                            {staffMember.employee_id} · {staffMember.parent_name || 'No Franchise'} ·
                                            Joined: {staffMember.joining_date || staffMember.created_at?.split('T')[0] || 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        flexShrink: 0
                                    }}>
                                        {/* Score Badge */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                padding: '4px 12px',
                                                borderRadius: 20,
                                                fontSize: 14,
                                                fontWeight: 700,
                                                background: scoreColor,
                                                color: 'white',
                                                marginBottom: 4
                                            }}>
                                                {staffMember.score || 100}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                {scoreLabel}
                                            </div>
                                        </div>

                                        {/* View Stats Button */}
                                        <button
                                            onClick={() => loadStaffStats(staffMember.id)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stats Modal */}
            {statsModal && (
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
                    zIndex: 1000,
                    padding: 16
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        maxWidth: 900,
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            background: 'white',
                            zIndex: 1
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                                    {statsModal?.staff?.name || 'N/A'}
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                                    {statsModal?.staff?.employee_id || 'N/A'} · Attendance Statistics & Hygiene Photos
                                </p>
                            </div>
                            <button
                                onClick={() => setStatsModal(null)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#f3f4f6',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: 18
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Stats Content */}
                        <div style={{ padding: 24 }}>
                            {/* Score Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                borderRadius: 16,
                                padding: 24,
                                color: 'white',
                                marginBottom: 24,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                                    Current Hygiene & Attendance Score
                                </div>
                                <div style={{ fontSize: 48, fontWeight: 700 }}>
                                    {statsModal?.staff?.current_score ?? 100}
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
                                    {getScoreLabel(statsModal?.staff?.current_score ?? 100)}
                                </div>
                            </div>

                            {/* Check-in Photos Section */}
                            {statsModal?.recent_attendance && statsModal.recent_attendance.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
                                        Recent Check-in Photos
                                    </h3>
                                    <div style={{
                                        background: '#f9fafb',
                                        borderRadius: 12,
                                        padding: 16,
                                        maxHeight: 400,
                                        overflowY: 'auto'
                                    }}>
                                        {statsModal.recent_attendance.slice(0, 5).map((record, index) => {
                                            const hasPhotos = record.selfie_photo || record.shoes_photo || record.mesa_photo || record.standing_area_photo;
                                            if (!hasPhotos) return null;

                                            return (
                                                <div key={index} style={{
                                                    background: 'white',
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 12,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                }}>
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        color: '#111827',
                                                        marginBottom: 12,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <span>{record.date || 'N/A'}</span>
                                                        <span style={{
                                                            fontSize: 12,
                                                            padding: '2px 8px',
                                                            background: record.status === 'ON_TIME' ? '#d1fae5' : '#fed7aa',
                                                            color: record.status === 'ON_TIME' ? '#065f46' : '#92400e',
                                                            borderRadius: 4
                                                        }}>
                                                            {record.status || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                                        gap: 12
                                                    }}>
                                                        {record.selfie_photo && (
                                                            <PhotoCard
                                                                label="Selfie"
                                                                url={record.selfie_photo}
                                                            />
                                                        )}
                                                        {record.shoes_photo && (
                                                            <PhotoCard
                                                                label="Shoes"
                                                                url={record.shoes_photo}
                                                            />
                                                        )}
                                                        {record.mesa_photo && (
                                                            <PhotoCard
                                                                label="Mesa"
                                                                url={record.mesa_photo}
                                                            />
                                                        )}
                                                        {record.standing_area_photo && (
                                                            <PhotoCard
                                                                label="Standing Area"
                                                                url={record.standing_area_photo}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Statistics Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 16,
                                marginBottom: 24
                            }}>
                                <StatCard
                                    label="Days Since Joining"
                                    value={statsModal?.statistics?.total_days_since_joining ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                                />
                                <StatCard
                                    label="Days Worked"
                                    value={statsModal?.statistics?.total_days_worked ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
                                />
                                <StatCard
                                    label="Attendance Rate"
                                    value={`${statsModal?.statistics?.attendance_rate ?? '0.00'}%`}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
                                />
                                <StatCard
                                    label="Total Hours"
                                    value={`${statsModal?.statistics?.total_hours_worked ?? 0}h`}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                                />
                                <StatCard
                                    label="On Time"
                                    value={statsModal?.statistics?.total_days_on_time ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                                    color="#10b981"
                                />
                                <StatCard
                                    label="Late Check-ins"
                                    value={statsModal?.statistics?.total_days_late ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                                    color="#f59e0b"
                                />
                                <StatCard
                                    label="Missed Check-outs"
                                    value={statsModal?.statistics?.total_missed_checkouts ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                                    color="#ef4444"
                                />
                                <StatCard
                                    label="Early Check-outs"
                                    value={statsModal?.statistics?.total_early_checkouts ?? 0}
                                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
                                    color="#f59e0b"
                                />
                            </div>

                            {/* Info */}
                            <div style={{
                                background: '#f3f4f6',
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 13,
                                color: '#6b7280',
                                marginBottom: 24
                            }}>
                                <strong>Joining Date:</strong> {statsModal?.staff?.joining_date || 'N/A'}
                                <br />
                                <strong>Score Last Reset:</strong> {statsModal?.staff?.score_last_reset || 'N/A'}
                                <br />
                                <strong>Note:</strong> Scores reset to 100 at the beginning of each month.
                                Points are deducted for late check-ins (-5), missed check-outs (-10), and early check-outs (-5).
                            </div>

                            {/* Calendar View */}
                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
                                    Attendance Calendar
                                </h3>
                                <AttendanceCalendar
                                    attendanceRecords={statsModal?.recent_attendance || []}
                                    joiningDate={statsModal?.staff?.joining_date || new Date().toISOString().split('T')[0]}
                                    currentMonth={0}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for stat cards
function StatCard({ label, value, icon, color = '#111827' }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                color: color
            }}>
                {icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>
                {value}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
                {label}
            </div>
        </div>
    );
}

// Helper component for photo cards
function PhotoCard({ label, url }) {
    const [showFullSize, setShowFullSize] = useState(false);

    return (
        <>
            <div
                style={{
                    cursor: 'pointer'
                }}
                onClick={() => setShowFullSize(true)}
            >
                <div style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginBottom: 4,
                    fontWeight: 600
                }}>
                    {label}
                </div>
                <img
                    src={url}
                    alt={label}
                    style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb'
                    }}
                />
            </div>

            {/* Full Size Modal */}
            {showFullSize && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: 16
                    }}
                    onClick={() => setShowFullSize(false)}
                >
                    <div style={{ maxWidth: '90%', maxHeight: '90%' }}>
                        <div style={{
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 12,
                            textAlign: 'center'
                        }}>
                            {label}
                        </div>
                        <img
                            src={url}
                            alt={label}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                borderRadius: 12
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
