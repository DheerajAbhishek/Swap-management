import { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';

/**
 * Staff Score History Component
 * Displays historical performance scores with trend visualization
 */
export default function StaffScoreHistory({ staffId, limit = 6 }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (staffId) {
            fetchHistory();
        }
    }, [staffId, limit]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await staffService.getStaffScoreHistory(staffId, limit);
            setHistory(response.data || []);
        } catch (err) {
            console.error('Failed to fetch score history:', err);
            setError('Failed to load score history');
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = () => {
        if (history.length < 2) return null;
        const latest = history[0]?.normalized_score || 0;
        const previous = history[1]?.normalized_score || 0;
        const diff = latest - previous;

        if (diff > 0.5) return { icon: '📈', color: '#10b981', text: 'Improving' };
        if (diff < -0.5) return { icon: '📉', color: '#ef4444', text: 'Declining' };
        return { icon: '➡️', color: '#6b7280', text: 'Stable' };
    };

    const getScoreColor = (score) => {
        if (score >= 9.0) return '#10b981';
        if (score >= 8.0) return '#3b82f6';
        if (score >= 7.0) return '#f59e0b';
        if (score >= 5.0) return '#f97316';
        return '#ef4444';
    };

    const getScoreBarWidth = (score, maxScore = 10) => {
        return `${(score / maxScore) * 100}%`;
    };

    if (loading && history.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading history...</div>
            </div>
        );
    }

    if (!staffId) {
        return (
            <div style={styles.container}>
                <div style={styles.empty}>
                    <span style={styles.emptyIcon}>📊</span>
                    <div>Select a staff member to view score history</div>
                </div>
            </div>
        );
    }

    const trend = getTrendIcon();
    const latestScore = history[0]?.normalized_score || 0;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>Score History</h3>
                    <p style={styles.subtitle}>Last {history.length} months</p>
                </div>
                {trend && (
                    <div style={{ ...styles.trend, color: trend.color }}>
                        <span style={styles.trendIcon}>{trend.icon}</span>
                        <span style={styles.trendText}>{trend.text}</span>
                    </div>
                )}
            </div>

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {history.length === 0 && !loading ? (
                <div style={styles.empty}>
                    <span style={styles.emptyIcon}>📝</span>
                    <div>No score history available</div>
                    <small style={styles.hint}>Scores will appear after evaluation</small>
                </div>
            ) : (
                <>
                    {/* Latest Score Summary */}
                    {history.length > 0 && (
                        <div style={styles.summary}>
                            <div style={styles.summaryScore}>
                                <div style={{
                                    ...styles.summaryValue,
                                    color: getScoreColor(latestScore)
                                }}>
                                    {latestScore.toFixed(1)}
                                </div>
                                <div style={styles.summaryLabel}>Current Score</div>
                            </div>
                            <div style={styles.summaryBreakdown}>
                                <div style={styles.summaryItem}>
                                    <span>📅 Attendance</span>
                                    <span style={styles.summaryItemValue}>
                                        {history[0]?.attendance_score?.toFixed(1) || '-'}
                                    </span>
                                </div>
                                <div style={styles.summaryItem}>
                                    <span>🧼 Hygiene</span>
                                    <span style={styles.summaryItemValue}>
                                        {history[0]?.hygiene_score?.toFixed(1) || '-'}
                                    </span>
                                </div>
                                <div style={styles.summaryItem}>
                                    <span>⚖️ Discipline</span>
                                    <span style={styles.summaryItemValue}>
                                        {history[0]?.discipline_score?.toFixed(1) || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Monthly Timeline */}
                    <div style={styles.timeline}>
                        {history.map((score, index) => {
                            const isLatest = index === 0;
                            return (
                                <div
                                    key={score.month_year}
                                    style={{
                                        ...styles.timelineItem,
                                        ...(isLatest ? styles.timelineItemLatest : {})
                                    }}
                                >
                                    {/* Month Label */}
                                    <div style={styles.monthLabel}>
                                        {formatMonth(score.month_year)}
                                        {isLatest && <span style={styles.latestBadge}>Latest</span>}
                                    </div>

                                    {/* Score Bars */}
                                    <div style={styles.scoreBars}>
                                        {/* Attendance */}
                                        <div style={styles.scoreBar}>
                                            <div style={styles.scoreBarLabel}>
                                                <span>📅</span>
                                                <span style={styles.scoreBarValue}>
                                                    {score.attendance_score?.toFixed(1) || '0.0'}
                                                </span>
                                            </div>
                                            <div style={styles.scoreBarTrack}>
                                                <div
                                                    style={{
                                                        ...styles.scoreBarFill,
                                                        width: getScoreBarWidth(score.attendance_score || 0),
                                                        background: '#3b82f6'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Hygiene */}
                                        <div style={styles.scoreBar}>
                                            <div style={styles.scoreBarLabel}>
                                                <span>🧼</span>
                                                <span style={styles.scoreBarValue}>
                                                    {score.hygiene_score?.toFixed(1) || '0.0'}
                                                </span>
                                            </div>
                                            <div style={styles.scoreBarTrack}>
                                                <div
                                                    style={{
                                                        ...styles.scoreBarFill,
                                                        width: getScoreBarWidth(score.hygiene_score || 0),
                                                        background: '#10b981'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Discipline */}
                                        <div style={styles.scoreBar}>
                                            <div style={styles.scoreBarLabel}>
                                                <span>⚖️</span>
                                                <span style={styles.scoreBarValue}>
                                                    {score.discipline_score?.toFixed(1) || '0.0'}
                                                </span>
                                            </div>
                                            <div style={styles.scoreBarTrack}>
                                                <div
                                                    style={{
                                                        ...styles.scoreBarFill,
                                                        width: getScoreBarWidth(score.discipline_score || 0),
                                                        background: '#f59e0b'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Score */}
                                    <div style={styles.totalScoreContainer}>
                                        <div
                                            style={{
                                                ...styles.totalScoreBadge,
                                                background: getScoreColor(score.normalized_score),
                                            }}
                                        >
                                            {score.normalized_score?.toFixed(1) || '0.0'}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {score.notes && (
                                        <div style={styles.notes}>
                                            <span style={styles.notesIcon}>💬</span>
                                            <span style={styles.notesText}>{score.notes}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

function formatMonth(monthYear) {
    if (!monthYear) return '';
    const [year, month] = monthYear.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    trend: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: '#f9fafb',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500
    },
    trendIcon: {
        fontSize: 18
    },
    trendText: {
        fontSize: 14
    },
    summary: {
        display: 'flex',
        gap: 20,
        padding: 20,
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: 10,
        marginBottom: 20
    },
    summaryScore: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingRight: 20,
        borderRight: '2px solid #bae6fd'
    },
    summaryValue: {
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 1
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4
    },
    summaryBreakdown: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        justifyContent: 'center'
    },
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 14
    },
    summaryItemValue: {
        fontWeight: 600,
        fontSize: 16
    },
    timeline: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
    },
    timelineItem: {
        padding: 16,
        background: '#f9fafb',
        borderRadius: 10,
        border: '1px solid #e5e7eb'
    },
    timelineItemLatest: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '2px solid #f59e0b'
    },
    monthLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 600,
        color: '#1f2937',
        marginBottom: 12
    },
    latestBadge: {
        padding: '2px 8px',
        background: '#10b981',
        color: 'white',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600
    },
    scoreBars: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 12
    },
    scoreBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
    },
    scoreBarLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 100,
        fontSize: 13
    },
    scoreBarValue: {
        fontWeight: 600,
        fontSize: 14
    },
    scoreBarTrack: {
        flex: 1,
        height: 8,
        background: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden'
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 4,
        transition: 'width 0.3s ease'
    },
    totalScoreContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 8
    },
    totalScoreBadge: {
        padding: '4px 12px',
        borderRadius: 6,
        color: 'white',
        fontSize: 16,
        fontWeight: 700
    },
    notes: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 12,
        padding: 12,
        background: 'white',
        borderRadius: 8,
        fontSize: 13,
        color: '#6b7280'
    },
    notesIcon: {
        fontSize: 16,
        marginTop: 1
    },
    notesText: {
        flex: 1,
        lineHeight: 1.5
    }
};
