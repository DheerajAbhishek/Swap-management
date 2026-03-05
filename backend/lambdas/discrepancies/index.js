const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const DISCREPANCIES_TABLE = 'supply_discrepancies';
const NOTIFICATIONS_TABLE = 'supply_notifications';
const USERS_TABLE = 'supply_users';
const ORDERS_TABLE = 'supply_orders';
const FRANCHISES_TABLE = 'supply_franchises';

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
            TableName: FRANCHISES_TABLE,
            Key: { id: franchiseId }
        }));
        return result.Item?.vendor_id || null;
    } catch (err) {
        console.error('Failed to get franchise vendor:', err);
        return null;
    }
}

// Get franchise users for notifications
async function getFranchiseUsers(franchiseId) {
    try {
        const result = await dynamodb.send(new ScanCommand({
            TableName: USERS_TABLE,
            FilterExpression: 'franchise_id = :franchiseId AND (#role = :franchise OR #role = :staff)',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: {
                ':franchiseId': franchiseId,
                ':franchise': 'FRANCHISE',
                ':staff': 'FRANCHISE_STAFF'
            }
        }));
        return result.Items || [];
    } catch (err) {
        console.error('Failed to get franchise users:', err);
        return [];
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

            // Filter out soft-deleted items (unless admin explicitly wants to see them)
            const showDeleted = event.queryStringParameters?.show_deleted === 'true';
            if (!showDeleted || user.role !== 'ADMIN') {
                discrepancies = discrepancies.filter(d => !d.deleted);
            }

            // Filter based on role
            if (user.role === 'FRANCHISE' || user.role === 'FRANCHISE_STAFF') {
                // Franchise only sees their own discrepancies
                discrepancies = discrepancies.filter(d => d.franchise_id === user.franchise_id);
            } else if (user.role === 'KITCHEN' || user.role === 'KITCHEN_STAFF') {
                // Kitchen sees discrepancies from their vendor
                const vendorId = user.vendor_id || user.userId;
                discrepancies = discrepancies.filter(d => d.vendor_id === vendorId);
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

            // Get vendor_id from the order (more accurate than franchise lookup)
            let vendorId = null;
            let vendorName = null;
            if (body.order_id) {
                try {
                    const orderResult = await dynamodb.send(new GetCommand({
                        TableName: ORDERS_TABLE,
                        Key: { id: body.order_id }
                    }));
                    if (orderResult.Item) {
                        vendorId = orderResult.Item.vendor_id;
                        vendorName = orderResult.Item.vendor_name;
                    }
                } catch (err) {
                    console.error('Failed to get order vendor:', err);
                }
            }

            // Get item price from franchise's price table
            let itemPrice = 0;
            try {
                const franchiseResult = await dynamodb.send(new GetCommand({
                    TableName: FRANCHISES_TABLE,
                    Key: { id: user.franchise_id }
                }));

                if (franchiseResult.Item && franchiseResult.Item.items) {
                    const item = franchiseResult.Item.items.find(i => i.name === body.item_name);
                    if (item) {
                        itemPrice = item.price || 0;
                    }
                }
            } catch (err) {
                console.error('Failed to get item price:', err);
            }

            // Calculate difference and determine type
            const orderedQty = body.ordered_qty || 0;
            const receivedQty = body.received_qty || 0;
            const difference = orderedQty - receivedQty;
            const discrepancyType = difference > 0 ? 'SHORTAGE' : (difference < 0 ? 'OVERAGE' : 'NONE');

            // Calculate financial adjustment (positive for shortage reduction, negative for overage increase)
            const adjustmentAmount = Math.abs(difference) * itemPrice;

            const discrepancy = {
                id: generateId(),
                order_id: body.order_id,
                order_number: body.order_number,
                franchise_id: user.franchise_id,
                franchise_name: user.franchise_name,
                vendor_id: vendorId || null, // Add vendor_id for easier filtering
                vendor_name: vendorName || null,
                item_name: body.item_name,
                ordered_qty: orderedQty,
                received_qty: receivedQty,
                difference: difference, // Positive = shortage, Negative = overage
                discrepancy_type: discrepancyType, // 'SHORTAGE' or 'OVERAGE'
                item_price: itemPrice, // Store franchise price for calculation
                adjustment_amount: adjustmentAmount, // Amount to adjust order cost
                uom: body.uom,
                notes: body.notes || '',
                photos: body.photos || [], // Store photo URLs
                reported_by: user.userId,
                reported_by_name: user.name || 'Franchise Staff',
                // Two-step resolution tracking
                vendor_acknowledged: false,
                vendor_acknowledged_at: null,
                vendor_acknowledged_by: null,
                vendor_acknowledged_by_name: null,
                vendor_notes: '',
                franchise_closed: false,
                franchise_closed_at: null,
                franchise_closed_by: null,
                franchise_closed_by_name: null,
                franchise_notes: '',
                // Backward compatibility: resolved = true when BOTH steps complete
                resolved: false,
                created_at: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: DISCREPANCIES_TABLE,
                Item: discrepancy
            }));

            // Notify only the kitchen assigned to this franchise
            if (vendorId) {
                const kitchenUsers = await getKitchenUsers(vendorId);
                const discrepancyDesc = discrepancyType === 'SHORTAGE'
                    ? `received less (ordered: ${orderedQty}, received: ${receivedQty})`
                    : `received more (ordered: ${orderedQty}, received: ${receivedQty})`;

                for (const kitchenUser of kitchenUsers) {
                    await createNotification(
                        kitchenUser.id,
                        'DISCREPANCY_NEW',
                        `${discrepancyType === 'SHORTAGE' ? 'Shortage' : 'Overage'} Reported`,
                        `${user.franchise_name} ${discrepancyDesc} for ${body.item_name}`,
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

        // PUT /discrepancies/{id}/resolve (Legacy - for backward compatibility, now sets both flags)
        if (httpMethod === 'PUT' && path.includes('/resolve')) {
            // Allow ADMIN and KITCHEN (vendor) to resolve
            if (user.role !== 'ADMIN' && user.role !== 'KITCHEN' && user.role !== 'KITCHEN_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only admin and kitchen can resolve discrepancies' })
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

            // Legacy endpoint: Set both vendor and franchise flags (admin override)
            const timestamp = new Date().toISOString();
            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET resolved = :resolved, resolved_by = :resolvedBy, resolved_at = :resolvedAt, resolution_notes = :notes, vendor_acknowledged = :ack, vendor_acknowledged_at = :ackTime, vendor_acknowledged_by = :ackBy, vendor_acknowledged_by_name = :ackName, vendor_notes = :vendorNotes, franchise_closed = :closed, franchise_closed_at = :closedTime, franchise_closed_by = :closedBy, franchise_closed_by_name = :closedName, franchise_notes = :franchiseNotes',
                ExpressionAttributeValues: {
                    ':resolved': true,
                    ':resolvedBy': user.userId,
                    ':resolvedAt': timestamp,
                    ':notes': body.resolution_notes || '',
                    ':ack': true,
                    ':ackTime': timestamp,
                    ':ackBy': user.userId,
                    ':ackName': user.name || 'Admin',
                    ':vendorNotes': body.resolution_notes || 'Resolved by admin',
                    ':closed': true,
                    ':closedTime': timestamp,
                    ':closedBy': user.userId,
                    ':closedName': user.name || 'Admin',
                    ':franchiseNotes': 'Auto-closed by admin override'
                }
            }));

            // Notify the franchise who reported the discrepancy
            if (discrepancy && discrepancy.reported_by) {
                await createNotification(
                    discrepancy.reported_by,
                    'DISCREPANCY_RESOLVED',
                    'Discrepancy Resolved',
                    `Your discrepancy for ${discrepancy.item_name} has been resolved by admin`,
                    '/franchise/orders',
                    discrepancyId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Discrepancy resolved (admin override)' })
            };
        }

        // PUT /discrepancies/{id}/vendor-acknowledge - Vendor acknowledges and promises to send items
        if (httpMethod === 'PUT' && path.includes('/vendor-acknowledge')) {
            // Only KITCHEN (vendor) can acknowledge
            if (user.role !== 'KITCHEN' && user.role !== 'KITCHEN_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only vendor/kitchen can acknowledge discrepancies' })
                };
            }

            const discrepancyId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            if (!body.vendor_notes || !body.vendor_notes.trim()) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'vendor_notes is required (e.g., "Will send items with next delivery")' })
                };
            }

            // Get discrepancy first
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            if (!discrepancy) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Discrepancy not found' })
                };
            }

            // Update vendor acknowledgment
            const timestamp = new Date().toISOString();
            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET vendor_acknowledged = :ack, vendor_acknowledged_at = :time, vendor_acknowledged_by = :by, vendor_acknowledged_by_name = :byName, vendor_notes = :notes',
                ExpressionAttributeValues: {
                    ':ack': true,
                    ':time': timestamp,
                    ':by': user.userId,
                    ':byName': user.name || 'Vendor',
                    ':notes': body.vendor_notes
                }
            }));

            // Notify franchise users that vendor has acknowledged
            const franchiseUsers = await getFranchiseUsers(discrepancy.franchise_id);
            for (const franchiseUser of franchiseUsers) {
                await createNotification(
                    franchiseUser.id,
                    'DISCREPANCY_VENDOR_ACKNOWLEDGED',
                    'Vendor Acknowledged Discrepancy',
                    `Vendor acknowledged discrepancy for ${discrepancy.item_name}: "${body.vendor_notes}"`,
                    '/franchise-staff/orders',
                    discrepancyId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Discrepancy acknowledged by vendor',
                    status: 'VENDOR_ACKNOWLEDGED'
                })
            };
        }

        // PUT /discrepancies/{id}/franchise-close - Franchise confirms items received and closes discrepancy
        if (httpMethod === 'PUT' && path.includes('/franchise-close')) {
            // Only FRANCHISE can close
            if (user.role !== 'FRANCHISE' && user.role !== 'FRANCHISE_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise can close discrepancies' })
                };
            }

            const discrepancyId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            // Get discrepancy first
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            if (!discrepancy) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Discrepancy not found' })
                };
            }

            // Check if vendor has acknowledged
            if (!discrepancy.vendor_acknowledged) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Cannot close discrepancy: Vendor has not acknowledged yet',
                        status: 'WAITING_FOR_VENDOR'
                    })
                };
            }

            // Get the order to adjust costs
            let orderUpdated = false;
            if (discrepancy.order_id && discrepancy.adjustment_amount && discrepancy.discrepancy_type) {
                try {
                    const orderResult = await dynamodb.send(new GetCommand({
                        TableName: ORDERS_TABLE,
                        Key: { id: discrepancy.order_id }
                    }));

                    if (orderResult.Item) {
                        const order = orderResult.Item;
                        let newTotalVendorCost = order.total_vendor_cost || 0;
                        let newTotalAmount = order.total_amount || 0;
                        let currentAdjustment = order.adjustment_amount || 0;

                        // Calculate adjustment amount with sign (positive for overage, negative for shortage)
                        let thisAdjustment = 0;
                        // For SHORTAGE: reduce cost (received less than ordered)
                        // For OVERAGE: increase cost (received more than ordered)
                        if (discrepancy.discrepancy_type === 'SHORTAGE') {
                            newTotalVendorCost -= discrepancy.adjustment_amount;
                            newTotalAmount -= discrepancy.adjustment_amount;
                            thisAdjustment = -discrepancy.adjustment_amount; // Negative for shortage
                        } else if (discrepancy.discrepancy_type === 'OVERAGE') {
                            newTotalVendorCost += discrepancy.adjustment_amount;
                            newTotalAmount += discrepancy.adjustment_amount;
                            thisAdjustment = discrepancy.adjustment_amount; // Positive for overage
                        }

                        // Update cumulative adjustment
                        const totalAdjustment = currentAdjustment + thisAdjustment;

                        // Update order with adjusted costs
                        await dynamodb.send(new UpdateCommand({
                            TableName: ORDERS_TABLE,
                            Key: { id: discrepancy.order_id },
                            UpdateExpression: 'SET total_vendor_cost = :vendorCost, total_amount = :totalAmount, cost_adjusted = :costAdjusted, adjustment_amount = :adjustmentAmount',
                            ExpressionAttributeValues: {
                                ':vendorCost': Math.max(0, newTotalVendorCost), // Ensure non-negative
                                ':totalAmount': Math.max(0, newTotalAmount),
                                ':costAdjusted': true,
                                ':adjustmentAmount': totalAdjustment
                            }
                        }));

                        orderUpdated = true;
                        console.log(`Order ${discrepancy.order_id} cost adjusted: ${discrepancy.discrepancy_type} of ₹${discrepancy.adjustment_amount}`);
                    }
                } catch (err) {
                    console.error('Failed to update order costs:', err);
                    // Continue with discrepancy closure even if order update fails
                }
            }

            // Update franchise closure
            const timestamp = new Date().toISOString();
            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET franchise_closed = :closed, franchise_closed_at = :time, franchise_closed_by = :by, franchise_closed_by_name = :byName, franchise_notes = :notes, resolved = :resolved, resolved_at = :resolvedAt',
                ExpressionAttributeValues: {
                    ':closed': true,
                    ':time': timestamp,
                    ':by': user.userId,
                    ':byName': user.name || 'Franchise',
                    ':notes': body.franchise_notes || 'Items received',
                    ':resolved': true, // Now fully resolved
                    ':resolvedAt': timestamp
                }
            }));

            // Notify vendor that franchise has closed the discrepancy
            const vendorId = await getFranchiseVendor(discrepancy.franchise_id);
            if (vendorId) {
                const kitchenUsers = await getKitchenUsers(vendorId);
                for (const kitchenUser of kitchenUsers) {
                    await createNotification(
                        kitchenUser.id,
                        'DISCREPANCY_FRANCHISE_CLOSED',
                        'Discrepancy Closed by Franchise',
                        `${discrepancy.franchise_name} confirmed receipt and closed discrepancy for ${discrepancy.item_name}`,
                        '/kitchen/discrepancies',
                        discrepancyId
                    );
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Discrepancy closed by franchise - fully resolved',
                    status: 'FULLY_RESOLVED',
                    orderUpdated,
                    adjustmentAmount: discrepancy.adjustment_amount || 0,
                    discrepancyType: discrepancy.discrepancy_type || 'UNKNOWN'
                })
            };
        }

        // PUT /discrepancies/{id}/vendor-reject - Vendor rejects the discrepancy
        if (httpMethod === 'PUT' && path.includes('/vendor-reject')) {
            // Only KITCHEN (vendor) can reject
            if (user.role !== 'KITCHEN' && user.role !== 'KITCHEN_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only vendor/kitchen can reject discrepancies' })
                };
            }

            const discrepancyId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            if (!body.rejection_reason || !body.rejection_reason.trim()) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'rejection_reason is required' })
                };
            }

            // Get discrepancy first
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            if (!discrepancy) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Discrepancy not found' })
                };
            }

            // Update with rejection status
            const timestamp = new Date().toISOString();
            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET vendor_rejected = :rejected, vendor_rejected_at = :time, vendor_rejected_by = :by, vendor_rejected_by_name = :byName, rejection_reason = :reason, franchise_closed = :closed, resolved = :resolved',
                ExpressionAttributeValues: {
                    ':rejected': true,
                    ':time': timestamp,
                    ':by': user.userId,
                    ':byName': user.name || 'Vendor',
                    ':reason': body.rejection_reason,
                    ':closed': true, // Close the discrepancy as rejected
                    ':resolved': true // Mark as resolved (rejected)
                }
            }));

            // Notify franchise users that vendor has rejected
            const franchiseUsers = await getFranchiseUsers(discrepancy.franchise_id);
            for (const franchiseUser of franchiseUsers) {
                await createNotification(
                    franchiseUser.id,
                    'DISCREPANCY_VENDOR_REJECTED',
                    'Vendor Rejected Discrepancy',
                    `Vendor rejected discrepancy for ${discrepancy.item_name}: "${body.rejection_reason}"`,
                    '/franchise-staff/orders',
                    discrepancyId
                );
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Discrepancy rejected by vendor',
                    status: 'REJECTED'
                })
            };
        }

        // DELETE /discrepancies/{id} - Delete discrepancy (Franchise: pending only, Admin: anytime)
        if (httpMethod === 'DELETE') {
            const discrepancyId = event.pathParameters?.id;

            // Get discrepancy first
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            if (!discrepancy) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Discrepancy not found' })
                };
            }

            // Check permissions
            if (user.role === 'FRANCHISE' || user.role === 'FRANCHISE_STAFF') {
                // Franchise can only delete if pending (not yet vendor acknowledged)
                if (discrepancy.vendor_acknowledged) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({
                            error: 'Cannot delete: Vendor has already acknowledged this discrepancy',
                            status: 'VENDOR_ACKNOWLEDGED'
                        })
                    };
                }
                // Franchise can only delete their own discrepancies
                if (discrepancy.franchise_id !== user.franchise_id) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'Unauthorized to delete this discrepancy' })
                    };
                }
            } else if (user.role !== 'ADMIN') {
                // Only franchise and admin can delete
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise or admin can delete discrepancies' })
                };
            }

            // Check if soft delete or hard delete is requested (admin only)
            const bodyData = event.body ? JSON.parse(event.body) : {};
            const softDelete = bodyData.soft_delete;

            if (softDelete && user.role === 'ADMIN') {
                // Soft delete: Mark as deleted but keep record
                const timestamp = new Date().toISOString();
                await dynamodb.send(new UpdateCommand({
                    TableName: DISCREPANCIES_TABLE,
                    Key: { id: discrepancyId },
                    UpdateExpression: 'SET deleted = :deleted, deleted_at = :time, deleted_by = :by, deleted_by_name = :byName',
                    ExpressionAttributeValues: {
                        ':deleted': true,
                        ':time': timestamp,
                        ':by': user.userId,
                        ':byName': user.name || 'Admin'
                    }
                }));

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Discrepancy soft deleted (audit trail preserved)',
                        type: 'SOFT_DELETE'
                    })
                };
            } else {
                // Hard delete: Remove from database (default for franchise, optional for admin)
                await dynamodb.send(new DeleteCommand({
                    TableName: DISCREPANCIES_TABLE,
                    Key: { id: discrepancyId }
                }));

                // Notify vendor that discrepancy was deleted (only if they exist)
                if (discrepancy.vendor_id) {
                    const kitchenUsers = await getKitchenUsers(discrepancy.vendor_id);
                    for (const kitchenUser of kitchenUsers) {
                        await createNotification(
                            kitchenUser.id,
                            'DISCREPANCY_DELETED',
                            'Discrepancy Deleted',
                            `${user.role === 'ADMIN' ? 'Admin' : discrepancy.franchise_name} deleted discrepancy for ${discrepancy.item_name}`,
                            '/kitchen/discrepancies',
                            discrepancyId
                        );
                    }
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Discrepancy permanently deleted',
                        type: 'HARD_DELETE'
                    })
                };
            }
        }

        // PUT /discrepancies/{id}/force-close - Admin force closes discrepancy
        if (httpMethod === 'PUT' && path.includes('/force-close')) {
            // Only ADMIN can force close
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only admin can force close discrepancies' })
                };
            }

            const discrepancyId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');

            // Get discrepancy first
            const discResult = await dynamodb.send(new GetCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId }
            }));
            const discrepancy = discResult.Item;

            if (!discrepancy) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Discrepancy not found' })
                };
            }

            // Force close with admin override
            const timestamp = new Date().toISOString();
            await dynamodb.send(new UpdateCommand({
                TableName: DISCREPANCIES_TABLE,
                Key: { id: discrepancyId },
                UpdateExpression: 'SET force_closed = :closed, force_closed_at = :time, force_closed_by = :by, force_closed_by_name = :byName, force_close_reason = :reason, franchise_closed = :fclosed, resolved = :resolved',
                ExpressionAttributeValues: {
                    ':closed': true,
                    ':time': timestamp,
                    ':by': user.userId,
                    ':byName': user.name || 'Admin',
                    ':reason': body.reason || 'Admin override',
                    ':fclosed': true,
                    ':resolved': true
                }
            }));

            // Notify franchise and vendor
            const franchiseUsers = await getFranchiseUsers(discrepancy.franchise_id);
            for (const franchiseUser of franchiseUsers) {
                await createNotification(
                    franchiseUser.id,
                    'DISCREPANCY_FORCE_CLOSED',
                    'Discrepancy Force Closed',
                    `Admin force closed discrepancy for ${discrepancy.item_name}`,
                    '/franchise-staff/orders',
                    discrepancyId
                );
            }

            if (discrepancy.vendor_id) {
                const kitchenUsers = await getKitchenUsers(discrepancy.vendor_id);
                for (const kitchenUser of kitchenUsers) {
                    await createNotification(
                        kitchenUser.id,
                        'DISCREPANCY_FORCE_CLOSED',
                        'Discrepancy Force Closed',
                        `Admin force closed discrepancy for ${discrepancy.item_name}`,
                        '/kitchen/discrepancies',
                        discrepancyId
                    );
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Discrepancy force closed by admin',
                    status: 'FORCE_CLOSED'
                })
            };
        }

        // GET /discrepancies/order/{orderId} - Get discrepancies for an order
        if (httpMethod === 'GET' && path.includes('/order/')) {
            const orderId = event.pathParameters?.orderId;

            const result = await dynamodb.send(new ScanCommand({
                TableName: DISCREPANCIES_TABLE,
                FilterExpression: 'order_id = :orderId AND (attribute_not_exists(deleted) OR deleted = :notDeleted)',
                ExpressionAttributeValues: { ':orderId': orderId, ':notDeleted': false }
            }));

            const discrepancies = result.Items || [];
            // Check franchise_closed for the new two-step workflow
            const hasUnresolved = discrepancies.some(d => !d.franchise_closed);
            const hasVendorAcknowledged = discrepancies.filter(d => d.vendor_acknowledged && !d.franchise_closed).length;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    discrepancies,
                    hasUnresolved,
                    hasVendorAcknowledged,
                    count: discrepancies.length,
                    unresolvedCount: discrepancies.filter(d => !d.franchise_closed).length,
                    vendorAcknowledgedCount: discrepancies.filter(d => d.vendor_acknowledged && !d.franchise_closed).length
                })
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
