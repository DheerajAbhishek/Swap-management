/**
 * Fix script to update staff parent_id associations
 * Run this after identifying issues with debug-staff-associations.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

async function fixStaffAssociations() {
    console.log('=== Fixing Staff-Franchise Associations ===\n');

    try {
        // Get all franchises
        const franchiseResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_franchises'
        }));
        const franchises = franchiseResult.Items || [];
        console.log(`Found ${franchises.length} franchises\n`);

        // Get all franchise users
        const userResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_users',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':role': 'FRANCHISE' }
        }));
        const franchiseUsers = userResult.Items || [];
        console.log(`Found ${franchiseUsers.length} franchise users\n`);

        // Get all franchise staff
        const staffResult = await dynamodb.send(new ScanCommand({
            TableName: 'supply_staff',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':role': 'FRANCHISE_STAFF' }
        }));
        const staff = staffResult.Items || [];
        console.log(`Found ${staff.length} franchise staff members\n`);

        let fixedCount = 0;
        let alreadyCorrectCount = 0;

        // For each staff member, try to find the correct franchise
        for (const staffMember of staff) {
            console.log(`\nChecking: ${staffMember.name} (${staffMember.email})`);
            console.log(`  Current parent_id: ${staffMember.parent_id}`);
            console.log(`  Current parent_name: ${staffMember.parent_name || 'NOT SET'}`);

            // Try to find franchise by parent_name or parent_id
            let matchingFranchise = null;

            // First check if current parent_id already matches a franchise_id in users
            const userWithId = franchiseUsers.find(u =>
                u.franchise_id === staffMember.parent_id
            );

            if (userWithId) {
                console.log(`  ✅ Already correctly associated with franchise`);
                alreadyCorrectCount++;
                continue;
            }

            // Try to find by parent_name
            if (staffMember.parent_name) {
                matchingFranchise = franchises.find(f =>
                    f.name === staffMember.parent_name
                );
            }

            // If no match by name, try by parent_id matching franchise.id
            if (!matchingFranchise && staffMember.parent_id) {
                matchingFranchise = franchises.find(f =>
                    f.id === staffMember.parent_id
                );
            }

            if (matchingFranchise) {
                // Find the user account for this franchise
                const franchiseUser = franchiseUsers.find(u =>
                    u.franchise_id === matchingFranchise.id ||
                    u.name === matchingFranchise.owner_name
                );

                if (franchiseUser && franchiseUser.franchise_id) {
                    console.log(`  🔧 Fixing association:`);
                    console.log(`     New parent_id: ${franchiseUser.franchise_id}`);
                    console.log(`     Franchise: ${matchingFranchise.name}`);

                    // Update the staff member
                    await dynamodb.send(new UpdateCommand({
                        TableName: 'supply_staff',
                        Key: { id: staffMember.id },
                        UpdateExpression: 'SET parent_id = :pid, parent_name = :pname',
                        ExpressionAttributeValues: {
                            ':pid': franchiseUser.franchise_id,
                            ':pname': matchingFranchise.name
                        }
                    }));

                    console.log(`  ✅ Fixed!`);
                    fixedCount++;
                } else {
                    console.log(`  ⚠️  Found franchise but no user account with franchise_id`);
                }
            } else {
                console.log(`  ⚠️  Could not find matching franchise`);
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Total staff checked: ${staff.length}`);
        console.log(`Already correct: ${alreadyCorrectCount}`);
        console.log(`Fixed: ${fixedCount}`);
        console.log(`Could not fix: ${staff.length - alreadyCorrectCount - fixedCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Confirmation prompt
console.log('This script will update staff parent_id associations.');
console.log('Make sure you have run debug-staff-associations.js first to understand the issues.\n');
console.log('Starting in 3 seconds...\n');

setTimeout(() => {
    fixStaffAssociations();
}, 3000);
