const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkVendor() {
    try {
        // Check the vendor in the discrepancy
        const vendor1 = await dynamodb.send(new GetCommand({
            TableName: 'supply_vendors',
            Key: { id: 'vendor-1771564210285' }
        }));

        console.log('Vendor in discrepancy (vendor-1771564210285):');
        console.log(JSON.stringify(vendor1.Item, null, 2));

        console.log('\n---\n');

        // Check the order
        const order = await dynamodb.send(new GetCommand({
            TableName: 'supply_orders',
            Key: { id: 'ord-mlw2yoh752mewsbgb' }
        }));

        console.log('Order (ord-mlw2yoh752mewsbgb):');
        console.log('vendor_id:', order.Item?.vendor_id);
        console.log('vendor_name:', order.Item?.vendor_name);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkVendor();
