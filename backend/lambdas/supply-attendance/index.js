const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({ region: 'ap-south-1' });

const ATTENDANCE_TABLE = 'supply_staff_attendance';
const STAFF_TABLE = 'supply_staff';
const S3_BUCKET = 'swap-management-photos';

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

// Upload photo to S3 and return URL
async function uploadPhotoToS3(base64Image, photoType, staffId, timestamp) {
    try {
        // Extract base64 data (remove data URL prefix if present)
        let imageData = base64Image;
        if (base64Image.startsWith('data:')) {
            imageData = base64Image.split(',')[1];
        }

        // Generate unique filename
        const random = Math.random().toString(36).substr(2, 8);
        const key = `attendance/${staffId}/${timestamp}-${photoType}-${random}.jpg`;

        // Convert base64 to buffer
        const buffer = Buffer.from(imageData, 'base64');

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            Metadata: {
                'photo-type': photoType,
                'staff-id': staffId,
                'timestamp': timestamp.toString()
            }
        }));

        // Return S3 URL
        return `https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com/${key}`;
    } catch (error) {
        console.error(`Error uploading ${photoType} photo to S3:`, error);
        throw new Error(`Failed to upload ${photoType} photo: ${error.message}`);
    }
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
    LATE_CHECKIN: 5,      // After scheduled time + tolerance
    MISSED_CHECKIN: 10,   // No check-in for the day
    NO_CHECKOUT: 10,      // No check-out marked
    EARLY_CHECKOUT: 5     // Before scheduled time - tolerance
};

// Parse time string (HH:MM) to minutes since midnight
function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Get current time in IST as minutes since midnight
function getCurrentISTMinutes(timestamp) {
    const date = new Date(timestamp);
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(date.getTime() + istOffset);
    return istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
}

// Check if check-in is late (beyond tolerance)
// Early check-ins are always allowed without penalty
// Tolerance is +5% of shift duration after scheduled start
function isWithinCheckinTolerance(actualMinutes, scheduledStart, scheduledEnd) {
    const shiftDuration = scheduledEnd - scheduledStart;
    const tolerance = Math.round(shiftDuration * 0.05); // 5% tolerance
    const allowedEnd = scheduledStart + tolerance; // Can be late up to this time

    return {
        isLate: actualMinutes > allowedEnd, // Late if checked in after tolerance window
        isEarly: actualMinutes < scheduledStart, // Early if before scheduled start
        tolerance: tolerance,
        scheduledStart: scheduledStart,
        allowedEnd: allowedEnd
    };
}

// Check if checkout is within tolerance of scheduled end time
function isWithinCheckoutTolerance(actualMinutes, scheduledStart, scheduledEnd) {
    const shiftDuration = scheduledEnd - scheduledStart;
    const tolerance = Math.round(shiftDuration * 0.05); // 5% tolerance
    const allowedStart = scheduledEnd - tolerance;
    const allowedEnd = scheduledEnd + tolerance;

    return {
        isWithinTolerance: actualMinutes >= allowedStart && actualMinutes <= allowedEnd,
        isEarly: actualMinutes < allowedStart,
        tolerance: tolerance,
        allowedStart: allowedStart,
        allowedEnd: allowedEnd
    };
}

