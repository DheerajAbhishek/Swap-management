const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const USERS_TABLE = 'supply_users';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate JWT-like token (simplified)
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        franchise_id: user.franchise_id || '',
        franchise_name: user.franchise_name || '',
        vendor_id: user.vendor_id || '', // Kitchen assigned to this franchise
        vendor_name: user.vendor_name || '', // Kitchen name
        kitchen_id: user.kitchen_id || '',
        kitchen_name: user.kitchen_name || '',
        auditor_id: user.auditor_id || '',
        auditor_name: user.auditor_name || '',
        staff_id: user.staff_id || '',
        employee_id: user.employee_id || '',
        exp: Date.now() + 86400000 // 24 hours
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify token
function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (payload.exp < Date.now()) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    // Handle OPTIONS for CORS
    if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;

    try {
        // POST /auth/login
        if (httpMethod === 'POST' && path.includes('/auth/login')) {
            const body = JSON.parse(event.body || '{}');
            const { email, password } = body;

            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Email and password are required' })
                };
            }

            // Find user by email using GSI
            const result = await dynamodb.send(new QueryCommand({
                TableName: USERS_TABLE,
                IndexName: 'email-index',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email }
            }));

            const user = result.Items?.[0];
            if (!user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email or password' })
                };
            }

            // Verify password (check both password_hash and password fields for compatibility)
            const hashedPassword = hashPassword(password);
            const storedPassword = user.password_hash || user.password;
            if (storedPassword !== hashedPassword) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email or password' })
                };
            }

            // For FRANCHISE_STAFF, fetch vendor info from parent franchise if not on user
            let vendorId = user.vendor_id || '';
            let vendorName = user.vendor_name || '';
            let kitchenId = user.kitchen_id || '';
            let kitchenName = user.kitchen_name || '';

            // For KITCHEN role (vendor owner), vendor_id should be their own user ID
            if (user.role === 'KITCHEN') {
                if (!vendorId) {
                    vendorId = user.id; // KITCHEN user ID = vendor ID
                }
                // Fetch vendor name if missing
                if (!vendorName) {
                    try {
                        const vendorResult = await dynamodb.send(new GetCommand({
                            TableName: 'supply_vendors',
                            Key: { id: vendorId }
                        }));
                        if (vendorResult.Item) {
                            vendorName = vendorResult.Item.name || '';
                        }
                    } catch (e) {
                        console.log('Could not fetch vendor info:', e);
                    }
                }
            }

            if ((user.role === 'FRANCHISE_STAFF' || user.role === 'FRANCHISE') && !vendorName && user.franchise_id) {
                try {
                    const franchiseResult = await dynamodb.send(new GetCommand({
                        TableName: 'supply_franchises',
                        Key: { id: user.franchise_id }
                    }));
                    if (franchiseResult.Item) {
                        vendorId = franchiseResult.Item.vendor_id || '';
                        vendorName = franchiseResult.Item.vendor_name || '';
                    }
                } catch (e) {
                    console.log('Could not fetch franchise vendor info:', e);
                }
            }

            // For KITCHEN_STAFF, ensure vendor_id points to their kitchen
            if (user.role === 'KITCHEN_STAFF' && user.kitchen_id) {
                // Kitchen staff's vendor_id should be their kitchen's ID
                if (!vendorId) {
                    vendorId = user.kitchen_id;
                    vendorName = user.kitchen_name || '';
                }
                kitchenId = user.kitchen_id;
                kitchenName = user.kitchen_name || '';

                // If kitchen name is missing, fetch it from vendors table
                if (!kitchenName) {
                    try {
                        const kitchenResult = await dynamodb.send(new GetCommand({
                            TableName: 'supply_vendors',
                            Key: { id: user.kitchen_id }
                        }));
                        if (kitchenResult.Item) {
                            kitchenName = kitchenResult.Item.name || '';
                            vendorName = kitchenResult.Item.name || '';
                        }
                    } catch (e) {
                        console.log('Could not fetch kitchen info:', e);
                    }
                }
            }

            // Generate token
            const token = generateToken({
                ...user,
                vendor_id: vendorId,
                vendor_name: vendorName,
                kitchen_id: kitchenId,
                kitchen_name: kitchenName
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        franchise_id: user.franchise_id || '',
                        franchise_name: user.franchise_name || '',
                        vendor_id: vendorId, // Kitchen assigned (franchise's kitchen OR kitchen staff's own kitchen)
                        vendor_name: vendorName, // Kitchen name
                        kitchen_id: kitchenId, // For kitchen staff, their kitchen ID
                        kitchen_name: kitchenName, // For kitchen staff, their kitchen name
                        auditor_id: user.auditor_id || '',
                        auditor_name: user.auditor_name || '',
                        staff_id: user.staff_id || '',
                        employee_id: user.employee_id || ''
                    }
                })
            };
        }

        // GET /auth/me - Get current user
        if (httpMethod === 'GET' && path.includes('/auth/me')) {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'No token provided' })
                };
            }

            const token = authHeader.replace('Bearer ', '');
            const payload = verifyToken(token);

            if (!payload) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid or expired token' })
                };
            }

            // Get user from database
            const result = await dynamodb.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { id: payload.userId }
            }));

            const user = result.Item;
            if (!user) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'User not found' })
                };
            }

            // For FRANCHISE_STAFF or FRANCHISE, fetch vendor info from parent franchise if not on user
            let vendorId = user.vendor_id || '';
            let vendorName = user.vendor_name || '';

            if ((user.role === 'FRANCHISE_STAFF' || user.role === 'FRANCHISE') && !vendorName && user.franchise_id) {
                try {
                    const franchiseResult = await dynamodb.send(new GetCommand({
                        TableName: 'supply_franchises',
                        Key: { id: user.franchise_id }
                    }));
                    if (franchiseResult.Item) {
                        vendorId = franchiseResult.Item.vendor_id || '';
                        vendorName = franchiseResult.Item.vendor_name || '';
                    }
                } catch (e) {
                    console.log('Could not fetch franchise vendor info:', e);
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    franchise_id: user.franchise_id || '',
                    franchise_name: user.franchise_name || '',
                    vendor_id: vendorId,
                    vendor_name: vendorName,
                    kitchen_id: user.kitchen_id || '',
                    kitchen_name: user.kitchen_name || '',
                    auditor_id: user.auditor_id || '',
                    auditor_name: user.auditor_name || '',
                    staff_id: user.staff_id || '',
                    employee_id: user.employee_id || ''
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
