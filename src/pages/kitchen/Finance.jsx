import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { paymentService } from '../../services/paymentService';

// Icons
const Icons = {
    check: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    )
};

export default function KitchenFinance() {
    const { user } = useAuth();
    const vendorId = user?.vendor_id || user?.kitchen_id || '';

    const [activeTab, setActiveTab] = useState('ledger');
    const [ledgerData, setLedgerData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Date filter
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (!vendorId) {
            setError('No kitchen vendor assigned');
            setLoading(false);
            return;
        }
        loadData();
    }, [vendorId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ledger, paymentHistory] = await Promise.all([
                paymentService.getVendorLedger(vendorId),
                paymentService.getPaymentHistory(vendorId)
            ]);
            setLedgerData(ledger);
            setPayments(paymentHistory);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load finance data');
        } finally {
            setLoading(false);
        }
    };

    const loadLedger = async (sDate = startDate, eDate = endDate) => {
        try {
            setLoading(true);
            const data = await paymentService.getVendorLedger(vendorId, sDate, eDate);
            setLedgerData(data);
        } catch (err) {
            console.error('Failed to load ledger:', err);
            setError('Failed to load ledger data');
        } finally {
            setLoading(false);
        }
    };

    const handleDateFilter = () => {
        loadLedger(startDate, endDate);
    };

    const handleResetFilter = () => {
        setStartDate('');
        setEndDate('');
        loadLedger('', '');
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

    // Calculate payment totals
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPayments = payments.length;

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

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: '#6b7280' }}>Loading ledger...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: 18 }}>{error}</div>
                <button onClick={() => loadLedger()} style={{ marginTop: 16, padding: '8px 16px' }}>
                    Retry
                </button>
            </div>
        );
    }

    const vendor = ledgerData?.vendor;
    const ledger = ledgerData?.ledger || [];

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
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                        Kitchen Finance
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>
                        {vendor?.name || user?.vendor_name || 'Kitchen'} • Ledger & payment status
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    onClick={() => setActiveTab('ledger')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'ledger' ? '#3b82f6' : '#f3f4f6',
                        color: activeTab === 'ledger' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    📋 Ledger
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'history' ? '#3b82f6' : '#f3f4f6',
                        color: activeTab === 'history' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    💰 Payment History
                </button>
            </div>

            {activeTab === 'history' ? (
                /* Payment History Tab */
                <div>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 16,
                        marginBottom: 24
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: 12,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 14, opacity: 0.9 }}>Total Payments Received</div>
                            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                                {formatCurrency(totalPaid)}
                            </div>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: 12,
                            padding: 20,
                            color: 'white'
                        }}>
                            <div style={{ fontSize: 14, opacity: 0.9 }}>Total Transactions</div>
                            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                                {totalPayments}
                            </div>
                        </div>
                    </div>

                    {/* Payment History Table */}
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: 16,
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Payment Records</h2>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        PAID DATE
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        PERIOD
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        ORDERS
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        AMOUNT
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        REFERENCE
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                                            {formatDateTime(payment.paid_date)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>
                                            {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right' }}>
                                            {payment.order_count || payment.order_ids?.length || 0}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#10b981', textAlign: 'right' }}>
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#3b82f6', fontFamily: 'monospace' }}>
                                            {payment.payment_reference || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {payments.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                                No payment records found
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>

                    {/* Opening Balance Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        borderRadius: 12,
                        padding: 20,
                        color: 'white',
                        marginBottom: 24
                    }}>
                        <div style={{ fontSize: 14, opacity: 0.9 }}>
                            Opening Balance (Before {formatDate(ledgerData?.dateRange?.startDate)})
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                            {formatCurrency(ledgerData?.openingBalance)}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                            Unpaid amount carried forward from previous periods
                        </div>
                    </div>

                    {/* Date Filter */}
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 24,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 14, color: '#6b7280' }}>From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 14
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 14, color: '#6b7280' }}>To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 14
                                }}
                            />
                        </div>
                        <button
                            onClick={handleDateFilter}
                            style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            Apply Filter
                        </button>
                        <button
                            onClick={handleResetFilter}
                            style={{
                                padding: '8px 16px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            Reset (Last Week)
                        </button>
                        <div style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 14 }}>
                            Showing: {formatDate(ledgerData?.dateRange?.startDate)} - {formatDate(ledgerData?.dateRange?.endDate)}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 16,
                        marginBottom: 24
                    }}>
                        <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Total in Period</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                                {formatCurrency(ledgerData?.totalInRange)}
                            </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Paid in Period</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                                {formatCurrency(ledgerData?.paidInRange)}
                            </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Unpaid in Period</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                                {formatCurrency(ledgerData?.unpaidInRange)}
                            </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Closing Balance</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>
                                {formatCurrency(ledgerData?.closingBalance)}
                            </div>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: 16,
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Transaction Ledger</h2>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        DATE
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        ORDER #
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        FRANCHISE
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        STATUS
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        AMOUNT
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        PAYMENT
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                        PAID DATE
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        style={{
                                            borderBottom: '1px solid #f3f4f6'
                                        }}
                                    >
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#1f2937' }}>
                                            {formatDate(entry.date)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#3b82f6', fontWeight: 500 }}>
                                            {entry.order_number}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#1f2937' }}>
                                            {entry.franchise_name}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 12,
                                                fontSize: 12,
                                                fontWeight: 500,
                                                background: entry.status === 'RECEIVED' ? '#d1fae5' : '#fef3c7',
                                                color: entry.status === 'RECEIVED' ? '#065f46' : '#92400e'
                                            }}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1f2937', textAlign: 'right' }}>
                                            {formatCurrency(entry.amount)}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 12,
                                                fontSize: 12,
                                                fontWeight: 500,
                                                background: entry.is_paid ? '#d1fae5' : '#fee2e2',
                                                color: entry.is_paid ? '#065f46' : '#991b1b'
                                            }}>
                                                {entry.is_paid ? '✓ Paid' : 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>
                                            {entry.is_paid ? formatDate(entry.paid_date) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {ledger.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                                No transactions in this period
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
