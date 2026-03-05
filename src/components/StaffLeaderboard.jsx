import { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';

/**
 * Staff Leaderboard Component
 * Displays top performing staff members for a given month
 */
export default function StaffLeaderboard({ monthYear = '', limit = 10, showMonth = true }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(monthYear || getCurrentMonthYear());

    useEffect(() => {
        fetchLeaderboard();
    }, [selectedMonth]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await staffService.getLeaderboard(selectedMonth, limit);
            setLeaderboard(response.data || []);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            setError('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    function getCurrentMonthYear() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    const getRankIcon = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getScoreColor = (score) => {
        if (score >= 9.0) return '#10b981';
        if (score >= 8.0) return '#3b82f6';
        if (score >= 7.0) return '#f59e0b';
        return '#6b7280';
    };

    if (loading && leaderboard.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading leaderboard...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🏆 Top Performers</h3>
                    {showMonth && (
                        <p style={styles.subtitle}>Performance Rankings</p>
                    )}
                </div>

                {showMonth && (
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={styles.monthPicker}
                        max={getCurrentMonthYear()}
                    />
                )}
            </div>

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {leaderboard.length === 0 && !loading ? (
                <div style={styles.empty}>
                    <span style={styles.emptyIcon}>📊</span>
                    <div>No scores available for this month</div>
                    <small style={styles.hint}>Scores will appear once staff are evaluated</small>
                </div>
            ) : (
                <div style={styles.list}>
                    {leaderboard.map((staff, index) => (
                        <div
                            key={staff.staff_id}
                            style={{
                                ...styles.item,
                                ...(staff.rank <= 3 ? styles.topThree : {})
                            }}
                        >
                            {/* Rank */}
                            <div style={{
                                ...styles.rank,
                                background: staff.rank <= 3 ? '#fef3c7' : '#f3f4f6'
                            }}>
                                {getRankIcon(staff.rank)}
                            </div>

                            {/* Staff Info */}
                            <div style={styles.staffInfo}>
                                <div style={styles.staffName}>{staff.staff_name}</div>
                                <div style={styles.staffId}>ID: {staff.staff_id}</div>
                            </div>

                            {/* Score Breakdown */}
                            <div style={styles.scores}>
                                <div style={styles.scoreItem} title="Attendance">
                                    <span>📅</span>
                                    <span>{staff.attendance_score?.toFixed(1) || '-'}</span>
                                </div>
                                <div style={styles.scoreItem} title="Hygiene">
                                    <span>🧼</span>
                                    <span>{staff.hygiene_score?.toFixed(1) || '-'}</span>
                                </div>
                                <div style={styles.scoreItem} title="Discipline">
                                    <span>⚖️</span>
                                    <span>{staff.discipline_score?.toFixed(1) || '-'}</span>
                                </div>
                            </div>

                            {/* Total Score */}
                            <div style={{
                                ...styles.totalScore,
                                color: getScoreColor(staff.normalized_score)
                            }}>
                                <div style={styles.scoreValue}>
                                    {staff.normalized_score?.toFixed(1) || '0.0'}
                                </div>
                                <div style={styles.scoreLabel}>/ 10</div>
                                <div style={styles.scoreLabelAlt}>
                                    ({((staff.normalized_score || 0) * 10).toFixed(0)}/100)
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            {leaderboard.length > 0 && (
                <div style={styles.footer}>
                    Showing top {leaderboard.length} performers for {formatMonth(selectedMonth)}
                </div>
            )}
        </div>
    );
}

function formatMonth(monthYear) {
    if (!monthYear) return 'current month';
    const [year, month] = monthYear.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const styles = {
    container: {
        background: 'white',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    loading: {
        textAlign: 'center',
        padding: 30,
        color: '#6b7280'
    },
    error: {
        padding: 12,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        color: '#dc2626',
        fontSize: 14,
        marginBottom: 16
    },
    empty: {
        textAlign: 'center',
        padding: 40,
        color: '#6b7280'
    },
    emptyIcon: {
        fontSize: 48,
        display: 'block',
        marginBottom: 12
    },
    hint: {
        display: 'block',
        marginTop: 8,
        fontSize: 12,
        color: '#9ca3af'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    title: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600,
        color: '#1f2937'
    },
    subtitle: {
        margin: '4px 0 0 0',
        fontSize: 14,
        color: '#6b7280'
    },
    monthPicker: {
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        cursor: 'pointer'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: '#f9fafb',
        borderRadius: 10,
        transition: 'all 0.2s',
        ':hover': {
            background: '#f3f4f6',
            transform: 'translateX(4px)'
        }
    },
    topThree: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '2px solid #f59e0b'
    },
    rank: {
        width: 50,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        fontSize: 20,
        fontWeight: 700
    },
    staffInfo: {
        flex: 1,
        minWidth: 0
    },
    staffName: {
        fontSize: 16,
        fontWeight: 600,
        color: '#1f2937',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    staffId: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2
    },
    scores: {
        display: 'flex',
        gap: 12
    },
    scoreItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        background: 'white',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500
    },
    totalScore: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'white',
        borderRadius: 10,
        minWidth: 70
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1
    },
    scoreLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2
    },
    footer: {
        marginTop: 16,
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb',
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center'
    }
};
