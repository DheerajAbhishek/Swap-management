/**
 * Supply Daily Reports Lambda - Manage daily closing, wastage, sales
 * Uses AWS SDK v3 for Node.js 18+
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_daily_reports';

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
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
      // GET /daily-reports/range - Get reports for date range
      if (pathParts[1] === 'range') {
        const startDate = queryParams.start_date;
        const endDate = queryParams.end_date;
        const franchiseId = queryParams.franchise_id;

        if (decoded.role === 'ADMIN') {
          // Admin can see all or filter by franchise
          return await getReportsByDateRange(startDate, endDate, franchiseId);
        } else if (decoded.role === 'FRANCHISE') {
          // Franchise can only see their own
          return await getReportsByDateRange(startDate, endDate, decoded.franchise_id);
        }
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
      }

      // GET /daily-reports?date=YYYY-MM-DD&franchise_id=xxx
      const date = queryParams.date;
      const franchiseId = queryParams.franchise_id;

      if (decoded.role === 'ADMIN') {
        if (date && franchiseId) {
          return await getReport(franchiseId, date);
        }
        // Get all reports for a date
        if (date) {
          return await getReportsByDate(date);
        }
        return await getAllReports();
      } else if (decoded.role === 'FRANCHISE') {
        if (date) {
          return await getReport(decoded.franchise_id, date);
        }
        return await getReportsByFranchise(decoded.franchise_id);
      }

      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Only FRANCHISE can submit their own report, ADMIN can submit for any
      if (decoded.role === 'FRANCHISE') {
        body.franchise_id = decoded.franchise_id;
        body.franchise_name = decoded.franchise_name;
      } else if (decoded.role !== 'ADMIN') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
      }

      return await saveReport(body);
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      // Only FRANCHISE can update their own report, ADMIN can update any
      if (decoded.role === 'FRANCHISE') {
        body.franchise_id = decoded.franchise_id;
      } else if (decoded.role !== 'ADMIN') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
      }

      return await updateReport(body);
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

// Get single report by franchise and date
async function getReport(franchiseId, date) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      franchise_id: franchiseId,
      report_date: date
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item || null)
  };
}

// Get all reports for a franchise
async function getReportsByFranchise(franchiseId) {
  const result = await dynamoDB.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'franchise_id = :fid',
    ExpressionAttributeValues: {
      ':fid': franchiseId
    },
    ScanIndexForward: false // Most recent first
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Get all reports for a specific date
async function getReportsByDate(date) {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'report_date = :date',
    ExpressionAttributeValues: {
      ':date': date
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Get reports by date range
async function getReportsByDateRange(startDate, endDate, franchiseId) {
  let filterExpression = 'report_date BETWEEN :start AND :end';
  const expressionAttributeValues = {
    ':start': startDate,
    ':end': endDate
  };

  if (franchiseId) {
    filterExpression += ' AND franchise_id = :fid';
    expressionAttributeValues[':fid'] = franchiseId;
  }

  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Get all reports
async function getAllReports() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || [])
  };
}

// Save/Create daily report
async function saveReport(data) {
  const report = {
    franchise_id: data.franchise_id,
    report_date: data.date || new Date().toISOString().split('T')[0],
    franchise_name: data.franchise_name || '',
    sales: data.sales || 0,
    closing_items: data.closing_items || [],
    closing_total: data.closing_total || 0,
    wastage_items: data.wastage_items || [],
    wastage_total: data.wastage_total || 0,
    bill_total: data.bill_total || 0,
    // Calculated fields
    gst: (data.sales || 0) * 0.05,
    royalty: ((data.sales || 0) - (data.sales || 0) * 0.05) * (data.royalty_percent || 5) / 100,
    cogs_percent: data.sales > 0
      ? (((data.bill_total || 0) - (data.closing_total || 0) - (data.wastage_total || 0)) / data.sales) * 100
      : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Calculate net pay
  report.net_pay = report.sales - report.gst - report.royalty - report.bill_total;

  await dynamoDB.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: report
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(report)
  };
}

// Update daily report
async function updateReport(data) {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const fields = ['sales', 'closing_items', 'closing_total', 'wastage_items', 'wastage_total', 'bill_total'];

  fields.forEach(field => {
    if (data[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = data[field];
    }
  });

  // Recalculate derived fields
  const sales = data.sales || 0;
  const closingTotal = data.closing_total || 0;
  const wastageTotal = data.wastage_total || 0;
  const billTotal = data.bill_total || 0;
  const royaltyPercent = data.royalty_percent || 5;

  const gst = sales * 0.05;
  const royalty = (sales - gst) * royaltyPercent / 100;
  const cogsPercent = sales > 0 ? ((billTotal - closingTotal - wastageTotal) / sales) * 100 : 0;
  const netPay = sales - gst - royalty - billTotal;

  updateExpressions.push('#gst = :gst', '#royalty = :royalty', '#cogs_percent = :cogs_percent', '#net_pay = :net_pay', '#updated_at = :updated_at');
  expressionAttributeNames['#gst'] = 'gst';
  expressionAttributeNames['#royalty'] = 'royalty';
  expressionAttributeNames['#cogs_percent'] = 'cogs_percent';
  expressionAttributeNames['#net_pay'] = 'net_pay';
  expressionAttributeNames['#updated_at'] = 'updated_at';
  expressionAttributeValues[':gst'] = gst;
  expressionAttributeValues[':royalty'] = royalty;
  expressionAttributeValues[':cogs_percent'] = cogsPercent;
  expressionAttributeValues[':net_pay'] = netPay;
  expressionAttributeValues[':updated_at'] = new Date().toISOString();

  const result = await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      franchise_id: data.franchise_id,
      report_date: data.date
    },
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