// Check if time is late (after 10 AM IST) - LEGACY, kept for backward compatibility
function isLateCheckin(timestamp) {
    const date = new Date(timestamp);
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(date.getTime() + istOffset);
    const hours = istTime.getUTCHours(); // Use UTC methods after offset adjustment
    const minutes = istTime.getUTCMinutes();
    // Late if after 10:00 AM (10:01 and onwards)
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

// Auto-checkout staff who haven't checked out after 12 hours
async function autoCheckoutStaleRecords(attendanceRecords) {
    const now = new Date();
    const updatedRecords = [];

    for (const record of attendanceRecords) {
        // Skip if already checked out or no check-in time
        if (record.checkout_time || !record.checkin_time) {
            updatedRecords.push(record);
            continue;
        }

        const checkinDate = new Date(record.checkin_time);
        const hoursSinceCheckin = (now - checkinDate) / (1000 * 60 * 60);

        // If more than 12 hours, auto-checkout
        if (hoursSinceCheckin >= 12) {
            const autoCheckoutTime = new Date(checkinDate.getTime() + (12 * 60 * 60 * 1000)).toISOString();

            // Update the record in DynamoDB
            await dynamodb.send(new UpdateCommand({
                TableName: ATTENDANCE_TABLE,
                Key: { id: record.id },
                UpdateExpression: 'SET checkout_time = :checkout, shift_duration = :duration, #status = :status, updated_at = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':checkout': autoCheckoutTime,
                    ':duration': 12 * 60, // 12 hours in minutes
                    ':status': 'AUTO_CHECKOUT',
                    ':updatedAt': now.toISOString()
                }
            }));

            // Apply NO_CHECKOUT score deduction
            await updateStaffScore(record.staff_id, SCORE_DEDUCTIONS.NO_CHECKOUT, 'Auto-checkout after 12 hours');

            // Update the record in our response
            record.checkout_time = autoCheckoutTime;
            record.shift_duration = 12 * 60; // 12 hours in minutes
            record.status = 'AUTO_CHECKOUT';
            record.updated_at = now.toISOString();
        }

        updatedRecords.push(record);
    }

    return updatedRecords;
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

            // Auto-checkout stale records (> 12 hours)
            attendance = await autoCheckoutStaleRecords(attendance);

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

            let attendance = result.Items?.[0] || null;

            // Auto-checkout if needed
            if (attendance) {
                const processed = await autoCheckoutStaleRecords([attendance]);
                attendance = processed[0];
            }

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

            let attendanceRecords = attendanceResult.Items || [];

            // Auto-checkout stale records before building report
            attendanceRecords = await autoCheckoutStaleRecords(attendanceRecords);

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
            const { selfie_photo, shoes_photo, mesa_photo, standing_area_photo } = body;

            if (!selfie_photo || !shoes_photo || !mesa_photo || !standing_area_photo) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'All 4 photos are required: selfie, shoes, mesa (kitchen overview), and standing area' })
                };
            }

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const staffId = user.staff_id || user.userId;

            // Get staff details including shift times
            const staffResult = await dynamodb.send(new GetCommand({
                TableName: STAFF_TABLE,
                Key: { id: staffId }
            }));

            if (!staffResult.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Staff record not found' })
                };
            }

            const staff = staffResult.Item;
            const scheduledStart = staff.shift_start_time || '10:00'; // Default 10 AM
            const scheduledEnd = staff.shift_end_time || '19:00'; // Default 7 PM

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

            // Upload photos to S3 (parallel upload for better performance)
            const timestamp = Date.now();
            let selfie_url, shoes_url, mesa_url, standing_area_url;

            try {
                [selfie_url, shoes_url, mesa_url, standing_area_url] = await Promise.all([
                    uploadPhotoToS3(selfie_photo, 'selfie', staffId, timestamp),
                    uploadPhotoToS3(shoes_photo, 'shoes', staffId, timestamp),
                    uploadPhotoToS3(mesa_photo, 'mesa', staffId, timestamp),
                    uploadPhotoToS3(standing_area_photo, 'standing-area', staffId, timestamp)
                ]);
            } catch (uploadError) {
                console.error('Photo upload error:', uploadError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Failed to upload photos', details: uploadError.message })
                };
            }

            // Validate check-in time
            // Early checkins allowed without penalty, only penalize late checkins
            const actualCheckinMinutes = getCurrentISTMinutes(now);
            const scheduledStartMinutes = parseTimeToMinutes(scheduledStart);
            const scheduledEndMinutes = parseTimeToMinutes(scheduledEnd);

            const checkinValidation = isWithinCheckinTolerance(
                actualCheckinMinutes,
                scheduledStartMinutes,
                scheduledEndMinutes
            );

            let scoreUpdate = null;
            let isLate = checkinValidation.isLate;
            let isEarly = checkinValidation.isEarly;

            // Only deduct score for late checkins (early checkins are fine)
            if (isLate) {
                scoreUpdate = await updateStaffScore(staffId, SCORE_DEDUCTIONS.LATE_CHECKIN, 'Late check-in beyond tolerance');
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
                selfie_photo: selfie_url,
                shoes_photo: shoes_url,
                mesa_photo: mesa_url,
                standing_area_photo: standing_area_url,
                scheduled_start_time: scheduledStart,
                scheduled_end_time: scheduledEnd,
                is_late: isLate,
                is_early_checkin: isEarly,
                checkout_time: null,
                is_early_checkout: false,
                shift_duration: null,
                status: isLate ? 'LATE' : (isEarly ? 'EARLY' : 'ON_TIME'),
                score_deduction: isLate ? SCORE_DEDUCTIONS.LATE_CHECKIN : 0,
                deduction_reason: isLate ? 'Late check-in beyond tolerance' : null,
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

            // Validate checkout time against scheduled end time
            const scheduledStart = attendance.scheduled_start_time || '10:00';
            const scheduledEnd = attendance.scheduled_end_time || '19:00';
            const actualCheckoutMinutes = getCurrentISTMinutes(now);
            const scheduledStartMinutes = parseTimeToMinutes(scheduledStart);
            const scheduledEndMinutes = parseTimeToMinutes(scheduledEnd);

            const checkoutValidation = isWithinCheckoutTolerance(
                actualCheckoutMinutes,
                scheduledStartMinutes,
                scheduledEndMinutes
            );

            // Calculate actual shift duration
            const shiftDuration = calculateShiftDuration(attendance.checkin_time, now);
            const isEarlyCheckout = checkoutValidation.isEarly;

            let scoreUpdate = null;
            if (isEarlyCheckout) {
                scoreUpdate = await updateStaffScore(staffId, SCORE_DEDUCTIONS.EARLY_CHECKOUT, 'Early checkout before scheduled time');
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
                    ':reason': isEarlyCheckout ? 'Early checkout before scheduled time' : attendance.deduction_reason
                }
            }));

            const scheduledShiftHours = (scheduledEndMinutes - scheduledStartMinutes) / 60;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: isEarlyCheckout
                        ? `Checked out early (${Math.round(shiftDuration * 10) / 10} hours of ${scheduledShiftHours} hours scheduled, score deducted)`
                        : `Checked out successfully (${Math.round(shiftDuration * 10) / 10} hours)`,
                    shiftDuration: Math.round(shiftDuration * 100) / 100,
                    scheduledShiftHours: Math.round(scheduledShiftHours * 100) / 100,
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
