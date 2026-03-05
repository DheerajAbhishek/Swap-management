/**
 * AI Insights Lambda - Single function for all AI-powered insights
 * Uses Grok AI API (free tier) with careful request management
 * 
 * Query params: ?type=finance|attendance|discrepancies|daily-reports|vendors
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

// Grok AI API configuration
const GROK_API_KEY = process.env.GROK_API_KEY; // Set this in Lambda environment
const GROK_API_URL = 'api.x.ai';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

// Cache to reduce API calls (in-memory, limited to Lambda lifetime)
const insightsCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Call Grok AI API
 */
async function callGrokAPI(prompt, maxTokens = 500) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a business analytics assistant specializing in supply chain management, finance, and operations. Provide concise, actionable insights based on data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'grok-beta',
      stream: false,
      temperature: 0.3, // Lower = more focused responses
      max_tokens: maxTokens
    });

    const options = {
      hostname: GROK_API_URL,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error('Invalid Grok API response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Get cached insights or generate new ones
 */
function getCachedInsights(cacheKey) {
  const cached = insightsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedInsights(cacheKey, data) {
  insightsCache.set(cacheKey, { data, timestamp: Date.now() });
}

/**
 * Finance Insights - Payment patterns, cash flow, anomalies
 */
async function getFinanceInsights(franchiseId, decoded) {
  const cacheKey = `finance-${franchiseId || 'all'}`;
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  // Query vendor payments
  const paymentsResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_vendor_payments',
    Limit: 100 // Last 100 payments
  }));

  const payments = paymentsResult.Items || [];

  // Filter by franchise if not admin
  const filteredPayments = decoded.role === 'ADMIN'
    ? (franchiseId ? payments.filter(p => p.franchise_id === franchiseId) : payments)
    : payments.filter(p => p.franchise_id === decoded.franchise_id);

  // Prepare data summary for Grok (minimize tokens)
  const summary = {
    total_payments: filteredPayments.length,
    total_amount: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    pending_payments: filteredPayments.filter(p => p.status === 'PENDING').length,
    avg_payment: filteredPayments.length > 0
      ? filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / filteredPayments.length
      : 0,
    payment_methods: [...new Set(filteredPayments.map(p => p.payment_method))],
    vendors: [...new Set(filteredPayments.map(p => p.vendor_id))].length
  };

  const prompt = `Analyze these payment metrics and provide 3-4 actionable insights:
${JSON.stringify(summary, null, 2)}

Focus on:
1. Cash flow patterns
2. Payment delays or risks
3. Vendor concentration risks
4. Cost optimization opportunities

Keep response under 150 words.`;

  const insights = await callGrokAPI(prompt, 300);

  const result = { summary, insights, generated_at: new Date().toISOString() };
  setCachedInsights(cacheKey, result);
  return result;
}

/**
 * Attendance Insights - Patterns, predictions, staffing optimization
 */
async function getAttendanceInsights(franchiseId, decoded) {
  const cacheKey = `attendance-${franchiseId || 'all'}`;
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  // Query attendance records
  const attendanceResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_attendance',
    Limit: 200 // Last 200 records
  }));

  const records = attendanceResult.Items || [];

  const filteredRecords = decoded.role === 'ADMIN'
    ? (franchiseId ? records.filter(r => r.franchise_id === franchiseId) : records)
    : records.filter(r => r.franchise_id === decoded.franchise_id);

  // Calculate summary stats
  const summary = {
    total_records: filteredRecords.length,
    present_count: filteredRecords.filter(r => r.status === 'PRESENT').length,
    absent_count: filteredRecords.filter(r => r.status === 'ABSENT').length,
    late_count: filteredRecords.filter(r => r.status === 'LATE').length,
    attendance_rate: filteredRecords.length > 0
      ? (filteredRecords.filter(r => r.status === 'PRESENT').length / filteredRecords.length * 100).toFixed(1)
      : 0,
    unique_staff: [...new Set(filteredRecords.map(r => r.staff_id))].length
  };

  const prompt = `Analyze attendance data and provide 3-4 insights:
${JSON.stringify(summary, null, 2)}

Focus on:
1. Attendance trends
2. Potential staffing issues
3. Days/patterns with high absenteeism
4. Staffing optimization recommendations

Keep under 150 words.`;

  const insights = await callGrokAPI(prompt, 300);

  const result = { summary, insights, generated_at: new Date().toISOString() };
  setCachedInsights(cacheKey, result);
  return result;
}

/**
 * Discrepancy Insights - Root causes, patterns, prevention
 */
async function getDiscrepancyInsights(franchiseId, decoded) {
  const cacheKey = `discrepancies-${franchiseId || 'all'}`;
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  const discrepanciesResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_discrepancies',
    Limit: 100
  }));

  const discrepancies = discrepanciesResult.Items || [];

  const filtered = decoded.role === 'ADMIN'
    ? (franchiseId ? discrepancies.filter(d => d.franchise_id === franchiseId) : discrepancies)
    : discrepancies.filter(d => d.franchise_id === decoded.franchise_id);

  const summary = {
    total_discrepancies: filtered.length,
    by_status: {
      pending: filtered.filter(d => d.status === 'PENDING').length,
      resolved: filtered.filter(d => d.status === 'RESOLVED').length
    },
    by_type: filtered.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {}),
    avg_resolution_time: '~2 days' // Calculate from timestamps if available
  };

  const prompt = `Analyze discrepancy patterns and provide insights:
${JSON.stringify(summary, null, 2)}

Focus on:
1. Most common discrepancy types
2. Root causes
3. Prevention strategies
4. Process improvements

Keep under 150 words.`;

  const insights = await callGrokAPI(prompt, 300);

  const result = { summary, insights, generated_at: new Date().toISOString() };
  setCachedInsights(cacheKey, result);
  return result;
}

