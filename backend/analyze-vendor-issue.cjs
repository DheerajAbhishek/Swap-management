const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function analyzeVendorIssue() {
  try {
    // Get all vendors
    console.log('=== ALL VENDORS ===\n');
    const vendorResult = await docClient.send(new ScanCommand({
      TableName: 'supply_vendors'
    }));

    const vendors = vendorResult.Items || [];
    vendors.forEach(v => {
      console.log(`${v.id} - ${v.name} (${v.type || 'No Type'})`);
    });
    console.log(`\nTotal vendors: ${vendors.length}\n`);

    // Get all orders with empty vendor_name
    console.log('=== ORDERS WITH EMPTY VENDOR NAME ===\n');
    const orderResult = await docClient.send(new ScanCommand({
      TableName: 'supply_orders'
    }));

    const orders = orderResult.Items || [];
    const emptyVendorOrders = orders.filter(o => !o.vendor_name || o.vendor_name.trim() === '');

    console.log(`Found ${emptyVendorOrders.length} orders with empty vendor name:\n`);

    emptyVendorOrders.forEach(o => {
      console.log(`${o.order_number} (${o.id})`);
      console.log(`  Vendor ID: ${o.vendor_id || '(NONE)'}`);
      console.log(`  Franchise: ${o.franchise_name}`);
      console.log(`  Status: ${o.status}`);
      console.log(`  Created: ${o.created_at}`);
      console.log('');
    });

    // Check if vendor IDs from empty orders exist
    console.log('=== CHECKING VENDOR IDs FROM EMPTY ORDERS ===\n');
    const uniqueVendorIds = [...new Set(emptyVendorOrders.map(o => o.vendor_id).filter(Boolean))];

    for (const vendorId of uniqueVendorIds) {
      const exists = vendors.some(v => v.id === vendorId);
      console.log(`${vendorId}: ${exists ? '✓ EXISTS' : '✗ NOT FOUND'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeVendorIssue();
