const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function backfillVendorIds() {
    try {
        console.log('Step 1: Getting all discrepancies without vendor_id...\n');

        const result = await dynamodb.send(new ScanCommand({
            TableName: 'supply_discrepancies'
        }));

        const discrepancies = result.Items || [];
        const missingVendor = discrepancies.filter(d => !d.vendor_id);

        console.log(`Found ${missingVendor.length} discrepancies without vendor_id\n`);

        // Group by order_id to minimize API calls
        const orderMap = {};

        for (const disc of missingVendor) {
            if (!orderMap[disc.order_id]) {
                orderMap[disc.order_id] = [];
            }
            orderMap[disc.order_id].push(disc);
        }

        console.log(`Step 2: Fetching vendor info from orders...\n`);

        let updated = 0;
        let failed = 0;

        for (const [orderId, discs] of Object.entries(orderMap)) {
            console.log(`\nProcessing order: ${orderId}`);

            // Get order to extract vendor_id
            const orderResult = await dynamodb.send(new GetCommand({
                TableName: 'supply_orders',
                Key: { id: orderId }
            }));

            const order = orderResult.Item;

            if (!order) {
                console.log(`  ❌ Order not found: ${orderId}`);
                failed += discs.length;
                continue;
            }

            const vendorId = order.vendor_id;
            const vendorName = order.vendor_name;

            if (!vendorId) {
                console.log(`  ⚠️ Order has no vendor_id: ${orderId}`);
                failed += discs.length;
                continue;
            }

            console.log(`  Vendor: ${vendorName} (${vendorId})`);
            console.log(`  Updating ${discs.length} discrepancies...`);

            // Update each discrepancy with vendor info
            for (const disc of discs) {
                try {
                    await dynamodb.send(new UpdateCommand({
                        TableName: 'supply_discrepancies',
                        Key: { id: disc.id },
                        UpdateExpression: 'SET vendor_id = :vid, vendor_name = :vname',
                        ExpressionAttributeValues: {
                            ':vid': vendorId,
                            ':vname': vendorName
                        }
                    }));

                    console.log(`    ✅ ${disc.item_name} (${disc.id})`);
                    updated++;
                } catch (err) {
                    console.log(`    ❌ Failed to update ${disc.id}:`, err.message);
                    failed++;
                }
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`Summary:`);
        console.log(`  ✅ Successfully updated: ${updated}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`${'='.repeat(50)}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

backfillVendorIds();
