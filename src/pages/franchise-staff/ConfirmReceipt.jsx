import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DiscrepancyForm from '../../components/Supply/DiscrepancyForm';
import StatusBadge from '../../components/Supply/StatusBadge';
import OrderComplaintModal from '../../components/Supply/OrderComplaintModal';
import { formatCurrency, formatDateTime } from '../../utils/constants';
import orderService from '../../services/orderService';
import discrepancyService from '../../services/discrepancyService';
import photoService from '../../services/photoService';
import { useAuth } from '../../context/AuthContext';

/**
 * Franchise Staff Confirm Receipt - Confirm delivery and report discrepancies
 */
export default function StaffConfirmReceipt() {
    const { user } = useAuth();
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
    const [complaintModal, setComplaintModal] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const orders = await orderService.getOrders();
                const foundOrder = orders.find(o => o.id === orderId);
                setOrder(foundOrder || null);
            } catch (err) {
                setError(err.message);
                console.error('Failed to fetch order:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleSubmit = async (data) => {
        setSubmitting(true);

        try {
            // Upload receive photos if provided
            let receivePhotoUrls = [];
            if (data.photos && data.photos.length > 0) {
                try {
                    receivePhotoUrls = await photoService.uploadPhotos(data.photos, `orders/${orderId}/receive`);
                } catch (err) {
                    console.error('Failed to upload photos:', err);
                    // Continue without photos
                }
            }

            // Receive the order with photos
            await orderService.receiveOrder(orderId, {
                receive_photos: receivePhotoUrls
            });

            // Report discrepancies if any
            const hasDiscrepancies = data.discrepancies && data.discrepancies.length > 0;
            if (hasDiscrepancies) {
                // Upload discrepancy photos if provided
                let discrepancyPhotoUrls = receivePhotoUrls; // Use same photos for discrepancies

                for (const disc of data.discrepancies) {
                    await discrepancyService.createDiscrepancy({
                        order_id: orderId,
                        order_number: order.order_number,
                        item_name: disc.itemName,
                        ordered_qty: disc.orderedQty,
                        received_qty: disc.receivedQty,
                        uom: disc.uom,
                        notes: disc.notes,
                        photos: discrepancyPhotoUrls
                    });
                }
            }

            setHasDiscrepancy(hasDiscrepancies);
            setSuccess(true);
        } catch (err) {
            alert('Failed to confirm receipt: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading order...</div>;
    }

    if (!order) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <h2 style={{ color: '#1f2937' }}>Order not found</h2>
                <button
                    onClick={() => navigate('/franchise-staff/orders')}
                    style={{
                        marginTop: 16,
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    Back to Orders
                </button>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                maxWidth: 500,
                margin: '0 auto'
            }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
                    {hasDiscrepancy ? 'Receipt Confirmed with Discrepancy' : 'Receipt Confirmed!'}
                </h1>
                <p style={{ color: '#6b7280', marginBottom: 24 }}>
                    {hasDiscrepancy
                        ? 'Your discrepancy report has been sent to Admin and Kitchen for review.'
                        : 'The order has been marked as received successfully.'}
                </p>
                <button
                    onClick={() => navigate('/franchise-staff/orders')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                    Confirm Receipt
                </h1>
                <p style={{ color: '#6b7280', marginTop: 4 }}>
                    Verify received quantities and report any discrepancies
                </p>
            </div>

            {/* Order Info */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                                {order.order_number}
                            </span>
                            <StatusBadge status={order.status} />
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            Dispatched on {formatDateTime(order.dispatched_at)}
                        </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                        {formatCurrency(order.total_amount)}
                    </div>
                </div>

                {/* Raise Complaint Button */}
                <button
                    onClick={() => setComplaintModal(true)}
                    style={{
                        marginTop: 16,
                        padding: '10px 16px',
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Raise Complaint with Photo
                </button>
            </div>

            {/* Receipt Form */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <DiscrepancyForm
                    orderItems={order.items}
                    onSubmit={handleSubmit}
                    loading={submitting}
                />
            </div>

            {/* Complaint Modal */}
            <OrderComplaintModal
                isOpen={complaintModal}
                onClose={() => setComplaintModal(false)}
                order={order}
                user={user}
                onSuccess={() => {
                    alert('Complaint submitted successfully!');
                }}
            />
        </div>
    );
}
