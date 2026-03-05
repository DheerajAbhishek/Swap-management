/**
 * Staff Performance Scoring System Lambda Function
 * 
 * Handles CRUD operations for staff monthly performance scores
 * Uses DynamoDB with composite key: staff_id (PK) + month_year (SK)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STAFF_SCORES_TABLE = process.env.STAFF_SCORES_TABLE || 'staff_scores';

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
};

/**
 * Get current month_year in YYYY-MM format
 */
function getCurrentMonthYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Validate score value (must be between 0 and 10)
 */
function validateScore(score, scoreName) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error(`${scoreName} must be a number between 0 and 10`);
    }
    return numScore;
}

/**
 * Calculate total score from individual components
 */
function calculateTotalScore(attendanceScore, hygieneScore, disciplineScore) {
    return attendanceScore + hygieneScore + disciplineScore;
}

/**
 * Calculate normalized score (0-10 scale)
 */
function calculateNormalizedScore(totalScore) {
    return parseFloat((totalScore / 3).toFixed(2));
}

/**
 * Update or create staff score for current month
 * POST /staff/score
 */
async function updateStaffScore(body) {
    const {
        staff_id,
        staff_name,
        attendance_score,
        hygiene_score,
        discipline_score,
        notes
    } = body;

    // Validate required fields
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    // Validate scores
    const validatedAttendance = validateScore(attendance_score ?? 0, 'attendance_score');
    const validatedHygiene = validateScore(hygiene_score ?? 0, 'hygiene_score');
    const validatedDiscipline = validateScore(discipline_score ?? 0, 'discipline_score');

    // Calculate scores
    const totalScore = calculateTotalScore(validatedAttendance, validatedHygiene, validatedDiscipline);
    const normalizedScore = calculateNormalizedScore(totalScore);

    const month_year = getCurrentMonthYear();
    const now = new Date().toISOString();

    // Check if record already exists
    const existingRecord = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    const item = {
        staff_id,
        month_year,
        staff_name: staff_name || existingRecord.Item?.staff_name || 'Unknown',
        attendance_score: validatedAttendance,
        hygiene_score: validatedHygiene,
        discipline_score: validatedDiscipline,
        total_score: totalScore,
        normalized_score: normalizedScore,
        updated_at: now,
        created_at: existingRecord.Item?.created_at || now,
        notes: notes || ''
    };

    // Save to DynamoDB
    await dynamodb.send(new PutCommand({
        TableName: STAFF_SCORES_TABLE,
        Item: item
    }));

    return {
        success: true,
        message: existingRecord.Item ? 'Score updated successfully' : 'Score created successfully',
        data: item
    };
}

/**
 * Get staff score for current month
 * GET /staff/{staff_id}/score/current
 */
async function getCurrentMonthScore(staff_id) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    const month_year = getCurrentMonthYear();

    const result = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    if (!result.Item) {
        return {
            success: true,
            message: 'No score found for current month',
            data: null
        };
    }

    return {
        success: true,
        data: result.Item
    };
}

/**
 * Get staff score for a specific month
 * GET /staff/{staff_id}/score/{month_year}
 */
async function getMonthScore(staff_id, month_year) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }
    if (!month_year) {
        throw new Error('month_year is required');
    }

    // Validate month_year format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month_year)) {
        throw new Error('month_year must be in YYYY-MM format');
    }

    const result = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    if (!result.Item) {
        return {
            success: true,
            message: `No score found for ${month_year}`,
            data: null
        };
    }

    return {
        success: true,
        data: result.Item
    };
}

/**
 * Get staff score history (all months)
 * GET /staff/{staff_id}/score/history
 */
async function getStaffScoreHistory(staff_id, limit = 12) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    const result = await dynamodb.send(new QueryCommand({
        TableName: STAFF_SCORES_TABLE,
        KeyConditionExpression: 'staff_id = :staff_id',
        ExpressionAttributeValues: {
            ':staff_id': staff_id
        },
        ScanIndexForward: false, // Sort by month_year descending (newest first)
        Limit: parseInt(limit) || 12
    }));

    return {
        success: true,
        staff_id,
        count: result.Items?.length || 0,
        data: result.Items || []
    };
}

/**
 * Get leaderboard for a specific month
 * GET /staff/scores/leaderboard?month_year=2026-03&limit=10
 */
async function getMonthLeaderboard(month_year, limit = 10) {
    const targetMonth = month_year || getCurrentMonthYear();

    // Validate month_year format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
        throw new Error('month_year must be in YYYY-MM format');
    }

    const result = await dynamodb.send(new QueryCommand({
        TableName: STAFF_SCORES_TABLE,
        IndexName: 'month_year-index',
        KeyConditionExpression: 'month_year = :month_year',
        ExpressionAttributeValues: {
            ':month_year': targetMonth
        },
        ScanIndexForward: false, // Sort by total_score descending (highest first)
        Limit: parseInt(limit) || 10
    }));

    // Add rank to each item
    const dataWithRank = (result.Items || []).map((item, index) => ({
        ...item,
        rank: index + 1
    }));

    return {
        success: true,
        month_year: targetMonth,
        count: dataWithRank.length,
        data: dataWithRank
    };
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const path = event.path || event.rawPath || '';
        const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
        const pathParams = event.pathParameters || {};
        const queryParams = event.queryStringParameters || {};

        let result;

        // Route handling
        if (method === 'POST' && path.includes('/staff/score')) {
            // POST /staff/score - Update/create score
            const body = JSON.parse(event.body || '{}');
            result = await updateStaffScore(body);
        }
        else if (method === 'GET' && path.includes('/score/current')) {
            // GET /staff/{staff_id}/score/current - Get current month score
            const staff_id = pathParams.staff_id;
            result = await getCurrentMonthScore(staff_id);
        }
        else if (method === 'GET' && path.includes('/score/history')) {
            // GET /staff/{staff_id}/score/history - Get score history
            const staff_id = pathParams.staff_id;
            const limit = queryParams.limit;
            result = await getStaffScoreHistory(staff_id, limit);
        }
        else if (method === 'GET' && path.match(/\/staff\/[^/]+\/score\/\d{4}-\d{2}$/)) {
            // GET /staff/{staff_id}/score/{month_year} - Get specific month score
            const staff_id = pathParams.staff_id;
            const month_year = pathParams.month_year;
            result = await getMonthScore(staff_id, month_year);
        }
        else if (method === 'GET' && path.includes('/leaderboard')) {
            // GET /staff/scores/leaderboard - Get month leaderboard
            const month_year = queryParams.month_year;
            const limit = queryParams.limit;
            result = await getMonthLeaderboard(month_year, limit);
        }
        else {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Endpoint not found'
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: error.statusCode || 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'An error occurred'
            })
        };
    }
};
