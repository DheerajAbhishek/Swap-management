import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import StaffLeaderboard from '../../components/StaffLeaderboard';
import StaffScoreHistory from '../../components/StaffScoreHistory';
import StaffScoreCard from '../../components/StaffScoreCard';

/**
 * Hygiene Monitor - Staff Performance (read-only)
 * Shows scores only for staff in assigned franchises
 */
export default function HygieneMonitorStaffPerformance() {
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoadingStaff(true);
            try {
                // GET /staff with HYGIENE_MONITOR token → backend auto-filters to assigned franchises
                const data = await staffService.getStaff();
                const list = Array.isArray(data) ? data : (data?.staff || data?.items || []);
                setStaffList(list.filter(s => s.role === 'FRANCHISE_STAFF'));
            } catch (err) {
                console.error('Failed to fetch staff list:', err);
            } finally {
                setLoadingStaff(false);
            }
        };
        fetchStaff();
    }, []);

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Staff Performance</h1>
                    <p style={styles.subtitle}>
                        Monthly scores for staff in your assigned franchises
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    style={{ ...styles.tab, ...(activeTab === 'leaderboard' ? styles.tabActive : {}) }}
                >
                    🏆 Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{ ...styles.tab, ...(activeTab === 'history' ? styles.tabActive : {}) }}
                >
                    📊 Score History
                </button>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
                >
                    👤 Staff Overview
                </button>
            </div>

            {/* Content */}
            <div style={styles.content}>
                {activeTab === 'leaderboard' && (
                    <StaffLeaderboard limit={20} showMonth={true} />
                )}

                {activeTab === 'history' && (
                    <div>
                        <div style={styles.searchSection}>
                            <label style={styles.label}>Select Staff Member:</label>
                            <select
                                value={selectedStaffId || ''}
                                onChange={(e) => setSelectedStaffId(e.target.value || null)}
                                style={styles.input}
                                disabled={loadingStaff}
                            >
                                <option value="">{loadingStaff ? 'Loading staff...' : '— Choose a staff member —'}</option>
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <StaffScoreHistory staffId={selectedStaffId} limit={12} />
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div style={styles.overviewGrid}>
                        <div>
                            <div style={styles.searchSection}>
                                <label style={styles.label}>Select Staff Member:</label>
                                <select
                                    value={selectedStaffId || ''}
                                    onChange={(e) => setSelectedStaffId(e.target.value || null)}
                                    style={styles.input}
                                    disabled={loadingStaff}
                                >
                                    <option value="">{loadingStaff ? 'Loading staff...' : '— Choose a staff member —'}</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <StaffScoreCard staffId={selectedStaffId} />
                        </div>

                        <div style={styles.statsCard}>
                            <h3 style={styles.statsTitle}>📋 Scoring Guidelines</h3>
                            <div style={styles.statsList}>
                                <div style={styles.statsItem}>
                                    <div style={styles.statsLabel}>📅 Attendance (0-10)</div>
                                    <div style={styles.statsDesc}>Punctuality, presence, and leave records</div>
                                </div>
                                <div style={styles.statsItem}>
                                    <div style={styles.statsLabel}>🧼 Hygiene (0-10)</div>
                                    <div style={styles.statsDesc}>Cleanliness, uniform, and workspace hygiene</div>
                                </div>
                                <div style={styles.statsItem}>
                                    <div style={styles.statsLabel}>⚖️ Discipline (0-10)</div>
                                    <div style={styles.statsDesc}>Behavior, rule compliance, and professionalism</div>
                                </div>
                            </div>
                            <div style={styles.scoreRanges}>
                                <h4 style={styles.rangesTitle}>Score Interpretation:</h4>
                                {[
                                    { color: '#10b981', label: '9.0 - 10.0: Excellent' },
                                    { color: '#3b82f6', label: '8.0 - 8.9: Very Good' },
                                    { color: '#f59e0b', label: '7.0 - 7.9: Good' },
                                    { color: '#f97316', label: '5.0 - 6.9: Needs Improvement' },
                                    { color: '#ef4444', label: 'Below 5.0: Poor' },
                                ].map((r, i) => (
                                    <div key={i} style={styles.rangeItem}>
                                        <div style={{ ...styles.rangeDot, background: r.color }} />
                                        <span>{r.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: 1400, margin: '0 auto', padding: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#1f2937' },
    subtitle: { margin: '8px 0 0 0', fontSize: 16, color: '#6b7280' },
    tabs: { display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', marginBottom: 24 },
    tab: { padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: 15, fontWeight: 500, color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s', marginBottom: -2 },
    tabActive: { color: '#3b82f6', borderBottom: '2px solid #3b82f6' },
    content: { minHeight: 400 },
    searchSection: { marginBottom: 20 },
    label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' },
    overviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
    statsCard: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    statsTitle: { margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#1f2937' },
    statsList: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 },
    statsItem: { padding: 12, background: '#f9fafb', borderRadius: 8 },
    statsLabel: { fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 4 },
    statsDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
    scoreRanges: { paddingTop: 20, borderTop: '1px solid #e5e7eb' },
    rangesTitle: { margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, color: '#374151' },
    rangeItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: '#4b5563' },
    rangeDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
};
