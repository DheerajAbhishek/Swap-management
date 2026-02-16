import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';

// SVG Icons
const Icons = {
    money: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    ),
    history: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    vendor: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
    )
};

export default function Finance() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadVendorSummary();
    }, []);

    const loadVendorSummary = async () => {
        try {
            setLoading(true);
            const data = await paymentService.getVendorSummary();
            setVendors(data);
        } catch (err) {
            console.error('Failed to load vendor summary:', err);
            setError('Failed to load vendor data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Get recent dates with pending payments
    const getRecentPendingDates = (pendingByDate) => {
        if (!pendingByDate) return [];
        const dates = Object.entries(pendingByDate)
            .filter(([_, data]) => data.amount > 0)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .slice(0, 3);
        return dates;
    };

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading vendor data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: 18 }}>{error}</div>
                <button
                    onClick={loadVendorSummary}
                    style={{
                        marginTop: 16,
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
            }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                        Vendor Finance
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>
                        Manage payments to vendors/kitchens
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/finance/payments')}
                    style={{
                        padding: '10px 20px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    {Icons.history} Payment History
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 32
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Total Pending</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {formatCurrency(vendors.reduce((sum, v) => sum + (v.pending_amount || 0), 0))}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        {vendors.reduce((sum, v) => sum + (v.pending_orders_count || 0), 0)} orders pending
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Total Paid</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_paid || 0), 0))}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        All time payments
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Active Vendors</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {vendors.length}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        {vendors.filter(v => v.pending_amount > 0).length} with pending payments
                    </div>
                </div>
            </div>

            {/* Vendor Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20
            }}>
                {vendors.map(vendor => {
                    const recentDates = getRecentPendingDates(vendor.pending_by_date);
                    const hasPending = vendor.pending_amount > 0;

                    return (
                        <div
                            key={vendor.vendor_id}
                            onClick={() => navigate(`/admin/finance/vendor/${vendor.vendor_id}`)}
                            style={{
                                background: 'white',
                                borderRadius: 16,
                                padding: 20,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                border: hasPending ? '2px solid #fbbf24' : '2px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {/* Vendor Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    background: hasPending ? '#fef3c7' : '#d1fae5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: hasPending ? '#d97706' : '#059669'
                                }}>
                                    {Icons.vendor}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 16 }}>
                                        {vendor.vendor_name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {vendor.vendor_phone || 'No phone'}
                                    </div>
                                </div>
                            </div>

                            {/* Pending Amount */}
                            <div style={{
                                background: hasPending ? '#fef3c7' : '#f3f4f6',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 12
                            }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                    Pending Payment
                                </div>
                                <div style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: hasPending ? '#d97706' : '#10b981'
                                }}>
                                    {formatCurrency(vendor.pending_amount)}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                    {vendor.pending_orders_count || 0} orders • Total paid: {formatCurrency(vendor.total_paid)}
                                </div>
                            </div>

                            {/* Recent Pending Dates */}
                            {recentDates.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                                        Recent Pending:
                                    </div>
                                    {recentDates.map(([date, data]) => (
                                        <div
                                            key={date}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '6px 0',
                                                borderBottom: '1px solid #f3f4f6',
                                                fontSize: 13
                                            }}
                                        >
                                            <span style={{ color: '#6b7280' }}>
                                                {new Date(date).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </span>
                                            <span style={{ color: '#1f2937', fontWeight: 500 }}>
                                                {formatCurrency(data.amount)} ({data.count} orders)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* View Button */}
                            <button
                                style={{
                                    width: '100%',
                                    marginTop: 16,
                                    padding: '10px',
                                    background: hasPending ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {hasPending ? 'View & Pay' : 'View Ledger'} →
                            </button>
                        </div>
                    );
                })}
            </div>

            {vendors.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 60,
                    color: '#6b7280'
                }}>
                    <div style={{ marginBottom: 16, color: '#9ca3af' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13"></rect>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                    </div>
                    <div style={{ fontSize: 18 }}>No vendors found</div>
                    <div style={{ fontSize: 14, marginTop: 8 }}>
                        Add vendors in the Vendor Management section first
                    </div>
                </div>
            )}
        </div>
    );
}
