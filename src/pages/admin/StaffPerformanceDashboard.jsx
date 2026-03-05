import { useState, useEffect } from 'react';
import StaffLeaderboard from '../../components/StaffLeaderboard';
import StaffScoreHistory from '../../components/StaffScoreHistory';
import StaffScoreForm from '../../components/StaffScoreForm';
import StaffScoreCard from '../../components/StaffScoreCard';
import { staffService } from '../../services/staffService';

/**
 * Staff Performance Dashboard
 * Comprehensive view of staff scoring system with leaderboard, history, and scoring form
 */
export default function StaffPerformanceDashboard() {
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [showScoreForm, setShowScoreForm] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoadingStaff(true);
            try {
                const data = await staffService.getAllStaff();
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
                        Track monthly attendance, hygiene, and discipline scores
                    </p>
                </div>
                <button
                    onClick={() => setShowScoreForm(true)}
                    style={styles.updateButton}
                >
                    ➕ Update Score
                </button>
            </div>

            {/* Navigation Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'leaderboard' ? styles.tabActive : {})
                    }}
                >
                    🏆 Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'history' ? styles.tabActive : {})
                    }}
                >
                    📊 Score History
                </button>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'overview' ? styles.tabActive : {})
                    }}
                >
                    👤 Staff Overview
                </button>
            </div>

            {/* Content Area */}
            <div style={styles.content}>
                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <div style={styles.tabContent}>
                        <StaffLeaderboard limit={20} showMonth={true} />
                    </div>
                )}

                {/* Score History Tab */}
                {activeTab === 'history' && (
                    <div style={styles.tabContent}>
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
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <StaffScoreHistory staffId={selectedStaffId} limit={12} />
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div style={styles.tabContent}>
                        <div style={styles.overviewGrid}>
                            {/* Current Score Card */}
                            <div style={styles.gridItem}>
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
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <StaffScoreCard staffId={selectedStaffId} />
                            </div>

                            {/* Quick Stats */}
                            <div style={styles.gridItem}>
                                <div style={styles.statsCard}>
                                    <h3 style={styles.statsTitle}>📋 Scoring Guidelines</h3>
                                    <div style={styles.statsList}>
                                        <div style={styles.statsItem}>
                                            <div style={styles.statsLabel}>📅 Attendance (0-10)</div>
                                            <div style={styles.statsDescription}>
                                                Track punctuality, presence, and leave records
                                            </div>
                                        </div>
                                        <div style={styles.statsItem}>
                                            <div style={styles.statsLabel}>🧼 Hygiene (0-10)</div>
                                            <div style={styles.statsDescription}>
                                                Evaluate cleanliness, uniform, and workspace hygiene
                                            </div>
                                        </div>
                                        <div style={styles.statsItem}>
                                            <div style={styles.statsLabel}>⚖️ Discipline (0-10)</div>
                                            <div style={styles.statsDescription}>
                                                Assess behavior, rule compliance, and professionalism
                                            </div>
                                        </div>
                                    </div>

                                    <div style={styles.scoreRanges}>
                                        <h4 style={styles.rangesTitle}>Score Interpretation:</h4>
                                        <div style={styles.rangeItem}>
                                            <div style={{ ...styles.rangeDot, background: '#10b981' }} />
                                            <span>9.0 - 10.0: Excellent</span>
                                        </div>
                                        <div style={styles.rangeItem}>
                                            <div style={{ ...styles.rangeDot, background: '#3b82f6' }} />
                                            <span>8.0 - 8.9: Very Good</span>
                                        </div>
                                        <div style={styles.rangeItem}>
                                            <div style={{ ...styles.rangeDot, background: '#f59e0b' }} />
                                            <span>7.0 - 7.9: Good</span>
                                        </div>
                                        <div style={styles.rangeItem}>
                                            <div style={{ ...styles.rangeDot, background: '#f97316' }} />
                                            <span>5.0 - 6.9: Needs Improvement</span>
                                        </div>
                                        <div style={styles.rangeItem}>
                                            <div style={{ ...styles.rangeDot, background: '#ef4444' }} />
                                            <span>Below 5.0: Poor</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Score Update Modal */}
            {showScoreForm && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Update Staff Score</h3>
                            <button
                                onClick={() => setShowScoreForm(false)}
                                style={styles.closeButton}
                            >
                                ✕
                            </button>
                        </div>
                        <StaffScoreForm
                            onSuccess={() => {
                                setShowScoreForm(false);
                                // Optionally refresh data here
                            }}
                            onCancel={() => setShowScoreForm(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    page: {
        maxWidth: 1400,
        margin: '0 auto',
        padding: 24
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24
    },
    title: {
        margin: 0,
        fontSize: 28,
        fontWeight: 700,
        color: '#1f2937'
    },
    subtitle: {
        margin: '8px 0 0 0',
        fontSize: 16,
        color: '#6b7280'
    },
    updateButton: {
        padding: '12px 24px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
        ':hover': {
            background: '#2563eb'
        }
    },
    tabs: {
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e5e7eb',
        marginBottom: 24
    },
    tab: {
        padding: '12px 24px',
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        fontSize: 15,
        fontWeight: 500,
        color: '#6b7280',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: -2
    },
    tabActive: {
        color: '#3b82f6',
        borderBottom: '2px solid #3b82f6'
    },
    content: {
        minHeight: 400
    },
    tabContent: {
        animation: 'fadeIn 0.3s ease-in'
    },
    searchSection: {
        marginBottom: 20
    },
    label: {
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: '#374151',
        marginBottom: 8
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        marginTop: 4,
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    overviewGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24
    },
    gridItem: {
        minHeight: 300
    },
    statsCard: {
        background: 'white',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    statsTitle: {
        margin: '0 0 16px 0',
        fontSize: 18,
        fontWeight: 600,
        color: '#1f2937'
    },
    statsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        marginBottom: 24
    },
    statsItem: {
        padding: 12,
        background: '#f9fafb',
        borderRadius: 8
    },
    statsLabel: {
        fontSize: 14,
        fontWeight: 600,
        color: '#1f2937',
        marginBottom: 4
    },
    statsDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 1.5
    },
    scoreRanges: {
        paddingTop: 20,
        borderTop: '1px solid #e5e7eb'
    },
    rangesTitle: {
        margin: '0 0 12px 0',
        fontSize: 15,
        fontWeight: 600,
        color: '#374151'
    },
    rangeItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        fontSize: 13,
        color: '#4b5563'
    },
    rangeDot: {
        width: 12,
        height: 12,
        borderRadius: '50%'
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        background: 'white',
        borderRadius: 12,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb'
    },
    modalTitle: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600,
        color: '#1f2937'
    },
    closeButton: {
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        fontSize: 20,
        color: '#6b7280',
        cursor: 'pointer',
        transition: 'background 0.2s'
    }
};
