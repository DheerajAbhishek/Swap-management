/**
 * Supply Vendors Lambda - Manage vendors/kitchens
 * Uses AWS SDK v3 for Node.js 18+
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_vendors';
const USERS_TABLE = 'supply_users';

// Simple password hashing (same as auth Lambda)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate username from name (e.g., "Central Kitchen" -> "centralkitchen")
function generateUsername(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@kitchen.swap';
}

// Generate password from name (e.g., "Central Kitchen" -> "centralkitchen123")
function generatePassword(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '123';
}

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const method = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath || '';
  const pathParts = path.split('/').filter(Boolean);

  try {
    // Check authorization (only ADMIN can manage vendors)
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    if (decoded.role !== 'ADMIN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can manage vendors' }) };
    }

    // Route handling
    if (method === 'GET') {
      // GET /vendors/:id or GET /vendors
      const vendorId = pathParts[1];
      if (vendorId) {
        return await getVendor(vendorId);
      }
      return await getAllVendors();
    }

    if (method === 'POST') {
      // POST /vendors - Create new vendor
      const body = JSON.parse(event.body || '{}');
      return await createVendor(body);
    }

    if (method === 'PUT') {
      // PUT /vendors/:id - Update vendor
      const vendorId = pathParts[1];
      const body = JSON.parse(event.body || '{}');

      // Check if this is a password reset request
      if (pathParts[2] === 'reset-password') {
        return await resetPassword(vendorId, body);
      }

      return await updateVendor(vendorId, body);
    }

    if (method === 'DELETE') {
      // DELETE /vendors/:id - Delete vendor
      const vendorId = pathParts[1];
      return await deleteVendor(vendorId);
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Get all vendors
async function getAllVendors() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Get single vendor
async function getVendor(vendorId) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item)
  };
}

// Create vendor
async function createVendor(data) {
  const vendorId = `vendor-${Date.now()}`;
  const vendor = {
    id: vendorId,
    name: data.name,
    owner_name: data.owner_name || '',
    location: data.location || '',
    phone: data.phone || '',
    email: data.email || '',
    margin_percent: data.margin_percent || 5,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Generate login credentials
  const username = generateUsername(data.name);
  const password = generatePassword(data.name);

  // Create user account for this vendor
  const user = {
    id: vendorId, // Same ID as vendor
    email: username, // Generated username as email
    password: hashPassword(password),
    name: data.name,
    role: 'KITCHEN',
    vendor_id: vendorId,
    vendor_name: data.name,
    created_at: new Date().toISOString()
  };

  // Save vendor and user
  await dynamoDB.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: vendor
  }));

  await dynamoDB.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: user
  }));

  // Return vendor with generated credentials
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      ...vendor,
      credentials: {
        username: username,
        password: password
      }
    })
  };
}

// Update vendor
async function updateVendor(vendorId, data) {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const fields = ['name', 'owner_name', 'location', 'phone', 'email', 'margin_percent', 'status'];

  fields.forEach(field => {
    if (data[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = data[field];
    }
  });

  updateExpressions.push('#updated_at = :updated_at');
  expressionAttributeNames['#updated_at'] = 'updated_at';
  expressionAttributeValues[':updated_at'] = new Date().toISOString();

  const result = await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Attributes)
  };
}

// Delete vendor
async function deleteVendor(vendorId) {
  await dynamoDB.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Vendor deleted' })
  };
}

// Reset password for vendor user
async function resetPassword(vendorId, data) {
  const newPassword = data.password;

  if (!newPassword || newPassword.length < 6) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Password must be at least 6 characters' })
    };
  }

  // Update user password
  await dynamoDB.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { id: vendorId },
    UpdateExpression: 'SET #password = :password, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#password': 'password',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':password': hashPassword(newPassword),
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Password reset successfully' })
  };
}
