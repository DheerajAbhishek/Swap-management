const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function fixOrder() {
  try {
    // Get vendor details
    const vendorResult = await docClient.send(new GetCommand({
      TableName: 'supply_vendors',
      Key: { id: 'vendor-1771569032036' }
    }));

    if (!vendorResult.Item) {
      console.log('Vendor not found in database');
      return;
    }

    const vendor = vendorResult.Item;
    console.log('Vendor Details:');
    console.log('ID:', vendor.id);
    console.log('Name:', vendor.name || '(EMPTY)');
    console.log('Type:', vendor.type);
    console.log('\n');

    if (!vendor.name) {
      console.log('ERROR: Vendor itself has no name in the database!');
      console.log('This vendor needs to be updated in supply_vendors table first.');
      return;
    }

    // Update the order with vendor name
    console.log(`Updating order with vendor name: "${vendor.name}"`);

    await docClient.send(new UpdateCommand({
      TableName: 'supply_orders',
      Key: { id: 'ord-mm8zngh0igb5lgi5w' },
      UpdateExpression: 'SET vendor_name = :name',
      ExpressionAttributeValues: {
        ':name': vendor.name
      }
    }));

    console.log('✓ Order updated successfully');
    console.log(`Vendor name set to: "${vendor.name}"`);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixOrder();
