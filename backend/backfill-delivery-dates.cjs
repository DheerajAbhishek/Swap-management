const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE = 'supply_orders';

async function backfillDeliveryDates() {
    try {
        console.log('🔍 Scanning orders table for orders without delivery_date...\n');

        // Scan all orders
        let allOrders = [];
        let lastEvaluatedKey = null;

        do {
            const params = {
                TableName: ORDERS_TABLE
            };

            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await dynamodb.send(new ScanCommand(params));
            allOrders = allOrders.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        console.log(`📦 Total orders found: ${allOrders.length}`);

        // Filter orders without delivery_date
        const ordersWithoutDeliveryDate = allOrders.filter(order => !order.delivery_date);
        console.log(`⚠️  Orders without delivery_date: ${ordersWithoutDeliveryDate.length}\n`);

        if (ordersWithoutDeliveryDate.length === 0) {
            console.log('✅ All orders already have delivery dates!');
            return;
        }

        // Update each order
        let successCount = 0;
        let errorCount = 0;

        for (const order of ordersWithoutDeliveryDate) {
            try {
                // Calculate delivery date = created_at + 1 day
                const createdDate = new Date(order.created_at);
                const deliveryDate = new Date(createdDate);
                deliveryDate.setDate(deliveryDate.getDate() + 1); // Add 1 day

                const deliveryDateString = deliveryDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

                console.log(`📝 Updating order ${order.order_number} (${order.id})`);
                console.log(`   Created: ${order.created_at.split('T')[0]} → Delivery: ${deliveryDateString}`);

                // Update the order
                await dynamodb.send(new UpdateCommand({
                    TableName: ORDERS_TABLE,
                    Key: { id: order.id },
                    UpdateExpression: 'SET delivery_date = :deliveryDate',
                    ExpressionAttributeValues: {
                        ':deliveryDate': deliveryDateString
                    }
                }));

                successCount++;
                console.log(`   ✅ Updated successfully\n`);

            } catch (err) {
                errorCount++;
                console.error(`   ❌ Failed to update order ${order.order_number}:`, err.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 BACKFILL SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total orders processed: ${ordersWithoutDeliveryDate.length}`);
        console.log(`✅ Successfully updated: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log('='.repeat(50));

        if (successCount > 0) {
            console.log('\n✨ Backfill completed! All orders now have delivery dates.');
        }

    } catch (error) {
        console.error('❌ Error during backfill:', error);
        process.exit(1);
    }
}

// Run the backfill
console.log('🚀 Starting delivery date backfill...\n');
backfillDeliveryDates();
