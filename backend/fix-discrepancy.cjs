const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

async function fixDiscrepancy() {
    try {
        console.log('Updating discrepancy disc-mm3912tpa293yk8ms...');
        console.log('Changing vendor_id from: vendor-1771564210285 (wrong/non-existent)');
        console.log('                     to: vendor-1771569032036 (test vendor - correct)');

        const result = await dynamodb.send(new UpdateCommand({
            TableName: 'supply_discrepancies',
            Key: { id: 'disc-mm3912tpa293yk8ms' },
            UpdateExpression: 'SET vendor_id = :vid, vendor_name = :vname',
            ExpressionAttributeValues: {
                ':vid': 'vendor-1771569032036',
                ':vname': 'test vendor'
            },
            ReturnValues: 'ALL_NEW'
        }));

        console.log('\n✅ Discrepancy updated successfully!');
        console.log('New vendor_id:', result.Attributes.vendor_id);
        console.log('New vendor_name:', result.Attributes.vendor_name);
    } catch (error) {
        console.error('❌ Error updating discrepancy:', error);
    }
}

fixDiscrepancy();
