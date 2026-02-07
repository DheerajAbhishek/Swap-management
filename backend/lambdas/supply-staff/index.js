const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const STAFF_TABLE = 'supply_staff';
const USERS_TABLE = 'supply_users';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Simple password hashing
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate unique ID
function generateId(prefix = 'staff') {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
}

// Generate Employee ID
function generateEmployeeId(role) {
    const prefix = role === 'FRANCHISE_STAFF' ? 'FS' : 'KS';
    const num = Date.now().toString().slice(-6);
    return `${prefix}${num}`;
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
        // GET /staff - List staff members
        if (httpMethod === 'GET' && !path.match(/\/staff\/[^\/]+$/)) {
            const staffType = event.queryStringParameters?.type; // FRANCHISE_STAFF or KITCHEN_STAFF
            const parentId = event.queryStringParameters?.parentId; // franchise_id or kitchen_id

            let filterExpression = '';
            let expressionAttributeValues = {};
            let expressionAttributeNames = {};

            // Admin can see all staff
            if (user.role === 'ADMIN') {
                if (staffType) {
                    filterExpression = '#role = :role';
                    expressionAttributeNames['#role'] = 'role';
                    expressionAttributeValues[':role'] = staffType;
                }
                if (parentId) {
                    filterExpression += filterExpression ? ' AND parent_id = :parentId' : 'parent_id = :parentId';
                    expressionAttributeValues[':parentId'] = parentId;
                }
            } 
            // Franchise owner sees their staff
            else if (user.role === 'FRANCHISE') {
                filterExpression = '#role = :role AND parent_id = :parentId';
                expressionAttributeNames['#role'] = 'role';
                expressionAttributeValues[':role'] = 'FRANCHISE_STAFF';
                expressionAttributeValues[':parentId'] = user.franchise_id;
            }
            // Kitchen owner sees their staff
            else if (user.role === 'KITCHEN') {
                filterExpression = '#role = :role AND parent_id = :parentId';
                expressionAttributeNames['#role'] = 'role';
                expressionAttributeValues[':role'] = 'KITCHEN_STAFF';
                expressionAttributeValues[':parentId'] = user.userId;
            }
            else {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const scanParams = {
                TableName: STAFF_TABLE
            };

            if (filterExpression) {
                scanParams.FilterExpression = filterExpression;
                scanParams.ExpressionAttributeValues = expressionAttributeValues;
                if (Object.keys(expressionAttributeNames).length > 0) {
                    scanParams.ExpressionAttributeNames = expressionAttributeNames;
                }
            }

            const result = await dynamodb.send(new ScanCommand(scanParams));
            const staff = result.Items || [];

            // Sort by created_at desc
            staff.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(staff)
            };
        }

        // GET /staff/:id - Get single staff member
        if (httpMethod === 'GET' && path.match(/\/staff\/[^\/]+$/)) {
            const staffId = path.split('/').pop();

            const result = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Item)
            };
        }

        // POST /staff - Create new staff member
        if (httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { name, email, phone, password, role, photo } = body;

            if (!name || !email || !password || !role) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Name, email, password, and role are required' })
                };
            }

            // Validate role
            if (!['FRANCHISE_STAFF', 'KITCHEN_STAFF'].includes(role)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid staff role' })
                };
            }

            // Check permissions
            if (role === 'FRANCHISE_STAFF' && user.role !== 'ADMIN' && user.role !== 'FRANCHISE') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }
            if (role === 'KITCHEN_STAFF' && user.role !== 'ADMIN' && user.role !== 'KITCHEN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            // Check for duplicate email in users table
            const existingUser = await dynamodb.send(new QueryCommand({
                TableName: USERS_TABLE,
                IndexName: 'email-index',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email }
            }));

            if (existingUser.Items?.length > 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Email already exists' })
                };
            }

            // Determine parent_id and parent_name
            let parent_id, parent_name, vendor_id = '', vendor_name = '';
            if (role === 'FRANCHISE_STAFF') {
                parent_id = user.role === 'ADMIN' ? body.parent_id : user.franchise_id;
                parent_name = user.role === 'ADMIN' ? body.parent_name : user.franchise_name;
                
                // Get vendor info from franchise
                if (user.role === 'FRANCHISE') {
                    vendor_id = user.vendor_id || '';
                    vendor_name = user.vendor_name || '';
                } else if (body.parent_id) {
                    // Admin creating - need to look up franchise's vendor
                    try {
                        const franchiseResult = await dynamodb.send(new GetCommand({
                            TableName: 'supply_franchises',
                            Key: { id: body.parent_id }
                        }));
                        vendor_id = franchiseResult.Item?.vendor_id || '';
                        vendor_name = franchiseResult.Item?.vendor_name || '';
                    } catch (err) {
                        console.error('Failed to get franchise vendor:', err);
                    }
                }
            } else {
                parent_id = user.role === 'ADMIN' ? body.parent_id : user.userId;
                parent_name = user.role === 'ADMIN' ? body.parent_name : user.name;
                // Kitchen staff get their kitchen as vendor_id
                vendor_id = parent_id;
                vendor_name = parent_name;
            }

            const staffId = generateId();
            const employeeId = generateEmployeeId(role);
            const now = new Date().toISOString();

            // Create staff record
            const staffRecord = {
                id: staffId,
                employee_id: employeeId,
                name,
                email,
                phone: phone || '',
                role,
                parent_id,
                parent_name,
                photo: photo || '',
                joining_date: body.joining_date || now.split('T')[0],
                status: 'ACTIVE',
                score: 100, // Initial score
                score_last_reset: now.slice(0, 7), // YYYY-MM for monthly reset
                created_at: now,
                updated_at: now
            };

            // Create user record for login
            const userRecord = {
                id: staffId,
                email,
                name,
                password_hash: hashPassword(password),
                role,
                franchise_id: role === 'FRANCHISE_STAFF' ? parent_id : '',
                franchise_name: role === 'FRANCHISE_STAFF' ? parent_name : '',
                vendor_id: vendor_id, // Kitchen assigned to this franchise (or kitchen itself for kitchen staff)
                vendor_name: vendor_name, // Kitchen name
                kitchen_id: role === 'KITCHEN_STAFF' ? parent_id : '',
                kitchen_name: role === 'KITCHEN_STAFF' ? parent_name : '',
                staff_id: staffId,
                employee_id: employeeId,
                created_at: now
            };

            await dynamodb.send(new PutCommand({
                TableName: STAFF_TABLE,
                Item: staffRecord
            }));

            await dynamodb.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: userRecord
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    message: 'Staff created successfully',
                    staff: staffRecord,
                    credentials: { email, password }
                })
            };
        }

        // PUT /staff/:id - Update staff member
        if (httpMethod === 'PUT' && path.match(/\/staff\/[^\/]+$/) && !path.includes('reset-password') && !path.includes('update-score')) {
            const staffId = path.split('/').pop();
            const body = JSON.parse(event.body || '{}');

            // Get existing staff
            const existing = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!existing.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff not found' })
                };
            }

            // Check permissions
            const staff = existing.Item;
            if (user.role === 'FRANCHISE' && staff.parent_id !== user.franchise_id) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }
            if (user.role === 'KITCHEN' && staff.parent_id !== user.userId) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const updateExpression = [];
            const expressionAttributeValues = {};
            const expressionAttributeNames = {};

            if (body.name) {
                updateExpression.push('#name = :name');
                expressionAttributeNames['#name'] = 'name';
                expressionAttributeValues[':name'] = body.name;
            }
            if (body.phone !== undefined) {
                updateExpression.push('phone = :phone');
                expressionAttributeValues[':phone'] = body.phone;
            }
            if (body.photo !== undefined) {
                updateExpression.push('photo = :photo');
                expressionAttributeValues[':photo'] = body.photo;
            }
            if (body.status) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = body.status;
            }

            updateExpression.push('updated_at = :updatedAt');
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();

            await dynamodb.send(new UpdateCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId },
                UpdateExpression: 'SET ' + updateExpression.join(', '),
                ExpressionAttributeValues: expressionAttributeValues,
                ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
            }));

            // Update user record if name changed
            if (body.name) {
                await dynamodb.send(new UpdateCommand({
                    TableName: USERS_TABLE,
                    Key: { id: staffId },
                    UpdateExpression: 'SET #name = :name',
                    ExpressionAttributeNames: { '#name': 'name' },
                    ExpressionAttributeValues: { ':name': body.name }
                }));
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Staff updated successfully' })
            };
        }

        // PUT /staff/:id/reset-password - Reset staff password
        if (httpMethod === 'PUT' && path.includes('/reset-password')) {
            const staffId = path.split('/')[2];
            const body = JSON.parse(event.body || '{}');
            const { password } = body;

            if (!password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Password is required' })
                };
            }

            // Get existing staff
            const existing = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!existing.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff not found' })
                };
            }

            // Check permissions
            const staff = existing.Item;
            if (user.role === 'FRANCHISE' && staff.parent_id !== user.franchise_id) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }
            if (user.role === 'KITCHEN' && staff.parent_id !== user.userId) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            await dynamodb.send(new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { id: staffId },
                UpdateExpression: 'SET password_hash = :hash',
                ExpressionAttributeValues: { ':hash': hashPassword(password) }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Password reset successfully' })
            };
        }

        // PUT /staff/:id/update-score - Update staff score (internal use)
        if (httpMethod === 'PUT' && path.includes('/update-score')) {
            const staffId = path.split('/')[2];
            const body = JSON.parse(event.body || '{}');
            const { deduction, reason } = body;

            // Get existing staff
            const existing = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!existing.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff not found' })
                };
            }

            const staff = existing.Item;
            const currentMonth = new Date().toISOString().slice(0, 7);

            // Check if score needs monthly reset
            let currentScore = staff.score || 100;
            if (staff.score_last_reset !== currentMonth) {
                currentScore = 100; // Reset score for new month
            }

            // Apply deduction
            const newScore = Math.max(0, currentScore - (deduction || 0));

            await dynamodb.send(new UpdateCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId },
                UpdateExpression: 'SET score = :score, score_last_reset = :resetMonth, updated_at = :updatedAt',
                ExpressionAttributeValues: {
                    ':score': newScore,
                    ':resetMonth': currentMonth,
                    ':updatedAt': new Date().toISOString()
                }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Score updated',
                    previousScore: currentScore,
                    newScore,
                    deduction,
                    reason
                })
            };
        }

        // DELETE /staff/:id - Delete staff member
        if (httpMethod === 'DELETE') {
            const staffId = path.split('/').pop();

            // Get existing staff
            const existing = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!existing.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff not found' })
                };
            }

            // Check permissions
            const staff = existing.Item;
            if (user.role === 'FRANCHISE' && staff.parent_id !== user.franchise_id) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }
            if (user.role === 'KITCHEN' && staff.parent_id !== user.userId) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            // Delete from both tables
            await dynamodb.send(new DeleteCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            await dynamodb.send(new DeleteCommand({
                TableName: USERS_TABLE,
                Key: { id: staffId }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Staff deleted successfully' })
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
