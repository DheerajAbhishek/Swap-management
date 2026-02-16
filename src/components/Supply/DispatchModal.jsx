import { useState, useEffect } from 'react';
import PhotoCapture from '../PhotoCapture';
import photoService from '../../services/photoService';

/**
 * DispatchModal - Modal for dispatching order with photo
 */
export default function DispatchModal({
    isOpen,
    onClose,
    order,
    onDispatch,
    loading
}) {
    const [photos, setPhotos] = useState([]);
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPhotos([]);
            setNotes('');
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const handleSubmit = async () => {
        // Require at least one photo
        if (photos.length === 0) {
            alert('Please take at least one photo of the order before dispatching');
            return;
        }

        setUploading(true);
        try {
            // Upload photos to S3
            const photoUrls = await photoService.uploadPhotos(photos, `orders/${order.id}/dispatch`);

            // Call dispatch with photo data
            await onDispatch(order.id, {
                dispatch_photos: photoUrls,
                dispatch_notes: notes
            });

            onClose();
        } catch (err) {
            console.error('Failed to dispatch:', err);
            alert('Failed to dispatch order: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
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
            zIndex: 1000,
            padding: isMobile ? 0 : 20
        }}>
            <div style={{
                background: 'white',
                borderRadius: isMobile ? 0 : 16,
                width: isMobile ? '100%' : '90%',
                maxWidth: 500,
                height: isMobile ? '100%' : 'auto',
                maxHeight: isMobile ? '100%' : '90vh',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: isMobile ? '16px 20px' : '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
                            Dispatch Order
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                            {order.order_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            color: 'white',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: isMobile ? 16 : 24, flex: 1 }}>
                    {/* Order Info */}
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 20,
                        fontSize: 13
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: '#6b7280' }}>Franchise:</span>
                            <span style={{ fontWeight: 500 }}>{order.franchise_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: '#6b7280' }}>Items:</span>
                            <span style={{ fontWeight: 500 }}>{order.items?.length || 0} items</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Delivery Date:</span>
                            <span style={{ fontWeight: 500 }}>{order.delivery_date || 'Today'}</span>
                        </div>
                    </div>

                    {/* Important Notice */}
                    <div style={{
                        background: '#fef3c7',
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Photo Required</div>
                            <div style={{ fontSize: 13, color: '#a16207' }}>
                                Please take a clear photo of the packed order before dispatching. This helps resolve any delivery disputes.
                            </div>
                        </div>
                    </div>

                    {/* Photo Capture */}
                    <PhotoCapture
                        photos={photos}
                        onChange={setPhotos}
                        maxPhotos={3}
                        label="Dispatch Photo"
                        required
                        disabled={loading || uploading}
                    />

                    {/* Notes */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                            Dispatch Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any notes about the dispatch..."
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: '2px solid #e5e7eb',
                                fontSize: 14,
                                resize: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: isMobile ? 16 : 24,
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: 12,
                    flexDirection: isMobile ? 'column' : 'row',
                    position: 'sticky',
                    bottom: 0,
                    background: 'white'
                }}>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || uploading || photos.length === 0}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            borderRadius: 10,
                            border: 'none',
                            background: (loading || uploading || photos.length === 0) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: (loading || uploading || photos.length === 0) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {uploading ? 'Uploading Photos...' : loading ? 'Dispatching...' : 'Dispatch Order'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading || uploading}
                        style={{
                            padding: '14px 24px',
                            borderRadius: 10,
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
