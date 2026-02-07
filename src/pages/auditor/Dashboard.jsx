import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/auditService';
import { formatDate } from '../../utils/constants';

/**
 * Auditor Dashboard - Overview of auditor's activities
 */
export default function AuditorDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalAudits: 0,
        thisMonth: 0,
        pendingReview: 0,
        flagged: 0
    });
    const [recentAudits, setRecentAudits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const audits = await auditService.getAudits();

            // Calculate stats
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const thisMonthAudits = audits.filter(a => new Date(a.audit_date) >= startOfMonth);
            const pending = audits.filter(a => a.status === 'SUBMITTED');
            const flagged = audits.filter(a => a.status === 'FLAGGED');

            setStats({
                totalAudits: audits.length,
                thisMonth: thisMonthAudits.length,
                pendingReview: pending.length,
                flagged: flagged.length
            });

            // Get recent audits (last 5)
            setRecentAudits(audits.slice(0, 5));
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getStatusBadge = (status) => {
        const styles = {
            SUBMITTED: { bg: '#fef3c7', color: '#92400e' },
            REVIEWED: { bg: '#d1fae5', color: '#065f46' },
            FLAGGED: { bg: '#fee2e2', color: '#991b1b' }
        };
        const style = styles[status] || styles.SUBMITTED;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Welcome, {user?.name}
                </h1>
                <p style={{ color: '#6b7280', marginTop: 8 }}>
                    Auditor Dashboard - Track your audits and compliance reports
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 32
            }}>
                <StatCard
                    title="Total Audits"
                    value={stats.totalAudits}
                    color="#3b82f6"
                />
                <StatCard
                    title="This Month"
                    value={stats.thisMonth}
                    color="#8b5cf6"
                />
                <StatCard
                    title="Pending Review"
                    value={stats.pendingReview}
                    color="#f59e0b"
                />
                <StatCard
                    title="Flagged Issues"
                    value={stats.flagged}
                    color="#ef4444"
                />
            </div>

            {/* Recent Audits */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Recent Audits</h2>
                    <a href="/auditor/history" style={{
                        color: '#3b82f6',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500
                    }}>
                        View All →
                    </a>
                </div>

                {recentAudits.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                        <p>No audits yet. Start by conducting your first audit!</p>
                        <a href="/auditor/conduct-audit" style={{
                            display: 'inline-block',
                            marginTop: 12,
                            padding: '10px 20px',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontWeight: 500
                        }}>
                            Conduct Audit
                        </a>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                                    Franchise
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                                    Date
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                                    Score
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentAudits.map(audit => (
                                <tr key={audit.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 500 }}>{audit.franchise_name}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>{audit.id}</div>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                                        {formatDate(audit.audit_date)}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: 48,
                                            padding: '6px 0',
                                            borderRadius: 8,
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: 'white',
                                            background: getScoreColor(audit.overall_score)
                                        }}>
                                            {audit.overall_score}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        {getStatusBadge(audit.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{
                marginTop: 24,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 20
            }}>
                <QuickActionCard
                    title="Conduct New Audit"
                    description="Start a new restaurant inspection audit"
                    link="/auditor/conduct-audit"
                    buttonText="Start Audit"
                    color="#3b82f6"
                />
                <QuickActionCard
                    title="View History"
                    description="Browse all your previous audit reports"
                    link="/auditor/history"
                    buttonText="View History"
                    color="#8b5cf6"
                />
            </div>
        </div>
    );
}

function StatCard({ title, value, color }) {
    return (
        <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
        }}>
            <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: color
                }} />
            </div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{value}</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>{title}</div>
            </div>
        </div>
    );
}

function QuickActionCard({ title, description, link, buttonText, color }) {
    return (
        <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>{description}</p>
            <a href={link} style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: color,
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14
            }}>
                {buttonText}
            </a>
        </div>
    );
}
