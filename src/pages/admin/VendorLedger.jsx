import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';

// SVG Icons
const Icons = {
    payment: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
    )
};

export default function VendorLedger() {
    const { vendorId } = useParams();
    const navigate = useNavigate();

    const [ledgerData, setLedgerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Date filter
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadLedger();
    }, [vendorId]);

    const loadLedger = async (sDate = startDate, eDate = endDate) => {
        try {
            setLoading(true);
            const data = await paymentService.getVendorLedger(vendorId, sDate, eDate);
            setLedgerData(data);
            // Pre-select all unpaid orders
            const unpaidOrders = (data.ledger || []).filter(e => !e.is_paid);
            setSelectedOrders(unpaidOrders.map(o => o.id));
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

    const toggleOrderSelection = (orderId) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const selectAllUnpaid = () => {
        const unpaidOrders = (ledgerData?.ledger || []).filter(e => !e.is_paid);
        setSelectedOrders(unpaidOrders.map(o => o.id));
    };

    const deselectAll = () => {
        setSelectedOrders([]);
    };

    const getSelectedAmount = () => {
        return (ledgerData?.ledger || [])
            .filter(e => selectedOrders.includes(e.id) && !e.is_paid)
            .reduce((sum, e) => sum + e.amount, 0);
    };

    const handlePayment = async () => {
        if (selectedOrders.length === 0) {
            alert('Please select at least one order to pay');
            return;
        }
        if (!paymentReference.trim()) {
            alert('Please enter payment reference (UTC/UTR)');
            return;
        }

        try {
            setSubmitting(true);

            // Record payment
            await paymentService.recordPayment({
                vendor_id: vendorId,
                order_ids: selectedOrders,
                amount: getSelectedAmount(),
                period_start: ledgerData?.dateRange?.startDate,
                period_end: ledgerData?.dateRange?.endDate,
                payment_reference: paymentReference.trim(),
                notes: paymentNotes
            });

            alert('Payment recorded successfully!');
            setShowPaymentModal(false);
            setPaymentReference('');
            setPaymentNotes('');
            loadLedger(startDate, endDate);
        } catch (err) {
            console.error('Payment failed:', err);
            alert('Failed to record payment: ' + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
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
    const unpaidOrders = ledger.filter(e => !e.is_paid);

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
                        {vendor?.name} Ledger
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>
                        {vendor?.phone} • {vendor?.email || 'No email'}
                    </p>
                </div>

                {unpaidOrders.length > 0 && (
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        style={{
                            padding: '12px 24px',
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
                        {Icons.payment} Make Payment
                    </button>
                )}
            </div>

            {/* Opening Balance Card */}
            <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: 12,
                padding: 20,
                color: 'white',
                marginBottom: 24
            }}>
                <div style={{ fontSize: 14, opacity: 0.9 }}>Opening Balance (Before {formatDate(ledgerData?.dateRange?.startDate)})</div>
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
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={selectAllUnpaid}
                            style={{
                                padding: '6px 12px',
                                background: '#dbeafe',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 13,
                                cursor: 'pointer'
                            }}
                        >
                            Select All Unpaid
                        </button>
                        <button
                            onClick={deselectAll}
                            style={{
                                padding: '6px 12px',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 13,
                                cursor: 'pointer'
                            }}
                        >
                            Deselect All
                        </button>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                SELECT
                            </th>
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
                        {ledger.map((entry, index) => (
                            <tr
                                key={entry.id}
                                style={{
                                    borderBottom: '1px solid #f3f4f6',
                                    background: selectedOrders.includes(entry.id) && !entry.is_paid ? '#eff6ff' : 'white'
                                }}
                            >
                                <td style={{ padding: '12px 16px' }}>
                                    {!entry.is_paid && (
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(entry.id)}
                                            onChange={() => toggleOrderSelection(entry.id)}
                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                        />
                                    )}
                                </td>
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

                {/* Selected Summary */}
                {selectedOrders.length > 0 && (
                    <div style={{
                        padding: 16,
                        background: '#eff6ff',
                        borderTop: '1px solid #bfdbfe',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                {selectedOrders.length} orders selected
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 14, color: '#6b7280' }}>Selected Amount:</span>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
                                {formatCurrency(getSelectedAmount())}
                            </span>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Pay Selected
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 24,
                        width: '90%',
                        maxWidth: 500,
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {Icons.payment} Record Payment
                        </h2>

                        {/* Payment Details */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{
                                background: '#f3f4f6',
                                borderRadius: 12,
                                padding: 16
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ color: '#6b7280' }}>Vendor:</span>
                                    <span style={{ fontWeight: 600 }}>{vendor?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ color: '#6b7280' }}>Orders:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedOrders.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ color: '#6b7280' }}>Period:</span>
                                    <span style={{ fontWeight: 600 }}>
                                        {formatDate(ledgerData?.dateRange?.startDate)} - {formatDate(ledgerData?.dateRange?.endDate)}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    paddingTop: 8,
                                    borderTop: '1px solid #d1d5db',
                                    marginTop: 8
                                }}>
                                    <span style={{ fontWeight: 600, fontSize: 16 }}>Amount:</span>
                                    <span style={{ fontWeight: 700, fontSize: 20, color: '#10b981' }}>
                                        {formatCurrency(getSelectedAmount())}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Reference */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                Payment Reference (UTC/UTR) *
                            </label>
                            <input
                                type="text"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Enter payment reference number"
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 14
                                }}
                            />
                        </div>

                        {/* Notes */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Add any notes about this payment..."
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    minHeight: 80,
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPaymentReference('');
                                    setPaymentNotes('');
                                }}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={submitting || !paymentReference.trim()}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: submitting || !paymentReference.trim() ? '#d1d5db' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: submitting || !paymentReference.trim() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {submitting ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
