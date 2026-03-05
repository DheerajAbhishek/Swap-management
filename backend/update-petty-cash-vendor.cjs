const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

async function updatePettyCashVendor() {
  const vendorId = 'vendor-1772462420459'; // Petty Cash vendor

  try {
    console.log('Updating Petty Cash vendor...');

    const result = await dynamoDB.send(new UpdateCommand({
      TableName: 'supply_vendors',
      Key: { id: vendorId },
      UpdateExpression: 'SET vendor_type = :vendor_type, allow_price_edit = :allow_price_edit, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':vendor_type': 'PETTY_CASH',
        ':allow_price_edit': true,
        ':updated_at': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    console.log('✅ Successfully updated vendor:');
    console.log(JSON.stringify(result.Attributes, null, 2));

  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    throw error;
  }
}

updatePettyCashVendor()
  .then(() => {
    console.log('\n✅ Update complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Update failed:', err);
    process.exit(1);
  });
