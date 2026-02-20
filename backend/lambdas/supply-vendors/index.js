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
      // GET /vendors/:id/franchises - Get franchises for this vendor with stats
      if (pathParts[2] === 'franchises') {
        const vendorId = pathParts[1];
        if (decoded.role === 'KITCHEN') {
          const userVendorId = decoded.vendor_id || decoded.userId;
          if (vendorId !== userVendorId) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Can only view own franchises' }) };
          }
        } else if (decoded.role !== 'ADMIN' && decoded.role !== 'AUDITOR') {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
        }
        return await getVendorFranchises(vendorId);
      }

      // GET /vendors/:id/items - Get vendor items for franchise (franchise_price only)
      if (pathParts[2] === 'items' && (decoded.role === 'FRANCHISE' || decoded.role === 'FRANCHISE_STAFF')) {
        const vendorId = pathParts[1];
        return await getVendorItemsForFranchise(vendorId);
      }

      // GET /vendors/:id/profile - Kitchen user can view their own profile
      if (pathParts[2] === 'profile' && decoded.role === 'KITCHEN') {
        const vendorId = pathParts[1];
        const userVendorId = decoded.vendor_id || decoded.userId;
        if (vendorId !== userVendorId) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Can only view own profile' }) };
        }
        return await getVendor(vendorId);
      }

      // GET /vendors/:id or GET /vendors - Allow ADMIN, FRANCHISE, AUDITOR to view vendors
      if (decoded.role === 'ADMIN' || decoded.role === 'FRANCHISE' || decoded.role === 'AUDITOR') {
        const vendorId = pathParts[1];
        if (vendorId) {
          return await getVendor(vendorId);
        }
        return await getAllVendors();
      }
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    // PUT /vendors/:id/profile - Kitchen user can update their own profile
    if (method === 'PUT' && pathParts[2] === 'profile' && decoded.role === 'KITCHEN') {
      const vendorId = pathParts[1];
      const userVendorId = decoded.vendor_id || decoded.userId;
      if (vendorId !== userVendorId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Can only update own profile' }) };
      }
      const body = JSON.parse(event.body || '{}');
      // Only allow updating profile/bank fields, not status or margin
      const allowedFields = ['name', 'owner_name', 'phone', 'location', 'bank_name', 'bank_location', 'account_number', 'ifsc_code', 'account_holder_name'];
      const filtered = {};
      allowedFields.forEach(f => { if (body[f] !== undefined) filtered[f] = body[f]; });
      return await updateVendor(vendorId, filtered);
    }

    // Only ADMIN can create/update/delete vendors
    if (decoded.role !== 'ADMIN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can manage vendors' }) };
    }

    if (method === 'POST') {
      // POST /vendors/:id/items/bulk - Add multiple items to vendor
      if (pathParts[2] === 'items' && pathParts[3] === 'bulk') {
        const vendorId = pathParts[1];
        const body = JSON.parse(event.body || '{}');
        return await addBulkVendorItems(vendorId, body.items || []);
      }
      // POST /vendors/:id/items - Add item to vendor
      if (pathParts[2] === 'items') {
        const vendorId = pathParts[1];
        const body = JSON.parse(event.body || '{}');
        return await addVendorItem(vendorId, body);
      }
      // POST /vendors - Create new vendor
      const body = JSON.parse(event.body || '{}');
      return await createVendor(body);
    }

    if (method === 'PUT') {
      // PUT /vendors/:id/items/:itemId - Update vendor item
      if (pathParts[2] === 'items' && pathParts[3]) {
        const vendorId = pathParts[1];
        const itemId = pathParts[3];
        const body = JSON.parse(event.body || '{}');
        return await updateVendorItem(vendorId, itemId, body);
      }

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
      // DELETE /vendors/:id/items/:itemId - Delete vendor item
      if (pathParts[2] === 'items' && pathParts[3]) {
        const vendorId = pathParts[1];
        const itemId = pathParts[3];
        return await deleteVendorItem(vendorId, itemId);
      }

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

// Get franchises for this vendor with stats
async function getVendorFranchises(vendorId) {
  // Get all franchises
  const franchisesResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_franchises'
  }));

  // Filter franchises that have this vendor as vendor_1 or vendor_2
  const franchises = (franchisesResult.Items || []).filter(franchise => {
    return franchise.vendor_1_id === vendorId || franchise.vendor_2_id === vendorId;
  });

  // Get orders for stats
  const ordersResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_orders'
  }));

  const allOrders = ordersResult.Items || [];

  // Calculate stats for each franchise
  const franchisesWithStats = franchises.map(franchise => {
    const franchiseOrders = allOrders.filter(order => 
      order.franchise_id === franchise.id && order.vendor_id === vendorId
    );

    const totalOrders = franchiseOrders.length;
    const pendingOrders = franchiseOrders.filter(o => o.status === 'PENDING').length;
    const completedOrders = franchiseOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED').length;

    // Calculate total revenue from completed orders
    const totalRevenue = franchiseOrders
      .filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED')
      .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);

    // Get last order date
    const lastOrderDate = franchiseOrders.length > 0
      ? franchiseOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
      : null;

    // Determine vendor slot (1 or 2)
    const vendorSlot = franchise.vendor_1_id === vendorId ? 1 : 2;
    const vendorSlotName = vendorSlot === 1 ? 'SFI' : 'RAW_MATERIALS';

    return {
      ...franchise,
      vendor_slot: vendorSlot,
      vendor_slot_name: vendorSlotName,
      stats: {
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        total_revenue: totalRevenue,
        last_order_date: lastOrderDate
      }
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(franchisesWithStats)
  };
}

