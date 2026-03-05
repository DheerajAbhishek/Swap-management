/**
 * Check vendors in database
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

async function checkVendors() {
  try {
    const result = await client.send(new ScanCommand({
      TableName: 'supply_vendors',
      ProjectionExpression: 'id, #n, #items',
      ExpressionAttributeNames: {
        '#n': 'name',
        '#items': 'items'
      }
    }));

    console.log('\n=== VENDORS IN DATABASE ===\n');
    result.Items.forEach(vendor => {
      console.log(`Name: "${vendor.name}"`);
      console.log(`ID: ${vendor.id}`);
      console.log(`Items Count: ${vendor.items ? vendor.items.length : 0}`);
      if (vendor.items && vendor.items.length > 0) {
        console.log(`Sample items: ${vendor.items.slice(0, 3).map(i => i.name).join(', ')}`);
      }
      console.log('---');
    });

    console.log(`\nTotal vendors: ${result.Items.length}\n`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkVendors();
