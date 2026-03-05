import { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';

/**
 * Staff Score Card Component
 * Displays current month's performance score for a staff member
 */
export default function StaffScoreCard({ staffId, staffName, showDetails = true }) {
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (staffId) {
            fetchScore();
        }
    }, [staffId]);

    const fetchScore = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await staffService.getCurrentMonthScore(staffId);
            setScore(response.data);
        } catch (err) {
            console.error('Failed to fetch score:', err);
            setError('Failed to load score');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 8.5) return '#10b981'; // Green
        if (score >= 7.0) return '#f59e0b'; // Orange
        if (score >= 5.0) return '#f97316'; // Dark orange
        return '#ef4444'; // Red
    };

    const getScoreLabel = (score) => {
        if (score >= 9.0) return 'Excellent';
        if (score >= 8.0) return 'Very Good';
        if (score >= 7.0) return 'Good';
        if (score >= 6.0) return 'Satisfactory';
        if (score >= 5.0) return 'Needs Improvement';
        return 'Poor';
    };

    if (loading) {
        return (
            <div style={styles.card}>
                <div style={styles.loading}>Loading score...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.card}>
                <div style={styles.error}>{error}</div>
            </div>
        );
    }

    if (!score) {
        return (
            <div style={styles.card}>
                <div style={styles.noScore}>
                    <span style={styles.noScoreIcon}>📊</span>
                    <div>No score available for this month</div>
                    <small style={styles.hint}>Score will appear once evaluated</small>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>{staffName || 'Staff Member'}</h3>
                    <p style={styles.month}>Performance Score - {score.month_year}</p>
                </div>
                <div style={{
                    ...styles.scoreBadge,
                    background: `${getScoreColor(score.normalized_score)}20`,
                    color: getScoreColor(score.normalized_score)
                }}>
                    <div>{score.normalized_score.toFixed(1)}/10</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                        {(score.normalized_score * 10).toFixed(0)}/100
                    </div>
                </div>
            </div>

            {/* Score Label */}
            <div style={styles.scoreLabel}>
                <span style={{
                    ...styles.label,
                    color: getScoreColor(score.normalized_score)
                }}>
                    {getScoreLabel(score.normalized_score)}
                </span>
            </div>

            {/* Score Breakdown */}
            {showDetails && (
                <div style={styles.breakdown}>
                    <div style={styles.breakdownItem}>
                        <div style={styles.breakdownLabel}>
                            <span>📅</span> Attendance
                        </div>
                        <div style={styles.breakdownScore}>
                            {score.attendance_score.toFixed(1)}/10
                            <span style={styles.scoreAlt}> ({(score.attendance_score * 10).toFixed(0)}/100)</span>
                        </div>
                        <div style={styles.progressBar}>
                            <div style={{
                                ...styles.progressFill,
                                width: `${(score.attendance_score / 10) * 100}%`,
                                background: getScoreColor(score.attendance_score)
                            }} />
                        </div>
                    </div>

                    <div style={styles.breakdownItem}>
                        <div style={styles.breakdownLabel}>
                            <span>🧼</span> Hygiene
                        </div>
                        <div style={styles.breakdownScore}>
                            {score.hygiene_score.toFixed(1)}/10
                            <span style={styles.scoreAlt}> ({(score.hygiene_score * 10).toFixed(0)}/100)</span>
                        </div>
                        <div style={styles.progressBar}>
                            <div style={{
                                ...styles.progressFill,
                                width: `${(score.hygiene_score / 10) * 100}%`,
                                background: getScoreColor(score.hygiene_score)
                            }} />
                        </div>
                    </div>

                    <div style={styles.breakdownItem}>
                        <div style={styles.breakdownLabel}>
                            <span>⚖️</span> Discipline
                        </div>
                        <div style={styles.breakdownScore}>
                            {score.discipline_score.toFixed(1)}/10
                            <span style={styles.scoreAlt}> ({(score.discipline_score * 10).toFixed(0)}/100)</span>
                        </div>
                        <div style={styles.progressBar}>
                            <div style={{
                                ...styles.progressFill,
                                width: `${(score.discipline_score / 10) * 100}%`,
                                background: getScoreColor(score.discipline_score)
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Notes */}
            {score.notes && (
                <div style={styles.notes}>
                    <strong>Notes:</strong> {score.notes}
                </div>
            )}

            {/* Last Updated */}
            <div style={styles.footer}>
                Last updated: {new Date(score.updated_at).toLocaleDateString()}
            </div>
        </div>
    );
}

const styles = {
    card: {
        background: 'white',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 20
    },
    loading: {
        textAlign: 'center',
        padding: 20,
        color: '#6b7280'
    },
    error: {
        textAlign: 'center',
        padding: 20,
        color: '#ef4444'
    },
    noScore: {
        textAlign: 'center',
        padding: 30,
        color: '#6b7280'
    },
    noScoreIcon: {
        fontSize: 48,
        display: 'block',
        marginBottom: 10
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
        marginBottom: 15
    },
    title: {
        margin: 0,
        fontSize: 18,
        fontWeight: 600,
        color: '#1f2937'
    },
    month: {
        margin: '4px 0 0 0',
        fontSize: 14,
        color: '#6b7280'
    },
    scoreBadge: {
        padding: '8px 16px',
        borderRadius: 20,
        fontSize: 24,
        fontWeight: 700
    },
    scoreLabel: {
        textAlign: 'center',
        marginBottom: 20
    },
    label: {
        fontSize: 16,
        fontWeight: 600
    },
    breakdown: {
        marginTop: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
    },
    breakdownItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
    },
    breakdownLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 500,
        color: '#374151'
    },
    breakdownScore: {
        fontSize: 14,
        fontWeight: 600,
        color: '#1f2937'
    },
    scoreAlt: {
        fontSize: 12,
        fontWeight: 400,
        color: '#6b7280'
    },
    progressBar: {
        height: 8,
        background: '#e5e7eb',
        borderRadius: 10,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        transition: 'width 0.3s ease'
    },
    notes: {
        marginTop: 16,
        padding: 12,
        background: '#f9fafb',
        borderRadius: 8,
        fontSize: 14,
        color: '#4b5563',
        borderLeft: '3px solid #3b82f6'
    },
    footer: {
        marginTop: 16,
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb',
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right'
    }
};
