const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkDeliveryDates() {
    try {
        console.log('Checking supply_orders table for delivery_date field...\n');

        // Scan ALL orders in the table
        let allOrders = [];
        let lastEvaluatedKey = null;

        do {
            const params = {
                TableName: 'supply_orders'
            };

            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await dynamodb.send(new ScanCommand(params));
            allOrders = allOrders.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        const orders = allOrders;
        console.log(`Found ${orders.length} total orders\n`);

        if (orders.length === 0) {
            console.log('No orders found in the table');
            return;
        }

        // Sort by created_at to see most recent first
        orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Show first 5 and last 5 orders as samples
        const samplesToShow = 5;
        console.log('=== SAMPLE: First 5 Orders ===\n');
        orders.slice(0, samplesToShow).forEach((order, index) => {
            console.log(`--- Order ${index + 1} ---`);
            console.log('Order Number:', order.order_number);
            console.log('Created At:', order.created_at.split('T')[0]);
            console.log('Delivery Date:', order.delivery_date || 'NOT SET ❌');
            console.log('Has delivery_date:', 'delivery_date' in order ? 'YES ✓' : 'NO ❌');
            console.log('');
        });

        if (orders.length > samplesToShow * 2) {
            console.log('... (showing middle orders)\n');

            console.log('=== SAMPLE: Last 5 Orders ===\n');
            orders.slice(-samplesToShow).forEach((order, index) => {
                console.log(`--- Order ${orders.length - samplesToShow + index + 1} ---`);
                console.log('Order Number:', order.order_number);
                console.log('Created At:', order.created_at.split('T')[0]);
                console.log('Delivery Date:', order.delivery_date || 'NOT SET ❌');
                console.log('Has delivery_date:', 'delivery_date' in order ? 'YES ✓' : 'NO ❌');
                console.log('');
            });
        }

        console.log('\n\n=== SUMMARY ===');
        const ordersWithDeliveryDate = orders.filter(o => o.delivery_date);
        const ordersWithoutDeliveryDate = orders.filter(o => !o.delivery_date);

        console.log(`Orders with delivery_date: ${ordersWithDeliveryDate.length}/${orders.length}`);
        console.log(`Orders without delivery_date: ${ordersWithoutDeliveryDate.length}/${orders.length}`);

        if (ordersWithDeliveryDate.length === 0) {
            console.log('\n⚠️  No orders have delivery_date saved yet!');
            console.log('This means either:');
            console.log('1. The backend lambda needs to be redeployed');
            console.log('2. No new orders have been created since the update');
        } else {
            console.log('\n✅ Some orders have delivery_date field saved!');
        }

    } catch (error) {
        console.error('Error checking orders:', error);
    }
}

checkDeliveryDates();
