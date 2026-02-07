const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const ATTENDANCE_TABLE = 'supply_staff_attendance';
const STAFF_TABLE = 'supply_staff';

// CORS headers
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Generate unique ID
function generateId() {
    return `att-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
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

// Score deduction constants
const SCORE_DEDUCTIONS = {
    LATE_CHECKIN: 5,      // After 10 AM
    MISSED_CHECKIN: 10,   // No check-in for the day
    NO_CHECKOUT: 10,      // No check-out marked
    EARLY_CHECKOUT: 5     // Less than 9 hours shift
};

// Check if time is late (after 10 AM)
function isLateCheckin(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours > 10 || (hours === 10 && minutes > 0);
}

// Calculate shift duration in hours
function calculateShiftDuration(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return (end - start) / (1000 * 60 * 60); // hours
}

// Update staff score
async function updateStaffScore(staffId, deduction, reason) {
    const staffResult = await dynamodb.send(new GetCommand({
        TableName: STAFF_TABLE,
        Key: { id: staffId }
    }));

    if (!staffResult.Item) return;

    const staff = staffResult.Item;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check if score needs monthly reset
    let currentScore = staff.score || 100;
    if (staff.score_last_reset !== currentMonth) {
        currentScore = 100; // Reset score for new month
    }

    // Apply deduction
    const newScore = Math.max(0, currentScore - deduction);

    await dynamodb.send(new UpdateCommand({
        TableName: STAFF_TABLE,
        Key: { id: staffId },
        UpdateExpression: 'SET score = :score, score_last_reset = :resetMonth, updated_at = :updatedAt',
        ExpressionAttributeValues: {
            ':score': newScore,
            ':resetMonth': currentMonth,
            ':updatedAt': new Date().toISOString()
        }
    }));

    return { previousScore: currentScore, newScore, deduction, reason };
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const user = getUserFromToken(event);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // GET /attendance - Get attendance records
        if (httpMethod === 'GET' && !path.includes('/today') && !path.includes('/report')) {
            const staffId = event.queryStringParameters?.staffId || event.queryStringParameters?.staff_id;
            const franchiseId = event.queryStringParameters?.franchiseId || event.queryStringParameters?.franchise_id;
            const date = event.queryStringParameters?.date;
            const startDate = event.queryStringParameters?.startDate || event.queryStringParameters?.start_date;
            const endDate = event.queryStringParameters?.endDate || event.queryStringParameters?.end_date;

            let filterExpression = '';
            let expressionAttributeValues = {};

            // Franchise staff can only see their own attendance
            if (user.role === 'FRANCHISE_STAFF') {
                filterExpression = 'staff_id = :staffId';
                expressionAttributeValues[':staffId'] = user.staff_id || user.userId;
            }
            // Admin sees all, Franchise owner sees their staff
            else if (user.role === 'ADMIN') {
                if (staffId) {
                    filterExpression = 'staff_id = :staffId';
                    expressionAttributeValues[':staffId'] = staffId;
                }
                if (franchiseId) {
                    filterExpression += filterExpression ? ' AND franchise_id = :franchiseId' : 'franchise_id = :franchiseId';
                    expressionAttributeValues[':franchiseId'] = franchiseId;
                }
            }
            else if (user.role === 'FRANCHISE') {
                filterExpression = 'franchise_id = :franchiseId';
                expressionAttributeValues[':franchiseId'] = user.franchise_id;
                if (staffId) {
                    filterExpression += ' AND staff_id = :staffId';
                    expressionAttributeValues[':staffId'] = staffId;
                }
            }
            else {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const scanParams = {
                TableName: ATTENDANCE_TABLE
            };

            if (filterExpression) {
                scanParams.FilterExpression = filterExpression;
                scanParams.ExpressionAttributeValues = expressionAttributeValues;
            }

            const result = await dynamodb.send(new ScanCommand(scanParams));
            let attendance = result.Items || [];

            // Filter by date range
            if (startDate && endDate) {
                attendance = attendance.filter(a => {
                    const aDate = a.date;
                    return aDate >= startDate && aDate <= endDate;
                });
            } else if (date) {
                attendance = attendance.filter(a => a.date === date);
            }

            // Sort by date desc
            attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(attendance)
            };
        }

        // GET /attendance/today - Get today's attendance for staff
        if (httpMethod === 'GET' && path.includes('/today')) {
            if (user.role !== 'FRANCHISE_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise staff can access this' })
                };
            }

            const today = new Date().toISOString().split('T')[0];
            const staffId = user.staff_id || user.userId;

            // Query for today's attendance
            const result = await dynamodb.send(new ScanCommand({
                TableName: ATTENDANCE_TABLE,
                FilterExpression: 'staff_id = :staffId AND #date = :date',
                ExpressionAttributeNames: { '#date': 'date' },
                ExpressionAttributeValues: {
                    ':staffId': staffId,
                    ':date': today
                }
            }));

            const attendance = result.Items?.[0] || null;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(attendance)
            };
        }

        // GET /attendance/report - Get attendance summary report
        if (httpMethod === 'GET' && path.includes('/report')) {
            const franchiseId = event.queryStringParameters?.franchiseId;
            const reportType = event.queryStringParameters?.type || 'daily'; // daily or weekly
            const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];

            // Check permissions
            if (user.role !== 'ADMIN' && user.role !== 'FRANCHISE') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Access denied' })
                };
            }

            const targetFranchiseId = user.role === 'ADMIN' ? franchiseId : user.franchise_id;

            // Get staff for the franchise
            const staffResult = await dynamodb.send(new ScanCommand({
                TableName: STAFF_TABLE,
                FilterExpression: '#role = :role' + (targetFranchiseId ? ' AND parent_id = :parentId' : ''),
                ExpressionAttributeNames: { '#role': 'role' },
                ExpressionAttributeValues: {
                    ':role': 'FRANCHISE_STAFF',
                    ...(targetFranchiseId && { ':parentId': targetFranchiseId })
                }
            }));

            const staffList = staffResult.Items || [];

            // Calculate date range for report
            let startDate, endDate;
            if (reportType === 'weekly') {
                const d = new Date(date);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
                startDate = new Date(d.setDate(diff)).toISOString().split('T')[0];
                endDate = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0];
            } else {
                startDate = date;
                endDate = date;
            }

            // Get attendance records
            let filterExp = '#date >= :startDate AND #date <= :endDate';
            let filterValues = { ':startDate': startDate, ':endDate': endDate };
            
            if (targetFranchiseId) {
                filterExp += ' AND franchise_id = :franchiseId';
                filterValues[':franchiseId'] = targetFranchiseId;
            }

            const attendanceResult = await dynamodb.send(new ScanCommand({
                TableName: ATTENDANCE_TABLE,
                FilterExpression: filterExp,
                ExpressionAttributeNames: { '#date': 'date' },
                ExpressionAttributeValues: filterValues
            }));

            const attendanceRecords = attendanceResult.Items || [];

            // Build report
            const report = staffList.map(staff => {
                const staffAttendance = attendanceRecords.filter(a => a.staff_id === staff.id);
                
                return {
                    staff_id: staff.id,
                    employee_id: staff.employee_id,
                    staff_name: staff.name,
                    score: staff.score || 100,
                    attendance: staffAttendance,
                    present_days: staffAttendance.filter(a => a.check_in_time).length,
                    late_days: staffAttendance.filter(a => a.is_late).length,
                    early_checkout_days: staffAttendance.filter(a => a.is_early_checkout).length
                };
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    reportType,
                    startDate,
                    endDate,
                    franchiseId: targetFranchiseId,
                    report
                })
            };
        }

        // POST /attendance/checkin - Mark check-in
        if (httpMethod === 'POST' && path.includes('/checkin')) {
            if (user.role !== 'FRANCHISE_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise staff can mark attendance' })
                };
            }

            const body = JSON.parse(event.body || '{}');
            const { selfie_photo, shoes_photo } = body;

            if (!selfie_photo || !shoes_photo) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Both selfie and shoes photos are required' })
                };
            }

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const staffId = user.staff_id || user.userId;

            // Check if already checked in today
            const existingResult = await dynamodb.send(new ScanCommand({
                TableName: ATTENDANCE_TABLE,
                FilterExpression: 'staff_id = :staffId AND #date = :date',
                ExpressionAttributeNames: { '#date': 'date' },
                ExpressionAttributeValues: {
                    ':staffId': staffId,
                    ':date': today
                }
            }));

            if (existingResult.Items?.length > 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Already checked in today' })
                };
            }

            // Check if late
            const isLate = isLateCheckin(now);
            let scoreUpdate = null;

            if (isLate) {
                scoreUpdate = await updateStaffScore(staffId, SCORE_DEDUCTIONS.LATE_CHECKIN, 'Late check-in');
            }

            const attendanceRecord = {
                id: generateId(),
                staff_id: staffId,
                staff_name: user.name,
                employee_id: user.employee_id,
                franchise_id: user.franchise_id,
                franchise_name: user.franchise_name,
                date: today,
                checkin_time: now.toISOString(),
                selfie_photo: selfie_photo,
                shoes_photo: shoes_photo,
                is_late: isLate,
                checkout_time: null,
                is_early_checkout: false,
                shift_duration: null,
                status: isLate ? 'LATE' : 'ON_TIME',
                score_deduction: isLate ? SCORE_DEDUCTIONS.LATE_CHECKIN : 0,
                deduction_reason: isLate ? 'Late check-in' : null,
                created_at: now.toISOString()
            };

            await dynamodb.send(new PutCommand({
                TableName: ATTENDANCE_TABLE,
                Item: attendanceRecord
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    message: isLate ? 'Checked in (Late - score deducted)' : 'Checked in successfully',
                    attendance: attendanceRecord,
                    scoreUpdate
                })
            };
        }

        // POST /attendance/checkout - Mark check-out
        if (httpMethod === 'POST' && path.includes('/checkout')) {
            if (user.role !== 'FRANCHISE_STAFF') {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Only franchise staff can mark attendance' })
                };
            }

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const staffId = user.staff_id || user.userId;

            // Get today's check-in record
            const existingResult = await dynamodb.send(new ScanCommand({
                TableName: ATTENDANCE_TABLE,
                FilterExpression: 'staff_id = :staffId AND #date = :date',
                ExpressionAttributeNames: { '#date': 'date' },
                ExpressionAttributeValues: {
                    ':staffId': staffId,
                    ':date': today
                }
            }));

            const attendance = existingResult.Items?.[0];

            if (!attendance) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'No check-in found for today' })
                };
            }

            if (attendance.checkout_time) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Already checked out today' })
                };
            }

            // Calculate shift duration
            const shiftDuration = calculateShiftDuration(attendance.checkin_time, now);
            const isEarlyCheckout = shiftDuration < 9; // Less than 9 hours

            let scoreUpdate = null;
            if (isEarlyCheckout) {
                scoreUpdate = await updateStaffScore(staffId, SCORE_DEDUCTIONS.EARLY_CHECKOUT, 'Early checkout (< 9 hours)');
            }

            await dynamodb.send(new UpdateCommand({
                TableName: ATTENDANCE_TABLE,
                Key: { id: attendance.id },
                UpdateExpression: 'SET checkout_time = :checkOut, shift_duration = :duration, is_early_checkout = :early, #status = :status, score_deduction = :deduction, deduction_reason = :reason',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':checkOut': now.toISOString(),
                    ':duration': Math.round(shiftDuration * 60), // Store in minutes
                    ':early': isEarlyCheckout,
                    ':status': isEarlyCheckout ? 'EARLY_CHECKOUT' : 'CHECKED_OUT',
                    ':deduction': isEarlyCheckout ? (attendance.score_deduction || 0) + SCORE_DEDUCTIONS.EARLY_CHECKOUT : (attendance.score_deduction || 0),
                    ':reason': isEarlyCheckout ? 'Early checkout (< 9 hours)' : attendance.deduction_reason
                }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: isEarlyCheckout 
                        ? `Checked out (Early - ${Math.round(shiftDuration * 10) / 10} hours, score deducted)` 
                        : `Checked out successfully (${Math.round(shiftDuration * 10) / 10} hours)`,
                    shiftDuration: Math.round(shiftDuration * 100) / 100,
                    isEarlyCheckout,
                    scoreUpdate
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
