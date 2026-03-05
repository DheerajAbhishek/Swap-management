import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import AttendanceCalendar from '../../components/AttendanceCalendar';

/**
 * Admin Staff Attendance Management
 * View all staff with attendance statistics and edit scores
 */
export default function StaffAttendanceManagement() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [statsModal, setStatsModal] = useState(null);
    const [editScoreModal, setEditScoreModal] = useState(null);
    const [newScore, setNewScore] = useState(100);
    const [scoreReason, setScoreReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState('all'); // all, FRANCHISE_STAFF, KITCHEN_STAFF
    const [franchiseFilter, setFranchiseFilter] = useState('all'); // franchise filter
    const [sortBy, setSortBy] = useState('score'); // score, attendance, name

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        try {
            setLoading(true);
            const data = await staffService.getAllStaff();
            // Filter only staff roles (exclude managers)
            const staffOnly = (Array.isArray(data) ? data : []).filter(s =>
                s.role === 'FRANCHISE_STAFF' || s.role === 'KITCHEN_STAFF'
            );
            setStaff(staffOnly);
        } catch (error) {
            console.error('Error loading staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDynamicScore = (statistics) => {
        // Calculate score based on attendance (start at 100, deduct penalties)
        // Penalties: Late -5, Missed Checkout -10, Early Checkout -5, Absent -10

        const stats = statistics || {};
        const daysSinceJoining = stats.total_days_since_joining || 0;
        const daysWorked = stats.total_days_worked || 0;
        const lateCheckins = stats.total_days_late || 0;
        const missedCheckouts = stats.total_missed_checkouts || 0;
        const earlyCheckouts = stats.total_early_checkouts || 0;

        // Calculate absent days (exclude weekends - roughly 2/7 of total days)
        const expectedWorkDays = Math.floor(daysSinceJoining * (5 / 7)); // Approximate weekdays
        const absentDays = Math.max(0, expectedWorkDays - daysWorked);

        let score = 100;
        score -= (lateCheckins * 5);           // -5 per late check-in
        score -= (missedCheckouts * 10);       // -10 per missed checkout
        score -= (earlyCheckouts * 5);         // -5 per early checkout
        score -= (absentDays * 10);            // -10 per absent day

        return Math.max(0, score); // Never go below 0
    };

    const loadStaffStats = async (staffId) => {
        try {
            const stats = await staffService.getStaffAttendanceStats(staffId);
            console.log('Stats loaded:', stats); // Debug log
            if (!stats.staff) {
                throw new Error('Invalid response structure: missing staff data');
            }

            // Calculate dynamic score based on actual attendance
            const dynamicScore = calculateDynamicScore(stats.statistics);

            // Override the staff's current_score with dynamically calculated score
            stats.staff.current_score = dynamicScore;
            stats.staff.is_dynamic_score = true; // Flag to show it's calculated

            setStatsModal(stats);
        } catch (error) {
            console.error('Error loading staff stats:', error);
            alert('Failed to load attendance statistics');
        }
    };

    const handleEditScore = (staffMember) => {
        setEditScoreModal(staffMember);
        setNewScore(staffMember.score || 100);
        setScoreReason('');
    };

    const handleSaveScore = async () => {
        if (!editScoreModal) return;

        if (newScore < 0 || newScore > 100) {
            alert('Score must be between 0 and 100');
            return;
        }

        try {
            setSubmitting(true);
            await staffService.setStaffScore(editScoreModal.id, newScore, scoreReason);
            alert('Score updated successfully');
            setEditScoreModal(null);
            loadStaff(); // Reload to reflect changes
        } catch (error) {
            console.error('Error updating score:', error);
            alert(error.response?.data?.error || 'Failed to update score');
        } finally {
            setSubmitting(false);
        }
    };

    // Get unique franchises for filter dropdown
    const uniqueFranchises = [...new Map(staff.map(s =>
        [s.franchise_id || s.parent_id, { id: s.franchise_id || s.parent_id, name: s.parent_name || 'Unknown' }]
    )).values()].filter(f => f.id);

    // Filter and sort
    const filtered = staff.filter(s => {
        if (filter !== 'all' && s.role !== filter) return false;
        if (franchiseFilter !== 'all' && (s.franchise_id || s.parent_id) !== franchiseFilter) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'score') {
            return (b.score || 100) - (a.score || 100);
        } else if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0; // attendance sorting would require loading stats for all
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
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Staff Attendance Management
                </h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>
                    View attendance statistics and manage staff scores
                </p>
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
                        Staff Type
                    </label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 14
                        }}
                    >
                        <option value="all">All Staff</option>
                        <option value="FRANCHISE_STAFF">Franchise Staff</option>
                        <option value="KITCHEN_STAFF">Kitchen Staff</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>
                        Franchise
                    </label>
                    <select
                        value={franchiseFilter}
                        onChange={(e) => setFranchiseFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 14
                        }}
                    >
                        <option value="all">All Franchises</option>
                        {uniqueFranchises.sort((a, b) => a.name.localeCompare(b.name)).map(franchise => (
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

                                        {/* Buttons */}
                                        <button
                                            onClick={() => loadStaffStats(staffMember.id)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#f3f4f6',
                                                color: '#374151',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View Stats
                                        </button>
                                        <button
                                            onClick={() => handleEditScore(staffMember)}
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
                                            Edit Score
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
                        maxWidth: 700,
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
                                    {statsModal?.staff?.employee_id || 'N/A'} · Attendance Statistics
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
                                    Current Attendance Score
                                </div>
                                <div style={{ fontSize: 48, fontWeight: 700 }}>
                                    {statsModal?.staff?.current_score ?? 100}
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
                                    {getScoreLabel(statsModal?.staff?.current_score ?? 100)}
                                </div>
                            </div>

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

            {/* Edit Score Modal */}
            {editScoreModal && (
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
                        maxWidth: 500,
                        width: '100%',
                        padding: 24
                    }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>
                            Edit Score: {editScoreModal.name}
                        </h2>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                                New Score (0-100)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={newScore}
                                onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 16
                                }}
                            />
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                Current score: {editScoreModal.score || 100}
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                                Reason (Optional)
                            </label>
                            <textarea
                                value={scoreReason}
                                onChange={(e) => setScoreReason(e.target.value)}
                                placeholder="e.g., Manual adjustment for exceptional performance"
                                rows="3"
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setEditScoreModal(null)}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.5 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveScore}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.5 : 1
                                }}
                            >
                                {submitting ? 'Saving...' : 'Save Score'}
                            </button>
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