// Create vendor
async function createVendor(data) {
  if (!data.email) {
    throw new Error('Email is required');
  }

  const vendorId = `vendor-${Date.now()}`;
  const vendor = {
    id: vendorId,
    name: data.name,
    owner_name: data.owner_name || '',
    location: data.location || '',
    phone: data.phone || '',
    email: data.email,
    vendor_type: data.vendor_type || 'SFI', // 'SFI' or 'RAW_MATERIALS'
    margin_percent: data.margin_percent || 5,
    // Bank details
    bank_name: data.bank_name || '',
    bank_location: data.bank_location || '',
    account_number: data.account_number || '',
    ifsc_code: data.ifsc_code || '',
    account_holder_name: data.account_holder_name || '',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Use provided password or generate a strong one
  const password = data.password || generateStrongPassword(12);

  // Create user account for this vendor using their email
  const user = {
    id: vendorId, // Same ID as vendor
    email: data.email, // Use the user-provided email
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

  // Return vendor with credentials (email as username)
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      ...vendor,
      credentials: {
        username: data.email,
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

  const fields = ['name', 'owner_name', 'location', 'phone', 'email', 'vendor_type', 'margin_percent', 'status', 'items', 'bank_name', 'bank_location', 'account_number', 'ifsc_code', 'account_holder_name'];

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

  // Also update the corresponding user record in supply_users table
  // This keeps email, name, and vendor_name in sync for login
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
    
    // Also update vendor_name field
    userUpdateExpressions.push('#vendor_name = :vendor_name');
    userExpressionAttributeNames['#vendor_name'] = 'vendor_name';
    userExpressionAttributeValues[':vendor_name'] = data.name;
  }

  // Always update the updated_at timestamp
  if (userUpdateExpressions.length > 0) {
    userUpdateExpressions.push('#updated_at = :updated_at');
    userExpressionAttributeNames['#updated_at'] = 'updated_at';
    userExpressionAttributeValues[':updated_at'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: vendorId },
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

// Get vendor items for franchise (only franchise_price visible)
async function getVendorItemsForFranchise(vendorId) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  const items = result.Item.items || [];
  // Return items with only franchise_price (hide vendor_price)
  // Fall back to vendor_price if franchise_price is not set
  const franchiseItems = items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    price: (item.franchise_price && item.franchise_price > 0) ? item.franchise_price : item.vendor_price
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(franchiseItems)
  };
}

// Add item to vendor
async function addVendorItem(vendorId, itemData) {
  if (!itemData.name || !itemData.vendor_price) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'name and vendor_price are required' })
    };
  }

  const vendorPrice = parseFloat(itemData.vendor_price);
  const franchisePrice = parseFloat(itemData.franchise_price);

  if (isNaN(vendorPrice) || vendorPrice < 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'vendor_price must be a valid positive number' })
    };
  }

  const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newItem = {
    id: itemId,
    name: itemData.name,
    category: itemData.category || 'General',
    unit: itemData.unit || 'pcs',
    vendor_price: vendorPrice,
    franchise_price: isNaN(franchisePrice) ? 0 : franchisePrice,
    created_at: new Date().toISOString()
  };

  // Get current vendor
  const vendorResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!vendorResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  const currentItems = vendorResult.Item.items || [];
  currentItems.push(newItem);

  // Update vendor with new item
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': currentItems,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(newItem)
  };
}