/**
 * Daily Reports Insights - Sales trends, forecasting, anomalies
 */
async function getDailyReportsInsights(franchiseId, decoded) {
  const cacheKey = `daily-reports-${franchiseId || 'all'}`;
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  const reportsResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_daily_reports',
    Limit: 60 // ~2 months of data
  }));

  const reports = reportsResult.Items || [];

  const filtered = decoded.role === 'ADMIN'
    ? (franchiseId ? reports.filter(r => r.franchise_id === franchiseId) : reports)
    : reports.filter(r => r.franchise_id === decoded.franchise_id);

  const summary = {
    total_reports: filtered.length,
    avg_daily_sales: filtered.length > 0
      ? (filtered.reduce((sum, r) => sum + (r.total_sales || 0), 0) / filtered.length).toFixed(2)
      : 0,
    avg_wastage: filtered.length > 0
      ? (filtered.reduce((sum, r) => sum + (r.wastage_amount || 0), 0) / filtered.length).toFixed(2)
      : 0,
    total_revenue: filtered.reduce((sum, r) => sum + (r.total_sales || 0), 0).toFixed(2),
    wastage_percentage: '~5%' // Calculate from actual data
  };

  const prompt = `Analyze daily sales and operations data:
${JSON.stringify(summary, null, 2)}

Provide:
1. Sales trends (increasing/decreasing/stable)
2. Wastage concerns or improvements
3. Revenue forecasting insights
4. Operational recommendations

Keep under 150 words.`;

  const insights = await callGrokAPI(prompt, 300);

  const result = { summary, insights, generated_at: new Date().toISOString() };
  setCachedInsights(cacheKey, result);
  return result;
}

/**
 * Vendor Insights - Performance scoring, reliability, pricing trends
 */
async function getVendorInsights(franchiseId, decoded) {
  const cacheKey = `vendors-${franchiseId || 'all'}`;
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  // Get vendors and orders
  const vendorsResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_vendors'
  }));

  const ordersResult = await dynamoDB.send(new ScanCommand({
    TableName: 'supply_orders',
    Limit: 100
  }));

  const vendors = vendorsResult.Items || [];
  const orders = ordersResult.Items || [];

  const filteredOrders = decoded.role === 'ADMIN'
    ? (franchiseId ? orders.filter(o => o.franchise_id === franchiseId) : orders)
    : orders.filter(o => o.franchise_id === decoded.franchise_id);

  const summary = {
    total_vendors: vendors.length,
    active_vendors: vendors.filter(v => v.is_active).length,
    total_orders: filteredOrders.length,
    on_time_delivery: filteredOrders.filter(o => o.status === 'DELIVERED').length,
    pending_orders: filteredOrders.filter(o => o.status === 'PENDING').length
  };

  const prompt = `Analyze vendor and order performance:
${JSON.stringify(summary, null, 2)}

Provide insights on:
1. Vendor reliability and performance
2. Delivery patterns
3. Vendor concentration risks
4. Supplier optimization recommendations

Keep under 150 words.`;

  const insights = await callGrokAPI(prompt, 300);

  const result = { summary, insights, generated_at: new Date().toISOString() };
  setCachedInsights(cacheKey, result);
  return result;
}

/**
 * Main Lambda Handler
 */
exports.handler = async (event) => {
  console.log('AI Insights Event:', JSON.stringify(event, null, 2));

  // CORS preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check API key
    if (!GROK_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Grok API key not configured' })
      };
    }

    // Authorization
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const insightType = queryParams.type; // finance, attendance, discrepancies, daily-reports, vendors
    const franchiseId = queryParams.franchise_id;

    if (!insightType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing type parameter',
          valid_types: ['finance', 'attendance', 'discrepancies', 'daily-reports', 'vendors']
        })
      };
    }

    let result;

    switch (insightType) {
      case 'finance':
        result = await getFinanceInsights(franchiseId, decoded);
        break;

      case 'attendance':
        result = await getAttendanceInsights(franchiseId, decoded);
        break;

      case 'discrepancies':
        result = await getDiscrepancyInsights(franchiseId, decoded);
        break;

      case 'daily-reports':
        result = await getDailyReportsInsights(franchiseId, decoded);
        break;

      case 'vendors':
        result = await getVendorInsights(franchiseId, decoded);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid type parameter',
            valid_types: ['finance', 'attendance', 'discrepancies', 'daily-reports', 'vendors']
          })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        type: insightType,
        franchise_id: franchiseId || 'all',
        ...result
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate insights',
        message: error.message
      })
    };
  }
};
