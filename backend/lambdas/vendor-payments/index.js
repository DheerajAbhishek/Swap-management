/**
 * Vendor Payments Lambda - Finance management for vendor payments
 * Tracks payments to vendors/kitchens based on received orders
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const PAYMENTS_TABLE = 'vendor_payments';
const ORDERS_TABLE = 'supply_orders';
const VENDORS_TABLE = 'supply_vendors';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Generate unique ID
function generateId() {
    return 'pay-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Verify token and get user info
function getUserFromToken(event) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

// Get week start and end dates
function getWeekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
    };
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const user = getUserFromToken(event);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    const isAdmin = user.role === 'ADMIN';
    const isKitchen = user.role === 'KITCHEN';

    // Only admin can access finance (kitchen can view their own ledger and history only)
    if (!isAdmin) {
        const isLedgerRequest = httpMethod === 'GET' && path.includes('/ledger/');
        const isHistoryRequest = httpMethod === 'GET' && path.includes('/history');
        if (!isKitchen || (!isLedgerRequest && !isHistoryRequest)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Only admin can access finance' })
            };
        }
    }

    try {
        // GET /vendor-payments/summary - Get all vendors with pending payment summary
        if (httpMethod === 'GET' && path.includes('/summary')) {
            // Get all vendors
            const vendorsResult = await dynamodb.send(new ScanCommand({
                TableName: VENDORS_TABLE
            }));
            const vendors = vendorsResult.Items || [];

            // Get all received orders (status = RECEIVED means delivered and accepted by franchise)
            const ordersResult = await dynamodb.send(new ScanCommand({
                TableName: ORDERS_TABLE,
                FilterExpression: '#status = :received',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':received': 'RECEIVED'
                }
            }));
            const orders = ordersResult.Items || [];

            // Get all payments to calculate what's already paid
            const paymentsResult = await dynamodb.send(new ScanCommand({
                TableName: PAYMENTS_TABLE
            }));
            const payments = paymentsResult.Items || [];

            // Calculate pending amounts per vendor
            const vendorSummary = vendors.map(vendor => {
                // Get orders for this vendor
                const vendorOrders = orders.filter(o => o.vendor_id === vendor.id);

                // Group orders by date
                const ordersByDate = {};
                let totalPending = 0;

                vendorOrders.forEach(order => {
                    const orderDate = order.created_at?.split('T')[0] || 'unknown';
                    if (!ordersByDate[orderDate]) {
                        ordersByDate[orderDate] = { count: 0, amount: 0 };
                    }
                    // Check if this order is already paid
                    const isPaid = payments.some(p =>
                        p.order_ids?.includes(order.id) && p.status === 'COMPLETED'
                    );
                    if (!isPaid) {
                        ordersByDate[orderDate].count++;
                        ordersByDate[orderDate].amount += order.total_vendor_cost || 0;
                        totalPending += order.total_vendor_cost || 0;
                    }
                });

                // Get total paid amount
                const vendorPayments = payments.filter(p => p.vendor_id === vendor.id && p.status === 'COMPLETED');
                const totalPaid = vendorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                return {
                    vendor_id: vendor.id,
                    vendor_name: vendor.name,
                    vendor_phone: vendor.phone,
                    vendor_email: vendor.email,
                    vendor_address: vendor.address,
                    pending_amount: totalPending,
                    total_paid: totalPaid,
                    pending_by_date: ordersByDate,
                    pending_orders_count: vendorOrders.filter(o =>
                        !payments.some(p => p.order_ids?.includes(o.id) && p.status === 'COMPLETED')
                    ).length
                };
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(vendorSummary)
            };
        }

        // GET /vendor-payments/ledger/:vendorId - Get ledger for specific vendor
        if (httpMethod === 'GET' && path.includes('/ledger/')) {
            const pathParts = path.split('/');
            const vendorId = pathParts[pathParts.length - 1];

            if (isKitchen) {
                const kitchenVendorId = user.vendor_id || user.kitchen_id || '';
                if (!kitchenVendorId || kitchenVendorId !== vendorId) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'Unauthorized vendor access' })
                    };
                }
            }

            const startDate = event.queryStringParameters?.startDate;
            const endDate = event.queryStringParameters?.endDate;

            // Default to last week if no dates provided
            const dateRange = (startDate && endDate)
                ? { startDate, endDate }
                : getWeekRange();

            // Get vendor info
            const vendorResult = await dynamodb.send(new GetCommand({
                TableName: VENDORS_TABLE,
                Key: { id: vendorId }
            }));
            const vendor = vendorResult.Item;

            if (!vendor) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Vendor not found' })
                };
            }

            // Get all RECEIVED orders for this vendor (only received orders count in financials)
            const ordersResult = await dynamodb.send(new ScanCommand({
                TableName: ORDERS_TABLE,
                FilterExpression: 'vendor_id = :vendorId AND #status = :received',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':vendorId': vendorId,
                    ':received': 'RECEIVED'
                }
            }));
            let orders = ordersResult.Items || [];

            // Get all payments for this vendor
            const paymentsResult = await dynamodb.send(new ScanCommand({
                TableName: PAYMENTS_TABLE,
                FilterExpression: 'vendor_id = :vendorId',
                ExpressionAttributeValues: { ':vendorId': vendorId }
            }));
            const payments = paymentsResult.Items || [];

            // Calculate opening balance (unpaid RECEIVED orders before start date)
            const ordersBeforeRange = orders.filter(o => {
                const orderDate = o.created_at?.split('T')[0];
                return orderDate < dateRange.startDate;
            });

            let openingBalance = 0;
            ordersBeforeRange.forEach(order => {
                const isPaid = payments.some(p =>
                    p.order_ids?.includes(order.id) && p.status === 'COMPLETED'
                );
                if (!isPaid) {
                    openingBalance += order.total_vendor_cost || 0;
                }
            });

            // Filter orders within date range
            const ordersInRange = orders.filter(o => {
                const orderDate = o.created_at?.split('T')[0];
                return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
            });

            // Build ledger entries
            const ledgerEntries = ordersInRange.map(order => {
                const payment = payments.find(p =>
                    p.order_ids?.includes(order.id) && p.status === 'COMPLETED'
                );

                return {
                    id: order.id,
                    order_number: order.order_number,
                    date: order.created_at?.split('T')[0],
                    franchise_name: order.franchise_name,
                    status: order.status,
                    amount: order.total_vendor_cost || 0,
                    is_paid: !!payment,
                    paid_date: payment?.paid_date || null,
                    payment_id: payment?.id || null,
                    created_at: order.created_at
                };
            });

            // Sort by date
            ledgerEntries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            // Calculate totals
            const totalInRange = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);
            const paidInRange = ledgerEntries.filter(e => e.is_paid).reduce((sum, e) => sum + e.amount, 0);
            const unpaidInRange = totalInRange - paidInRange;
            const closingBalance = openingBalance + unpaidInRange;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    vendor,
                    dateRange,
                    openingBalance,
                    totalInRange,
                    paidInRange,
                    unpaidInRange,
                    closingBalance,
                    ledger: ledgerEntries
                })
            };
        }

        // GET /vendor-payments/history - Get payment history
        if (httpMethod === 'GET' && path.includes('/history')) {
            let vendorId = event.queryStringParameters?.vendorId;

            // Kitchen users can only see their own payment history
            if (isKitchen) {
                const kitchenVendorId = user.vendor_id || user.kitchen_id || '';
                if (!kitchenVendorId) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'No vendor assigned to this kitchen' })
                    };
                }
                vendorId = kitchenVendorId; // Force filter to their vendor only
            }

            let filterExpression = '#status = :status';
            let expressionValues = { ':status': 'COMPLETED' };

            if (vendorId) {
                filterExpression += ' AND vendor_id = :vendorId';
                expressionValues[':vendorId'] = vendorId;
            }

            const paymentsResult = await dynamodb.send(new ScanCommand({
                TableName: PAYMENTS_TABLE,
                FilterExpression: filterExpression,
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: expressionValues
            }));

            const payments = paymentsResult.Items || [];

            // Sort by paid_date desc
            payments.sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(payments)
            };
        }

        // POST /vendor-payments - Create a new payment
        if (httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { vendor_id, order_ids, amount, period_start, period_end, payment_reference, notes } = body;

            if (!vendor_id || !order_ids || !amount || !payment_reference) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'vendor_id, order_ids, amount, and payment_reference are required' })
                };
            }

            // Get vendor info
            const vendorResult = await dynamodb.send(new GetCommand({
                TableName: VENDORS_TABLE,
                Key: { id: vendor_id }
            }));
            const vendor = vendorResult.Item;

            if (!vendor) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Vendor not found' })
                };
            }

            const payment = {
                id: generateId(),
                vendor_id,
                vendor_name: vendor.name,
                order_ids,
                order_count: order_ids.length,
                amount,
                period_start,
                period_end,
                payment_reference,
                notes,
                status: 'COMPLETED',
                paid_date: new Date().toISOString(),
                paid_by: user.userId,
                paid_by_name: user.name,
                created_at: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: PAYMENTS_TABLE,
                Item: payment
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    message: 'Payment recorded successfully',
                    payment
                })
            };
        }

        // GET /vendor-payments/:id - Get single payment details
        if (httpMethod === 'GET') {
            const pathParts = path.split('/');
            const paymentId = pathParts[pathParts.length - 1];

            if (paymentId && paymentId !== 'vendor-payments') {
                const paymentResult = await dynamodb.send(new GetCommand({
                    TableName: PAYMENTS_TABLE,
                    Key: { id: paymentId }
                }));

                if (!paymentResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Payment not found' })
                    };
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(paymentResult.Item)
                };
            }
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};
