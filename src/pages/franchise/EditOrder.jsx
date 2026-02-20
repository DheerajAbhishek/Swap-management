import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrderForm from '../../components/Supply/OrderForm';
import { franchiseService } from '../../services/franchiseService';
import { orderService } from '../../services/orderService';
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

                // Get franchise-specific items with custom prices
                const itemsData = await franchiseService.getFranchiseItems(franchiseId);

                if (!itemsData || itemsData.length === 0) {
                    setError('No items configured for this franchise. Please contact admin to add items.');
                    return;
                }

                // Transform to format expected by OrderForm
                const formattedItems = itemsData.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category || 'General',
                    defaultUom: item.unit || 'kg',
                    standard_price: item.price // franchise custom price
                }));

                setItems(formattedItems);

                // Get the existing order
                const orderData = await orderService.getOrder(id);

                // Check if order can be modified
                const modifyCheck = orderService.canModifyOrder(orderData);
                if (!modifyCheck.allowed) {
                    setError(modifyCheck.reason);
                    return;
                }

                setOrder(orderData);
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
                    // Find item_id from items list
                    const itemData = items.find(i => i.name === item.item_name);
                    return {
                        item_id: itemData?.id || '',
                        item_name: item.item_name,
                        category: itemData?.category || '',
                        uom: item.uom,
                        quantity: item.qty,  // OrderForm returns 'qty', not 'quantity'
                        unit_price: item.unit_price
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
                <p style={{ color: '#f59e0b', fontSize: 13, marginTop: 8, fontWeight: 500 }}>
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
