const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_notifications';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Decode the simple base64 token
function decodeToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return decoded;
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';
  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  const user = decodeToken(authHeader);
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // GET /notifications - Get notifications for user
    if (method === 'GET' && (path === '/notifications' || path.endsWith('/notifications'))) {
      return await getNotifications(user, event.queryStringParameters);
    }

    // POST /notifications - Create notification (internal use)
    if (method === 'POST' && (path === '/notifications' || path.endsWith('/notifications'))) {
      const body = JSON.parse(event.body || '{}');
      return await createNotification(body);
    }

    // PUT /notifications/read-all - Mark all as read (check this BEFORE /read)
    if (method === 'PUT' && path.includes('/read-all')) {
      return await markAllAsRead(user);
    }

    // PUT /notifications/{id}/read - Mark as read
    if (method === 'PUT' && path.includes('/read')) {
      const pathParts = path.split('/');
      const notificationId = pathParts[pathParts.length - 2];
      return await markAsRead(user, notificationId);
    }

    // DELETE /notifications/{id}
    if (method === 'DELETE') {
      const pathParts = path.split('/');
      const notificationId = pathParts[pathParts.length - 1];
      return await deleteNotification(user, notificationId);
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
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function getNotifications(user, queryParams) {
  const limit = parseInt(queryParams?.limit) || 20;
  const unreadOnly = queryParams?.unread === 'true';

  // Build filter based on user role
  let filterExpression = 'user_id = :userId';
  let expressionValues = { ':userId': user.userId };

  if (unreadOnly) {
    filterExpression += ' AND is_read = :isRead';
    expressionValues[':isRead'] = false;
  }

  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionValues,
    Limit: limit * 5 // Scan more to account for filtering
  }));

  // Sort by created_at descending and limit
  const notifications = (result.Items || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      notifications,
      unreadCount,
      total: notifications.length
    })
  };
}

async function createNotification(data) {
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: data.user_id,
    type: data.type, // ORDER_NEW, ORDER_STATUS, DISCREPANCY_NEW, DISCREPANCY_RESOLVED
    title: data.title,
    message: data.message,
    link: data.link || '',
    reference_id: data.reference_id || '',
    is_read: false,
    created_at: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: notification
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(notification)
  };
}

async function markAsRead(user, notificationId) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: notificationId },
    UpdateExpression: 'SET is_read = :isRead',
    ConditionExpression: 'user_id = :userId',
    ExpressionAttributeValues: {
      ':isRead': true,
      ':userId': user.userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

async function markAllAsRead(user) {
  // Get all unread notifications for user
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'user_id = :userId AND is_read = :isRead',
    ExpressionAttributeValues: {
      ':userId': user.userId,
      ':isRead': false
    }
  }));

  // Update each one
  const updates = (result.Items || []).map(item =>
    docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: item.id },
      UpdateExpression: 'SET is_read = :isRead',
      ExpressionAttributeValues: { ':isRead': true }
    }))
  );

  await Promise.all(updates);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, updated: updates.length })
  };
}

async function deleteNotification(user, notificationId) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: notificationId },
    ConditionExpression: 'user_id = :userId',
    ExpressionAttributeValues: {
      ':userId': user.userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// Helper function to create notifications from other Lambdas
// Can be called via Lambda invoke or through API
exports.createNotificationHelper = async (data) => {
  return await createNotification(data);
};
