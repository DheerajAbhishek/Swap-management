const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE = 'supply_orders';
const ORDER_ITEMS_TABLE = 'supply_order_items';
const NOTIFICATIONS_TABLE = 'supply_notifications';
const USERS_TABLE = 'supply_users';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Generate unique ID
function generateId() {
    return 'ord-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Generate order number
function generateOrderNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PO-${date}-${random}`;
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

// Create notification helper
async function createNotification(userId, type, title, message, link = '', referenceId = '') {
    try {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            type,
            title,
            message,
            link,
            reference_id: referenceId,
            is_read: false,
            created_at: new Date().toISOString()
        };
        await dynamodb.send(new PutCommand({
            TableName: NOTIFICATIONS_TABLE,
            Item: notification
        }));
        console.log('Notification created:', notification.id);
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
}

// Get kitchen users for notifications - filter by vendor_id
async function getKitchenUsers(vendorId = null) {
    try {
        let filterExpression = '#role = :role OR #role = :staffRole';
        let expressionAttributeValues = { ':role': 'KITCHEN', ':staffRole': 'KITCHEN_STAFF' };
        
        // If vendorId provided, filter to only that kitchen's users
        if (vendorId) {
            filterExpression = '(#role = :role OR #role = :staffRole) AND vendor_id = :vendorId';
            expressionAttributeValues[':vendorId'] = vendorId;
        }
        
        const result = await dynamodb.send(new ScanCommand({
            TableName: USERS_TABLE,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: expressionAttributeValues
        }));
        return result.Items || [];
    } catch (err) {
        console.error('Failed to get kitchen users:', err);
        return [];
    }
}

// Get franchise's assigned vendor
async function getFranchiseVendor(franchiseId) {
    try {
        const result = await dynamodb.send(new GetCommand({
            TableName: 'supply_franchises',
            Key: { id: franchiseId }
        }));
        return result.Item?.vendor_id || null;
    } catch (err) {
        console.error('Failed to get franchise vendor:', err);
        return null;
    }
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

    try {
        // GET /orders/received-items - Get received items for reporting
        if (httpMethod === 'GET' && path.includes('/received-items')) {
            const startDate = event.queryStringParameters?.startDate;
            const endDate = event.queryStringParameters?.endDate;
            const franchiseId = event.queryStringParameters?.franchiseId;

            // Get received orders
            const ordersResult = await dynamodb.send(new ScanCommand({
                TableName: ORDERS_TABLE,
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':status': 'RECEIVED' }
            }));

            let orders = ordersResult.Items || [];

            // Filter by franchise if specified or if user is franchise
            if (franchiseId || user.role === 'FRANCHISE') {
                const filterFranchise = franchiseId || user.franchise_id;
                orders = orders.filter(o => o.franchise_id === filterFranchise);
            }

            // Filter by date range
            if (startDate && endDate) {
                orders = orders.filter(o => {
                    const receivedDate = o.received_at?.split('T')[0];
                    return receivedDate >= startDate && receivedDate <= endDate;
                });
            }

            // Get items for each order
            const receivedItems = [];
            for (const order of orders) {
                const itemsResult = await dynamodb.send(new QueryCommand({
                    TableName: ORDER_ITEMS_TABLE,
                    IndexName: 'order-index',
                    KeyConditionExpression: 'order_id = :orderId',
                    ExpressionAttributeValues: { ':orderId': order.id }
                }));

                for (const item of (itemsResult.Items || [])) {
                    receivedItems.push({
                        ...item,
                        order_number: order.order_number,
                        franchise_name: order.franchise_name,
                        received_at: order.received_at
                    });
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(receivedItems)
            };
        }

        // GET /orders - List orders
        if (httpMethod === 'GET' && !path.includes('/orders/')) {
            let orders;

            if (user.role === 'FRANCHISE' || user.role === 'FRANCHISE_STAFF') {
                // Franchise and staff see their franchise orders
                const result = await dynamodb.send(new QueryCommand({
                    TableName: ORDERS_TABLE,
                    IndexName: 'franchise-index',
                    KeyConditionExpression: 'franchise_id = :fid',
                    ExpressionAttributeValues: { ':fid': user.franchise_id }
                }));
                orders = result.Items || [];
            } else if (user.role === 'KITCHEN' || user.role === 'KITCHEN_STAFF') {
                // Kitchen sees orders that were placed TO them (based on order's vendor_id)
                const vendorId = user.vendor_id || user.kitchen_id || user.userId;
                
                // Get orders where vendor_id matches this kitchen
                const result = await dynamodb.send(new ScanCommand({
                    TableName: ORDERS_TABLE,
                    FilterExpression: 'vendor_id = :vendorId',
                    ExpressionAttributeValues: { ':vendorId': vendorId }
                }));
                orders = result.Items || [];
            } else {
                // Admin sees all orders
                const result = await dynamodb.send(new ScanCommand({
                    TableName: ORDERS_TABLE
                }));
                orders = result.Items || [];
            }

            // Get items for each order
            for (const order of orders) {
                const itemsResult = await dynamodb.send(new QueryCommand({
                    TableName: ORDER_ITEMS_TABLE,
                    IndexName: 'order-index',
                    KeyConditionExpression: 'order_id = :orderId',
                    ExpressionAttributeValues: { ':orderId': order.id }
                }));
                order.items = itemsResult.Items || [];
            }

            // Sort by created_at desc
            orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(orders)
            };
        }

        // POST /orders - Create order
        if (httpMethod === 'POST' && !path.includes('/orders/')) {
            // Allow both franchise owners and franchise staff to create orders
            if (user.role !== 'FRANCHISE' && user.role !== 'FRANCHISE_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchises can create orders' })
                };
            }

            const body = JSON.parse(event.body || '{}');
            const orderId = generateId();
            const orderNumber = generateOrderNumber();

            // Get vendor info from franchise - store at order time for history
            let vendorId = '';
            let vendorName = '';
            try {
                const franchiseResult = await dynamodb.send(new GetCommand({
                    TableName: 'supply_franchises',
                    Key: { id: user.franchise_id }
                }));
                if (franchiseResult.Item) {
                    vendorId = franchiseResult.Item.vendor_id || '';
                    vendorName = franchiseResult.Item.vendor_name || '';
                }
            } catch (err) {
                console.log('Could not fetch franchise vendor info:', err);
            }

            // Calculate total
            let totalAmount = 0;
            const orderItems = [];

            for (const item of (body.items || [])) {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                totalAmount += lineTotal;

                const orderItem = {
                    id: 'oi-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    order_id: orderId,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    ordered_qty: item.quantity,
                    uom: item.uom,
                    unit_price: item.unit_price,
                    line_total: lineTotal
                };

                orderItems.push(orderItem);

                await dynamodb.send(new PutCommand({
                    TableName: ORDER_ITEMS_TABLE,
                    Item: orderItem
                }));
            }

            const order = {
                id: orderId,
                order_number: orderNumber,
                franchise_id: user.franchise_id,
                franchise_name: user.franchise_name,
                vendor_id: vendorId, // Kitchen ID at order time
                vendor_name: vendorName, // Kitchen name at order time
                status: 'PLACED',
                total_amount: totalAmount,
                created_at: new Date().toISOString(),
                created_by: user.userId,
                created_by_name: user.name,
                created_by_role: user.role,
                created_by_employee_id: user.employee_id || null
            };

            await dynamodb.send(new PutCommand({
                TableName: ORDERS_TABLE,
                Item: order
            }));

            // Notify the kitchen that was assigned at order time
            if (vendorId) {
                const kitchenUsers = await getKitchenUsers(vendorId);
                for (const kitchenUser of kitchenUsers) {
                    await createNotification(
                        kitchenUser.id,
                        'ORDER_NEW',
                        'New Order Received',
                        `Order ${orderNumber} from ${user.franchise_name} - Rs.${totalAmount.toFixed(2)}`,
                        '/kitchen/orders',
                        orderId
                    );
                }
            }

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ ...order, items: orderItems })
            };
        }

        // PUT /orders/{id}/accept
        if (httpMethod === 'PUT' && path.includes('/accept')) {
            // Allow kitchen owner and kitchen staff to accept orders
            if (user.role !== 'KITCHEN' && user.role !== 'KITCHEN_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only kitchen can accept orders' })
                };
            }

            const orderId = event.pathParameters?.id;

            // Get order details first
            const orderResult = await dynamodb.send(new GetCommand({
                TableName: ORDERS_TABLE,
                Key: { id: orderId }
            }));
            const order = orderResult.Item;

            await dynamodb.send(new UpdateCommand({
                TableName: ORDERS_TABLE,
                Key: { id: orderId },
                UpdateExpression: 'SET #status = :status, accepted_at = :time, accepted_by = :user, accepted_by_name = :userName',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':status': 'ACCEPTED',
                    ':time': new Date().toISOString(),
                    ':user': user.userId,
                    ':userName': user.name
                }
            }));

            // Notify franchise
            if (order) {
                await createNotification(
                    order.created_by,
                    'ORDER_STATUS',
                    'Order Accepted',
                    `Your order ${order.order_number} has been accepted by kitchen`,
                    '/franchise/orders',
                    orderId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Order accepted' })
            };
        }

        // PUT /orders/{id}/dispatch
        if (httpMethod === 'PUT' && path.includes('/dispatch')) {
            // Allow kitchen owner and kitchen staff to dispatch orders
            if (user.role !== 'KITCHEN' && user.role !== 'KITCHEN_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only kitchen can dispatch orders' })
                };
            }

            const orderId = event.pathParameters?.id;

            // Get order details first
            const orderResult = await dynamodb.send(new GetCommand({
                TableName: ORDERS_TABLE,
                Key: { id: orderId }
            }));
            const order = orderResult.Item;

            await dynamodb.send(new UpdateCommand({
                TableName: ORDERS_TABLE,
                Key: { id: orderId },
                UpdateExpression: 'SET #status = :status, dispatched_at = :time, dispatched_by = :user, dispatched_by_name = :userName',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':status': 'DISPATCHED',
                    ':time': new Date().toISOString(),
                    ':user': user.userId,
                    ':userName': user.name
                }
            }));

            // Notify franchise
            if (order) {
                await createNotification(
                    order.created_by,
                    'ORDER_STATUS',
                    'Order Dispatched',
                    `Your order ${order.order_number} has been dispatched`,
                    '/franchise/orders',
                    orderId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Order dispatched' })
            };
        }

        // PUT /orders/{id}/receive
        if (httpMethod === 'PUT' && path.includes('/receive')) {
            const orderId = event.pathParameters?.id;

            await dynamodb.send(new UpdateCommand({
                TableName: ORDERS_TABLE,
                Key: { id: orderId },
                UpdateExpression: 'SET #status = :status, received_at = :time, received_by = :user',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':status': 'RECEIVED',
                    ':time': new Date().toISOString(),
                    ':user': user.userId
                }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Order received' })
            };
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
