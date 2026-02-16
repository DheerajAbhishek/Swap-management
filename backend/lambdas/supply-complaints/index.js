/**
 * Supply Complaints Lambda - Manage franchise complaints
 * Uses AWS SDK v3 for Node.js 18+
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_complaints';

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
      const complaintId = pathParts[1];

      if (complaintId) {
        return await getComplaint(complaintId, decoded);
      }

      // Franchise and Franchise Staff can only see their franchise's complaints
      if (decoded.role === 'FRANCHISE' || decoded.role === 'FRANCHISE_STAFF') {
        return await getComplaintsByFranchise(decoded.franchise_id);
      }

      // Kitchen and Kitchen Staff can see complaints related to their kitchen
      if (decoded.role === 'KITCHEN' || decoded.role === 'KITCHEN_STAFF') {
        const vendorId = decoded.vendor_id || decoded.userId;
        return await getComplaintsByVendor(vendorId);
      }

      // Admin can see all or filter
      if (decoded.role === 'ADMIN') {
        if (queryParams.franchise_id) {
          return await getComplaintsByFranchise(queryParams.franchise_id);
        }
        if (queryParams.vendor_id) {
          return await getComplaintsByVendor(queryParams.vendor_id);
        }
        return await getAllComplaints();
      }

      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    if (method === 'POST') {
      // Allow FRANCHISE, FRANCHISE_STAFF, KITCHEN, KITCHEN_STAFF, and ADMIN to create complaints
      const allowedRoles = ['FRANCHISE', 'FRANCHISE_STAFF', 'KITCHEN', 'KITCHEN_STAFF', 'ADMIN'];
      if (!allowedRoles.includes(decoded.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'You do not have permission to submit complaints' }) };
      }
      const body = JSON.parse(event.body || '{}');
      return await createComplaint(body, decoded);
    }

    if (method === 'PUT') {
      // ADMIN and KITCHEN can update complaint status
      if (decoded.role !== 'ADMIN' && decoded.role !== 'KITCHEN') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin or kitchen can update complaints' }) };
      }
      const complaintId = pathParts[1];
      const body = JSON.parse(event.body || '{}');
      return await updateComplaint(complaintId, body, decoded);
    }

    if (method === 'DELETE') {
      // Only ADMIN can delete
      if (decoded.role !== 'ADMIN') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admin can delete complaints' }) };
      }
      const complaintId = pathParts[1];
      return await deleteComplaint(complaintId);
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

// Get all complaints
async function getAllComplaints() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  // Sort by date descending
  const sorted = (result.Items || []).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sorted)
  };
}

// Get complaints by franchise
async function getComplaintsByFranchise(franchiseId) {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'franchise_id = :franchiseId',
    ExpressionAttributeValues: {
      ':franchiseId': franchiseId
    }
  }));

  const sorted = (result.Items || []).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sorted)
  };
}

// Get complaints by vendor (kitchen) - all franchises assigned to this vendor
async function getComplaintsByVendor(vendorId) {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'vendor_id = :vendorId',
    ExpressionAttributeValues: {
      ':vendorId': vendorId
    }
  }));

  const sorted = (result.Items || []).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sorted)
  };
}

// Get single complaint
async function getComplaint(complaintId, decoded) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: complaintId }
  }));

  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Complaint not found' }) };
  }

  // Check access
  const complaint = result.Item;
  if (decoded.role === 'FRANCHISE' && complaint.franchise_id !== decoded.franchise_id) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(complaint)
  };
}

// Create complaint
async function createComplaint(data, decoded) {
  // Determine franchise info based on role
  let franchiseId = decoded.franchise_id || data.franchise_id || '';
  let franchiseName = decoded.franchise_name || data.franchise_name || '';
  let vendorId = data.vendor_id || '';
  let vendorName = data.vendor_name || '';

  // For Kitchen/Kitchen Staff, use order's franchise info if available
  if ((decoded.role === 'KITCHEN' || decoded.role === 'KITCHEN_STAFF') && !franchiseId) {
    franchiseId = data.franchise_id || '';
    franchiseName = data.franchise_name || '';
  }

  // For Admin, use the data provided
  if (decoded.role === 'ADMIN') {
    franchiseId = data.franchise_id || '';
    franchiseName = data.franchise_name || '';
  }

  // If vendor_id not provided and we have a franchise_id, look up the franchise's assigned vendor
  if (!vendorId && franchiseId) {
    try {
      const franchiseResult = await dynamoDB.send(new GetCommand({
        TableName: 'supply_franchises',
        Key: { id: franchiseId }
      }));
      if (franchiseResult.Item) {
        vendorId = franchiseResult.Item.vendor_id || '';
        vendorName = franchiseResult.Item.vendor_name || '';
      }
    } catch (err) {
      console.error('Failed to fetch franchise vendor info:', err);
    }
  }

  // If still no vendor_id and user is franchise/franchise_staff, try from token
  if (!vendorId && (decoded.role === 'FRANCHISE' || decoded.role === 'FRANCHISE_STAFF')) {
    vendorId = decoded.vendor_id || '';
    vendorName = decoded.vendor_name || '';
  }

  const complaint = {
    id: `complaint-${Date.now()}`,
    franchise_id: franchiseId,
    franchise_name: franchiseName,
    vendor_id: vendorId, // The kitchen this complaint is about
    vendor_name: vendorName,
    category: data.category || 'GENERAL', // QUALITY, DELIVERY, QUANTITY, PACKAGING, GENERAL
    subject: data.subject,
    description: data.description,
    priority: data.priority || 'MEDIUM', // LOW, MEDIUM, HIGH, URGENT
    status: 'OPEN', // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    order_id: data.order_id || '', // Optional: related order
    order_number: data.order_number || '', // Order number for display
    photos: data.photos || [], // S3 URLs for photos
    attachments: data.attachments || [], // Can contain photo info
    response: '',
    responded_by: '',
    responded_at: '',
    resolved_at: '',
    created_by: decoded.userId || decoded.id || '',
    created_by_name: decoded.name || decoded.username || '',
    created_by_role: decoded.role || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await dynamoDB.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: complaint
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(complaint)
  };
}

// Update complaint (status, response)
async function updateComplaint(complaintId, data, decoded) {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Allow updating status and response
  if (data.status !== undefined) {
    updateExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = data.status;

    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      updateExpressions.push('#resolved_at = :resolved_at');
      expressionAttributeNames['#resolved_at'] = 'resolved_at';
      expressionAttributeValues[':resolved_at'] = new Date().toISOString();
    }
  }

  if (data.response !== undefined) {
    updateExpressions.push('#response = :response');
    expressionAttributeNames['#response'] = 'response';
    expressionAttributeValues[':response'] = data.response;

    updateExpressions.push('#responded_by = :responded_by');
    expressionAttributeNames['#responded_by'] = 'responded_by';
    expressionAttributeValues[':responded_by'] = decoded.role === 'ADMIN' ? 'Admin' : (decoded.franchise_name || 'Kitchen');

    updateExpressions.push('#responded_at = :responded_at');
    expressionAttributeNames['#responded_at'] = 'responded_at';
    expressionAttributeValues[':responded_at'] = new Date().toISOString();
  }

  updateExpressions.push('#updated_at = :updated_at');
  expressionAttributeNames['#updated_at'] = 'updated_at';
  expressionAttributeValues[':updated_at'] = new Date().toISOString();

  if (updateExpressions.length === 1) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No fields to update' }) };
  }

  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: complaintId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));

  // Return updated complaint
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: complaintId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item)
  };
}

// Delete complaint
async function deleteComplaint(complaintId) {
  await dynamoDB.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: complaintId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Complaint deleted' })
  };
}