// Add multiple items to vendor at once
async function addBulkVendorItems(vendorId, itemsData) {
  if (!Array.isArray(itemsData) || itemsData.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'items array is required and must not be empty' })
    };
  }

  // Validate all items
  for (let i = 0; i < itemsData.length; i++) {
    const item = itemsData[i];
    if (!item.name || !item.vendor_price) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Item ${i + 1}: name and vendor_price are required` })
      };
    }
    const vendorPrice = parseFloat(item.vendor_price);
    if (isNaN(vendorPrice) || vendorPrice < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Item ${i + 1}: vendor_price must be a valid positive number` })
      };
    }
  }

  // Get current vendor
  const vendorResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!vendorResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  const currentItems = vendorResult.Item.items || [];
  const newItems = itemsData.map(item => {
    const vendorPrice = parseFloat(item.vendor_price);
    const franchisePrice = parseFloat(item.franchise_price);
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: item.name,
      category: item.category || 'General',
      unit: item.unit || 'pcs',
      vendor_price: vendorPrice,
      franchise_price: isNaN(franchisePrice) ? 0 : franchisePrice,
      created_at: new Date().toISOString()
    };
  });

  const allItems = [...currentItems, ...newItems];

  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': allItems,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ added: newItems, total: allItems.length })
  };
}

// Update vendor item
async function updateVendorItem(vendorId, itemId, itemData) {
  // Get current vendor
  const vendorResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!vendorResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  const currentItems = vendorResult.Item.items || [];
  const itemIndex = currentItems.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
  }

  // Update item fields
  if (itemData.name !== undefined) currentItems[itemIndex].name = itemData.name;
  if (itemData.category !== undefined) currentItems[itemIndex].category = itemData.category;
  if (itemData.unit !== undefined) currentItems[itemIndex].unit = itemData.unit;
  if (itemData.vendor_price !== undefined) currentItems[itemIndex].vendor_price = parseFloat(itemData.vendor_price);
  if (itemData.franchise_price !== undefined) currentItems[itemIndex].franchise_price = parseFloat(itemData.franchise_price);
  currentItems[itemIndex].updated_at = new Date().toISOString();

  // Update vendor
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': currentItems,
      ':updated_at': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(currentItems[itemIndex])
  };
}

// Delete vendor item
async function deleteVendorItem(vendorId, itemId) {
  // Get current vendor
  const vendorResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!vendorResult.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
  }

  const currentItems = vendorResult.Item.items || [];
  const filteredItems = currentItems.filter(item => item.id !== itemId);

  if (currentItems.length === filteredItems.length) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
  }

  // Update vendor
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
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
