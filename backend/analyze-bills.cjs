const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function analyzeBills() {
    try {
        console.log('🔍 Analyzing orders/bills...\n');

        // Get all orders
        let allOrders = [];
        let lastEvaluatedKey = null;

        do {
            const params = { TableName: 'supply_orders' };
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await dynamodb.send(new ScanCommand(params));
            allOrders = allOrders.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        console.log(`📦 Total orders: ${allOrders.length}\n`);

        // Filter out test franchise
        const realOrders = allOrders.filter(order =>
            order.franchise_name &&
            !order.franchise_name.toLowerCase().includes('test') &&
            (order.status === 'RECEIVED' || order.status === 'DELIVERED')
        );

        console.log(`📦 Real orders (excluding test): ${realOrders.length}\n`);

        // Sample analysis
        console.log('=== SAMPLE OF RECEIVED ORDERS (First 10) ===\n');

        const samples = realOrders.slice(0, 10);
        samples.forEach((order, index) => {
            const createdDate = order.created_at?.split('T')[0];
            const receivedDate = order.received_at?.split('T')[0];
            const deliveryDate = order.delivery_date;

            console.log(`${index + 1}. ${order.order_number} - ${order.franchise_name}`);
            console.log(`   Created:  ${createdDate}`);
            console.log(`   Received: ${receivedDate || 'Not set'}`);
            console.log(`   Delivery: ${deliveryDate || 'Not set (OLD ORDER)'}`);
            console.log(`   Status:   ${order.status}`);
            console.log(`   Amount:   ₹${order.total_amount || 0}`);

            // Check if dates differ
            if (deliveryDate && receivedDate && deliveryDate !== receivedDate) {
                console.log(`   ⚠️  MISMATCH: Delivery ≠ Received`);
            }
            console.log('');
        });

        // Statistics
        const withDeliveryDate = realOrders.filter(o => o.delivery_date);
        const withoutDeliveryDate = realOrders.filter(o => !o.delivery_date);

        console.log('\n=== STATISTICS ===');
        console.log(`Orders WITH delivery_date: ${withDeliveryDate.length}`);
        console.log(`Orders WITHOUT delivery_date: ${withoutDeliveryDate.length} (old orders)`);

        // Check mismatches
        const mismatches = realOrders.filter(o =>
            o.delivery_date && o.received_at &&
            o.delivery_date !== o.received_at.split('T')[0]
        );
        console.log(`Orders where delivery_date ≠ received_at: ${mismatches.length}`);

        if (mismatches.length > 0) {
            console.log('\n⚠️  KEY FINDING:');
            console.log(`${mismatches.length} orders were received on a different day than their delivery date!`);
            console.log('This proves our fix is needed - these orders are in wrong daily reports.');
        }

        // Check old orders without delivery_date
        if (withoutDeliveryDate.length > 0) {
            console.log('\n📊 OLD ORDERS (no delivery_date):');
            console.log(`${withoutDeliveryDate.length} orders don't have delivery_date yet`);
            console.log('For these, we backfilled delivery_date = created_at + 1 day');

            // Show sample
            console.log('\nSample old order:');
            const oldSample = withoutDeliveryDate[0];
            if (oldSample) {
                console.log(`Order: ${oldSample.order_number}`);
                console.log(`Created: ${oldSample.created_at?.split('T')[0]}`);
                console.log(`Received: ${oldSample.received_at?.split('T')[0] || 'Not set'}`);
                console.log(`Delivery: ${oldSample.delivery_date || 'Not set'}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

analyzeBills();
