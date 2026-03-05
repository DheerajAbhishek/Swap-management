/**
 * Check franchise items and vendor assignments
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

async function checkFranchiseItems() {
  try {
    // Get all franchises
    const result = await client.send(new ScanCommand({
      TableName: 'supply_franchises'
    }));

    console.log('\n=== FRANCHISES ===\n');

    const blrVendorId = 'vendor-1771574348140'; // Swap Central Kitchen(BLR - Cooked Food)

    for (const franchise of result.Items) {
      const itemsCount = franchise.items ? franchise.items.length : 0;
      const blrItems = franchise.items ? franchise.items.filter(i => i.vendor_id === blrVendorId).length : 0;

      console.log(`Franchise: ${franchise.name}`);
      console.log(`ID: ${franchise.id}`);
      console.log(`Vendor 1: ${franchise.vendor_1_name} (${franchise.vendor_1_id || 'N/A'})`);
      console.log(`Vendor 2: ${franchise.vendor_2_name} (${franchise.vendor_2_id || 'N/A'})`);
      console.log(`Total Items: ${itemsCount}`);
      console.log(`Items from BLR Cooked Vendor: ${blrItems}`);

      if (franchise.vendor_1_id === blrVendorId || franchise.vendor_2_id === blrVendorId) {
        console.log('✓ BLR Cooked vendor IS assigned to this franchise');

        if (franchise.items && franchise.items.length > 0) {
          console.log('\nItem breakdown by vendor:');
          const vendor1Items = franchise.items.filter(i => i.vendor_id === franchise.vendor_1_id).length;
          const vendor2Items = franchise.items.filter(i => i.vendor_id === franchise.vendor_2_id).length;
          console.log(`  Vendor 1 (${franchise.vendor_1_name}): ${vendor1Items}`);
          console.log(`  Vendor 2 (${franchise.vendor_2_name}): ${vendor2Items}`);

          // Show sample items
          console.log('\nSample items:');
          franchise.items.slice(0, 5).forEach(item => {
            console.log(`  - ${item.name} (vendor_id: ${item.vendor_id})`);
          });
        }
      } else {
        console.log('✗ BLR Cooked vendor NOT assigned');
      }
      console.log('\n---\n');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFranchiseItems();
