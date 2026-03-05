const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkDiscrepancyStatus() {
    try {
        // Check one of the discrepancies mentioned
        const result = await dynamodb.send(new GetCommand({
            TableName: 'supply_discrepancies',
            Key: { id: 'disc-mm2vo9sqix7i9eu0r' } // Spicy paneer
        }));

        const disc = result.Item;

        console.log('Discrepancy: Spicy paneer');
        console.log('ID:', disc.id);
        console.log('\nStatus Flags:');
        console.log('  vendor_acknowledged:', disc.vendor_acknowledged);
        console.log('  vendor_acknowledged_at:', disc.vendor_acknowledged_at);
        console.log('  vendor_acknowledged_by_name:', disc.vendor_acknowledged_by_name);
        console.log('  vendor_notes:', disc.vendor_notes);
        console.log('\n  franchise_closed:', disc.franchise_closed);
        console.log('  franchise_closed_at:', disc.franchise_closed_at);
        console.log('\n  resolved (legacy):', disc.resolved);

        console.log('\n\nExpected Status on Franchise UI:');
        if (disc.franchise_closed) {
            console.log('  ✅ RESOLVED - Fully Complete');
        } else if (disc.vendor_acknowledged) {
            console.log('  🔔 VENDOR ACKNOWLEDGED - Waiting for you to close');
        } else {
            console.log('  ⏳ PENDING - Waiting for vendor');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkDiscrepancyStatus();
