const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fix orders with null delivery_date
 * Sets delivery_date = created_at + 1 day, skipping Sundays
 */
function getNextBusinessDay(date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  // If next day is Sunday (0), move to Monday
  if (nextDay.getDay() === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay.toISOString().split('T')[0];
}

async function fixMissingDeliveryDates() {
  console.log('Finding orders with missing delivery dates...\n');

  try {
    // Scan for all orders
    const scanResult = await docClient.send(new ScanCommand({
      TableName: 'supply_orders'
    }));

    const orders = scanResult.Items || [];
    const ordersWithoutDelivery = orders.filter(o => !o.delivery_date);

    console.log(`Total orders: ${orders.length}`);
    console.log(`Orders without delivery_date: ${ordersWithoutDelivery.length}\n`);

    if (ordersWithoutDelivery.length === 0) {
      console.log('No orders to update.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const order of ordersWithoutDelivery) {
      try {
        const createdDate = new Date(order.created_at);
        const deliveryDate = getNextBusinessDay(createdDate);

        await docClient.send(new UpdateCommand({
          TableName: 'supply_orders',
          Key: { id: order.id },
          UpdateExpression: 'SET delivery_date = :delivery',
          ExpressionAttributeValues: {
            ':delivery': deliveryDate
          }
        }));

        console.log(`✓ Updated ${order.order_number}`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Delivery: ${deliveryDate}`);
        console.log(`  Franchise: ${order.franchise_name || order.franchise_id}`);
        console.log(`  Vendor: ${order.vendor_name || 'N/A'}`);
        console.log(`  Status: ${order.status}\n`);

        updated++;
      } catch (err) {
        console.error(`✗ Failed to update ${order.order_number}:`, err.message);
        failed++;
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Orders without delivery_date: ${ordersWithoutDelivery.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);

  } catch (error) {
    console.error('Error scanning orders:', error);
    throw error;
  }
}

// Run the script
fixMissingDeliveryDates()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
