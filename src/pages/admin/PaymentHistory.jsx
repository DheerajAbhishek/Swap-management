import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { vendorService } from '../../services/vendorService';

// SVG Icons
const Icons = {
    check: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
    note: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
    ),
    history: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    )
};

export default function PaymentHistory() {
    const navigate = useNavigate();

    const [payments, setPayments] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [selectedVendor, setSelectedVendor] = useState('');


    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadPayments();
    }, [selectedVendor]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [paymentsData, vendorsData] = await Promise.all([
                paymentService.getPaymentHistory(),
                vendorService.getVendors()
            ]);
            setPayments(paymentsData);
            setVendors(vendorsData);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const loadPayments = async () => {
        try {
            const data = await paymentService.getPaymentHistory(selectedVendor || null);
            setPayments(data);
        } catch (err) {
            console.error('Failed to load payments:', err);
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOrders = payments.reduce((sum, p) => sum + (p.order_count || 0), 0);

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading payment history...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: 18 }}>{error}</div>
                <button onClick={loadData} style={{ marginTop: 16, padding: '8px 16px' }}>
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
                alignItems: 'flex-start',
                marginBottom: 24
            }}>
                <div>
                    <button
                        onClick={() => navigate('/admin/finance')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            marginBottom: 8,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        ← Back to Finance
                    </button>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                        Payment History
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>
                        View all completed payments to vendors
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 24
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Total Payments</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {payments.length}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Total Amount Paid</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {formatCurrency(totalPaid)}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    borderRadius: 12,
                    padding: 20,
                    color: 'white'
                }}>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Orders Covered</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {totalOrders}
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <label style={{ fontSize: 14, color: '#6b7280' }}>Filter by Vendor:</label>
                <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                        minWidth: 200
                    }}
                >
                    <option value="">All Vendors</option>
                    {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                </select>
            </div>

            {/* Payments List */}
            <div style={{
                display: 'grid',
                gap: 16
            }}>
                {payments.map(payment => (
                    <div
                        key={payment.id}
                        style={{
                            background: 'white',
                            borderRadius: 16,
                            padding: 20,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            {/* Left Side - Payment Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: '#d1fae5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#059669'
                                    }}>
                                        {Icons.check}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 18 }}>
                                            {payment.vendor_name}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                                            Payment ID: {payment.id}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Amount</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                                            {formatCurrency(payment.amount)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Orders</div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
                                            {payment.order_count} orders
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Period</div>
                                        <div style={{ fontSize: 14, color: '#1f2937' }}>
                                            {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Payment Ref</div>
                                        <div style={{ fontSize: 14, color: '#1f2937' }}>
                                            {payment.payment_reference || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Paid On</div>
                                        <div style={{ fontSize: 14, color: '#1f2937' }}>
                                            {formatDateTime(payment.paid_date)}
                                        </div>
                                    </div>
                                </div>

                                {payment.notes && (
                                    <div style={{
                                        marginTop: 12,
                                        padding: 12,
                                        background: '#f3f4f6',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        color: '#6b7280'
                                    }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icons.note} {payment.notes}</span>
                                    </div>
                                )}

                                <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
                                    Paid by: {payment.paid_by_name}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            {payments.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 60,
                    color: '#6b7280',
                    background: 'white',
                    borderRadius: 16
                }}>
                    <div style={{ marginBottom: 16, color: '#9ca3af' }}>{Icons.history}</div>
                    <div style={{ fontSize: 18 }}>No payments found</div>
                    <div style={{ fontSize: 14, marginTop: 8 }}>
                        {selectedVendor ? 'No payments for selected vendor' : 'Start by making payments in the Finance section'}
                    </div>
                </div>
            )}

        </div>
    );
}
