/**
 * Check specific vendor items
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

async function checkVendorItems() {
  try {
    const vendorId = 'vendor-1771574348140'; // Swap Central Kitchen(BLR - Cooked Food)
    
    const result = await client.send(new GetCommand({
      TableName: 'supply_vendors',
      Key: { id: vendorId }
    }));

    if(!result.Item) {
      console.log('Vendor not found');
      return;
    }

    console.log('\n=== VENDOR DETAILS ===');
    console.log(`Name: ${result.Item.name}`);
    console.log(`ID: ${result.Item.id}`);
    console.log(`Items Count: ${result.Item.items ? result.Item.items.length : 0}`);
    console.log('\n=== ITEMS ===\n');
    
    if (result.Item.items && result.Item.items.length > 0) {
      result.Item.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Unit: ${item.unit}`);
        console.log(`   Vendor Price: ${item.vendor_price}`);
        console.log(`   Franchise Price: ${item.franchise_price || 0}`);
        console.log(`   ID: ${item.id}`);
        console.log('');
      });
    } else {
      console.log('No items found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkVendorItems();
