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
        // GET /staff/managers - List managers for vendor or franchise
        if (httpMethod === 'GET' && path.includes('/managers')) {
            const managerType = event.queryStringParameters?.type; // KITCHEN or FRANCHISE

            // Determine what managers to fetch based on user role
            let filterExpression = '';
            let expressionAttributeValues = {};
            let expressionAttributeNames = {};

            if (user.role === 'ADMIN') {
                // Admin can see all managers
                if (managerType === 'KITCHEN') {
                    filterExpression = '#role = :role';
                    expressionAttributeNames['#role'] = 'role';
                    expressionAttributeValues[':role'] = 'KITCHEN';
                } else if (managerType === 'FRANCHISE') {
                    filterExpression = '#role = :role';
                    expressionAttributeNames['#role'] = 'role';
                    expressionAttributeValues[':role'] = 'FRANCHISE';
                } else {
                    filterExpression = '#role IN (:r1, :r2)';
                    expressionAttributeNames['#role'] = 'role';
                    expressionAttributeValues[':r1'] = 'KITCHEN';
                    expressionAttributeValues[':r2'] = 'FRANCHISE';
                }
            } else if (user.role === 'KITCHEN') {
                // Kitchen sees managers for their vendor
                filterExpression = '#role = :role AND vendor_id = :vendorId';
                expressionAttributeNames['#role'] = 'role';
                expressionAttributeValues[':role'] = 'KITCHEN';
                expressionAttributeValues[':vendorId'] = user.vendor_id || user.userId;
            } else if (user.role === 'FRANCHISE') {
                // Franchise sees managers for their franchise
                filterExpression = '#role = :role AND franchise_id = :franchiseId';
                expressionAttributeNames['#role'] = 'role';
                expressionAttributeValues[':role'] = 'FRANCHISE';
                expressionAttributeValues[':franchiseId'] = user.franchise_id;
            } else {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const scanParams = {
                TableName: USERS_TABLE,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ExpressionAttributeNames: expressionAttributeNames
            };

            const result = await dynamodb.send(new ScanCommand(scanParams));
            const managers = (result.Items || []).map(m => ({
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone || '',
                role: m.role,
                vendor_id: m.vendor_id,
                vendor_name: m.vendor_name,
                franchise_id: m.franchise_id,
                franchise_name: m.franchise_name,
                created_at: m.created_at
            }));

            // Sort by created_at desc
            managers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(managers)
            };
        }

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

        // POST /staff - Create new staff member or manager
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

            // Validate phone number (10 digits, starts with 6-9 for Indian numbers)
            if (phone) {
                const phoneRegex = /^[6-9]\d{9}$/;
                if (!phoneRegex.test(phone)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Invalid phone number. Must be a valid 10-digit number starting with 6-9' })
                    };
                }
            }

            // Validate role - now includes KITCHEN and FRANCHISE for managers
            if (!['FRANCHISE_STAFF', 'KITCHEN_STAFF', 'KITCHEN', 'FRANCHISE'].includes(role)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid role' })
                };
            }

            // Check permissions for staff roles
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
            // Check permissions for manager roles (only same role can create managers)
            if (role === 'KITCHEN' && user.role !== 'ADMIN' && user.role !== 'KITCHEN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only kitchen manager can create another kitchen manager' })
                };
            }
            if (role === 'FRANCHISE' && user.role !== 'ADMIN' && user.role !== 'FRANCHISE') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise manager can create another franchise manager' })
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
            let parent_id, parent_name, vendor_id = '', vendor_name = '', franchise_id = '', franchise_name = '';

            // Handle FRANCHISE manager creation
            if (role === 'FRANCHISE') {
                // Creating a franchise manager
                franchise_id = user.role === 'ADMIN' ? body.franchise_id : user.franchise_id;
                franchise_name = user.role === 'ADMIN' ? body.franchise_name : user.franchise_name;
                vendor_id = user.role === 'ADMIN' ? body.vendor_id : user.vendor_id;
                vendor_name = user.role === 'ADMIN' ? body.vendor_name : user.vendor_name;
                parent_id = franchise_id;
                parent_name = franchise_name;
            }
            // Handle KITCHEN manager creation
            else if (role === 'KITCHEN') {
                // Creating a kitchen/vendor manager
                vendor_id = user.role === 'ADMIN' ? body.vendor_id : user.vendor_id || user.userId;
                vendor_name = user.role === 'ADMIN' ? body.vendor_name : user.vendor_name || user.name;
                parent_id = vendor_id;
                parent_name = vendor_name;
            }
            // Handle FRANCHISE_STAFF creation
            else if (role === 'FRANCHISE_STAFF') {
                parent_id = user.role === 'ADMIN' ? body.parent_id : user.franchise_id;
                parent_name = user.role === 'ADMIN' ? body.parent_name : user.franchise_name;
                franchise_id = parent_id;
                franchise_name = parent_name;

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
            }
            // Handle KITCHEN_STAFF creation
            else {
                parent_id = user.role === 'ADMIN' ? body.parent_id : user.userId;
                parent_name = user.role === 'ADMIN' ? body.parent_name : user.name;
                // Kitchen staff get their kitchen as vendor_id
                vendor_id = parent_id;
                vendor_name = parent_name;
            }

            const managerId = generateId(role === 'KITCHEN' ? 'mgr-k' : role === 'FRANCHISE' ? 'mgr-f' : 'staff');
            const employeeId = generateEmployeeId(role);
            const now = new Date().toISOString();

            // For managers (KITCHEN/FRANCHISE roles), only create user record
            if (role === 'KITCHEN' || role === 'FRANCHISE') {
                const userRecord = {
                    id: managerId,
                    email,
                    name,
                    phone: phone || '',
                    password_hash: hashPassword(password),
                    role,
                    is_manager: true,
                    created_by: user.userId,
                    created_at: now
                };

                if (role === 'KITCHEN') {
                    userRecord.vendor_id = vendor_id;
                    userRecord.vendor_name = vendor_name;
                } else if (role === 'FRANCHISE') {
                    userRecord.franchise_id = franchise_id;
                    userRecord.franchise_name = franchise_name;
                    if (vendor_id) {
                        userRecord.vendor_id = vendor_id;
                        userRecord.vendor_name = vendor_name;
                    }
                }

                await dynamodb.send(new PutCommand({
                    TableName: USERS_TABLE,
                    Item: userRecord
                }));

                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        message: 'Manager created successfully',
                        manager: { id: managerId, name, email, role, phone },
                        credentials: { email, password }
                    })
                };
            }

            // Create staff record - only include non-empty franchise/kitchen fields
            const staffId = managerId; // reuse the generated ID for staff
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

            // Only add franchise fields if they have values (avoid empty strings in DynamoDB)
            if (role === 'FRANCHISE_STAFF' && parent_id) {
                staffRecord.franchise_id = parent_id;
                staffRecord.franchise_name = parent_name;
            }

            // Only add kitchen fields if they have values (avoid empty strings in DynamoDB)
            if (role === 'KITCHEN_STAFF' && parent_id) {
                staffRecord.kitchen_id = parent_id;
                staffRecord.kitchen_name = parent_name;
            }

            // Create user record for login
            const userRecord = {
                id: staffId,
                email,
                name,
                password_hash: hashPassword(password),
                role,
                staff_id: staffId,
                employee_id: employeeId,
                created_at: now
            };

            // Only add non-empty fields to user record
            if (role === 'FRANCHISE_STAFF' && parent_id) {
                userRecord.franchise_id = parent_id;
                userRecord.franchise_name = parent_name;
            }
            if (vendor_id) {
                userRecord.vendor_id = vendor_id;
                userRecord.vendor_name = vendor_name;
            }
            if (role === 'KITCHEN_STAFF' && parent_id) {
                userRecord.kitchen_id = parent_id;
                userRecord.kitchen_name = parent_name;
            }

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
            if (body.score !== undefined) {
                updateExpression.push('score = :score');
                expressionAttributeValues[':score'] = body.score;
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

        // DELETE /staff/:id or /staff/managers/:id - Delete staff member or manager
        if (httpMethod === 'DELETE') {
            const isManagerDelete = path.includes('/managers/');
            const itemId = path.split('/').pop();

            if (isManagerDelete) {
                // Deleting a manager - check in USERS_TABLE
                const existing = await dynamodb.send(new GetCommand({
                    TableName: USERS_TABLE,
                    Key: { id: itemId }
                }));

                if (!existing.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Manager not found' })
                    };
                }

                const manager = existing.Item;

                // Check permissions - only same type can delete their managers
                if (manager.role === 'KITCHEN') {
                    if (user.role !== 'ADMIN' && user.role !== 'KITCHEN') {
                        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
                    }
                    if (user.role === 'KITCHEN' && manager.vendor_id !== (user.vendor_id || user.userId)) {
                        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
                    }
                } else if (manager.role === 'FRANCHISE') {
                    if (user.role !== 'ADMIN' && user.role !== 'FRANCHISE') {
                        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
                    }
                    if (user.role === 'FRANCHISE' && manager.franchise_id !== user.franchise_id) {
                        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
                    }
                }

                // Delete manager from users table only
                await dynamodb.send(new DeleteCommand({
                    TableName: USERS_TABLE,
                    Key: { id: itemId }
                }));

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: 'Manager deleted successfully' })
                };
            }

            // Deleting a staff member
            const staffId = itemId;

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
