/**
 * Supply Franchises Lambda - Manage franchises (assigned to vendors)
 * Uses AWS SDK v3 for Node.js 18+
 * 
 * FEATURES:
 * - Auto-sync vendor_id on items when vendor assignments change
 *   (Prevents items showing (0) when vendor is reassigned)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_franchises';
const USERS_TABLE = 'supply_users';

// Simple password hashing (same as auth Lambda)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate strong random password
function generateStrongPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  const all = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
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
  const queryParams = event.queryStringParameters || {};

  try {
    // Check authorization
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    // Route handling
    if (method === 'GET') {
      const franchiseId = pathParts[1];
      const subResource = pathParts[2];

      // Get franchise items
      if (franchiseId && subResource === 'items') {
        return await getFranchiseItems(franchiseId);
      }

      // Get franchise vendors with details
      if (franchiseId && subResource === 'vendors') {
        return await getFranchiseVendors(franchiseId);
      }

      // Vendors can see their assigned franchises
      if (decoded.role === 'KITCHEN') {
        return await getFranchisesByVendor(decoded.vendor_id || decoded.userId);
      }

      // Admin and Auditor can see all or specific
      if (decoded.role === 'ADMIN' || decoded.role === 'AUDITOR') {
        if (franchiseId) {
          return await getFranchise(franchiseId);
        }
        // Filter by vendor if requested
        if (queryParams.vendor_id) {
          return await getFranchisesByVendor(queryParams.vendor_id);
        }
        return await getAllFranchises();
      }

      // Franchise can only see their own
      if (decoded.role === 'FRANCHISE' || decoded.role === 'FRANCHISE_STAFF') {
        const targetFranchiseId = decoded.franchise_id;
        if (subResource === 'items' || franchiseId === targetFranchiseId) {
          if (pathParts[2] === 'items' || !franchiseId) {
            return await getFranchiseItems(targetFranchiseId);
          }
          return await getFranchise(targetFranchiseId);
        }
      }

      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    // Only ADMIN can create/update/delete
    if (decoded.role !== 'ADMIN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can manage franchises' }) };
    }

    if (method === 'POST') {
      const franchiseId = pathParts[1];
      const subResource = pathParts[2];
      const body = JSON.parse(event.body || '{}');

      // Add item to franchise
      if (franchiseId && subResource === 'items') {
        return await addFranchiseItem(franchiseId, body);
      }

      return await createFranchise(body);
    }

    if (method === 'PUT') {
      const franchiseId = pathParts[1];
      const subResource = pathParts[2];
      const itemId = pathParts[3];
      const body = JSON.parse(event.body || '{}');

      // Check if this is a password reset request
      if (subResource === 'reset-password') {
        return await resetPassword(franchiseId, body);
      }

      // Update franchise item
      if (subResource === 'items' && itemId) {
        return await updateFranchiseItem(franchiseId, itemId, body);
      }

      return await updateFranchise(franchiseId, body);
    }

    if (method === 'DELETE') {
      const franchiseId = pathParts[1];
      const subResource = pathParts[2];
      const itemId = pathParts[3];

      // Delete franchise item
      if (subResource === 'items' && itemId) {
        return await deleteFranchiseItem(franchiseId, itemId);
      }

      return await deleteFranchise(franchiseId);
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

// Get all franchises
async function getAllFranchises() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Get franchises by vendor (supports vendor_1_id, vendor_2_id, or vendor_3_id)
async function getFranchisesByVendor(vendorId) {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  // Filter franchises that have this vendor as vendor_1, vendor_2, or vendor_3
  const franchises = (result.Items || []).filter(franchise => {
    return franchise.vendor_1_id === vendorId || franchise.vendor_2_id === vendorId || franchise.vendor_3_id === vendorId;
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(franchises)
  };
}

// Get single franchise
async function getFranchise(franchiseId) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item)
  };
}

// Create franchise
async function createFranchise(data) {
  if (!data.email) {
    throw new Error('Email is required');
  }

  const franchiseId = `franchise-${Date.now()}`;

  const franchise = {
    id: franchiseId,
    name: data.name,
    owner_name: data.owner_name || '',
    location: data.location || '',
    phone: data.phone || '',
    email: data.email,
    vendor_1_id: data.vendor_1_id || '', // SFI vendor
    vendor_1_name: data.vendor_1_name || '',
    vendor_2_id: data.vendor_2_id || '', // Raw Materials vendor
    vendor_2_name: data.vendor_2_name || '',
    vendor_3_id: data.vendor_3_id || '', // General/Mixed vendor
    vendor_3_name: data.vendor_3_name || '',
    royalty_percent: data.royalty_percent || 5,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Use provided password or generate a strong one
  const password = data.password || generateStrongPassword(12);

  // Create user account for this franchise using their email
  const user = {
    id: franchiseId, // Same ID as franchise
    email: data.email, // Use the user-provided email
    password: hashPassword(password),
    name: data.name,
    role: 'FRANCHISE',
    franchise_id: franchiseId,
    franchise_name: data.name,
    created_at: new Date().toISOString()
  };

  // Save franchise and user
  await dynamoDB.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: franchise
  }));

  await dynamoDB.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: user
  }));

  // Return franchise with credentials (email as username)
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      ...franchise,
      credentials: {
        username: data.email,
        password: password
      }
    })
  };
}

// Update franchise
async function updateFranchise(franchiseId, data) {
  // First, get current franchise data to check if vendors are changing
  const currentFranchise = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  const oldVendor1Id = currentFranchise.Item?.vendor_1_id;
  const oldVendor2Id = currentFranchise.Item?.vendor_2_id;
  const oldVendor3Id = currentFranchise.Item?.vendor_3_id;
  const newVendor1Id = data.vendor_1_id;
  const newVendor2Id = data.vendor_2_id;
  const newVendor3Id = data.vendor_3_id;

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const fields = ['name', 'owner_name', 'location', 'phone', 'email', 'royalty_percent', 'status', 'vendor_1_id', 'vendor_1_name', 'vendor_2_id', 'vendor_2_name', 'vendor_3_id', 'vendor_3_name'];

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

  // AUTO-DELETE OLD VENDOR ITEMS: If vendors changed, delete items from the old vendor
  let updatedItems = currentFranchise.Item?.items || [];
  let vendorSyncApplied = false;

  if ((newVendor1Id && newVendor1Id !== oldVendor1Id) || (newVendor2Id && newVendor2Id !== oldVendor2Id) || (newVendor3Id && newVendor3Id !== oldVendor3Id)) {
    console.log('Vendor assignment changed, removing items from old vendors...');

    const itemsBeforeCount = updatedItems.length;

    // Filter out items that belonged to old vendors
    updatedItems = updatedItems.filter(item => {
      // Remove items from old vendor_1 if vendor_1 changed
      if (oldVendor1Id && newVendor1Id !== oldVendor1Id && item.vendor_id === oldVendor1Id) {
        console.log(`Removing item "${item.name}" from old vendor_1 (${oldVendor1Id})`);
        return false;
      }
      // Remove items from old vendor_2 if vendor_2 changed
      if (oldVendor2Id && newVendor2Id !== oldVendor2Id && item.vendor_id === oldVendor2Id) {
        console.log(`Removing item "${item.name}" from old vendor_2 (${oldVendor2Id})`);
        return false;
      }
      // Remove items from old vendor_3 if vendor_3 changed
      if (oldVendor3Id && newVendor3Id !== oldVendor3Id && item.vendor_id === oldVendor3Id) {
        console.log(`Removing item "${item.name}" from old vendor_3 (${oldVendor3Id})`);
        return false;
      }
      return true;
    });

    const itemsRemoved = itemsBeforeCount - updatedItems.length;
    if (itemsRemoved > 0) {
      console.log(`✓ Removed ${itemsRemoved} items from old vendor(s)`);
    }

    // Add items array to update expression
    updateExpressions.push('#items = :items');
    expressionAttributeNames['#items'] = 'items';
    expressionAttributeValues[':items'] = updatedItems;
    vendorSyncApplied = true;
  }

  const result = await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  if (vendorSyncApplied) {
    console.log(`✓ Vendor sync completed - ${updatedItems.length} items checked`);
  }

  // Also update the corresponding user record in supply_users table
  // This keeps email, name, and franchise_name in sync for login
  const userUpdateExpressions = [];
  const userExpressionAttributeNames = {};
  const userExpressionAttributeValues = {};

  if (data.email !== undefined) {
    userUpdateExpressions.push('#email = :email');
    userExpressionAttributeNames['#email'] = 'email';
    userExpressionAttributeValues[':email'] = data.email;
  }

  if (data.name !== undefined) {
    userUpdateExpressions.push('#name = :name');
    userExpressionAttributeNames['#name'] = 'name';
    userExpressionAttributeValues[':name'] = data.name;

    // Also update franchise_name field
    userUpdateExpressions.push('#franchise_name = :franchise_name');
    userExpressionAttributeNames['#franchise_name'] = 'franchise_name';
    userExpressionAttributeValues[':franchise_name'] = data.name;
  }

  // Always update the updated_at timestamp
  if (userUpdateExpressions.length > 0) {
    userUpdateExpressions.push('#updated_at = :updated_at');
    userExpressionAttributeNames['#updated_at'] = 'updated_at';
    userExpressionAttributeValues[':updated_at'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: franchiseId },
      UpdateExpression: `SET ${userUpdateExpressions.join(', ')}`,
      ExpressionAttributeNames: userExpressionAttributeNames,
      ExpressionAttributeValues: userExpressionAttributeValues
    }));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Attributes)
  };
}

// Delete franchise
async function deleteFranchise(franchiseId) {
  await dynamoDB.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Franchise deleted' })
  };
}

// Reset password for franchise user
async function resetPassword(franchiseId, data) {
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
    Key: { id: franchiseId },
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

// ============ FRANCHISE VENDOR MANAGEMENT ============

// Get franchise vendors with details (vendor_1 and vendor_2)
async function getFranchiseVendors(franchiseId) {
  const franchiseResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!franchiseResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  const franchise = franchiseResult.Item;
  const vendors = [];

  // Fetch vendor_1 details (SFI)
  if (franchise.vendor_1_id) {
    try {
      const vendor1Result = await dynamoDB.send(new GetCommand({
        TableName: 'supply_vendors',
        Key: { id: franchise.vendor_1_id }
      }));
      if (vendor1Result.Item) {
        vendors.push({
          ...vendor1Result.Item,
          slot: 1,
          slot_name: 'SFI'
        });
      }
    } catch (err) {
      console.error(`Failed to fetch vendor_1:`, err);
    }
  }

  // Fetch vendor_2 details (Raw Materials)
  if (franchise.vendor_2_id) {
    try {
      const vendor2Result = await dynamoDB.send(new GetCommand({
        TableName: 'supply_vendors',
        Key: { id: franchise.vendor_2_id }
      }));
      if (vendor2Result.Item) {
        vendors.push({
          ...vendor2Result.Item,
          slot: 2,
          slot_name: 'RAW_MATERIALS'
        });
      }
    } catch (err) {
      console.error(`Failed to fetch vendor_2:`, err);
    }
  }

  // Fetch vendor_3 details (General/Mixed)
  if (franchise.vendor_3_id) {
    try {
      const vendor3Result = await dynamoDB.send(new GetCommand({
        TableName: 'supply_vendors',
        Key: { id: franchise.vendor_3_id }
      }));
      if (vendor3Result.Item) {
        vendors.push({
          ...vendor3Result.Item,
          slot: 3,
          slot_name: 'GENERAL_MIXED'
        });
      }
    } catch (err) {
      console.error(`Failed to fetch vendor_3:`, err);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(vendors)
  };
}

// ============ FRANCHISE ITEM MANAGEMENT ============

// Get franchise items
async function getFranchiseItems(franchiseId) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item.items || [])
  };
}

// Add item to franchise
async function addFranchiseItem(franchiseId, itemData) {
  // First get current franchise
  const getResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!getResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  // Validate vendor_id (must be vendor_1_id, vendor_2_id, or vendor_3_id)
  const franchise = getResult.Item;
  const vendorId = itemData.vendor_id;

  if (!vendorId || (vendorId !== franchise.vendor_1_id && vendorId !== franchise.vendor_2_id && vendorId !== franchise.vendor_3_id)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid vendor_id. Must be one of the franchise assigned vendors.' })
    };
  }

  const items = getResult.Item.items || [];
  const newItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: itemData.name,
    category: itemData.category || '',
    unit: itemData.unit || 'kg',
    price: parseFloat(itemData.price) || 0,
    vendor_id: vendorId, // Track which vendor supplies this item
    created_at: new Date().toISOString()
  };

  items.push(newItem);

  // Update franchise with new items array
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': items,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(newItem)
  };
}

// Update franchise item
async function updateFranchiseItem(franchiseId, itemId, itemData) {
  // Get current franchise
  const getResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!getResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  const items = getResult.Item.items || [];
  const itemIndex = items.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
  }

  // Update item fields
  if (itemData.name !== undefined) items[itemIndex].name = itemData.name;
  if (itemData.category !== undefined) items[itemIndex].category = itemData.category;
  if (itemData.unit !== undefined) items[itemIndex].unit = itemData.unit;
  if (itemData.price !== undefined) items[itemIndex].price = parseFloat(itemData.price) || 0;
  items[itemIndex].updated_at = new Date().toISOString();

  // Update franchise
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': items,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(items[itemIndex])
  };
}

// Delete franchise item
async function deleteFranchiseItem(franchiseId, itemId) {
  // Get current franchise
  const getResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId }
  }));

  if (!getResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Franchise not found' }) };
  }

  const items = getResult.Item.items || [];
  const filteredItems = items.filter(item => item.id !== itemId);

  if (filteredItems.length === items.length) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
  }

  // Update franchise
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: franchiseId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': filteredItems,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Item deleted' })
  };
}
