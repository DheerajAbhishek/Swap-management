/**
 * Migration Script: Update existing staff records with franchise/kitchen fields
 * This adds franchise_name, franchise_id, kitchen_name, kitchen_id to existing staff records
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const STAFF_TABLE = 'supply_staff';

async function migrateStaffRecords() {
    console.log('Starting staff records migration...');

    try {
        // Scan all staff records
        const result = await dynamoDB.send(new ScanCommand({
            TableName: STAFF_TABLE
        }));

        const staff = result.Items || [];
        console.log(`Found ${staff.length} staff records to process`);

        let updated = 0;
        let skipped = 0;

        for (const member of staff) {
            const updates = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};

            // Check if fields need to be added
            if (member.role === 'FRANCHISE_STAFF') {
                // Add franchise fields if missing
                if (!member.franchise_id && member.parent_id) {
                    updates.push('#franchise_id = :franchise_id');
                    expressionAttributeNames['#franchise_id'] = 'franchise_id';
                    expressionAttributeValues[':franchise_id'] = member.parent_id;
                }
                if (!member.franchise_name && member.parent_name) {
                    updates.push('#franchise_name = :franchise_name');
                    expressionAttributeNames['#franchise_name'] = 'franchise_name';
                    expressionAttributeValues[':franchise_name'] = member.parent_name;
                }
                // Don't set empty values for kitchen fields (DynamoDB doesn't allow empty strings in GSI keys)
            } else if (member.role === 'KITCHEN_STAFF') {
                // Add kitchen fields if missing
                if (!member.kitchen_id && member.parent_id) {
                    updates.push('#kitchen_id = :kitchen_id');
                    expressionAttributeNames['#kitchen_id'] = 'kitchen_id';
                    expressionAttributeValues[':kitchen_id'] = member.parent_id;
                }
                if (!member.kitchen_name && member.parent_name) {
                    updates.push('#kitchen_name = :kitchen_name');
                    expressionAttributeNames['#kitchen_name'] = 'kitchen_name';
                    expressionAttributeValues[':kitchen_name'] = member.parent_name;
                }
                // Don't set empty values for franchise fields (DynamoDB doesn't allow empty strings in GSI keys)
            }

            // If there are updates to make, perform the update
            if (updates.length > 0) {
                try {
                    await dynamoDB.send(new UpdateCommand({
                        TableName: STAFF_TABLE,
                        Key: { id: member.id },
                        UpdateExpression: `SET ${updates.join(', ')}`,
                        ExpressionAttributeNames: expressionAttributeNames,
                        ExpressionAttributeValues: expressionAttributeValues
                    }));
                    updated++;
                    console.log(`✓ Updated ${member.name} (${member.employee_id}) - ${member.role}`);
                } catch (err) {
                    console.error(`✗ Failed to update ${member.name}:`, err.message);
                }
            } else {
                skipped++;
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Total records: ${staff.length}`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped (already migrated): ${skipped}`);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

// Run migration
migrateStaffRecords();
