/**
 * Debug script to check staff-franchise associations
 * Run this to see why franchise owners can't see their staff
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

async function debugStaffAssociations() {
    console.log('=== Debugging Staff-Franchise Associations ===\n');

    try {
        // Get all franchise users
        console.log('1. Fetching all franchise users...');
        const franchiseResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_users',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':role': 'FRANCHISE' }
        }));
        const franchiseUsers = franchiseResult.Items || [];
        console.log(`   Found ${franchiseUsers.length} franchise users\n`);

        // Get all franchise staff
        console.log('2. Fetching all franchise staff...');
        const staffResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_staff',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':role': 'FRANCHISE_STAFF' }
        }));
        const staff = staffResult.Items || [];
        console.log(`   Found ${staff.length} franchise staff members\n`);

        // Check associations
        console.log('3. Checking associations:\n');

        for (const franchise of franchiseUsers) {
            console.log(`📋 Franchise: ${franchise.name} (${franchise.email})`);
            console.log(`   User ID: ${franchise.userId}`);
            console.log(`   Franchise ID: ${franchise.franchise_id || 'NOT SET ⚠️'}`);

            // Find staff with this parent_id
            const franchiseStaff = staff.filter(s =>
                s.parent_id === franchise.franchise_id ||
                s.parent_id === franchise.userId
            );

            console.log(`   Staff members: ${franchiseStaff.length}`);
            franchiseStaff.forEach(s => {
                console.log(`      - ${s.name} (parent_id: ${s.parent_id})`);
            });
            console.log('');
        }

        // Check for orphaned staff
        console.log('\n4. Checking for orphaned staff (no matching franchise):\n');
        const franchiseIds = new Set(franchiseUsers.map(f => f.franchise_id));
        const userIds = new Set(franchiseUsers.map(f => f.userId));

        const orphanedStaff = staff.filter(s =>
            !franchiseIds.has(s.parent_id) && !userIds.has(s.parent_id)
        );

        if (orphanedStaff.length > 0) {
            console.log(`⚠️  Found ${orphanedStaff.length} orphaned staff members:`);
            orphanedStaff.forEach(s => {
                console.log(`   - ${s.name} (${s.email})`);
                console.log(`     parent_id: ${s.parent_id}`);
                console.log(`     parent_name: ${s.parent_name || 'NOT SET'}`);
            });
        } else {
            console.log('✅ No orphaned staff found');
        }

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log(`Total Franchises: ${franchiseUsers.length}`);
        console.log(`Total Staff: ${staff.length}`);
        console.log(`Orphaned Staff: ${orphanedStaff.length}`);

        // Check if any franchise users are missing franchise_id
        const missingFranchiseId = franchiseUsers.filter(f => !f.franchise_id);
        if (missingFranchiseId.length > 0) {
            console.log(`\n⚠️  WARNING: ${missingFranchiseId.length} franchise users missing franchise_id:`);
            missingFranchiseId.forEach(f => {
                console.log(`   - ${f.name} (${f.email})`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugStaffAssociations();
