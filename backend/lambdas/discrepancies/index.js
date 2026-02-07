const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const DISCREPANCIES_TABLE = 'supply_discrepancies';
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
    return 'disc-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Get user from token
function getUserFromToken(event) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
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
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
}

// Get kitchen users for notifications - filter by vendor_id if provided
async function getKitchenUsers(vendorId = null) {
    try {
        let filterExpression = '#role = :role OR #role = :staffRole';
        let expressionAttributeValues = { ':role': 'KITCHEN', ':staffRole': 'KITCHEN_STAFF' };
        
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
        // GET /discrepancies - List all discrepancies
        if (httpMethod === 'GET' && !path.includes('/discrepancies/')) {
            const result = await dynamodb.send(new ScanCommand({
                TableName: DISCREPANCIES_TABLE
            }));

            let discrepancies = result.Items || [];

            // Filter based on role
            if (user.role === 'FRANCHISE' || user.role === 'FRANCHISE_STAFF') {
                // Franchise only sees their own discrepancies
                discrepancies = discrepancies.filter(d => d.franchise_id === user.franchise_id);
            } else if (user.role === 'KITCHEN' || user.role === 'KITCHEN_STAFF') {
                // Kitchen only sees discrepancies from their assigned franchises
                const vendorId = user.vendor_id || user.userId;
                const franchisesResult = await dynamodb.send(new ScanCommand({
                    TableName: 'supply_franchises',
                    FilterExpression: 'vendor_id = :vendorId',
                    ExpressionAttributeValues: { ':vendorId': vendorId }
                }));
                const assignedFranchiseIds = (franchisesResult.Items || []).map(f => f.id);
                discrepancies = discrepancies.filter(d => assignedFranchiseIds.includes(d.franchise_id));
            }
            // Admin sees all discrepancies (no filter)

            // Sort by created_at desc
            discrepancies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(discrepancies)
            };
        }

        // POST /discrepancies - Create discrepancy
        if (httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');

            const discrepancy = {
                id: generateId(),
                order_id: body.order_id,
                order_number: body.order_number,
                franchise_id: user.franchise_id,
                franchise_name: user.franchise_name,
                item_name: body.item_name,
                ordered_qty: body.ordered_qty,
                received_qty: body.received_qty,
                difference: (body.ordered_qty || 0) - (body.received_qty || 0),
                uom: body.uom,
                notes: body.notes || '',
                reported_by: user.userId,
                resolved: false,
                created_at: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: DISCREPANCIES_TABLE,
                Item: discrepancy
            }));

            // Notify only the kitchen assigned to this franchise
            const vendorId = await getFranchiseVendor(user.franchise_id);
            if (vendorId) {
                const kitchenUsers = await getKitchenUsers(vendorId);
                for (const kitchenUser of kitchenUsers) {
                    await createNotification(
                        kitchenUser.id,
                        'DISCREPANCY_NEW',
                        'Discrepancy Reported',
                        `${user.franchise_name} reported discrepancy for ${body.item_name}`,
                        '/kitchen/discrepancies',
                        discrepancy.id
                    );
                }
            }

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(discrepancy)
            };
        }

        // PUT /discrepancies/{id}/resolve
        if (httpMethod === 'PUT' && path.includes('/resolve')) {
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only admin can resolve discrepancies' })
                };
            }

            const discrepancyId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            // Get discrepancy first to get reporter info
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET resolved = :resolved, resolved_by = :resolvedBy, resolved_at = :resolvedAt, resolution_notes = :notes',
                ExpressionAttributeValues: {
                    ':resolved': true,
                    ':resolvedBy': user.userId,
                    ':resolvedAt': new Date().toISOString(),
                    ':notes': body.resolution_notes || ''
                }
            }));

            // Notify the franchise who reported the discrepancy
            if (discrepancy && discrepancy.reported_by) {
                await createNotification(
                    discrepancy.reported_by,
                    'DISCREPANCY_RESOLVED',
                    'Discrepancy Resolved',
                    `Your discrepancy for ${discrepancy.item_name} has been resolved`,
                    '/franchise/orders',
                    discrepancyId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Discrepancy resolved' })
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
