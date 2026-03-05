const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const HYGIENE_MONITORS_TABLE = 'supply_hygiene_monitors';
const USERS_TABLE = 'supply_users';
const STAFF_TABLE = 'supply_staff';
const FRANCHISES_TABLE = 'supply_franchises';
const ATTENDANCE_TABLE = 'supply_staff_attendance';
const AUDITS_TABLE = 'supply_audits';

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
function generateId() {
    return `hm-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
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

    // Handle CORS preflight first
    const httpMethod = event.requestContext?.http?.method || event.httpMethod || 'GET';
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const path = event.rawPath || event.path || '';

        const user = getUserFromToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        // GET /hygiene-monitors - List all hygiene monitors (Admin only)
        if (httpMethod === 'GET' && !path.includes('/attendance') && !path.includes('/audits') && !path.includes('/assigned-franchises')) {
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const result = await dynamodb.send(new ScanCommand({
                TableName: HYGIENE_MONITORS_TABLE
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Items || [])
            };
        }

        // GET /hygiene-monitors/assigned-franchises - Get franchises for logged-in hygiene monitor
        if (httpMethod === 'GET' && path.includes('/assigned-franchises')) {
            if (user.role !== 'HYGIENE_MONITOR') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            // Get hygiene monitor record
            const monitorResult = await dynamodb.send(new GetCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id: user.userId }
            }));

            if (!monitorResult.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Hygiene monitor not found' })
                };
            }

            const franchiseIds = monitorResult.Item.franchise_ids || [];

            // Get franchise details for all assigned franchises
            const franchises = [];
            for (const franchiseId of franchiseIds) {
                try {
                    const franchiseResult = await dynamodb.send(new GetCommand({
                        TableName: FRANCHISES_TABLE,
                        Key: { id: franchiseId }
                    }));
                    if (franchiseResult.Item) {
                        franchises.push(franchiseResult.Item);
                    }
                } catch (err) {
                    console.error(`Failed to get franchise ${franchiseId}:`, err);
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(franchises)
            };
        }

        // GET /hygiene-monitors/attendance - Get attendance for assigned franchises
        if (httpMethod === 'GET' && path.includes('/attendance')) {
            if (user.role !== 'HYGIENE_MONITOR') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            // Get hygiene monitor record
            const monitorResult = await dynamodb.send(new GetCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id: user.userId }
            }));

            if (!monitorResult.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Hygiene monitor not found' })
                };
            }

            const franchiseIds = monitorResult.Item.franchise_ids || [];
            const franchiseId = event.queryStringParameters?.franchise_id;

            // If specific franchise requested, verify authorization
            if (franchiseId && !franchiseIds.includes(franchiseId)) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Not authorized for this franchise' })
                };
            }

            // Get staff for the franchise(s)
            let staffList = [];
            const targetFranchises = franchiseId ? [franchiseId] : franchiseIds;

            for (const fId of targetFranchises) {
                const staffResult = await dynamodb.send(new ScanCommand({
                    TableName: STAFF_TABLE,
                    FilterExpression: 'franchise_id = :franchiseId',
                    ExpressionAttributeValues: { ':franchiseId': fId }
                }));
                staffList = staffList.concat(staffResult.Items || []);
            }

            // Get attendance records
            const startDate = event.queryStringParameters?.start_date;
            const endDate = event.queryStringParameters?.end_date;

            const attendanceRecords = [];
            for (const staff of staffList) {
                let filterExpression = 'staff_id = :staffId';
                const expressionValues = { ':staffId': staff.id };
                const expressionNames = {};

                if (startDate && endDate) {
                    filterExpression += ' AND #date BETWEEN :startDate AND :endDate';
                    expressionValues[':startDate'] = startDate;
                    expressionValues[':endDate'] = endDate;
                    expressionNames['#date'] = 'date';
                }

                const scanParams = {
                    TableName: ATTENDANCE_TABLE,
                    FilterExpression: filterExpression,
                    ExpressionAttributeValues: expressionValues
                };

                // Only add ExpressionAttributeNames if we have date filtering
                if (Object.keys(expressionNames).length > 0) {
                    scanParams.ExpressionAttributeNames = expressionNames;
                }

                try {
                    const attendanceResult = await dynamodb.send(new ScanCommand(scanParams));

                    if (attendanceResult.Items && attendanceResult.Items.length > 0) {
                        attendanceRecords.push({
                            staff: staff,
                            attendance: attendanceResult.Items
                        });
                    }
                } catch (scanError) {
                    console.error(`Error scanning attendance for staff ${staff.id}:`, scanError);
                    // Continue with other staff even if one fails
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    staff: staffList,
                    attendance: attendanceRecords
                })
            };
        }

        // GET /hygiene-monitors/audits - Get franchise audits for assigned franchises
        if (httpMethod === 'GET' && path.includes('/audits')) {
            if (user.role !== 'HYGIENE_MONITOR') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            // Get hygiene monitor record
            const monitorResult = await dynamodb.send(new GetCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id: user.userId }
            }));

            if (!monitorResult.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Hygiene monitor not found' })
                };
            }

            const franchiseIds = monitorResult.Item.franchise_ids || [];
            const franchiseId = event.queryStringParameters?.franchise_id;

            // If specific franchise requested, verify authorization
            if (franchiseId && !franchiseIds.includes(franchiseId)) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Not authorized for this franchise' })
                };
            }

            // Get audits for the franchise(s)
            const audits = [];
            const targetFranchises = franchiseId ? [franchiseId] : franchiseIds;

            for (const fId of targetFranchises) {
                const auditResult = await dynamodb.send(new ScanCommand({
                    TableName: AUDITS_TABLE,
                    FilterExpression: 'franchise_id = :franchiseId',
                    ExpressionAttributeValues: { ':franchiseId': fId }
                }));
                audits.push(...(auditResult.Items || []));
            }

            // Sort by audit_date descending
            audits.sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(audits)
            };
        }

        // POST /hygiene-monitors - Create new hygiene monitor (Admin only)
        if (httpMethod === 'POST') {
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const body = JSON.parse(event.body || '{}');
            const { name, email, phone, password, franchise_ids } = body;

            if (!name || !email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Name, email, and password are required' })
                };
            }

            // Validate phone number
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

            const hygieneMonitorId = generateId();
            const hashedPassword = hashPassword(password);

            // Create hygiene monitor record
            const hygieneMonitor = {
                id: hygieneMonitorId,
                name,
                email,
                phone: phone || '',
                franchise_ids: franchise_ids || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Item: hygieneMonitor
            }));

            // Create user login record
            await dynamodb.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: {
                    id: hygieneMonitorId,
                    email,
                    password: hashedPassword,
                    role: 'HYGIENE_MONITOR',
                    name,
                    created_at: new Date().toISOString()
                }
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(hygieneMonitor)
            };
        }

        // PUT /hygiene-monitors/{id} - Update hygiene monitor (Admin only)
        if (httpMethod === 'PUT') {
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const pathParts = path.split('/');
            const id = pathParts[pathParts.length - 1];

            const body = JSON.parse(event.body || '{}');
            const { name, email, phone, password, franchise_ids } = body;

            // Get existing record
            const existingRecord = await dynamodb.send(new GetCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id }
            }));

            if (!existingRecord.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Hygiene monitor not found' })
                };
            }

            // Check for duplicate email if email is being changed
            if (email && email !== existingRecord.Item.email) {
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
            }

            // Build update expression
            let updateExpression = 'SET updated_at = :updated_at';
            const expressionAttributeValues = {
                ':updated_at': new Date().toISOString()
            };

            if (name) {
                updateExpression += ', #name = :name';
                expressionAttributeValues[':name'] = name;
            }

            if (email) {
                updateExpression += ', email = :email';
                expressionAttributeValues[':email'] = email;
            }

            if (phone !== undefined) {
                updateExpression += ', phone = :phone';
                expressionAttributeValues[':phone'] = phone;
            }

            if (franchise_ids !== undefined) {
                updateExpression += ', franchise_ids = :franchise_ids';
                expressionAttributeValues[':franchise_ids'] = franchise_ids;
            }

            // Update hygiene monitor record
            await dynamodb.send(new UpdateCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: name ? { '#name': 'name' } : undefined,
                ExpressionAttributeValues: expressionAttributeValues
            }));

            // Update user record if needed
            let userUpdateExpression = 'SET updated_at = :updated_at';
            const userExpressionValues = {
                ':updated_at': new Date().toISOString()
            };

            if (name) {
                userUpdateExpression += ', #name = :name';
                userExpressionValues[':name'] = name;
            }

            if (email) {
                userUpdateExpression += ', email = :email';
                userExpressionValues[':email'] = email;
            }

            if (password) {
                userUpdateExpression += ', password = :password';
                userExpressionValues[':password'] = hashPassword(password);
            }

            await dynamodb.send(new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { id },
                UpdateExpression: userUpdateExpression,
                ExpressionAttributeNames: name ? { '#name': 'name' } : undefined,
                ExpressionAttributeValues: userExpressionValues
            }));

            // Get updated record
            const updatedRecord = await dynamodb.send(new GetCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(updatedRecord.Item)
            };
        }

        // DELETE /hygiene-monitors/{id} - Delete hygiene monitor (Admin only)
        if (httpMethod === 'DELETE') {
            if (user.role !== 'ADMIN') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const pathParts = path.split('/');
            const id = pathParts[pathParts.length - 1];

            // Delete hygiene monitor record
            await dynamodb.send(new DeleteCommand({
                TableName: HYGIENE_MONITORS_TABLE,
                Key: { id }
            }));

            // Delete user record
            await dynamodb.send(new DeleteCommand({
                TableName: USERS_TABLE,
                Key: { id }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Hygiene monitor deleted successfully' })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Bad Request' })
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
