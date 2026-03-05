const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const axios = require('axios');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const API_ENDPOINT = 'https://5gkkt6bl56.execute-api.ap-south-1.amazonaws.com/prod';

// Score calculation constants (same as backend)
const PENALTIES = {
    LATE_CHECKIN: 5,
    MISSED_CHECKOUT: 10,
    EARLY_CHECKOUT: 5,
    ABSENT: 10
};

function calculateDynamicScore(statistics) {
    const stats = statistics || {};
    const daysSinceJoining = stats.total_days_since_joining || 0;
    const daysWorked = stats.total_days_worked || 0;
    const lateCheckins = stats.total_days_late || 0;
    const missedCheckouts = stats.total_missed_checkouts || 0;
    const earlyCheckouts = stats.total_early_checkouts || 0;

    // Calculate absent days (exclude weekends - roughly 2/7 of total days)
    const expectedWorkDays = Math.floor(daysSinceJoining * (5 / 7)); // Approximate weekdays
    const absentDays = Math.max(0, expectedWorkDays - daysWorked);

    let score = 100;
    score -= (lateCheckins * PENALTIES.LATE_CHECKIN);
    score -= (missedCheckouts * PENALTIES.MISSED_CHECKOUT);
    score -= (earlyCheckouts * PENALTIES.EARLY_CHECKOUT);
    score -= (absentDays * PENALTIES.ABSENT);

    return Math.max(0, score);
}

async function getStaffAttendanceStats(staffId, token) {
    try {
        const response = await axios.get(
            `${API_ENDPOINT}/staff/${staffId}/attendance-stats`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Failed to get stats for ${staffId}:`, error.response?.data || error.message);
        return null;
    }
}

async function recalculateAllScores() {
    try {
        console.log('🔄 Starting staff score recalculation...\n');

        // Step 1: Get all staff
        console.log('📋 Fetching all staff members...');
        const staffResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_staff'
        }));

        const allStaff = staffResult.Items || [];
        const staffOnly = allStaff.filter(s =>
            s.role === 'FRANCHISE_STAFF' // Only franchise staff have attendance tracking
        );

        console.log(`Found ${staffOnly.length} franchise staff members to process\n`);

        // Step 2: Get admin token for API calls
        // For this script, we'll directly access DynamoDB and calculate from attendance table
        // This avoids needing authentication

        // Get all attendance records
        console.log('📊 Fetching all attendance records...');
        const attendanceResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_staff_attendance'
        }));

        const allAttendance = attendanceResult.Items || [];
        console.log(`Found ${allAttendance.length} attendance records\n`);

        // Group attendance by staff_id
        const attendanceByStaff = {};
        allAttendance.forEach(record => {
            if (!attendanceByStaff[record.staff_id]) {
                attendanceByStaff[record.staff_id] = [];
            }
            attendanceByStaff[record.staff_id].push(record);
        });

        // Step 3: Process each staff member
        let updated = 0;
        let skipped = 0;
        let failed = 0;

        const currentMonth = new Date().toISOString().slice(0, 7);

        for (const staff of staffOnly) {
            const staffAttendance = attendanceByStaff[staff.id] || [];

            // Calculate statistics
            const joiningDate = new Date(staff.joining_date || staff.created_at);
            const today = new Date();
            const daysSinceJoining = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24));

            const daysWorked = staffAttendance.filter(a => a.checkin_time).length;
            const totalDaysLate = staffAttendance.filter(a => a.is_late || a.status === 'LATE').length;
            const totalMissedCheckouts = staffAttendance.filter(a =>
                a.checkin_time && !a.checkout_time && a.status !== 'CHECKED_IN'
            ).length;
            const totalEarlyCheckouts = staffAttendance.filter(a => a.status === 'EARLY_CHECKOUT').length;

            const statistics = {
                total_days_since_joining: daysSinceJoining,
                total_days_worked: daysWorked,
                total_days_late: totalDaysLate,
                total_missed_checkouts: totalMissedCheckouts,
                total_early_checkouts: totalEarlyCheckouts
            };

            // Calculate new score
            const newScore = calculateDynamicScore(statistics);
            const oldScore = staff.score || 100;

            // Only update if score changed
            if (newScore !== oldScore) {
                try {
                    await dynamodb.send(new UpdateCommand({
                        TableName: 'supply_staff',
                        Key: { id: staff.id },
                        UpdateExpression: 'SET score = :score, score_last_reset = :month, updated_at = :now',
                        ExpressionAttributeValues: {
                            ':score': newScore,
                            ':month': currentMonth,
                            ':now': new Date().toISOString()
                        }
                    }));

                    console.log(`✅ ${staff.name} (${staff.employee_id})`);
                    console.log(`   Score: ${oldScore} → ${newScore}`);
                    console.log(`   Stats: ${daysWorked}/${daysSinceJoining} days | Late: ${totalDaysLate} | Missed: ${totalMissedCheckouts}`);
                    console.log('');

                    updated++;
                } catch (error) {
                    console.log(`❌ Failed to update ${staff.name}: ${error.message}`);
                    failed++;
                }
            } else {
                console.log(`⏭️  ${staff.name} (${staff.employee_id}) - Score unchanged (${oldScore})`);
                skipped++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Recalculation Summary:');
        console.log('='.repeat(60));
        console.log(`Total Staff: ${staffOnly.length}`);
        console.log(`✅ Updated: ${updated}`);
        console.log(`⏭️  Skipped (unchanged): ${skipped}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error during recalculation:', error);
    }
}

// Run the script
console.log('🚀 Staff Score Recalculation Script');
console.log('='.repeat(60));
console.log('This script will recalculate all staff scores based on');
console.log('their actual attendance history and update the database.');
console.log('='.repeat(60));
console.log('');

recalculateAllScores();
