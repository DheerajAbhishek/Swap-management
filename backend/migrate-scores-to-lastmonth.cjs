/**
 * Migration Script: Migrate old staff scores to new staff_scores table
 * 
 * Old architecture: supply_staff.score (0-100 composite)
 * New architecture: staff_scores table with attendance/hygiene/discipline (each 0-10)
 * 
 * This script reads the old score from supply_staff and writes it as a
 * February 2026 (last month) record in the new staff_scores table.
 * 
 * Score conversion:
 *   Old score 90/100  -> normalized 9.0/10 -> each component = 9.0
 *   Old score 100/100 -> normalized 10.0/10 -> each component = 10.0
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STAFF_TABLE = 'supply_staff';
const STAFF_SCORES_TABLE = 'staff_scores';
const LAST_MONTH = '2026-02'; // February 2026

async function migrateScores() {
    console.log('===========================================');
    console.log('  Staff Score Migration: Old -> Last Month');
    console.log('===========================================\n');
    console.log(`Target month: ${LAST_MONTH} (last month)\n`);

    // Step 1: Scan all staff from supply_staff
    console.log('Step 1: Scanning staff records...');
    const staffResult = await dynamodb.send(new ScanCommand({
        TableName: STAFF_TABLE,
        FilterExpression: 'attribute_exists(score)',
        ProjectionExpression: 'id, #n, score, #r, franchise_id, franchise_name, kitchen_id, kitchen_name',
        ExpressionAttributeNames: { '#n': 'name', '#r': 'role' }
    }));

    const allStaff = staffResult.Items || [];
    console.log(`Found ${allStaff.length} staff members with existing scores.\n`);

    // Step 2: Filter only FRANCHISE_STAFF (kitchen staff don't need scoring)
    const franchiseStaff = allStaff.filter(s => s.role === 'FRANCHISE_STAFF');
    console.log(`Franchise staff to migrate: ${franchiseStaff.length}`);
    console.log(`(Kitchen staff skipped: ${allStaff.filter(s => s.role !== 'FRANCHISE_STAFF').length})\n`);

    if (franchiseStaff.length === 0) {
        console.log('No franchise staff found to migrate. Exiting.');
        return;
    }

    // Step 3: Migrate each staff member's score
    console.log('Step 2: Migrating scores to staff_scores table...\n');

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const staff of franchiseStaff) {
        const staffId = staff.id;
        const staffName = staff.name || 'Unknown';
        const oldScore = staff.score || 0; // 0-100 scale

        // Convert: 0-100 scale -> 0-10 scale
        const normalizedFromOld = parseFloat((oldScore / 10).toFixed(2));

        // Since old system had one composite score, distribute evenly
        // We'll use the converted score for all three components
        const componentScore = normalizedFromOld;
        const totalScore = parseFloat((componentScore * 3).toFixed(2));
        const normalizedScore = normalizedFromOld;

        try {
            // Check if a record already exists for this staff in last month
            const existing = await dynamodb.send(new GetCommand({
                TableName: STAFF_SCORES_TABLE,
                Key: { staff_id: staffId, month_year: LAST_MONTH }
            }));

            if (existing.Item) {
                console.log(`  ⏭  SKIP  ${staffName} (${staffId}) — already has a ${LAST_MONTH} record`);
                skipped++;
                continue;
            }

            // Write the migrated score record
            await dynamodb.send(new PutCommand({
                TableName: STAFF_SCORES_TABLE,
                Item: {
                    staff_id: staffId,
                    month_year: LAST_MONTH,
                    staff_name: staffName,
                    attendance_score: componentScore,
                    hygiene_score: componentScore,
                    discipline_score: componentScore,
                    total_score: totalScore,
                    normalized_score: normalizedScore,
                    notes: `Migrated from legacy score system. Original score: ${oldScore}/100`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    migrated: true
                }
            }));

            console.log(`  ✓  OK    ${staffName.padEnd(30)} | Old: ${String(oldScore).padStart(3)}/100 → New: ${normalizedScore.toFixed(1)}/10 | Month: ${LAST_MONTH}`);
            migrated++;
        } catch (err) {
            console.error(`  ✗  ERR   ${staffName} (${staffId}): ${err.message}`);
            errors++;
        }
    }

    // Summary
    console.log('\n===========================================');
    console.log('  Migration Complete');
    console.log('===========================================');
    console.log(`  ✓ Migrated : ${migrated}`);
    console.log(`  ⏭ Skipped  : ${skipped} (already existed)`);
    console.log(`  ✗ Errors   : ${errors}`);
    console.log('\nLegacy scores are now visible as February 2026 in the new system.');
    console.log('Any new scores entered will use the current month (March 2026+).');
}

migrateScores().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
