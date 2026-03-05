import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrderForm from '../../components/Supply/OrderForm';
import { franchiseService } from '../../services/franchiseService';
import { orderService } from '../../services/orderService';
import { vendorService } from '../../services/vendorService';
import { useAuth } from '../../context/AuthContext';

/**
 * Franchise Edit Order - Edit existing purchase order
 * Only available for PLACED orders within 24 hours
 */
export default function EditOrder() {
    const { id } = useParams();
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [order, setOrder] = useState(null);
    const [allowPriceEdit, setAllowPriceEdit] = useState(false);
    const [isPettyCash, setIsPettyCash] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch both items and the existing order
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const franchiseId = user?.franchise_id;

                if (!franchiseId) {
                    setError('Franchise not found. Please contact admin.');
                    return;
                }

                // Get the existing order FIRST to know which vendor it belongs to
                const orderData = await orderService.getOrder(id);

                // Check if order can be modified
                const modifyCheck = orderService.canModifyOrder(orderData);
                if (!modifyCheck.allowed) {
                    setError(modifyCheck.reason);
                    return;
                }

                setOrder(orderData);

                // Fetch vendor details to check if price editing is allowed (for PETTY_CASH vendors)
                try {
                    const vendorDetails = await vendorService.getVendor(orderData.vendor_id);
                    setAllowPriceEdit(vendorDetails.allow_price_edit || vendorDetails.vendor_type === 'PETTY_CASH' || false);
                    setIsPettyCash(vendorDetails.vendor_type === 'PETTY_CASH');
                } catch (err) {
                    console.warn('Could not fetch vendor details:', err);
                    setAllowPriceEdit(false);
                }

                // Get franchise-specific items with custom prices
                const itemsData = await franchiseService.getFranchiseItems(franchiseId);

                if (!itemsData || itemsData.length === 0) {
                    setError('No items configured for this franchise. Please contact admin to add items.');
                    return;
                }

                // Filter items to only show items from the order's vendor
                const vendorItems = itemsData.filter(item => item.vendor_id === orderData.vendor_id);

                if (vendorItems.length === 0) {
                    setError(`No items found for vendor ${orderData.vendor_name || 'Unknown'}`);
                    return;
                }

                // Transform to format expected by OrderForm
                const formattedItems = vendorItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category || 'General',
                    defaultUom: item.unit || 'kg',
                    standard_price: item.price // franchise custom price
                }));

                setItems(formattedItems);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(err.response?.data?.error || 'Failed to load order');
            } finally {
                setLoading(false);
            }
        };

        if (user && id) {
            fetchData();
        }
    }, [user, id]);

    const handleSubmit = async (orderData) => {
        setSubmitting(true);
        setError(null);

        try {
            // Transform order data for API
            const apiOrderData = {
                vendor_id: order.vendor_id, // Keep same vendor for now
                items: orderData.items.map(item => {
                    // Find item_id from items list (trim and flexible matching)
                    const trimmedName = (item.item_name || '').trim().toLowerCase();
                    const itemData = items.find(i => i.name.trim().toLowerCase() === trimmedName)
                        || items.find(i => i.name.trim().toLowerCase().includes(trimmedName))
                        || items.find(i => trimmedName.includes(i.name.trim().toLowerCase()));
                    // Use franchise item price as fallback if unit_price is 0
                    const price = item.unit_price || itemData?.standard_price || 0;
                    return {
                        item_id: itemData?.id || '',
                        item_name: itemData?.name || item.item_name.trim(),
                        category: itemData?.category || '',
                        uom: item.uom || itemData?.defaultUom || 'kg',
                        quantity: item.qty,  // OrderForm returns 'qty', not 'quantity'
                        unit_price: price
                    };
                }),
                notes: orderData.notes || ''
            };

            await orderService.editOrder(id, apiOrderData);
            setSuccess(true);
        } catch (err) {
            console.error('Failed to edit order:', err);
            setError(err.response?.data?.error || 'Failed to update order');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading order...</div>;
    }

    if (error) {
        return (
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                maxWidth: 500,
                margin: '0 auto'
            }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginBottom: 16 }}>
                    Cannot Edit Order
                </h1>
                <p style={{ color: '#6b7280', marginBottom: 24 }}>
                    {error}
                </p>
                <button
                    onClick={() => navigate('/franchise/orders')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#3b82f6',
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
                    Order Updated Successfully!
                </h1>
                <p style={{ color: '#6b7280', marginBottom: 24 }}>
                    Your purchase order has been updated.
                </p>
                <div style={{
                    padding: 16,
                    background: '#f3f4f6',
                    borderRadius: 10,
                    marginBottom: 24
                }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Order Number</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                        {order?.order_number}
                    </div>
                </div>
                <button
                    onClick={() => navigate('/franchise/orders')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#3b82f6',
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

    if (!order || !order.items) {
        return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Order not found</div>;
    }

    // Transform order items to OrderForm format
    const initialOrderData = {
        items: order.items.map(item => ({
            item_name: item.item_name,
            qty: item.ordered_qty,
            uom: item.uom,
            unit_price: item.unit_price
        })),
        notes: order.notes || ''
    };

    console.log('EditOrder - Available items count:', items.length);
    console.log('EditOrder - Available items:', items.map(i => i.name));
    console.log('EditOrder - Initial order items:', initialOrderData.items);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                    Edit Order
                </h1>
                <p style={{ color: '#6b7280', marginTop: 4 }}>
                    Editing order {order.order_number}
                </p>

                {/* Vendor/Kitchen Info */}
                <div style={{
                    marginTop: 16,
                    padding: 16,
                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                    borderRadius: 12,
                    border: '1px solid #93c5fd'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🏪</span>
                        <div>
                            <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 500 }}>Kitchen/Vendor</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a' }}>
                                {order.vendor_name || 'Unknown Kitchen'}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 8 }}>
                        ℹ️ Items shown below are only from this kitchen
                    </div>
                </div>

                <p style={{ color: '#f59e0b', fontSize: 13, marginTop: 16, fontWeight: 500 }}>
                    You can only edit orders within 24 hours of creation and before they are accepted
                </p>
            </div>

            <OrderForm
                items={items}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                error={error}
                submitButtonText="Update Order"
                initialData={initialOrderData}
                allowPriceEdit={allowPriceEdit}
                allowPastDeliveryDate={isPettyCash}
            />

            <button
                onClick={() => navigate('/franchise/orders')}
                style={{
                    marginTop: 16,
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                }}
            >
                Cancel
            </button>
        </div>
    );
}
