import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dailyReportService } from '../../services/dailyReportService';
import { formatCurrency, formatDateTime } from '../../utils/constants';

/**
 * DailyEntry for Franchise Staff - View-only access to franchise daily records
 */
export default function DailyEntry() {
    const { user } = useAuth();
    const today = new Date().toISOString().split('T')[0];

    const [selectedDate, setSelectedDate] = useState(today);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load report for selected date
    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await dailyReportService.getDailyReport(selectedDate);
                setReport(data);
            } catch (err) {
                console.error('Failed to load report:', err);
                setError('Failed to load daily report');
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [selectedDate]);

    // Calculate profit/loss
    const calculatePL = () => {
        if (!report) return { value: 0, isProfit: true };
        const sales = report.sales || 0;
        const billTotal = report.bill_total || 0;
        const wastage = report.wastage_total || 0;
        const pl = sales - billTotal - wastage;
        return { value: Math.abs(pl), isProfit: pl >= 0 };
    };

    const pl = calculatePL();

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                    Daily Reports
                </h1>
                <p style={{ color: '#6b7280', marginTop: 4 }}>
                    View daily closing, wastage, and sales records for {user?.franchise_name || 'your franchise'}
                </p>
            </div>

            {/* Date Selector */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Select Date
                </label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={today}
                    style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        width: 200
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
                    Loading report...
                </div>
            ) : error ? (
                <div style={{
                    background: '#fef2f2',
                    borderRadius: 12,
                    padding: 20,
                    color: '#dc2626',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            ) : !report ? (
                <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 40,
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ marginBottom: 16 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <div style={{ color: '#6b7280', fontSize: 16 }}>
                        No report available for {selectedDate}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                        Report hasn't been submitted yet for this date
                    </div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {/* Sales */}
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: 16,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Today's Sales</div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(report.sales || 0)}</div>
                        </div>

                        {/* Bill Total */}
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: 16,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Bill Total</div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(report.bill_total || 0)}</div>
                        </div>

                        {/* Closing */}
                        <div style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            borderRadius: 16,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Closing Inventory</div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(report.closing_total || 0)}</div>
                        </div>

                        {/* Wastage */}
                        <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            borderRadius: 16,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Wastage</div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(report.wastage_total || 0)}</div>
                        </div>
                    </div>

                    {/* Profit/Loss Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 24,
                        marginBottom: 24,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${pl.isProfit ? '#10b981' : '#ef4444'}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                                    {pl.isProfit ? 'Profit' : 'Loss'} (Sales - Bill - Wastage)
                                </div>
                                <div style={{
                                    fontSize: 32,
                                    fontWeight: 700,
                                    color: pl.isProfit ? '#10b981' : '#ef4444'
                                }}>
                                    {pl.isProfit ? '+' : '-'}{formatCurrency(pl.value)}
                                </div>
                            </div>
                            <div style={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: pl.isProfit ? '#d1fae5' : '#fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {pl.isProfit ? (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                        <polyline points="17 6 23 6 23 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                                        <polyline points="17 18 23 18 23 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Closing Items */}
                    {report.closing_items && report.closing_items.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: 16,
                            padding: 24,
                            marginBottom: 24,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                </svg>
                                Closing Inventory Items
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {report.closing_items.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: '#f9fafb',
                                        borderRadius: 8
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{item.item_name}</span>
                                        <div style={{ display: 'flex', gap: 24 }}>
                                            <span style={{ color: '#6b7280' }}>{item.quantity} {item.uom}</span>
                                            <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{formatCurrency(item.total || 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Wastage Items */}
                    {report.wastage_items && report.wastage_items.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: 16,
                            padding: 24,
                            marginBottom: 24,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Wastage Items
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {report.wastage_items.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: '#fef2f2',
                                        borderRadius: 8
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>{item.item_name}</span>
                                            {item.reason && (
                                                <span style={{ marginLeft: 12, fontSize: 12, color: '#6b7280' }}>
                                                    ({item.reason})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 24 }}>
                                            <span style={{ color: '#6b7280' }}>{item.quantity} {item.uom}</span>
                                            <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(item.total || 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Report Info */}
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: 12,
                        padding: 16,
                        fontSize: 13,
                        color: '#6b7280'
                    }}>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {report.created_by_name && (
                                <span>Submitted by: <strong>{report.created_by_name}</strong></span>
                            )}
                            {report.created_at && (
                                <span>Created: {formatDateTime(report.created_at)}</span>
                            )}
                            {report.updated_at && report.updated_at !== report.created_at && (
                                <span>Last updated: {formatDateTime(report.updated_at)}</span>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
