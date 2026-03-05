const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fix orders with Sunday delivery date (2026-03-01) to Monday (2026-03-02)
 */
async function fixSundayDeliveries() {
  console.log('Starting to fix Sunday delivery dates...\n');

  try {
    // Scan for all orders with delivery_date = 2026-03-01
    const scanResult = await docClient.send(new ScanCommand({
      TableName: 'supply_orders',
      FilterExpression: 'delivery_date = :sunday',
      ExpressionAttributeValues: {
        ':sunday': '2026-03-01'
      }
    }));

    const orders = scanResult.Items || [];
    console.log(`Found ${orders.length} orders with Sunday delivery date (2026-03-01)\n`);

    if (orders.length === 0) {
      console.log('No orders to update.');
      return;
    }

    // Update each order to Monday (2026-03-02)
    let updated = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: 'supply_orders',
          Key: { id: order.id },
          UpdateExpression: 'SET delivery_date = :monday',
          ExpressionAttributeValues: {
            ':monday': '2026-03-02'
          }
        }));

        console.log(`✓ Updated ${order.order_number} (${order.id})`);
        console.log(`  Franchise: ${order.franchise_name || order.franchise_id}`);
        console.log(`  Vendor: ${order.vendor_name || 'N/A'}`);
        console.log(`  Items: ${order.items?.length || 0}`);
        console.log(`  Total: ₹${order.total_amount || 0}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Delivery: 2026-03-01 → 2026-03-02\n`);

        updated++;
      } catch (err) {
        console.error(`✗ Failed to update ${order.order_number}:`, err.message);
        failed++;
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Total orders found: ${orders.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log('\nAll Sunday deliveries moved to Monday (2026-03-02)');

  } catch (error) {
    console.error('Error scanning orders:', error);
    throw error;
  }
}

// Run the script
fixSundayDeliveries()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
